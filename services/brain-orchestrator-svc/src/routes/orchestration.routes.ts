import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { ServiceCoordinator } from '../coordination/service-coordinator.js';
import { getContext } from '../middleware/auth.js';
import { TaskDecomposer } from '../orchestration/task-decomposer.js';
import { TaskOrchestrator } from '../orchestration/task-orchestrator.js';
import { TaskPrioritizer } from '../orchestration/task-prioritizer.js';
import type { LearnerContext } from '../types/index.js';
import { CreateOrchestrationPlanSchema, AdjustmentReasonSchema } from '../validators/index.js';

// Initialize dependencies
const cognitiveManager = new CognitiveLoadManager();
const decomposer = new TaskDecomposer();
const prioritizer = new TaskPrioritizer();
const coordinator = new ServiceCoordinator();
const orchestrator = new TaskOrchestrator(decomposer, prioritizer, coordinator, cognitiveManager);

async function orchestrationRoutes(app: FastifyInstance) {
  /**
   * Create an orchestration plan for a learning goal
   * POST /api/v1/brain/orchestrate
   */
  app.post('/orchestrate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId: _userId } = getContext(request);
    const input = CreateOrchestrationPlanSchema.parse(request.body);

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

    reply.status(201);
    return { success: true, data: plan };
  });

  /**
   * Get current plan for a learner
   * GET /api/v1/brain/learners/:learnerId/plan
   */
  app.get(
    '/learners/:learnerId/plan',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;

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
        reply.status(404);
        return { success: false, error: 'No active plan found for learner' };
      }

      return { success: true, data: plan };
    }
  );

  /**
   * Start a plan
   * POST /api/v1/brain/plans/:planId/start
   */
  app.post(
    '/plans/:planId/start',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      const plan = await orchestrator.startPlan(planId);
      return { success: true, data: plan };
    }
  );

  /**
   * Adjust an existing plan
   * POST /api/v1/brain/plans/:planId/adjust
   */
  app.post(
    '/plans/:planId/adjust',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      const reason = AdjustmentReasonSchema.parse(request.body);
      const adjustedPlan = await orchestrator.adjustPlan(planId, reason);
      return { success: true, data: adjustedPlan };
    }
  );

  /**
   * Pause a plan
   * POST /api/v1/brain/plans/:planId/pause
   */
  app.post(
    '/plans/:planId/pause',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      await orchestrator.pausePlan(planId);
      return { success: true, message: 'Plan paused successfully' };
    }
  );

  /**
   * Resume a plan
   * POST /api/v1/brain/plans/:planId/resume
   */
  app.post(
    '/plans/:planId/resume',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      await orchestrator.resumePlan(planId);
      return { success: true, message: 'Plan resumed successfully' };
    }
  );

  /**
   * Cancel a plan
   * POST /api/v1/brain/plans/:planId/cancel
   */
  app.post(
    '/plans/:planId/cancel',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      await orchestrator.cancelPlan(planId);
      return { success: true, message: 'Plan cancelled successfully' };
    }
  );

  /**
   * Get next task for a plan
   * GET /api/v1/brain/plans/:planId/next-task
   */
  app.get(
    '/plans/:planId/next-task',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      const nextTask = await orchestrator.getNextTask(planId);

      if (!nextTask) {
        return { success: true, data: null, message: 'No more tasks available' };
      }

      return { success: true, data: nextTask };
    }
  );

  /**
   * Get plan progress
   * GET /api/v1/brain/plans/:planId/progress
   */
  app.get(
    '/plans/:planId/progress',
    async (request: FastifyRequest<{ Params: { planId: string } }>) => {
      const { planId } = request.params;
      const progress = await orchestrator.getPlanProgress(planId);
      return { success: true, data: progress };
    }
  );

  /**
   * Execute a specific task
   * POST /api/v1/brain/plans/:planId/tasks/:taskId/execute
   */
  app.post(
    '/plans/:planId/tasks/:taskId/execute',
    async (
      request: FastifyRequest<{ Params: { planId: string; taskId: string } }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = getContext(request);
      const { planId, taskId } = request.params;

      const { prisma } = await import('../prisma.js');
      const plan = await prisma.orchestrationPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        reply.status(404);
        return { success: false, error: 'Plan not found' };
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

      return { success: true, data: result };
    }
  );
}

export { orchestrationRoutes };
