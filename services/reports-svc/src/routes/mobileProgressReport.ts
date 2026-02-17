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

import { canAccessLearnerReport } from '../lib/rbac.js';
import {
  fetchLearnerInfo,
  fetchVirtualBrain,
  fetchFocusSummary,
  fetchLearnerSessions,
  fetchParentLinkedStudents,
  fetchStudentSummary,
} from '../serviceClients.js';
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
 * Calculate streak days from session timestamps.
 * Counts consecutive calendar days (backwards from today) that have at least one session.
 */
function calculateStreakDays(sessions: { endedAt: string | null; startedAt: string }[]): number {
  if (sessions.length === 0) return 0;

  // Collect unique calendar days with activity
  const activeDays = new Set<string>();
  for (const s of sessions) {
    const dateStr = (s.endedAt ?? s.startedAt).slice(0, 10); // YYYY-MM-DD
    activeDays.add(dateStr);
  }

  // Walk backwards from today counting consecutive days
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (!activeDays.has(todayStr) && !activeDays.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeDays.has(key)) {
      streak++;
    } else if (streak > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * Generate skill progress from virtual brain data
 */
function generateSkillProgress(
  virtualBrain: {
    skillStates?: {
      skillCode: string;
      domain: string;
      displayName: string;
      masteryLevel: number;
      confidence: number;
    }[];
    summary?: {
      totalSkills: number;
      byDomain: Record<string, { count: number; avgMastery: number }>;
    };
  } | null
): Record<string, SkillProgress> {
  if (!virtualBrain?.skillStates?.length) {
    return {};
  }

  const result: Record<string, SkillProgress> = {};
  const domainStats = virtualBrain.summary?.byDomain ?? {};

  for (const skill of virtualBrain.skillStates) {
    const domainInfo = domainStats[skill.domain];
    result[skill.skillCode] = {
      skillId: skill.skillCode,
      skillName: skill.displayName,
      masteryLevel: skill.masteryLevel,
      activitiesCompleted: Math.round(skill.masteryLevel * (domainInfo?.count ?? 10)),
      totalActivities: domainInfo?.count ?? 10,
      lastPracticedAt: null,
    };
  }

  return result;
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
  }>('/:learnerId/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const token = getAuthToken(request);

    // Validate params
    const paramsResult = learnerIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ error: 'Invalid learner ID' });
    }

    const { learnerId } = paramsResult.data;

    // RBAC: Check if user can access this learner's data
    const canAccess = canAccessLearnerReport(user, learnerId, user.tenantId);
    if (!canAccess) {
      return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
    }

    try {
      // Fetch learner info first for tenant context
      const learnerInfo = await fetchLearnerInfo(learnerId, token);
      const tenantId = learnerInfo?.tenantId ?? '';

      // Fetch all data in parallel
      const [virtualBrain, focusSummary, sessionData] = await Promise.all([
        fetchVirtualBrain(learnerId, token),
        fetchFocusSummary(user.sub, learnerId, token),
        fetchLearnerSessions(learnerId, tenantId, token, 50),
      ]);

      // Calculate metrics from real data
      const skillProgress = generateSkillProgress(virtualBrain);
      const sessionItems = sessionData?.items ?? [];
      const streakDays = calculateStreakDays(sessionItems);

      // Calculate average accuracy from session scores
      const scoredSessions = sessionItems.filter(
        (s) =>
          s.metadata && typeof (s.metadata as Record<string, unknown>).averageScore === 'number'
      );
      const averageAccuracy =
        scoredSessions.length > 0
          ? scoredSessions.reduce(
              (sum, s) => sum + ((s.metadata as Record<string, unknown>).averageScore as number),
              0
            ) / scoredSessions.length
          : 0;

      // Total time from focus summary or session durations
      const totalTimeMinutes = focusSummary?.avgSessionDurationMinutes
        ? focusSummary.avgSessionDurationMinutes * (focusSummary.totalSessions || 0)
        : sessionItems.reduce((sum, s) => sum + (s.durationMs ? s.durationMs / 60000 : 0), 0);

      const lastSession = sessionItems[0]; // Sorted desc from session-svc

      const summary: ProgressSummary = {
        learnerId,
        learnerName: learnerInfo ? `${learnerInfo.firstName} ${learnerInfo.lastName}` : learnerId,
        totalActivitiesCompleted: focusSummary?.totalSessions || sessionData?.total || 0,
        totalTimeSpentMinutes: Math.round(totalTimeMinutes),
        averageAccuracy,
        streakDays,
        lastActivityAt: lastSession?.endedAt ?? lastSession?.startedAt ?? new Date(0).toISOString(),
        skillProgress,
      };

      return reply.send(summary);
    } catch (error) {
      app.log.error({ error, learnerId }, 'Error fetching progress summary');
      return reply.code(500).send({ error: 'Failed to fetch progress summary' });
    }
  });

  /**
   * GET /progress/:learnerId/activities
   *
   * Get recent activities for a learner
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { limit?: string; offset?: string };
  }>('/:learnerId/activities', async (request: FastifyRequest, reply: FastifyReply) => {
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
    const canAccess = canAccessLearnerReport(user, learnerId, user.tenantId);
    if (!canAccess) {
      return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
    }

    try {
      // Fetch learner info for tenant context, then fetch sessions
      const learnerInfo = await fetchLearnerInfo(learnerId, token);
      const tenantId = learnerInfo?.tenantId ?? '';

      const sessionData = await fetchLearnerSessions(learnerId, tenantId, token, limit, offset);
      const sessionItems = sessionData?.items ?? [];

      // Map sessions to activity entries
      const activities: ActivityEntry[] = sessionItems.map((s) => {
        const meta = (s.metadata ?? {}) as Record<string, unknown>;
        return {
          id: s.id,
          type: s.sessionType.toLowerCase(),
          title: (meta.subject as string) ?? s.sessionType,
          completedAt: s.endedAt ?? s.startedAt,
          durationMinutes: s.durationMs ? Math.round(s.durationMs / 60000) : 0,
          accuracy: typeof meta.averageScore === 'number' ? meta.averageScore : null,
          skillId: (meta.subject as string)?.toLowerCase() ?? null,
        };
      });

      return reply.send({ activities, total: sessionData?.total ?? 0 });
    } catch (error) {
      app.log.error({ error, learnerId }, 'Error fetching activities');
      return reply.code(500).send({ error: 'Failed to fetch activities' });
    }
  });

  /**
   * GET /progress/:learnerId/skills
   *
   * Get skill-level progress for a learner
   */
  app.get<{
    Params: { learnerId: string };
  }>('/:learnerId/skills', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const token = getAuthToken(request);

    // Validate params
    const paramsResult = learnerIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ error: 'Invalid learner ID' });
    }

    const { learnerId } = paramsResult.data;

    // RBAC: Check if user can access this learner's data
    const canAccess = canAccessLearnerReport(user, learnerId, user.tenantId);
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
  });

  /**
   * GET /progress/:learnerId/weekly
   *
   * Get weekly reports for a learner
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { limit?: string };
  }>('/:learnerId/weekly', async (request: FastifyRequest, reply: FastifyReply) => {
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
    const canAccess = canAccessLearnerReport(user, learnerId, user.tenantId);
    if (!canAccess) {
      return reply.code(403).send({ error: 'Forbidden: Cannot access learner data' });
    }

    try {
      // Fetch learner info, and virtual brain in parallel
      const [learnerInfo, virtualBrain] = await Promise.all([
        fetchLearnerInfo(learnerId, token),
        fetchVirtualBrain(learnerId, token),
      ]);

      const tenantId = learnerInfo?.tenantId ?? '';

      // Fetch enough sessions to cover the requested weeks
      const sessionData = await fetchLearnerSessions(learnerId, tenantId, token, 100);
      const sessionItems = sessionData?.items ?? [];

      // Group sessions by ISO week (Monday-based)
      const weekBuckets = new Map<string, typeof sessionItems>();
      for (const s of sessionItems) {
        const date = new Date(s.endedAt ?? s.startedAt);
        const day = date.getDay();
        const monday = new Date(date);
        monday.setDate(monday.getDate() - ((day + 6) % 7));
        const weekKey = monday.toISOString().slice(0, 10);
        const bucket = weekBuckets.get(weekKey) ?? [];
        bucket.push(s);
        weekBuckets.set(weekKey, bucket);
      }

      // Sort weeks descending and take requested limit
      const sortedWeeks = [...weekBuckets.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, limit);

      // Identify skill domains that improved vs need focus
      const skillStates = virtualBrain?.skillStates ?? [];
      const strongSkills = skillStates
        .filter((sk) => sk.masteryLevel >= 0.7)
        .map((sk) => sk.displayName)
        .slice(0, 3);
      const weakSkills = skillStates
        .filter((sk) => sk.masteryLevel < 0.5)
        .map((sk) => sk.displayName)
        .slice(0, 3);

      const reports: WeeklyReport[] = sortedWeeks.map(([weekStart, weekSessions]) => {
        const weekStartDate = new Date(weekStart);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const totalDurationMs = weekSessions.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
        const scored = weekSessions.filter(
          (s) =>
            s.metadata && typeof (s.metadata as Record<string, unknown>).averageScore === 'number'
        );
        const avgAccuracy =
          scored.length > 0
            ? scored.reduce(
                (sum, s) => sum + ((s.metadata as Record<string, unknown>).averageScore as number),
                0
              ) / scored.length
            : 0;

        return {
          learnerId,
          weekStart: weekStartDate.toISOString(),
          weekEnd: weekEndDate.toISOString(),
          activitiesCompleted: weekSessions.length,
          timeSpentMinutes: Math.round(totalDurationMs / 60000),
          averageAccuracy: avgAccuracy,
          skillsImproved: strongSkills,
          areasToFocus: weakSkills,
          teacherNote: null,
        };
      });

      return reply.send({ reports });
    } catch (error) {
      app.log.error({ error, learnerId }, 'Error fetching weekly reports');
      return reply.code(500).send({ error: 'Failed to fetch weekly reports' });
    }
  });

  /**
   * GET /progress/linked-learners
   *
   * Get all learners linked to the current parent
   */
  app.get('/linked-learners', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const token = getAuthToken(request);

    // Ensure user is a parent
    if (user.role !== 'parent') {
      return reply.code(403).send({ error: 'Forbidden: Only parents can access linked learners' });
    }

    try {
      // Fetch linked students from parent-svc
      const parentStudents = await fetchParentLinkedStudents(token);
      const activeLinks = parentStudents?.active ?? [];

      // Fetch summary for each linked student in parallel
      const learners = await Promise.all(
        activeLinks.map(async (link): Promise<ProgressSummary> => {
          const studentSummary = await fetchStudentSummary(link.studentId, token);

          if (studentSummary) {
            return {
              learnerId: link.studentId,
              learnerName: `${studentSummary.givenName} ${studentSummary.familyName}`,
              totalActivitiesCompleted: studentSummary.weeklyStats?.sessionsCount ?? 0,
              totalTimeSpentMinutes: studentSummary.weeklyStats?.totalMinutes ?? 0,
              averageAccuracy: studentSummary.weeklyStats?.averageScore ?? 0,
              streakDays: studentSummary.weeklyStats?.daysActive ?? 0,
              lastActivityAt:
                studentSummary.recentActivity?.[0]?.startedAt ?? new Date(0).toISOString(),
              skillProgress: {},
            };
          }

          // Fallback when summary is unavailable
          return {
            learnerId: link.studentId,
            learnerName: link.studentName,
            totalActivitiesCompleted: 0,
            totalTimeSpentMinutes: 0,
            averageAccuracy: 0,
            streakDays: 0,
            lastActivityAt: new Date(0).toISOString(),
            skillProgress: {},
          };
        })
      );

      return reply.send({ learners });
    } catch (error) {
      app.log.error({ error, userId: user.sub }, 'Error fetching linked learners');
      return reply.code(500).send({ error: 'Failed to fetch linked learners' });
    }
  });
};
