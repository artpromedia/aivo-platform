/**
 * Goal Routes
 *
 * REST endpoints for managing goals and objectives.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ForbiddenError } from '../middleware/errorHandler.js';
import {
  ensureCanReadLearner,
  ensureCanWriteLearner,
  getTenantIdForQuery,
} from '../middleware/rbac.js';
import {
  createGoalSchema,
  updateGoalSchema,
  goalQuerySchema,
  createObjectiveSchema,
  updateObjectiveSchema,
  learnerIdParamSchema,
  goalIdParamSchema,
  objectiveIdParamSchema,
} from '../schemas/index.js';
import {
  createGoal,
  listGoals,
  getGoalById,
  updateGoal,
  createObjective,
  getObjectiveById,
  updateObjective,
} from '../services/goalService.js';
import type {
  AuthUser,
  GoalDomain,
  GoalStatus,
  ObjectiveStatus,
  ProgressRating,
} from '../types/index.js';

export async function registerGoalRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // GOAL ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /learners/:learnerId/goals
   * List goals for a learner
   */
  fastify.get(
    '/learners/:learnerId/goals',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: { status?: string; domain?: string; page?: string; pageSize?: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const query = goalQuerySchema.parse(request.query);

      // RBAC check
      await ensureCanReadLearner(request, learnerId);

      const result = await listGoals({
        tenantId: user.tenantId,
        learnerId,
        status: query.status,
        domain: query.domain,
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.send({
        data: result.goals,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize),
        },
      });
    }
  );

  /**
   * POST /learners/:learnerId/goals
   * Create a new goal for a learner
   */
  fastify.post(
    '/learners/:learnerId/goals',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const body = createGoalSchema.parse(request.body);

      // RBAC check
      await ensureCanWriteLearner(request, learnerId);

      const goal = await createGoal({
        tenantId: user.tenantId,
        learnerId,
        createdByUserId: user.userId,
        title: body.title,
        description: body.description,
        domain: body.domain,
        skillId: body.skillId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        metadataJson: body.metadataJson,
      });

      return reply.status(201).send(goal);
    }
  );

  /**
   * GET /goals/:goalId
   * Get a specific goal
   */
  fastify.get(
    '/goals/:goalId',
    async (
      request: FastifyRequest<{
        Params: { goalId: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { goalId } = goalIdParamSchema.parse(request.params);
      const tenantId = getTenantIdForQuery(user);

      const goal = await getGoalById(goalId, tenantId);

      // RBAC check via learner
      await ensureCanReadLearner(request, goal.learnerId);

      return reply.send(goal);
    }
  );

  /**
   * PATCH /goals/:goalId
   * Update a goal
   */
  fastify.patch(
    '/goals/:goalId',
    async (
      request: FastifyRequest<{
        Params: { goalId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { goalId } = goalIdParamSchema.parse(request.params);
      const body = updateGoalSchema.parse(request.body);
      const tenantId = getTenantIdForQuery(user);

      // Get goal to check learner access
      const existing = await getGoalById(goalId, tenantId);
      await ensureCanWriteLearner(request, existing.learnerId);

      const goal = await updateGoal(
        goalId,
        {
          title: body.title,
          description: body.description,
          status: body.status,
          targetDate:
            body.targetDate !== undefined
              ? body.targetDate
                ? new Date(body.targetDate)
                : null
              : undefined,
          progressRating: body.progressRating as ProgressRating | null | undefined,
          metadataJson: body.metadataJson,
        },
        tenantId
      );

      return reply.send(goal);
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
      request: FastifyRequest<{
        Params: { goalId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { goalId } = goalIdParamSchema.parse(request.params);
      const body = createObjectiveSchema.parse(request.body);
      const tenantId = getTenantIdForQuery(user);

      // Get goal to check learner access
      const goal = await getGoalById(goalId, tenantId);
      await ensureCanWriteLearner(request, goal.learnerId);

      const objective = await createObjective(
        {
          goalId,
          description: body.description,
          successCriteria: body.successCriteria,
          orderIndex: body.orderIndex,
        },
        tenantId
      );

      return reply.status(201).send(objective);
    }
  );

  /**
   * GET /goal-objectives/:objectiveId
   * Get a specific objective
   */
  fastify.get(
    '/goal-objectives/:objectiveId',
    async (
      request: FastifyRequest<{
        Params: { objectiveId: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { objectiveId } = objectiveIdParamSchema.parse(request.params);
      const tenantId = getTenantIdForQuery(user);

      const objective = await getObjectiveById(objectiveId, tenantId);

      // RBAC: Need to get goal to check learner
      const goal = await getGoalById(objective.goalId, tenantId);
      await ensureCanReadLearner(request, goal.learnerId);

      return reply.send(objective);
    }
  );

  /**
   * PATCH /goal-objectives/:objectiveId
   * Update an objective
   */
  fastify.patch(
    '/goal-objectives/:objectiveId',
    async (
      request: FastifyRequest<{
        Params: { objectiveId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { objectiveId } = objectiveIdParamSchema.parse(request.params);
      const body = updateObjectiveSchema.parse(request.body);
      const tenantId = getTenantIdForQuery(user);

      // Get objective and goal to check learner access
      const existing = await getObjectiveById(objectiveId, tenantId);
      const goal = await getGoalById(existing.goalId, tenantId);
      await ensureCanWriteLearner(request, goal.learnerId);

      const objective = await updateObjective(
        objectiveId,
        {
          description: body.description,
          successCriteria: body.successCriteria,
          status: body.status,
          progressRating: body.progressRating as ProgressRating | null | undefined,
        },
        tenantId
      );

      return reply.send(objective);
    }
  );
}
