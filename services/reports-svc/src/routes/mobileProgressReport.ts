/**
 * Mobile Progress Report Routes
 *
 * API endpoints for mobile app progress reports.
 * Designed for the Flutter mobile apps (learner, parent).
 * 
 * Endpoints:
 * - GET /progress/:learnerId/summary - Get progress summary for a learner
 * - GET /progress/:learnerId/activities - Get recent activities
 * - GET /progress/:learnerId/skills - Get skill-level progress
 * - GET /progress/:learnerId/weekly - Get weekly reports
 * - GET /progress/linked-learners - Get all learners linked to current parent
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  fetchLearnerInfo,
  fetchBaselineProfile,
  fetchVirtualBrain,
  fetchLearnerGoals,
  fetchHomeworkSummary,
  fetchFocusSummary,
} from '../serviceClients.js';
import { canAccessLearnerReport } from '../lib/rbac.js';
import type { AuthenticatedUser } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const learnerIdParamSchema = z.object({
  learnerId: z.string().uuid(),
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const weeklyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(4),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

interface ProgressSummary {
  learnerId: string;
  learnerName: string;
  totalActivitiesCompleted: number;
  totalTimeSpentMinutes: number;
  averageAccuracy: number;
  streakDays: number;
  lastActivityAt: string;
  skillProgress: Record<string, SkillProgress>;
}

interface SkillProgress {
  skillId: string;
  skillName: string;
  masteryLevel: number;
  activitiesCompleted: number;
  totalActivities: number;
  lastPracticedAt: string | null;
}

interface ActivityEntry {
  id: string;
  type: string;
  title: string;
  completedAt: string;
  durationMinutes: number;
  accuracy: number | null;
  skillId: string | null;
}

interface WeeklyReport {
  learnerId: string;
  weekStart: string;
  weekEnd: string;
  activitiesCompleted: number;
  timeSpentMinutes: number;
  averageAccuracy: number;
  skillsImproved: string[];
  areasToFocus: string[];
  teacherNote: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = request.user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function getAuthToken(request: FastifyRequest): string {
  const authHeader = request.headers.authorization;
  return authHeader?.slice(7) || '';
}

/**
 * Calculate streak days from recent activity data
 */
function calculateStreakDays(activities: unknown[]): number {
  // TODO: Implement proper streak calculation from activity timestamps
  // For now, return a placeholder
  return 5;
}

/**
 * Generate skill progress from virtual brain data
 */
