import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
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

async function learningRoutes(app: FastifyInstance) {
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
      for (const skillId of activity.skillIds) {
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
      }

      await prisma.learningPathProgress.updateMany({
        where: { path: { learnerId, tenantId } },
        data: {
          completedActivityIds: { push: input.activityId },
          lastActivityAt: new Date(),
        },
      });

      const nextActivity = await getNextActivityForLearner(learnerId, tenantId);
      const masterySummary = await masteryTracker.getMasterySummary(learnerId);

      return {
        success: true,
        data: {
          masteryUpdates,
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

      const performanceData = {
        learnerId: '',
        period: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        activitiesCompleted: 10,
        averageScore: 75,
        averageTimePerActivity: 20,
        masteryGrowth: 8,
        engagementTrend: 'stable' as const,
      };

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

export { learningRoutes };
