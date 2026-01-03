/**
 * Goal Routes
 *
 * REST endpoints for managing goals and objectives.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  CreateGoalSchema,
  UpdateGoalSchema,
  CreateObjectiveSchema,
  UpdateObjectiveSchema,
  GoalFiltersSchema,
} from '../schemas/goal.schemas.js';
import * as goalService from '../services/goalService.js';

interface AuthUser {
  userId: string;
  tenantId: string;
  role: string;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Extract tenant context
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  // In production, these come from auth middleware
  const tenantId = request.headers['x-tenant-id'] as string || request.user?.tenantId;
  const userId = request.headers['x-user-id'] as string || request.user?.userId;

  if (!tenantId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId: userId || 'system' };
}

export async function registerGoalRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // GOAL ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /goals
   * Create a new goal
   */
  fastify.post(
    '/goals',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const body = CreateGoalSchema.parse({
        ...request.body as object,
        tenantId: ctx.tenantId,
        createdByUserId: ctx.userId,
      }) as Parameters<typeof goalService.createGoal>[0];

      const goal = await goalService.createGoal(body);

      fastify.log.info({ goalId: goal.id, tenantId: ctx.tenantId }, 'Goal created');

      return reply.status(201).send({ data: goal });
    }
  );

  /**
   * GET /goals
   * List goals with filters
   */
  fastify.get(
    '/goals',
    async (
      request: FastifyRequest<{
        Querystring: {
          learnerId?: string;
          status?: string;
          domain?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId, status, domain, page, pageSize } = request.query;

      const result = await goalService.listGoals(
        {
          tenantId: ctx.tenantId,
          learnerId,
          status: status as any,
          domain: domain as any,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        }
      );

      return reply.send(result);
    }
  );

  /**
   * GET /goals/:goalId
   * Get a specific goal with objectives
   */
  fastify.get(
    '/goals/:goalId',
    async (
      request: FastifyRequest<{ Params: { goalId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { goalId } = request.params;

      const goal = await goalService.getGoalById(goalId, ctx.tenantId);

      if (!goal) {
        return reply.status(404).send({ error: 'Goal not found' });
      }

      return reply.send({ data: goal });
    }
  );

  /**
   * PATCH /goals/:goalId
   * Update a goal
   */
  fastify.patch(
    '/goals/:goalId',
    async (
      request: FastifyRequest<{ Params: { goalId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { goalId } = request.params;
      const body = UpdateGoalSchema.parse(request.body);

      const goal = await goalService.updateGoal(goalId, ctx.tenantId, body);

      if (!goal) {
        return reply.status(404).send({ error: 'Goal not found' });
      }

      fastify.log.info({ goalId, tenantId: ctx.tenantId }, 'Goal updated');

      return reply.send({ data: goal });
    }
  );

  /**
   * DELETE /goals/:goalId
   * Delete a goal
   */
  fastify.delete(
    '/goals/:goalId',
    async (
      request: FastifyRequest<{ Params: { goalId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { goalId } = request.params;

      const deleted = await goalService.deleteGoal(goalId, ctx.tenantId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Goal not found' });
      }

      fastify.log.info({ goalId, tenantId: ctx.tenantId }, 'Goal deleted');

      return reply.status(204).send();
    }
  );

  /**
   * POST /goals/:goalId/complete
   * Mark a goal as completed
   */
  fastify.post(
    '/goals/:goalId/complete',
    async (
      request: FastifyRequest<{ Params: { goalId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { goalId } = request.params;

      const goal = await goalService.completeGoal(goalId, ctx.tenantId);

      if (!goal) {
        return reply.status(404).send({ error: 'Goal not found' });
      }

      fastify.log.info({ goalId, tenantId: ctx.tenantId }, 'Goal completed');

      return reply.send({ data: goal });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // OBJECTIVE ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /goals/:goalId/objectives
   * Create a new objective for a goal
   */
  fastify.post(
    '/goals/:goalId/objectives',
    async (
      request: FastifyRequest<{ Params: { goalId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { goalId } = request.params;
      const body = CreateObjectiveSchema.parse({
        ...request.body as object,
        goalId,
      }) as Parameters<typeof goalService.createObjective>[0];

      const objective = await goalService.createObjective(body, ctx.tenantId);

      if (!objective) {
        return reply.status(404).send({ error: 'Goal not found' });
      }

      fastify.log.info({ objectiveId: objective.id, goalId, tenantId: ctx.tenantId }, 'Objective created');

      return reply.status(201).send({ data: objective });
    }
  );

  /**
   * PATCH /objectives/:objectiveId
   * Update an objective
   */
  fastify.patch(
    '/objectives/:objectiveId',
    async (
      request: FastifyRequest<{ Params: { objectiveId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { objectiveId } = request.params;
      const body = UpdateObjectiveSchema.parse(request.body);

      const objective = await goalService.updateObjective(objectiveId, ctx.tenantId, body);

      if (!objective) {
        return reply.status(404).send({ error: 'Objective not found' });
      }

      fastify.log.info({ objectiveId, tenantId: ctx.tenantId }, 'Objective updated');

      return reply.send({ data: objective });
    }
  );

  /**
   * DELETE /objectives/:objectiveId
   * Delete an objective
   */
  fastify.delete(
    '/objectives/:objectiveId',
    async (
      request: FastifyRequest<{ Params: { objectiveId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { objectiveId } = request.params;

      const deleted = await goalService.deleteObjective(objectiveId, ctx.tenantId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Objective not found' });
      }

      fastify.log.info({ objectiveId, tenantId: ctx.tenantId }, 'Objective deleted');

      return reply.status(204).send();
    }
  );

  /**
   * POST /objectives/:objectiveId/met
   * Mark an objective as met
   */
  fastify.post(
    '/objectives/:objectiveId/met',
    async (
      request: FastifyRequest<{ Params: { objectiveId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { objectiveId } = request.params;

      const objective = await goalService.markObjectiveMet(objectiveId, ctx.tenantId);

      if (!objective) {
        return reply.status(404).send({ error: 'Objective not found' });
      }

      fastify.log.info({ objectiveId, tenantId: ctx.tenantId }, 'Objective marked as met');

      return reply.send({ data: objective });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // LEARNER SUMMARY
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /learners/:learnerId/goals/summary
   * Get goal summary for a learner
   */
  fastify.get(
    '/learners/:learnerId/goals/summary',
    async (
      request: FastifyRequest<{ Params: { learnerId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;

      const summary = await goalService.getLearnerGoalSummary(ctx.tenantId, learnerId);

      return reply.send({ data: summary });
    }
  );
}
