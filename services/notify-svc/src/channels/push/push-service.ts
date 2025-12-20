/**
 * Unified Push Notification Service
 *
 * Orchestrates FCM and APNs for cross-platform push notifications.
 * Handles:
 * - Platform-specific routing
 * - Circuit breaker for provider outages
 * - Dead letter queue for failed notifications
 * - Metrics and alerting
 */

import { config } from '../../config.js';
import type { PushPayload, DeliveryResult, BatchDeliveryResult } from '../../types.js';
import { DeliveryChannel } from '../../prisma.js';
import * as fcm from './fcm.js';
import * as apns from './apns.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
  nextRetryAt: Date | null;
}

export interface PushServiceMetrics {
  totalSent: number;
  totalFailed: number;
  fcmSent: number;
  fcmFailed: number;
  apnsSent: number;
  apnsFailed: number;
  invalidTokensRemoved: number;
}

interface DeadLetterEntry {
  payload: PushPayload;
  error: string;
  timestamp: Date;
  retryCount: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute before half-open state
const FAILURE_RATE_ALERT_THRESHOLD = 0.05; // Alert if >5% failure rate

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

const circuitBreakers: Record<string, CircuitBreakerState> = {
  fcm: { failures: 0, lastFailure: null, isOpen: false, nextRetryAt: null },
  apns: { failures: 0, lastFailure: null, isOpen: false, nextRetryAt: null },
};

const metrics: PushServiceMetrics = {
  totalSent: 0,
  totalFailed: 0,
  fcmSent: 0,
  fcmFailed: 0,
  apnsSent: 0,
  apnsFailed: 0,
  invalidTokensRemoved: 0,
};

const deadLetterQueue: DeadLetterEntry[] = [];
const MAX_DEAD_LETTER_SIZE = 10000;

// Callback for token invalidation
let onInvalidToken: ((token: string, userId: string, tenantId: string) => Promise<void>) | null = null;

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize push notification providers
 */
export function initializePushService(): { fcm: boolean; apns: boolean } {
  const fcmInitialized = config.fcm.enabled ? fcm.initializeFcm() : false;
  const apnsInitialized = config.apns.enabled ? apns.initializeApns() : false;

  console.log('[PushService] Initialized:', { fcm: fcmInitialized, apns: apnsInitialized });

  return { fcm: fcmInitialized, apns: apnsInitialized };
}

/**
 * Shutdown push notification providers
 */
export async function shutdownPushService(): Promise<void> {
  await Promise.all([fcm.shutdownFcm(), apns.shutdownApns()]);
  console.log('[PushService] Shut down');
}

/**
 * Register callback for invalid token handling
 */
export function setInvalidTokenCallback(
  callback: (token: string, userId: string, tenantId: string) => Promise<void>
): void {
  onInvalidToken = callback;
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send a push notification to a single device
 */
export async function sendPushNotification(
  payload: PushPayload & { userId?: string; tenantId?: string }
): Promise<DeliveryResult> {
  const provider = getProviderForPlatform(payload.platform);

  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    console.warn(`[PushService] Circuit open for ${provider}, queueing message`);
    addToDeadLetter(payload, 'Circuit breaker open');
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'CIRCUIT_OPEN',
      errorMessage: `${provider} circuit breaker is open`,
    };
  }

  let result: DeliveryResult;

