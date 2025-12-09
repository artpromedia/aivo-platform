/**
 * Parent Learner Report Routes
 *
 * GET /reports/learners/:learnerId/parent-summary
 * Returns a comprehensive, parent-friendly summary of a learner's progress.
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { canAccessLearnerReport } from '../lib/rbac.js';
import {
  generateBaselineStatusText,
  generateDomainSummary,
  generateVirtualBrainSummary,
  generateSkillStrengthText,
  generateSkillFocusText,
  generateGoalProgressText,
  generateGoalsOverallSummary,
  generateHomeworkSummary,
  getDomainDisplayName,
} from '../lib/summaryGenerators.js';
import {
  fetchLearnerInfo,
  fetchBaselineProfile,
  fetchVirtualBrain,
  fetchLearnerGoals,
  fetchHomeworkSummary,
  fetchFocusSummary,
} from '../serviceClients.js';
import type {
  AuthenticatedUser,
  ParentLearnerReport,
  BaselineSummary,
  VirtualBrainSummary,
  GoalSummary,
  HomeworkSummary,
  FocusSummary,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const paramsSchema = z.object({
  learnerId: z.string().uuid(),
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

export const parentReportRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /reports/learners/:learnerId/parent-summary
   *
   * Returns a comprehensive parent-friendly report containing:
   * - Baseline summary (domains assessed, overall status)
   * - Virtual Brain summary (strengths, focus areas)
   * - Goals (active goals with progress)
   * - Homework analytics (usage, independence)
   * - Focus analytics (breaks, session duration)
   *
   * RBAC: Parents can only access their children's reports.
   */
  app.get<{
    Params: { learnerId: string };
    Querystring: { days?: string };
  }>(
    '/learners/:learnerId/parent-summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);
      const token = getAuthToken(request);

      // Validate params
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid learner ID' });
      }
      const { learnerId } = paramsResult.data;

      const queryResult = querySchema.safeParse(request.query);
      const { days } = queryResult.success ? queryResult.data : { days: 28 };

      // Get learner info first
      const learnerInfo = await fetchLearnerInfo(learnerId, token);
      if (!learnerInfo) {
        return reply.code(404).send({ error: 'Learner not found' });
      }

      // RBAC check
      if (!canAccessLearnerReport(user, learnerId, learnerInfo.tenantId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Fetch all data in parallel
      const [baselineData, virtualBrainData, goalsData, homeworkData, focusData] =
        await Promise.all([
          fetchBaselineProfile(learnerId, learnerInfo.tenantId, token),
          fetchVirtualBrain(learnerId, token),
          fetchLearnerGoals(learnerId, learnerInfo.tenantId, token),
          fetchHomeworkSummary(user.sub, learnerId, token, days),
          fetchFocusSummary(user.sub, learnerId, token, days),
        ]);

      // Build baseline summary
      const baseline: BaselineSummary = buildBaselineSummary(baselineData);

      // Build virtual brain summary
      const virtualBrain: VirtualBrainSummary = buildVirtualBrainSummary(virtualBrainData);

      // Build goals summary (filter out therapist-only notes)
      const goals: GoalSummary = buildGoalsSummary(goalsData, user.role);

      // Build homework summary
      const homework: HomeworkSummary = buildHomeworkSummary(homeworkData);

      // Build focus summary
      const focus: FocusSummary = buildFocusSummary(focusData);

      const report: ParentLearnerReport = {
        learnerId,
        learnerName: `${learnerInfo.firstName} ${learnerInfo.lastName}`,
        generatedAt: new Date().toISOString(),
        reportPeriodDays: days,
        baseline,
        virtualBrain,
        goals,
        homework,
        focus,
      };

      return reply.send(report);
    }
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DATA BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function buildBaselineSummary(
  data: Awaited<ReturnType<typeof fetchBaselineProfile>>
): BaselineSummary {
  if (!data) {
    return {
      status: 'NOT_STARTED',
      completedAt: null,
      domains: [],
      overallSummary:
        "The baseline assessment has not been started yet. This helps us understand your child's current skill levels.",
    };
  }

  const status = data.status === 'FINAL_ACCEPTED' ? 'COMPLETED' : data.status;
  const domains = (data.domainScores || []).map((d) => ({
    domain: getDomainDisplayName(d.domain),
    assessed: true,
    summary: generateDomainSummary(d.domain, d.score, d.maxScore),
  }));

  return {
    status: status,
    completedAt: data.acceptedAt || null,
    domains,
    overallSummary: generateBaselineStatusText(status, data.acceptedAt || null),
  };
}

function buildVirtualBrainSummary(
  data: Awaited<ReturnType<typeof fetchVirtualBrain>>
): VirtualBrainSummary {
  if (!data) {
    return {
      initialized: false,
      gradeBand: null,
      strengths: [],
      focusAreas: [],
      overallSummary: "Your child's learning profile is being established.",
    };
  }

  // Find top strengths (mastery >= 7)
  const strengths = data.skillStates
    .filter((s) => s.masteryLevel >= 7)
    .sort((a, b) => b.masteryLevel - a.masteryLevel)
    .slice(0, 5)
    .map((s) => ({
      domain: getDomainDisplayName(s.domain),
      skill: s.displayName,
      description: generateSkillStrengthText(s.displayName, s.masteryLevel),
    }));

  // Find focus areas (mastery < 5)
  const focusAreas = data.skillStates
    .filter((s) => s.masteryLevel < 5)
    .sort((a, b) => a.masteryLevel - b.masteryLevel)
    .slice(0, 5)
    .map((s) => ({
      domain: getDomainDisplayName(s.domain),
      skill: s.displayName,
      description: generateSkillFocusText(s.displayName, s.masteryLevel),
    }));

  return {
    initialized: true,
    gradeBand: data.gradeBand,
    strengths,
    focusAreas,
    overallSummary: generateVirtualBrainSummary(strengths.length, focusAreas.length),
  };
}

function buildGoalsSummary(
  data: Awaited<ReturnType<typeof fetchLearnerGoals>>,
  _userRole: string
): GoalSummary {
  if (!data || data.goals.length === 0) {
    return {
      activeGoals: [],
      completedCount: 0,
      overallSummary: generateGoalsOverallSummary(0, 0),
    };
  }

  const activeGoals = data.goals
    .filter((g) => g.status === 'ACTIVE')
    .map((g) => {
      const completedObjectives = g.objectives.filter((o) => o.status === 'MET').length;
      return {
        id: g.id,
        title: g.title,
        domain: getDomainDisplayName(g.domain),
        status: g.status,
        progressText: generateGoalProgressText(
          g.progressRating,
          completedObjectives,
          g.objectives.length
        ),
        startDate: g.startDate,
        targetDate: g.targetDate,
      };
    });

  const completedCount = data.goals.filter((g) => g.status === 'COMPLETED').length;

  return {
    activeGoals,
    completedCount,
    overallSummary: generateGoalsOverallSummary(activeGoals.length, completedCount),
  };
}

function buildHomeworkSummary(
  data: Awaited<ReturnType<typeof fetchHomeworkSummary>>
): HomeworkSummary {
  if (!data) {
    return {
      sessionsPerWeek: 0,
      avgStepsPerSession: 0,
      independenceScore: 0,
      independenceLabel: 'N/A',
      independenceLabelText: 'No data yet',
      lastSessionDate: null,
      totalSessions: 0,
      summary: 'No homework helper sessions recorded yet.',
    };
  }

  return {
    sessionsPerWeek: data.homeworkSessionsPerWeek,
    avgStepsPerSession: data.avgStepsPerHomework,
    independenceScore: data.independenceScore,
    independenceLabel: data.independenceLabel,
    independenceLabelText: data.independenceLabelText,
    lastSessionDate: data.lastHomeworkDate,
    totalSessions: data.totalHomeworkSessions,
    summary: generateHomeworkSummary(
      data.homeworkSessionsPerWeek,
      data.independenceScore,
      data.totalHomeworkSessions
    ),
  };
}

function buildFocusSummary(data: Awaited<ReturnType<typeof fetchFocusSummary>>): FocusSummary {
  if (!data) {
    return {
      avgBreaksPerSession: 0,
      avgSessionDurationMinutes: 0,
      totalSessions: 0,
      summary: 'No learning sessions recorded yet.',
    };
  }

  return {
    avgBreaksPerSession: data.avgFocusBreaksPerSession,
    avgSessionDurationMinutes: data.avgSessionDurationMinutes,
    totalSessions: data.totalSessions,
    summary: data.summary,
  };
}
