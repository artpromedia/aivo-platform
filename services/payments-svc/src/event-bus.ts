/**
 * Event Bus Service
 *
 * Publishes billing and dunning events to Redis pub/sub for consumption
 * by other services (notify-svc, analytics, etc.).
 *
 * Events published:
 * - billing.dunning.past_due - Subscription entered past due status
 * - billing.dunning.downgraded - Subscription downgraded due to non-payment
 * - billing.dunning.recovered - Payment recovered, subscription restored
 * - billing.subscription.* - General subscription lifecycle events
 */

import { createClient, type RedisClientType } from 'redis';

import { config } from './config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface BillingEvent {
  eventType: string;
  subscriptionId: string;
  billingAccountId: string;
  tenantId: string;
  correlationId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT BUS CLIENT
// ══════════════════════════════════════════════════════════════════════════════

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize the event bus connection
 */
export async function initializeEventBus(): Promise<void> {
  if (!config.eventBus.enabled) {
    console.log('[EventBus] Event bus disabled via configuration');
    return;
  }

  if (redisClient && isConnected) {
    return;
  }

  try {
    redisClient = createClient({
      url: config.eventBus.redisUrl,
    });

    redisClient.on('error', (err) => {
      console.error('[EventBus] Redis client error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[EventBus] Connected to Redis');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[EventBus] Reconnecting to Redis...');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('[EventBus] Failed to initialize:', error);
    // Don't throw - event bus failure shouldn't block core payment processing
  }
}

/**
 * Publish an event to the event bus
 */
export async function publishEvent(event: BillingEvent): Promise<boolean> {
  if (!config.eventBus.enabled) {
    console.log('[EventBus] Skipping publish (disabled)', {
      eventType: event.eventType,
    });
    return false;
  }

  if (!redisClient || !isConnected) {
    console.warn('[EventBus] Not connected, event will not be published', {
      eventType: event.eventType,
      subscriptionId: event.subscriptionId,
    });
    return false;
  }

  const channel = `${config.eventBus.channelPrefix}:${event.eventType}`;

  try {
    const message = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      source: 'payments-svc',
    });

    await redisClient.publish(channel, message);

    console.log('[EventBus] Published event', {
      channel,
      eventType: event.eventType,
      subscriptionId: event.subscriptionId,
      correlationId: event.correlationId,
    });

    return true;
  } catch (error) {
    console.error('[EventBus] Failed to publish event', {
      channel,
      eventType: event.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Gracefully shutdown the event bus connection
 */
export async function shutdownEventBus(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[EventBus] Disconnected from Redis');
    } catch (error) {
      console.error('[EventBus] Error during shutdown:', error);
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
}

/**
 * Check if event bus is connected
 */
export function isEventBusConnected(): boolean {
  return isConnected;
}
