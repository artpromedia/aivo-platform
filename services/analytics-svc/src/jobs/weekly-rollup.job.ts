/**
 * Weekly Rollup Job
 *
 * Runs weekly on Sunday at 2 AM to roll up daily metrics into weekly aggregates.
 * Also handles monthly and quarterly rollups as needed.
 */

import { Cron } from 'croner';
import type { PrismaClient } from '../generated/prisma-client/index.js';
import { AggregationService } from '../services/aggregation.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RollupResult {
  success: boolean;
  periodStart: Date;
  periodEnd: Date;
  duration: number;
  tenantsProcessed: number;
  errors: number;
}

interface WeeklyJobResult {
  success: boolean;
  weeklyRollup: RollupResult | null;
  monthlyRollup: RollupResult | null;
  quarterlyRollup: RollupResult | null;
  duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY ROLLUP JOB CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class WeeklyRollupJob {
  private cronJob: Cron | null = null;
  private aggregationService: AggregationService;
  private isRunning = false;

  constructor(
    private prisma: PrismaClient,
    private schedule: string = '0 2 * * 0', // 2 AM Sunday
  ) {
    this.aggregationService = new AggregationService(prisma);
  }

  /**
   * Start the scheduled job
   */
  start(): void {
    if (this.cronJob) {
      console.warn('[WeeklyRollupJob] Job already started');
      return;
    }

    this.cronJob = new Cron(this.schedule, async () => {
      await this.run();
    });

    console.log(`[WeeklyRollupJob] Scheduled with pattern: ${this.schedule}`);
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[WeeklyRollupJob] Stopped');
    }
  }

