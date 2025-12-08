import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import {
  type ParentHomeworkSummary,
  type ParentFocusSummary,
  getIndependenceLabel,
  getIndependenceLabelText,
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
  learnerId?: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

/**
 * Generate a focus summary text based on metrics.
 */
function generateFocusSummaryText(
  avgBreaks: number,
  avgDuration: number,
  totalSessions: number
): string {
  if (totalSessions === 0) {
    return 'No learning sessions recorded yet.';
  }

  const parts: string[] = [];

  // Duration interpretation
  if (avgDuration < 10) {
    parts.push('Sessions are typically short.');
  } else if (avgDuration < 25) {
    parts.push('Session lengths look healthy.');
  } else {
    parts.push('Sessions tend to run longer.');
  }

  // Break interpretation
  if (avgBreaks < 0.5) {
    parts.push('Focus breaks are rarely needed.');
  } else if (avgBreaks < 1.5) {
    parts.push('Occasional breaks help maintain focus.');
  } else {
    parts.push('Regular breaks are being used to support focus.');
  }

  // Positive framing
  if (avgBreaks < 1 && avgDuration >= 10 && avgDuration <= 30) {
    parts.push('Short, focused sessions seem to work well.');
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const parentAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/parents/:parentId/learners/:learnerId/homework-summary
   * 
   * Returns simplified homework metrics for parent dashboard.
   * RBAC: Parent can only access their own children's data.
   */
  app.get<{
    Params: { parentId: string; learnerId: string };
    Querystring: { days?: string };
  }>('/parents/:parentId/learners/:learnerId/homework-summary', async (request, reply) => {
    const user = getUser(request);
    const { parentId, learnerId } = request.params;
    
    // RBAC: Verify parent owns this request
    if (user.sub !== parentId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const { days } = queryParamsSchema.parse(request.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get homework submissions for this learner
    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        learnerId,
        tenantId: user.tenantId,
        createdAt: { gte: startDate },
      },
      include: {
        steps: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate metrics
    const totalSessions = submissions.length;
    const weeksInPeriod = days / 7;
    const homeworkSessionsPerWeek = totalSessions > 0 
      ? Math.round((totalSessions / weeksInPeriod) * 10) / 10 
      : 0;

    // Calculate average steps per homework
    const totalSteps = submissions.reduce((sum: number, s: { stepsCompleted: number }) => sum + s.stepsCompleted, 0);
    const avgStepsPerHomework = totalSessions > 0 
      ? Math.round((totalSteps / totalSessions) * 10) / 10 
      : 0;

    // Calculate independence score
    let independentSteps = 0;
    let totalCompletedSteps = 0;

    for (const submission of submissions) {
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

    // Get last homework date
    const lastHomeworkDate = submissions.length > 0 
      ? submissions[0].createdAt.toISOString() 
      : null;

    const response: ParentHomeworkSummary = {
      learnerId,
      homeworkSessionsPerWeek,
      avgStepsPerHomework,
      independenceScore,
      independenceLabel,
      independenceLabelText: getIndependenceLabelText(independenceLabel),
      lastHomeworkDate,
      totalHomeworkSessions: totalSessions,
    };

    return response;
  });

  /**
   * GET /analytics/parents/:parentId/learners/:learnerId/focus-summary
   * 
   * Returns simplified focus metrics for parent dashboard.
   * RBAC: Parent can only access their own children's data.
   */
  app.get<{
    Params: { parentId: string; learnerId: string };
    Querystring: { days?: string };
  }>('/parents/:parentId/learners/:learnerId/focus-summary', async (request, reply) => {
    const user = getUser(request);
    const { parentId, learnerId } = request.params;
    
    // RBAC: Verify parent owns this request
    if (user.sub !== parentId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const { days } = queryParamsSchema.parse(request.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get sessions for this learner
    const sessions = await prisma.session.findMany({
      where: {
        learnerId,
        tenantId: user.tenantId,
        startedAt: { gte: startDate },
        endedAt: { not: null }, // Only completed sessions
      },
      include: {
        events: {
          where: {
            eventType: {
              in: ['FOCUS_BREAK_STARTED', 'FOCUS_BREAK_ENDED', 'FOCUS_LOSS_DETECTED'],
            },
          },
        },
      },
    });

    const totalSessions = sessions.length;

    // Calculate average focus breaks per session
    let totalBreaks = 0;
    let totalDurationMs = 0;

    for (const session of sessions) {
      const breakEvents = session.events.filter((e: { eventType: string }) => e.eventType === 'FOCUS_BREAK_STARTED');
      totalBreaks += breakEvents.length;
      totalDurationMs += session.durationMs ?? 0;
    }

    const avgFocusBreaksPerSession = totalSessions > 0 
      ? Math.round((totalBreaks / totalSessions) * 10) / 10 
      : 0;

    const avgSessionDurationMinutes = totalSessions > 0 
      ? Math.round((totalDurationMs / totalSessions / 60000) * 10) / 10 
      : 0;

    const summary = generateFocusSummaryText(
      avgFocusBreaksPerSession,
      avgSessionDurationMinutes,
      totalSessions
    );

    const response: ParentFocusSummary = {
      learnerId,
      avgFocusBreaksPerSession,
      avgSessionDurationMinutes,
      totalSessions,
      summary,
    };

    return response;
  });
};
