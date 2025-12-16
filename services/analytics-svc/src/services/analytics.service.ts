/**
 * Analytics Service
 *
 * Provides core analytics functionality:
 * - Learner progress tracking
 * - Content analytics
 * - Tenant-level overviews
 * - Competency heatmaps
 */

import type Redis from 'ioredis';

import type { PrismaClient } from '../generated/prisma-client/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LearnerProgressParams {
  tenantId: string;
  userId: string;
  startDate?: Date;
  endDate?: Date;
  subjectId?: string;
}

export interface LearnerProgress {
  userId: string;
  totalTimeSeconds: number;
  activeTimeSeconds: number;
  sessionsCount: number;
  contentViewed: number;
  contentCompleted: number;
  videosWatched: number;
  assessmentsStarted: number;
  assessmentsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;
  averageScore: number | null;
  xpEarned: number;
  badgesEarned: number;
  streak: number;
  topicProgress: TopicProgressSummary[];
  dailyActivity: DailyActivityPoint[];
}

export interface TopicProgressSummary {
  topicId: string;
  subjectId: string;
  progressPercent: number;
  masteryLevel: number;
  totalTimeSeconds: number;
  lastAccessedAt: Date;
}

export interface DailyActivityPoint {
  date: string;
  timeSeconds: number;
  contentCompleted: number;
  xpEarned: number;
}

export interface ContentAnalyticsParams {
  tenantId: string;
  contentId?: string;
  contentType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ContentAnalytics {
  contentId: string;
  contentType: string;
  totalViews: number;
  uniqueViewers: number;
  completions: number;
  completionRate: number;
  averageTimeSeconds: number;
  averageScore: number | null;
  dropOffRate: number;
  engagementScore: number;
  dailyTrends: ContentDailyTrend[];
}

export interface ContentDailyTrend {
  date: string;
  views: number;
  completions: number;
  averageTimeSeconds: number;
}

export interface TenantOverviewParams {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TenantOverview {
  tenantId: string;
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  totalTimeSecondsToday: number;
  totalTimeSecondsWeek: number;
  totalTimeSecondsMonth: number;
  contentCompletedToday: number;
  contentCompletedWeek: number;
  contentCompletedMonth: number;
  averageSessionMinutes: number;
  averageDailyActiveTime: number;
  topContent: TopContentItem[];
  engagementByDayOfWeek: DayOfWeekEngagement[];
}

export interface TopContentItem {
  contentId: string;
  contentType: string;
  views: number;
  completions: number;
}

export interface DayOfWeekEngagement {
  dayOfWeek: number;
  averageTimeSeconds: number;
  averageUsers: number;
}

export interface CompetencyHeatmapParams {
  tenantId: string;
  userId?: string;
  subjectId?: string;
  classroomId?: string;
}

export interface CompetencyHeatmapCell {
  topicId: string;
  userId?: string;
  masteryLevel: number;
  progressPercent: number;
  totalTimeSeconds: number;
  assessmentScore: number | null;
}

// Prisma query result types for explicit typing
interface DailyMetricRow {
  date: Date;
  totalTimeSeconds: number;
  contentCompleted: number;
  xpEarned: number;
  sessionsCount: number;
  assessmentsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;
  aiInteractions: number;
}

interface TopicProgressRow {
  topicId: string;
  subjectId: string;
  progressPercent: { toNumber: () => number };
  masteryLevel: { toNumber: () => number };
  totalTimeSeconds: number;
  lastAccessedAt: Date;
  avgAssessmentScore: { toNumber: () => number } | null;
}

interface ContentMetricRow {
  contentId: string;
  contentType: string;
  _sum: {
    views: number | null;
    completions: number | null;
    totalTimeSeconds: number | null;
    ratings: number | null;
  };
  _avg: {
    avgRating: number | null;
  };
  _count: {
    contentId: number;
  };
}

interface ContentMetricRecord {
  contentId: string;
  contentType: string;
  date: Date;
  views: number;
  completions: number;
  totalTimeSeconds: number;
  attempts: number;
  averageScore: { toNumber: () => number } | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_SECONDS = 300; // 5 minutes

export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis?: Redis,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // LEARNER PROGRESS
  // ─────────────────────────────────────────────────────────────────────────────

