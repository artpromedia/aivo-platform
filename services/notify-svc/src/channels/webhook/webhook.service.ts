/**
 * Webhook Service
 *
 * Handles webhook notification delivery for integrations:
 * - Signed payloads with HMAC
 * - Retry with exponential backoff
 * - Delivery logging and tracking
 * - Rate limiting per endpoint
 */

import { createHmac, randomUUID } from 'node:crypto';

import { RateLimiterMemory } from 'rate-limiter-flexible';

import type {
  WebhookPayload,
  WebhookDeliveryResult,
  SendWebhookOptions,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const WEBHOOK_VERSION = '1.0';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000; // 1 second

// Rate limiter: 100 webhooks per second per endpoint
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 1,
  keyPrefix: 'webhook',
});

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

class WebhookService {
  private isInitialized = false;

  /**
   * Initialize the webhook service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[WebhookService] Initializing...');
    this.isInitialized = true;
    console.log('[WebhookService] Initialized');
  }

  /**
   * Send a webhook notification
   */
  async send(options: SendWebhookOptions): Promise<WebhookDeliveryResult> {
    const {
      url,
      type,
      data,
      headers = {},
      secret,
      idempotencyKey,
    } = options;

    // Rate limit check
    try {
      await rateLimiter.consume(this.getEndpointKey(url));
    } catch {
      console.warn('[WebhookService] Rate limit exceeded for endpoint', { url });
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        attemptNumber: 0,
      };
    }

    // Build payload
    const payload = this.buildPayload(type, data, idempotencyKey);

    // Attempt delivery with retries
    let lastResult: WebhookDeliveryResult | undefined;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      lastResult = await this.deliverWebhook(url, payload, headers, secret, attempt);

      if (lastResult.success) {
        return lastResult;
      }

      // Don't retry on client errors (4xx)
      if (lastResult.statusCode && lastResult.statusCode >= 400 && lastResult.statusCode < 500) {
        console.warn('[WebhookService] Client error, not retrying', {
          url,
          statusCode: lastResult.statusCode,
        });
        return lastResult;
      }

      // Wait before retry with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }

    return lastResult ?? { success: false, error: 'No attempts made', attemptNumber: 0 };
  }

  /**
   * Send webhooks to multiple endpoints
   */
  async sendToMany(
    endpoints: { url: string; secret?: string; headers?: Record<string, string> }[],
    type: string,
    data: Record<string, unknown>
  ): Promise<Map<string, WebhookDeliveryResult>> {
    const results = new Map<string, WebhookDeliveryResult>();

    const promises = endpoints.map(async (endpoint) => {
      const sendOptions: SendWebhookOptions = {
        url: endpoint.url,
        type,
        data,
        headers: endpoint.headers ?? {},
      };
      if (endpoint.secret) {
        sendOptions.secret = endpoint.secret;
      }
      const result = await this.send(sendOptions);
      results.set(endpoint.url, result);
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Verify incoming webhook signature
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp?: string
  ): boolean {
    try {
      // If timestamp provided, check for replay attacks (5 minute window)
      if (timestamp) {
        const ts = Number.parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - ts) > 300) {
          console.warn('[WebhookService] Timestamp outside allowed window');
          return false;
        }
      }

      const expectedSignature = this.generateSignature(payload, secret, timestamp);
      return this.secureCompare(signature, expectedSignature);
    } catch (error) {
      console.error('[WebhookService] Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Generate signature for payload
   */
  generateSignature(payload: string, secret: string, timestamp?: string): string {
    const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
    return createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private buildPayload(
    type: string,
    data: Record<string, unknown>,
    idempotencyKey?: string
  ): WebhookPayload {
    return {
      id: idempotencyKey ?? randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      version: WEBHOOK_VERSION,
      data,
    };
  }

  private async deliverWebhook(
    url: string,
    payload: WebhookPayload,
    headers: Record<string, string>,
    secret?: string,
    attemptNumber = 1
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    try {
      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'AIVO-Webhook/1.0',
        'X-Webhook-ID': payload.id,
        'X-Webhook-Timestamp': timestamp,
        ...headers,
      };

      // Add signature if secret provided
      if (secret) {
        const signature = this.generateSignature(body, secret, timestamp);
        requestHeaders['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        console.log('[WebhookService] Delivery successful', {
          url,
          statusCode: response.status,
          responseTime,
        });

        return {
          success: true,
          statusCode: response.status,
          responseBody,
          responseTime,
          attemptNumber,
          deliveredAt: new Date(),
        };
      }

      console.warn('[WebhookService] Delivery failed', {
        url,
        statusCode: response.status,
        responseBody: responseBody.slice(0, 500),
      });

      return {
        success: false,
        statusCode: response.status,
        responseBody: responseBody.slice(0, 1000),
        responseTime,
        attemptNumber,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[WebhookService] Delivery error', {
        url,
        error: errorMessage,
        attemptNumber,
      });

      return {
        success: false,
        responseTime,
        attemptNumber,
        error: errorMessage,
      };
    }
  }

  private getEndpointKey(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.host;
    } catch {
      return url;
    }
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= (a.codePointAt(i) ?? 0) ^ (b.codePointAt(i) ?? 0);
    }
    return result === 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const webhookService = new WebhookService();