  /**
   * Run the weekly rollup (and monthly/quarterly if needed)
   */
  async run(targetWeekStart?: Date): Promise<WeeklyJobResult> {
    if (this.isRunning) {
      console.warn('[WeeklyRollupJob] Job is already running, skipping');
      return {
        success: false,
        weeklyRollup: null,
        monthlyRollup: null,
        quarterlyRollup: null,
        duration: 0,
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Calculate week start (last Monday)
    const weekStart = targetWeekStart ?? this.getLastWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    console.log(`[WeeklyRollupJob] Starting rollup for week ${weekStart.toISOString().split('T')[0]}`);

    const result: WeeklyJobResult = {
      success: true,
      weeklyRollup: null,
      monthlyRollup: null,
      quarterlyRollup: null,
      duration: 0,
    };

    try {
      // Weekly rollup
      result.weeklyRollup = await this.runWeeklyRollup(weekStart, weekEnd);

      // Check if end of month - run monthly rollup
      const nextWeek = new Date(weekEnd);
      if (nextWeek.getMonth() !== weekStart.getMonth()) {
        result.monthlyRollup = await this.runMonthlyRollup(weekStart);
      }

      // Check if end of quarter - run quarterly rollup
      if (this.isEndOfQuarter(weekEnd)) {
        result.quarterlyRollup = await this.runQuarterlyRollup(weekStart);
      }

    } catch (error) {
      console.error('[WeeklyRollupJob] Error during rollup:', error);
      result.success = false;
    } finally {
      this.isRunning = false;
      result.duration = Date.now() - startTime;
      console.log(`[WeeklyRollupJob] Completed in ${result.duration}ms`);
    }

    return result;
  }

  private async runWeeklyRollup(weekStart: Date, weekEnd: Date): Promise<RollupResult> {
    const rollupStart = Date.now();
    console.log('[WeeklyRollupJob] Running weekly rollup...');

    const aggregationResult = await this.aggregationService.rollupWeeklyMetrics(weekStart);

    return {
      success: aggregationResult.errors === 0,
      periodStart: weekStart,
      periodEnd: weekEnd,
      duration: Date.now() - rollupStart,
      tenantsProcessed: aggregationResult.processed,
      errors: aggregationResult.errors,
    };
  }

  private async runMonthlyRollup(referenceDate: Date): Promise<RollupResult> {
    const rollupStart = Date.now();
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

    console.log(`[WeeklyRollupJob] Running monthly rollup for ${monthStart.toISOString().split('T')[0]}`);

    const aggregationResult = await this.aggregationService.rollupMonthlyMetrics(monthStart);

    return {
      success: aggregationResult.errors === 0,
      periodStart: monthStart,
      periodEnd: monthEnd,
      duration: Date.now() - rollupStart,
      tenantsProcessed: aggregationResult.processed,
      errors: aggregationResult.errors,
    };
  }

  private async runQuarterlyRollup(referenceDate: Date): Promise<RollupResult> {
    const rollupStart = Date.now();
    const quarter = Math.floor(referenceDate.getMonth() / 3);
    const quarterStart = new Date(referenceDate.getFullYear(), quarter * 3, 1);
    const quarterEnd = new Date(referenceDate.getFullYear(), (quarter + 1) * 3, 1);

    console.log(`[WeeklyRollupJob] Running quarterly rollup for Q${quarter + 1} ${referenceDate.getFullYear()}`);

    // Aggregate monthly metrics for the quarter
    const monthlyMetrics = await this.prisma.periodMetrics.findMany({
      where: {
        periodType: 'MONTHLY',
        scope: 'TENANT',
        periodStart: { gte: quarterStart, lt: quarterEnd },
      },
    });

    // Group by tenant and aggregate
    const tenantMap = new Map<string, Array<{ metricData: unknown }>>();
    for (const m of monthlyMetrics) {
      if (!tenantMap.has(m.tenantId)) {
        tenantMap.set(m.tenantId, []);
      }
      tenantMap.get(m.tenantId)!.push(m);
    }

    let processed = 0;
    let errors = 0;

    for (const [tenantId, metrics] of tenantMap) {
      try {
        const aggregated = this.aggregatePeriodMetrics(metrics);

        await this.prisma.periodMetrics.upsert({
          where: {
            tenantId_periodType_scope_scopeId_periodStart: {
              tenantId,
              periodType: 'QUARTERLY',
              scope: 'TENANT',
              scopeId: tenantId,
              periodStart: quarterStart,
            },
          },
          create: {
            tenantId,
            periodType: 'QUARTERLY',
            scope: 'TENANT',
            scopeId: tenantId,
            periodStart: quarterStart,
            periodEnd: quarterEnd,
            metricData: aggregated,
          },
          update: {
            metricData: aggregated,
          },
        });

        processed++;
      } catch (error) {
        console.error(`[WeeklyRollupJob] Error in quarterly rollup for ${tenantId}:`, error);
        errors++;
      }
    }

    return {
      success: errors === 0,
      periodStart: quarterStart,
      periodEnd: quarterEnd,
      duration: Date.now() - rollupStart,
      tenantsProcessed: processed,
      errors,
    };
  }

  /**
   * Backfill weekly rollups for a date range
   */
  async backfill(startDate: Date, endDate: Date): Promise<WeeklyJobResult[]> {
    const results: WeeklyJobResult[] = [];

    // Align to week start (Monday)
    const current = this.getWeekStart(startDate);

    console.log(`[WeeklyRollupJob] Starting backfill from ${current.toISOString()} to ${endDate.toISOString()}`);

    while (current <= endDate) {
      const result = await this.run(new Date(current));
      results.push(result);
      current.setDate(current.getDate() + 7);
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[WeeklyRollupJob] Backfill complete: ${successCount}/${results.length} weeks successful`);

    return results;
  }

  /**
   * Get next scheduled run time
   */
  getNextRun(): Date | null {
    return this.cronJob?.nextRun() ?? null;
  }

  private getLastWeekStart(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get last Monday
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(monday.getDate() - daysToMonday - 7); // Previous week's Monday

    return monday;
  }

  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    const dayOfWeek = result.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    result.setDate(result.getDate() - daysToMonday);
    return result;
  }

  private isEndOfQuarter(date: Date): boolean {
    const month = date.getMonth();
    // Quarters end in March (2), June (5), September (8), December (11)
    return [2, 5, 8, 11].includes(month) && this.isLastWeekOfMonth(date);
  }

  private isLastWeekOfMonth(date: Date): boolean {
    const nextWeek = new Date(date);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.getMonth() !== date.getMonth();
  }

  private aggregatePeriodMetrics(
    periods: Array<{ metricData: unknown }>,
  ): Record<string, number | null> {
    const result: Record<string, number | null> = {
      totalTimeSeconds: 0,
      activeTimeSeconds: 0,
      sessionsCount: 0,
      contentViewed: 0,
      contentCompleted: 0,
      videosWatched: 0,
      videoTimeSeconds: 0,
      assessmentsStarted: 0,
      assessmentsCompleted: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      xpEarned: 0,
      badgesEarned: 0,
      aiInteractions: 0,
      uniqueUsers: 0,
      averageScore: null,
      engagementScore: null,
    };

    let scoreSum = 0;
    let scoreCount = 0;
    let engagementSum = 0;
    let engagementCount = 0;

    for (const period of periods) {
      const data = period.metricData as Record<string, number | null>;

      result.totalTimeSeconds! += data.totalTimeSeconds ?? 0;
      result.activeTimeSeconds! += data.activeTimeSeconds ?? 0;
      result.sessionsCount! += data.sessionsCount ?? 0;
      result.contentViewed! += data.contentViewed ?? 0;
      result.contentCompleted! += data.contentCompleted ?? 0;
      result.videosWatched! += data.videosWatched ?? 0;
      result.videoTimeSeconds! += data.videoTimeSeconds ?? 0;
      result.assessmentsStarted! += data.assessmentsStarted ?? 0;
      result.assessmentsCompleted! += data.assessmentsCompleted ?? 0;
      result.questionsAnswered! += data.questionsAnswered ?? 0;
      result.questionsCorrect! += data.questionsCorrect ?? 0;
      result.xpEarned! += data.xpEarned ?? 0;
      result.badgesEarned! += data.badgesEarned ?? 0;
      result.aiInteractions! += data.aiInteractions ?? 0;
      result.uniqueUsers = Math.max(result.uniqueUsers!, data.uniqueUsers ?? 0);

      if (data.averageScore !== null && data.averageScore !== undefined) {
        scoreSum += data.averageScore;
        scoreCount++;
      }

      if (data.engagementScore !== null && data.engagementScore !== undefined) {
        engagementSum += data.engagementScore;
        engagementCount++;
      }
    }

    result.averageScore = scoreCount > 0 ? scoreSum / scoreCount : null;
    result.engagementScore = engagementCount > 0 ? engagementSum / engagementCount : null;

    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createWeeklyRollupJob(
  prisma: PrismaClient,
  schedule?: string,
): WeeklyRollupJob {
  return new WeeklyRollupJob(prisma, schedule);
}
