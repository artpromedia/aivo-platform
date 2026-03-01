import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { config } from '../config.js';
import { handleBaselineCompleted } from '../events/baseline-completed.handler.js';
import { ActivitySequencer } from '../learning/activity-sequencer.js';
import { LearningPathOptimizer } from '../learning/learning-path-optimizer.js';
import { MasteryTracker } from '../learning/mastery-tracker.js';
import { getContext } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import {
  CompleteActivitySchema,
  MasteryEvidenceSchema,
  SequencingConstraintsSchema,
  ActivitySchema,
  LearningGoalSchema,
} from '../validators/index.js';

// Initialize components
const pathOptimizer = new LearningPathOptimizer();
const activitySequencer = new ActivitySequencer();
const masteryTracker = new MasteryTracker();
const cognitiveManager = new CognitiveLoadManager();

// Mastery threshold constants (0-100 scale used by masteryTracker)
const STRUGGLING_THRESHOLD = 40; // below → trigger remediation re-optimisation
const MASTERED_THRESHOLD = 90; // above → skip mastered content re-optimisation

async function learningRoutes(app: FastifyInstance) {
  // ── RL feature-flag helper ──────────────────────────────────────────
  const rlTutoringEnabled = (): boolean => {
    const env = process.env.FEATURE_RL_TUTORING ?? process.env.FEATURE_RLTUTORING;
    return env === 'true' || env === '1';
  };

  /**
   * Suggest next tutoring action via RL Tutoring Service.
   * POST /api/v1/brain/learners/:learnerId/suggest-action
   *
   * Falls back to a rule-based recommendation when the RL service
   * is disabled or unreachable.
   */
  app.post(
    '/learners/:learnerId/suggest-action',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { learnerId } = request.params;
      const body = request.body as any;

      if (!rlTutoringEnabled()) {
        return {
          success: true,
          data: {
            action_type: 'explanation',
            difficulty: 0.5,
            parameters: {},
            source: 'rule-based',
          },
          message: 'RL tutoring disabled — returning rule-based action',
        };
      }

      try {
        const rlUrl = config.services.rlTutoring;
        const masteryState = await masteryTracker.getMasterySummary(learnerId);

        const res = await fetch(`${rlUrl}/api/v1/action/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            learner_id: learnerId,
            knowledge_state: body.knowledge_state ?? {},
            recent_performance: body.recent_performance ?? [],
            engagement_level: body.engagement_level ?? 0.7,
            time_in_session: body.time_in_session ?? 0,
            current_content_id: body.current_content_id ?? null,
            available_content: body.available_content ?? [],
            previous_content_ids: body.previous_content_ids ?? [],
            hints_given: body.hints_given ?? 0,
          }),
          signal: AbortSignal.timeout(3_000),
        });

        if (!res.ok) throw new Error(`rl-tutoring-svc responded ${res.status}`);
        const json = (await res.json()) as any;
        return { success: true, data: { ...json, source: 'rl-policy' } };
      } catch (err) {
        console.warn('[suggest-action] RL tutoring unavailable, falling back', {
          error: (err as Error).message,
        });
        return {
          success: true,
          data: {
            action_type: 'explanation',
            difficulty: 0.5,
            parameters: {},
            source: 'rule-based-fallback',
          },
          message: 'RL service unavailable — returning rule-based action',
        };
      }
    }
  );

  /**
   * Get next recommended activity for a learner
   * GET /api/v1/brain/learners/:learnerId/next-activity
   */
  app.get(
    '/learners/:learnerId/next-activity',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;

      const cognitiveState = await cognitiveManager.assessCurrentLoad(learnerId, []);

      const currentPath = await prisma.learningPath.findFirst({
        where: { learnerId, tenantId },
        include: { progress: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!currentPath) {
        return { success: true, data: null, message: 'No active learning path found' };
      }

      const activities = (currentPath.activities as any)?.orderedActivities ?? [];
      const completedIds = new Set(currentPath.progress?.completedActivityIds ?? []);

      const availableActivities = activities
        .filter((a: any) => !completedIds.has(a.activity.id))
        .map((a: any) => a.activity);

      if (availableActivities.length === 0) {
        return { success: true, data: null, message: 'All activities completed' };
      }

      const recommendation = await cognitiveManager.recommendNextActivity(
        learnerId,
        availableActivities,
        cognitiveState
      );

      return { success: true, data: recommendation };
    }
  );

  /**
   * Complete an activity and record results
   * POST /api/v1/brain/learners/:learnerId/complete-activity
   */
  app.post(
    '/learners/:learnerId/complete-activity',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;
      const input = CompleteActivitySchema.parse(request.body);

      const activity = await getActivityDetails(input.activityId);

      if (!activity) {
        reply.status(404);
        return { success: false, error: 'Activity not found' };
      }

      const masteryUpdates = [];
      const thresholdCrossings: {
        skillId: string;
        direction: 'struggling' | 'mastered';
        previous: number;
        current: number;
      }[] = [];

      for (const skillId of activity.skillIds) {
        // ── Capture previous mastery for threshold comparison (W4) ───────
        let previousMastery = 50; // default mid-range
        try {
          const priorState = await masteryTracker.getMasteryState(learnerId, [skillId]);
          const priorSkill = priorState.skills.get(skillId);
          if (priorSkill) previousMastery = priorSkill.masteryLevel;
        } catch {
          /* first time — keep default */
        }

        const evidence = {
          activityId: input.activityId,
          skillId,
          outcome: input.result.success
            ? 'success'
            : input.result.score && input.result.score >= 50
              ? 'partial'
              : 'failure',
          score: input.result.score,
          timeSpent: input.result.timeSpent,
          attemptCount: 1,
          errorTypes: [],
        } as const;

        const update = await masteryTracker.updateMastery(learnerId, skillId, evidence);
        masteryUpdates.push(update);

        const newMastery = update.masteryLevel ?? previousMastery;

        // ── W3: Fire-and-forget BKT updates to training-svc & learner-model-svc ─
        const isCorrect =
          input.result.success || (input.result.score != null && input.result.score >= 70);

        void fireBktUpdate(learnerId, skillId, isCorrect, input).catch((err) =>
          console.warn('[complete-activity] BKT fire-and-forget failed', {
            skillId,
            error: (err as Error).message,
          })
        );

        // ── W4: Detect threshold crossings ──────────────────────────────
        if (previousMastery >= STRUGGLING_THRESHOLD && newMastery < STRUGGLING_THRESHOLD) {
          thresholdCrossings.push({
            skillId,
            direction: 'struggling',
            previous: previousMastery,
            current: newMastery,
          });
        }
        if (previousMastery < MASTERED_THRESHOLD && newMastery >= MASTERED_THRESHOLD) {
          thresholdCrossings.push({
            skillId,
            direction: 'mastered',
            previous: previousMastery,
            current: newMastery,
          });
        }
      }

      await prisma.learningPathProgress.updateMany({
        where: { path: { learnerId, tenantId } },
        data: {
          completedActivityIds: { push: input.activityId },
          lastActivityAt: new Date(),
        },
      });

      // ── W4: Trigger path re-optimisation on threshold crossings ───────
      if (thresholdCrossings.length > 0) {
        void triggerPathReOptimization(learnerId, tenantId, thresholdCrossings).catch((err) =>
          console.warn('[complete-activity] Path re-optimisation failed', {
            error: (err as Error).message,
          })
        );
      }

      // ── S11: Fire-and-forget RL reward signal ─────────────────────────
      if (rlTutoringEnabled()) {
        void fireRlRewardSignal(learnerId, activity, input, masteryUpdates).catch((err) =>
          console.warn('[complete-activity] RL reward signal failed', {
            error: (err as Error).message,
          })
        );
      }

      const nextActivity = await getNextActivityForLearner(learnerId, tenantId);
      const masterySummary = await masteryTracker.getMasterySummary(learnerId);

      return {
        success: true,
        data: {
          masteryUpdates,
          thresholdCrossings: thresholdCrossings.length > 0 ? thresholdCrossings : undefined,
          nextSteps: {
            immediateActions: nextActivity
              ? [`Continue with: ${nextActivity.title}`]
              : ['Great job! You completed all activities'],
            recommendedActivities: nextActivity ? [nextActivity] : [],
            milestones: [
              {
                name: 'Skills mastered',
                progress:
                  (masterySummary.masteredSkills / Math.max(1, masterySummary.totalSkills)) * 100,
              },
            ],
          },
        },
      };
    }
  );

  /**
   * Get learning path for a learner
   * GET /api/v1/brain/learners/:learnerId/learning-path
   */
  app.get(
    '/learners/:learnerId/learning-path',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;

      const path = await prisma.learningPath.findFirst({
        where: { learnerId, tenantId },
        include: { progress: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!path) {
        reply.status(404);
        return { success: false, error: 'No learning path found for learner' };
      }

      return { success: true, data: path };
    }
  );

  /**
   * Generate an adaptive learning path for a learner (idempotent).
   * POST /api/v1/brain/learners/:learnerId/generate-path
   *
   * Body: { assessmentId, skillEstimates: [{skillId, skillName, score, maxScore}] }
   * Returns 201 if a new path was created, 200 if one already existed.
   */
  app.post(
    '/learners/:learnerId/generate-path',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;
      const body = request.body as any;

      const result = await handleBaselineCompleted({
        learnerId,
        tenantId,
        assessmentId: body.assessmentId ?? '',
        skillEstimates: body.skillEstimates ?? [],
        completedAt: new Date().toISOString(),
        gradeLevel: body.gradeLevel,
      });

      reply.status(result.alreadyExisted ? 200 : 201);
      return { success: true, data: result };
    }
  );

  /**
   * Optimize learning path
   * POST /api/v1/brain/learners/:learnerId/optimize-path
   */
  app.post(
    '/learners/:learnerId/optimize-path',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;

      const body = request.body as any;
      const goalsInput = body.goals ? z.array(LearningGoalSchema).parse(body.goals) : [];

      const pathRecord = await prisma.learningPath.findFirst({
        where: { learnerId, tenantId },
        include: { progress: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!pathRecord) {
        reply.status(404);
        return { success: false, error: 'No learning path found to optimize' };
      }

      const currentPath = {
        id: pathRecord.id,
        learnerId: pathRecord.learnerId,
        tenantId: pathRecord.tenantId,
        name: pathRecord.name,
        description: pathRecord.description ?? '',
        activities: (pathRecord.activities as any) ?? {
          orderedActivities: [],
          branchingPoints: [],
        },
        estimatedTotalDuration: pathRecord.estimatedDuration,
        progress: pathRecord.progress
          ? {
              completedActivityIds: pathRecord.progress.completedActivityIds as string[],
              currentActivityId: pathRecord.progress.currentActivityId ?? undefined,
              totalProgress: pathRecord.progress.totalProgress,
              estimatedTimeRemaining: pathRecord.progress.estimatedTimeRemaining,
              lastActivityAt: pathRecord.progress.lastActivityAt ?? undefined,
            }
          : {
              completedActivityIds: [],
              totalProgress: 0,
              estimatedTimeRemaining: pathRecord.estimatedDuration,
            },
        createdAt: pathRecord.createdAt,
        updatedAt: pathRecord.updatedAt,
      };

      const learnerProgress = {
        totalActivitiesCompleted: currentPath.progress.completedActivityIds.length,
        recentScores: [],
        streak: 0,
        lastActivityDate: currentPath.progress.lastActivityAt ?? null,
      };

      const optimizedPath = await pathOptimizer.optimizePath(
        currentPath,
        learnerProgress,
        goalsInput.map((g) => ({ ...g, id: g.id ?? '' }))
      );

      return { success: true, data: optimizedPath };
    }
  );

  /**
   * Get path adjustment suggestions
   * GET /api/v1/brain/paths/:pathId/suggestions
   */
  app.get(
    '/paths/:pathId/suggestions',
    async (request: FastifyRequest<{ Params: { pathId: string } }>) => {
      const { pathId } = request.params;

      // Look up path to get learnerId
      const pathRecord = await prisma.learningPath.findFirst({
        where: { id: pathId },
        select: { learnerId: true },
      });
      const learnerId = pathRecord?.learnerId ?? '';

      // Fetch real performance data from analytics-svc (fallback on error)
      let performanceData: {
        learnerId: string;
        period: { start: Date; end: Date };
        activitiesCompleted: number;
        averageScore: number;
        averageTimePerActivity: number;
        masteryGrowth: number;
        engagementTrend: 'improving' | 'stable' | 'declining';
      };

      try {
        const analyticsSvcUrl = config.services.analytics;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const from = sevenDaysAgo.toISOString().slice(0, 10);
        const to = now.toISOString().slice(0, 10);

        const res = await fetch(
          `${analyticsSvcUrl}/api/v1/analytics/learners/${learnerId}/summary?from=${from}&to=${to}`,
          { signal: AbortSignal.timeout(5_000) }
        );

        if (res.ok) {
          const json = (await res.json()) as any;
          const engagement = json.engagement ?? json.data?.engagement ?? {};
          const progress = json.learningProgress ?? json.data?.learningProgress ?? {};

          // Derive engagement trend from session counts
          const sessionsThis = engagement.sessionsThisWeek ?? 0;
          const sessionsLast = engagement.sessionsLastWeek ?? 0;
          let engagementTrend: 'improving' | 'stable' | 'declining' = 'stable';
          if (sessionsThis > sessionsLast * 1.15) engagementTrend = 'improving';
          else if (sessionsThis < sessionsLast * 0.85) engagementTrend = 'declining';

          performanceData = {
            learnerId,
            period: { start: sevenDaysAgo, end: now },
            activitiesCompleted: engagement.totalSessionsInRange ?? 0,
            averageScore: 75, // analytics-svc summary doesn't include raw scores — keep default
            averageTimePerActivity: engagement.avgSessionDurationMinutes ?? 20,
            masteryGrowth: progress.totalSkillsMasteredDelta ?? 0,
            engagementTrend,
          };
        } else {
          throw new Error(`analytics-svc ${res.status}`);
        }
      } catch {
        // Graceful fallback so path suggestions are never blocked
        performanceData = {
          learnerId,
          period: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
          activitiesCompleted: 10,
          averageScore: 75,
          averageTimePerActivity: 20,
          masteryGrowth: 8,
          engagementTrend: 'stable' as const,
        };
      }

      const suggestions = await pathOptimizer.suggestPathAdjustments(pathId, performanceData);

      return { success: true, data: suggestions };
    }
  );

  /**
   * Predict path completion
   * GET /api/v1/brain/paths/:pathId/completion-prediction
   */
  app.get(
    '/paths/:pathId/completion-prediction',
    async (request: FastifyRequest<{ Params: { pathId: string } }>) => {
      const { pathId } = request.params;

      const learnerProfile = {
        id: '',
        tenantId: '',
        skillLevels: new Map<string, number>(),
        learningRate: 1.0,
        averageAccuracy: 0.75,
        averageResponseTime: 3000,
        preferredPace: 'normal' as const,
        strengths: [],
        weaknesses: [],
      };

      const prediction = await pathOptimizer.predictCompletion(pathId, learnerProfile);

      return { success: true, data: prediction };
    }
  );

  /**
   * Sequence activities
   * POST /api/v1/brain/sequence-activities
   */
  app.post('/sequence-activities', async (request: FastifyRequest) => {
    const body = request.body as any;
    const activities = z.array(ActivitySchema).parse(body.activities);
    const constraints = SequencingConstraintsSchema.parse(body.constraints ?? {});

    const learnerProfile = {
      id: body.learnerId ?? '',
      tenantId: '',
      skillLevels: new Map<string, number>(),
      learningRate: 1.0,
      averageAccuracy: 0.75,
      averageResponseTime: 3000,
      preferredPace: 'normal' as const,
      strengths: [],
      weaknesses: [],
    };

    const sequence = await activitySequencer.sequenceActivities(
      activities.map((a) => ({
        ...a,
        description: a.description ?? '',
        prerequisites: a.prerequisites ?? [],
        metadata: a.metadata ?? {},
      })),
      constraints,
      learnerProfile
    );

    return { success: true, data: sequence };
  });

  /**
   * Get mastery state for a learner
   * GET /api/v1/brain/learners/:learnerId/mastery
   */
  app.get(
    '/learners/:learnerId/mastery',
    async (
      request: FastifyRequest<{ Params: { learnerId: string }; Querystring: { skillIds?: string } }>
    ) => {
      const { learnerId } = request.params;
      const skillIds = (request.query.skillIds as string)?.split(',') ?? [];

      if (skillIds.length === 0) {
        const summary = await masteryTracker.getMasterySummary(learnerId);
        return { success: true, data: summary };
      }

      const masteryState = await masteryTracker.getMasteryState(learnerId, skillIds);

      return {
        success: true,
        data: {
          learnerId: masteryState.learnerId,
          skills: Object.fromEntries(masteryState.skills),
          lastUpdated: masteryState.lastUpdated,
        },
      };
    }
  );

  /**
   * Update mastery with evidence
   * POST /api/v1/brain/learners/:learnerId/mastery
   */
  app.post(
    '/learners/:learnerId/mastery',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const evidence = MasteryEvidenceSchema.parse(request.body);

      const update = await masteryTracker.updateMastery(learnerId, evidence.skillId, evidence);

      return { success: true, data: update };
    }
  );

  /**
   * Get skills needing review
   * GET /api/v1/brain/learners/:learnerId/review-needed
   */
  app.get(
    '/learners/:learnerId/review-needed',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;

      const skillsNeedingReview = await masteryTracker.getSkillsNeedingReview(learnerId);

      return { success: true, data: skillsNeedingReview };
    }
  );

  /**
   * Predict mastery gain from an activity
   * POST /api/v1/brain/learners/:learnerId/predict-mastery-gain
   */
  app.post(
    '/learners/:learnerId/predict-mastery-gain',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const body = request.body as any;
      const activity = ActivitySchema.parse(body.activity);

      const masteryState = await masteryTracker.getMasteryState(learnerId, activity.skillIds);

      const prediction = await masteryTracker.predictMasteryGain(
        {
          ...activity,
          description: activity.description ?? '',
          prerequisites: activity.prerequisites ?? [],
          metadata: activity.metadata ?? {},
        },
        masteryState
      );

      return { success: true, data: prediction };
    }
  );
}

// Helper functions

async function getActivityDetails(activityId: string): Promise<any | null> {
  // In a real implementation, this would fetch from the activity/lesson service
  // For now, return a placeholder
  return {
    id: activityId,
    type: 'practice-exercise',
    title: 'Activity',
    skillIds: [],
  };
}

async function getNextActivityForLearner(learnerId: string, tenantId: string): Promise<any | null> {
  const path = await prisma.learningPath.findFirst({
    where: { learnerId, tenantId },
    include: { progress: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!path) return null;

  const activities = (path.activities as any)?.orderedActivities ?? [];
  const completedIds = new Set(path.progress?.completedActivityIds ?? []);

  const nextActivity = activities.find((a: any) => !completedIds.has(a.activity.id));

  return nextActivity?.activity ?? null;
}

/**
 * W3: Fire-and-forget BKT update to training-svc and learner-model-svc.
 */
async function fireBktUpdate(
  learnerId: string,
  skillId: string,
  correct: boolean,
  input: { activityId: string; result: { score?: number; timeSpent?: number; success?: boolean } }
): Promise<void> {
  const trainingSvcUrl = config.services.training;
  const learnerModelSvcUrl = config.services.learnerModel;

  // training-svc BKT update
  const bktPromise = fetch(`${trainingSvcUrl}/api/v1/training/bkt/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learner_id: learnerId, skill_id: skillId, correct }),
    signal: AbortSignal.timeout(5_000),
  }).then((res) => {
    if (!res.ok) console.warn('[bkt-update] training-svc responded', res.status);
  });

  // learner-model-svc updateWithOutcome
  const lmPromise = fetch(`${learnerModelSvcUrl}/api/v1/learner-model/${learnerId}/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillId,
      correct,
      responseTime: input.result.timeSpent ?? 0,
      activityId: input.activityId,
    }),
    signal: AbortSignal.timeout(5_000),
  }).then((res) => {
    if (!res.ok) console.warn('[bkt-update] learner-model-svc responded', res.status);
  });

  await Promise.allSettled([bktPromise, lmPromise]);
}

/**
 * W4: Re-optimise learning path when mastery crosses critical thresholds.
 */
async function triggerPathReOptimization(
  learnerId: string,
  tenantId: string,
  crossings: {
    skillId: string;
    direction: 'struggling' | 'mastered';
    previous: number;
    current: number;
  }[]
): Promise<void> {
  const pathRecord = await prisma.learningPath.findFirst({
    where: { learnerId, tenantId, status: 'ACTIVE' },
    include: { progress: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!pathRecord) return;

  const currentPath = {
    id: pathRecord.id,
    learnerId: pathRecord.learnerId,
    tenantId: pathRecord.tenantId,
    name: pathRecord.name,
    description: pathRecord.description ?? '',
    activities: (pathRecord.activities as any) ?? { orderedActivities: [], branchingPoints: [] },
    estimatedTotalDuration: pathRecord.estimatedDuration,
    progress: pathRecord.progress
      ? {
          completedActivityIds: pathRecord.progress.completedActivityIds as string[],
          currentActivityId: pathRecord.progress.currentActivityId ?? undefined,
          totalProgress: pathRecord.progress.totalProgress,
          estimatedTimeRemaining: pathRecord.progress.estimatedTimeRemaining,
          lastActivityAt: pathRecord.progress.lastActivityAt ?? undefined,
        }
      : {
          completedActivityIds: [],
          totalProgress: 0,
          estimatedTimeRemaining: pathRecord.estimatedDuration,
        },
    createdAt: pathRecord.createdAt,
    updatedAt: pathRecord.updatedAt,
  };

  const learnerProgress = {
    totalActivitiesCompleted: currentPath.progress.completedActivityIds.length,
    recentScores: [],
    streak: 0,
    lastActivityDate: currentPath.progress.lastActivityAt ?? null,
  };

  const optimizationReason = crossings
    .map((c) => `${c.skillId}: ${c.direction} (${c.previous}→${c.current})`)
    .join('; ');

  console.info('[threshold-crossing] Re-optimising path', {
    learnerId,
    pathId: pathRecord.id,
    crossings,
  });

  const optimizedPath = await pathOptimizer.optimizePath(currentPath, learnerProgress, []);

  // Persist optimised activities back
  await prisma.learningPath.update({
    where: { id: pathRecord.id },
    data: {
      activities: optimizedPath.activities ?? currentPath.activities,
      metadata: {
        ...((pathRecord.metadata as Record<string, unknown>) ?? {}),
        lastOptimizationReason: optimizationReason,
        lastOptimizedAt: new Date().toISOString(),
        thresholdCrossings: crossings,
      },
    },
  });

  console.info('[threshold-crossing] Path re-optimised', { learnerId, pathId: pathRecord.id });
}

/**
 * S11: Fire-and-forget RL reward signal after activity completion.
 *
 * Sends outcome data to rl-tutoring-svc so the Q-learner can update
 * its policy with real learning evidence.
 */
async function fireRlRewardSignal(
  learnerId: string,
  activity: { id: string; skillIds: string[] },
  input: { activityId: string; result: { score?: number; timeSpent?: number; success?: boolean } },
  masteryUpdates: any[]
): Promise<void> {
  const rlUrl = config.services.rlTutoring;

  const averageMastery =
    masteryUpdates.length > 0
      ? masteryUpdates.reduce((sum, u) => sum + (u.masteryLevel ?? 50), 0) / masteryUpdates.length
      : 50;

  const knowledgeState: Record<string, number> = {};
  for (const u of masteryUpdates) {
    if (u.skillId) knowledgeState[u.skillId] = (u.masteryLevel ?? 50) / 100;
  }

  await fetch(`${rlUrl}/api/v1/reward/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      learner_id: learnerId,
      state: {
        knowledge_state: knowledgeState,
        recent_performance: [(input.result.score ?? 50) / 100],
        engagement_level: 0.7,
        time_in_session: input.result.timeSpent ?? 0,
      },
      action_taken: {
        action_type: 'practice',
        content_id: input.activityId,
      },
      outcome: {
        correctness: input.result.success ? 1.0 : (input.result.score ?? 50) / 100,
        time: input.result.timeSpent ?? 0,
        engagement: 0.7,
      },
      done: false,
    }),
    signal: AbortSignal.timeout(3_000),
  }).then((res) => {
    if (!res.ok) console.warn('[rl-reward] rl-tutoring-svc responded', res.status);
  });
}

export { learningRoutes };
