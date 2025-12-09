/**
 * Webhook Safety Module
 *
 * Provides safety mechanisms for webhook processing:
 * - Event deduplication using payment_events table
 * - Idempotency key generation for Stripe API calls
 * - Entitlements sync helpers
 */

import crypto from 'node:crypto';

import { config } from './config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DbClient {
  getPaymentEventByProviderId(providerEventId: string): Promise<{ id: string } | null>;
  createPaymentEvent(data: {
    billingAccountId: string;
    eventType: string;
    providerEventId: string;
    payload: unknown;
  }): Promise<{ id: string }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATION
// ══════════════════════════════════════════════════════════════════════════════

export interface IdempotencyKeyParams {
  operation: string;
  billingAccountId: string;
  [key: string]: unknown;
}

/**
 * Generate a deterministic idempotency key for Stripe API calls.
 * This prevents double-charging when a request is retried.
 *
 * The key is a SHA-256 hash of the operation parameters,
 * ensuring the same parameters always produce the same key.
 */
export function generateIdempotencyKey(params: IdempotencyKeyParams): string {
  // Sort keys for deterministic ordering
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.map((k) => `${k}:${JSON.stringify(params[k])}`).join('|');

  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK EVENT STORE (Deduplication)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * WebhookEventStore provides idempotent processing of webhook events
 * by tracking processed events in the payment_events table.
 */
export interface WebhookEventStore {
  /**
   * Check if an event has already been processed
   */
  isEventProcessed(eventId: string): Promise<boolean>;

  /**
   * Mark an event as processed
   */
  markEventProcessed(eventId: string, eventType: string): Promise<void>;
}

/**
 * Create a webhook event store backed by the database
 */
export function createWebhookEventStore(db: DbClient): WebhookEventStore {
  // In-memory cache for recently processed events (reduces DB queries)
  const processedCache = new Set<string>();
  const CACHE_MAX_SIZE = 10000;

  return {
    async isEventProcessed(eventId: string): Promise<boolean> {
      // Check in-memory cache first
      if (processedCache.has(eventId)) {
        return true;
      }

      // Check database
      try {
        const existing = await db.getPaymentEventByProviderId(eventId);
        if (existing) {
          // Add to cache for future lookups
          if (processedCache.size >= CACHE_MAX_SIZE) {
            // Clear oldest entries (simple approach - clear all)
            processedCache.clear();
          }
          processedCache.add(eventId);
          return true;
        }
        return false;
      } catch (error) {
        // On error, assume not processed to allow retry
        console.error('Error checking event processed status:', error);
        return false;
      }
    },

    async markEventProcessed(eventId: string, _eventType: string): Promise<void> {
      // Add to cache
      if (processedCache.size >= CACHE_MAX_SIZE) {
        processedCache.clear();
      }
      processedCache.add(eventId);

      // Note: The actual database record is created by the webhook handlers
      // when they call db.createPaymentEvent with providerEventId
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTITLEMENTS SYNC
// ══════════════════════════════════════════════════════════════════════════════

/**
 * EntitlementsSync provides methods to trigger entitlements recalculation
 * when subscription state changes.
 */
export const entitlementsSync = {
  /**
   * Trigger entitlements recalculation for a tenant
   */
  async triggerRecalculation(
    tenantId: string,
    tenantType: string,
    correlationId: string
  ): Promise<void> {
    const url = `${config.entitlementsSvcUrl}/internal/recalculate`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': correlationId,
        },
        body: JSON.stringify({ tenantId, tenantType }),
      });

      if (!response.ok) {
        console.error(`Failed to trigger entitlements recalculation: ${response.status}`, {
          tenantId,
          correlationId,
        });
      }
    } catch (error) {
      console.error('Error triggering entitlements recalculation:', error, {
        tenantId,
        correlationId,
      });
    }
  },

  /**
   * Validate that subscription count matches entitlements
   */
  async validateSubscriptionCount(
    tenantId: string,
    expectedCount: number,
    correlationId: string
  ): Promise<boolean> {
    const url = `${config.entitlementsSvcUrl}/internal/validate/${tenantId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-request-id': correlationId,
        },
      });

      if (!response.ok) {
        console.error(`Failed to validate entitlements: ${response.status}`, {
          tenantId,
          correlationId,
        });
        return false;
      }

      const data = (await response.json()) as { subscriptionCount?: number };
      return data.subscriptionCount === expectedCount;
    } catch (error) {
      console.error('Error validating entitlements:', error, {
        tenantId,
        correlationId,
      });
      return false;
    }
  },
};
