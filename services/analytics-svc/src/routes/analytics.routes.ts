/**
 * Analytics Routes
 *
 * REST API routes for analytics endpoints.
 */

import type { FastifyPluginAsync } from 'fastify';
import type Redis from 'ioredis';

import { prisma } from '../prisma.js';
import { AnalyticsService } from '../services/analytics.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const learnerProgressQuerySchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    subjectId: { type: 'string' },
  },
  required: ['tenantId'],
} as const;

const contentAnalyticsQuerySchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    contentId: { type: 'string' },
    contentType: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  },
  required: ['tenantId'],
} as const;

const tenantOverviewQuerySchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
  },
  required: ['tenantId'],
} as const;

const competencyHeatmapQuerySchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    userId: { type: 'string' },
    subjectId: { type: 'string' },
    classroomId: { type: 'string' },
  },
  required: ['tenantId'],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalyticsRoutesOptions {
  redis?: Redis;
}

const analyticsRoutes: FastifyPluginAsync<AnalyticsRoutesOptions> = async (fastify, options) => {
  const analyticsService = new AnalyticsService(prisma, options.redis);

  // ─────────────────────────────────────────────────────────────────────────────
  // LEARNER PROGRESS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/learners/:userId/progress
   *
   * Get learning progress for a specific learner
   */
  fastify.get<{
    Params: { userId: string };
    Querystring: {
      tenantId: string;
      startDate?: string;
      endDate?: string;
      subjectId?: string;
    };
  }>(
    '/learners/:userId/progress',
    {
      schema: {
        params: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId'],
        },
        querystring: learnerProgressQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { tenantId, startDate, endDate, subjectId } = request.query;

      const progress = await analyticsService.getLearnerProgress({
        tenantId,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        subjectId,
      });

      return { success: true, data: progress };
    },
  );

  /**
   * GET /analytics/learners/batch/progress
   *
   * Get learning progress for multiple learners
   */
  fastify.post<{
    Body: {
      tenantId: string;
      userIds: string[];
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/learners/batch/progress',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            userIds: { type: 'array', items: { type: 'string' }, maxItems: 50 },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
          required: ['tenantId', 'userIds'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userIds, startDate, endDate } = request.body;

      const results = await Promise.all(
        userIds.map((userId) =>
          analyticsService.getLearnerProgress({
            tenantId,
            userId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          }),
        ),
      );

      return { success: true, data: results };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/content
   *
   * Get analytics for content items
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      contentId?: string;
      contentType?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    };
  }>(
    '/content',
    {
      schema: {
        querystring: contentAnalyticsQuerySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, contentId, contentType, startDate, endDate, limit } = request.query;

      const analytics = await analyticsService.getContentAnalytics({
        tenantId,
        contentId,
        contentType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
      });

      return { success: true, data: analytics };
    },
  );

  /**
   * GET /analytics/content/:contentId
   *
   * Get detailed analytics for a specific content item
   */
  fastify.get<{
    Params: { contentId: string };
    Querystring: {
      tenantId: string;
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/content/:contentId',
    {
      schema: {
        params: {
          type: 'object',
          properties: { contentId: { type: 'string' } },
          required: ['contentId'],
        },
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { contentId } = request.params;
      const { tenantId, startDate, endDate } = request.query;

      const analytics = await analyticsService.getContentAnalytics({
        tenantId,
        contentId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: 1,
      });

      if (analytics.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Content analytics not found',
        });
      }

      return { success: true, data: analytics[0] };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/tenant/overview
   *
   * Get tenant-level analytics overview
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/tenant/overview',
    {
      schema: {
        querystring: tenantOverviewQuerySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, startDate, endDate } = request.query;

      const overview = await analyticsService.getTenantOverview({
        tenantId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return { success: true, data: overview };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPETENCY HEATMAP
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/competency/heatmap
   *
   * Get competency heatmap data
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      userId?: string;
      subjectId?: string;
      classroomId?: string;
    };
  }>(
    '/competency/heatmap',
    {
      schema: {
        querystring: competencyHeatmapQuerySchema,
      },
    },
    async (request, reply) => {
      const { tenantId, userId, subjectId, classroomId } = request.query;

      const heatmap = await analyticsService.getCompetencyHeatmap({
        tenantId,
        userId,
        subjectId,
        classroomId,
      });

      return { success: true, data: heatmap };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DAILY METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/metrics/daily
   *
   * Get daily metrics for a date range
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      userId?: string;
      startDate: string;
      endDate: string;
    };
  }>(
    '/metrics/daily',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
          required: ['tenantId', 'startDate', 'endDate'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId, startDate, endDate } = request.query;

      const metrics = await prisma.dailyUserMetrics.findMany({
        where: {
          tenantId,
          ...(userId ? { userId } : {}),
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: 'asc' },
      });

      return { success: true, data: metrics };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PERIOD METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/metrics/period
   *
   * Get period-level aggregated metrics
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      periodType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/metrics/period',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            periodType: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
          required: ['tenantId', 'periodType'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, periodType, startDate, endDate } = request.query;

      const metrics = await prisma.periodMetrics.findMany({
        where: {
          tenantId,
          periodType,
          ...(startDate || endDate
            ? {
                periodStart: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
        orderBy: { periodStart: 'asc' },
      });

      return { success: true, data: metrics };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC PROGRESS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /analytics/topics/progress
   *
   * Get topic progress for a user or across users
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      userId?: string;
      subjectId?: string;
      topicId?: string;
    };
  }>(
    '/topics/progress',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            subjectId: { type: 'string' },
            topicId: { type: 'string' },
          },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId, subjectId, topicId } = request.query;

      const progress = await prisma.topicProgress.findMany({
        where: {
          tenantId,
          ...(userId ? { userId } : {}),
          ...(subjectId ? { subjectId } : {}),
          ...(topicId ? { topicId } : {}),
        },
        orderBy: [{ subjectId: 'asc' }, { topicId: 'asc' }],
      });

      return { success: true, data: progress };
    },
  );
};

export default analyticsRoutes;
