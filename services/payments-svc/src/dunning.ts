/**
 * Dunning Service
 *
 * Handles failed payment recovery (dunning) flows:
 *
 * DUNNING STRATEGY (MVP):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Day 0 (Payment Failure):
 *   - Mark invoice as OPEN or PAST_DUE
 *   - Mark subscription as PAST_DUE
 *   - Emit SUBSCRIPTION_PAST_DUE event
 *   - Show in-app banner to parent: "We couldn't process your payment…"
 *
 * Day 3:
 *   - Stripe handles automatic retry
 *   - We update status based on webhook
 *   - If still failing, banner remains visible
 *
 * Day 7 (Grace Period End):
 *   - If still unpaid:
 *     - Downgrade entitlements to Basic (ELA + Math only)
 *     - Set subscription status = EXPIRED or CANCELED
 *     - Emit SUBSCRIPTION_DOWNGRADED event
 *   - Notify user of downgrade
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ENTITLEMENTS RECALCULATION:
 *   After any status change (PAST_DUE, CANCELED, EXPIRED), trigger:
 *   - POST /internal/entitlements/sync/:tenantId
 *   This recalculates entitlements based on current subscription status.
 *
 */

import type { FastifyBaseLogger } from 'fastify';

import { config } from './config.js';
import { getDbClient } from './db.js';
import * as metrics from './metrics.js';
import { SubscriptionStatus, type Subscription } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DunningContext {
  subscriptionId: string;
  billingAccountId: string;
  tenantId: string;
  tenantType: string;
  invoiceId?: string;
  correlationId: string;
  log: FastifyBaseLogger;
}

export interface DunningResult {
  success: boolean;
  action: 'banner_shown' | 'retry_pending' | 'downgraded' | 'none';
  newStatus?: SubscriptionStatus;
  error?: string;
}

export type DunningStage = 'day0' | 'day3' | 'day7';

// ══════════════════════════════════════════════════════════════════════════════
// DUNNING CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Dunning schedule configuration (in days)
 */
