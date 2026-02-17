/**
 * Sync Event Emitter
 *
 * Handles pub/sub for real-time device sync notifications across
 * multiple service instances using Redis.
 *
 * Ported from sync-svc during Sprint 3 consolidation.
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import { EventEmitter } from 'node:events';

import Redis from 'ioredis';

import { deviceSyncConfig } from './config.js';
import type {
  ChangeNotification,
  EntityType,
  ConflictResolutionStrategy,
} from './types.js';

const logger = {
  info: (msg: string) => { console.log(`[device-sync-events] ${msg}`); },
  warn: (msg: string) => { console.warn(`[device-sync-events] ${msg}`); },
  error: (ctx: Record<string, unknown>, msg: string) => { console.error(`[device-sync-events] ${msg}`, ctx); },
};

export class SyncEventEmitter extends EventEmitter {
  private static instance: SyncEventEmitter;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private publisher: Redis | null = null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private subscriber: Redis | null = null;
  private isConnected = false;

  private readonly CHANGE_CHANNEL = 'device-sync:changes';
  private readonly CONFLICT_CHANNEL = 'device-sync:conflicts';

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
      this.publisher = new Redis(deviceSyncConfig.redis.url);
      this.subscriber = new Redis(deviceSyncConfig.redis.url);

      await this.subscriber.subscribe(
        this.CHANGE_CHANNEL,
        this.CONFLICT_CHANNEL
      );

      this.subscriber.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      this.isConnected = true;
      logger.info('Sync event emitter connected to Redis');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect sync event emitter');
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
    logger.info('Sync event emitter disconnected');
  }

  /**
   * Emit a change notification
   */
  emitChange(notification: ChangeNotification): void {
    if (!this.publisher) {
      logger.warn('Publisher not connected, change not emitted');
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
      logger.warn('Publisher not connected, conflict not emitted');
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
      const data = JSON.parse(message) as Record<string, unknown>;

      if (channel === this.CHANGE_CHANNEL) {
        this.emit('change', data);
      } else if (channel === this.CONFLICT_CHANNEL) {
        this.emit('conflict', data);
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to parse sync event message');
    }
  }

  /**
   * Subscribe to events for a specific user on a given channel
   */
  private onEventForUser(
    event: string,
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    callback: Function,
  ): () => void {
    const handler = (data: { userId?: string }) => {
      if (data.userId === userId) {
        callback(data);
      }
    };

    this.on(event, handler);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Subscribe to change events for a specific user
   */
  onChangeForUser(
    userId: string,
    callback: (notification: ChangeNotification) => void
  ): () => void {
    return this.onEventForUser('change', userId, callback);
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
    return this.onEventForUser('conflict', userId, callback);
  }
}
