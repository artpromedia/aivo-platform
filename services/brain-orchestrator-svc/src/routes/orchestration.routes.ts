import { Router, Request, Response, NextFunction } from 'express';
import { TaskOrchestrator } from '../orchestration/task-orchestrator.js';
import { TaskDecomposer } from '../orchestration/task-decomposer.js';
import { TaskPrioritizer } from '../orchestration/task-prioritizer.js';
import { ServiceCoordinator } from '../coordination/service-coordinator.js';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { getContext } from '../middleware/auth.js';
import {
  CreateOrchestrationPlanSchema,
  AdjustmentReasonSchema,
} from '../validators/index.js';
import type { LearnerContext, SchedulingConstraints } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize dependencies
const cognitiveManager = new CognitiveLoadManager();
const decomposer = new TaskDecomposer();
const prioritizer = new TaskPrioritizer();
const coordinator = new ServiceCoordinator();
const orchestrator = new TaskOrchestrator(decomposer, prioritizer, coordinator, cognitiveManager);

/**
 * Create an orchestration plan for a learning goal
 * POST /api/v1/brain/orchestrate
 */
router.post('/orchestrate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = getContext(req);
    const input = CreateOrchestrationPlanSchema.parse(req.body);

    // Build learner context
    const cognitiveState = await cognitiveManager.assessCurrentLoad(input.learnerId, []);

    const learnerContext: LearnerContext = {
      learnerId: input.learnerId,
      tenantId,
      currentSession: {
        sessionId: uuidv4(),
        startedAt: new Date(),
        tasksCompleted: 0,
        totalTimeSpent: 0,
      },
      cognitiveState,
      preferences: {
        preferredSessionLength: 25,
        preferredBreakLength: 5,
        preferredDifficulty: 'adaptive',
        learningStyle: 'mixed',
        peakHours: [9, 10, 11, 14, 15, 16],
        avoidedActivityTypes: [],
      },
      constraints: {
        availableTimeMinutes: input.constraints?.availableTimeMinutes ?? 120,
        hardDeadlines: input.goal.deadline
          ? [{ taskId: 'goal', deadline: input.goal.deadline }]
          : [],
        requiredBreaks: input.constraints?.requiredBreaks ?? true,
        maxCognitiveLoad: input.constraints?.maxCognitiveLoad ?? 'high',
        excludedTimeSlots: input.constraints?.excludedTimeSlots,
      },
    };

    const plan = await orchestrator.orchestrate(
      { ...input.goal, id: input.goal.id ?? uuidv4() },
      learnerContext
    );

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get current plan for a learner
 * GET /api/v1/brain/learners/:learnerId/plan
 */
router.get('/learners/:learnerId/plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = getContext(req);
    const { learnerId } = req.params;

    const { prisma } = await import('../prisma.js');

    const plan = await prisma.orchestrationPlan.findFirst({
      where: {
        learnerId,
        tenantId,
        status: { in: ['draft', 'active', 'paused'] },
      },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'No active plan found for learner',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Start a plan
 * POST /api/v1/brain/plans/:planId/start
 */
router.post('/plans/:planId/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    const plan = await orchestrator.startPlan(planId);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Adjust an existing plan
 * POST /api/v1/brain/plans/:planId/adjust
 */
router.post('/plans/:planId/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;
    const reason = AdjustmentReasonSchema.parse(req.body);

    const adjustedPlan = await orchestrator.adjustPlan(planId, reason);

    res.json({
      success: true,
      data: adjustedPlan,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Pause a plan
 * POST /api/v1/brain/plans/:planId/pause
 */
router.post('/plans/:planId/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    await orchestrator.pausePlan(planId);

    res.json({
      success: true,
      message: 'Plan paused successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Resume a plan
 * POST /api/v1/brain/plans/:planId/resume
 */
router.post('/plans/:planId/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    await orchestrator.resumePlan(planId);

    res.json({
      success: true,
      message: 'Plan resumed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel a plan
 * POST /api/v1/brain/plans/:planId/cancel
 */
router.post('/plans/:planId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    await orchestrator.cancelPlan(planId);

    res.json({
      success: true,
      message: 'Plan cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get next task for a plan
 * GET /api/v1/brain/plans/:planId/next-task
 */
router.get('/plans/:planId/next-task', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    const nextTask = await orchestrator.getNextTask(planId);

    if (!nextTask) {
      res.json({
        success: true,
        data: null,
        message: 'No more tasks available',
      });
      return;
    }

    res.json({
      success: true,
      data: nextTask,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get plan progress
 * GET /api/v1/brain/plans/:planId/progress
 */
router.get('/plans/:planId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    const progress = await orchestrator.getPlanProgress(planId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Execute a specific task
 * POST /api/v1/brain/plans/:planId/tasks/:taskId/execute
 */
router.post(
  '/plans/:planId/tasks/:taskId/execute',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { planId, taskId } = req.params;

      // Build minimal learner context for execution
      const { prisma } = await import('../prisma.js');
      const plan = await prisma.orchestrationPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        res.status(404).json({
          success: false,
          error: 'Plan not found',
        });
        return;
      }

      const cognitiveState = await cognitiveManager.assessCurrentLoad(plan.learnerId, []);

      const learnerContext: LearnerContext = {
        learnerId: plan.learnerId,
        tenantId,
        currentSession: {
          sessionId: uuidv4(),
          startedAt: new Date(),
          tasksCompleted: 0,
          totalTimeSpent: 0,
        },
        cognitiveState,
        preferences: {
          preferredSessionLength: 25,
          preferredBreakLength: 5,
          preferredDifficulty: 'adaptive',
          learningStyle: 'mixed',
          peakHours: [9, 10, 11, 14, 15, 16],
          avoidedActivityTypes: [],
        },
        constraints: {
          availableTimeMinutes: 120,
          hardDeadlines: [],
          requiredBreaks: true,
          maxCognitiveLoad: 'high',
        },
      };

      const result = await orchestrator.executeTask(planId, taskId, learnerContext);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as orchestrationRoutes };
