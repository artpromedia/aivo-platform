/**
 * Usage Metering Service (Sprint 12)
 *
 * Provides the core metering engine for usage-based billing.
 * Tracks 6 usage dimensions per tenant:
 *   - active_seats       — unique active learner/teacher seats in the period
 *   - ai_interactions    — AI tutor session invocations
 *   - api_calls          — external API requests
 *   - storage_bytes      — cumulative storage consumed
 *   - assessments        — assessments created/administered
 *   - reports            — reports generated
 *
 * Features:
 *   - Idempotent event ingestion with deduplication
 *   - Per-period aggregation (sum, max, unique)
 *   - Soft/hard limit checking
 *   - Hourly/daily snapshot rollups for dashboards
 *   - Stripe usage record reporting readiness
 */

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** All recognised metering dimensions */
export type MeterMetric =
  | 'active_seats'
  | 'ai_interactions'
  | 'api_calls'
  | 'storage_bytes'
  | 'assessments'
  | 'reports';

export const ALL_METRICS: readonly MeterMetric[] = [
  'active_seats',
  'ai_interactions',
  'api_calls',
  'storage_bytes',
  'assessments',
  'reports',
] as const;

/** Default display names for metrics */
export const METRIC_DISPLAY: Record<MeterMetric, { displayName: string; unit: string; aggregation: string }> = {
  active_seats:    { displayName: 'Active Seats',      unit: 'seats',    aggregation: 'unique' },
  ai_interactions: { displayName: 'AI Interactions',    unit: 'requests', aggregation: 'sum' },
  api_calls:       { displayName: 'API Calls',         unit: 'requests', aggregation: 'sum' },
  storage_bytes:   { displayName: 'Storage',            unit: 'bytes',    aggregation: 'last' },
  assessments:     { displayName: 'Assessments',        unit: 'items',    aggregation: 'sum' },
  reports:         { displayName: 'Reports Generated',  unit: 'items',    aggregation: 'sum' },
};

