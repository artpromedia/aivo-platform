/**
 * Firebase Cloud Messaging (FCM) Integration
 *
 * Production-ready FCM implementation for Android, iOS (via FCM), and Web push notifications.
 * Supports:
 * - Device token registration and refresh
 * - Notification + data payloads
 * - Topic-based subscriptions (by tenant, by role)
 * - Token invalidation and cleanup
 * - Retry logic with exponential backoff
 * - Batch sending (up to 500 per batch)
 */

import * as admin from 'firebase-admin';
import type { Message, MulticastMessage, BatchResponse, SendResponse } from 'firebase-admin/messaging';

import { config } from '../../config.js';
import type { PushPayload, DeliveryResult, BatchDeliveryResult } from '../../types.js';
import { DeliveryChannel } from '../../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FcmConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface TopicSubscription {
  token: string;
  topic: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const FCM_BATCH_SIZE = 500; // FCM's maximum batch size
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// Error codes that indicate token is invalid and should be removed
const INVALID_TOKEN_ERRORS = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
];

// Error codes that are retryable
const RETRYABLE_ERRORS = [
  'messaging/server-unavailable',
  'messaging/internal-error',
  'messaging/quota-exceeded',
];

// ══════════════════════════════════════════════════════════════════════════════
// FCM CLIENT
// ══════════════════════════════════════════════════════════════════════════════

let fcmApp: admin.app.App | null = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFcm(fcmConfig?: FcmConfig): boolean {
  if (isInitialized && fcmApp) {
    return true;
  }

  const projectId = fcmConfig?.projectId || config.fcm.projectId;
  const privateKey = fcmConfig?.privateKey || config.fcm.privateKey;
  const clientEmail = fcmConfig?.clientEmail || config.fcm.clientEmail;

  if (!projectId || !privateKey || !clientEmail) {
    console.warn('[FCM] Missing configuration, FCM will be disabled');
    return false;
  }

  try {
    // Parse private key (handle escaped newlines from env vars)
    const parsedPrivateKey = privateKey.replace(/\\n/g, '\n');

    fcmApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: parsedPrivateKey,
        clientEmail,
      }),
    }, 'aivo-notify-svc');

    isInitialized = true;
    console.log('[FCM] Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Failed to initialize Firebase Admin SDK:', error);
    return false;
  }
}

/**
 * Get the FCM messaging instance
 */
function getMessaging(): admin.messaging.Messaging {
  if (!fcmApp) {
    throw new Error('FCM not initialized. Call initializeFcm() first.');
  }
  return admin.messaging(fcmApp);
}

/**
 * Shutdown FCM client
 */
export async function shutdownFcm(): Promise<void> {
  if (fcmApp) {
    await fcmApp.delete();
    fcmApp = null;
    isInitialized = false;
    console.log('[FCM] Firebase Admin SDK shut down');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE NOTIFICATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send a single push notification via FCM
 */
export async function sendFcmNotification(
  payload: PushPayload,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<DeliveryResult> {
  if (!isInitialized) {
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'FCM_NOT_INITIALIZED',
      errorMessage: 'FCM is not initialized',
    };
  }

  const message = buildFcmMessage(payload);

  try {
    const messageId = await sendWithRetry(message, retryConfig);
    
    console.log('[FCM] Message sent successfully:', {
      messageId,
      token: payload.token.substring(0, 20) + '...',
    });

    return {
      channel: DeliveryChannel.PUSH,
      success: true,
      providerMessageId: messageId,
      providerName: 'fcm',
    };
  } catch (error) {
    const fcmError = error as admin.FirebaseError;
    const isInvalidToken = INVALID_TOKEN_ERRORS.includes(fcmError.code);

    console.error('[FCM] Send failed:', {
      code: fcmError.code,
      message: fcmError.message,
      isInvalidToken,
    });

    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: fcmError.code || 'FCM_SEND_ERROR',
      errorMessage: fcmError.message,
      shouldRemoveToken: isInvalidToken,
    };
  }
}

/**
 * Build FCM message from payload
 */
function buildFcmMessage(payload: PushPayload): Message {
  const message: Message = {
    token: payload.token,
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
    },
    data: payload.data ? stringifyData(payload.data) : undefined,
  };

  // Platform-specific configuration
  if (payload.platform === 'android') {
    message.android = {
      priority: payload.priority === 'high' ? 'high' : 'normal',
      notification: {
        channelId: payload.channelId || 'default',
        sound: payload.sound || 'default',
        clickAction: payload.clickAction,
        ...(payload.badge !== undefined && { notificationCount: payload.badge }),
      },
      ttl: payload.ttlSeconds ? payload.ttlSeconds * 1000 : undefined,
      collapseKey: payload.collapseKey,
    };
  }

  if (payload.platform === 'ios' || payload.platform === 'web') {
    message.apns = {
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          badge: payload.badge,
          sound: payload.sound || 'default',
          contentAvailable: payload.contentAvailable,
          mutableContent: payload.mutableContent,
          threadId: payload.threadId,
          category: payload.category,
        },
      },
      headers: {
        'apns-priority': payload.priority === 'high' ? '10' : '5',
        ...(payload.ttlSeconds && { 'apns-expiration': String(Math.floor(Date.now() / 1000) + payload.ttlSeconds) }),
        ...(payload.collapseKey && { 'apns-collapse-id': payload.collapseKey }),
      },
    };
  }

  if (payload.platform === 'web') {
    message.webpush = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        ...(payload.imageUrl && { image: payload.imageUrl }),
      },
      fcmOptions: {
        link: payload.clickAction,
      },
    };
  }

  return message;
}

