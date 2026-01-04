/**
 * Parent Monitoring Routes for Homework Helper
 * Provides endpoints for parents to monitor their children's homework activity
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const summaryPeriodSchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('week'),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  linkedStudentIds?: string[];
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function isParentRole(role: string): boolean {
  return ['PARENT', 'GUARDIAN', 'parent', 'guardian'].includes(role);
}

function canAccessStudent(user: AuthenticatedUser, studentId: string): boolean {
  // Parents can access their linked students
  if (isParentRole(user.role)) {
    return user.linkedStudentIds?.includes(studentId) ?? false;
  }
  // Teachers and admins can access any student in their tenant
  return ['TEACHER', 'ADMIN', 'DISTRICT_ADMIN', 'teacher', 'admin'].includes(user.role);
}

function getDateRange(startDate?: string, endDate?: string, defaultDays = 7): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);

  return { start, end };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerParentRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /parent/students/:studentId/homework
   * Get homework history for a specific student (parent view)
   */
  app.get<{ Params: { studentId: string }; Querystring: z.infer<typeof dateRangeSchema> }>(
    '/students/:studentId/homework',
    async (request, reply) => {
      const user = getUser(request);
      const { studentId } = request.params;

      // Verify parent has access to this student
      if (!canAccessStudent(user, studentId)) {
        return reply.code(403).send({ error: 'Access denied to this student' });
      }

      const query = dateRangeSchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters', details: query.error.issues });
      }

      const { startDate, endDate, limit, offset } = query.data;
      const { start, end } = getDateRange(startDate, endDate, 30);

      const submissions = await prisma.homeworkSubmission.findMany({
        where: {
          tenantId: user.tenantId,
          learnerId: studentId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          steps: {
            select: {
              id: true,
              stepOrder: true,
              isStarted: true,
              isCompleted: true,
              hintRevealed: true,
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
      });

      const total = await prisma.homeworkSubmission.count({
        where: {
          tenantId: user.tenantId,
          learnerId: studentId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      });

      return reply.send({
        submissions: submissions.map((s) => ({
          id: s.id,
          subject: s.subject,
          gradeBand: s.gradeBand,
          status: s.status,
          stepCount: s.stepCount,
          stepsCompleted: s.stepsCompleted,
          completionRate: s.stepCount > 0 ? (s.stepsCompleted / s.stepCount) * 100 : 0,
          hintsUsed: s.steps.filter((step) => step.hintRevealed).length,
          createdAt: s.createdAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    }
  );

  /**
   * GET /parent/students/:studentId/homework/:homeworkId
   * Get detailed view of a specific homework session
   */
  app.get<{ Params: { studentId: string; homeworkId: string } }>(
    '/students/:studentId/homework/:homeworkId',
    async (request, reply) => {
      const user = getUser(request);
      const { studentId, homeworkId } = request.params;

      if (!canAccessStudent(user, studentId)) {
        return reply.code(403).send({ error: 'Access denied to this student' });
      }

      const submission = await prisma.homeworkSubmission.findFirst({
        where: {
          id: homeworkId,
          tenantId: user.tenantId,
          learnerId: studentId,
        },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              responses: {
                orderBy: { createdAt: 'asc' },
                select: {
                  id: true,
                  responseText: true,
                  isCorrect: true,
                  createdAt: true,
                  // Note: We don't expose aiFeedback to parents to maintain scaffolding approach
                },
              },
            },
          },
        },
      });

      if (!submission) {
        return reply.code(404).send({ error: 'Homework submission not found' });
      }

      // Calculate engagement metrics
      const totalResponses = submission.steps.reduce((sum, step) => sum + step.responses.length, 0);
      const correctResponses = submission.steps.reduce(
        (sum, step) => sum + step.responses.filter((r) => r.isCorrect === true).length,
        0
      );
      const hintsUsed = submission.steps.filter((step) => step.hintRevealed).length;

      // Calculate time spent (if we have response timestamps)
      let estimatedMinutes = 0;
      for (const step of submission.steps) {
        if (step.responses.length >= 2) {
          const firstResponse = step.responses[0].createdAt;
          const lastResponse = step.responses[step.responses.length - 1].createdAt;
          estimatedMinutes += (lastResponse.getTime() - firstResponse.getTime()) / 60000;
        } else if (step.responses.length === 1) {
          estimatedMinutes += 2; // Assume 2 minutes per single response
        }
      }

      return reply.send({
        submission: {
          id: submission.id,
          subject: submission.subject,
          gradeBand: submission.gradeBand,
          status: submission.status,
          createdAt: submission.createdAt,
          // Don't expose the raw problem text to maintain student privacy on what they're working on
        },
        progress: {
          stepCount: submission.stepCount,
          stepsCompleted: submission.stepsCompleted,
          completionRate: submission.stepCount > 0 ? (submission.stepsCompleted / submission.stepCount) * 100 : 0,
          stepsStarted: submission.steps.filter((s) => s.isStarted).length,
        },
        engagement: {
          totalResponses,
          correctResponses,
          successRate: totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0,
          hintsUsed,
          hintRate: submission.stepCount > 0 ? (hintsUsed / submission.stepCount) * 100 : 0,
          estimatedMinutes: Math.round(estimatedMinutes),
        },
        steps: submission.steps.map((step) => ({
          stepOrder: step.stepOrder,
          isStarted: step.isStarted,
          isCompleted: step.isCompleted,
          hintUsed: step.hintRevealed,
          attemptCount: step.responses.length,
          // Show whether the step was eventually solved correctly
          wasSuccessful: step.responses.some((r) => r.isCorrect === true),
        })),
      });
    }
  );

  /**
   * GET /parent/students/:studentId/homework/summary
   * Get aggregated homework summary for a student
   */
  app.get<{ Params: { studentId: string }; Querystring: z.infer<typeof summaryPeriodSchema> }>(
    '/students/:studentId/homework/summary',
    async (request, reply) => {
      const user = getUser(request);
      const { studentId } = request.params;

      if (!canAccessStudent(user, studentId)) {
        return reply.code(403).send({ error: 'Access denied to this student' });
      }

      const query = summaryPeriodSchema.safeParse(request.query);
      const period = query.success ? query.data.period : 'week';

      const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : 30;
      const { start, end } = getDateRange(undefined, undefined, periodDays);

      // Get all submissions in the period
      const submissions = await prisma.homeworkSubmission.findMany({
        where: {
          tenantId: user.tenantId,
          learnerId: studentId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          steps: {
            select: {
              isCompleted: true,
              hintRevealed: true,
              responses: {
                select: {
                  isCorrect: true,
                },
              },
            },
          },
        },
      });

      // Calculate summary statistics
      const totalSessions = submissions.length;
      const completedSessions = submissions.filter((s) => s.status === 'COMPLETED').length;
      const totalSteps = submissions.reduce((sum, s) => sum + s.stepCount, 0);
      const completedSteps = submissions.reduce((sum, s) => sum + s.stepsCompleted, 0);
      const totalHintsUsed = submissions.reduce(
        (sum, s) => sum + s.steps.filter((step) => step.hintRevealed).length,
        0
      );
      const totalResponses = submissions.reduce(
        (sum, s) => sum + s.steps.reduce((stepSum, step) => stepSum + step.responses.length, 0),
        0
      );
      const correctResponses = submissions.reduce(
        (sum, s) =>
          sum +
          s.steps.reduce(
            (stepSum, step) => stepSum + step.responses.filter((r) => r.isCorrect === true).length,
            0
          ),
        0
      );

      // Subject breakdown
      const subjectBreakdown = submissions.reduce(
        (acc, s) => {
          const subject = s.subject;
          if (!acc[subject]) {
            acc[subject] = { count: 0, completed: 0, completionRate: 0 };
          }
          acc[subject].count++;
          if (s.status === 'COMPLETED') {
            acc[subject].completed++;
          }
          return acc;
        },
        {} as Record<string, { count: number; completed: number; completionRate: number }>
      );

      // Calculate completion rates for each subject
      for (const subject of Object.keys(subjectBreakdown)) {
        const data = subjectBreakdown[subject];
        data.completionRate = data.count > 0 ? (data.completed / data.count) * 100 : 0;
      }

      // Daily activity (for charts)
      const dailyActivity = submissions.reduce(
        (acc, s) => {
          const dateKey = s.createdAt.toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = { sessions: 0, stepsCompleted: 0 };
          }
          acc[dateKey].sessions++;
          acc[dateKey].stepsCompleted += s.stepsCompleted;
          return acc;
        },
        {} as Record<string, { sessions: number; stepsCompleted: number }>
      );

      // Identify areas needing attention (high hint usage or low success rate)
      const areasNeedingAttention: string[] = [];

      for (const subject of Object.keys(subjectBreakdown)) {
        const subjectSubmissions = submissions.filter((s) => s.subject === subject);
        const subjectHints = subjectSubmissions.reduce(
          (sum, s) => sum + s.steps.filter((step) => step.hintRevealed).length,
          0
        );
        const subjectSteps = subjectSubmissions.reduce((sum, s) => sum + s.stepCount, 0);

        if (subjectSteps > 0 && subjectHints / subjectSteps > 0.5) {
          areasNeedingAttention.push(`${subject}: High hint usage (${Math.round((subjectHints / subjectSteps) * 100)}%)`);
        }

        if (subjectBreakdown[subject].completionRate < 50 && subjectBreakdown[subject].count >= 2) {
          areasNeedingAttention.push(`${subject}: Low completion rate (${Math.round(subjectBreakdown[subject].completionRate)}%)`);
        }
      }

      return reply.send({
        period: {
          type: period,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        overview: {
          totalSessions,
          completedSessions,
          sessionCompletionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
          totalSteps,
          completedSteps,
          stepCompletionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
          averageSessionLength: totalSessions > 0 ? Math.round(totalSteps / totalSessions) : 0,
        },
        engagement: {
          totalResponses,
          correctResponses,
          successRate: totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0,
          totalHintsUsed,
          hintUsageRate: totalSteps > 0 ? (totalHintsUsed / totalSteps) * 100 : 0,
        },
        subjectBreakdown: Object.entries(subjectBreakdown).map(([subject, data]) => ({
          subject,
          ...data,
        })),
        dailyActivity: Object.entries(dailyActivity)
          .map(([date, data]) => ({
            date,
            ...data,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        areasNeedingAttention,
        recommendations: generateRecommendations({
          completionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
          hintUsageRate: totalSteps > 0 ? (totalHintsUsed / totalSteps) * 100 : 0,
          successRate: totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0,
          sessionsPerPeriod: totalSessions,
        }),
      });
    }
  );

  /**
   * GET /parent/students/:studentId/homework/trends
   * Get trend data comparing current period to previous period
   */
  app.get<{ Params: { studentId: string } }>(
    '/students/:studentId/homework/trends',
    async (request, reply) => {
      const user = getUser(request);
      const { studentId } = request.params;

      if (!canAccessStudent(user, studentId)) {
        return reply.code(403).send({ error: 'Access denied to this student' });
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Current week stats
      const currentWeek = await prisma.homeworkSubmission.aggregate({
        where: {
          tenantId: user.tenantId,
          learnerId: studentId,
          createdAt: {
            gte: weekAgo,
            lte: now,
          },
        },
        _count: { id: true },
        _sum: { stepsCompleted: true, stepCount: true },
      });

      // Previous week stats
      const previousWeek = await prisma.homeworkSubmission.aggregate({
        where: {
          tenantId: user.tenantId,
          learnerId: studentId,
          createdAt: {
            gte: twoWeeksAgo,
            lt: weekAgo,
          },
        },
        _count: { id: true },
        _sum: { stepsCompleted: true, stepCount: true },
      });

      const currentSessions = currentWeek._count.id || 0;
      const previousSessions = previousWeek._count.id || 0;
      const currentCompleted = currentWeek._sum.stepsCompleted || 0;
      const currentTotal = currentWeek._sum.stepCount || 0;
      const previousCompleted = previousWeek._sum.stepsCompleted || 0;
      const previousTotal = previousWeek._sum.stepCount || 0;

      const currentCompletionRate = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;
      const previousCompletionRate = previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0;

      return reply.send({
        currentWeek: {
          sessions: currentSessions,
          stepsCompleted: currentCompleted,
          totalSteps: currentTotal,
          completionRate: currentCompletionRate,
        },
        previousWeek: {
          sessions: previousSessions,
          stepsCompleted: previousCompleted,
          totalSteps: previousTotal,
          completionRate: previousCompletionRate,
        },
        trends: {
          sessionsChange: calculatePercentChange(previousSessions, currentSessions),
          completionRateChange: currentCompletionRate - previousCompletionRate,
          stepsCompletedChange: calculatePercentChange(previousCompleted, currentCompleted),
        },
        interpretation: generateTrendInterpretation({
          sessionsChange: calculatePercentChange(previousSessions, currentSessions),
          completionRateChange: currentCompletionRate - previousCompletionRate,
          currentSessions,
        }),
      });
    }
  );

  /**
   * GET /parent/children/homework/overview
   * Get homework overview for all linked children (multi-child dashboard)
   */
  app.get('/children/homework/overview', async (request, reply) => {
    const user = getUser(request);

    if (!isParentRole(user.role)) {
      return reply.code(403).send({ error: 'This endpoint is for parents only' });
    }

    const linkedStudentIds = user.linkedStudentIds || [];
    if (linkedStudentIds.length === 0) {
      return reply.send({ children: [] });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const childrenOverview = await Promise.all(
      linkedStudentIds.map(async (studentId) => {
        const submissions = await prisma.homeworkSubmission.findMany({
          where: {
            tenantId: user.tenantId,
            learnerId: studentId,
            createdAt: { gte: weekAgo },
          },
          select: {
            id: true,
            subject: true,
            status: true,
            stepCount: true,
            stepsCompleted: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        const totalSessions = submissions.length;
        const completedSessions = submissions.filter((s) => s.status === 'COMPLETED').length;
        const totalSteps = submissions.reduce((sum, s) => sum + s.stepCount, 0);
        const completedSteps = submissions.reduce((sum, s) => sum + s.stepsCompleted, 0);

        return {
          studentId,
          weeklyStats: {
            totalSessions,
            completedSessions,
            completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
            stepsCompleted: completedSteps,
            totalSteps,
          },
          recentActivity: submissions.slice(0, 3).map((s) => ({
            id: s.id,
            subject: s.subject,
            status: s.status,
            progress: s.stepCount > 0 ? (s.stepsCompleted / s.stepCount) * 100 : 0,
            createdAt: s.createdAt,
          })),
          lastActiveAt: submissions[0]?.createdAt || null,
        };
      })
    );

    return reply.send({
      children: childrenOverview,
      weekStartDate: weekAgo.toISOString(),
    });
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function calculatePercentChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function generateRecommendations(stats: {
  completionRate: number;
  hintUsageRate: number;
  successRate: number;
  sessionsPerPeriod: number;
}): string[] {
  const recommendations: string[] = [];

  if (stats.sessionsPerPeriod === 0) {
    recommendations.push('Encourage regular homework practice sessions');
  } else if (stats.sessionsPerPeriod < 3) {
    recommendations.push('Consider increasing homework practice frequency');
  }

  if (stats.completionRate < 50) {
    recommendations.push('Work on completing more homework steps - breaking problems into smaller parts may help');
  } else if (stats.completionRate > 90) {
    recommendations.push('Excellent completion rate! Consider trying more challenging problems');
  }

  if (stats.hintUsageRate > 60) {
    recommendations.push('High hint usage detected - spending more time on initial problem analysis may help build independence');
  }

  if (stats.successRate < 40) {
    recommendations.push('Consider reviewing foundational concepts to improve problem-solving success');
  } else if (stats.successRate > 80) {
    recommendations.push('Great problem-solving skills! Keep up the good work');
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance is on track - continue current study habits');
  }

  return recommendations;
}

function generateTrendInterpretation(trends: {
  sessionsChange: number;
  completionRateChange: number;
  currentSessions: number;
}): string {
  const parts: string[] = [];

  if (trends.currentSessions === 0) {
    return 'No homework activity this week. Encourage your child to use the homework helper!';
  }

  if (trends.sessionsChange > 20) {
    parts.push('Increased homework activity this week');
  } else if (trends.sessionsChange < -20) {
    parts.push('Decreased homework activity compared to last week');
  }

  if (trends.completionRateChange > 10) {
    parts.push('improvement in completion rate');
  } else if (trends.completionRateChange < -10) {
    parts.push('completion rate has decreased');
  }

  if (parts.length === 0) {
    return 'Consistent homework activity compared to last week';
  }

  return parts.join(', with ');
}
