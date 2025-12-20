/**
 * Notification Events
 *
 * NATS event publishing for notification lifecycle events.
 * Events:
 * - notification.sent
 * - notification.delivered
 * - notification.failed
 * - notification.read
 * - device.registered
 * - device.unregistered
 */

import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationSentEvent {
  tenantId: string;
  notificationId: string;
  recipientId: string;
  channel: string;
  providerMessageId?: string;
  timestamp: string;
}

export interface NotificationDeliveredEvent {
  tenantId: string;
  notificationId: string;
  recipientId: string;
  channel: string;
  deliveredAt: string;
}

export interface NotificationFailedEvent {
  tenantId: string;
  notificationId: string;
  recipientId: string;
  channel: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  timestamp: string;
}

export interface NotificationReadEvent {
  tenantId: string;
  notificationId: string;
  recipientId: string;
  readAt: string;
}

export interface DeviceRegisteredEvent {
  tenantId: string;
  userId: string;
  deviceId: string;
  platform: string;
  timestamp: string;
}

export interface DeviceUnregisteredEvent {
  tenantId: string;
  userId: string;
  deviceId: string;
  platform: string;
  timestamp: string;
}

type NotificationEventType =
  | 'notification.sent'
  | 'notification.delivered'
  | 'notification.failed'
  | 'notification.read';

type DeviceEventType = 'device.registered' | 'device.unregistered';

// ══════════════════════════════════════════════════════════════════════════════
// NATS CLIENT
// ══════════════════════════════════════════════════════════════════════════════

// In-memory event queue for when NATS is not available
const eventQueue: Array<{ subject: string; data: unknown }> = [];
const MAX_QUEUE_SIZE = 1000;

// NATS connection placeholder - would be initialized with actual NATS client
let natsClient: {
  publish: (subject: string, data: Uint8Array) => void;
  isConnected: () => boolean;
} | null = null;

/**
 * Initialize NATS connection
 */
export async function initializeNats(): Promise<boolean> {
  if (!config.nats.enabled) {
    console.log('[NotificationEvents] NATS disabled, using in-memory queue');
    return false;
  }

  try {
    // In production, use @aivo/events library
    // const { connect } = await import('@aivo/events');
    // natsClient = await connect(config.nats.url);
    
    console.log('[NotificationEvents] NATS connection placeholder initialized');
    return true;
  } catch (error) {
    console.error('[NotificationEvents] Failed to connect to NATS:', error);
    return false;
  }
}

/**
 * Close NATS connection
 */
export async function closeNats(): Promise<void> {
  if (natsClient) {
    // await natsClient.close();
    natsClient = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PUBLISHING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Emit a notification lifecycle event
 */
export async function emitNotificationEvent(
  eventType: NotificationEventType,
  data: Omit<NotificationSentEvent | NotificationDeliveredEvent | NotificationFailedEvent | NotificationReadEvent, 'timestamp'>
): Promise<void> {
  const event = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  const subject = `notify.${eventType.replace('.', '_')}`;

  await publishEvent(subject, event);
}

/**
 * Emit a device lifecycle event
 */
export async function emitDeviceEvent(
  eventType: DeviceEventType,
  data: Omit<DeviceRegisteredEvent | DeviceUnregisteredEvent, 'timestamp'>
): Promise<void> {
  const event = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  const subject = `notify.${eventType.replace('.', '_')}`;

  await publishEvent(subject, event);
}

/**
 * Emit notification sent event
 */
export async function emitNotificationSent(
  tenantId: string,
  notificationId: string,
  recipientId: string,
  channel: string,
  providerMessageId?: string
): Promise<void> {
  await emitNotificationEvent('notification.sent', {
    tenantId,
    notificationId,
    recipientId,
    channel,
    providerMessageId,
  });
}

/**
 * Emit notification delivered event
 */
export async function emitNotificationDelivered(
  tenantId: string,
  notificationId: string,
  recipientId: string,
  channel: string
): Promise<void> {
  await emitNotificationEvent('notification.delivered', {
    tenantId,
    notificationId,
    recipientId,
    channel,
    deliveredAt: new Date().toISOString(),
  });
}

/**
 * Emit notification failed event
 */
export async function emitNotificationFailed(
  tenantId: string,
  notificationId: string,
  recipientId: string,
  channel: string,
  errorCode: string,
  errorMessage: string,
  retryable: boolean
): Promise<void> {
  await emitNotificationEvent('notification.failed', {
    tenantId,
    notificationId,
    recipientId,
    channel,
    errorCode,
    errorMessage,
    retryable,
  });
}

/**
 * Emit notification read event
 */
export async function emitNotificationRead(
  tenantId: string,
  notificationId: string,
  recipientId: string
): Promise<void> {
  await emitNotificationEvent('notification.read', {
    tenantId,
    notificationId,
    recipientId,
    readAt: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function publishEvent(subject: string, data: unknown): Promise<void> {
  const payload = JSON.stringify(data);

  if (natsClient?.isConnected()) {
    try {
      const encoder = new TextEncoder();
      natsClient.publish(subject, encoder.encode(payload));
      console.log('[NotificationEvents] Event published:', { subject });
    } catch (error) {
      console.error('[NotificationEvents] Failed to publish event:', error);
      queueEvent(subject, data);
    }
  } else {
    // Queue event for later delivery
    queueEvent(subject, data);
  }
}

function queueEvent(subject: string, data: unknown): void {
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest event
    eventQueue.shift();
    console.warn('[NotificationEvents] Event queue full, dropping oldest event');
  }

  eventQueue.push({ subject, data });
  console.log('[NotificationEvents] Event queued:', {
    subject,
    queueSize: eventQueue.length,
  });
}

/**
 * Get queued events (for testing/debugging)
 */
export function getQueuedEvents(): Array<{ subject: string; data: unknown }> {
  return [...eventQueue];
}

/**
 * Clear queued events
 */
export function clearQueuedEvents(): number {
  const count = eventQueue.length;
  eventQueue.length = 0;
  return count;
}

/**
 * Flush queued events to NATS
 */
export async function flushQueuedEvents(): Promise<{
  flushed: number;
  failed: number;
}> {
  if (!natsClient?.isConnected()) {
    return { flushed: 0, failed: eventQueue.length };
  }

  const events = [...eventQueue];
  eventQueue.length = 0;

  let flushed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const encoder = new TextEncoder();
      natsClient.publish(event.subject, encoder.encode(JSON.stringify(event.data)));
      flushed++;
    } catch (error) {
      console.error('[NotificationEvents] Failed to flush event:', error);
      eventQueue.push(event);
      failed++;
    }
  }

  console.log('[NotificationEvents] Queue flushed:', { flushed, failed });

  return { flushed, failed };
}

// ══════════════════════════════════════════════════════════════════════════════
// METRICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get event publishing stats
 */
export function getEventStats(): {
  queueSize: number;
  natsConnected: boolean;
} {
  return {
    queueSize: eventQueue.length,
    natsConnected: natsClient?.isConnected() ?? false,
  };
}
