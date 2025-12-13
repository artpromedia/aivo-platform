/**
 * Subscription Analytics Aggregator Service
 *
 * Aggregates daily metrics for subscription analytics:
 * - Active subscriptions count
 * - MRR (Monthly Recurring Revenue)
 * - Churn rate
 * - Trial conversions
 * - Add-on adoption rates
 *
 * This service is designed to run as a nightly job (e.g., via cron or scheduled task).
 */

import type { PrismaClient } from '@prisma/client';
import type { ParentSku } from '@aivo/billing-common';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Raw query result for analytics daily records */
interface AnalyticsRawRow {
  analytics_date: Date;
  active_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  canceled_subscriptions: number;
  mrr_cents: bigint;
  new_subscriptions: number;
  churned_subscriptions: number;
  trial_conversions: number;
  addon_breakdown: Record<string, number>;
}

/** Raw query result for MRR calculation */
interface MrrRawRow {
  total: bigint | null;
}

/** Raw query result for trial conversions */
interface TrialConversionRawRow {
  count: bigint;
}

/** Raw query result for addon breakdown */
interface AddonBreakdownRawRow {
  sku: string;
  count: bigint;
}

export interface DailyAnalytics {
  date: Date;
  totalActiveSubscriptions: number;
  totalTrialSubscriptions: number;
  totalPastDueSubscriptions: number;
  totalCanceledSubscriptions: number;
  mrrCents: number;
  arrCents: number;
  newSubscriptions: number;
  churned: number;
  trialConversions: number;
  addonBreakdown: Record<ParentSku, number>;
}