/**
 * Send message with exponential backoff retry
 */
async function sendWithRetry(
  message: Message,
  retryConfig: RetryConfig
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await getMessaging().send(message);
    } catch (error) {
      lastError = error as Error;
      const fcmError = error as admin.FirebaseError;

      // Don't retry on non-retryable errors
      if (!RETRYABLE_ERRORS.includes(fcmError.code)) {
        throw error;
      }

      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelayMs * Math.pow(2, attempt),
          retryConfig.maxDelayMs
        );
        console.log(`[FCM] Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ══════════════════════════════════════════════════════════════════════════════
// BATCH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send batch notifications (up to 500 per batch)
 */
export async function sendFcmBatch(
  payloads: PushPayload[]
): Promise<BatchDeliveryResult> {
  if (!isInitialized) {
    return {
      channel: DeliveryChannel.PUSH,
      totalSent: 0,
      totalFailed: payloads.length,
      results: payloads.map((p) => ({
        token: p.token,
        success: false,
        errorCode: 'FCM_NOT_INITIALIZED',
        errorMessage: 'FCM is not initialized',
      })),
    };
  }

  const results: BatchDeliveryResult['results'] = [];
  let totalSent = 0;
  let totalFailed = 0;

  // Split into batches of FCM_BATCH_SIZE
  for (let i = 0; i < payloads.length; i += FCM_BATCH_SIZE) {
    const batch = payloads.slice(i, i + FCM_BATCH_SIZE);
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
 * Send a single batch (max 500 tokens)
 */
async function sendSingleBatch(
  payloads: PushPayload[]
): Promise<BatchDeliveryResult> {
  // Group by similar content to use multicast
  const firstPayload = payloads[0];
  const tokens = payloads.map((p) => p.token);

  const multicastMessage: MulticastMessage = {
    tokens,
    notification: {
      title: firstPayload.title,
      body: firstPayload.body,
      ...(firstPayload.imageUrl && { imageUrl: firstPayload.imageUrl }),
    },
    data: firstPayload.data ? stringifyData(firstPayload.data) : undefined,
    android: {
      priority: firstPayload.priority === 'high' ? 'high' : 'normal',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    const response: BatchResponse = await getMessaging().sendEachForMulticast(multicastMessage);
    
    const results = response.responses.map((resp: SendResponse, idx: number) => {
      const token = tokens[idx];
      
      if (resp.success) {
        return {
          token,
          success: true,
          messageId: resp.messageId,
        };
      }

      const error = resp.error as admin.FirebaseError;
      const isInvalidToken = INVALID_TOKEN_ERRORS.includes(error?.code || '');

      return {
        token,
        success: false,
        errorCode: error?.code || 'UNKNOWN_ERROR',
        errorMessage: error?.message,
        shouldRemoveToken: isInvalidToken,
      };
    });

    console.log('[FCM] Batch sent:', {
      total: tokens.length,
      success: response.successCount,
      failure: response.failureCount,
    });

    return {
      channel: DeliveryChannel.PUSH,
      totalSent: response.successCount,
      totalFailed: response.failureCount,
      results,
    };
  } catch (error) {
    const fcmError = error as Error;
    console.error('[FCM] Batch send failed:', fcmError.message);

    return {
      channel: DeliveryChannel.PUSH,
      totalSent: 0,
      totalFailed: tokens.length,
      results: tokens.map((token) => ({
        token,
        success: false,
        errorCode: 'BATCH_SEND_ERROR',
        errorMessage: fcmError.message,
      })),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TOPIC SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribe tokens to a topic
 * Topics are useful for broadcasting to all users of a tenant or role
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  if (!isInitialized) {
    throw new Error('FCM not initialized');
  }

  // Sanitize topic name (only alphanumeric, underscores, hyphens)
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const response = await getMessaging().subscribeToTopic(tokens, sanitizedTopic);
    
    const failedTokens = response.errors?.map((e) => tokens[e.index]) || [];

    console.log('[FCM] Topic subscription:', {
      topic: sanitizedTopic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error('[FCM] Topic subscription failed:', error);
    throw error;
  }
}

/**
 * Unsubscribe tokens from a topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  if (!isInitialized) {
    throw new Error('FCM not initialized');
  }

  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const response = await getMessaging().unsubscribeFromTopic(tokens, sanitizedTopic);
    
    const failedTokens = response.errors?.map((e) => tokens[e.index]) || [];

    console.log('[FCM] Topic unsubscription:', {
      topic: sanitizedTopic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error('[FCM] Topic unsubscription failed:', error);
    throw error;
  }
}

/**
 * Send notification to a topic
 */
export async function sendToTopic(
  topic: string,
  payload: Omit<PushPayload, 'token' | 'platform'>
): Promise<DeliveryResult> {
  if (!isInitialized) {
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'FCM_NOT_INITIALIZED',
      errorMessage: 'FCM is not initialized',
    };
  }

  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_');

  const message: Message = {
    topic: sanitizedTopic,
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
    },
    data: payload.data ? stringifyData(payload.data) : undefined,
  };

  try {
    const messageId = await getMessaging().send(message);
    
    console.log('[FCM] Topic message sent:', {
      topic: sanitizedTopic,
      messageId,
    });

    return {
      channel: DeliveryChannel.PUSH,
      success: true,
      providerMessageId: messageId,
      providerName: 'fcm',
    };
  } catch (error) {
    const fcmError = error as admin.FirebaseError;
    console.error('[FCM] Topic send failed:', fcmError.message);

    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: fcmError.code || 'FCM_TOPIC_ERROR',
      errorMessage: fcmError.message,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a device token by sending a dry-run message
 */
export async function validateToken(token: string): Promise<boolean> {
  if (!isInitialized) {
    return false;
  }

  const message: Message = {
    token,
    notification: {
      title: 'Validation',
      body: 'Token validation',
    },
  };

  try {
    await getMessaging().send(message, true); // dry run
    return true;
  } catch (error) {
    const fcmError = error as admin.FirebaseError;
    return !INVALID_TOKEN_ERRORS.includes(fcmError.code);
  }
}

/**
 * Validate multiple tokens and return invalid ones
 */
export async function validateTokens(tokens: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const results = await Promise.all(
    tokens.map(async (token) => ({
      token,
      isValid: await validateToken(token),
    }))
  );

  return {
    valid: results.filter((r) => r.isValid).map((r) => r.token),
    invalid: results.filter((r) => !r.isValid).map((r) => r.token),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Stringify data values (FCM requires all data values to be strings)
 */
function stringifyData(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return result;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build tenant topic name
 */
export function buildTenantTopic(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Build role topic name
 */
export function buildRoleTopic(tenantId: string, role: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}_role_${role}`;
}

/**
 * Build user topic name (for user-specific broadcasts)
 */
export function buildUserTopic(userId: string): string {
  return `user_${userId.replace(/-/g, '_')}`;
}
