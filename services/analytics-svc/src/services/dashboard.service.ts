/**
 * Dashboard Service
 *
 * Business logic layer for teacher dashboard analytics.
 * Implements caching, data transformation, and intervention suggestions.
 *
 * Designed for the 5-minute teacher check-in use case -
 * every metric is actionable and instantly understandable.
 *
 * @module dashboard.service
 */

import { logger, metrics } from '@aivo/ts-observability';

import { redisClient } from '../config.js';
import type {
  ActivityQueryOptions,
  ActivityResponse,
  AtRiskQueryOptions,
  AtRiskStudent,
  AtRiskStudentsResponse,
  ClassPerformance,
  DashboardMetadata,
  DashboardQueryOptions,
  DashboardStats,
  DashboardSummary,
  IDashboardService,
  IEPProgressEntry,
  IEPProgressResponse,
  IEPStatus,
  RiskLevel,
  TrendDirection,
  UpcomingItem,
  UpcomingQueryOptions,
  UpcomingItemsResponse,
  ActivityItem,
} from '../types/dashboard.types.js';
import { DASHBOARD_CACHE_CONFIG, buildCacheKey } from '../types/dashboard.types.js';

import { dashboardRepository } from './dashboard.repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const INTERVENTION_SUGGESTIONS: Record<string, string[]> = {
  'Low engagement': ['One-on-one check-in', 'Gamification incentives', 'Peer tutoring'],
  'Declining mastery': ['Review prerequisite skills', 'Additional practice', 'Scaffolded support'],
  'Missing assignments': ['Parent communication', 'Assignment tracking', 'Catch-up plan'],
  'Inconsistent attendance': ['Attendance meeting', 'Engagement activities', 'Home support'],
  'Low assessment scores': ['Test-taking strategies', 'Extended time', 'Alternative assessments'],
  'No recent activity': ['Welfare check', 'Parent contact', 'Engagement plan'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate trend direction from current and previous values
 */
function calculateTrend(current: number, previous?: number): TrendDirection {
  if (previous === undefined || previous === null) return 'stable';
  const diff = current - previous;
  const threshold = previous * 0.05; // 5% threshold
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

/**
 * Calculate trend percentage
 */
function calculateTrendPercent(current: number, previous?: number): number {
  if (previous === undefined || previous === null || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Map database status to IEP status
 */
function mapIEPStatus(status: string, current: number, expected: number): IEPStatus {
  if (status === 'COMPLETED' || current >= expected * 1.1) return 'exceeded';
  if (status === 'AT_RISK' || status === 'BEHIND' || current < expected * 0.8) return 'at-risk';
  return 'on-track';
}

/**
 * Map database risk level to RiskLevel
 */
function mapRiskLevel(level: string): RiskLevel {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Get human-readable relative time
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Get intervention suggestions based on risk factors
 */
function getInterventionSuggestions(riskFactors: string[]): string[] {
  const suggestions = new Set<string>();

  for (const factor of riskFactors) {
    for (const [key, interventions] of Object.entries(INTERVENTION_SUGGESTIONS)) {
      if (factor.toLowerCase().includes(key.toLowerCase())) {
        for (const intervention of interventions) {
          suggestions.add(intervention);
        }
      }
    }
  }

  // If no specific match, provide general suggestions
  if (suggestions.size === 0) {
    suggestions.add('One-on-one check-in');
    suggestions.add('Review recent work');
    suggestions.add('Parent communication');
  }

  return Array.from(suggestions).slice(0, 3);
}

/**
 * Calculate days since a date
 */
function daysSince(date: Date | null): number {
  if (!date) return 999;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until a date
 */
function daysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheResult<T> {
  data: T;
  cached: boolean;
  cacheAge?: number;
}

/**
 * Get data from cache or compute
 */
async function getCachedOrCompute<T>(
  cacheKey: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<CacheResult<T>> {
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      metrics.increment('analytics.dashboard.cache.hit');
      const ttl = await redisClient.ttl(cacheKey);
      return {
        data: JSON.parse(cached) as T,
        cached: true,
        cacheAge: ttlSeconds - ttl,
      };
    }
  } catch (error) {
    logger.warn('Cache read failed', { error, cacheKey });
  }

  metrics.increment('analytics.dashboard.cache.miss');
  const startTime = Date.now();
  const data = await compute();
  const queryTime = Date.now() - startTime;

  metrics.histogram('analytics.dashboard.compute.duration_ms', queryTime);

  try {
    await redisClient.setex(cacheKey, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    logger.warn('Cache write failed', { error, cacheKey });
  }

  return { data, cached: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class DashboardService implements IDashboardService {
  /**
   * Get complete dashboard summary
   */
  async getDashboardSummary(options: DashboardQueryOptions): Promise<DashboardSummary> {
    const startTime = Date.now();
    const { teacherId, tenantId, period = 'week', skipCache = false } = options;

    const cacheKey = buildCacheKey(DASHBOARD_CACHE_CONFIG.summary, teacherId, tenantId, period);

    let cached = false;
    let cacheAge: number | undefined;

    // Check cache unless skipped
    if (!skipCache) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          metrics.increment('analytics.dashboard.summary.cache.hit');
          const ttl = await redisClient.ttl(cacheKey);
          cacheAge = DASHBOARD_CACHE_CONFIG.summary.ttlSeconds - ttl;
          cached = true;

          const summary = JSON.parse(cachedData) as DashboardSummary;
          summary.metadata = this.buildMetadata(options, cached, cacheAge, Date.now() - startTime);
          return summary;
        }
      } catch (error) {
        logger.warn('Cache read failed for dashboard summary', { error });
      }
    }

    metrics.increment('analytics.dashboard.summary.cache.miss');

    // Fetch all data in parallel
    const [stats, classPerformance, atRiskStudents, iepProgress, recentActivity, upcomingItems] =
      await Promise.all([
        this.getStats(options),
        this.getClassPerformance(options),
        this.getAtRiskStudents({ ...options, limit: 5 }),
        this.getIEPProgress(options),
        this.getRecentActivity({ ...options, limit: 10 }),
        this.getUpcomingItems({ ...options, daysAhead: 14 }),
      ]);

    const queryTimeMs = Date.now() - startTime;
    metrics.histogram('analytics.dashboard.summary.duration_ms', queryTimeMs);

    const summary: DashboardSummary = {
      stats,
      classPerformance,
      atRiskStudents: atRiskStudents.students,
      iepProgress: iepProgress.entries,
      recentActivity: recentActivity.items,
      upcomingItems: upcomingItems.items,
      metadata: this.buildMetadata(options, cached, cacheAge, queryTimeMs),
    };

    // Cache the result
    try {
      await redisClient.setex(
        cacheKey,
        DASHBOARD_CACHE_CONFIG.summary.ttlSeconds,
        JSON.stringify(summary)
      );
    } catch (error) {
      logger.warn('Cache write failed for dashboard summary', { error });
    }

    return summary;
  }

  /**
   * Get dashboard stats only
   */
  async getStats(options: DashboardQueryOptions): Promise<DashboardStats> {
    const { teacherId, tenantId, period = 'week' } = options;

    const cacheKey = buildCacheKey(DASHBOARD_CACHE_CONFIG.stats, teacherId, tenantId, period);

    const { data } = await getCachedOrCompute(
      cacheKey,
      DASHBOARD_CACHE_CONFIG.stats.ttlSeconds,
      async () => {
        const stats = await dashboardRepository.getAggregateStats(options);
        return stats;
      }
    );

    return data;
  }

  /**
   * Get class performance list
   */
  async getClassPerformance(options: DashboardQueryOptions): Promise<ClassPerformance[]> {
    const { teacherId, tenantId, period = 'week' } = options;

    const cacheKey = buildCacheKey(
      DASHBOARD_CACHE_CONFIG.classPerformance,
      teacherId,
      tenantId,
      period
    );

    const { data } = await getCachedOrCompute(
      cacheKey,
      DASHBOARD_CACHE_CONFIG.classPerformance.ttlSeconds,
      async () => {
        const rawMetrics = await dashboardRepository.getClassMetrics(options);

        return rawMetrics.map(
          (raw): ClassPerformance => ({
            id: raw.classId,
            name: raw.className,
            mastery: Math.round(raw.avgMastery * 100) / 100,
            engagement: Math.round(raw.avgEngagement * 100) / 100,
            students: raw.totalStudents,
            trend: calculateTrend(raw.avgMastery, raw.prevAvgMastery),
            trendPercent: calculateTrendPercent(raw.avgMastery, raw.prevAvgMastery),
            atRiskCount: raw.atRiskCount,
            iepCount: raw.iepCount,
          })
        );
      }
    );

    return data;
  }

  /**
   * Get at-risk students
   */
  async getAtRiskStudents(options: AtRiskQueryOptions): Promise<AtRiskStudentsResponse> {
    const { teacherId, tenantId, limit = 10, riskLevel } = options;

    const cacheKey = buildCacheKey(
      DASHBOARD_CACHE_CONFIG.atRiskStudents,
      teacherId,
      tenantId,
      undefined,
      riskLevel
    );

    const { data } = await getCachedOrCompute(
      cacheKey,
      DASHBOARD_CACHE_CONFIG.atRiskStudents.ttlSeconds,
      async () => {
        const rawStudents = await dashboardRepository.getAtRiskStudents(options);

        const students: AtRiskStudent[] = rawStudents.map((raw) => ({
          id: raw.learnerId,
          name: raw.learnerName,
          className: raw.className,
          classId: raw.classId,
          riskLevel: mapRiskLevel(raw.riskLevel),
          riskFactors: raw.riskFactors,
          suggestedInterventions: getInterventionSuggestions(raw.riskFactors),
          lastActivity: raw.lastActivityAt ? getRelativeTime(raw.lastActivityAt) : 'Unknown',
          lastActivityAt: raw.lastActivityAt ?? new Date(0),
          daysSinceActivity: daysSince(raw.lastActivityAt),
          masteryLevel: Math.round(raw.masteryLevel * 100),
          engagementScore: Math.round(raw.engagementScore * 100),
        }));

        // Count by risk level
        const byRiskLevel = {
          high: students.filter((s) => s.riskLevel === 'high').length,
          medium: students.filter((s) => s.riskLevel === 'medium').length,
          low: students.filter((s) => s.riskLevel === 'low').length,
        };

        return {
          students: students.slice(0, limit),
          total: students.length,
          byRiskLevel,
        };
      }
    );

    return data;
  }

  /**
   * Get IEP progress entries
   */
  async getIEPProgress(options: DashboardQueryOptions): Promise<IEPProgressResponse> {
    const { teacherId, tenantId, period = 'week' } = options;

    const cacheKey = buildCacheKey(DASHBOARD_CACHE_CONFIG.iepProgress, teacherId, tenantId, period);

    const { data } = await getCachedOrCompute(
      cacheKey,
      DASHBOARD_CACHE_CONFIG.iepProgress.ttlSeconds,
      async () => {
        const rawGoals = await dashboardRepository.getIEPGoals(options);

        const entries: IEPProgressEntry[] = rawGoals.map((raw) => ({
          goalId: raw.id,
          studentId: raw.learnerId,
          studentName: raw.learnerName,
          classId: raw.classId ?? undefined,
          className: raw.className ?? undefined,
          goalArea: raw.category,
          goalDescription: raw.description,
          currentProgress: Math.round(raw.currentProgress * 100) / 100,
          targetProgress: Math.round(raw.expectedProgress * 100) / 100,
          status: mapIEPStatus(raw.status, raw.currentProgress, raw.expectedProgress),
          nextReviewDate:
            raw.nextReviewDate?.toISOString().split('T')[0] ??
            raw.targetDate.toISOString().split('T')[0],
          daysUntilReview: raw.nextReviewDate
            ? daysUntil(raw.nextReviewDate.toISOString())
            : daysUntil(raw.targetDate.toISOString()),
        }));

        // Calculate summary
        const summary = {
          total: entries.length,
          onTrack: entries.filter((e) => e.status === 'on-track').length,
          atRisk: entries.filter((e) => e.status === 'at-risk').length,
          exceeded: entries.filter((e) => e.status === 'exceeded').length,
        };

        // Count upcoming reviews in next 7 days
        const upcomingReviewsCount = entries.filter(
          (e) => e.daysUntilReview !== undefined && e.daysUntilReview <= 7
        ).length;

        return { entries, summary, upcomingReviewsCount };
      }
    );

    return data;
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(options: ActivityQueryOptions): Promise<ActivityResponse> {
    const { teacherId, tenantId, limit = 20, activityType } = options;

    const cacheKey = buildCacheKey(
      DASHBOARD_CACHE_CONFIG.activity,
      teacherId,
      tenantId,
      undefined,
      activityType
    );

    const { data } = await getCachedOrCompute(
      cacheKey,
      DASHBOARD_CACHE_CONFIG.activity.ttlSeconds,
      async () => {
        const rawActivity = await dashboardRepository.getRecentActivity(options);

        const items: ActivityItem[] = rawActivity.map((raw) => ({
          id: raw.id,
          type: raw.type as 'submission' | 'grade' | 'message' | 'alert',
          title: raw.title,
          description: raw.description,
          timestamp: raw.timestamp.toISOString(),
          studentId: raw.learnerId,
          studentName: raw.learnerId ? `Student ${raw.learnerId.slice(-4)}` : undefined,
          contentId: raw.contentId,
          relativeTime: getRelativeTime(raw.timestamp),
          actionRequired: raw.type === 'alert',
        }));

        return {
          items: items.slice(0, limit),
          hasMore: rawActivity.length > limit,
          totalCount: rawActivity.length,
        };
      }
    );

    return data;
  }

  /**
   * Get upcoming items
   */
  async getUpcomingItems(options: UpcomingQueryOptions): Promise<UpcomingItemsResponse> {
    const { teacherId, tenantId, daysAhead = 14, itemType } = options;

    const cacheKey = buildCacheKey(
      DASHBOARD_CACHE_CONFIG.upcoming,
      teacherId,
      tenantId,
      undefined,
      `${daysAhead}-${itemType ?? 'all'}`
    );

    const { data } = await getCachedOrCompute(
      cacheKey,
      DASHBOARD_CACHE_CONFIG.upcoming.ttlSeconds,
      async () => {
        const rawItems = await dashboardRepository.getUpcomingItems(options);

        const items: UpcomingItem[] = rawItems.map((raw) => ({
          id: raw.id,
          type: raw.type as 'deadline' | 'meeting' | 'review' | 'event',
          title: raw.title,
          date: raw.date.toISOString().split('T')[0],
          priority: raw.priority as 'high' | 'medium' | 'low',
          studentId: raw.learnerId,
          studentName: raw.learnerId ? `Student ${raw.learnerId.slice(-4)}` : undefined,
          daysUntil: daysUntil(raw.date.toISOString()),
        }));

        // Count by type
        const byType = {
          deadline: items.filter((i) => i.type === 'deadline').length,
          meeting: items.filter((i) => i.type === 'meeting').length,
          review: items.filter((i) => i.type === 'review').length,
          event: items.filter((i) => i.type === 'event').length,
        };

        return { items, byType };
      }
    );

    return data;
  }

  /**
   * Invalidate dashboard cache for a teacher
   */
  async invalidateCache(teacherId: string, tenantId: string): Promise<void> {
    const pattern = `dashboard:*:${tenantId}:${teacherId}*`;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info('Dashboard cache invalidated', {
          teacherId,
          tenantId,
          keysDeleted: keys.length,
        });
        metrics.increment('analytics.dashboard.cache.invalidated', keys.length);
      }
    } catch (error) {
      logger.error('Failed to invalidate dashboard cache', { error, teacherId, tenantId });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private buildMetadata(
    options: DashboardQueryOptions,
    cached: boolean,
    cacheAge?: number,
    queryTimeMs?: number
  ): DashboardMetadata {
    return {
      fetchedAt: new Date().toISOString(),
      period: options.period ?? 'week',
      cached,
      cacheAge,
      queryTimeMs,
      teacherId: options.teacherId,
      tenantId: options.tenantId,
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
