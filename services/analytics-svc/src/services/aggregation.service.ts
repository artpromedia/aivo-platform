/**
 * Aggregation Service
 *
 * Handles metric calculations and rollups for analytics.
 * Used by aggregation jobs and for on-demand calculations.
 */

import type { PrismaClient, LearningEventCategory, PeriodType, MetricScope } from '../generated/prisma-client/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AggregationResult {
  processed: number;
  created: number;
  updated: number;
  errors: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetricData {
  totalTimeSeconds: number;
  activeTimeSeconds: number;
  sessionsCount: number;
  contentViewed: number;
  contentCompleted: number;
  videosWatched: number;
  videoTimeSeconds: number;
  assessmentsStarted: number;
  assessmentsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;
  xpEarned: number;
  badgesEarned: number;
  aiInteractions: number;
  uniqueUsers: number;
  averageScore: number | null;
  engagementScore: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class AggregationService {
  constructor(private prisma: PrismaClient) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // DAILY AGGREGATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Aggregate raw learning events into daily user metrics
   */
  async aggregateDailyUserMetrics(date: Date, tenantId?: string): Promise<AggregationResult> {
    const result: AggregationResult = { processed: 0, created: 0, updated: 0, errors: 0 };

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    try {
      // Get all events for the day, grouped by user
      const events = await this.prisma.learningEvent.groupBy({
        by: ['tenantId', 'userId'],
        where: {
          timestamp: { gte: dayStart, lt: dayEnd },
          ...(tenantId ? { tenantId } : {}),
        },
      });

      for (const group of events) {
        try {
          await this.aggregateUserDayMetrics(group.tenantId, group.userId, dayStart);
          result.processed++;
        } catch (error) {
          console.error(`[AggregationService] Error aggregating user ${group.userId}:`, error);
          result.errors++;
        }
      }
    } catch (error) {
      console.error('[AggregationService] Error in daily user aggregation:', error);
      throw error;
    }

    return result;
  }

  private async aggregateUserDayMetrics(tenantId: string, userId: string, date: Date): Promise<void> {
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Get events for this user on this day
    const events = await this.prisma.learningEvent.findMany({
      where: {
        tenantId,
        userId,
        timestamp: { gte: date, lt: dayEnd },
      },
    });

    if (events.length === 0) return;

    // Calculate metrics
    let totalTimeSeconds = 0;
    let activeTimeSeconds = 0;
    let sessionsCount = 0;
    let contentViewed = 0;
    let contentCompleted = 0;
    let videosWatched = 0;
    let videoTimeSeconds = 0;
    let assessmentsStarted = 0;
    let assessmentsCompleted = 0;
    let questionsAnswered = 0;
    let questionsCorrect = 0;
    let xpEarned = 0;
    let badgesEarned = 0;
    let aiInteractions = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const event of events) {
      const duration = event.duration ?? 0;
      totalTimeSeconds += duration;

      switch (event.eventType) {
        case 'SESSION_STARTED':
          sessionsCount++;
          break;
        case 'CONTENT_VIEWED':
          contentViewed++;
          activeTimeSeconds += duration;
          break;
        case 'CONTENT_COMPLETED':
          contentCompleted++;
          break;
        case 'VIDEO_COMPLETE':
          videosWatched++;
          videoTimeSeconds += duration;
          break;
        case 'ASSESSMENT_STARTED':
          assessmentsStarted++;
          break;
        case 'ASSESSMENT_COMPLETED':
          assessmentsCompleted++;
          if (event.score !== null) {
            scoreSum += event.score;
            scoreCount++;
          }
          break;
        case 'QUESTION_ANSWERED':
          questionsAnswered++;
          if (event.score === 100) questionsCorrect++;
          break;
        case 'XP_EARNED':
          xpEarned += event.score ?? 0;
          break;
        case 'BADGE_EARNED':
          badgesEarned++;
          break;
        case 'AI_TUTOR_QUERY':
        case 'AI_EXPLANATION_REQUESTED':
        case 'AI_FEEDBACK_RECEIVED':
          aiInteractions++;
          break;
      }
    }

    const avgScore = scoreCount > 0 ? scoreSum / scoreCount : null;

    // Upsert daily metrics
    await this.prisma.dailyUserMetrics.upsert({
      where: {
        tenantId_userId_date: { tenantId, userId, date },
      },
      create: {
        tenantId,
        userId,
        date,
        totalTimeSeconds,
        activeTimeSeconds,
        sessionsCount,
        contentViewed,
        contentCompleted,
        videosWatched,
        videoTimeSeconds,
        assessmentsStarted,
        assessmentsCompleted,
        questionsAnswered,
        questionsCorrect,
        averageScore: avgScore,
        xpEarned,
        badgesEarned,
        aiInteractions,
      },
      update: {
        totalTimeSeconds,
        activeTimeSeconds,
        sessionsCount,
        contentViewed,
        contentCompleted,
        videosWatched,
        videoTimeSeconds,
        assessmentsStarted,
        assessmentsCompleted,
        questionsAnswered,
        questionsCorrect,
        averageScore: avgScore,
        xpEarned,
        badgesEarned,
        aiInteractions,
      },
    });
  }

  /**
   * Aggregate daily content metrics from events
   */
  async aggregateDailyContentMetrics(date: Date, tenantId?: string): Promise<AggregationResult> {
    const result: AggregationResult = { processed: 0, created: 0, updated: 0, errors: 0 };

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    try {
      // Get distinct content items with events
      const contentGroups = await this.prisma.learningEvent.groupBy({
        by: ['tenantId', 'contentId', 'contentType'],
        where: {
          timestamp: { gte: dayStart, lt: dayEnd },
          contentId: { not: null },
          ...(tenantId ? { tenantId } : {}),
        },
      });

      for (const group of contentGroups) {
        if (!group.contentId) continue;

        try {
          await this.aggregateContentDayMetrics(
            group.tenantId,
            group.contentId,
            group.contentType ?? 'unknown',
            dayStart,
          );
          result.processed++;
        } catch (error) {
          console.error(`[AggregationService] Error aggregating content ${group.contentId}:`, error);
          result.errors++;
        }
      }
    } catch (error) {
      console.error('[AggregationService] Error in daily content aggregation:', error);
      throw error;
    }

    return result;
  }

  private async aggregateContentDayMetrics(
    tenantId: string,
    contentId: string,
    contentType: string,
    date: Date,
  ): Promise<void> {
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const events = await this.prisma.learningEvent.findMany({
      where: {
        tenantId,
        contentId,
        timestamp: { gte: date, lt: dayEnd },
      },
    });

    if (events.length === 0) return;

    let views = 0;
    let completions = 0;
    let attempts = 0;
    let totalTimeSeconds = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    const uniqueUsers = new Set<string>();

    for (const event of events) {
      uniqueUsers.add(event.userId);
      totalTimeSeconds += event.duration ?? 0;

      switch (event.eventType) {
        case 'CONTENT_VIEWED':
        case 'CONTENT_STARTED':
          views++;
          break;
        case 'CONTENT_COMPLETED':
          completions++;
          break;
        case 'ASSESSMENT_COMPLETED':
          attempts++;
          if (event.score !== null) {
            scoreSum += event.score;
            scoreCount++;
          }
          break;
      }
    }

    const avgScore = scoreCount > 0 ? scoreSum / scoreCount : null;

    await this.prisma.dailyContentMetrics.upsert({
      where: {
        tenantId_contentId_date: { tenantId, contentId, date },
      },
      create: {
        tenantId,
        contentId,
        contentType,
        date,
        views,
        uniqueViewers: uniqueUsers.size,
        completions,
        attempts,
        totalTimeSeconds,
        averageScore: avgScore,
      },
      update: {
        views,
        uniqueViewers: uniqueUsers.size,
        completions,
        attempts,
        totalTimeSeconds,
        averageScore: avgScore,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEEKLY ROLLUP
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Roll up daily metrics into weekly period metrics
   */
  async rollupWeeklyMetrics(weekStart: Date, tenantId?: string): Promise<AggregationResult> {
    const result: AggregationResult = { processed: 0, created: 0, updated: 0, errors: 0 };

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      // Get tenants to process
      const tenants = tenantId
        ? [{ tenantId }]
        : await this.prisma.dailyUserMetrics.groupBy({
            by: ['tenantId'],
            where: {
              date: { gte: weekStart, lt: weekEnd },
            },
          });

      for (const tenant of tenants) {
        try {
          await this.rollupTenantWeekMetrics(tenant.tenantId, weekStart, weekEnd);
          result.processed++;
        } catch (error) {
          console.error(`[AggregationService] Error rolling up tenant ${tenant.tenantId}:`, error);
          result.errors++;
        }
      }
    } catch (error) {
      console.error('[AggregationService] Error in weekly rollup:', error);
      throw error;
    }

    return result;
  }

  private async rollupTenantWeekMetrics(tenantId: string, weekStart: Date, weekEnd: Date): Promise<void> {
    // Aggregate daily metrics for the week
    const dailyMetrics = await this.prisma.dailyUserMetrics.aggregate({
      where: {
        tenantId,
        date: { gte: weekStart, lt: weekEnd },
      },
      _sum: {
        totalTimeSeconds: true,
        activeTimeSeconds: true,
        sessionsCount: true,
        contentViewed: true,
        contentCompleted: true,
        videosWatched: true,
        videoTimeSeconds: true,
        assessmentsStarted: true,
        assessmentsCompleted: true,
        questionsAnswered: true,
        questionsCorrect: true,
        xpEarned: true,
        badgesEarned: true,
        aiInteractions: true,
      },
      _avg: {
        averageScore: true,
      },
    });

    // Get unique users for the week
    const uniqueUsers = await this.prisma.dailyUserMetrics.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        date: { gte: weekStart, lt: weekEnd },
      },
    });

    // Calculate engagement score
    const engagementScore = this.calculateWeeklyEngagementScore(
      dailyMetrics._sum,
      uniqueUsers.length,
    );

    const metricData: MetricData = {
      totalTimeSeconds: dailyMetrics._sum.totalTimeSeconds ?? 0,
      activeTimeSeconds: dailyMetrics._sum.activeTimeSeconds ?? 0,
      sessionsCount: dailyMetrics._sum.sessionsCount ?? 0,
      contentViewed: dailyMetrics._sum.contentViewed ?? 0,
      contentCompleted: dailyMetrics._sum.contentCompleted ?? 0,
      videosWatched: dailyMetrics._sum.videosWatched ?? 0,
      videoTimeSeconds: dailyMetrics._sum.videoTimeSeconds ?? 0,
      assessmentsStarted: dailyMetrics._sum.assessmentsStarted ?? 0,
      assessmentsCompleted: dailyMetrics._sum.assessmentsCompleted ?? 0,
      questionsAnswered: dailyMetrics._sum.questionsAnswered ?? 0,
      questionsCorrect: dailyMetrics._sum.questionsCorrect ?? 0,
      xpEarned: dailyMetrics._sum.xpEarned ?? 0,
      badgesEarned: dailyMetrics._sum.badgesEarned ?? 0,
      aiInteractions: dailyMetrics._sum.aiInteractions ?? 0,
      uniqueUsers: uniqueUsers.length,
      averageScore: dailyMetrics._avg.averageScore?.toNumber() ?? null,
      engagementScore,
    };

    // Upsert period metrics
    await this.prisma.periodMetrics.upsert({
      where: {
        tenantId_periodType_scope_scopeId_periodStart: {
          tenantId,
          periodType: 'WEEKLY',
          scope: 'TENANT',
          scopeId: tenantId,
          periodStart: weekStart,
        },
      },
      create: {
        tenantId,
        periodType: 'WEEKLY',
        scope: 'TENANT',
        scopeId: tenantId,
        periodStart: weekStart,
        periodEnd: weekEnd,
        metricData,
      },
      update: {
        metricData,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MONTHLY ROLLUP
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Roll up weekly metrics into monthly period metrics
   */
  async rollupMonthlyMetrics(monthStart: Date, tenantId?: string): Promise<AggregationResult> {
    const result: AggregationResult = { processed: 0, created: 0, updated: 0, errors: 0 };

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    try {
      // Get tenants to process
      const tenants = tenantId
        ? [{ tenantId }]
        : await this.prisma.periodMetrics.groupBy({
            by: ['tenantId'],
            where: {
              periodType: 'WEEKLY',
              periodStart: { gte: monthStart, lt: monthEnd },
            },
          });

      for (const tenant of tenants) {
        try {
          await this.rollupTenantMonthMetrics(tenant.tenantId, monthStart, monthEnd);
          result.processed++;
        } catch (error) {
          console.error(`[AggregationService] Error rolling up monthly for ${tenant.tenantId}:`, error);
          result.errors++;
        }
      }
    } catch (error) {
      console.error('[AggregationService] Error in monthly rollup:', error);
      throw error;
    }

    return result;
  }

  private async rollupTenantMonthMetrics(tenantId: string, monthStart: Date, monthEnd: Date): Promise<void> {
    // Get weekly metrics for the month
    const weeklyMetrics = await this.prisma.periodMetrics.findMany({
      where: {
        tenantId,
        periodType: 'WEEKLY',
        scope: 'TENANT',
        periodStart: { gte: monthStart, lt: monthEnd },
      },
    });

    if (weeklyMetrics.length === 0) return;

    // Aggregate weekly data
    const aggregated = this.aggregatePeriodMetrics(weeklyMetrics);

    await this.prisma.periodMetrics.upsert({
      where: {
        tenantId_periodType_scope_scopeId_periodStart: {
          tenantId,
          periodType: 'MONTHLY',
          scope: 'TENANT',
          scopeId: tenantId,
          periodStart: monthStart,
        },
      },
      create: {
        tenantId,
        periodType: 'MONTHLY',
        scope: 'TENANT',
        scopeId: tenantId,
        periodStart: monthStart,
        periodEnd: monthEnd,
        metricData: aggregated,
      },
      update: {
        metricData: aggregated,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC PROGRESS UPDATE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Recalculate topic progress based on learning events
   */
  async updateTopicProgress(tenantId: string, userId: string, topicId: string): Promise<void> {
    // Get all events for this user and topic
    const events = await this.prisma.learningEvent.findMany({
      where: {
        tenantId,
        userId,
        topicId,
      },
      orderBy: { timestamp: 'asc' },
    });

    if (events.length === 0) return;

    // Calculate progress metrics
    let totalTimeSeconds = 0;
    let completedContent = 0;
    let assessmentsTaken = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let firstAccess: Date | null = null;
    let lastAccess: Date | null = null;
    const contentSet = new Set<string>();
    const completedSet = new Set<string>();

    for (const event of events) {
      if (!firstAccess) firstAccess = event.timestamp;
      lastAccess = event.timestamp;
      totalTimeSeconds += event.duration ?? 0;

      if (event.contentId) {
        contentSet.add(event.contentId);

        if (event.eventType === 'CONTENT_COMPLETED') {
          completedSet.add(event.contentId);
        }
      }

      if (event.eventType === 'ASSESSMENT_COMPLETED') {
        assessmentsTaken++;
        if (event.score !== null) {
          scoreSum += event.score;
          scoreCount++;
        }
      }
    }

    completedContent = completedSet.size;
    const avgScore = scoreCount > 0 ? scoreSum / scoreCount : null;

    // Calculate progress percent (based on content completion)
    // This would ideally compare against total content in topic
    const progressPercent = Math.min((completedContent / Math.max(contentSet.size, 1)) * 100, 100);

    // Calculate mastery level (based on assessment scores)
    const masteryLevel = avgScore !== null ? avgScore / 100 : 0;

    // Get subject from first event
    const subjectId = events[0].subjectId ?? 'unknown';

    await this.prisma.topicProgress.upsert({
      where: {
        userId_topicId: { userId, topicId },
      },
      create: {
        tenantId,
        userId,
        subjectId,
        topicId,
        progressPercent,
        masteryLevel,
        totalTimeSeconds,
        totalContent: contentSet.size,
        completedContent,
        assessmentsTaken,
        averageScore: avgScore,
        firstAccessedAt: firstAccess ?? new Date(),
        lastAccessedAt: lastAccess ?? new Date(),
      },
      update: {
        progressPercent,
        masteryLevel,
        totalTimeSeconds,
        totalContent: contentSet.size,
        completedContent,
        assessmentsTaken,
        averageScore: avgScore,
        lastAccessedAt: lastAccess ?? new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private calculateWeeklyEngagementScore(
    sums: Record<string, number | null>,
    uniqueUsers: number,
  ): number {
    if (uniqueUsers === 0) return 0;

    // Calculate per-user averages
    const avgSessions = (sums.sessionsCount ?? 0) / uniqueUsers;
    const avgContentCompleted = (sums.contentCompleted ?? 0) / uniqueUsers;
    const avgTimeMinutes = (sums.totalTimeSeconds ?? 0) / uniqueUsers / 60;

    // Normalize and weight
    const sessionScore = Math.min(avgSessions / 7, 1) * 30; // Max 7 sessions/week
    const contentScore = Math.min(avgContentCompleted / 20, 1) * 40; // Max 20 completions/week
    const timeScore = Math.min(avgTimeMinutes / 300, 1) * 30; // Max 5 hours/week

    return Math.round((sessionScore + contentScore + timeScore) * 10) / 10;
  }

  private aggregatePeriodMetrics(
    periods: Array<{ metricData: unknown }>,
  ): MetricData {
    const result: MetricData = {
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
      const data = period.metricData as Partial<MetricData>;

      result.totalTimeSeconds += data.totalTimeSeconds ?? 0;
      result.activeTimeSeconds += data.activeTimeSeconds ?? 0;
      result.sessionsCount += data.sessionsCount ?? 0;
      result.contentViewed += data.contentViewed ?? 0;
      result.contentCompleted += data.contentCompleted ?? 0;
      result.videosWatched += data.videosWatched ?? 0;
      result.videoTimeSeconds += data.videoTimeSeconds ?? 0;
      result.assessmentsStarted += data.assessmentsStarted ?? 0;
      result.assessmentsCompleted += data.assessmentsCompleted ?? 0;
      result.questionsAnswered += data.questionsAnswered ?? 0;
      result.questionsCorrect += data.questionsCorrect ?? 0;
      result.xpEarned += data.xpEarned ?? 0;
      result.badgesEarned += data.badgesEarned ?? 0;
      result.aiInteractions += data.aiInteractions ?? 0;

      // Track max unique users (approximation - real unique would need raw data)
      result.uniqueUsers = Math.max(result.uniqueUsers, data.uniqueUsers ?? 0);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // CACHE INVALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Clear cached metrics after aggregation
   */
  async invalidateCache(tenantId: string, date: Date): Promise<void> {
    const cachePattern = `analytics:${tenantId}:*`;

    // Clear metrics cache entries for this tenant
    await this.prisma.metricsCache.deleteMany({
      where: {
        tenantId,
        expiresAt: { lte: new Date() },
      },
    });

    console.log(`[AggregationService] Invalidated cache for tenant ${tenantId}`);
  }
}
