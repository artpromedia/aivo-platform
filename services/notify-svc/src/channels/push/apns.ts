/**
 * Apple Push Notification service (APNs) Integration
 *
 * Production-ready APNs implementation for native iOS push notifications.
 * Supports:
 * - JWT-based authentication (not certificate-based)
 * - Development and production environments
 * - Silent/background notifications
 * - Proper error handling for invalid tokens
 * - Retry logic with exponential backoff
 * - Batch sending
 */

import apn from '@parse/node-apn';

import { config } from '../../config.js';
import type { PushPayload, DeliveryResult, BatchDeliveryResult } from '../../types.js';
import { DeliveryChannel } from '../../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ApnsConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  production: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const APNS_BATCH_SIZE = 1000; // APNs can handle more than FCM

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// Error reasons that indicate token is invalid and should be removed
const INVALID_TOKEN_REASONS = [
  'BadDeviceToken',
  'Unregistered',
  'DeviceTokenNotForTopic',
  'ExpiredProviderToken',
];

// Error reasons that are retryable
const RETRYABLE_REASONS = [
  'ServiceUnavailable',
  'InternalServerError',
  'Shutdown',
  'TooManyRequests',
];

// ══════════════════════════════════════════════════════════════════════════════
// APNS CLIENT
// ══════════════════════════════════════════════════════════════════════════════

let apnsProvider: apn.Provider | null = null;
let isInitialized = false;

/**
 * Initialize APNs provider with JWT authentication
 */
export function initializeApns(apnsConfig?: ApnsConfig): boolean {
  if (isInitialized && apnsProvider) {
    return true;
  }

  const keyId = apnsConfig?.keyId || config.apns.keyId;
  const teamId = apnsConfig?.teamId || config.apns.teamId;
  const privateKey = apnsConfig?.privateKey || config.apns.privateKey;
  const bundleId = apnsConfig?.bundleId || config.apns.bundleId;
  const production = apnsConfig?.production ?? config.apns.production;

  if (!keyId || !teamId || !privateKey || !bundleId) {
    console.warn('[APNs] Missing configuration, APNs will be disabled');
    return false;
  }

  try {
    // Parse private key (handle escaped newlines from env vars)
    const parsedPrivateKey = privateKey.replace(/\\n/g, '\n');

    apnsProvider = new apn.Provider({
      token: {
        key: parsedPrivateKey,
        keyId,
        teamId,
      },
      production,
    });

    isInitialized = true;
    console.log('[APNs] Provider initialized successfully', {
      production,
      bundleId,
    });
    return true;
  } catch (error) {
    console.error('[APNs] Failed to initialize provider:', error);
    return false;
  }
}

/**
 * Shutdown APNs provider
 */
export async function shutdownApns(): Promise<void> {
  if (apnsProvider) {
    await apnsProvider.shutdown();
    apnsProvider = null;
    isInitialized = false;
    console.log('[APNs] Provider shut down');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE NOTIFICATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send a single push notification via APNs
 */
export async function sendApnsNotification(
  payload: PushPayload,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<DeliveryResult> {
  if (!isInitialized || !apnsProvider) {
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'APNS_NOT_INITIALIZED',
      errorMessage: 'APNs is not initialized',
    };
  }

  const notification = buildApnsNotification(payload);

  try {
    const result = await sendWithRetry(notification, payload.token, retryConfig);
    
    if (result.sent.length > 0) {
      console.log('[APNs] Message sent successfully:', {
        token: payload.token.substring(0, 20) + '...',
      });

      return {
        channel: DeliveryChannel.PUSH,
        success: true,
        providerName: 'apns',
      };
    }

    if (result.failed.length > 0) {
      const failure = result.failed[0];
      const isInvalidToken = INVALID_TOKEN_REASONS.includes(failure.response?.reason || '');

      console.error('[APNs] Send failed:', {
        reason: failure.response?.reason,
        status: failure.status,
        isInvalidToken,
      });

      return {
        channel: DeliveryChannel.PUSH,
        success: false,
        errorCode: failure.response?.reason || 'APNS_SEND_ERROR',
        errorMessage: `APNs error: ${failure.response?.reason}`,
        shouldRemoveToken: isInvalidToken,
      };
    }

    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'APNS_UNKNOWN_ERROR',
      errorMessage: 'Unknown APNs error',
    };
  } catch (error) {
    const apnsError = error as Error;
    console.error('[APNs] Send error:', apnsError.message);

    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'APNS_ERROR',
      errorMessage: apnsError.message,
    };
  }
}

/**
 * Build APNs notification from payload
 */
function buildApnsNotification(payload: PushPayload): apn.Notification {
  const notification = new apn.Notification();

  // Bundle ID
  notification.topic = config.apns.bundleId;

  // Alert content
  if (!payload.contentAvailable) {
    notification.alert = {
      title: payload.title,
      body: payload.body,
    };
  }

  // Badge
  if (payload.badge !== undefined) {
    notification.badge = payload.badge;
  }

  // Sound
  notification.sound = payload.sound || 'default';

  // Custom data
  if (payload.data) {
    notification.payload = payload.data;
  }

  // Silent/background notification
  if (payload.contentAvailable) {
    notification.contentAvailable = true;
    notification.pushType = 'background';
  } else {
    notification.pushType = 'alert';
  }

  // Mutable content (for notification service extension)
  if (payload.mutableContent) {
    notification.mutableContent = true;
  }

  // Thread ID for grouping
  if (payload.threadId) {
    notification.threadId = payload.threadId;
  }

  // Category for actions
  if (payload.category) {
    notification.category = payload.category;
  }

  // Collapse ID
  if (payload.collapseKey) {
    notification.collapseId = payload.collapseKey;
  }

  // Priority
  notification.priority = payload.priority === 'high' ? 10 : 5;

  // Expiration
  if (payload.ttlSeconds) {
    notification.expiry = Math.floor(Date.now() / 1000) + payload.ttlSeconds;
  }

  return notification;
}