export interface AnalyticsRange {
  startDate: Date;
  endDate: Date;
  dailyData: DailyAnalytics[];
  summary: {
    avgMrrCents: number;
    totalNewSubscriptions: number;
    totalChurned: number;
    netGrowth: number;
    churnRate: number;
    trialConversionRate: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class SubscriptionAnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Run the nightly aggregation job.
   * Calculates metrics for the previous day and stores them in subscription_analytics_daily.
   */
  async runDailyAggregation(forDate?: Date): Promise<DailyAnalytics> {
    const targetDate = forDate ?? this.getYesterday();
    const dateStr = this.formatDate(targetDate);

    console.log(`[Analytics] Running daily aggregation for ${dateStr}`);

    // Calculate all metrics
    const [
      subscriptionCounts,
      mrrData,
      newSubscriptions,
      churned,
      trialConversions,
      addonBreakdown,
    ] = await Promise.all([
      this.getSubscriptionCounts(targetDate),
      this.calculateMRR(targetDate),
      this.getNewSubscriptionsCount(targetDate),
      this.getChurnedCount(targetDate),
      this.getTrialConversions(targetDate),
      this.getAddonBreakdown(targetDate),
    ]);

    const analytics: DailyAnalytics = {
      date: targetDate,
      totalActiveSubscriptions: subscriptionCounts.active,
      totalTrialSubscriptions: subscriptionCounts.trialing,
      totalPastDueSubscriptions: subscriptionCounts.pastDue,
      totalCanceledSubscriptions: subscriptionCounts.canceled,
      mrrCents: mrrData.mrrCents,
      arrCents: mrrData.mrrCents * 12,
      newSubscriptions,
      churned,
      trialConversions,
      addonBreakdown,
    };

    // Store in database (upsert to handle re-runs)
    await this.storeAnalytics(analytics);

    console.log(`[Analytics] Daily aggregation complete for ${dateStr}`, {
      activeSubscriptions: analytics.totalActiveSubscriptions,
      mrr: `$${(analytics.mrrCents / 100).toFixed(2)}`,
      newSubscriptions,
      churned,
    });

    return analytics;
  }

  /**
   * Get analytics for a date range.
   */
  async getAnalyticsRange(startDate: Date, endDate: Date): Promise<AnalyticsRange> {
    const records = await this.prisma.$queryRaw<AnalyticsRawRow[]>`
      SELECT * FROM subscription_analytics_daily
      WHERE analytics_date >= ${startDate}
        AND analytics_date <= ${endDate}
      ORDER BY analytics_date ASC
    `;

    const dailyData: DailyAnalytics[] = records.map((r: AnalyticsRawRow) => ({
      date: r.analytics_date,
      totalActiveSubscriptions: r.active_subscriptions,
      totalTrialSubscriptions: r.trialing_subscriptions,
      totalPastDueSubscriptions: r.past_due_subscriptions,
      totalCanceledSubscriptions: r.canceled_subscriptions,
      mrrCents: Number(r.mrr_cents),
      arrCents: Number(r.mrr_cents) * 12,
      newSubscriptions: r.new_subscriptions,
      churned: r.churned_subscriptions,
      trialConversions: r.trial_conversions,
      addonBreakdown: r.addon_breakdown as Record<ParentSku, number>,
    }));

    // Calculate summary
    const totalNewSubscriptions = dailyData.reduce((sum, d) => sum + d.newSubscriptions, 0);
    const totalChurned = dailyData.reduce((sum, d) => sum + d.churned, 0);
    const totalTrialConversions = dailyData.reduce((sum, d) => sum + d.trialConversions, 0);
    const avgMrrCents = dailyData.length > 0
      ? dailyData.reduce((sum, d) => sum + d.mrrCents, 0) / dailyData.length
      : 0;

    // Calculate churn rate (churned / avg active subscriptions)
    const avgActiveSubscriptions = dailyData.length > 0
      ? dailyData.reduce((sum, d) => sum + d.totalActiveSubscriptions, 0) / dailyData.length
      : 0;
    const churnRate = avgActiveSubscriptions > 0
      ? (totalChurned / avgActiveSubscriptions) * 100
      : 0;

    // Calculate trial conversion rate
    const totalTrials = dailyData.reduce((sum, d) => sum + d.totalTrialSubscriptions, 0);
    const trialConversionRate = totalTrials > 0
      ? (totalTrialConversions / totalTrials) * 100
      : 0;

    return {
      startDate,
      endDate,
      dailyData,
      summary: {
        avgMrrCents,
        totalNewSubscriptions,
        totalChurned,
        netGrowth: totalNewSubscriptions - totalChurned,
        churnRate,
        trialConversionRate,
      },
    };
  }

  /**
   * Get the latest analytics snapshot.
   */
  async getLatestSnapshot(): Promise<DailyAnalytics | null> {
    const result = await this.prisma.$queryRaw<AnalyticsRawRow[]>`
      SELECT * FROM subscription_analytics_daily
      ORDER BY analytics_date DESC
      LIMIT 1
    `;

    if (result.length === 0) return null;

    const r: AnalyticsRawRow = result[0];
    return {
      date: r.analytics_date,
      totalActiveSubscriptions: r.active_subscriptions,
      totalTrialSubscriptions: r.trialing_subscriptions,
      totalPastDueSubscriptions: r.past_due_subscriptions,
      totalCanceledSubscriptions: r.canceled_subscriptions,
      mrrCents: Number(r.mrr_cents),
      arrCents: Number(r.mrr_cents) * 12,
      newSubscriptions: r.new_subscriptions,
      churned: r.churned_subscriptions,
      trialConversions: r.trial_conversions,
      addonBreakdown: r.addon_breakdown as Record<ParentSku, number>,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private async getSubscriptionCounts(date: Date): Promise<{
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
  }> {
    const endOfDay = this.getEndOfDay(date);

    const counts = await this.prisma.subscription.groupBy({
      by: ['status'],
      where: {
        createdAt: { lte: endOfDay },
        OR: [
          { canceledAt: null },
          { canceledAt: { gt: endOfDay } },
        ],
      },
      _count: true,
    });

    const result = { active: 0, trialing: 0, pastDue: 0, canceled: 0 };
    for (const c of counts) {
      switch (c.status) {
        case 'active':
          result.active = c._count;
          break;
        case 'trialing':
          result.trialing = c._count;
          break;
        case 'past_due':
          result.pastDue = c._count;
          break;
        case 'canceled':
          result.canceled = c._count;
          break;
      }
    }

    return result;
  }

  private async calculateMRR(date: Date): Promise<{ mrrCents: number }> {
    const endOfDay = this.getEndOfDay(date);

    // Sum up subscription items' monthly amounts
    const result = await this.prisma.$queryRaw<MrrRawRow[]>`
      SELECT COALESCE(SUM(si.amount), 0) as total
      FROM "SubscriptionItem" si
      JOIN "Subscription" s ON si."subscriptionId" = s.id
      WHERE s.status IN ('active', 'trialing')
        AND s."createdAt" <= ${endOfDay}
        AND (s."canceledAt" IS NULL OR s."canceledAt" > ${endOfDay})
    `;

    return { mrrCents: Number(result[0]?.total ?? 0) };
  }

  private async getNewSubscriptionsCount(date: Date): Promise<number> {
    const startOfDay = this.getStartOfDay(date);
    const endOfDay = this.getEndOfDay(date);

    return this.prisma.subscription.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  private async getChurnedCount(date: Date): Promise<number> {
    const startOfDay = this.getStartOfDay(date);
    const endOfDay = this.getEndOfDay(date);

    return this.prisma.subscription.count({
      where: {
        status: 'canceled',
        canceledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  private async getTrialConversions(date: Date): Promise<number> {
    const startOfDay = this.getStartOfDay(date);
    const endOfDay = this.getEndOfDay(date);

    // Count trial records that converted on this day
    const result = await this.prisma.$queryRaw<TrialConversionRawRow[]>`
      SELECT COUNT(*) as count
      FROM trial_records
      WHERE converted_at >= ${startOfDay}
        AND converted_at <= ${endOfDay}
    `;

    return Number(result[0]?.count ?? 0);
  }

  private async getAddonBreakdown(date: Date): Promise<Record<ParentSku, number>> {
    const endOfDay = this.getEndOfDay(date);

    // Count active subscription items by SKU
    const items = await this.prisma.$queryRaw<AddonBreakdownRawRow[]>`
      SELECT 
        p.metadata->>'sku' as sku,
        COUNT(DISTINCT s.id) as count
      FROM "SubscriptionItem" si
      JOIN "Subscription" s ON si."subscriptionId" = s.id
      JOIN "Plan" p ON si."planId" = p.id
      WHERE s.status IN ('active', 'trialing')
        AND s."createdAt" <= ${endOfDay}
        AND (s."canceledAt" IS NULL OR s."canceledAt" > ${endOfDay})
        AND p.metadata->>'sku' IS NOT NULL
      GROUP BY p.metadata->>'sku'
    `;

    const breakdown: Record<string, number> = {};
    for (const item of items) {
      if (item.sku) {
        breakdown[item.sku] = Number(item.count);
      }
    }

    return breakdown as Record<ParentSku, number>;
  }

  private async storeAnalytics(analytics: DailyAnalytics): Promise<void> {
    const dateStr = this.formatDate(analytics.date);

    await this.prisma.$executeRaw`
      INSERT INTO subscription_analytics_daily (
        analytics_date,
        active_subscriptions,
        trialing_subscriptions,
        past_due_subscriptions,
        canceled_subscriptions,
        mrr_cents,
        new_subscriptions,
        churned_subscriptions,
        trial_conversions,
        addon_breakdown
      ) VALUES (
        ${dateStr}::date,
        ${analytics.totalActiveSubscriptions},
        ${analytics.totalTrialSubscriptions},
        ${analytics.totalPastDueSubscriptions},
        ${analytics.totalCanceledSubscriptions},
        ${analytics.mrrCents},
        ${analytics.newSubscriptions},
        ${analytics.churned},
        ${analytics.trialConversions},
        ${JSON.stringify(analytics.addonBreakdown)}::jsonb
      )
      ON CONFLICT (analytics_date) DO UPDATE SET
        active_subscriptions = EXCLUDED.active_subscriptions,
        trialing_subscriptions = EXCLUDED.trialing_subscriptions,
        past_due_subscriptions = EXCLUDED.past_due_subscriptions,
        canceled_subscriptions = EXCLUDED.canceled_subscriptions,
        mrr_cents = EXCLUDED.mrr_cents,
        new_subscriptions = EXCLUDED.new_subscriptions,
        churned_subscriptions = EXCLUDED.churned_subscriptions,
        trial_conversions = EXCLUDED.trial_conversions,
        addon_breakdown = EXCLUDED.addon_breakdown,
        updated_at = NOW()
    `;
  }

  private getYesterday(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
