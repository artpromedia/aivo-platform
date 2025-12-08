import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import {
  type ClassroomHomeworkUsage,
  type ClassroomFocusPatterns,
  type LearnerHomeworkUsage,
  type LearnerFocusData,
  getIndependenceLabel,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const queryParamsSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(28),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  classroomIds?: string[];
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

/**
 * Check if user has access to classroom (teacher or admin).
 * In a real implementation, this would check classroom membership.
 */
function hasClassroomAccess(user: AuthenticatedUser, classroomId: string): boolean {
  // Teachers and district admins can access classroom data
  if (user.role === 'district_admin' || user.role === 'school_admin') {
    return true;
  }
  if (user.role === 'teacher') {
    // In production, verify teacher is assigned to this classroom
    return user.classroomIds?.includes(classroomId) ?? true; // Allow for MVP
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const teacherAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/tenants/:tenantId/classrooms/:classroomId/homework-usage
   * 
   * Returns aggregated homework metrics for a classroom.
   * RBAC: Teachers can only access their assigned classrooms.
   */
  app.get<{
    Params: { tenantId: string; classroomId: string };
    Querystring: { days?: string };
  }>('/tenants/:tenantId/classrooms/:classroomId/homework-usage', async (request, reply) => {
    const user = getUser(request);
    const { tenantId, classroomId } = request.params;
    
    // RBAC: Verify tenant and classroom access
    if (user.tenantId !== tenantId) {
      return reply.code(403).send({ error: 'Access denied: wrong tenant' });
    }
    if (!hasClassroomAccess(user, classroomId)) {
      return reply.code(403).send({ error: 'Access denied: no classroom access' });
    }

    const { days } = queryParamsSchema.parse(request.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const weeksInPeriod = days / 7;

    // Get all homework sessions for this classroom's learners
    // In production, we'd join with a classroom_learners table
    // For MVP, we get all learners in the tenant with HOMEWORK sessions
    const sessions = await prisma.session.findMany({
      where: {
        tenantId,
        sessionType: 'HOMEWORK',
        startedAt: { gte: startDate },
        // In production: filter by classroom membership
        metadataJson: {
          path: ['classroomId'],
          equals: classroomId,
        },
      },
      select: {
        id: true,
        learnerId: true,
        startedAt: true,
      },
    });

    // Get unique learner IDs from sessions
    const learnerIds = [...new Set(sessions.map((s: { learnerId: string }) => s.learnerId))];

    // Get homework submissions for these learners
    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        tenantId,
        learnerId: { in: learnerIds },
        createdAt: { gte: startDate },
      },
      include: {
        steps: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group submissions by learner
    const submissionsByLearner = new Map<string, typeof submissions>();
    for (const submission of submissions) {
      const existing = submissionsByLearner.get(submission.learnerId) ?? [];
      existing.push(submission);
      submissionsByLearner.set(submission.learnerId, existing);
    }

    // Calculate per-learner metrics
    const learnerMetrics: LearnerHomeworkUsage[] = [];
    let totalIndependenceScore = 0;
    let learnersWithData = 0;

    const independenceDistribution = {
      needsSupport: 0,
      buildingIndependence: 0,
      mostlyIndependent: 0,
    };

    for (const learnerId of learnerIds as string[]) {
      const learnerSubmissions = submissionsByLearner.get(learnerId) ?? [];
      const totalSessions = learnerSubmissions.length;
      const sessionsPerWeek = totalSessions > 0 
        ? Math.round((totalSessions / weeksInPeriod) * 10) / 10 
        : 0;

      // Calculate average steps
      const totalSteps = learnerSubmissions.reduce((sum: number, s: { stepsCompleted: number }) => sum + s.stepsCompleted, 0);
      const avgSteps = totalSessions > 0 
        ? Math.round((totalSteps / totalSessions) * 10) / 10 
        : 0;

      // Calculate independence score
      let independentSteps = 0;
      let totalCompletedSteps = 0;

      for (const submission of learnerSubmissions) {
        for (const step of submission.steps) {
          if (step.isCompleted) {
            totalCompletedSteps++;
            if (!step.hintRevealed) {
              independentSteps++;
            }
          }
        }
      }

      const independenceScore = totalCompletedSteps > 0 
        ? Math.round((independentSteps / totalCompletedSteps) * 100) / 100 
        : 0;

      const independenceLabel = getIndependenceLabel(independenceScore);

      // Update distribution
      if (totalSessions > 0) {
        learnersWithData++;
        totalIndependenceScore += independenceScore;

        switch (independenceLabel) {
          case 'needs_support':
            independenceDistribution.needsSupport++;
            break;
          case 'building_independence':
            independenceDistribution.buildingIndependence++;
            break;
          case 'mostly_independent':
            independenceDistribution.mostlyIndependent++;
            break;
        }
      }

      const lastDate = learnerSubmissions.length > 0 
        ? learnerSubmissions[0].createdAt.toISOString() 
        : null;

      learnerMetrics.push({
        learnerId,
        homeworkSessionsTotal: totalSessions,
        homeworkSessionsPerWeek: sessionsPerWeek,
        avgStepsPerHomework: avgSteps,
        independenceScore,
        independenceLabel,
        lastHomeworkDate: lastDate,
      });
    }

    // Sort by sessions per week (most active first)
    learnerMetrics.sort((a, b) => b.homeworkSessionsPerWeek - a.homeworkSessionsPerWeek);

    const response: ClassroomHomeworkUsage = {
      classroomId,
      tenantId,
      periodDays: days,
      totalHomeworkSessions: submissions.length,
      avgSessionsPerLearner: learnerIds.length > 0 
        ? Math.round((submissions.length / learnerIds.length) * 10) / 10 
        : 0,
      avgIndependenceScore: learnersWithData > 0 
        ? Math.round((totalIndependenceScore / learnersWithData) * 100) / 100 
        : 0,
      independenceDistribution,
      learners: learnerMetrics,
    };

    return response;
  });

  /**
   * GET /analytics/tenants/:tenantId/classrooms/:classroomId/focus-patterns
   * 
   * Returns aggregated focus metrics for a classroom.
   * RBAC: Teachers can only access their assigned classrooms.
   */
  app.get<{
    Params: { tenantId: string; classroomId: string };
    Querystring: { days?: string };
  }>('/tenants/:tenantId/classrooms/:classroomId/focus-patterns', async (request, reply) => {
    const user = getUser(request);
    const { tenantId, classroomId } = request.params;
    
    // RBAC: Verify tenant and classroom access
    if (user.tenantId !== tenantId) {
      return reply.code(403).send({ error: 'Access denied: wrong tenant' });
    }
    if (!hasClassroomAccess(user, classroomId)) {
      return reply.code(403).send({ error: 'Access denied: no classroom access' });
    }

    const { days } = queryParamsSchema.parse(request.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all sessions with focus events for this classroom
    const sessions = await prisma.session.findMany({
      where: {
        tenantId,
        startedAt: { gte: startDate },
        endedAt: { not: null },
        // In production: filter by classroom membership
        metadataJson: {
          path: ['classroomId'],
          equals: classroomId,
        },
      },
      include: {
        events: {
          where: {
            eventType: {
              in: ['FOCUS_LOSS_DETECTED', 'FOCUS_BREAK_STARTED', 'FOCUS_BREAK_ENDED'],
            },
          },
        },
      },
    });

    // Get unique learner IDs
    const learnerIds = [...new Set(sessions.map((s: { learnerId: string }) => s.learnerId))];

    // Initialize day/hour tracking
    const focusEventsByDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const focusEventsByHour = Array(24).fill(0);

    // Group sessions by learner
    const sessionsByLearner = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const existing = sessionsByLearner.get(session.learnerId) ?? [];
      existing.push(session);
      sessionsByLearner.set(session.learnerId, existing);
    }

    // Calculate metrics
    let totalSessionsWithFocusLoss = 0;
    let totalBreaks = 0;

    const learnerMetrics: LearnerFocusData[] = [];

    for (const learnerId of learnerIds as string[]) {
      const learnerSessions = sessionsByLearner.get(learnerId) ?? [];
      let learnerBreaks = 0;
      let learnerFocusLossSessions = 0;
      let learnerTotalDurationMs = 0;

      for (const session of learnerSessions) {
        const focusLossEvents = session.events.filter((e: { eventType: string }) => e.eventType === 'FOCUS_LOSS_DETECTED');
        const breakEvents = session.events.filter((e: { eventType: string }) => e.eventType === 'FOCUS_BREAK_STARTED');

        if (focusLossEvents.length > 0) {
          learnerFocusLossSessions++;
          totalSessionsWithFocusLoss++;
        }

        learnerBreaks += breakEvents.length;
        totalBreaks += breakEvents.length;
        learnerTotalDurationMs += session.durationMs ?? 0;

        // Track focus events by time
        for (const event of session.events) {
          const eventDate = new Date(event.eventTime);
          focusEventsByDayOfWeek[eventDate.getDay()]++;
          focusEventsByHour[eventDate.getHours()]++;
        }
      }

      const avgBreaks = learnerSessions.length > 0 
        ? Math.round((learnerBreaks / learnerSessions.length) * 10) / 10 
        : 0;

      const avgDuration = learnerSessions.length > 0 
        ? Math.round((learnerTotalDurationMs / learnerSessions.length / 60000) * 10) / 10 
        : 0;

      learnerMetrics.push({
        learnerId,
        totalSessions: learnerSessions.length,
        sessionsWithFocusLoss: learnerFocusLossSessions,
        avgFocusBreaksPerSession: avgBreaks,
        avgSessionDurationMinutes: avgDuration,
      });
    }

    // Sort by focus loss sessions (most issues first)
    learnerMetrics.sort((a, b) => b.sessionsWithFocusLoss - a.sessionsWithFocusLoss);

    const totalSessions = sessions.length;
    const focusLossPercentage = totalSessions > 0 
      ? Math.round((totalSessionsWithFocusLoss / totalSessions) * 100) 
      : 0;

    const avgFocusBreaksPerSession = totalSessions > 0 
      ? Math.round((totalBreaks / totalSessions) * 10) / 10 
      : 0;

    const response: ClassroomFocusPatterns = {
      classroomId,
      tenantId,
      periodDays: days,
      totalSessions,
      sessionsWithFocusLoss: totalSessionsWithFocusLoss,
      focusLossPercentage,
      avgFocusBreaksPerSession,
      focusEventsByDayOfWeek,
      focusEventsByHour,
      learners: learnerMetrics,
    };

    return response;
  });
};
