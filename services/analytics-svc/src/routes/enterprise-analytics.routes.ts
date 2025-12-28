/**
 * Enterprise Analytics API Routes
 *
 * Comprehensive analytics endpoints for enterprise-grade reporting,
 * at-risk student identification, and real-time metrics.
 */

import type { FastifyPluginAsync } from 'fastify';
import type Redis from 'ioredis';
import { z } from 'zod';
import { AnalyticsQueryService } from '../query/analytics-query.service.js';
import { EventService } from '../events/event.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const StudentMetricsQuerySchema = DateRangeSchema.extend({
  tenantId: z.string().uuid(),
  classId: z.string().uuid().optional(),
});

const ClassMetricsQuerySchema = DateRangeSchema.extend({
  tenantId: z.string().uuid(),
});

const AtRiskQuerySchema = z.object({
  tenantId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  minRiskScore: z.coerce.number().min(0).max(100).default(50),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const TrendQuerySchema = DateRangeSchema.extend({
  tenantId: z.string().uuid(),
  granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
});

const EventTrackingSchema = z.object({
  category: z.enum(['learning', 'assessment', 'engagement', 'system', 'collaboration', 'content']),
  eventType: z.string(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  properties: z.record(z.unknown()).optional(),
  metadata: z.object({
    deviceType: z.string().optional(),
    platform: z.string().optional(),
    appVersion: z.string().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

const BatchEventSchema = z.object({
  events: z.array(EventTrackingSchema).min(1).max(100),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnterpriseAnalyticsRoutesOptions {
  redis?: Redis;
  redshiftClient?: unknown; // AWS Redshift client
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

const enterpriseAnalyticsRoutes: FastifyPluginAsync<EnterpriseAnalyticsRoutesOptions> = async (
  fastify,
  options
) => {
  const redis = options.redis;
  const queryService = new AnalyticsQueryService(options.redshiftClient, redis);
  const eventService = options.redis ? new EventService(options.redis) : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // STUDENT METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/students/:studentId/metrics
   *
   * Get comprehensive metrics for a specific student
   */
  fastify.get<{
    Params: { studentId: string };
    Querystring: z.infer<typeof StudentMetricsQuerySchema>;
  }>(
    '/students/:studentId/metrics',
    {
      schema: {
        params: {
          type: 'object',
          properties: { studentId: { type: 'string', format: 'uuid' } },
          required: ['studentId'],
        },
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
      const { studentId } = request.params;
      const query = StudentMetricsQuerySchema.parse(request.query);

      const metrics = await queryService.getStudentMetrics(
        query.tenantId,
        studentId,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined
      );

      return reply.send({
        success: true,
        data: metrics,
      });
    }
  );

  /**
   * POST /enterprise/students/metrics/batch
   *
   * Get metrics for multiple students at once
   */
  fastify.post<{
    Body: {
      tenantId: string;
      studentIds: string[];
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/students/metrics/batch',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            studentIds: { type: 'array', items: { type: 'string', format: 'uuid' }, maxItems: 100 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
          required: ['tenantId', 'studentIds'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId, studentIds, startDate, endDate } = request.body;

      const metrics = await queryService.getStudentsMetrics(
        tenantId,
        studentIds,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      return reply.send({
        success: true,
        data: metrics,
        count: Object.keys(metrics).length,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/classes/:classId/metrics
   *
   * Get metrics for a specific class
   */
  fastify.get<{
    Params: { classId: string };
    Querystring: z.infer<typeof ClassMetricsQuerySchema>;
  }>(
    '/classes/:classId/metrics',
    {
      schema: {
        params: {
          type: 'object',
          properties: { classId: { type: 'string', format: 'uuid' } },
          required: ['classId'],
        },
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const query = ClassMetricsQuerySchema.parse(request.query);

      const metrics = await queryService.getClassMetrics(
        query.tenantId,
        classId,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined
      );

      return reply.send({
        success: true,
        data: metrics,
      });
    }
  );

  /**
   * GET /enterprise/classes/:classId/students
   *
   * Get student-level metrics for a class with rankings
   */
  fastify.get<{
    Params: { classId: string };
    Querystring: z.infer<typeof ClassMetricsQuerySchema & typeof PaginationSchema>;
  }>(
    '/classes/:classId/students',
    async (request, reply) => {
      const { classId } = request.params;
      const query = ClassMetricsQuerySchema.merge(PaginationSchema).parse(request.query);

      // Get all students in class with metrics
      const classMetrics = await queryService.getClassMetrics(
        query.tenantId,
        classId,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined
      );

      return reply.send({
        success: true,
        data: {
          class: {
            classId,
            averageScore: classMetrics.averageScore,
            totalStudents: classMetrics.studentCount,
            activeStudents: classMetrics.activeStudents,
          },
          students: classMetrics.topPerformers,
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            totalItems: classMetrics.studentCount,
            totalPages: Math.ceil(classMetrics.studentCount / query.pageSize),
          },
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // AT-RISK STUDENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/at-risk
   *
   * Get list of at-risk students with factors and recommendations
   */
  fastify.get<{
    Querystring: z.infer<typeof AtRiskQuerySchema>;
  }>(
    '/at-risk',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  students: { type: 'array' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = AtRiskQuerySchema.parse(request.query);

      const atRiskStudents = await queryService.identifyAtRiskStudents(
        query.tenantId,
        query.minRiskScore / 100, // Convert percentage to decimal
        query.limit,
        query.classId
      );

      // Calculate summary statistics
      const riskLevels = {
        critical: atRiskStudents.filter(s => s.indicators.riskLevel === 'critical').length,
        high: atRiskStudents.filter(s => s.indicators.riskLevel === 'high').length,
        medium: atRiskStudents.filter(s => s.indicators.riskLevel === 'medium').length,
        low: atRiskStudents.filter(s => s.indicators.riskLevel === 'low').length,
      };

      return reply.send({
        success: true,
        data: {
          students: atRiskStudents,
          summary: {
            totalAtRisk: atRiskStudents.length,
            byRiskLevel: riskLevels,
            commonFactors: getCommonRiskFactors(atRiskStudents),
          },
        },
      });
    }
  );

  /**
   * GET /enterprise/at-risk/:studentId
   *
   * Get detailed at-risk analysis for a specific student
   */
  fastify.get<{
    Params: { studentId: string };
    Querystring: { tenantId: string };
  }>(
    '/at-risk/:studentId',
    async (request, reply) => {
      const { studentId } = request.params;
      const { tenantId } = request.query;

      const atRiskStudents = await queryService.identifyAtRiskStudents(tenantId, 0, 1000);
      const student = atRiskStudents.find(s => s.studentId === studentId);

      if (!student) {
        return reply.code(404).send({
          success: false,
          error: 'Student not found or not at risk',
        });
      }

      return reply.send({
        success: true,
        data: student,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/tenants/:tenantId/metrics
   *
   * Get tenant-wide analytics metrics
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: z.infer<typeof DateRangeSchema>;
  }>(
    '/tenants/:tenantId/metrics',
    async (request, reply) => {
      const { tenantId } = request.params;
      const query = DateRangeSchema.parse(request.query);

      const metrics = await queryService.getTenantMetrics(
        tenantId,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined
      );

      return reply.send({
        success: true,
        data: metrics,
      });
    }
  );

  /**
   * GET /enterprise/tenants/:tenantId/overview
   *
   * Get executive dashboard data for tenant
   */
  fastify.get<{
    Params: { tenantId: string };
  }>(
    '/tenants/:tenantId/overview',
    async (request, reply) => {
      const { tenantId } = request.params;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [metrics, atRisk, trends] = await Promise.all([
        queryService.getTenantMetrics(tenantId, thirtyDaysAgo, now),
        queryService.identifyAtRiskStudents(tenantId, 0.5, 100),
        queryService.getEngagementTrends(tenantId, thirtyDaysAgo, now, 'daily'),
      ]);

      return reply.send({
        success: true,
        data: {
          metrics,
          atRiskSummary: {
            total: atRisk.length,
            critical: atRisk.filter(s => s.indicators.riskLevel === 'critical').length,
            high: atRisk.filter(s => s.indicators.riskLevel === 'high').length,
          },
          engagementTrends: trends,
          period: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: now.toISOString(),
          },
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/skills/:skillId/metrics
   *
   * Get performance metrics for a specific skill
   */
  fastify.get<{
    Params: { skillId: string };
    Querystring: z.infer<typeof ClassMetricsQuerySchema>;
  }>(
    '/skills/:skillId/metrics',
    async (request, reply) => {
      const { skillId } = request.params;
      const query = ClassMetricsQuerySchema.parse(request.query);

      const metrics = await queryService.getSkillMetrics(
        query.tenantId,
        skillId,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined
      );

      return reply.send({
        success: true,
        data: metrics,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TRENDS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/trends/engagement
   *
   * Get engagement trends over time
   */
  fastify.get<{
    Querystring: z.infer<typeof TrendQuerySchema>;
  }>(
    '/trends/engagement',
    async (request, reply) => {
      const query = TrendQuerySchema.parse(request.query);
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const trends = await queryService.getEngagementTrends(
        query.tenantId,
        query.startDate ? new Date(query.startDate) : defaultStart,
        query.endDate ? new Date(query.endDate) : now,
        query.granularity
      );

      return reply.send({
        success: true,
        data: trends,
      });
    }
  );

  /**
   * GET /enterprise/trends/performance
   *
   * Get performance trends over time
   */
  fastify.get<{
    Querystring: z.infer<typeof TrendQuerySchema>;
  }>(
    '/trends/performance',
    async (request, reply) => {
      const query = TrendQuerySchema.parse(request.query);
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const trends = await queryService.getPerformanceTrends(
        query.tenantId,
        query.startDate ? new Date(query.startDate) : defaultStart,
        query.endDate ? new Date(query.endDate) : now,
        query.granularity
      );

      return reply.send({
        success: true,
        data: trends,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /enterprise/events
   *
   * Track a single analytics event
   */
  fastify.post<{
    Body: z.infer<typeof EventTrackingSchema>;
  }>(
    '/events',
    {
      schema: {
        body: {
          type: 'object',
          required: ['category', 'eventType', 'userId', 'tenantId'],
        },
      },
    },
    async (request, reply) => {
      if (!eventService) {
        return reply.code(503).send({
          success: false,
          error: 'Event tracking not configured',
        });
      }

      const eventData = EventTrackingSchema.parse(request.body);

      // Build event from tracking data
      const event = {
        id: crypto.randomUUID(),
        category: eventData.category,
        eventType: eventData.eventType,
        userId: eventData.userId,
        tenantId: eventData.tenantId,
        sessionId: eventData.sessionId || crypto.randomUUID(),
        timestamp: new Date(),
        contentId: eventData.contentId,
        properties: eventData.properties || {},
        metadata: {
          ...eventData.metadata,
          receivedAt: new Date().toISOString(),
        },
        version: '1.0',
      };

      await eventService.track(event);

      return reply.code(202).send({
        success: true,
        message: 'Event accepted',
        eventId: event.id,
      });
    }
  );

  /**
   * POST /enterprise/events/batch
   *
   * Track multiple events in a batch
   */
  fastify.post<{
    Body: z.infer<typeof BatchEventSchema>;
  }>(
    '/events/batch',
    async (request, reply) => {
      if (!eventService) {
        return reply.code(503).send({
          success: false,
          error: 'Event tracking not configured',
        });
      }

      const { events } = BatchEventSchema.parse(request.body);
      const eventIds: string[] = [];

      for (const eventData of events) {
        const event = {
          id: crypto.randomUUID(),
          category: eventData.category,
          eventType: eventData.eventType,
          userId: eventData.userId,
          tenantId: eventData.tenantId,
          sessionId: eventData.sessionId || crypto.randomUUID(),
          timestamp: new Date(),
          contentId: eventData.contentId,
          properties: eventData.properties || {},
          metadata: {
            ...eventData.metadata,
            receivedAt: new Date().toISOString(),
          },
          version: '1.0',
        };

        await eventService.track(event);
        eventIds.push(event.id);
      }

      return reply.code(202).send({
        success: true,
        message: `${events.length} events accepted`,
        eventIds,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL-TIME METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/realtime/active
   *
   * Get real-time active user count
   */
  fastify.get<{
    Querystring: { tenantId: string };
  }>(
    '/realtime/active',
    async (request, reply) => {
      if (!redis) {
        return reply.code(503).send({
          success: false,
          error: 'Real-time metrics not configured',
        });
      }

      const { tenantId } = request.query;
      const now = new Date();
      const hour = now.toISOString().substring(0, 13);
      const dayKey = `analytics:hourly:${tenantId}:${hour}`;
      const dauKey = `analytics:dau:${tenantId}:${now.toISOString().substring(0, 10)}`;

      const [hourlyCount, dauCount] = await Promise.all([
        redis.get(dayKey),
        redis.scard(dauKey),
      ]);

      return reply.send({
        success: true,
        data: {
          hourlyActiveUsers: parseInt(hourlyCount || '0', 10),
          dailyActiveUsers: dauCount,
          timestamp: now.toISOString(),
        },
      });
    }
  );

  /**
   * GET /enterprise/realtime/metrics
   *
   * Get real-time dashboard metrics
   */
  fastify.get<{
    Querystring: { tenantId: string };
  }>(
    '/realtime/metrics',
    async (request, reply) => {
      if (!redis) {
        return reply.code(503).send({
          success: false,
          error: 'Real-time metrics not configured',
        });
      }

      const { tenantId } = request.query;
      const now = new Date();
      const today = now.toISOString().substring(0, 10);
      const hour = now.toISOString().substring(0, 13);

      const [
        hourlyCount,
        dailyCount,
        todayEvents,
      ] = await Promise.all([
        redis.get(`analytics:hourly:${tenantId}:${hour}`),
        redis.scard(`analytics:dau:${tenantId}:${today}`),
        redis.get(`analytics:daily:${tenantId}:${today}`),
      ]);

      return reply.send({
        success: true,
        data: {
          activeUsersNow: parseInt(hourlyCount || '0', 10),
          activeUsersToday: dailyCount,
          eventsToday: parseInt(todayEvents || '0', 10),
          timestamp: now.toISOString(),
          period: {
            hour,
            date: today,
          },
        },
      });
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getCommonRiskFactors(
  atRiskStudents: Array<{ indicators: { riskFactors: Array<{ type: string }> } }>
): Record<string, number> {
  const factorCounts: Record<string, number> = {};

  for (const student of atRiskStudents) {
    for (const factor of student.indicators.riskFactors) {
      factorCounts[factor.type] = (factorCounts[factor.type] || 0) + 1;
    }
  }

  return factorCounts;
}

export default enterpriseAnalyticsRoutes;
