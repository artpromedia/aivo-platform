/**
 * Action Plan Task Routes
 * Epic 15: Caregiver Collaboration
 *
 * Manages tasks within action plans.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  CreateActionPlanTaskSchema,
  UpdateActionPlanTaskSchema,
  ActionPlanTaskQuerySchema,
  CreateTaskCompletionSchema,
  UpdateTaskCompletionSchema,
  TaskCompletionQuerySchema,
  ActionPlanParamsSchema,
  ActionPlanTaskParamsSchema,
  TaskCompletionParamsSchema,
} from '../schemas/index.js';
import { z } from 'zod';

type CreateTaskBody = z.infer<typeof CreateActionPlanTaskSchema>;
type UpdateTaskBody = z.infer<typeof UpdateActionPlanTaskSchema>;
type TaskQuery = z.infer<typeof ActionPlanTaskQuerySchema>;
type CreateCompletionBody = z.infer<typeof CreateTaskCompletionSchema>;
type UpdateCompletionBody = z.infer<typeof UpdateTaskCompletionSchema>;
type CompletionQuery = z.infer<typeof TaskCompletionQuerySchema>;
type ActionPlanParams = z.infer<typeof ActionPlanParamsSchema>;
type TaskParams = z.infer<typeof ActionPlanTaskParamsSchema>;
type CompletionParams = z.infer<typeof TaskCompletionParamsSchema>;

export async function actionPlanTaskRoutes(fastify: FastifyInstance) {
  /**
   * GET /learners/:learnerId/action-plans/:planId/tasks
   * List all tasks for an action plan
   */
  fastify.get<{
    Params: ActionPlanParams;
    Querystring: TaskQuery;
  }>('/learners/:learnerId/action-plans/:planId/tasks', async (request, reply) => {
    const params = ActionPlanParamsSchema.parse(request.params);
    const query = ActionPlanTaskQuerySchema.parse(request.query);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    // Verify action plan exists and belongs to learner/tenant
    const plan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    const where = {
      actionPlanId: params.planId,
      ...(query.context && { context: query.context }),
      ...(query.frequency && { frequency: query.frequency }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.assigneeId && { assigneeId: query.assigneeId }),
    };

    const [tasks, total] = await Promise.all([
      prisma.actionPlanTask.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          assignee: {
            select: {
              id: true,
              displayName: true,
              role: true,
            },
          },
          _count: {
            select: { completions: true },
          },
        },
      }),
      prisma.actionPlanTask.count({ where }),
    ]);

    return reply.send({
      data: tasks,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * GET /learners/:learnerId/action-plans/:planId/tasks/:taskId
   * Get a specific task
   */
  fastify.get<{
    Params: TaskParams;
  }>('/learners/:learnerId/action-plans/:planId/tasks/:taskId', async (request, reply) => {
    const params = ActionPlanTaskParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    // Verify plan exists
    const plan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    const task = await prisma.actionPlanTask.findFirst({
      where: {
        id: params.taskId,
        actionPlanId: params.planId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            displayName: true,
            role: true,
            title: true,
          },
        },
        completions: {
          orderBy: { dueDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ data: task });
  });

  /**
   * POST /learners/:learnerId/action-plans/:planId/tasks
   * Create a new task
   */
  fastify.post<{
    Params: ActionPlanParams;
    Body: CreateTaskBody;
  }>('/learners/:learnerId/action-plans/:planId/tasks', async (request, reply) => {
    const params = ActionPlanParamsSchema.parse(request.params);
    const body = CreateActionPlanTaskSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    // Verify plan exists
    const plan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    // If assigneeId provided, verify they're on the care team
    if (body.assigneeId) {
      const assignee = await prisma.careTeamMember.findFirst({
        where: {
          id: body.assigneeId,
          tenantId,
          learnerId: params.learnerId,
          isActive: true,
        },
      });

      if (!assignee) {
        return reply.status(400).send({ error: 'Assignee is not an active care team member' });
      }
    }

    // Get max sortOrder
    const maxSort = await prisma.actionPlanTask.aggregate({
      where: { actionPlanId: params.planId },
      _max: { sortOrder: true },
    });

    const task = await prisma.actionPlanTask.create({
      data: {
        actionPlanId: params.planId,
        title: body.title,
        description: body.description,
        context: body.context,
        frequency: body.frequency,
        timeOfDay: body.timeOfDay,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        assigneeId: body.assigneeId,
        supports: body.supports,
        successCriteria: body.successCriteria,
        implementationNotes: body.implementationNotes,
      },
      include: {
        assignee: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Publish NATS event for task created

    return reply.status(201).send({ data: task });
  });

  /**
   * PATCH /learners/:learnerId/action-plans/:planId/tasks/:taskId
   * Update a task
   */
  fastify.patch<{
    Params: TaskParams;
    Body: UpdateTaskBody;
  }>('/learners/:learnerId/action-plans/:planId/tasks/:taskId', async (request, reply) => {
    const params = ActionPlanTaskParamsSchema.parse(request.params);
    const body = UpdateActionPlanTaskSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    // Verify plan exists
    const plan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    const existingTask = await prisma.actionPlanTask.findFirst({
      where: {
        id: params.taskId,
        actionPlanId: params.planId,
      },
    });

    if (!existingTask) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // If assigneeId changing, verify new assignee
    if (body.assigneeId) {
      const assignee = await prisma.careTeamMember.findFirst({
        where: {
          id: body.assigneeId,
          tenantId,
          learnerId: params.learnerId,
          isActive: true,
        },
      });

      if (!assignee) {
        return reply.status(400).send({ error: 'Assignee is not an active care team member' });
      }
    }

    const task = await prisma.actionPlanTask.update({
      where: { id: params.taskId },
      data: body,
      include: {
        assignee: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Publish NATS event for task updated

    return reply.send({ data: task });
  });

  /**
   * DELETE /learners/:learnerId/action-plans/:planId/tasks/:taskId
   * Deactivate a task (soft delete)
   */
  fastify.delete<{
    Params: TaskParams;
  }>('/learners/:learnerId/action-plans/:planId/tasks/:taskId', async (request, reply) => {
    const params = ActionPlanTaskParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const plan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    const existingTask = await prisma.actionPlanTask.findFirst({
      where: {
        id: params.taskId,
        actionPlanId: params.planId,
      },
    });

    if (!existingTask) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const task = await prisma.actionPlanTask.update({
      where: { id: params.taskId },
      data: { isActive: false },
    });

    // TODO: Publish NATS event for task deactivated

    return reply.send({ data: task });
  });

  // =========================================================================
  // TASK COMPLETION ROUTES
  // =========================================================================

  /**
   * GET /learners/:learnerId/action-plans/:planId/tasks/:taskId/completions
   * List completions for a task
   */
  fastify.get<{
    Params: TaskParams;
    Querystring: CompletionQuery;
  }>(
    '/learners/:learnerId/action-plans/:planId/tasks/:taskId/completions',
    async (request, reply) => {
      const params = ActionPlanTaskParamsSchema.parse(request.params);
      const query = TaskCompletionQuerySchema.parse(request.query);
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      // Verify task exists through the chain
      const task = await prisma.actionPlanTask.findFirst({
        where: {
          id: params.taskId,
          actionPlanId: params.planId,
          actionPlan: {
            tenantId,
            learnerId: params.learnerId,
          },
        },
      });

      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const where = {
        taskId: params.taskId,
        ...(query.status && { status: query.status }),
        ...(query.startDate && { dueDate: { gte: query.startDate } }),
        ...(query.endDate && { dueDate: { lte: query.endDate } }),
      };

      const [completions, total] = await Promise.all([
        prisma.taskCompletion.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { dueDate: 'desc' },
        }),
        prisma.taskCompletion.count({ where }),
      ]);

      return reply.send({
        data: completions,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    }
  );

  /**
   * POST /learners/:learnerId/action-plans/:planId/tasks/:taskId/completions
   * Record a task completion
   */
  fastify.post<{
    Params: TaskParams;
    Body: CreateCompletionBody;
  }>(
    '/learners/:learnerId/action-plans/:planId/tasks/:taskId/completions',
    async (request, reply) => {
      const params = ActionPlanTaskParamsSchema.parse(request.params);
      const body = CreateTaskCompletionSchema.parse(request.body);
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }
      if (!userId) {
        return reply.status(400).send({ error: 'Missing x-user-id header' });
      }

      const task = await prisma.actionPlanTask.findFirst({
        where: {
          id: params.taskId,
          actionPlanId: params.planId,
          actionPlan: {
            tenantId,
            learnerId: params.learnerId,
          },
        },
      });

      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const completion = await prisma.taskCompletion.create({
        data: {
          taskId: params.taskId,
          dueDate: body.dueDate,
          completedAt: body.completedAt,
          status: body.status,
          recordedByUserId: userId,
          notes: body.notes,
          completedInContext: body.completedInContext,
          effectivenessRating: body.effectivenessRating,
        },
      });

      // TODO: Publish NATS event for task completion recorded

      return reply.status(201).send({ data: completion });
    }
  );

  /**
   * PATCH /learners/:learnerId/action-plans/:planId/tasks/:taskId/completions/:completionId
   * Update a task completion
   */
  fastify.patch<{
    Params: CompletionParams;
    Body: UpdateCompletionBody;
  }>(
    '/learners/:learnerId/action-plans/:planId/tasks/:taskId/completions/:completionId',
    async (request, reply) => {
      const params = TaskCompletionParamsSchema.parse(request.params);
      const body = UpdateTaskCompletionSchema.parse(request.body);
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      // Verify through the chain
      const task = await prisma.actionPlanTask.findFirst({
        where: {
          id: params.taskId,
          actionPlanId: params.planId,
          actionPlan: {
            tenantId,
            learnerId: params.learnerId,
          },
        },
      });

      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const existingCompletion = await prisma.taskCompletion.findFirst({
        where: {
          id: params.completionId,
          taskId: params.taskId,
        },
      });

      if (!existingCompletion) {
        return reply.status(404).send({ error: 'Completion record not found' });
      }

      const completion = await prisma.taskCompletion.update({
        where: { id: params.completionId },
        data: body,
      });

      return reply.send({ data: completion });
    }
  );
}
