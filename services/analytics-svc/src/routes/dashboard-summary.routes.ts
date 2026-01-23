/**
 * Teacher Dashboard Summary Routes
 *
 * Aggregated API endpoints for the teacher dashboard.
 * Provides summary data for metrics, at-risk students, IEP progress, and activity.
 *
 * REAL IMPLEMENTATION: Uses Prisma database queries with Redis caching.
 */

import { logger, metrics } from '@aivo/ts-observability';
import type { FastifyInstance } from 'fastify';

import { dashboardService } from '../services/dashboard.service.js';
import type {
  DashboardPeriod,
  DashboardQueryOptions,
  AtRiskQueryOptions,
  ActivityQueryOptions,
  UpcomingQueryOptions,
  ActivityType,
  RiskLevel,
  UpcomingType,
  PriorityLevel,
} from '../types/dashboard.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract user and tenant info from request
 */
function extractRequestContext(request: { user?: { id?: string; tenantId?: string } }): {
  teacherId: string;
  tenantId: string;
} {
  const user = request.user as { id?: string; tenantId?: string } | undefined;
  return {
    teacherId: user?.id ?? 'anonymous',
    tenantId: user?.tenantId ?? 'default',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const periodQuerySchema = {
  type: 'object' as const,
  properties: {
    period: {
      type: 'string',
      enum: ['today', 'week', 'month', 'quarter', 'year'],
      default: 'week',
    },
    skipCache: { type: 'boolean', default: false },
  },
};

const atRiskQuerySchema = {
  type: 'object' as const,
  properties: {
    period: {
      type: 'string',
      enum: ['today', 'week', 'month', 'quarter', 'year'],
      default: 'week',
    },
    limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
    riskLevel: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
};

const activityQuerySchema = {
  type: 'object' as const,
  properties: {
    limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
    type: { type: 'string', enum: ['submission', 'grade', 'message', 'alert'] },
  },
};

const upcomingQuerySchema = {
  type: 'object' as const,
  properties: {
    days: { type: 'number', default: 14, minimum: 1, maximum: 90 },
    type: { type: 'string', enum: ['deadline', 'meeting', 'review', 'event'] },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function dashboardSummaryRoutes(fastify: FastifyInstance) {
  /**
   * GET /summary
   * Get complete dashboard summary with all data
   */
  fastify.get<{
    Querystring: { period?: DashboardPeriod; skipCache?: boolean };
  }>(
    '/summary',
    {
      schema: {
        querystring: periodQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get complete dashboard summary',
        description:
          'Returns aggregated metrics, at-risk students, IEP progress, and activity for the teacher dashboard. Uses database queries with Redis caching.',
        response: {
          200: {
            type: 'object',
            properties: {
              stats: {
                type: 'object',
                properties: {
                  totalStudents: { type: 'number' },
                  averageMastery: { type: 'number' },
                  iepStudents: { type: 'number' },
                  atRiskStudents: { type: 'number' },
                },
              },
              classPerformance: { type: 'array' },
              atRiskStudents: { type: 'array' },
              iepProgress: { type: 'array' },
              recentActivity: { type: 'array' },
              upcomingItems: { type: 'array' },
              metadata: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();
      const { teacherId, tenantId } = extractRequestContext(request);
      const { period = 'week', skipCache = false } = request.query;

      try {
        metrics.increment('analytics.dashboard.summary.request');

        const options: DashboardQueryOptions = {
          teacherId,
          tenantId,
          period,
          skipCache,
        };

        const summary = await dashboardService.getDashboardSummary(options);

        const duration = Date.now() - startTime;
        metrics.histogram('analytics.dashboard.summary.response_time_ms', duration);

        if (duration > 1000) {
          logger.warn('Slow dashboard summary response', {
            teacherId,
            tenantId,
            durationMs: duration,
          });
        }

        return reply.send(summary);
      } catch (error) {
        metrics.increment('analytics.dashboard.summary.error');
        logger.error('Failed to get dashboard summary', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get dashboard summary' });
      }
    }
  );

  /**
   * GET /stats
   * Get dashboard stats only (lightweight endpoint)
   */
  fastify.get<{
    Querystring: { period?: DashboardPeriod };
  }>(
    '/stats',
    {
      schema: {
        querystring: periodQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get dashboard stats',
        description:
          'Returns just the key metrics for the dashboard header. Lightweight endpoint for polling.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);
      const { period = 'week' } = request.query;

      try {
        metrics.increment('analytics.dashboard.stats.request');

        const options: DashboardQueryOptions = { teacherId, tenantId, period };
        const stats = await dashboardService.getStats(options);

        return reply.send(stats);
      } catch (error) {
        metrics.increment('analytics.dashboard.stats.error');
        logger.error('Failed to get dashboard stats', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get dashboard stats' });
      }
    }
  );

  /**
   * GET /classes
   * Get class performance breakdown
   */
  fastify.get<{
    Querystring: { period?: DashboardPeriod };
  }>(
    '/classes',
    {
      schema: {
        querystring: periodQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get class performance',
        description: 'Returns performance breakdown for all classes taught by the teacher.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);
      const { period = 'week' } = request.query;

      try {
        metrics.increment('analytics.dashboard.classes.request');

        const options: DashboardQueryOptions = { teacherId, tenantId, period };
        const classes = await dashboardService.getClassPerformance(options);

        return reply.send({ classes, total: classes.length });
      } catch (error) {
        metrics.increment('analytics.dashboard.classes.error');
        logger.error('Failed to get class performance', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get class performance' });
      }
    }
  );

  /**
   * GET /at-risk
   * Get at-risk students with intervention suggestions
   */
  fastify.get<{
    Querystring: { period?: DashboardPeriod; limit?: number; riskLevel?: RiskLevel };
  }>(
    '/at-risk',
    {
      schema: {
        querystring: atRiskQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get at-risk students',
        description:
          'Returns students who are at risk of falling behind with AI-suggested interventions.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);
      const { period = 'week', limit = 10, riskLevel } = request.query;

      try {
        metrics.increment('analytics.dashboard.at_risk.request');

        const options: AtRiskQueryOptions = {
          teacherId,
          tenantId,
          period,
          limit,
          riskLevel,
        };

        const result = await dashboardService.getAtRiskStudents(options);

        return reply.send(result);
      } catch (error) {
        metrics.increment('analytics.dashboard.at_risk.error');
        logger.error('Failed to get at-risk students', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get at-risk students' });
      }
    }
  );

  /**
   * GET /iep-progress
   * Get IEP goal progress for students with IEPs
   */
  fastify.get<{
    Querystring: { period?: DashboardPeriod };
  }>(
    '/iep-progress',
    {
      schema: {
        querystring: periodQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get IEP progress summary',
        description: 'Returns IEP goal progress for students with IEPs in teacher classes.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);
      const { period = 'week' } = request.query;

      try {
        metrics.increment('analytics.dashboard.iep_progress.request');

        const options: DashboardQueryOptions = { teacherId, tenantId, period };
        const result = await dashboardService.getIEPProgress(options);

        return reply.send(result);
      } catch (error) {
        metrics.increment('analytics.dashboard.iep_progress.error');
        logger.error('Failed to get IEP progress', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get IEP progress' });
      }
    }
  );

  /**
   * GET /activity
   * Get recent activity feed
   */
  fastify.get<{
    Querystring: { limit?: number; type?: ActivityType };
  }>(
    '/activity',
    {
      schema: {
        querystring: activityQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get recent activity',
        description: 'Returns recent activity feed for the teacher classes.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);
      const { limit = 20, type: activityType } = request.query;

      try {
        metrics.increment('analytics.dashboard.activity.request');

        const options: ActivityQueryOptions = {
          teacherId,
          tenantId,
          limit,
          activityType,
        };

        const result = await dashboardService.getRecentActivity(options);

        return reply.send(result);
      } catch (error) {
        metrics.increment('analytics.dashboard.activity.error');
        logger.error('Failed to get activity', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get activity' });
      }
    }
  );

  /**
   * GET /upcoming
   * Get upcoming items (deadlines, meetings, reviews)
   */
  fastify.get<{
    Querystring: { days?: number; type?: UpcomingType; priority?: PriorityLevel };
  }>(
    '/upcoming',
    {
      schema: {
        querystring: upcomingQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get upcoming items',
        description: 'Returns upcoming deadlines, meetings, IEP reviews, and events.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);
      const { days: daysAhead = 14, type: itemType, priority } = request.query;

      try {
        metrics.increment('analytics.dashboard.upcoming.request');

        const options: UpcomingQueryOptions = {
          teacherId,
          tenantId,
          daysAhead,
          itemType,
          priority,
        };

        const result = await dashboardService.getUpcomingItems(options);

        return reply.send(result);
      } catch (error) {
        metrics.increment('analytics.dashboard.upcoming.error');
        logger.error('Failed to get upcoming items', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to get upcoming items' });
      }
    }
  );

  /**
   * POST /cache/invalidate
   * Invalidate dashboard cache for current teacher
   */
  fastify.post(
    '/cache/invalidate',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Invalidate dashboard cache',
        description: 'Forces refresh of cached dashboard data for the current teacher.',
      },
    },
    async (request, reply) => {
      const { teacherId, tenantId } = extractRequestContext(request);

      try {
        await dashboardService.invalidateCache(teacherId, tenantId);
        metrics.increment('analytics.dashboard.cache.manual_invalidate');

        return reply.send({ success: true, message: 'Cache invalidated' });
      } catch (error) {
        logger.error('Failed to invalidate cache', { error, teacherId, tenantId });
        return reply.status(500).send({ error: 'Failed to invalidate cache' });
      }
    }
  );
}

export default dashboardSummaryRoutes;
