/**
 * Dashboards Routes
 *
 * REST API routes for dashboard data.
 */

import type { FastifyPluginAsync } from 'fastify';
import type Redis from 'ioredis';
import { prisma } from '../prisma.js';
import {
  getDateRangeForPeriod,
  periodOverPeriodChange,
  getComparisonDateRange,
} from '../utils/time-series.js';
import { mean, compositeScore } from '../utils/statistics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface DashboardOptions {
  redis?: Redis;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

const dashboardRoutes: FastifyPluginAsync<DashboardOptions> = async (fastify, options) => {
  const { redis } = options;

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  async function getCachedOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    if (redis) {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }

    const result = await compute();

    if (redis) {
      await redis.setex(key, ttlSeconds, JSON.stringify(result));
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /dashboards/admin
   *
   * Get admin dashboard data for a tenant
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      period?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last7Days' | 'last30Days';
    };
  }>(
    '/admin',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            period: {
              type: 'string',
              enum: ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last7Days', 'last30Days'],
              default: 'last7Days',
            },
          },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, period = 'last7Days' } = request.query;
      const cacheKey = `dashboard:admin:${tenantId}:${period}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        const dateRange = getDateRangeForPeriod(period);
        const comparisonRange = getComparisonDateRange(dateRange, 'previous');

        // Current period metrics
        const currentMetrics = await prisma.dailyUserMetrics.aggregate({
          where: {
            tenantId,
            date: { gte: dateRange.start, lt: dateRange.end },
          },
          _sum: {
            totalTimeSeconds: true,
            contentCompleted: true,
            assessmentsCompleted: true,
            sessionsCount: true,
          },
        });

        // Previous period metrics
        const previousMetrics = await prisma.dailyUserMetrics.aggregate({
          where: {
            tenantId,
            date: { gte: comparisonRange.start, lt: comparisonRange.end },
          },
          _sum: {
            totalTimeSeconds: true,
            contentCompleted: true,
            assessmentsCompleted: true,
            sessionsCount: true,
          },
        });

        // Active users
        const [currentActiveUsers, previousActiveUsers] = await Promise.all([
          prisma.dailyUserMetrics.groupBy({
            by: ['userId'],
            where: {
              tenantId,
              date: { gte: dateRange.start, lt: dateRange.end },
            },
          }),
          prisma.dailyUserMetrics.groupBy({
            by: ['userId'],
            where: {
              tenantId,
              date: { gte: comparisonRange.start, lt: comparisonRange.end },
            },
          }),
        ]);

        // Top content
        const topContent = await prisma.dailyContentMetrics.groupBy({
          by: ['contentId', 'contentType'],
          where: {
            tenantId,
            date: { gte: dateRange.start, lt: dateRange.end },
          },
          _sum: {
            views: true,
            completions: true,
          },
          orderBy: { _sum: { views: 'desc' } },
          take: 10,
        });

        // Daily trend
        const dailyTrend = await prisma.dailyUserMetrics.groupBy({
          by: ['date'],
          where: {
            tenantId,
            date: { gte: dateRange.start, lt: dateRange.end },
          },
          _sum: {
            totalTimeSeconds: true,
            contentCompleted: true,
          },
          _count: { userId: true },
          orderBy: { date: 'asc' },
        });

        const currentTime = currentMetrics._sum.totalTimeSeconds ?? 0;
        const previousTime = previousMetrics._sum.totalTimeSeconds ?? 0;

        return {
          summary: {
            activeUsers: {
              value: currentActiveUsers.length,
              change: periodOverPeriodChange(currentActiveUsers.length, previousActiveUsers.length),
            },
            totalTimeHours: {
              value: Math.round(currentTime / 3600 * 10) / 10,
              change: periodOverPeriodChange(currentTime, previousTime),
            },
            contentCompleted: {
              value: currentMetrics._sum.contentCompleted ?? 0,
              change: periodOverPeriodChange(
                currentMetrics._sum.contentCompleted ?? 0,
                previousMetrics._sum.contentCompleted ?? 0,
              ),
            },
            assessmentsCompleted: {
              value: currentMetrics._sum.assessmentsCompleted ?? 0,
              change: periodOverPeriodChange(
                currentMetrics._sum.assessmentsCompleted ?? 0,
                previousMetrics._sum.assessmentsCompleted ?? 0,
              ),
            },
            sessions: {
              value: currentMetrics._sum.sessionsCount ?? 0,
              change: periodOverPeriodChange(
                currentMetrics._sum.sessionsCount ?? 0,
                previousMetrics._sum.sessionsCount ?? 0,
              ),
            },
          },
          topContent: topContent.map((c) => ({
            contentId: c.contentId,
            contentType: c.contentType,
            views: c._sum.views ?? 0,
            completions: c._sum.completions ?? 0,
          })),
          dailyTrend: dailyTrend.map((d) => ({
            date: d.date.toISOString().split('T')[0],
            activeUsers: d._count.userId,
            timeHours: Math.round((d._sum.totalTimeSeconds ?? 0) / 3600 * 10) / 10,
            contentCompleted: d._sum.contentCompleted ?? 0,
          })),
          period: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          },
        };
      });

      return { success: true, data };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LEARNER DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /dashboards/learner/:userId
   *
   * Get learner-specific dashboard data
   */
  fastify.get<{
    Params: { userId: string };
    Querystring: {
      tenantId: string;
    };
  }>(
    '/learner/:userId',
    {
      schema: {
        params: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId'],
        },
        querystring: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { tenantId } = request.query;
      const cacheKey = `dashboard:learner:${tenantId}:${userId}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);

        // Today's stats
        const todayStats = await prisma.dailyUserMetrics.findUnique({
          where: {
            tenantId_userId_date: { tenantId, userId, date: today },
          },
        });

        // Week stats
        const weekStats = await prisma.dailyUserMetrics.aggregate({
          where: {
            tenantId,
            userId,
            date: { gte: weekAgo },
          },
          _sum: {
            totalTimeSeconds: true,
            contentCompleted: true,
            xpEarned: true,
          },
        });

        // Topic progress
        const topicProgress = await prisma.topicProgress.findMany({
          where: { tenantId, userId },
          orderBy: { lastAccessedAt: 'desc' },
          take: 10,
        });

        // Activity streak
        const recentActivity = await prisma.dailyUserMetrics.findMany({
          where: {
            tenantId,
            userId,
            date: { gte: monthAgo },
          },
          select: { date: true },
          orderBy: { date: 'desc' },
        });

        let streak = 0;
        const todayTime = today.getTime();
        for (let i = 0; i < recentActivity.length; i++) {
          const activityDate = new Date(recentActivity[i].date);
          activityDate.setHours(0, 0, 0, 0);
          const expectedDate = new Date(todayTime - i * 24 * 60 * 60 * 1000);
          expectedDate.setHours(0, 0, 0, 0);

          if (activityDate.getTime() === expectedDate.getTime()) {
            streak++;
          } else if (i === 0 && activityDate.getTime() === todayTime - 24 * 60 * 60 * 1000) {
            // Started yesterday
            streak = 1;
          } else {
            break;
          }
        }

        // Daily activity for the last 7 days
        const dailyActivity = await prisma.dailyUserMetrics.findMany({
          where: {
            tenantId,
            userId,
            date: { gte: weekAgo },
          },
          orderBy: { date: 'asc' },
        });

        return {
          today: {
            timeMinutes: todayStats ? Math.round(todayStats.totalTimeSeconds / 60) : 0,
            contentCompleted: todayStats?.contentCompleted ?? 0,
            xpEarned: todayStats?.xpEarned ?? 0,
          },
          week: {
            timeHours: Math.round((weekStats._sum.totalTimeSeconds ?? 0) / 3600 * 10) / 10,
            contentCompleted: weekStats._sum.contentCompleted ?? 0,
            xpEarned: weekStats._sum.xpEarned ?? 0,
          },
          streak,
          topicProgress: topicProgress.map((tp) => ({
            topicId: tp.topicId,
            subjectId: tp.subjectId,
            progressPercent: tp.progressPercent.toNumber(),
            masteryLevel: tp.masteryLevel.toNumber(),
            lastAccessedAt: tp.lastAccessedAt.toISOString(),
          })),
          dailyActivity: dailyActivity.map((da) => ({
            date: da.date.toISOString().split('T')[0],
            timeMinutes: Math.round(da.totalTimeSeconds / 60),
            contentCompleted: da.contentCompleted,
            xpEarned: da.xpEarned,
          })),
        };
      }, 60); // Cache for 1 minute for learner dashboards

      return { success: true, data };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEACHER DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /dashboards/teacher
   *
   * Get teacher dashboard data for classroom analytics
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      classroomId?: string;
      period?: 'today' | 'thisWeek' | 'thisMonth' | 'last7Days' | 'last30Days';
    };
  }>(
    '/teacher',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            classroomId: { type: 'string' },
            period: {
              type: 'string',
              enum: ['today', 'thisWeek', 'thisMonth', 'last7Days', 'last30Days'],
              default: 'thisWeek',
            },
          },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, classroomId, period = 'thisWeek' } = request.query;
      const cacheKey = `dashboard:teacher:${tenantId}:${classroomId ?? 'all'}:${period}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        const dateRange = getDateRangeForPeriod(period);

        // Get all users' metrics (would filter by classroom in real implementation)
        const userMetrics = await prisma.dailyUserMetrics.groupBy({
          by: ['userId'],
          where: {
            tenantId,
            date: { gte: dateRange.start, lt: dateRange.end },
          },
          _sum: {
            totalTimeSeconds: true,
            contentCompleted: true,
            assessmentsCompleted: true,
            questionsAnswered: true,
            questionsCorrect: true,
          },
          _avg: {
            averageScore: true,
          },
        });

        // Calculate engagement scores
        const engagementScores = userMetrics.map((um) => {
          const score = compositeScore([
            { value: um._sum.totalTimeSeconds ?? 0, weight: 0.3, max: 7200 }, // 2 hours max
            { value: um._sum.contentCompleted ?? 0, weight: 0.3, max: 10 },
            { value: um._sum.assessmentsCompleted ?? 0, weight: 0.2, max: 5 },
            { value: um._avg.averageScore?.toNumber() ?? 0, weight: 0.2, max: 100 },
          ]);

          return {
            userId: um.userId,
            score,
            timeMinutes: Math.round((um._sum.totalTimeSeconds ?? 0) / 60),
            contentCompleted: um._sum.contentCompleted ?? 0,
            assessmentsCompleted: um._sum.assessmentsCompleted ?? 0,
            accuracy: um._sum.questionsAnswered
              ? Math.round(((um._sum.questionsCorrect ?? 0) / um._sum.questionsAnswered) * 100)
              : null,
          };
        });

        // Sort by engagement score
        engagementScores.sort((a, b) => b.score - a.score);

        // Topic mastery aggregation
        const topicMastery = await prisma.topicProgress.groupBy({
          by: ['topicId', 'subjectId'],
          where: { tenantId },
          _avg: {
            progressPercent: true,
            masteryLevel: true,
          },
          _count: { userId: true },
        });

        // Aggregate class stats
        const classStats = {
          totalStudents: userMetrics.length,
          averageTimeMinutes: userMetrics.length > 0
            ? Math.round(mean(userMetrics.map((um) => (um._sum.totalTimeSeconds ?? 0) / 60)))
            : 0,
          totalContentCompleted: userMetrics.reduce((sum, um) => sum + (um._sum.contentCompleted ?? 0), 0),
          totalAssessments: userMetrics.reduce((sum, um) => sum + (um._sum.assessmentsCompleted ?? 0), 0),
          averageScore: userMetrics.length > 0
            ? Math.round(mean(userMetrics.map((um) => um._avg.averageScore?.toNumber() ?? 0)))
            : null,
          averageEngagement: userMetrics.length > 0
            ? Math.round(mean(engagementScores.map((e) => e.score)))
            : 0,
        };

        return {
          classStats,
          studentEngagement: engagementScores.slice(0, 20), // Top 20
          topicMastery: topicMastery.map((tm) => ({
            topicId: tm.topicId,
            subjectId: tm.subjectId,
            averageProgress: Math.round((tm._avg.progressPercent?.toNumber() ?? 0) * 10) / 10,
            averageMastery: Math.round((tm._avg.masteryLevel?.toNumber() ?? 0) * 100),
            studentCount: tm._count.userId,
          })),
          period: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          },
        };
      });

      return { success: true, data };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL-TIME METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /dashboards/realtime
   *
   * Get real-time activity metrics (minimal caching)
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
    };
  }>(
    '/realtime',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = request.query;

      // Get metrics for last hour
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);

      const recentEvents = await prisma.learningEvent.groupBy({
        by: ['eventCategory'],
        where: {
          tenantId,
          timestamp: { gte: hourAgo },
        },
        _count: { id: true },
      });

      const activeUsers = await prisma.learningEvent.groupBy({
        by: ['userId'],
        where: {
          tenantId,
          timestamp: { gte: hourAgo },
        },
      });

      // Get last 10 events
      const latestEvents = await prisma.learningEvent.findMany({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          userId: true,
          eventType: true,
          eventCategory: true,
          contentId: true,
          timestamp: true,
        },
      });

      return {
        success: true,
        data: {
          activeUsersLastHour: activeUsers.length,
          eventsLastHour: recentEvents.reduce((sum, e) => sum + e._count.id, 0),
          eventsByCategory: recentEvents.map((e) => ({
            category: e.eventCategory,
            count: e._count.id,
          })),
          latestEvents: latestEvents.map((e) => ({
            id: e.id,
            userId: e.userId,
            type: e.eventType,
            category: e.eventCategory,
            contentId: e.contentId,
            timestamp: e.timestamp.toISOString(),
          })),
          timestamp: new Date().toISOString(),
        },
      };
    },
  );
};

export default dashboardRoutes;