export interface RecordUsageInput {
  tenantId: string;
  metric: MeterMetric;
  delta?: number;
  /** For "unique" aggregation — the unique identifier (e.g., userId) */
  uniqueKey?: string;
  source: string;
  userId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface MeterStatus {
  metric: MeterMetric;
  displayName: string;
  unit: string;
  currentValue: number;
  softLimit: number | null;
  hardLimit: number | null;
  percentUsed: number | null;
  remaining: number | null;
  periodStart: Date;
  periodEnd: Date;
  status: 'normal' | 'warning' | 'exceeded';
  lastReportedAt: Date | null;
}

export interface TenantMeteringSummary {
  tenantId: string;
  meters: MeterStatus[];
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: string;
}

export interface UsageHistoryPoint {
  bucketStart: Date;
  value: number;
  eventCount: number;
}

export interface UsageHistory {
  metric: MeterMetric;
  granularity: 'hourly' | 'daily';
  points: UsageHistoryPoint[];
}

export interface LimitCheckResult {
  allowed: boolean;
  metric: MeterMetric;
  currentValue: number;
  hardLimit: number | null;
  softLimit: number | null;
  /** true if above soft limit but below hard limit */
  warning: boolean;
  message: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class MeteringService {

  // ──────────────────────────────────────────────────────────────────────────
  // Meter Provisioning
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Ensure all meters exist for a tenant. Called during tenant onboarding
   * or lazily on first usage event.
   */
  async ensureMeters(
    tenantId: string,
    period: { start: Date; end: Date },
    limits?: Partial<Record<MeterMetric, { soft?: number; hard?: number; stripeSubItemId?: string }>>,
  ): Promise<void> {
    for (const metric of ALL_METRICS) {
      const meta = METRIC_DISPLAY[metric];
      const meterLimits = limits?.[metric];

      await prisma.usageMeter.upsert({
        where: { tenantId_metric: { tenantId, metric } },
        create: {
          tenantId,
          metric,
          displayName: meta.displayName,
          unit: meta.unit,
          aggregation: meta.aggregation,
          currentValue: 0,
          softLimit: meterLimits?.soft != null ? BigInt(meterLimits.soft) : null,
          hardLimit: meterLimits?.hard != null ? BigInt(meterLimits.hard) : null,
          stripeSubItemId: meterLimits?.stripeSubItemId ?? null,
          periodStart: period.start,
          periodEnd: period.end,
        },
        update: {
          // Only update limits/stripe if provided
          ...(meterLimits?.soft != null ? { softLimit: BigInt(meterLimits.soft) } : {}),
          ...(meterLimits?.hard != null ? { hardLimit: BigInt(meterLimits.hard) } : {}),
          ...(meterLimits?.stripeSubItemId ? { stripeSubItemId: meterLimits.stripeSubItemId } : {}),
        },
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Usage Recording
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Record a usage event and update the meter's aggregated value.
   * Supports deduplication via idempotencyKey.
   */
  async recordUsage(input: RecordUsageInput): Promise<{
    currentValue: number;
    limitCheck: LimitCheckResult;
  }> {
    const {
      tenantId,
      metric,
      delta = 1,
      source,
      userId,
      idempotencyKey,
      metadata,
      timestamp = new Date(),
      uniqueKey,
    } = input;

    // ── Deduplication ──────────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await prisma.usageMeterEvent.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        // Return current meter state without re-recording
        const meter = await this.getMeter(tenantId, metric);
        return {
          currentValue: Number(meter?.currentValue ?? 0),
          limitCheck: this.buildLimitCheck(meter, metric),
        };
      }
    }

    // ── Ensure meter exists ────────────────────────────────────────────
    let meter = await prisma.usageMeter.findUnique({
      where: { tenantId_metric: { tenantId, metric } },
    });

    if (!meter) {
      // Lazy-provision with default period (current month)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await this.ensureMeters(tenantId, { start: periodStart, end: periodEnd });
      meter = await prisma.usageMeter.findUnique({
        where: { tenantId_metric: { tenantId, metric } },
      });
    }

    if (!meter) {
      throw new Error(`Failed to provision meter for ${tenantId}/${metric}`);
    }

    // ── Handle "unique" aggregation (e.g., active seats) ───────────────
    if (meter.aggregation === 'unique' && uniqueKey) {
      const existingInPeriod = await prisma.usageMeterEvent.findFirst({
        where: {
          meterId: meter.id,
          idempotencyKey: `unique:${metric}:${uniqueKey}`,
          eventTimestamp: { gte: meter.periodStart },
        },
      });

      if (existingInPeriod) {
        // Already counted this unique key in this period
        return {
          currentValue: Number(meter.currentValue),
          limitCheck: this.buildLimitCheck(meter, metric),
        };
      }

      // Use the uniqueKey as the idempotency key for this period
      const effectiveIdempotencyKey = `unique:${metric}:${uniqueKey}`;

      // Create event with unique dedup key
      await prisma.usageMeterEvent.create({
        data: {
          meterId: meter.id,
          tenantId,
          metric,
          delta: BigInt(1),
          idempotencyKey: effectiveIdempotencyKey,
          source,
          userId: userId ?? null,
          metadataJson: metadata ?? null,
          eventTimestamp: timestamp,
        },
      });

      // Increment meter
      const updated = await prisma.usageMeter.update({
        where: { id: meter.id },
        data: { currentValue: { increment: 1 } },
      });

      return {
        currentValue: Number(updated.currentValue),
        limitCheck: this.buildLimitCheck(updated, metric),
      };
    }

    // ── Standard aggregation (sum/last) ────────────────────────────────
    await prisma.usageMeterEvent.create({
      data: {
        meterId: meter.id,
        tenantId,
        metric,
        delta: BigInt(delta),
        idempotencyKey: idempotencyKey ?? null,
        source,
        userId: userId ?? null,
        metadataJson: metadata ?? null,
        eventTimestamp: timestamp,
      },
    });

    let updated;
    if (meter.aggregation === 'last') {
      // "last" aggregation: set to absolute value (delta is the new value)
      updated = await prisma.usageMeter.update({
        where: { id: meter.id },
        data: { currentValue: BigInt(delta) },
      });
    } else {
      // "sum" aggregation: increment
      updated = await prisma.usageMeter.update({
        where: { id: meter.id },
        data: { currentValue: { increment: BigInt(delta) } },
      });
    }

    return {
      currentValue: Number(updated.currentValue),
      limitCheck: this.buildLimitCheck(updated, metric),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Querying
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get a single meter for a tenant.
   */
  async getMeter(tenantId: string, metric: MeterMetric) {
    return prisma.usageMeter.findUnique({
      where: { tenantId_metric: { tenantId, metric } },
    });
  }

  /**
   * Get full metering summary for a tenant.
   */
  async getSummary(tenantId: string): Promise<TenantMeteringSummary> {
    const meters = await prisma.usageMeter.findMany({
      where: { tenantId },
      orderBy: { metric: 'asc' },
    });

    const meterStatuses: MeterStatus[] = meters.map((m) => {
      const currentValue = Number(m.currentValue);
      const softLimit = m.softLimit != null ? Number(m.softLimit) : null;
      const hardLimit = m.hardLimit != null ? Number(m.hardLimit) : null;
      const percentUsed = hardLimit ? Math.round((currentValue / hardLimit) * 100) : null;
      const remaining = hardLimit != null ? Math.max(0, hardLimit - currentValue) : null;

      let status: 'normal' | 'warning' | 'exceeded' = 'normal';
      if (hardLimit != null && currentValue >= hardLimit) {
        status = 'exceeded';
      } else if (softLimit != null && currentValue >= softLimit) {
        status = 'warning';
      }

      return {
        metric: m.metric as MeterMetric,
        displayName: m.displayName,
        unit: m.unit,
        currentValue,
        softLimit,
        hardLimit,
        percentUsed,
        remaining,
        periodStart: m.periodStart,
        periodEnd: m.periodEnd,
        status,
        lastReportedAt: m.lastReportedAt,
      };
    });

    // Determine overall period from first meter
    const first = meters[0];
    return {
      tenantId,
      meters: meterStatuses,
      periodStart: first?.periodStart ?? new Date(),
      periodEnd: first?.periodEnd ?? new Date(),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get usage history for a metric in a date range.
   */
  async getHistory(
    tenantId: string,
    metric: MeterMetric,
    granularity: 'hourly' | 'daily',
    from: Date,
    to: Date,
  ): Promise<UsageHistory> {
    const snapshots = await prisma.usageMeterSnapshot.findMany({
      where: {
        tenantId,
        metric,
        granularity,
        bucketStart: { gte: from, lte: to },
      },
      orderBy: { bucketStart: 'asc' },
    });

    return {
      metric,
      granularity,
      points: snapshots.map((s) => ({
        bucketStart: s.bucketStart,
        value: Number(s.value),
        eventCount: s.eventCount,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Limit Checking
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Check if usage for a metric is within limits.
   */
  async checkLimit(tenantId: string, metric: MeterMetric): Promise<LimitCheckResult> {
    const meter = await this.getMeter(tenantId, metric);
    return this.buildLimitCheck(meter, metric);
  }

  /**
   * Check all meters for a tenant, returning any that are warning or exceeded.
   */
  async checkAllLimits(tenantId: string): Promise<LimitCheckResult[]> {
    const meters = await prisma.usageMeter.findMany({
      where: { tenantId },
    });

    return meters.map((m) => this.buildLimitCheck(m, m.metric as MeterMetric));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Period Management
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Roll over meters to a new billing period.
   * Resets counters for sum/unique aggregations; keeps "last" as-is.
   */
  async rolloverPeriod(
    tenantId: string,
    newPeriod: { start: Date; end: Date },
  ): Promise<void> {
    const meters = await prisma.usageMeter.findMany({
      where: { tenantId },
    });

    for (const meter of meters) {
      const shouldReset = meter.aggregation !== 'last';
      await prisma.usageMeter.update({
        where: { id: meter.id },
        data: {
          periodStart: newPeriod.start,
          periodEnd: newPeriod.end,
          ...(shouldReset ? { currentValue: 0, lastReportedVal: 0 } : {}),
        },
      });
    }

    console.log(`[Metering] Rolled over ${meters.length} meters for tenant ${tenantId}`);
  }

  /**
   * Roll over all tenants with expired periods.
   * Called by a scheduled job.
   */
  async rolloverExpiredPeriods(): Promise<number> {
    const now = new Date();
    const expiredMeters = await prisma.usageMeter.findMany({
      where: { periodEnd: { lt: now } },
      distinct: ['tenantId'],
      select: { tenantId: true, periodEnd: true },
    });

    let count = 0;
    for (const { tenantId, periodEnd } of expiredMeters) {
      // New period starts where the old one ended
      const newStart = periodEnd;
      const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, newStart.getDate());
      await this.rolloverPeriod(tenantId, { start: newStart, end: newEnd });
      count++;
    }

    return count;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Snapshot Rollups
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Build hourly snapshots from raw events.
   * Called periodically to populate dashboard charts.
   */
  async buildHourlySnapshots(since?: Date): Promise<number> {
    const cutoff = since ?? new Date(Date.now() - 2 * 60 * 60 * 1000); // last 2 hours

    const events = await prisma.usageMeterEvent.groupBy({
      by: ['tenantId', 'metric'],
      where: { eventTimestamp: { gte: cutoff } },
      _sum: { delta: true },
      _count: true,
    });

    let count = 0;
    for (const group of events) {
      const bucketStart = new Date(cutoff);
      bucketStart.setMinutes(0, 0, 0);

      await prisma.usageMeterSnapshot.upsert({
        where: {
          tenantId_metric_granularity_bucketStart: {
            tenantId: group.tenantId,
            metric: group.metric,
            granularity: 'hourly',
            bucketStart,
          },
        },
        create: {
          tenantId: group.tenantId,
          metric: group.metric,
          granularity: 'hourly',
          bucketStart,
          value: group._sum.delta ?? BigInt(0),
          eventCount: group._count,
        },
        update: {
          value: group._sum.delta ?? BigInt(0),
          eventCount: group._count,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Build daily snapshots from hourly data.
   */
  async buildDailySnapshots(date?: Date): Promise<number> {
    const targetDate = date ?? new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const hourlyRollups = await prisma.usageMeterSnapshot.groupBy({
      by: ['tenantId', 'metric'],
      where: {
        granularity: 'hourly',
        bucketStart: { gte: dayStart, lt: dayEnd },
      },
      _sum: { value: true, eventCount: true },
    });

    let count = 0;
    for (const group of hourlyRollups) {
      await prisma.usageMeterSnapshot.upsert({
        where: {
          tenantId_metric_granularity_bucketStart: {
            tenantId: group.tenantId,
            metric: group.metric,
            granularity: 'daily',
            bucketStart: dayStart,
          },
        },
        create: {
          tenantId: group.tenantId,
          metric: group.metric,
          granularity: 'daily',
          bucketStart: dayStart,
          value: group._sum.value ?? BigInt(0),
          eventCount: group._sum.eventCount ?? 0,
        },
        update: {
          value: group._sum.value ?? BigInt(0),
          eventCount: group._sum.eventCount ?? 0,
        },
      });
      count++;
    }

    return count;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stripe Reporting Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get all meters that have a stripeSubItemId and unreported usage.
   */
  async getMetersNeedingStripeReport(): Promise<Array<{
    tenantId: string;
    metric: string;
    stripeSubItemId: string;
    currentValue: number;
    lastReportedVal: number;
    delta: number;
  }>> {
    const meters = await prisma.usageMeter.findMany({
      where: {
        stripeSubItemId: { not: null },
      },
    });

    return meters
      .filter((m) => {
        const current = Number(m.currentValue);
        const lastReported = Number(m.lastReportedVal);
        return current !== lastReported && m.stripeSubItemId;
      })
      .map((m) => ({
        tenantId: m.tenantId,
        metric: m.metric,
        stripeSubItemId: m.stripeSubItemId!,
        currentValue: Number(m.currentValue),
        lastReportedVal: Number(m.lastReportedVal),
        delta: Number(m.currentValue) - Number(m.lastReportedVal),
      }));
  }

  /**
   * Mark a meter as reported to Stripe.
   */
  async markReported(tenantId: string, metric: string, reportedValue: number): Promise<void> {
    await prisma.usageMeter.update({
      where: { tenantId_metric: { tenantId, metric } },
      data: {
        lastReportedAt: new Date(),
        lastReportedVal: BigInt(reportedValue),
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private buildLimitCheck(
    meter: { currentValue: bigint; softLimit: bigint | null; hardLimit: bigint | null } | null,
    metric: MeterMetric,
  ): LimitCheckResult {
    if (!meter) {
      return {
        allowed: true,
        metric,
        currentValue: 0,
        hardLimit: null,
        softLimit: null,
        warning: false,
        message: null,
      };
    }

    const currentValue = Number(meter.currentValue);
    const hardLimit = meter.hardLimit != null ? Number(meter.hardLimit) : null;
    const softLimit = meter.softLimit != null ? Number(meter.softLimit) : null;

    const exceeded = hardLimit != null && currentValue >= hardLimit;
    const warning = !exceeded && softLimit != null && currentValue >= softLimit;

    let message: string | null = null;
    if (exceeded) {
      message = `Usage limit exceeded for ${metric}: ${currentValue}/${hardLimit}`;
    } else if (warning) {
      message = `Usage approaching limit for ${metric}: ${currentValue}/${hardLimit ?? 'unlimited'} (soft limit: ${softLimit})`;
    }

    return {
      allowed: !exceeded,
      metric,
      currentValue,
      hardLimit,
      softLimit,
      warning,
      message,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const meteringService = new MeteringService();
