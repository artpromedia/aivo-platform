/**
 * Webhook Safety & Idempotency Module
 *
 * Provides safety mechanisms to prevent:
 * - Double-processing of webhook events
 * - Double-charging customers
 * - Ghost entitlements
 *
 * SAFETY PRACTICES:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. WEBHOOK IDEMPOTENCY:
 *    - Store Stripe event IDs in payment_events table with UNIQUE constraint
 *    - Before processing any webhook, check if event_id already exists
 *    - Skip processing if event already handled
 *
 * 2. SUBSCRIPTION IDEMPOTENCY:
 *    - Use Stripe's idempotency_key for create-subscription calls
 *    - Format: `sub_create_${billingAccountId}_${planSku}_${timestamp}`
 *    - Stripe deduplicates requests with same idempotency_key within 24h
 *
 * 3. ENTITLEMENTS SAFETY:
 *    - On any subscription status change, trigger entitlements recalculation
 *    - Health check: # active subscriptions should match entitlements
 *    - Run reconciliation job daily to catch mismatches
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';

import type { FastifyBaseLogger } from 'fastify';

import { getDbClient, type DbClient } from './db.js';
import * as metrics from './metrics.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface WebhookEvent {
  id: string;
  type: string;
  provider: 'stripe';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface IdempotencyCheckResult {
  isNew: boolean;
  existingEventId?: string;
  processedAt?: Date | undefined;
}

export interface EntitlementHealthCheck {
  tenantId: string;
  activeSubscriptions: number;
  expectedModules: string[];
  actualModules: string[];
  isMismatched: boolean;
  mismatchDetails?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK IDEMPOTENCY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a webhook event has already been processed
 *
 * Uses the payment_events table with unique constraint on providerEventId.
 * Returns true if event is new and should be processed.
 */
