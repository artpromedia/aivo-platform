/**
 * Message Broker Service
 *
 * Handles cross-server communication for:
 * - Broadcasting events across server instances
 * - Publishing session and analytics events
 * - Subscribing to external service events
 */

import { logger } from '../logger.js';
import { getRedisClient, getSubscriberClient, RedisKeys } from '../redis/index.js';

type MessageHandler = (message: unknown) => void;

/**
 * Message Broker Service
 */
export class MessageBrokerService {
  private handlers = new Map<string, Set<MessageHandler>>();
  private isSubscribed = false;

  /**
   * Initialize the message broker
   */
  async initialize(): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

    const subscriber = getSubscriberClient();

    // Subscribe to all realtime channels
    const channels = Object.values(RedisKeys.channels);
    for (const channel of channels) {
      await subscriber.subscribe(channel);
    }

    // Handle incoming messages
    subscriber.on('message', (channel: string, message: string) => {
      try {
        const parsed = JSON.parse(message);
        const channelHandlers = this.handlers.get(channel);

        if (channelHandlers) {
          for (const handler of channelHandlers) {
            try {
              handler(parsed);
            } catch (error) {
              logger.error({ channel, err: error }, 'MessageBroker handler error');
            }
          }
        }
      } catch (error) {
        logger.error({ channel, err: error }, 'Failed to parse message');
      }
    });

    this.isSubscribed = true;
    logger.info({ channels }, 'MessageBroker initialized');
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }

    this.handlers.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(channel)?.delete(handler);
    };
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: unknown): Promise<void> {
    const redis = getRedisClient();
    await redis.publish(channel, JSON.stringify(message));
  }

  /**
   * Broadcast to all server instances
   */
  async broadcast(room: string, event: string, data: unknown): Promise<void> {
    await this.publish(RedisKeys.channels.broadcast, {
      type: 'broadcast',
      room,
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish session event
   */
  async publishSessionEvent(event: {
    type: 'update' | 'activity' | 'progress' | 'complete';
    sessionId: string;
    studentId: string;
    classId: string;
    data: unknown;
  }): Promise<void> {
    await this.publish(RedisKeys.channels.session, {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish analytics event
   */
  async publishAnalyticsEvent(event: {
    type: 'update' | 'alert';
    classId: string;
    metric?: string;
    data: unknown;
  }): Promise<void> {
    await this.publish(RedisKeys.channels.analytics, {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish alert
   */
  async publishAlert(alert: {
    id: string;
    type: string;
    severity: string;
    studentId: string;
    studentName: string;
    classId: string;
    message: string;
  }): Promise<void> {
    await this.publish(RedisKeys.channels.alerts, {
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Shutdown the message broker
   */
  async shutdown(): Promise<void> {
    const subscriber = getSubscriberClient();
    const channels = Object.values(RedisKeys.channels);

    for (const channel of channels) {
      await subscriber.unsubscribe(channel);
    }

    this.handlers.clear();
    this.isSubscribed = false;

    logger.info('MessageBroker shutdown complete');
  }
}
