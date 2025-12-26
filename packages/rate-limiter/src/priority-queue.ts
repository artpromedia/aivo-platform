/**
 * Priority Queue
 *
 * A priority queue for rate-limited requests that allows
 * higher-tier users to be processed first.
 *
 * @example
 * ```typescript
 * const queue = new PriorityQueue({
 *   store: redisStore,
 *   maxSize: 1000,
 *   processInterval: 100,
 * });
 *
 * // Add request to queue
 * await queue.enqueue({
 *   id: 'req-123',
 *   priority: 3, // Higher priority
 *   data: { userId: '123', endpoint: '/api/ai/generate' },
 * });
 *
 * // Process queue
 * queue.startProcessing(async (item) => {
 *   await processRequest(item.data);
 * });
 * ```
 */

import { RateLimitStore } from './stores/types';
import { MemoryStore } from './stores/memory-store';
import { RateLimiterLogger, noopLogger } from './logger';

export interface QueueItem<T = any> {
  /** Unique identifier for the item */
  id: string;
  /** Priority (higher = processed first) */
  priority: number;
  /** The queued data */
  data: T;
  /** When the item was added */
  addedAt: number;
  /** Maximum time to wait in queue (ms) */
  timeout?: number;
}

export interface PriorityQueueOptions {
  /** Name of the queue */
  name?: string;
  /** Storage backend */
  store?: RateLimitStore;
  /** Maximum queue size */
  maxSize?: number;
  /** Interval between processing items (ms) */
  processInterval?: number;
  /** Maximum items to process per interval */
  batchSize?: number;
  /** Default timeout for items (ms) */
  defaultTimeout?: number;
  /** Logger instance */
  logger?: RateLimiterLogger;
  /** Called when an item times out */
  onTimeout?: (item: QueueItem) => void;
  /** Called when queue is full */
  onFull?: (item: QueueItem) => void;
}

export class PriorityQueue<T = any> {
  private readonly name: string;
  private readonly store: RateLimitStore;
  private readonly maxSize: number;
  private readonly processInterval: number;
  private readonly batchSize: number;
  private readonly defaultTimeout: number;
  private readonly logger: RateLimiterLogger;
  private readonly onTimeout?: (item: QueueItem<T>) => void;
  private readonly onFull?: (item: QueueItem<T>) => void;

  private queue: QueueItem<T>[] = [];
  private processing: boolean = false;
  private processorTimer: NodeJS.Timeout | null = null;
  private processor: ((item: QueueItem<T>) => Promise<void>) | null = null;

  constructor(options: PriorityQueueOptions = {}) {
    this.name = options.name ?? 'rate-limit-queue';
    this.store = options.store ?? new MemoryStore();
    this.maxSize = options.maxSize ?? 10000;
    this.processInterval = options.processInterval ?? 100;
    this.batchSize = options.batchSize ?? 10;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
    this.logger = options.logger ?? noopLogger;
    this.onTimeout = options.onTimeout;
    this.onFull = options.onFull;
  }

  /**
   * Add an item to the queue
   */
  async enqueue(item: Omit<QueueItem<T>, 'addedAt'>): Promise<boolean> {
    // Check queue size
    if (this.queue.length >= this.maxSize) {
      this.logger.warn('Queue is full, rejecting item', {
        queueName: this.name,
        itemId: item.id,
      });
      this.onFull?.({ ...item, addedAt: Date.now() });
      return false;
    }

    const queueItem: QueueItem<T> = {
      ...item,
      addedAt: Date.now(),
      timeout: item.timeout ?? this.defaultTimeout,
    };

    // Insert in priority order
    const insertIndex = this.findInsertIndex(queueItem.priority);
    this.queue.splice(insertIndex, 0, queueItem);

    this.logger.debug('Item enqueued', {
      queueName: this.name,
      itemId: item.id,
      priority: item.priority,
      position: insertIndex,
      queueSize: this.queue.length,
    });

    // Persist to store for distributed systems
    await this.persistQueue();

    return true;
  }

