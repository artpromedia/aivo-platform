/**
 * Usage Tracking Service
 *
 * Provides event-driven usage counters stored in the billing database.
 * Counters are atomically incremented/decremented via Prisma upsert
 * and used by EntitlementsService to enforce plan limits.
 *
 * Supported counter types:
 *   - learners       — active learner seats
 *   - teachers       — active teacher seats
 *   - admins         — active admin seats
 *   - sessionsThisMonth — sessions consumed in current billing period
 *   - contentItems   — total content items created
 *   - assessments    — total assessments created
 *   - storageBytes   — storage consumed in bytes
 *   - apiCallsThisMonth — API calls in current billing period
 */

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** All recognised counter types */
export type CounterType =
  | 'learners'
  | 'teachers'
  | 'admins'
  | 'sessionsThisMonth'
  | 'contentItems'
  | 'assessments'
  | 'storageBytes'
  | 'apiCallsThisMonth';

/** Counters that reset at the start of each billing period */
export const MONTHLY_COUNTERS: readonly CounterType[] = [
  'sessionsThisMonth',
  'apiCallsThisMonth',
] as const;

/** Maps PlanLimits keys → counter types for limit enforcement */
export const LIMIT_TO_COUNTER: Record<string, CounterType> = {
  sessionsPerMonth: 'sessionsThisMonth',
  contentItems: 'contentItems',
  assessments: 'assessments',
  storageGb: 'storageBytes',       // compared after converting GB → bytes
  apiCallsPerMonth: 'apiCallsThisMonth',
};

export interface UsageSnapshot {
  counterType: CounterType;
  currentValue: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  reconciledAt: Date | null;
  updatedAt: Date;
}

export interface TenantUsageSummary {
  tenantId: string;
  counters: UsageSnapshot[];
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class UsageTrackingService {
  // ────────────────────────────────────────────────────────────────────────
  // Core CRUD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Atomically increment a counter (creates it if missing).
   */
  async increment(
    tenantId: string,
    counterType: CounterType,
    delta = 1,
    period?: { start: Date; end: Date },
  ): Promise<number> {
    const row = await prisma.usageCounter.upsert({
      where: {
        tenantId_counterType: { tenantId, counterType },
      },
      create: {
        tenantId,
        counterType,
        currentValue: Math.max(0, delta),
        periodStart: period?.start ?? null,
        periodEnd: period?.end ?? null,
      },
      update: {
        currentValue: { increment: delta },
        ...(period ? { periodStart: period.start, periodEnd: period.end } : {}),
      },
    });
    return row.currentValue;
  }

  /**
   * Atomically decrement a counter (floor at 0).
   */
  async decrement(
    tenantId: string,
    counterType: CounterType,
    delta = 1,
  ): Promise<number> {
    // Use a raw query to ensure we never go below 0
    const result = await prisma.$queryRaw<{ current_value: number }[]>`
      INSERT INTO usage_counters (id, tenant_id, counter_type, current_value, created_at, updated_at)
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${counterType}, 0, NOW(), NOW())
      ON CONFLICT (tenant_id, counter_type)
      DO UPDATE SET
        current_value = GREATEST(0, usage_counters.current_value - ${delta}),
        updated_at = NOW()
      RETURNING current_value
    `;
    return result[0]?.current_value ?? 0;
  }

  /**
   * Set a counter to an absolute value (used during reconciliation).
   */
  async set(
    tenantId: string,
    counterType: CounterType,
    value: number,
    period?: { start: Date; end: Date },
  ): Promise<void> {
    await prisma.usageCounter.upsert({
      where: {
        tenantId_counterType: { tenantId, counterType },
      },
      create: {
        tenantId,
        counterType,
        currentValue: Math.max(0, value),
        periodStart: period?.start ?? null,
        periodEnd: period?.end ?? null,
        reconciledAt: new Date(),
      },
      update: {
        currentValue: Math.max(0, value),
        reconciledAt: new Date(),
        ...(period ? { periodStart: period.start, periodEnd: period.end } : {}),
      },
    });
  }

  /**
   * Get current value for a single counter.
   */
  async get(tenantId: string, counterType: CounterType): Promise<number> {
    const row = await prisma.usageCounter.findUnique({
      where: {
        tenantId_counterType: { tenantId, counterType },
      },
    });
    return row?.currentValue ?? 0;
  }

  /**
   * Get all counters for a tenant.
   */
  async getAllCounters(tenantId: string): Promise<TenantUsageSummary> {
    const rows = await prisma.usageCounter.findMany({
      where: { tenantId },
      orderBy: { counterType: 'asc' },
    });

    return {
      tenantId,
      counters: rows.map((r) => ({
        counterType: r.counterType as CounterType,
        currentValue: r.currentValue,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        reconciledAt: r.reconciledAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Period Management
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Reset monthly counters for a tenant (called at billing-period rollover).
   */
  async resetMonthlyCounters(
    tenantId: string,
    newPeriod: { start: Date; end: Date },
  ): Promise<void> {
    await prisma.usageCounter.updateMany({
      where: {
        tenantId,
        counterType: { in: [...MONTHLY_COUNTERS] },
      },
      data: {
        currentValue: 0,
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
      },
    });
  }

  /**
   * Reset all monthly counters that have an expired period.
   * Called by the reconciliation job.
   */
  async resetExpiredPeriods(): Promise<number> {
    const now = new Date();
    const result = await prisma.usageCounter.updateMany({
      where: {
        counterType: { in: [...MONTHLY_COUNTERS] },
        periodEnd: { lt: now },
      },
      data: {
        currentValue: 0,
        periodStart: now,
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    });
    return result.count;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Reconciliation
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Reconcile seat counts for a tenant by setting them to authoritative values.
   * Called when we receive fresh counts from upstream services.
   */
  async reconcileSeats(
    tenantId: string,
    counts: { learners: number; teachers: number; admins: number },
  ): Promise<void> {
    await Promise.all([
      this.set(tenantId, 'learners', counts.learners),
      this.set(tenantId, 'teachers', counts.teachers),
      this.set(tenantId, 'admins', counts.admins),
    ]);
    console.log('[UsageTracking] Reconciled seats', { tenantId, ...counts });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const usageTrackingService = new UsageTrackingService();
