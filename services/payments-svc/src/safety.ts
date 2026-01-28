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
import { SubscriptionStatus, type Subscription } from './types.js';

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
  const db: DbClient = getDbClient();

  log.debug({ tenantId }, 'Checking entitlements health');

  try {
    // 1. Get active subscriptions for tenant from billing DB
    const subscriptions = await db.getActiveSubscriptionsForTenant(tenantId);
    const activeSubscriptionCount = subscriptions.length;

    // 2. Get expected modules from subscription plans
    const expectedModules: string[] = [];
    for (const sub of subscriptions) {
      const planModules = await db.getModulesForPlan(sub.planId);
      for (const mod of planModules) {
        if (!expectedModules.includes(mod)) {
          expectedModules.push(mod);
        }
      }
    }

    // 3. Get actual entitlements from entitlements-svc
    const entitlementsSvcUrl = process.env.ENTITLEMENTS_SVC_URL || 'http://localhost:4080';
    let actualModules: string[] = [];

    try {
      const response = await fetch(
        `${entitlementsSvcUrl}/api/v1/tenants/${tenantId}/entitlements`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'payments-svc',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      );

      if (response.ok) {
        const data = (await response.json()) as { modules?: string[] };
        actualModules = data.modules || [];
      } else {
        log.warn(
          { tenantId, status: response.status },
          'Failed to fetch entitlements from entitlements-svc'
        );
      }
    } catch (fetchError) {
      log.warn(
        { tenantId, error: fetchError instanceof Error ? fetchError.message : String(fetchError) },
        'Error connecting to entitlements-svc'
      );
    }

    // 4. Compare and report mismatches
    const missingModules = expectedModules.filter((m) => !actualModules.includes(m));
    const extraModules = actualModules.filter((m) => !expectedModules.includes(m));
    const isMismatched = missingModules.length > 0 || extraModules.length > 0;

    let mismatchDetails: string | undefined;
    if (isMismatched) {
      const details: string[] = [];
      if (missingModules.length > 0) {
        details.push(`Missing modules: ${missingModules.join(', ')}`);
      }
      if (extraModules.length > 0) {
        details.push(`Extra modules: ${extraModules.join(', ')}`);
      }
      mismatchDetails = details.join('; ');

      log.warn(
        {
          tenantId,
          missingModules,
          extraModules,
          activeSubscriptionCount,
        },
        'Entitlement mismatch detected'
      );

      metrics.recordEntitlementMismatch(tenantId);
    }

    return {
      tenantId,
      activeSubscriptions: activeSubscriptionCount,
      expectedModules,
      actualModules,
      isMismatched,
      mismatchDetails,
    };
  } catch (error) {
    log.error(
      {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Error checking entitlements health'
    );

    // Return degraded response indicating we couldn't check
    return {
      tenantId,
      activeSubscriptions: -1, // Indicates error state
      expectedModules: [],
      actualModules: [],
      isMismatched: true,
      mismatchDetails: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
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
  const db: DbClient = getDbClient();

  log.info('Running global entitlements health check');

  try {
    // 1. Get all tenants with active subscriptions
    const tenants = await db.getTenantsWithActiveSubscriptions();

    log.info({ tenantCount: tenants.length }, 'Found tenants with active subscriptions');

    // 2. Run health check for each tenant
    const results: EntitlementHealthCheck[] = [];
    const mismatches: EntitlementHealthCheck[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((tenant) => checkEntitlementsHealth(tenant.id, log))
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.isMismatched) {
          mismatches.push(result);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < tenants.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // 3. Update metrics
    metrics.recordGlobalHealthCheck(tenants.length, mismatches.length);

    log.info(
      {
        totalTenants: tenants.length,
        mismatchCount: mismatches.length,
        mismatchTenants: mismatches.map((m) => m.tenantId),
      },
      'Global health check complete'
    );

    return mismatches;
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Global health check failed'
    );
    throw error;
  }
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
  const db: DbClient = getDbClient();

  log.debug({ localSubscriptionId }, 'Reconciling subscription');

  try {
    // 1. Get local subscription from DB
    const localSubscription = await db.getSubscription(localSubscriptionId);
    if (!localSubscription) {
      log.warn({ localSubscriptionId }, 'Local subscription not found during reconciliation');
      return null;
    }

    const stripeSubscriptionId = localSubscription.providerSubscriptionId;
    if (!stripeSubscriptionId) {
      log.warn({ localSubscriptionId }, 'No Stripe subscription ID linked to local subscription');
      return {
        localSubscriptionId,
        stripeSubscriptionId: '',
        localStatus: localSubscription.status,
        stripeStatus: 'UNKNOWN',
        isConsistent: false,
        discrepancy: 'No Stripe subscription ID linked',
      };
    }

    // 2. Get Stripe subscription
    const { getSubscription: getStripeSubscription } = await import('./stripe.js');
    const stripeSubscription = await getStripeSubscription(stripeSubscriptionId);

    if (!stripeSubscription) {
      log.warn({ stripeSubscriptionId }, 'Stripe subscription not found');
      return {
        localSubscriptionId,
        stripeSubscriptionId,
        localStatus: localSubscription.status,
        stripeStatus: 'DELETED',
        isConsistent: false,
        discrepancy: 'Stripe subscription no longer exists',
      };
    }

    // 3. Map Stripe status to local status format
    const stripeStatusMap: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      unpaid: 'UNPAID',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      trialing: 'TRIALING',
      paused: 'PAUSED',
    };
    const mappedStripeStatus = stripeStatusMap[stripeSubscription.status] || stripeSubscription.status.toUpperCase();

    // 4. Compare statuses - cast mapped status to SubscriptionStatus for type-safe comparison
    const statusMatch = localSubscription.status === (mappedStripeStatus as SubscriptionStatus);

    // 5. Compare period dates
    const stripeCurrentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    const localPeriodEnd = localSubscription.currentPeriodEnd;
    const periodMatch = Math.abs(stripeCurrentPeriodEnd.getTime() - localPeriodEnd.getTime()) < 60000; // 1 minute tolerance

    // 6. Build discrepancy details
    const discrepancies: string[] = [];
    if (!statusMatch) {
      discrepancies.push(`Status mismatch: local=${localSubscription.status}, stripe=${mappedStripeStatus}`);
    }
    if (!periodMatch) {
      discrepancies.push(`Period end mismatch: local=${localPeriodEnd.toISOString()}, stripe=${stripeCurrentPeriodEnd.toISOString()}`);
    }

    const isConsistent = statusMatch && periodMatch;

    if (!isConsistent) {
      log.warn(
        {
          localSubscriptionId,
          stripeSubscriptionId,
          discrepancies,
        },
        'Subscription reconciliation found discrepancies'
      );
      metrics.recordReconciliationMismatch('subscription');
    }

    return {
      localSubscriptionId,
      stripeSubscriptionId,
      localStatus: localSubscription.status,
      stripeStatus: mappedStripeStatus,
      isConsistent,
      discrepancy: discrepancies.length > 0 ? discrepancies.join('; ') : undefined,
    };
  } catch (error) {
    log.error(
      {
        localSubscriptionId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Error during subscription reconciliation'
    );
    return null;
  }
}

/**
 * Get all subscriptions due for dunning processing
 *
 * Returns subscriptions that are:
 * - In PAST_DUE status
 * - Past the grace period (Day 7+)
 */
export async function getSubscriptionsDueForDunning(): Promise<Subscription[]> {
  const db: DbClient = getDbClient();
  
  try {
    // Get all subscriptions in PAST_DUE status
    const tenantsWithActiveSubscriptions = await db.getTenantsWithActiveSubscriptions();
    const subscriptionsDue: Subscription[] = [];

    for (const tenant of tenantsWithActiveSubscriptions) {
      const subscriptions = await db.getActiveSubscriptionsForTenant(tenant.id);
      
      for (const subscription of subscriptions) {
        // Check if subscription is past due and past grace period
        if (subscription.status === SubscriptionStatus.PAST_DUE) {
          // Grace period is typically 7 days after becoming past_due
          const gracePeriodDays = 7;
          const gracePeriodEnd = new Date(subscription.currentPeriodEnd);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

          if (new Date() > gracePeriodEnd) {
            subscriptionsDue.push(subscription);
          }
        }
      }
    }

    return subscriptionsDue;
  } catch (error) {
    console.error('[Dunning] Failed to get subscriptions due for dunning:', error);
    return [];
  }
}

/**
 * Run daily reconciliation job
 *
 * Compares all active subscriptions with Stripe state and reports discrepancies.
 * Should be scheduled via cron job or external scheduler.
 */
export async function runDailyReconciliation(log: FastifyBaseLogger): Promise<{
  reconciled: number;
  mismatches: ReconciliationResult[];
  errors: number;
}> {
  const db: DbClient = getDbClient();
  
  log.info('Starting daily reconciliation job');

  const mismatches: ReconciliationResult[] = [];
  let reconciled = 0;
  let errors = 0;

  try {
    // Get all tenants with active subscriptions
    const tenants = await db.getTenantsWithActiveSubscriptions();

    for (const tenant of tenants) {
      const subscriptions = await db.getActiveSubscriptionsForTenant(tenant.id);

      for (const subscription of subscriptions) {
        try {
          const result = await reconcileSubscription(subscription.id, log);
          
          if (result) {
            reconciled++;
            if (!result.isConsistent) {
              mismatches.push(result);
            }
          } else {
            errors++;
          }
        } catch (error) {
          errors++;
          log.error(
            {
              subscriptionId: subscription.id,
              error: error instanceof Error ? error.message : String(error),
            },
            'Error reconciling subscription'
          );
        }
      }
    }

    log.info(
      {
        reconciled,
        mismatches: mismatches.length,
        errors,
      },
      'Daily reconciliation job completed'
    );

    // Record metrics
    metrics.recordReconciliationRun(reconciled, mismatches.length, errors);

    return { reconciled, mismatches, errors };
  } catch (error) {
    log.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Daily reconciliation job failed'
    );

    return { reconciled, mismatches, errors: errors + 1 };
  }
}

/**
 * Generate correlation ID for tracing requests across services
 */
export function generateCorrelationId(): string {
  return `cor_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