export const DUNNING_CONFIG = {
  /** Day 0: Initial failure - show banner */
  INITIAL_FAILURE_DAY: 0,
  /** Day 3: Second attempt (handled by Stripe) */
  SECOND_ATTEMPT_DAY: 3,
  /** Day 7: Grace period ends - downgrade to basic */
  GRACE_PERIOD_END_DAY: 7,
  /** Basic modules that remain after downgrade */
  BASIC_MODULES: ['ELA', 'MATH'],
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// DUNNING OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

// Helper to get db client lazily to support test setups
function db() {
  return getDbClient();
}

/**
 * Handle initial payment failure (Day 0)
 *
 * Called when invoice.payment_failed webhook is received.
 * - Marks subscription as PAST_DUE
 * - Emits event for in-app banner
 * - Records metrics
 */
export async function handlePaymentFailure(ctx: DunningContext): Promise<DunningResult> {
  const { subscriptionId, billingAccountId, tenantId, tenantType, invoiceId, correlationId, log } =
    ctx;

  log.info(
    {
      correlationId,
      subscriptionId,
      billingAccountId,
      tenantId,
      invoiceId,
      dunningStage: 'day0',
    },
    'Dunning: Processing payment failure (Day 0)'
  );

  try {
    // Update subscription to PAST_DUE
    await db().updateSubscription(subscriptionId, {
      status: SubscriptionStatus.PAST_DUE,
    });

    // Record metrics
    metrics.recordDunningEvent('day0_banner', tenantType);

    // Emit internal event for notification system
    await emitDunningEvent({
      eventType: 'SUBSCRIPTION_PAST_DUE',
      subscriptionId,
      billingAccountId,
      tenantId,
      correlationId,
      payload: {
        stage: 'day0',
        invoiceId,
        message: "We couldn't process your payment. Please update your payment method.",
      },
    });

    // Trigger entitlements recalculation
    // Note: At Day 0, we don't downgrade yet - just mark as past_due
    await triggerEntitlementsSync(tenantId, 'subscription_change', log);

    log.info(
      {
        correlationId,
        subscriptionId,
        newStatus: SubscriptionStatus.PAST_DUE,
      },
      'Dunning: Subscription marked as PAST_DUE'
    );

    return {
      success: true,
      action: 'banner_shown',
      newStatus: SubscriptionStatus.PAST_DUE,
    };
  } catch (error) {
    log.error(
      {
        correlationId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Dunning: Failed to process payment failure'
    );

    return {
      success: false,
      action: 'none',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check and process dunning for a subscription
 *
 * Called by scheduled job or manually to check dunning status.
 * Determines which dunning stage the subscription is in and takes appropriate action.
 */
export async function processDunning(
  subscription: Subscription,
  ctx: Omit<DunningContext, 'subscriptionId'>
): Promise<DunningResult> {
  const { billingAccountId, tenantId, tenantType, correlationId, log } = ctx;

  // Only process subscriptions in PAST_DUE status
  if (subscription.status !== SubscriptionStatus.PAST_DUE) {
    return { success: true, action: 'none' };
  }

  // Calculate days since subscription went past_due
  // We use updatedAt as a proxy for when it became past_due
  const pastDueSince = subscription.updatedAt;
  const daysPastDue = Math.floor(
    (Date.now() - new Date(pastDueSince).getTime()) / (1000 * 60 * 60 * 24)
  );

  log.info(
    {
      correlationId,
      subscriptionId: subscription.id,
      daysPastDue,
      billingAccountId,
    },
    'Dunning: Checking subscription status'
  );

  // Day 7+: Grace period ended - downgrade to basic
  if (daysPastDue >= DUNNING_CONFIG.GRACE_PERIOD_END_DAY) {
    return handleGracePeriodEnd({
      subscriptionId: subscription.id,
      billingAccountId,
      tenantId,
      tenantType,
      correlationId,
      log,
    });
  }

  // Day 3-6: Retry period (Stripe handles retries)
  if (daysPastDue >= DUNNING_CONFIG.SECOND_ATTEMPT_DAY) {
    log.info(
      {
        correlationId,
        subscriptionId: subscription.id,
        daysPastDue,
      },
      'Dunning: Subscription in retry period'
    );

    metrics.recordDunningEvent('day3_retry', tenantType);

    return {
      success: true,
      action: 'retry_pending',
      newStatus: SubscriptionStatus.PAST_DUE,
    };
  }

  // Day 0-2: Initial failure period (banner shown)
  return {
    success: true,
    action: 'banner_shown',
    newStatus: SubscriptionStatus.PAST_DUE,
  };
}

/**
 * Handle grace period end (Day 7+)
 *
 * - Downgrades subscription to EXPIRED
 * - Triggers entitlements recalculation to Basic only
 * - Emits downgrade event
 */
export async function handleGracePeriodEnd(ctx: DunningContext): Promise<DunningResult> {
  const { subscriptionId, billingAccountId, tenantId, tenantType, correlationId, log } = ctx;

  log.warn(
    {
      correlationId,
      subscriptionId,
      billingAccountId,
      tenantId,
      dunningStage: 'day7',
    },
    'Dunning: Grace period ended - downgrading to Basic'
  );

  try {
    // Update subscription to EXPIRED
    const now = new Date();
    await db().updateSubscription(subscriptionId, {
      status: SubscriptionStatus.EXPIRED,
      endedAt: now,
    });

    // Record metrics
    metrics.recordDunningEvent('day7_downgrade', tenantType);

    // Emit downgrade event
    await emitDunningEvent({
      eventType: 'SUBSCRIPTION_DOWNGRADED',
      subscriptionId,
      billingAccountId,
      tenantId,
      correlationId,
      payload: {
        stage: 'day7',
        reason: 'grace_period_ended',
        downgradeToModules: DUNNING_CONFIG.BASIC_MODULES,
        message:
          'Your premium subscription has been downgraded to Basic due to payment issues. ' +
          'Only ELA and Math modules are now available.',
      },
    });

    // Trigger entitlements recalculation - this will downgrade to Basic
    await triggerEntitlementsSync(tenantId, 'dunning', log);

    log.warn(
      {
        correlationId,
        subscriptionId,
        newStatus: SubscriptionStatus.EXPIRED,
        basicModules: DUNNING_CONFIG.BASIC_MODULES,
      },
      'Dunning: Subscription expired and downgraded to Basic'
    );

    return {
      success: true,
      action: 'downgraded',
      newStatus: SubscriptionStatus.EXPIRED,
    };
  } catch (error) {
    log.error(
      {
        correlationId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Dunning: Failed to process grace period end'
    );

    return {
      success: false,
      action: 'none',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle successful payment after being in PAST_DUE
 *
 * Called when invoice.paid webhook is received for a PAST_DUE subscription.
 * - Restores subscription to ACTIVE
 * - Triggers entitlements recalculation to restore premium modules
 */
export async function handlePaymentRecovered(ctx: DunningContext): Promise<DunningResult> {
  const {
    subscriptionId,
    billingAccountId,
    tenantId,
    tenantType: _tenantType,
    invoiceId,
    correlationId,
    log,
  } = ctx;

  log.info(
    {
      correlationId,
      subscriptionId,
      billingAccountId,
      invoiceId,
    },
    'Dunning: Payment recovered - restoring subscription'
  );

  try {
    // Update subscription to ACTIVE
    await db().updateSubscription(subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
    });

    // Emit recovery event
    await emitDunningEvent({
      eventType: 'SUBSCRIPTION_RECOVERED',
      subscriptionId,
      billingAccountId,
      tenantId,
      correlationId,
      payload: {
        invoiceId,
        message: 'Your payment was successful! Full access has been restored.',
      },
    });

    // Trigger entitlements recalculation to restore full access
    await triggerEntitlementsSync(tenantId, 'subscription_change', log);

    log.info(
      {
        correlationId,
        subscriptionId,
        newStatus: SubscriptionStatus.ACTIVE,
      },
      'Dunning: Subscription restored to ACTIVE'
    );

    return {
      success: true,
      action: 'none',
      newStatus: SubscriptionStatus.ACTIVE,
    };
  } catch (error) {
    log.error(
      {
        correlationId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Dunning: Failed to restore subscription'
    );

    return {
      success: false,
      action: 'none',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface DunningEventPayload {
  eventType:
    | 'SUBSCRIPTION_PAST_DUE'
    | 'SUBSCRIPTION_DOWNGRADED'
    | 'SUBSCRIPTION_RECOVERED'
    | 'TRIAL_ENDING_SOON';
  subscriptionId: string;
  billingAccountId: string;
  tenantId: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

/**
 * Emit internal dunning event
 *
 * In a production system, this would publish to an event bus (Kafka, SQS, etc.)
 * For MVP, we log the event and store it for the notification system to pick up.
 */
async function emitDunningEvent(event: DunningEventPayload): Promise<void> {
  // Store as payment event for audit trail
  await db().createPaymentEvent({
    billingAccountId: event.billingAccountId,
    eventType: event.eventType,
    providerEventId: `dunning_${event.subscriptionId}_${Date.now()}`,
    payload: {
      ...event.payload,
      tenantId: event.tenantId,
      correlationId: event.correlationId,
    },
  });

  // TODO: In production, publish to event bus
  // await eventBus.publish('billing.dunning', event);
}

/**
 * Trigger entitlements recalculation for a tenant
 *
 * Calls entitlements-svc to recalculate based on current subscription status.
 * This is where entitlements are upgraded/downgraded based on subscription changes.
 */
async function triggerEntitlementsSync(
  tenantId: string,
  trigger: 'subscription_change' | 'manual' | 'dunning',
  log: FastifyBaseLogger
): Promise<boolean> {
  const entitlementsSvcUrl =
    (config as { entitlementsSvcUrl?: string }).entitlementsSvcUrl ?? 'http://localhost:4080';

  try {
    const response = await fetch(`${entitlementsSvcUrl}/internal/entitlements/sync/${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'payments-svc',
      },
      body: JSON.stringify({ trigger }),
    });

    if (!response.ok) {
      log.error(
        {
          tenantId,
          status: response.status,
          statusText: response.statusText,
        },
        'Failed to trigger entitlements sync'
      );
      metrics.recordEntitlementsSync(trigger, 'failure');
      return false;
    }

    log.info({ tenantId, trigger }, 'Entitlements sync triggered successfully');
    metrics.recordEntitlementsSync(trigger, 'success');
    return true;
  } catch (error) {
    log.error(
      {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Error triggering entitlements sync'
    );
    metrics.recordEntitlementsSync(trigger, 'failure');
    return false;
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
  // This would be implemented in the DB client
  // For now, return empty array - actual implementation depends on DB queries
  return [];
}