  try {
    if (provider === 'fcm') {
      result = await fcm.sendFcmNotification(payload);
    } else {
      result = await apns.sendApnsNotification(payload);
    }

    // Update metrics and circuit breaker
    if (result.success) {
      recordSuccess(provider);
    } else {
      recordFailure(provider);
      
      // Handle invalid token
      if (result.shouldRemoveToken && onInvalidToken && payload.userId && payload.tenantId) {
        await onInvalidToken(payload.token, payload.userId, payload.tenantId);
        metrics.invalidTokensRemoved++;
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    recordFailure(provider);
    addToDeadLetter(payload, errorMessage);

    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'PUSH_ERROR',
      errorMessage,
    };
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendPushBatch(
  payloads: Array<PushPayload & { userId?: string; tenantId?: string }>
): Promise<BatchDeliveryResult> {
  // Separate by platform
  const androidPayloads = payloads.filter((p) => p.platform === 'android' || p.platform === 'web');
  const iosPayloads = payloads.filter((p) => p.platform === 'ios');

  const results: BatchDeliveryResult['results'] = [];
  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokens: string[] = [];

  // Send Android/Web via FCM
  if (androidPayloads.length > 0 && !isCircuitOpen('fcm')) {
    const fcmResult = await fcm.sendFcmBatch(androidPayloads);
    results.push(...fcmResult.results);
    totalSent += fcmResult.totalSent;
    totalFailed += fcmResult.totalFailed;

    if (fcmResult.invalidTokens) {
      invalidTokens.push(...fcmResult.invalidTokens);
    }

    // Update metrics
    metrics.fcmSent += fcmResult.totalSent;
    metrics.fcmFailed += fcmResult.totalFailed;

    if (fcmResult.totalFailed > 0) {
      recordFailure('fcm');
    } else {
      recordSuccess('fcm');
    }
  } else if (androidPayloads.length > 0) {
    // Circuit is open, add to dead letter
    for (const payload of androidPayloads) {
      addToDeadLetter(payload, 'FCM circuit breaker open');
      results.push({
        token: payload.token,
        success: false,
        errorCode: 'CIRCUIT_OPEN',
        errorMessage: 'FCM circuit breaker is open',
      });
    }
    totalFailed += androidPayloads.length;
  }

  // Send iOS via APNs (or FCM if APNs not configured)
  if (iosPayloads.length > 0) {
    if (config.apns.enabled && !isCircuitOpen('apns')) {
      const apnsResult = await apns.sendApnsBatch(iosPayloads);
      results.push(...apnsResult.results);
      totalSent += apnsResult.totalSent;
      totalFailed += apnsResult.totalFailed;

      if (apnsResult.invalidTokens) {
        invalidTokens.push(...apnsResult.invalidTokens);
      }

      metrics.apnsSent += apnsResult.totalSent;
      metrics.apnsFailed += apnsResult.totalFailed;

      if (apnsResult.totalFailed > 0) {
        recordFailure('apns');
      } else {
        recordSuccess('apns');
      }
    } else if (!isCircuitOpen('fcm')) {
      // Fallback to FCM for iOS
      const fcmResult = await fcm.sendFcmBatch(iosPayloads);
      results.push(...fcmResult.results);
      totalSent += fcmResult.totalSent;
      totalFailed += fcmResult.totalFailed;

      if (fcmResult.invalidTokens) {
        invalidTokens.push(...fcmResult.invalidTokens);
      }

      metrics.fcmSent += fcmResult.totalSent;
      metrics.fcmFailed += fcmResult.totalFailed;
    } else {
      // Both circuits are open
      for (const payload of iosPayloads) {
        addToDeadLetter(payload, 'All circuits open');
        results.push({
          token: payload.token,
          success: false,
          errorCode: 'CIRCUIT_OPEN',
          errorMessage: 'All push circuits are open',
        });
      }
      totalFailed += iosPayloads.length;
    }
  }

  // Handle invalid tokens
  if (invalidTokens.length > 0 && onInvalidToken) {
    const tokenToPayload = new Map(payloads.map((p) => [p.token, p]));
    for (const token of invalidTokens) {
      const payload = tokenToPayload.get(token);
      if (payload?.userId && payload?.tenantId) {
        await onInvalidToken(token, payload.userId, payload.tenantId);
        metrics.invalidTokensRemoved++;
      }
    }
  }

  // Update totals
  metrics.totalSent += totalSent;
  metrics.totalFailed += totalFailed;

  // Check failure rate and alert if needed
  checkFailureRate();

  return {
    channel: DeliveryChannel.PUSH,
    totalSent,
    totalFailed,
    results,
    invalidTokens,
  };
}

/**
 * Send notification to a topic (FCM only)
 */
export async function sendToTopic(
  topic: string,
  payload: Omit<PushPayload, 'token' | 'platform'>
): Promise<DeliveryResult> {
  if (isCircuitOpen('fcm')) {
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'CIRCUIT_OPEN',
      errorMessage: 'FCM circuit breaker is open',
    };
  }

  const result = await fcm.sendToTopic(topic, payload);

  if (result.success) {
    recordSuccess('fcm');
    metrics.fcmSent++;
  } else {
    recordFailure('fcm');
    metrics.fcmFailed++;
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOPIC MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribe device to tenant and role topics
 */
export async function subscribeToTopics(
  token: string,
  tenantId: string,
  roles: string[]
): Promise<void> {
  const topics = [
    fcm.buildTenantTopic(tenantId),
    ...roles.map((role) => fcm.buildRoleTopic(tenantId, role)),
  ];

  for (const topic of topics) {
    try {
      await fcm.subscribeToTopic([token], topic);
    } catch (error) {
      console.error(`[PushService] Failed to subscribe to topic ${topic}:`, error);
    }
  }
}

/**
 * Unsubscribe device from all topics
 */
export async function unsubscribeFromTopics(
  token: string,
  tenantId: string,
  roles: string[]
): Promise<void> {
  const topics = [
    fcm.buildTenantTopic(tenantId),
    ...roles.map((role) => fcm.buildRoleTopic(tenantId, role)),
  ];

  for (const topic of topics) {
    try {
      await fcm.unsubscribeFromTopic([token], topic);
    } catch (error) {
      console.error(`[PushService] Failed to unsubscribe from topic ${topic}:`, error);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ══════════════════════════════════════════════════════════════════════════════

function getProviderForPlatform(platform: string): 'fcm' | 'apns' {
  // For iOS, prefer APNs if configured, otherwise fall back to FCM
  if (platform === 'ios' && config.apns.enabled) {
    return 'apns';
  }
  return 'fcm';
}

function isCircuitOpen(provider: 'fcm' | 'apns'): boolean {
  const state = circuitBreakers[provider];

  if (!state.isOpen) {
    return false;
  }

  // Check if we should try half-open state
  if (state.nextRetryAt && new Date() >= state.nextRetryAt) {
    console.log(`[PushService] ${provider} circuit entering half-open state`);
    return false;
  }

  return true;
}

function recordSuccess(provider: 'fcm' | 'apns'): void {
  const state = circuitBreakers[provider];
  
  // Reset circuit breaker on success
  if (state.isOpen || state.failures > 0) {
    console.log(`[PushService] ${provider} circuit closed after success`);
    state.failures = 0;
    state.isOpen = false;
    state.nextRetryAt = null;
  }
}

function recordFailure(provider: 'fcm' | 'apns'): void {
  const state = circuitBreakers[provider];
  state.failures++;
  state.lastFailure = new Date();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD && !state.isOpen) {
    state.isOpen = true;
    state.nextRetryAt = new Date(Date.now() + CIRCUIT_BREAKER_RESET_MS);
    console.warn(`[PushService] ${provider} circuit opened after ${state.failures} failures`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DEAD LETTER QUEUE
// ══════════════════════════════════════════════════════════════════════════════

function addToDeadLetter(payload: PushPayload, error: string): void {
  if (deadLetterQueue.length >= MAX_DEAD_LETTER_SIZE) {
    // Remove oldest entry
    deadLetterQueue.shift();
  }

  deadLetterQueue.push({
    payload,
    error,
    timestamp: new Date(),
    retryCount: 0,
  });
}

/**
 * Get dead letter queue entries
 */
export function getDeadLetterQueue(): DeadLetterEntry[] {
  return [...deadLetterQueue];
}

/**
 * Retry dead letter queue entries
 */
export async function retryDeadLetterQueue(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const entries = [...deadLetterQueue];
  deadLetterQueue.length = 0;

  let succeeded = 0;
  let failed = 0;

  for (const entry of entries) {
    if (entry.retryCount >= 3) {
      console.warn('[PushService] Max retries exceeded for dead letter entry');
      failed++;
      continue;
    }

    const result = await sendPushNotification(entry.payload);
    
    if (result.success) {
      succeeded++;
    } else {
      entry.retryCount++;
      deadLetterQueue.push(entry);
      failed++;
    }
  }

  return {
    retried: entries.length,
    succeeded,
    failed,
  };
}

/**
 * Clear dead letter queue
 */
export function clearDeadLetterQueue(): number {
  const count = deadLetterQueue.length;
  deadLetterQueue.length = 0;
  return count;
}

// ══════════════════════════════════════════════════════════════════════════════
// METRICS & ALERTING
// ══════════════════════════════════════════════════════════════════════════════

function checkFailureRate(): void {
  const total = metrics.totalSent + metrics.totalFailed;
  if (total < 100) return; // Not enough data

  const failureRate = metrics.totalFailed / total;
  if (failureRate > FAILURE_RATE_ALERT_THRESHOLD) {
    console.error('[PushService] High failure rate detected:', {
      failureRate: `${(failureRate * 100).toFixed(2)}%`,
      totalSent: metrics.totalSent,
      totalFailed: metrics.totalFailed,
    });
    // In production, this would trigger an alert (PagerDuty, Slack, etc.)
  }
}

/**
 * Get current metrics
 */
export function getMetrics(): PushServiceMetrics {
  return { ...metrics };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.totalSent = 0;
  metrics.totalFailed = 0;
  metrics.fcmSent = 0;
  metrics.fcmFailed = 0;
  metrics.apnsSent = 0;
  metrics.apnsFailed = 0;
  metrics.invalidTokensRemoved = 0;
}

/**
 * Get circuit breaker states
 */
export function getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
  return { ...circuitBreakers };
}

/**
 * Get push service status
 */
export function getPushServiceStatus(): {
  fcm: { enabled: boolean; circuitOpen: boolean };
  apns: { enabled: boolean; circuitOpen: boolean; production: boolean };
  metrics: PushServiceMetrics;
  deadLetterQueueSize: number;
} {
  return {
    fcm: {
      enabled: config.fcm.enabled,
      circuitOpen: isCircuitOpen('fcm'),
    },
    apns: {
      enabled: config.apns.enabled,
      circuitOpen: isCircuitOpen('apns'),
      production: config.apns.production,
    },
    metrics: getMetrics(),
    deadLetterQueueSize: deadLetterQueue.length,
  };
}
