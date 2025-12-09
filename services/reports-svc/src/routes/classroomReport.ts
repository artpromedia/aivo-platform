/**
 * Classroom Summary Report Routes
 *
 * GET /reports/classrooms/:classroomId/summary
 * Returns aggregated metrics for a classroom (for teachers/district admins).
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { canAccessClassroomReport } from '../lib/rbac.js';
import {
  fetchClassroomInfo,
  fetchClassroomLearners,
  fetchClassroomGoals,
  fetchClassroomHomeworkUsage,
  fetchClassroomFocusPatterns,
  fetchBaselineProfile,
} from '../serviceClients.js';
import type {
  AuthenticatedUser,
  ClassroomSummaryReport,
  ClassroomBaselineStats,
  ClassroomGoalStats,
  ClassroomHomeworkStats,
  ClassroomFocusStats,
  ClassroomLearnerRow,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const paramsSchema = z.object({
  classroomId: z.string().uuid(),
});

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(28),
});

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

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const classroomReportRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /reports/classrooms/:classroomId/summary
   *
   * Returns aggregated classroom metrics:
   * - Baseline completion rates
   * - Goal status distribution
   * - Homework usage stats
   * - Focus pattern stats
   * - Per-learner summary table
   *
   * RBAC: Teachers can only access their assigned classrooms.
   *       District admins can access any classroom in their tenant.
   */
  app.get<{
    Params: { classroomId: string };
    Querystring: { days?: string };
  }>('/classrooms/:classroomId/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const token = getAuthToken(request);

    // Validate params
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ error: 'Invalid classroom ID' });
    }
    const { classroomId } = paramsResult.data;

    const queryResult = querySchema.safeParse(request.query);
    const { days } = queryResult.success ? queryResult.data : { days: 28 };

    // Get classroom info
    const classroomInfo = await fetchClassroomInfo(classroomId, token);
    if (!classroomInfo) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // RBAC check
    if (!canAccessClassroomReport(user, classroomId, classroomInfo.tenantId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Fetch all data in parallel
    const [learners, goalsData, homeworkData, focusData] = await Promise.all([
      fetchClassroomLearners(classroomId, token),
      fetchClassroomGoals(classroomId, classroomInfo.tenantId, token),
      fetchClassroomHomeworkUsage(classroomInfo.tenantId, classroomId, token, days),
      fetchClassroomFocusPatterns(classroomInfo.tenantId, classroomId, token, days),
    ]);

    // Fetch baseline status for each learner
    const baselineStatuses = await Promise.all(
      (learners || []).map((l) => fetchBaselineProfile(l.id, classroomInfo.tenantId, token))
    );

    // Build baseline stats
    const baseline: ClassroomBaselineStats = buildBaselineStats(
      baselineStatuses,
      learners?.length || 0
    );

    // Build goals stats
    const goals: ClassroomGoalStats = buildGoalStats(goalsData, learners?.length || 0);

    // Build homework stats
    const homework: ClassroomHomeworkStats = buildHomeworkStats(homeworkData);

    // Build focus stats
    const focus: ClassroomFocusStats = buildFocusStats(focusData);

    // Build learner rows for summary table
    const learnerRows: ClassroomLearnerRow[] = buildLearnerRows(
      learners || [],
      baselineStatuses,
      goalsData,
      homeworkData
    );

    const report: ClassroomSummaryReport = {
      classroomId,
      classroomName: classroomInfo.name,
      tenantId: classroomInfo.tenantId,
      generatedAt: new Date().toISOString(),
      reportPeriodDays: days,
      baseline,
      goals,
      homework,
      focus,
      learners: learnerRows,
    };

    return reply.send(report);
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// DATA BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

interface BaselineProfileData {
  status: string;
}

function buildBaselineStats(
  baselineStatuses: (BaselineProfileData | null)[],
  totalLearners: number
): ClassroomBaselineStats {
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;

  for (const status of baselineStatuses) {
    if (!status) {
      notStarted++;
    } else if (status.status === 'FINAL_ACCEPTED') {
      completed++;
    } else if (status.status === 'IN_PROGRESS') {
      inProgress++;
    } else if (status.status === 'NOT_STARTED') {
      notStarted++;
    } else {
      // RETEST_ALLOWED counts as in progress
      inProgress++;
    }
  }

  return {
    totalLearners,
    baselineCompleted: completed,
    baselineInProgress: inProgress,
    baselineNotStarted: notStarted,
    completionRate: totalLearners > 0 ? Math.round((completed / totalLearners) * 100) : 0,
  };
}

interface GoalsListData {
  goals: {
    status: string;
  }[];
}

function buildGoalStats(data: GoalsListData | null, totalLearners: number): ClassroomGoalStats {
  if (!data || data.goals.length === 0) {
    return {
      totalGoals: 0,
      statusDistribution: { active: 0, completed: 0, onHold: 0, draft: 0 },
      avgGoalsPerLearner: 0,
    };
  }

  const dist = { active: 0, completed: 0, onHold: 0, draft: 0 };
  for (const goal of data.goals) {
    if (goal.status === 'ACTIVE') dist.active++;
    else if (goal.status === 'COMPLETED') dist.completed++;
    else if (goal.status === 'ON_HOLD') dist.onHold++;
    else if (goal.status === 'DRAFT') dist.draft++;
  }

  return {
    totalGoals: data.goals.length,
    statusDistribution: dist,
    avgGoalsPerLearner:
      totalLearners > 0 ? Math.round((data.goals.length / totalLearners) * 10) / 10 : 0,
  };
}

interface HomeworkUsageData {
  learnersWithHomework: number;
  avgSessionsPerWeekPerLearner: number;
  independenceDistribution: {
    needsSupport: number;
    buildingIndependence: number;
    mostlyIndependent: number;
  };
}

function buildHomeworkStats(data: HomeworkUsageData | null): ClassroomHomeworkStats {
  if (!data) {
    return {
      learnersWithHomework: 0,
      avgSessionsPerWeekPerLearner: 0,
      independenceDistribution: {
        needsSupport: 0,
        buildingIndependence: 0,
        mostlyIndependent: 0,
      },
    };
  }

  return {
    learnersWithHomework: data.learnersWithHomework,
    avgSessionsPerWeekPerLearner: data.avgSessionsPerWeekPerLearner,
    independenceDistribution: data.independenceDistribution,
  };
}

interface FocusPatternsData {
  totalSessions: number;
  avgBreaksPerSession: number;
  focusLossPercentage: number;
  patternsByTime: { hour: number; sessionsCount: number }[];
}

function buildFocusStats(data: FocusPatternsData | null): ClassroomFocusStats {
  if (!data) {
    return {
      totalSessions: 0,
      avgBreaksPerSession: 0,
      focusLossPercentage: 0,
      peakHours: [],
    };
  }

  // Find top 3 peak hours
  const sorted = [...data.patternsByTime].sort((a, b) => b.sessionsCount - a.sessionsCount);
  const peakHours = sorted.slice(0, 3).map((p) => p.hour);

  return {
    totalSessions: data.totalSessions,
    avgBreaksPerSession: data.avgBreaksPerSession,
    focusLossPercentage: data.focusLossPercentage,
    peakHours,
  };
}

interface LearnerInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface HomeworkUsageDataWithMetrics extends HomeworkUsageData {
  learnerMetrics?: {
    learnerId: string;
    homeworkSessionsPerWeek: number;
    independenceLabel: string;
  }[];
}

function buildLearnerRows(
  learners: LearnerInfo[],
  baselineStatuses: (BaselineProfileData | null)[],
  goalsData: GoalsListData | null,
  homeworkData: HomeworkUsageDataWithMetrics | null
): ClassroomLearnerRow[] {
  return learners.map((learner, idx) => {
    const baseline = baselineStatuses[idx];
    const baselineStatus = !baseline
      ? 'Not Started'
      : baseline.status === 'FINAL_ACCEPTED'
        ? 'Completed'
        : baseline.status === 'IN_PROGRESS'
          ? 'In Progress'
          : 'Not Started';

    // Count active goals for this learner
    const activeGoalsCount =
      goalsData?.goals.filter(
        (g: { learnerId?: string; status: string }) =>
          g.learnerId === learner.id && g.status === 'ACTIVE'
      ).length || 0;

    // Get homework metrics for this learner
    const homeworkMetric = homeworkData?.learnerMetrics?.find((m) => m.learnerId === learner.id);

    return {
      learnerId: learner.id,
      learnerName: `${learner.firstName} ${learner.lastName}`,
      baselineStatus,
      activeGoalsCount,
      homeworkSessionsThisWeek: homeworkMetric?.homeworkSessionsPerWeek || 0,
      independenceLabel: homeworkMetric?.independenceLabel || 'N/A',
    };
  });
}
