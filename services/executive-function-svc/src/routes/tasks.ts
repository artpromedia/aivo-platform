/**
 * Executive Function Tasks Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ExecutiveFunctionService } from '../services/ef.service.js';
import { prisma } from '../db.js';

const service = new ExecutiveFunctionService(prisma);

const createTaskSchema = z.object({
  learnerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  parentTaskId: z.string().uuid().optional(),
  estimatedMin: z.number().int().positive().optional(),
  dueAt: z.string().datetime().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  rewardXp: z.number().int().min(0).optional(),
});

const checkInSchema = z.object({
  update: z.string().min(1),
  feelingRating: z.number().int().min(1).max(5).optional(),
  minutesWorked: z.number().int().min(0).optional(),
  blockers: z.string().optional(),
  nextStep: z.string().optional(),
});

const breakdownSchema = z.object({
  taskDescription: z.string().min(1),
  maxSubtasks: z.number().int().min(2).max(10).optional(),
  preferredChunkMin: z.number().int().min(5).max(60).optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const tasksRoutes: FastifyPluginAsync = async (app) => {
  // Create a task
  app.post<{ Body: z.infer<typeof createTaskSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createTaskSchema.parse(request.body);

    const task = await service.createTask(user.tenantId, {
      ...body,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    });

    return reply.code(201).send(task);
  });

  // Get tasks for a learner
  app.get<{ Querystring: { learnerId: string; status?: string; parentTaskId?: string; includeSubtasks?: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId, status, parentTaskId, includeSubtasks } = request.query;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const tasks = await service.getTasks(user.tenantId, learnerId, {
        status: status as any,
        parentTaskId: parentTaskId === 'null' ? null : parentTaskId,
        includeSubtasks: includeSubtasks === 'true',
      });

      return reply.send({ tasks });
    }
  );

  // Get active tasks (respecting max visible)
  app.get<{ Params: { learnerId: string } }>(
    '/active/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;

      const tasks = await service.getActiveTasks(user.tenantId, learnerId);
      return reply.send({ tasks });
    }
  );

  // Update a task
  app.patch<{ Params: { taskId: string }; Body: Partial<z.infer<typeof createTaskSchema>> }>(
    '/:taskId',
    async (request, reply) => {
      const { taskId } = request.params;

      try {
        const task = await service.updateTask(taskId, request.body);
        return reply.send(task);
      } catch (error) {
        return reply.code(404).send({ error: 'Task not found' });
      }
    }
  );

  // Start a task
  app.post<{ Params: { taskId: string } }>(
    '/:taskId/start',
    async (request, reply) => {
      const { taskId } = request.params;

      try {
        const task = await service.startTask(taskId);
        return reply.send(task);
      } catch (error) {
        return reply.code(404).send({ error: 'Task not found' });
      }
    }
  );

  // Complete a task
  app.post<{ Params: { taskId: string }; Body: { actualMin?: number } }>(
    '/:taskId/complete',
    async (request, reply) => {
      const { taskId } = request.params;
      const { actualMin } = request.body || {};

      try {
        const task = await service.completeTask(taskId, actualMin);
        return reply.send(task);
      } catch (error) {
        return reply.code(404).send({ error: 'Task not found' });
      }
    }
  );

  // Block a task
  app.post<{ Params: { taskId: string }; Body: { reason: string } }>(
    '/:taskId/block',
    async (request, reply) => {
      const { taskId } = request.params;
      const { reason } = request.body;

      if (!reason) {
        return reply.code(400).send({ error: 'reason is required' });
      }

      try {
        const task = await service.blockTask(taskId, reason);
        return reply.send(task);
      } catch (error) {
        return reply.code(404).send({ error: 'Task not found' });
      }
    }
  );

  // Skip a task
  app.post<{ Params: { taskId: string } }>(
    '/:taskId/skip',
    async (request, reply) => {
      const { taskId } = request.params;

      try {
        const task = await service.skipTask(taskId);
        return reply.send(task);
      } catch (error) {
        return reply.code(404).send({ error: 'Task not found' });
      }
    }
  );

  // Add check-in
  app.post<{ Params: { taskId: string }; Body: z.infer<typeof checkInSchema> }>(
    '/:taskId/check-in',
    async (request, reply) => {
      const { taskId } = request.params;
      const body = checkInSchema.parse(request.body);

      try {
        const checkIn = await service.addCheckIn(taskId, body);
        return reply.code(201).send(checkIn);
      } catch (error) {
        return reply.code(404).send({ error: 'Task not found' });
      }
    }
  );

  // Reorder tasks
  app.post<{ Body: { taskIds: string[] } }>(
    '/reorder',
    async (request, reply) => {
      const { taskIds } = request.body;

      if (!taskIds || !Array.isArray(taskIds)) {
        return reply.code(400).send({ error: 'taskIds array is required' });
      }

      await service.reorderTasks(taskIds);
      return reply.send({ success: true });
    }
  );

  // AI Task Breakdown
  app.post<{ Body: z.infer<typeof breakdownSchema> & { learnerId: string } }>(
    '/breakdown',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId, taskDescription, maxSubtasks, preferredChunkMin } = request.body;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const breakdown = await service.breakdownTask(user.tenantId, learnerId, taskDescription, {
        maxSubtasks,
        preferredChunkMin,
      });

      return reply.send(breakdown);
    }
  );

  // Create tasks from breakdown
  app.post<{ Params: { taskId: string }; Body: { subtasks: any[] } }>(
    '/:taskId/create-subtasks',
    async (request, reply) => {
      const user = getUser(request);
      const { taskId } = request.params;
      const { subtasks } = request.body;

      // Get the parent task to get learnerId
      const tasks = await service.getTasks(user.tenantId, '', { parentTaskId: taskId });
      const parentTask = tasks[0];

      if (!parentTask) {
        return reply.code(404).send({ error: 'Parent task not found' });
      }

      const createdTasks = await service.createTasksFromBreakdown(
        user.tenantId,
        parentTask.learnerId,
        taskId,
        subtasks
      );

      return reply.code(201).send({ tasks: createdTasks });
    }
  );
};
