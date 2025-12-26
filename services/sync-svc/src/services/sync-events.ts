import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { config } from '../config.js';
import {
  ChangeNotification,
  EntityType,
  SyncOperationType,
  ConflictResolutionStrategy,
} from '../types.js';

/**
 * Sync Event Emitter
 *
 * Handles pub/sub for real-time sync notifications across
 * multiple service instances using Redis.
 */
export class SyncEventEmitter extends EventEmitter {
  private static instance: SyncEventEmitter;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;

  private readonly CHANGE_CHANNEL = 'sync:changes';
  private readonly CONFLICT_CHANNEL = 'sync:conflicts';

  private constructor() {
    super();
  }

  static getInstance(): SyncEventEmitter {
    if (!SyncEventEmitter.instance) {
      SyncEventEmitter.instance = new SyncEventEmitter();
    }
    return SyncEventEmitter.instance;
  }

  /**
   * Initialize Redis connections
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.publisher = new Redis(config.redis.url);
      this.subscriber = new Redis(config.redis.url);

      // Subscribe to channels
      await this.subscriber.subscribe(
        this.CHANGE_CHANNEL,
        this.CONFLICT_CHANNEL
      );

      // Handle incoming messages
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      this.isConnected = true;
      console.log('📡 Sync event emitter connected to Redis');
    } catch (error) {
      console.error('Failed to connect sync event emitter:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.isConnected = false;
    console.log('📡 Sync event emitter disconnected');
  }

  /**
   * Emit a change notification
   */
  emitChange(notification: ChangeNotification): void {
    if (!this.publisher) {
      console.warn('Publisher not connected, change not emitted');
      return;
    }

    const message = JSON.stringify({
      type: 'change',
      ...notification,
      timestamp: new Date().toISOString(),
    });

    this.publisher.publish(this.CHANGE_CHANNEL, message);
  }

  /**
   * Emit a conflict notification
   */
  emitConflictResolved(notification: {
    conflictId: string;
    entityType: EntityType;
    entityId: string;
    resolution: ConflictResolutionStrategy;
    userId: string;
  }): void {
    if (!this.publisher) {
      console.warn('Publisher not connected, conflict not emitted');
      return;
    }

    const message = JSON.stringify({
      type: 'conflict_resolved',
      ...notification,
      timestamp: new Date().toISOString(),
    });

    this.publisher.publish(this.CONFLICT_CHANNEL, message);
  }

  /**
   * Handle incoming Redis messages
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);

      if (channel === this.CHANGE_CHANNEL) {
        this.emit('change', data);
      } else if (channel === this.CONFLICT_CHANNEL) {
        this.emit('conflict', data);
      }
    } catch (error) {
      console.error('Failed to parse sync event message:', error);
    }
  }

  /**
   * Subscribe to change events for a specific user
   */
  onChangeForUser(
    userId: string,
    callback: (notification: ChangeNotification) => void
  ): () => void {
    const handler = (data: ChangeNotification & { userId?: string }) => {
      if (data.userId === userId) {
        callback(data);
      }
    };

    this.on('change', handler);

    // Return unsubscribe function
    return () => {
      this.off('change', handler);
    };
  }

  /**
   * Subscribe to conflict events for a specific user
   */
  onConflictForUser(
    userId: string,
    callback: (notification: {
      conflictId: string;
      entityType: EntityType;
      entityId: string;
      resolution: ConflictResolutionStrategy;
    }) => void
  ): () => void {
    const handler = (
      data: {
        conflictId: string;
        entityType: EntityType;
        entityId: string;
        resolution: ConflictResolutionStrategy;
        userId?: string;
      }
    ) => {
      if (data.userId === userId) {
        callback(data);
      }
    };

    this.on('conflict', handler);

    return () => {
      this.off('conflict', handler);
    };
  }
}
