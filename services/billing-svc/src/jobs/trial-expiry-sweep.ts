/**
 * Trial Expiry Sweep Job
 *
 * Periodic job (recommended: every 15 minutes) that catches trials whose
 * `trialEndAt` has elapsed but the local subscription status is still IN_TRIAL.
 *
 * This is a defence-in-depth measure — Stripe's `customer.subscription.updated`
 * webhook should be the primary source of truth, but if that webhook is missed
 * or delayed, the sweep job ensures users don't indefinitely keep paid-tier
 * entitlements past their trial window.
 *
 * For each stale trial the job:
 *  1. Checks Stripe for the authoritative subscription status
 *  2. If Stripe reports active/trialing with a payment method → no action
 *     (the user converted; the DB will catch up from the next webhook)
 *  3. Otherwise → marks the local subscription as EXPIRED, sets `endedAt`,
 *     invalidates the entitlements cache, and publishes domain events
 */

import { prisma } from '../prisma.js';
import { stripeService } from '../services/stripe.service.js';
import { entitlementsService } from '../services/entitlements.service.js';
import {
  billingEventPublisher,
  BillingEventType,
} from '../events/billing.publisher.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TrialExpirySweepResult {
  /** Total stale-trial subscriptions inspected */
  inspected: number;
  /** How many were expired (downgraded to FREE) */
  expired: number;
  /** How many were already converted (no action) */
  alreadyConverted: number;
  /** How many errored during processing */
  errors: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// JOB
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run the trial-expiry sweep.
 *
 * Finds all subscriptions with `status = IN_TRIAL` and `trialEndAt < NOW()`,
 * then reconciles each against Stripe's authoritative state.
 */
export async function runTrialExpirySweep(): Promise<TrialExpirySweepResult> {
  const result: TrialExpirySweepResult = {
    inspected: 0,
    expired: 0,
    alreadyConverted: 0,
    errors: 0,
  };

  console.log('[TrialExpirySweep] Starting sweep…');

  // 1. Fetch all stale IN_TRIAL subscriptions whose trial window has elapsed
  const staleTrials = await prisma.subscription.findMany({
    where: {
      status: 'IN_TRIAL',
      trialEndAt: { lt: new Date() },
    },
    include: {
      billingAccount: true,
      plan: true,
    },
  });

  if (staleTrials.length === 0) {
    console.log('[TrialExpirySweep] No stale trials found — nothing to do.');
    return result;
  }

  console.log(`[TrialExpirySweep] Found ${staleTrials.length} stale trial(s) to inspect.`);

  // 2. Process each stale trial
  for (const sub of staleTrials) {
    result.inspected++;
    const tenantId = sub.billingAccount?.tenantId ?? '';

    try {
      // 2a. If we have a Stripe subscription ID, check Stripe for the real status
      if (sub.providerSubscriptionId) {
        const stripeSub = await stripeService.getSubscription(sub.providerSubscriptionId);

        if (stripeSub) {
          const stripeStatus = stripeSub.status; // 'active' | 'trialing' | 'canceled' | …

          // If Stripe says the subscription is still healthy, the user has
          // converted (added payment method, trial extended, etc.).  Leave it
          // alone — the next webhook will bring the DB into line.
          if (stripeStatus === 'active' || stripeStatus === 'trialing') {
            console.log(
              `[TrialExpirySweep] Subscription ${sub.id} is "${stripeStatus}" in Stripe — skipping (already converted).`
            );
            result.alreadyConverted++;
            continue;
          }
        }
      }

      // 2b. Trial has genuinely expired — update local state
      const now = new Date();

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'EXPIRED',
          endedAt: now,
        },
      });

      // 2c. Invalidate entitlements cache so the next access check sees FREE
      if (tenantId) {
        entitlementsService.invalidateCache(tenantId);
      }

      // 2d. Publish domain events
      const correlationId = `trial-sweep-${sub.id}-${Date.now()}`;

      await billingEventPublisher.publish({
        type: BillingEventType.SUBSCRIPTION_TRIAL_ENDED,
        tenantId,
        subscriptionId: sub.id,
        plan: sub.plan?.sku ?? 'FREE',
        reason: 'trial_expired_sweep',
        correlationId,
      });

      await billingEventPublisher.publish({
        type: BillingEventType.ENTITLEMENTS_UPDATED,
        tenantId,
        subscriptionId: sub.id,
        plan: 'FREE',
        reason: 'trial_expired_downgrade',
        correlationId,
      });

      console.log(
        `[TrialExpirySweep] Expired subscription ${sub.id} for tenant ${tenantId} → FREE.`
      );
      result.expired++;
    } catch (err) {
      console.error(
        `[TrialExpirySweep] Error processing subscription ${sub.id}:`,
        err
      );
      result.errors++;
    }
  }

  console.log('[TrialExpirySweep] Sweep complete.', result);
  return result;
}
