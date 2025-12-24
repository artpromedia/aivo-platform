/**
 * Teacher Analytics Routes
 *
 * API endpoints for teacher analytics dashboard.
 * Provides class overview, student analytics, skill mastery,
 * early warning, and IEP progress endpoints.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyInstance } from 'fastify';
import { FastifyRequest, FastifyReply } from 'fastify';

import type { TimePeriod } from '../services/teacher-analytics.service';
import teacherAnalyticsService from '../services/teacher-analytics.service';

// =====================
// Route Schemas
// =====================

const periodQuerySchema = {
  type: 'object' as const,
  properties: {
    period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
  },
};

const classIdParamsSchema = {
  type: 'object' as const,
  required: ['classId'],
  properties: {
    classId: { type: 'string' },
  },
};

const studentIdParamsSchema = {
  type: 'object' as const,
  required: ['studentId'],
  properties: {
    studentId: { type: 'string' },
  },
};

const skillMatrixQuerySchema = {
  type: 'object' as const,
  properties: {
    domain: { type: 'string' },
  },
};

const generateReportBodySchema = {
  type: 'object' as const,
  required: ['reportType', 'format'],
  properties: {
    reportType: {
      type: 'string',
      enum: ['class-summary', 'student-progress', 'skill-mastery', 'iep-progress'],
    },
    format: { type: 'string', enum: ['pdf', 'csv', 'xlsx'] },
    studentIds: { type: 'array', items: { type: 'string' } },
    period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
    includeCharts: { type: 'boolean' },
  },
};

const logIEPProgressBodySchema = {
  type: 'object' as const,
  required: ['value'],
  properties: {
    value: { type: 'number', minimum: 0, maximum: 100 },
    notes: { type: 'string' },
    recordedAt: { type: 'string', format: 'date-time' },
  },
};

const logContactBodySchema = {
  type: 'object' as const,
  required: ['contactType', 'notes'],
  properties: {
    contactType: { type: 'string', enum: ['conference', 'email', 'phone', 'note'] },
    notes: { type: 'string' },
    contactDate: { type: 'string', format: 'date-time' },
  },
};

// =====================
// Route Handlers
// =====================

interface ClassParams {
  classId: string;
}

interface StudentParams {
  studentId: string;
}

interface GoalParams {
  goalId: string;
}

interface PeriodQuery {
  period?: TimePeriod;
}

interface SkillMatrixQuery {
  domain?: string;
}

export async function teacherAnalyticsRoutes(fastify: FastifyInstance) {
  /**
   * Get class overview metrics
   */
  fastify.get<{ Params: ClassParams; Querystring: PeriodQuery }>(
    '/classes/:classId/overview',
    {
      schema: {
        params: classIdParamsSchema,
        querystring: periodQuerySchema,
        tags: ['Teacher Analytics'],
        summary: 'Get class overview metrics',
        description:
          'Returns at-a-glance metrics for a class including mastery, engagement, and risk distribution.',
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const { period = 'week' } = request.query;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const result = await teacherAnalyticsService.getClassOverview(classId, teacherId, period);
        return reply.send(result);
      } catch (error) {
        logger.error('Failed to get class overview', { error, classId });
        return reply.status(500).send({ error: 'Failed to get class overview' });
      }
    }
  );

  /**
   * Get student analytics
   */
  fastify.get<{ Params: StudentParams; Querystring: PeriodQuery }>(
    '/students/:studentId',
    {
      schema: {
        params: studentIdParamsSchema,
        querystring: periodQuerySchema,
        tags: ['Teacher Analytics'],
        summary: 'Get detailed student analytics',
        description: 'Returns comprehensive analytics for an individual student.',
      },
    },
    async (request, reply) => {
      const { studentId } = request.params;
      const { period = 'month' } = request.query;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const result = await teacherAnalyticsService.getStudentAnalytics(
          studentId,
          teacherId,
          period
        );
        return reply.send(result);
      } catch (error) {
        logger.error('Failed to get student analytics', { error, studentId });
        return reply.status(500).send({ error: 'Failed to get student analytics' });
      }
    }
  );

  /**
   * Get skill mastery matrix
   */
  fastify.get<{ Params: ClassParams; Querystring: SkillMatrixQuery }>(
    '/classes/:classId/skill-matrix',
    {
      schema: {
        params: classIdParamsSchema,
        querystring: skillMatrixQuerySchema,
        tags: ['Teacher Analytics'],
        summary: 'Get skill mastery matrix',
        description: 'Returns a matrix of student skill mastery levels for visualization.',
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const { domain } = request.query;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const result = await teacherAnalyticsService.getSkillMasteryMatrix(
          classId,
          teacherId,
          domain
        );
        return reply.send(result);
      } catch (error) {
        logger.error('Failed to get skill mastery matrix', { error, classId });
        return reply.status(500).send({ error: 'Failed to get skill mastery matrix' });
      }
    }
  );

  /**
   * Get early warning report
   */
  fastify.get<{ Params: ClassParams }>(
    '/classes/:classId/early-warning',
    {
      schema: {
        params: classIdParamsSchema,
        tags: ['Teacher Analytics'],
        summary: 'Get early warning report',
        description: 'Returns students at risk of falling behind with intervention suggestions.',
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const result = await teacherAnalyticsService.getEarlyWarningReport(classId, teacherId);
        return reply.send(result);
      } catch (error) {
        logger.error('Failed to get early warning report', { error, classId });
        return reply.status(500).send({ error: 'Failed to get early warning report' });
      }
    }
  );

  /**
   * Get IEP progress report
   */
  fastify.get<{ Params: ClassParams }>(
    '/classes/:classId/iep-progress',
    {
      schema: {
        params: classIdParamsSchema,
        tags: ['Teacher Analytics'],
        summary: 'Get IEP progress report',
        description: 'Returns IEP goal progress for all students with IEPs in the class.',
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const result = await teacherAnalyticsService.getIEPProgressReport(classId, teacherId);
        return reply.send(result);
      } catch (error) {
        logger.error('Failed to get IEP progress report', { error, classId });
        return reply.status(500).send({ error: 'Failed to get IEP progress report' });
      }
    }
  );

  /**
   * Get engagement analytics
   */
  fastify.get<{ Params: ClassParams; Querystring: PeriodQuery }>(
    '/classes/:classId/engagement',
    {
      schema: {
        params: classIdParamsSchema,
        querystring: periodQuerySchema,
        tags: ['Teacher Analytics'],
        summary: 'Get engagement analytics',
        description: 'Returns engagement metrics and distribution for a class.',
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const { period = 'week' } = request.query;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const result = await teacherAnalyticsService.getEngagementAnalytics(
          classId,
          teacherId,
          period
        );
        return reply.send(result);
      } catch (error) {
        logger.error('Failed to get engagement analytics', { error, classId });
        return reply.status(500).send({ error: 'Failed to get engagement analytics' });
      }
    }
  );

  /**
   * Get trend data
   */
  fastify.get<{
    Params: ClassParams & { metric: string };
    Querystring: PeriodQuery & { granularity?: string };
  }>(
    '/classes/:classId/trends/:metric',
    {
      schema: {
        params: {
          type: 'object',
          required: ['classId', 'metric'],
          properties: {
            classId: { type: 'string' },
            metric: { type: 'string', enum: ['mastery', 'engagement', 'time'] },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
            granularity: { type: 'string', enum: ['day', 'week', 'month'] },
          },
        },
        tags: ['Teacher Analytics'],
        summary: 'Get trend data',
        description: 'Returns historical trend data for a specific metric.',
      },
    },
    async (request, reply) => {
      const { classId, metric } = request.params;
      const { period = 'month' } = request.query;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        // Get overview which includes trends
        const overview = await teacherAnalyticsService.getClassOverview(classId, teacherId, period);
        const trendData = metric === 'mastery' ? overview.masteryTrend : overview.engagementTrend;
        return reply.send(trendData.dataPoints);
      } catch (error) {
        logger.error('Failed to get trend data', { error, classId, metric });
        return reply.status(500).send({ error: 'Failed to get trend data' });
      }
    }
  );

  /**
   * Generate exportable report
   */
  fastify.post<{
    Params: ClassParams;
    Body: {
      reportType: string;
      format: string;
      studentIds?: string[];
      period?: TimePeriod;
      includeCharts?: boolean;
    };
  }>(
    '/classes/:classId/reports',
    {
      schema: {
        params: classIdParamsSchema,
        body: generateReportBodySchema,
        tags: ['Teacher Analytics'],
        summary: 'Generate exportable report',
        description: 'Generates a downloadable report in the specified format.',
      },
    },
    async (request, reply) => {
      const { classId } = request.params;
      const { reportType, format } = request.body;

      // Mock implementation - would generate actual report
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return reply.send({
        downloadUrl: `/api/analytics/reports/download/${reportId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }
  );

  /**
   * Log IEP goal progress
   */
  fastify.post<{
    Params: GoalParams;
    Body: { value: number; notes?: string; recordedAt?: string };
  }>(
    '/iep/goals/:goalId/progress',
    {
      schema: {
        params: {
          type: 'object',
          required: ['goalId'],
          properties: { goalId: { type: 'string' } },
        },
        body: logIEPProgressBodySchema,
        tags: ['Teacher Analytics'],
        summary: 'Log IEP goal progress',
        description: 'Records progress toward an IEP goal.',
      },
    },
    async (request, reply) => {
      const { goalId } = request.params;
      const { value, notes, recordedAt } = request.body;

      // Mock implementation - would save to database
      logger.info('IEP progress logged', { goalId, value, notes });

      return reply.status(201).send({ success: true });
    }
  );

  /**
   * Log teacher contact with student
   */
  fastify.post<{
    Params: StudentParams;
    Body: { contactType: string; notes: string; contactDate?: string };
  }>(
    '/students/:studentId/contacts',
    {
      schema: {
        params: studentIdParamsSchema,
        body: logContactBodySchema,
        tags: ['Teacher Analytics'],
        summary: 'Log teacher contact',
        description: 'Records a teacher contact with a student.',
      },
    },
    async (request, reply) => {
      const { studentId } = request.params;
      const { contactType, notes, contactDate } = request.body;

      // Mock implementation - would save to database
      logger.info('Teacher contact logged', { studentId, contactType });

      return reply.status(201).send({ success: true });
    }
  );

  /**
   * Compare multiple classes
   */
  fastify.post<{
    Body: { classIds: string[]; period: TimePeriod };
  }>(
    '/compare',
    {
      schema: {
        body: {
          type: 'object',
          required: ['classIds'],
          properties: {
            classIds: { type: 'array', items: { type: 'string' } },
            period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
          },
        },
        tags: ['Teacher Analytics'],
        summary: 'Compare multiple classes',
        description: 'Returns comparison analytics across multiple classes.',
      },
    },
    async (request, reply) => {
      const { classIds, period = 'month' } = request.body;
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const comparisons = await Promise.all(
          classIds.map((classId) =>
            teacherAnalyticsService.getClassOverview(classId, teacherId, period)
          )
        );

        return reply.send({
          classes: comparisons.map((metrics, index) => ({
            classId: classIds[index],
            className: metrics.className,
            averageMastery: metrics.averageMastery,
            averageEngagement: metrics.averageEngagement,
            totalStudents: metrics.totalStudents,
            activeStudents: metrics.activeStudents,
            atRiskCount: metrics.riskDistribution.atRisk + metrics.riskDistribution.critical,
          })),
          aggregated: {
            totalStudents: comparisons.reduce((sum, m) => sum + m.totalStudents, 0),
            averageMastery:
              comparisons.reduce((sum, m) => sum + m.averageMastery, 0) / comparisons.length,
            averageEngagement:
              comparisons.reduce((sum, m) => sum + m.averageEngagement, 0) / comparisons.length,
          },
        });
      } catch (error) {
        logger.error('Failed to compare classes', { error, classIds });
        return reply.status(500).send({ error: 'Failed to compare classes' });
      }
    }
  );
}

export default teacherAnalyticsRoutes;