  async getLearnerProgress(params: LearnerProgressParams): Promise<LearnerProgress> {
    const { tenantId, userId, startDate, endDate, subjectId } = params;
    const cacheKey = `learner-progress:${tenantId}:${userId}:${startDate?.toISOString() ?? ''}:${endDate?.toISOString() ?? ''}:${subjectId ?? ''}`;

    // Check cache
    const cached = await this.getFromCache<LearnerProgress>(cacheKey);
    if (cached) return cached;

    // Build date filter
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get aggregated daily metrics
    const dailyMetrics = await this.prisma.dailyUserMetrics.findMany({
      where: {
        tenantId,
        userId,
        date: dateFilter,
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate metrics
    const aggregated = this.aggregateDailyMetrics(dailyMetrics);

    // Get topic progress
    const topicProgress = await this.prisma.topicProgress.findMany({
      where: {
        tenantId,
        userId,
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: { lastAccessedAt: 'desc' },
    }) as unknown as TopicProgressRow[];

    // Calculate streak
    const streak = await this.calculateStreak(tenantId, userId);

    // Build daily activity array
    const dailyActivity: DailyActivityPoint[] = (dailyMetrics as unknown as DailyMetricRow[]).map((dm: DailyMetricRow) => ({
      date: dm.date.toISOString().split('T')[0] ?? '',
      timeSeconds: dm.totalTimeSeconds,
      contentCompleted: dm.contentCompleted,
      xpEarned: dm.xpEarned,
    }));

    const result: LearnerProgress = {
      userId,
      ...aggregated,
      streak,
      topicProgress: topicProgress.map((tp: TopicProgressRow) => ({
        topicId: tp.topicId,
        subjectId: tp.subjectId,
        progressPercent: tp.progressPercent.toNumber(),
        masteryLevel: tp.masteryLevel.toNumber(),
        totalTimeSeconds: tp.totalTimeSeconds,
        lastAccessedAt: tp.lastAccessedAt,
      })),
      dailyActivity,
    };

    // Cache result
    await this.setCache(cacheKey, result);

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getContentAnalytics(params: ContentAnalyticsParams): Promise<ContentAnalytics[]> {
    const { tenantId, contentId, contentType, startDate, endDate, limit = 50 } = params;
    const cacheKey = `content-analytics:${tenantId}:${contentId ?? ''}:${contentType ?? ''}:${startDate?.toISOString() ?? ''}:${endDate?.toISOString() ?? ''}`;

    // Check cache
    const cached = await this.getFromCache<ContentAnalytics[]>(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get daily content metrics
    const contentMetrics = await this.prisma.dailyContentMetrics.findMany({
      where: {
        tenantId,
        ...(contentId ? { contentId } : {}),
        ...(contentType ? { contentType } : {}),
        date: dateFilter,
      },
      orderBy: [{ views: 'desc' }, { date: 'desc' }],
    });

    // Group by content ID and convert to results
    const contentMap = this.groupContentMetrics(contentMetrics);
    const results = this.convertToContentAnalytics(contentMap, limit);

    // Cache and return
    await this.setCache(cacheKey, results);
    return results;
  }

  private groupContentMetrics(contentMetrics: ContentMetricRecord[]): Map<string, ContentAnalyticsData> {
    const contentMap = new Map<string, ContentAnalyticsData>();

    for (const cm of contentMetrics) {
      const data = this.getOrCreateContentData(contentMap, cm.contentId, cm.contentType);
      this.updateContentData(data, cm);
    }

    return contentMap;
  }

  private getOrCreateContentData(
    contentMap: Map<string, ContentAnalyticsData>,
    contentId: string,
    contentType: string,
  ): ContentAnalyticsData {
    const existing = contentMap.get(contentId);
    if (existing) return existing;

    const newData: ContentAnalyticsData = {
      contentId,
      contentType,
      totalViews: 0,
      totalCompletions: 0,
      totalTimeSeconds: 0,
      totalAttempts: 0,
      scoreSum: 0,
      scoreCount: 0,
      uniqueViewers: new Set<string>(),
      dailyTrends: [],
    };
    contentMap.set(contentId, newData);
    return newData;
  }

  private updateContentData(data: ContentAnalyticsData, cm: ContentMetricRecord): void {
    data.totalViews += cm.views;
    data.totalCompletions += cm.completions;
    data.totalTimeSeconds += cm.totalTimeSeconds;
    data.totalAttempts += cm.attempts;

    if (cm.averageScore !== null) {
      data.scoreSum += cm.averageScore.toNumber() * cm.attempts;
      data.scoreCount += cm.attempts;
    }

    data.dailyTrends.push({
      date: cm.date.toISOString().split('T')[0] ?? '',
      views: cm.views,
      completions: cm.completions,
      averageTimeSeconds: cm.views > 0 ? cm.totalTimeSeconds / cm.views : 0,
    });
  }

  private convertToContentAnalytics(
    contentMap: Map<string, ContentAnalyticsData>,
    limit: number,
  ): ContentAnalytics[] {
    const results: ContentAnalytics[] = [];

    for (const [, data] of contentMap) {
      if (results.length >= limit) break;

      const completionRate = data.totalViews > 0 ? data.totalCompletions / data.totalViews : 0;
      const dropOffRate = 1 - completionRate;
      const averageTimeSeconds = data.totalViews > 0 ? data.totalTimeSeconds / data.totalViews : 0;
      const averageScore = data.scoreCount > 0 ? data.scoreSum / data.scoreCount : null;
      const engagementScore = this.calculateEngagementScore(completionRate, averageTimeSeconds, data.totalViews);

      results.push({
        contentId: data.contentId,
        contentType: data.contentType,
        totalViews: data.totalViews,
        uniqueViewers: data.uniqueViewers.size,
        completions: data.totalCompletions,
        completionRate,
        averageTimeSeconds,
        averageScore,
        dropOffRate,
        engagementScore,
        dailyTrends: data.dailyTrends.slice(-30), // Last 30 days
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  async getTenantOverview(params: TenantOverviewParams): Promise<TenantOverview> {
    const { tenantId } = params;
    const cacheKey = `tenant-overview:${tenantId}`;

    // Check cache
    const cached = await this.getFromCache<TenantOverview>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get today's metrics
    const todayMetrics = await this.prisma.dailyUserMetrics.aggregate({
      where: {
        tenantId,
        date: { gte: today },
      },
      _sum: {
        totalTimeSeconds: true,
        contentCompleted: true,
      },
      _count: {
        userId: true,
      },
    });

    // Get week metrics
    const weekMetrics = await this.prisma.dailyUserMetrics.aggregate({
      where: {
        tenantId,
        date: { gte: weekAgo },
      },
      _sum: {
        totalTimeSeconds: true,
        contentCompleted: true,
      },
    });

    // Get distinct active users for week
    const weeklyActiveUsers = await this.prisma.dailyUserMetrics.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        date: { gte: weekAgo },
      },
    });

    // Get month metrics
    const monthMetrics = await this.prisma.dailyUserMetrics.aggregate({
      where: {
        tenantId,
        date: { gte: monthAgo },
      },
      _sum: {
        totalTimeSeconds: true,
        contentCompleted: true,
      },
    });

    // Get distinct active users for month
    const monthlyActiveUsers = await this.prisma.dailyUserMetrics.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        date: { gte: monthAgo },
      },
    });

    // Get total unique users (estimate)
    const allUsers = await this.prisma.dailyUserMetrics.groupBy({
      by: ['userId'],
      where: { tenantId },
    });

    // Get top content
    const topContent = await this.prisma.dailyContentMetrics.groupBy({
      by: ['contentId', 'contentType'],
      where: {
        tenantId,
        date: { gte: weekAgo },
      },
      _sum: {
        views: true,
        completions: true,
      },
      orderBy: {
        _sum: {
          views: 'desc',
        },
      },
      take: 10,
    });

    // Calculate average session time
    const sessionsData = await this.prisma.dailyUserMetrics.aggregate({
      where: {
        tenantId,
        date: { gte: monthAgo },
      },
      _sum: {
        sessionsCount: true,
        totalTimeSeconds: true,
      },
    });

    const avgSessionMinutes =
      sessionsData._sum.sessionsCount && sessionsData._sum.totalTimeSeconds
        ? sessionsData._sum.totalTimeSeconds / sessionsData._sum.sessionsCount / 60
        : 0;

    const result: TenantOverview = {
      tenantId,
      totalUsers: allUsers.length,
      activeUsersToday: todayMetrics._count.userId,
      activeUsersWeek: weeklyActiveUsers.length,
      activeUsersMonth: monthlyActiveUsers.length,
      totalTimeSecondsToday: todayMetrics._sum.totalTimeSeconds ?? 0,
      totalTimeSecondsWeek: weekMetrics._sum.totalTimeSeconds ?? 0,
      totalTimeSecondsMonth: monthMetrics._sum.totalTimeSeconds ?? 0,
      contentCompletedToday: todayMetrics._sum.contentCompleted ?? 0,
      contentCompletedWeek: weekMetrics._sum.contentCompleted ?? 0,
      contentCompletedMonth: monthMetrics._sum.contentCompleted ?? 0,
      averageSessionMinutes: avgSessionMinutes,
      averageDailyActiveTime:
        monthlyActiveUsers.length > 0
          ? (monthMetrics._sum.totalTimeSeconds ?? 0) / monthlyActiveUsers.length / 30
          : 0,
      topContent: (topContent as unknown as ContentMetricRow[]).map((tc: ContentMetricRow) => ({
        contentId: tc.contentId,
        contentType: tc.contentType,
        views: tc._sum.views ?? 0,
        completions: tc._sum.completions ?? 0,
      })),
      engagementByDayOfWeek: [], // Would require more complex query
    };

    await this.setCache(cacheKey, result);
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPETENCY HEATMAP
  // ─────────────────────────────────────────────────────────────────────────────

  async getCompetencyHeatmap(params: CompetencyHeatmapParams): Promise<CompetencyHeatmapCell[]> {
    const { tenantId, userId, subjectId } = params;
    const cacheKey = `competency-heatmap:${tenantId}:${userId ?? ''}:${subjectId ?? ''}`;

    const cached = await this.getFromCache<CompetencyHeatmapCell[]>(cacheKey);
    if (cached) return cached;

    const topicProgress = await this.prisma.topicProgress.findMany({
      where: {
        tenantId,
        ...(userId ? { userId } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: [{ subjectId: 'asc' }, { topicId: 'asc' }],
    }) as unknown as (TopicProgressRow & { userId: string; averageScore?: { toNumber: () => number } })[];

    const cells: CompetencyHeatmapCell[] = topicProgress.map((tp) => ({
      topicId: tp.topicId,
      userId: userId ? undefined : tp.userId,
      masteryLevel: tp.masteryLevel.toNumber(),
      progressPercent: tp.progressPercent.toNumber(),
      totalTimeSeconds: tp.totalTimeSeconds,
      assessmentScore: tp.averageScore?.toNumber() ?? null,
    }));

    await this.setCache(cacheKey, cells);
    return cells;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private buildDateFilter(
    startDate?: Date,
    endDate?: Date,
  ): { gte?: Date; lte?: Date } | undefined {
    if (!startDate && !endDate) return undefined;
    const filter: { gte?: Date; lte?: Date } = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;
    return filter;
  }

  private aggregateDailyMetrics(metrics: DailyMetricRow[]): AggregatedMetrics {
    let totalTimeSeconds = 0;
    let activeTimeSeconds = 0;
    let sessionsCount = 0;
    let contentViewed = 0;
    let contentCompleted = 0;
    let videosWatched = 0;
    let assessmentsStarted = 0;
    let assessmentsCompleted = 0;
    let questionsAnswered = 0;
    let questionsCorrect = 0;
    let xpEarned = 0;
    let badgesEarned = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const m of metrics) {
      totalTimeSeconds += m.totalTimeSeconds;
      activeTimeSeconds += m.activeTimeSeconds;
      sessionsCount += m.sessionsCount;
      contentViewed += m.contentViewed;
      contentCompleted += m.contentCompleted;
      videosWatched += m.videosWatched;
      assessmentsStarted += m.assessmentsStarted;
      assessmentsCompleted += m.assessmentsCompleted;
      questionsAnswered += m.questionsAnswered;
      questionsCorrect += m.questionsCorrect;
      xpEarned += m.xpEarned;
      badgesEarned += m.badgesEarned;

      if (m.averageScore !== null) {
        scoreSum += m.averageScore.toNumber() * m.assessmentsCompleted;
        scoreCount += m.assessmentsCompleted;
      }
    }

    return {
      totalTimeSeconds,
      activeTimeSeconds,
      sessionsCount,
      contentViewed,
      contentCompleted,
      videosWatched,
      assessmentsStarted,
      assessmentsCompleted,
      questionsAnswered,
      questionsCorrect,
      xpEarned,
      badgesEarned,
      averageScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    };
  }

  private async calculateStreak(tenantId: string, userId: string): Promise<number> {
    // Get last 365 days of activity
    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);

    const activity = await this.prisma.dailyUserMetrics.findMany({
      where: {
        tenantId,
        userId,
        date: { gte: yearAgo },
      },
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    if (activity.length === 0) return 0;

    // Calculate streak from today backwards
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < activity.length; i++) {
      const activityDate = new Date(activity[i].date);
      activityDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);

      // Allow for yesterday if today hasn't been recorded yet
      if (i === 0 && activityDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
        streak = 1;
        continue;
      }

      if (activityDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && streak === 0) {
        // First record doesn't match today, check if it matches yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (activityDate.getTime() === yesterday.getTime()) {
          streak = 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateEngagementScore(
    completionRate: number,
    avgTimeSeconds: number,
    totalViews: number,
  ): number {
    // Weighted engagement score (0-100)
    const completionWeight = 0.4;
    const timeWeight = 0.3;
    const viewsWeight = 0.3;

    // Normalize time (cap at 30 minutes for max score)
    const normalizedTime = Math.min(avgTimeSeconds / 1800, 1);

    // Normalize views (log scale, cap at 1000 for max score)
    const normalizedViews = Math.min(Math.log10(totalViews + 1) / 3, 1);

    const score =
      (completionRate * completionWeight + normalizedTime * timeWeight + normalizedViews * viewsWeight) * 100;

    return Math.round(score * 10) / 10;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.error('[AnalyticsService] Cache get error:', error);
    }

    return null;
  }

  private async setCache(key: string, value: unknown): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch (error) {
      console.error('[AnalyticsService] Cache set error:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AggregatedMetrics {
  totalTimeSeconds: number;
  activeTimeSeconds: number;
  sessionsCount: number;
  contentViewed: number;
  contentCompleted: number;
  videosWatched: number;
  assessmentsStarted: number;
  assessmentsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;
  xpEarned: number;
  badgesEarned: number;
  averageScore: number | null;
}

interface ContentAnalyticsData {
  contentId: string;
  contentType: string;
  totalViews: number;
  totalCompletions: number;
  totalTimeSeconds: number;
  totalAttempts: number;
  scoreSum: number;
  scoreCount: number;
  uniqueViewers: Set<string>;
  dailyTrends: ContentDailyTrend[];
}
