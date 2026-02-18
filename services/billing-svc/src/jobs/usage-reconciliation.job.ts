/**
 * Usage Reconciliation Job
 *
 * Periodic job that:
 *   1. Resets monthly counters whose period has expired
 *   2. Can be extended to pull authoritative counts from upstream services
 *
 * Designed to be called by a cron trigger (e.g. every hour) or on
 * subscription-renewal events.
 */

import { usageTrackingService } from '../services/usage-tracking.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// JOB
// ══════════════════════════════════════════════════════════════════════════════

export async function runUsageReconciliation(): Promise<{ resetCount: number }> {
  console.log('[UsageReconciliation] Starting reconciliation run…');

  // 1. Reset any monthly counters whose period has elapsed
  const resetCount = await usageTrackingService.resetExpiredPeriods();
  if (resetCount > 0) {
    console.log(`[UsageReconciliation] Reset ${resetCount} expired monthly counter(s)`);
  }

  // 2. Future: call upstream services for authoritative seat counts
  //    e.g. GET /internal/iam/tenant/:id/user-counts
  //    then call usageTrackingService.reconcileSeats(tenantId, counts)

  console.log('[UsageReconciliation] Reconciliation complete', { resetCount });
  return { resetCount };
}
