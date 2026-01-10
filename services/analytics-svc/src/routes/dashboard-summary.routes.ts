/**
 * Teacher Dashboard Summary Routes
 *
 * Aggregated API endpoints for the teacher dashboard.
 * Provides summary data for metrics, at-risk students, IEP progress, and activity.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// =====================
// Types
// =====================

interface DashboardSummary {
  stats: {
    totalStudents: number;
    averageMastery: number;
    iepStudents: number;
    atRiskStudents: number;
  };
  classPerformance: ClassPerformance[];
  atRiskStudents: AtRiskStudent[];
  iepProgress: IEPProgressEntry[];
  recentActivity: ActivityItem[];
  upcomingItems: UpcomingItem[];
}

interface ClassPerformance {
  id: string;
  name: string;
  mastery: number;
  engagement: number;
  students: number;
  trend: 'up' | 'down' | 'stable';
}

interface AtRiskStudent {
  id: string;
  name: string;
  className: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
  suggestedInterventions: string[];
  lastActivity: string;
}

interface IEPProgressEntry {
  studentId: string;
  studentName: string;
  goalArea: string;
  currentProgress: number;
  targetProgress: number;
  status: 'on-track' | 'at-risk' | 'exceeded';
  nextReviewDate: string;
}

interface ActivityItem {
  id: string;
  type: 'submission' | 'grade' | 'message' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  studentId?: string;
  studentName?: string;
}

interface UpcomingItem {
  id: string;
  type: 'deadline' | 'meeting' | 'review' | 'event';
  title: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

// =====================
// Mock Data Generators
// =====================

function generateMockDashboardSummary(teacherId: string): DashboardSummary {
  return {
    stats: {
      totalStudents: 127,
      averageMastery: 78.5,
      iepStudents: 12,
      atRiskStudents: 8,
    },
    classPerformance: [
      { id: 'class-1', name: 'Algebra I - Period 1', mastery: 82, engagement: 88, students: 28, trend: 'up' },
      { id: 'class-2', name: 'Algebra I - Period 3', mastery: 75, engagement: 79, students: 26, trend: 'stable' },
      { id: 'class-3', name: 'Pre-Algebra - Period 4', mastery: 71, engagement: 85, students: 24, trend: 'down' },
      { id: 'class-4', name: 'Geometry - Period 5', mastery: 85, engagement: 91, students: 27, trend: 'up' },
      { id: 'class-5', name: 'Algebra II - Period 6', mastery: 79, engagement: 76, students: 22, trend: 'stable' },
    ],
    atRiskStudents: [
      {
        id: 'student-1',
        name: 'Alex Johnson',
        className: 'Pre-Algebra - Period 4',
        riskLevel: 'high',
        riskFactors: ['Low engagement (42%)', 'Declining mastery', 'Missing assignments'],
        suggestedInterventions: ['One-on-one tutoring', 'Parent conference', 'Modified assignments'],
        lastActivity: '3 days ago',
      },
      {
        id: 'student-2',
        name: 'Sarah Williams',
        className: 'Algebra I - Period 3',
        riskLevel: 'medium',
        riskFactors: ['Inconsistent attendance', 'Struggling with fractions'],
        suggestedInterventions: ['Fraction remediation', 'Check-in meetings'],
        lastActivity: '1 day ago',
      },
      {
        id: 'student-3',
        name: 'Michael Chen',
        className: 'Geometry - Period 5',
        riskLevel: 'medium',
        riskFactors: ['Low assessment scores', 'Anxiety during tests'],
        suggestedInterventions: ['Extended time', 'Test-taking strategies'],
        lastActivity: 'Today',
      },
    ],
    iepProgress: [
      {
        studentId: 'iep-1',
        studentName: 'Emma Davis',
        goalArea: 'Math Problem Solving',
        currentProgress: 72,
        targetProgress: 80,
        status: 'on-track',
        nextReviewDate: '2026-02-15',
      },
      {
        studentId: 'iep-2',
        studentName: 'James Wilson',
        goalArea: 'Number Fluency',
        currentProgress: 58,
        targetProgress: 75,
        status: 'at-risk',
        nextReviewDate: '2026-02-01',
      },
      {
        studentId: 'iep-3',
        studentName: 'Olivia Brown',
        goalArea: 'Written Expression',
        currentProgress: 85,
        targetProgress: 80,
        status: 'exceeded',
        nextReviewDate: '2026-03-01',
      },
      {
        studentId: 'iep-4',
        studentName: 'Liam Martinez',
        goalArea: 'Self-Regulation',
        currentProgress: 68,
        targetProgress: 70,
        status: 'on-track',
        nextReviewDate: '2026-02-20',
      },
    ],
    recentActivity: [
      {
        id: 'activity-1',
        type: 'submission',
        title: 'New Assignment Submission',
        description: 'Emma Davis submitted "Chapter 5 Quiz"',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        studentId: 'iep-1',
        studentName: 'Emma Davis',
      },
      {
        id: 'activity-2',
        type: 'alert',
        title: 'At-Risk Alert',
        description: 'Alex Johnson has not logged in for 3 days',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        studentId: 'student-1',
        studentName: 'Alex Johnson',
      },
      {
        id: 'activity-3',
        type: 'grade',
        title: 'Assessment Completed',
        description: 'Graded 24 submissions for "Linear Equations Test"',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'activity-4',
        type: 'message',
        title: 'Parent Message',
        description: 'Sarah Williams\' parent requested a meeting',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        studentId: 'student-2',
        studentName: 'Sarah Williams',
      },
    ],
    upcomingItems: [
      {
        id: 'upcoming-1',
        type: 'review',
        title: 'IEP Review: James Wilson',
        date: '2026-02-01',
        priority: 'high',
      },
      {
        id: 'upcoming-2',
        type: 'deadline',
        title: 'Quarter 2 Grades Due',
        date: '2026-01-17',
        priority: 'high',
      },
      {
        id: 'upcoming-3',
        type: 'meeting',
        title: 'Department Meeting',
        date: '2026-01-12',
        priority: 'medium',
      },
      {
        id: 'upcoming-4',
        type: 'event',
        title: 'Math Competition Prep',
        date: '2026-01-20',
        priority: 'low',
      },
    ],
  };
}

// =====================
// Route Schemas
// =====================

const periodQuerySchema = {
  type: 'object' as const,
  properties: {
    period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
  },
};

// =====================
// Routes
// =====================

export async function dashboardSummaryRoutes(fastify: FastifyInstance) {
  /**
   * Get complete dashboard summary
   * Returns aggregated data for the teacher dashboard
   */
  fastify.get<{ Querystring: { period?: string } }>(
    '/summary',
    {
      schema: {
        querystring: periodQuerySchema,
        tags: ['Dashboard'],
        summary: 'Get complete dashboard summary',
        description: 'Returns aggregated metrics, at-risk students, IEP progress, and activity for the teacher dashboard.',
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
            },
          },
        },
      },
    },
    async (request, reply) => {
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const summary = generateMockDashboardSummary(teacherId);
        return reply.send(summary);
      } catch (error) {
        logger.error('Failed to get dashboard summary', { error, teacherId });
        return reply.status(500).send({ error: 'Failed to get dashboard summary' });
      }
    }
  );

  /**
   * Get dashboard stats only
   */
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Get dashboard stats',
        description: 'Returns just the key metrics for the dashboard header.',
      },
    },
    async (request, reply) => {
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const summary = generateMockDashboardSummary(teacherId);
        return reply.send(summary.stats);
      } catch (error) {
        logger.error('Failed to get dashboard stats', { error, teacherId });
        return reply.status(500).send({ error: 'Failed to get dashboard stats' });
      }
    }
  );

  /**
   * Get at-risk students
   */
  fastify.get<{ Querystring: { limit?: number } }>(
    '/at-risk',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
        tags: ['Dashboard'],
        summary: 'Get at-risk students',
        description: 'Returns students who are at risk of falling behind with suggested interventions.',
      },
    },
    async (request, reply) => {
      const teacherId = (request.user as { id: string })?.id || 'anonymous';
      const { limit = 10 } = request.query;

      try {
        const summary = generateMockDashboardSummary(teacherId);
        return reply.send({
          students: summary.atRiskStudents.slice(0, limit),
          total: summary.stats.atRiskStudents,
        });
      } catch (error) {
        logger.error('Failed to get at-risk students', { error, teacherId });
        return reply.status(500).send({ error: 'Failed to get at-risk students' });
      }
    }
  );

  /**
   * Get IEP progress summary
   */
  fastify.get(
    '/iep-progress',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Get IEP progress summary',
        description: 'Returns IEP goal progress for students with IEPs.',
      },
    },
    async (request, reply) => {
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const summary = generateMockDashboardSummary(teacherId);
        const statusCounts = summary.iepProgress.reduce(
          (acc, entry) => {
            acc[entry.status]++;
            return acc;
          },
          { 'on-track': 0, 'at-risk': 0, exceeded: 0 }
        );

        return reply.send({
          entries: summary.iepProgress,
          summary: {
            total: summary.iepProgress.length,
            ...statusCounts,
          },
        });
      } catch (error) {
        logger.error('Failed to get IEP progress', { error, teacherId });
        return reply.status(500).send({ error: 'Failed to get IEP progress' });
      }
    }
  );

  /**
   * Get recent activity
   */
  fastify.get<{ Querystring: { limit?: number; type?: string } }>(
    '/activity',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
            type: { type: 'string', enum: ['submission', 'grade', 'message', 'alert'] },
          },
        },
        tags: ['Dashboard'],
        summary: 'Get recent activity',
        description: 'Returns recent activity feed for the teacher.',
      },
    },
    async (request, reply) => {
      const teacherId = (request.user as { id: string })?.id || 'anonymous';
      const { limit = 20, type } = request.query;

      try {
        const summary = generateMockDashboardSummary(teacherId);
        let activity = summary.recentActivity;

        if (type) {
          activity = activity.filter((item) => item.type === type);
        }

        return reply.send({
          items: activity.slice(0, limit),
          hasMore: activity.length > limit,
        });
      } catch (error) {
        logger.error('Failed to get activity', { error, teacherId });
        return reply.status(500).send({ error: 'Failed to get activity' });
      }
    }
  );

  /**
   * Get upcoming items
   */
  fastify.get<{ Querystring: { days?: number } }>(
    '/upcoming',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'number', default: 14 },
          },
        },
        tags: ['Dashboard'],
        summary: 'Get upcoming items',
        description: 'Returns upcoming deadlines, meetings, and events.',
      },
    },
    async (request, reply) => {
      const teacherId = (request.user as { id: string })?.id || 'anonymous';

      try {
        const summary = generateMockDashboardSummary(teacherId);
        return reply.send({
          items: summary.upcomingItems,
        });
      } catch (error) {
        logger.error('Failed to get upcoming items', { error, teacherId });
        return reply.status(500).send({ error: 'Failed to get upcoming items' });
      }
    }
  );
}

export default dashboardSummaryRoutes;