function generateSkillProgress(virtualBrain: unknown): Record<string, SkillProgress> {
  // TODO: Implement proper skill progress extraction from virtual brain data
  // For now, return placeholder data
  return {
    'reading': {
      skillId: 'reading',
      skillName: 'Reading Comprehension',
      masteryLevel: 0.75,
      activitiesCompleted: 42,
      totalActivities: 60,
      lastPracticedAt: new Date().toISOString(),
    },
    'math': {
      skillId: 'math',
      skillName: 'Mathematics',
      masteryLevel: 0.68,
      activitiesCompleted: 35,
      totalActivities: 50,
      lastPracticedAt: new Date().toISOString(),
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const mobileProgressReportRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /progress/:learnerId/summary
   * 
   * Get progress summary for a learner
   */
  app.get<{
    Params: { learnerId: string };
  }>(
    '/:learnerId/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);
      const token = getAuthToken(request);

      // Validate params
      const paramsResult = learnerIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid learner ID' });
      }

      const { learnerId } = paramsResult.data;

      // RBAC: Check if user can access this learner's data
      const canAccess = await canAccessLearnerReport(user, learnerId);
      if (!canAccess) {
        return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
      }

      try {
        // Fetch learner info
        const learnerInfo = await fetchLearnerInfo(learnerId, token);

        // Fetch virtual brain for skill progress
        const virtualBrain = await fetchVirtualBrain(learnerId, token);

        // Fetch focus summary for activity data
        const focusSummary = await fetchFocusSummary(learnerId, token);

        // Calculate metrics
        const skillProgress = generateSkillProgress(virtualBrain);
        const streakDays = calculateStreakDays([]);

        const summary: ProgressSummary = {
          learnerId,
          learnerName: `${learnerInfo.firstName} ${learnerInfo.lastName}`,
          totalActivitiesCompleted: focusSummary?.totalSessions || 0,
          totalTimeSpentMinutes: focusSummary?.totalFocusMinutes || 0,
          averageAccuracy: 0.82, // TODO: Calculate from actual data
          streakDays,
          lastActivityAt: new Date().toISOString(),
          skillProgress,
        };

        return reply.send(summary);
      } catch (error) {
        app.log.error({ error, learnerId }, 'Error fetching progress summary');
        return reply.code(500).send({ error: 'Failed to fetch progress summary' });
      }
    }
  );

  /**
   * GET /progress/:learnerId/activities
   * 
   * Get recent activities for a learner
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    '/:learnerId/activities',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);
      const token = getAuthToken(request);

      // Validate params
      const paramsResult = learnerIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid learner ID' });
      }

      const queryResult = paginationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const { learnerId } = paramsResult.data;
      const { limit, offset } = queryResult.data;

      // RBAC: Check if user can access this learner's data
      const canAccess = await canAccessLearnerReport(user, learnerId);
      if (!canAccess) {
        return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
      }

      try {
        // TODO: Fetch actual activity data from session-svc or engagement-svc
        // For now, return placeholder data
        const activities: ActivityEntry[] = [
          {
            id: 'act-1',
            type: 'lesson',
            title: 'Reading Comprehension - Main Idea',
            completedAt: new Date().toISOString(),
            durationMinutes: 15,
            accuracy: 0.85,
            skillId: 'reading',
          },
          {
            id: 'act-2',
            type: 'quiz',
            title: 'Math Practice - Fractions',
            completedAt: new Date(Date.now() - 3600000).toISOString(),
            durationMinutes: 10,
            accuracy: 0.78,
            skillId: 'math',
          },
        ].slice(offset, offset + limit);

        return reply.send({ activities });
      } catch (error) {
        app.log.error({ error, learnerId }, 'Error fetching activities');
        return reply.code(500).send({ error: 'Failed to fetch activities' });
      }
    }
  );

  /**
   * GET /progress/:learnerId/skills
   * 
   * Get skill-level progress for a learner
   */
  app.get<{
    Params: { learnerId: string };
  }>(
    '/:learnerId/skills',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);
      const token = getAuthToken(request);

      // Validate params
      const paramsResult = learnerIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid learner ID' });
      }

      const { learnerId } = paramsResult.data;

      // RBAC: Check if user can access this learner's data
      const canAccess = await canAccessLearnerReport(user, learnerId);
      if (!canAccess) {
        return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
      }

      try {
        // Fetch virtual brain for skill progress
        const virtualBrain = await fetchVirtualBrain(learnerId, token);
        const skillProgress = generateSkillProgress(virtualBrain);

        return reply.send({ skills: Object.values(skillProgress) });
      } catch (error) {
        app.log.error({ error, learnerId }, 'Error fetching skill progress');
        return reply.code(500).send({ error: 'Failed to fetch skill progress' });
      }
    }
  );

  /**
   * GET /progress/:learnerId/weekly
   * 
   * Get weekly reports for a learner
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { limit?: string };
  }>(
    '/:learnerId/weekly',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);
      const token = getAuthToken(request);

      // Validate params
      const paramsResult = learnerIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid learner ID' });
      }

      const queryResult = weeklyQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const { learnerId } = paramsResult.data;
      const { limit } = queryResult.data;

      // RBAC: Check if user can access this learner's data
      const canAccess = await canAccessLearnerReport(user, learnerId);
      if (!canAccess) {
        return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
      }

      try {
        // TODO: Fetch actual weekly report data
        // For now, return placeholder data
        const reports: WeeklyReport[] = [];
        const now = new Date();

        for (let i = 0; i < limit; i++) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          reports.push({
            learnerId,
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            activitiesCompleted: 12 - i * 2,
            timeSpentMinutes: 150 - i * 20,
            averageAccuracy: 0.85 - i * 0.05,
            skillsImproved: ['Reading', 'Math'],
            areasToFocus: ['Writing', 'Science'],
            teacherNote: i === 0 ? 'Great progress this week!' : null,
          });
        }

        return reply.send({ reports });
      } catch (error) {
        app.log.error({ error, learnerId }, 'Error fetching weekly reports');
        return reply.code(500).send({ error: 'Failed to fetch weekly reports' });
      }
    }
  );

  /**
   * GET /progress/linked-learners
   * 
   * Get all learners linked to the current parent
   */
  app.get(
    '/linked-learners',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);
      const token = getAuthToken(request);

      // Ensure user is a parent
      if (user.role !== 'parent') {
        return reply.code(403).send({ error: 'Forbidden: Only parents can access linked learners' });
      }

      try {
        // TODO: Fetch actual linked learners from parent-svc or profile-svc
        // For now, return placeholder data
        const learners: ProgressSummary[] = [
          {
            learnerId: 'learner-1',
            learnerName: 'John Doe',
            totalActivitiesCompleted: 45,
            totalTimeSpentMinutes: 320,
            averageAccuracy: 0.82,
            streakDays: 7,
            lastActivityAt: new Date().toISOString(),
            skillProgress: {},
          },
          {
            learnerId: 'learner-2',
            learnerName: 'Jane Doe',
            totalActivitiesCompleted: 38,
            totalTimeSpentMinutes: 280,
            averageAccuracy: 0.88,
            streakDays: 5,
            lastActivityAt: new Date(Date.now() - 86400000).toISOString(),
            skillProgress: {},
          },
        ];

        return reply.send({ learners });
      } catch (error) {
        app.log.error({ error, userId: user.sub }, 'Error fetching linked learners');
        return reply.code(500).send({ error: 'Failed to fetch linked learners' });
      }
    }
  );
};
