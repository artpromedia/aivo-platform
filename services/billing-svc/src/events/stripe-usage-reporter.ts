/**
 * Stripe Usage Reporter (Sprint 12)
 *
 * Scheduled service that reports metered usage to Stripe via the
 * Usage Records API. Runs on two cadences:
 *   - Hourly:  api_calls, ai_interactions (high-frequency metrics)
 *   - Daily:   active_seats, storage_bytes, assessments, reports
 *
 * Uses the metering service to discover meters with unreported deltas,
 * then calls stripe.subscriptionItems.createUsageRecord() for each.
 *
 * All reports use idempotency keys to prevent double-billing.
 */

import { stripeService } from '../services/stripe.service.js';
import { meteringService, type MeterMetric } from '../services/metering.service.js';
import { billingEventPublisher, BillingEventType } from './billing.publisher.js';

// ══════════════════════════════════════════════════════════════════════════════
// LOGGER
// ══════════════════════════════════════════════════════════════════════════════

const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => {
    console.log(`[StripeUsageReporter] INFO: ${msg}`, data ?? '');
  },
  warn: (msg: string, data?: Record<string, unknown>): void => {
    console.warn(`[StripeUsageReporter] WARN: ${msg}`, data ?? '');
  },
  error: (msg: string, data?: Record<string, unknown>): void => {
    console.error(`[StripeUsageReporter] ERROR: ${msg}`, data ?? '');
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Metrics reported on an hourly cadence */
const HOURLY_METRICS: MeterMetric[] = ['api_calls', 'ai_interactions'];

/** Metrics reported on a daily cadence */
const DAILY_METRICS: MeterMetric[] = ['active_seats', 'storage_bytes', 'assessments', 'reports'];

interface ReportResult {
  metric: string;
  tenantId: string;
  stripeSubItemId: string;
  reportedQuantity: number;
  success: boolean;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class StripeUsageReporter {
  private hourlyTimer: ReturnType<typeof setInterval> | null = null;
  private dailyTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Start scheduled reporting.
   *   - Hourly reporter runs every 60 minutes
   *   - Daily reporter runs every 24 hours
   */
  start(): void {
    // Hourly: report high-frequency metrics
    this.hourlyTimer = setInterval(
      () => {
        this.reportMetrics(HOURLY_METRICS).catch((err) => {
          logger.error('Hourly report failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      },
      60 * 60 * 1000, // 1 hour
    );

    // Daily: report low-frequency metrics
    this.dailyTimer = setInterval(
      () => {
        this.reportMetrics(DAILY_METRICS).catch((err) => {
          logger.error('Daily report failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      },
      24 * 60 * 60 * 1000, // 24 hours
    );

    // Also build snapshots for dashboard
    setInterval(
      () => {
        meteringService.buildHourlySnapshots().catch((err) => {
          logger.error('Hourly snapshot failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      },
      60 * 60 * 1000,
    );

    setInterval(
      () => {
        meteringService.buildDailySnapshots().catch((err) => {
          logger.error('Daily snapshot failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      },
      24 * 60 * 60 * 1000,
    );

    // Roll over expired billing periods
    setInterval(
      () => {
        meteringService.rolloverExpiredPeriods().catch((err) => {
          logger.error('Period rollover failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      },
      60 * 60 * 1000, // Check hourly
    );

    logger.info('Stripe usage reporter started', {
      hourlyMetrics: HOURLY_METRICS,
      dailyMetrics: DAILY_METRICS,
    });
  }

  /**
   * Report usage for a set of metrics to Stripe.
   */
  async reportMetrics(metrics: MeterMetric[]): Promise<ReportResult[]> {
    const metersToReport = await meteringService.getMetersNeedingStripeReport();

    // Filter to only the requested metrics
    const filtered = metersToReport.filter((m) =>
      metrics.includes(m.metric as MeterMetric),
    );

    if (filtered.length === 0) {
      logger.info('No usage to report', { metrics });
      return [];
    }

    const results: ReportResult[] = [];

    for (const meter of filtered) {
      const result = await this.reportSingleMeter(meter);
      results.push(result);
    }

    const successes = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success).length;

    logger.info('Usage report batch complete', {
      total: results.length,
      successes,
      failures,
      metrics,
    });

    return results;
  }

  /**
   * Report usage for a single meter to Stripe.
   */
  private async reportSingleMeter(meter: {
    tenantId: string;
    metric: string;
    stripeSubItemId: string;
    currentValue: number;
    lastReportedVal: number;
    delta: number;
  }): Promise<ReportResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const idempotencyKey = `usage-${meter.tenantId}-${meter.metric}-${timestamp}`;

    try {
      // Report incremental delta to Stripe
      await stripeService.reportUsage({
        subscriptionItemId: meter.stripeSubItemId,
        quantity: meter.delta,
        timestamp,
        action: 'increment',
        idempotencyKey,
      });

      // Mark as reported in our database
      await meteringService.markReported(
        meter.tenantId,
        meter.metric,
        meter.currentValue,
      );

      // Publish usage recorded event
      await billingEventPublisher.publish(
        BillingEventType.USAGE_RECORDED,
        { tenantId: meter.tenantId },
        {
          customerId: '',
          tenantId: meter.tenantId,
          metricName: meter.metric,
          currentUsage: meter.currentValue,
          limit: 0,
          percentUsed: 0,
          recordedQuantity: meter.delta,
        },
      );

      logger.info('Usage reported to Stripe', {
        tenantId: meter.tenantId,
        metric: meter.metric,
        quantity: meter.delta,
        stripeSubItemId: meter.stripeSubItemId,
      });

      return {
        metric: meter.metric,
        tenantId: meter.tenantId,
        stripeSubItemId: meter.stripeSubItemId,
        reportedQuantity: meter.delta,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to report usage to Stripe', {
        tenantId: meter.tenantId,
        metric: meter.metric,
        error: errorMsg,
      });

      return {
        metric: meter.metric,
        tenantId: meter.tenantId,
        stripeSubItemId: meter.stripeSubItemId,
        reportedQuantity: 0,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Force an immediate report for all metrics (used for testing/admin).
   */
  async reportAllNow(): Promise<ReportResult[]> {
    return this.reportMetrics([...HOURLY_METRICS, ...DAILY_METRICS]);
  }

  /**
   * Stop scheduled reporting.
   */
  stop(): void {
    if (this.hourlyTimer) {
      clearInterval(this.hourlyTimer);
      this.hourlyTimer = null;
    }
    if (this.dailyTimer) {
      clearInterval(this.dailyTimer);
      this.dailyTimer = null;
    }
    logger.info('Stripe usage reporter stopped');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const stripeUsageReporter = new StripeUsageReporter();
