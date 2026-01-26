import { Router, Request, Response, NextFunction } from 'express';
import { LearningPathOptimizer } from '../learning/learning-path-optimizer.js';
import { ActivitySequencer } from '../learning/activity-sequencer.js';
import { MasteryTracker } from '../learning/mastery-tracker.js';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { getContext } from '../middleware/auth.js';
import {
  CompleteActivitySchema,
  MasteryEvidenceSchema,
  SequencingConstraintsSchema,
  ActivitySchema,
  LearningGoalSchema,
} from '../validators/index.js';
import { prisma } from '../prisma.js';
import { z } from 'zod';

const router = Router();

// Initialize components
const pathOptimizer = new LearningPathOptimizer();
const activitySequencer = new ActivitySequencer();
const masteryTracker = new MasteryTracker();
const cognitiveManager = new CognitiveLoadManager();

/**
 * Get next recommended activity for a learner
 * GET /api/v1/brain/learners/:learnerId/next-activity
 */
router.get(
  '/learners/:learnerId/next-activity',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;

      // Get cognitive state
      const cognitiveState = await cognitiveManager.assessCurrentLoad(learnerId, []);

      // Get available activities from current learning path
      const currentPath = await prisma.learningPath.findFirst({
        where: {
          learnerId,
          tenantId,
        },
        include: { progress: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!currentPath) {
        res.json({
          success: true,
          data: null,
          message: 'No active learning path found',
        });
        return;
      }

      // Parse activities from path (stored as JSON)
      const activities = (currentPath.activities as any)?.orderedActivities ?? [];
      const completedIds = new Set(currentPath.progress?.completedActivityIds ?? []);

      // Filter to available activities
      const availableActivities = activities
        .filter((a: any) => !completedIds.has(a.activity.id))
        .map((a: any) => a.activity);

      if (availableActivities.length === 0) {
        res.json({
          success: true,
          data: null,
          message: 'All activities completed',
        });
        return;
      }

      // Get recommendation
      const recommendation = await cognitiveManager.recommendNextActivity(
        learnerId,
        availableActivities,
        cognitiveState
      );

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Complete an activity and record results
 * POST /api/v1/brain/learners/:learnerId/complete-activity
 */
router.post(
  '/learners/:learnerId/complete-activity',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;
      const input = CompleteActivitySchema.parse(req.body);

      // Get activity details
      const activity = await getActivityDetails(input.activityId);

      if (!activity) {
        res.status(404).json({
          success: false,
          error: 'Activity not found',
        });
        return;
      }

      // Update mastery for each skill in the activity
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

      // Update learning path progress
      await prisma.learningPathProgress.updateMany({
        where: {
          path: { learnerId, tenantId },
        },
        data: {
          completedActivityIds: {
            push: input.activityId,
          },
          lastActivityAt: new Date(),
        },
      });

      // Get next steps
      const nextActivity = await getNextActivityForLearner(learnerId, tenantId);
      const masterySummary = await masteryTracker.getMasterySummary(learnerId);

      res.json({
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
                progress: masterySummary.masteredSkills / Math.max(1, masterySummary.totalSkills) * 100,
              },
            ],
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get learning path for a learner
 * GET /api/v1/brain/learners/:learnerId/learning-path
 */
router.get(
  '/learners/:learnerId/learning-path',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;

      const path = await prisma.learningPath.findFirst({
        where: { learnerId, tenantId },
        include: { progress: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!path) {
        res.status(404).json({
          success: false,
          error: 'No learning path found for learner',
        });
        return;
      }

      res.json({
        success: true,
        data: path,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Optimize learning path
 * POST /api/v1/brain/learners/:learnerId/optimize-path
 */
router.post(
  '/learners/:learnerId/optimize-path',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;

      const goalsInput = req.body.goals
        ? z.array(LearningGoalSchema).parse(req.body.goals)
        : [];

      // Get current path
      const pathRecord = await prisma.learningPath.findFirst({
        where: { learnerId, tenantId },
        include: { progress: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!pathRecord) {
        res.status(404).json({
          success: false,
          error: 'No learning path found to optimize',
        });
        return;
      }

      // Convert to LearningPath type
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

      // Get learner progress
      const learnerProgress = {
        totalActivitiesCompleted: currentPath.progress.completedActivityIds.length,
        recentScores: [],
        streak: 0,
        lastActivityDate: currentPath.progress.lastActivityAt ?? null,
      };

      // Optimize
      const optimizedPath = await pathOptimizer.optimizePath(
        currentPath,
        learnerProgress,
        goalsInput.map(g => ({ ...g, id: g.id ?? '' }))
      );

      res.json({
        success: true,
        data: optimizedPath,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get path adjustment suggestions
 * GET /api/v1/brain/paths/:pathId/suggestions
 */
router.get(
  '/paths/:pathId/suggestions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pathId } = req.params;

      // Get performance data (placeholder - would be calculated from actual data)
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

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Predict path completion
 * GET /api/v1/brain/paths/:pathId/completion-prediction
 */
router.get(
  '/paths/:pathId/completion-prediction',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pathId } = req.params;

      // Get learner profile (placeholder)
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

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Sequence activities
 * POST /api/v1/brain/sequence-activities
 */
router.post('/sequence-activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = z.array(ActivitySchema).parse(req.body.activities);
    const constraints = SequencingConstraintsSchema.parse(req.body.constraints ?? {});

    // Get learner profile (placeholder - would come from learner-model-svc)
    const learnerProfile = {
      id: req.body.learnerId ?? '',
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
      activities.map(a => ({
        ...a,
        description: a.description ?? '',
        prerequisites: a.prerequisites ?? [],
        metadata: a.metadata ?? {},
      })),
      constraints,
      learnerProfile
    );

    res.json({
      success: true,
      data: sequence,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get mastery state for a learner
 * GET /api/v1/brain/learners/:learnerId/mastery
 */
router.get(
  '/learners/:learnerId/mastery',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;
      const skillIds = (req.query.skillIds as string)?.split(',') ?? [];

      if (skillIds.length === 0) {
        // Return summary
        const summary = await masteryTracker.getMasterySummary(learnerId);
        res.json({
          success: true,
          data: summary,
        });
        return;
      }

      const masteryState = await masteryTracker.getMasteryState(learnerId, skillIds);

      res.json({
        success: true,
        data: {
          learnerId: masteryState.learnerId,
          skills: Object.fromEntries(masteryState.skills),
          lastUpdated: masteryState.lastUpdated,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update mastery with evidence
 * POST /api/v1/brain/learners/:learnerId/mastery
 */
router.post(
  '/learners/:learnerId/mastery',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;
      const evidence = MasteryEvidenceSchema.parse(req.body);

      const update = await masteryTracker.updateMastery(learnerId, evidence.skillId, evidence);

      res.json({
        success: true,
        data: update,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get skills needing review
 * GET /api/v1/brain/learners/:learnerId/review-needed
 */
router.get(
  '/learners/:learnerId/review-needed',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;

      const skillsNeedingReview = await masteryTracker.getSkillsNeedingReview(learnerId);

      res.json({
        success: true,
        data: skillsNeedingReview,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Predict mastery gain from an activity
 * POST /api/v1/brain/learners/:learnerId/predict-mastery-gain
 */
router.post(
  '/learners/:learnerId/predict-mastery-gain',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;
      const activity = ActivitySchema.parse(req.body.activity);

      // Get current mastery state
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

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      next(error);
    }
  }
);

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

async function getNextActivityForLearner(
  learnerId: string,
  tenantId: string
): Promise<any | null> {
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

export { router as learningRoutes };