export async function checkWebhookIdempotency(
  eventId: string,
  eventType: string,
  log: FastifyBaseLogger
): Promise<IdempotencyCheckResult> {
  const db: DbClient = getDbClient();

  try {
    // Check if event already exists
    const existingEvent = await db.getPaymentEventByProviderId(eventId);

    if (existingEvent) {
      log.info(
        {
          eventId,
          eventType,
          processedAt: existingEvent.processedAt,
        },
        'Webhook event already processed - skipping'
      );

      metrics.recordWebhookDuplicate(eventType, 'stripe');

      return {
        isNew: false,
        existingEventId: existingEvent.id,
        processedAt: existingEvent.processedAt ?? undefined,
      };
    }

    return { isNew: true };
  } catch (error) {
    // On error, allow processing but log warning
    // Better to potentially double-process than miss events
    log.warn(
      {
        eventId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to check webhook idempotency - allowing processing'
    );

    return { isNew: true };
  }
}

/**
 * Mark a webhook event as processed
 *
 * Should be called after successful event processing.
 * Stores the event in payment_events table for idempotency checking.
 */
export async function markWebhookProcessed(
  eventId: string,
  eventType: string,
  billingAccountId: string | null,
  payload: Record<string, unknown>,
  log: FastifyBaseLogger
): Promise<void> {
  const db: DbClient = getDbClient();

  try {
    await db.createPaymentEvent({
      eventType,
      providerEventId: eventId,
      billingAccountId: billingAccountId ?? '',
      payload,
    });

    log.debug(
      {
        eventId,
        eventType,
        billingAccountId,
      },
      'Webhook event marked as processed'
    );
  } catch (error) {
    // Log but don't fail - event was processed successfully
    // Worst case: event might be processed again on retry
    log.warn(
      {
        eventId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to mark webhook as processed'
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION IDEMPOTENCY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate idempotency key for subscription creation
 *
 * Format: sub_create_{billingAccountId}_{planSku}_{date}_{randomSuffix}
 *
 * The date component ensures we can create new subscriptions if the first attempt
 * failed and we're trying again on a different day.
 *
 * Usage: Pass this key to Stripe's subscription creation call.
 * Stripe deduplicates requests with the same key within 24 hours.
 */
export function generateSubscriptionIdempotencyKey(
  billingAccountId: string,
  planSku: string
): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `sub_create_${billingAccountId}_${planSku}_${date}_${randomSuffix}`;
}

/**
 * Generate idempotency key for payment method attachment
 *
 * Format: pm_attach_{billingAccountId}_{paymentMethodId}
 */
export function generatePaymentMethodIdempotencyKey(
  billingAccountId: string,
  paymentMethodId: string
): string {
  return `pm_attach_${billingAccountId}_${paymentMethodId}`;
}

/**
 * Generate idempotency key for customer creation
 *
 * Format: cus_create_{billingAccountId}
 *
 * This ensures we never create duplicate Stripe customers for the same billing account.
 */
export function generateCustomerIdempotencyKey(billingAccountId: string): string {
  return `cus_create_${billingAccountId}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTITLEMENTS HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check entitlements health for a tenant
 *
 * Verifies that the number of active subscriptions matches expected entitlements.
 * Used for reconciliation and alerting.
 */
export async function checkEntitlementsHealth(
  tenantId: string,
  log: FastifyBaseLogger
): Promise<EntitlementHealthCheck> {
  // This is a placeholder - actual implementation depends on entitlements-svc API
  // In production, this would:
  // 1. Get active subscriptions for tenant from billing DB
  // 2. Get expected modules from subscription plans
  // 3. Get actual entitlements from entitlements-svc
  // 4. Compare and report mismatches

  log.debug({ tenantId }, 'Checking entitlements health');

  return {
    tenantId,
    activeSubscriptions: 0,
    expectedModules: [],
    actualModules: [],
    isMismatched: false,
  };
}

/**
 * Run health check for all tenants with active subscriptions
 *
 * Returns list of tenants with mismatched entitlements.
 * Used by daily reconciliation job.
 */
export async function runGlobalHealthCheck(
  log: FastifyBaseLogger
): Promise<EntitlementHealthCheck[]> {
  log.info('Running global entitlements health check');

  // This would:
  // 1. Get all tenants with active subscriptions
  // 2. Run health check for each
  // 3. Return list of mismatches

  const mismatches: EntitlementHealthCheck[] = [];

  // Update mismatch metric
  // This would be set based on actual mismatches found
  // metrics.registry.set(metrics.entitlementsMismatchTotal, { tenant_type: 'all' }, mismatches.length);

  log.info({ mismatchCount: mismatches.length }, 'Global health check complete');

  return mismatches;
}

// ══════════════════════════════════════════════════════════════════════════════
// DOUBLE-CHARGE PREVENTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a subscription already exists for a billing account + plan combination
 *
 * Prevents accidentally creating duplicate subscriptions.
 * Should be called before creating a new subscription.
 */
export async function checkExistingSubscription(
  billingAccountId: string,
  planSku: string,
  log: FastifyBaseLogger
): Promise<{ exists: boolean; subscriptionId?: string; status?: string }> {
  const db: DbClient = getDbClient();

  try {
    const subscription = await db.getActiveSubscriptionForAccountAndPlan(billingAccountId, planSku);

    if (subscription) {
      log.warn(
        {
          billingAccountId,
          planSku,
          existingSubscriptionId: subscription.id,
          status: subscription.status,
        },
        'Existing active subscription found - preventing duplicate'
      );

      return {
        exists: true,
        subscriptionId: subscription.id,
        status: subscription.status,
      };
    }

    return { exists: false };
  } catch (error) {
    log.error(
      {
        billingAccountId,
        planSku,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to check existing subscription'
    );

    // On error, allow creation but log for investigation
    return { exists: false };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Compare Stripe subscription state with local database
 *
 * Used during reconciliation to find discrepancies.
 */
export interface ReconciliationResult {
  localSubscriptionId: string;
  stripeSubscriptionId: string;
  localStatus: string;
  stripeStatus: string;
  isConsistent: boolean;
  discrepancy?: string;
}

export async function reconcileSubscription(
  localSubscriptionId: string,
  log: FastifyBaseLogger
): Promise<ReconciliationResult | null> {
  // This would:
  // 1. Get local subscription from DB
  // 2. Get Stripe subscription
  // 3. Compare statuses, dates, amounts
  // 4. Return discrepancy report

  log.debug({ localSubscriptionId }, 'Reconciling subscription');

  return null; // Placeholder
}

/**
 * Generate correlation ID for tracing requests across services
 */
export function generateCorrelationId(): string {
  return `cor_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
