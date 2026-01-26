/**
 * Working memory implementation based on Miller's Law (7±2 items)
 * Provides short-term storage for current task context
 */

import type { MemoryItem } from '../core/types.js';

export interface WorkingMemoryConfig {
  /** Maximum capacity (default: 7, based on Miller's Law) */
  capacity?: number;
  /** Auto-consolidate when capacity reached */
  autoConsolidate?: boolean;
  /** Consolidation threshold (% of capacity) */
  consolidationThreshold?: number;
}

/**
 * Working memory for short-term storage during task execution
 * Implements a priority-based queue with limited capacity
 */
export class WorkingMemory {
  private items: MemoryItem[] = [];
  private readonly capacity: number;
  private readonly autoConsolidate: boolean;
  private readonly consolidationThreshold: number;

  constructor(config?: WorkingMemoryConfig) {
    this.capacity = config?.capacity ?? 7;
    this.autoConsolidate = config?.autoConsolidate ?? true;
    this.consolidationThreshold = config?.consolidationThreshold ?? 0.8;
  }

  /**
   * Add an item to working memory
   * If at capacity, removes the oldest item (FIFO)
   */
  async push(item: MemoryItem): Promise<void> {
    // Ensure item has required fields
    const memoryItem: MemoryItem = {
      id: item.id ?? this.generateId(),
      content: item.content,
      timestamp: item.timestamp ?? new Date(),
      metadata: item.metadata,
    };

    if (this.items.length >= this.capacity) {
      // Remove oldest item
      this.items.shift();
    }

    this.items.push(memoryItem);
  }

  /**
   * Remove and return the most recent item
   */
  async pop(): Promise<MemoryItem | undefined> {
    return this.items.pop();
  }

  /**
   * Get an item at a specific index without removing it
   */
  async get(index: number): Promise<MemoryItem | undefined> {
    if (index < 0 || index >= this.items.length) {
      return undefined;
    }
    return this.items[index];
  }

  /**
   * Get all items in working memory
   */
  async getAll(): Promise<MemoryItem[]> {
    return [...this.items];
  }

  /**
   * Get the most recent N items
   */
  async getRecent(count: number): Promise<MemoryItem[]> {
    const start = Math.max(0, this.items.length - count);
    return this.items.slice(start);
  }

  /**
   * Find items by content (simple search)
   */
  async find(predicate: (item: MemoryItem) => boolean): Promise<MemoryItem[]> {
    return this.items.filter(predicate);
  }

  /**
   * Clear all items from working memory
   */
  async clear(): Promise<void> {
    this.items = [];
  }

  /**
   * Get current number of items
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if working memory is at capacity
   */
  isFull(): boolean {
    return this.items.length >= this.capacity;
  }

  /**
   * Check if consolidation should occur
   */
  shouldConsolidate(): boolean {
    if (!this.autoConsolidate) return false;
    return this.items.length >= this.capacity * this.consolidationThreshold;
  }

  /**
   * Get items for consolidation (oldest items above threshold)
   */
  async getItemsForConsolidation(): Promise<MemoryItem[]> {
    if (!this.shouldConsolidate()) {
      return [];
    }

    const consolidationCount = Math.floor(this.items.length * 0.5);
    return this.items.slice(0, consolidationCount);
  }

  /**
   * Remove items after consolidation
   */
  async removeConsolidated(itemIds: string[]): Promise<void> {
    const idSet = new Set(itemIds);
    this.items = this.items.filter(item => !idSet.has(item.id));
  }

  /**
   * Update an existing item
   */
  async update(id: string, updates: Partial<MemoryItem>): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    this.items[index] = {
      ...this.items[index],
      ...updates,
      id: this.items[index]!.id, // Preserve ID
    } as MemoryItem;

    return true;
  }

  /**
   * Serialize working memory for persistence
   */
  serialize(): string {
    return JSON.stringify(this.items);
  }

  /**
   * Restore working memory from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as MemoryItem[];
      this.items = parsed.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    } catch {
      this.items = [];
    }
  }

  private generateId(): string {
    return `wm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