/**
 * Send notification with exponential backoff retry
 */
async function sendWithRetry(
  notification: apn.Notification,
  token: string,
  retryConfig: RetryConfig
): Promise<apn.Responses> {
  let lastResult: apn.Responses | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    const result = await apnsProvider!.send(notification, token);
    lastResult = result;

    // Success
    if (result.sent.length > 0) {
      return result;
    }

    // Check if error is retryable
    if (result.failed.length > 0) {
      const failure = result.failed[0];
      const reason = failure.response?.reason || '';

      if (!RETRYABLE_REASONS.includes(reason)) {
        return result; // Non-retryable error
      }

      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelayMs * Math.pow(2, attempt),
          retryConfig.maxDelayMs
        );
        console.log(`[APNs] Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  return lastResult!;
}

// ══════════════════════════════════════════════════════════════════════════════
// BATCH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send batch notifications to multiple tokens
 */
export async function sendApnsBatch(
  payloads: PushPayload[]
): Promise<BatchDeliveryResult> {
  if (!isInitialized || !apnsProvider) {
    return {
      channel: DeliveryChannel.PUSH,
      totalSent: 0,
      totalFailed: payloads.length,
      results: payloads.map((p) => ({
        token: p.token,
        success: false,
        errorCode: 'APNS_NOT_INITIALIZED',
        errorMessage: 'APNs is not initialized',
      })),
    };
  }

  const results: BatchDeliveryResult['results'] = [];
  let totalSent = 0;
  let totalFailed = 0;

  // Split into batches
  for (let i = 0; i < payloads.length; i += APNS_BATCH_SIZE) {
    const batch = payloads.slice(i, i + APNS_BATCH_SIZE);
    const batchResult = await sendSingleBatch(batch);
    
    results.push(...batchResult.results);
    totalSent += batchResult.totalSent;
    totalFailed += batchResult.totalFailed;
  }

  return {
    channel: DeliveryChannel.PUSH,
    totalSent,
    totalFailed,
    results,
    invalidTokens: results
      .filter((r) => r.shouldRemoveToken)
      .map((r) => r.token),
  };
}

/**
 * Send a single batch
 */
async function sendSingleBatch(
  payloads: PushPayload[]
): Promise<BatchDeliveryResult> {
  // For APNs, we need to send individual notifications
  // but the provider handles connection pooling
  const firstPayload = payloads[0];
  const notification = buildApnsNotification(firstPayload);
  const tokens = payloads.map((p) => p.token);

  try {
    const response = await apnsProvider!.send(notification, tokens);

    const results: BatchDeliveryResult['results'] = [];

    // Successful sends
    for (const device of response.sent) {
      results.push({
        token: device.device,
        success: true,
      });
    }

    // Failed sends
    for (const failure of response.failed) {
      const isInvalidToken = INVALID_TOKEN_REASONS.includes(failure.response?.reason || '');
      results.push({
        token: failure.device,
        success: false,
        errorCode: failure.response?.reason || 'APNS_ERROR',
        errorMessage: `APNs error: ${failure.response?.reason}`,
        shouldRemoveToken: isInvalidToken,
      });
    }

    console.log('[APNs] Batch sent:', {
      total: tokens.length,
      success: response.sent.length,
      failure: response.failed.length,
    });

    return {
      channel: DeliveryChannel.PUSH,
      totalSent: response.sent.length,
      totalFailed: response.failed.length,
      results,
    };
  } catch (error) {
    const apnsError = error as Error;
    console.error('[APNs] Batch send failed:', apnsError.message);

    return {
      channel: DeliveryChannel.PUSH,
      totalSent: 0,
      totalFailed: tokens.length,
      results: tokens.map((token) => ({
        token,
        success: false,
        errorCode: 'BATCH_SEND_ERROR',
        errorMessage: apnsError.message,
      })),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SILENT NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send a silent/background notification
 * Used for updating app content without user interaction
 */
export async function sendSilentNotification(
  token: string,
  data: Record<string, unknown>
): Promise<DeliveryResult> {
  return sendApnsNotification({
    token,
    platform: 'ios',
    title: '',
    body: '',
    data: data as Record<string, string>,
    contentAvailable: true,
    priority: 'normal', // Silent notifications should use normal priority
  });
}

/**
 * Send silent notifications to multiple tokens
 */
export async function sendSilentBatch(
  tokens: string[],
  data: Record<string, unknown>
): Promise<BatchDeliveryResult> {
  const payloads: PushPayload[] = tokens.map((token) => ({
    token,
    platform: 'ios' as const,
    title: '',
    body: '',
    data: data as Record<string, string>,
    contentAvailable: true,
    priority: 'normal' as const,
  }));

  return sendApnsBatch(payloads);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a token appears to be a valid APNs device token
 * Note: This only validates format, not if the token is registered
 */
export function isValidTokenFormat(token: string): boolean {
  // APNs device tokens are 64 hex characters
  return /^[a-fA-F0-9]{64}$/.test(token);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get APNs status
 */
export function getApnsStatus(): { initialized: boolean; production: boolean } {
  return {
    initialized: isInitialized,
    production: config.apns.production,
  };
}
