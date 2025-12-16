/**
 * Daily Aggregation Job
 *
 * Runs daily at 1 AM to aggregate raw learning events into daily metrics.
 * Uses Croner for scheduling.
 */

import { Cron } from 'croner';
import type { PrismaClient } from '../generated/prisma-client/index.js';
import { AggregationService } from '../services/aggregation.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface JobResult {
  success: boolean;
  date: Date;
  duration: number;
  userMetrics: {
    processed: number;
    errors: number;
  };
  contentMetrics: {
    processed: number;
    errors: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY AGGREGATION JOB CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class DailyAggregationJob {
  private cronJob: Cron | null = null;
  private aggregationService: AggregationService;
  private isRunning = false;

  constructor(
    private prisma: PrismaClient,
    private schedule: string = '0 1 * * *', // 1 AM daily
  ) {
    this.aggregationService = new AggregationService(prisma);
  }

  /**
   * Start the scheduled job
   */
  start(): void {
    if (this.cronJob) {
      console.warn('[DailyAggregationJob] Job already started');
      return;
    }

    this.cronJob = new Cron(this.schedule, async () => {
      await this.run();
    });

    console.log(`[DailyAggregationJob] Scheduled with pattern: ${this.schedule}`);
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[DailyAggregationJob] Stopped');
    }
  }

  /**
   * Run the aggregation for a specific date (or yesterday by default)
   */
  async run(targetDate?: Date): Promise<JobResult> {
    if (this.isRunning) {
      console.warn('[DailyAggregationJob] Job is already running, skipping');
      return {
        success: false,
        date: targetDate ?? new Date(),
        duration: 0,
        userMetrics: { processed: 0, errors: 0 },
        contentMetrics: { processed: 0, errors: 0 },
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Default to yesterday
    const date = targetDate ?? this.getYesterdayDate();

    console.log(`[DailyAggregationJob] Starting aggregation for ${date.toISOString().split('T')[0]}`);

    const result: JobResult = {
      success: true,
      date,
      duration: 0,
      userMetrics: { processed: 0, errors: 0 },
      contentMetrics: { processed: 0, errors: 0 },
    };

    try {
      // Aggregate daily user metrics
      console.log('[DailyAggregationJob] Aggregating user metrics...');
      const userResult = await this.aggregationService.aggregateDailyUserMetrics(date);
      result.userMetrics.processed = userResult.processed;
      result.userMetrics.errors = userResult.errors;
      console.log(`[DailyAggregationJob] User metrics: ${userResult.processed} processed, ${userResult.errors} errors`);

      // Aggregate daily content metrics
      console.log('[DailyAggregationJob] Aggregating content metrics...');
      const contentResult = await this.aggregationService.aggregateDailyContentMetrics(date);
      result.contentMetrics.processed = contentResult.processed;
      result.contentMetrics.errors = contentResult.errors;
      console.log(`[DailyAggregationJob] Content metrics: ${contentResult.processed} processed, ${contentResult.errors} errors`);

      // Check if we need to trigger weekly rollup (Sunday)
      if (date.getDay() === 0) {
        console.log('[DailyAggregationJob] Triggering weekly rollup (Sunday)...');
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - 6); // Start of the week
        await this.aggregationService.rollupWeeklyMetrics(weekStart);
      }

      // Check if first of month - trigger monthly rollup
      if (date.getDate() === 1) {
        console.log('[DailyAggregationJob] Triggering monthly rollup (1st of month)...');
        const monthStart = new Date(date);
        monthStart.setMonth(monthStart.getMonth() - 1);
        monthStart.setDate(1);
        await this.aggregationService.rollupMonthlyMetrics(monthStart);
      }

    } catch (error) {
      console.error('[DailyAggregationJob] Error during aggregation:', error);
      result.success = false;
    } finally {
      this.isRunning = false;
      result.duration = Date.now() - startTime;
      console.log(`[DailyAggregationJob] Completed in ${result.duration}ms`);
    }

    return result;
  }

  /**
   * Backfill aggregations for a date range
   */
  async backfill(startDate: Date, endDate: Date): Promise<JobResult[]> {
    const results: JobResult[] = [];
    const current = new Date(startDate);

    console.log(`[DailyAggregationJob] Starting backfill from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    while (current <= endDate) {
      const result = await this.run(new Date(current));
      results.push(result);
      current.setDate(current.getDate() + 1);
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[DailyAggregationJob] Backfill complete: ${successCount}/${results.length} days successful`);

    return results;
  }

  /**
   * Get next scheduled run time
   */
  getNextRun(): Date | null {
    return this.cronJob?.nextRun() ?? null;
  }

  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createDailyAggregationJob(
  prisma: PrismaClient,
  schedule?: string,
): DailyAggregationJob {
  return new DailyAggregationJob(prisma, schedule);
}