  /**
   * Find the insert index for a given priority (binary search)
   */
  private findInsertIndex(priority: number): number {
    let left = 0;
    let right = this.queue.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.queue[mid].priority >= priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  /**
   * Remove an item from the queue
   */
  async dequeue(): Promise<QueueItem<T> | undefined> {
    // Remove expired items first
    this.removeExpired();

    const item = this.queue.shift();
    
    if (item) {
      await this.persistQueue();
      this.logger.debug('Item dequeued', {
        queueName: this.name,
        itemId: item.id,
        priority: item.priority,
      });
    }

    return item;
  }

  /**
   * Remove expired items from the queue
   */
  private removeExpired(): void {
    const now = Date.now();
    const expired: QueueItem<T>[] = [];

    this.queue = this.queue.filter((item) => {
      const isExpired = item.timeout && now - item.addedAt > item.timeout;
      if (isExpired) {
        expired.push(item);
      }
      return !isExpired;
    });

    // Notify about expired items
    for (const item of expired) {
      this.logger.debug('Item expired', {
        queueName: this.name,
        itemId: item.id,
      });
      this.onTimeout?.(item);
    }
  }

  /**
   * Get an item by ID without removing it
   */
  peek(id: string): QueueItem<T> | undefined {
    return this.queue.find((item) => item.id === id);
  }

  /**
   * Get the next item without removing it
   */
  peekNext(): QueueItem<T> | undefined {
    this.removeExpired();
    return this.queue[0];
  }

  /**
   * Remove an item by ID
   */
  async remove(id: string): Promise<boolean> {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.persistQueue();
      return true;
    }
    return false;
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  /**
   * Clear the queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.logger.info('Queue cleared', { queueName: this.name });
  }

  /**
   * Start processing the queue
   */
  startProcessing(processor: (item: QueueItem<T>) => Promise<void>): void {
    if (this.processing) {
      this.logger.warn('Queue processing already started', { queueName: this.name });
      return;
    }

    this.processor = processor;
    this.processing = true;
    this.scheduleNextProcess();

    this.logger.info('Queue processing started', {
      queueName: this.name,
      interval: this.processInterval,
      batchSize: this.batchSize,
    });
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    this.processing = false;
    if (this.processorTimer) {
      clearTimeout(this.processorTimer);
      this.processorTimer = null;
    }
    this.processor = null;
    this.logger.info('Queue processing stopped', { queueName: this.name });
  }

  /**
   * Schedule the next processing cycle
   */
  private scheduleNextProcess(): void {
    if (!this.processing) return;

    this.processorTimer = setTimeout(async () => {
      await this.processBatch();
      this.scheduleNextProcess();
    }, this.processInterval);
  }

  /**
   * Process a batch of items
   */
  private async processBatch(): Promise<void> {
    if (!this.processor || this.queue.length === 0) return;

    const batch: QueueItem<T>[] = [];
    for (let i = 0; i < this.batchSize && this.queue.length > 0; i++) {
      const item = await this.dequeue();
      if (item) {
        batch.push(item);
      }
    }

    // Process items in parallel
    const results = await Promise.allSettled(
      batch.map((item) => this.processor!(item))
    );

    // Log any errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error('Failed to process queue item', {
          queueName: this.name,
          itemId: batch[index].id,
          error: result.reason,
        });
      }
    });
  }

  /**
   * Get queue stats
   */
  getStats(): {
    name: string;
    size: number;
    maxSize: number;
    processing: boolean;
    oldestItem?: number;
    newestItem?: number;
    priorityDistribution: Record<number, number>;
  } {
    const priorityDistribution: Record<number, number> = {};
    for (const item of this.queue) {
      priorityDistribution[item.priority] = (priorityDistribution[item.priority] ?? 0) + 1;
    }

    return {
      name: this.name,
      size: this.queue.length,
      maxSize: this.maxSize,
      processing: this.processing,
      oldestItem: this.queue.length > 0 ? this.queue[this.queue.length - 1].addedAt : undefined,
      newestItem: this.queue.length > 0 ? this.queue[0].addedAt : undefined,
      priorityDistribution,
    };
  }

  /**
   * Persist queue to store
   */
  private async persistQueue(): Promise<void> {
    try {
      const key = `pq:${this.name}`;
      await this.store.set(key, JSON.stringify(this.queue), 86400000); // 24 hour TTL
    } catch (error) {
      this.logger.debug('Failed to persist queue', { error });
    }
  }

  /**
   * Load queue from store
   */
  async loadFromStore(): Promise<void> {
    try {
      const key = `pq:${this.name}`;
      const data = await this.store.get(key);
      if (data) {
        this.queue = JSON.parse(data);
        this.removeExpired(); // Clean up expired items
        this.logger.info('Queue loaded from store', {
          queueName: this.name,
          size: this.queue.length,
        });
      }
    } catch (error) {
      this.logger.debug('Failed to load queue from store', { error });
    }
  }
}
