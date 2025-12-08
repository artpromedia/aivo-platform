/**
 * Session Plan Routes
 *
 * REST endpoints for managing session plans and items.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ForbiddenError } from '../middleware/errorHandler.js';
import {
  ensureCanReadLearner,
  ensureCanWriteLearner,
  getTenantIdForQuery,
} from '../middleware/rbac.js';
import {
  createSessionPlanSchema,
  updateSessionPlanSchema,
  sessionPlanQuerySchema,
  createSessionPlanItemsSchema,
  learnerIdParamSchema,
  planIdParamSchema,
} from '../schemas/index.js';
import {
  createSessionPlan,
  listSessionPlans,
  getSessionPlanById,
  updateSessionPlan,
  replaceSessionPlanItems,
} from '../services/sessionPlanService.js';
import type { AuthUser, SessionPlanType, SessionPlanStatus } from '../types/index.js';

export async function registerSessionPlanRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLAN ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /learners/:learnerId/session-plans
   * List session plans for a learner
   */
  fastify.get(
    '/learners/:learnerId/session-plans',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: {
          status?: string;
          from?: string;
          to?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const query = sessionPlanQuerySchema.parse(request.query);

      // RBAC check
      await ensureCanReadLearner(request, learnerId);

      const result = await listSessionPlans({
        tenantId: user.tenantId,
        learnerId,
        status: query.status,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.send({
        data: result.sessionPlans,
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
   * POST /learners/:learnerId/session-plans
   * Create a new session plan for a learner
   */
  fastify.post(
    '/learners/:learnerId/session-plans',
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
      const body = createSessionPlanSchema.parse(request.body);

      // RBAC check
      await ensureCanWriteLearner(request, learnerId);

      const plan = await createSessionPlan({
        tenantId: user.tenantId,
        learnerId,
        createdByUserId: user.userId,
        sessionType: body.sessionType as SessionPlanType,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        templateName: body.templateName,
        goalIds: body.goalIds,
        estimatedDurationMinutes: body.estimatedDurationMinutes,
        metadataJson: body.metadataJson,
      });

      return reply.status(201).send(plan);
    }
  );

  /**
   * GET /session-plans/:planId
   * Get a specific session plan
   */
  fastify.get(
    '/session-plans/:planId',
    async (
      request: FastifyRequest<{
        Params: { planId: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { planId } = planIdParamSchema.parse(request.params);
      const tenantId = getTenantIdForQuery(user);

      const plan = await getSessionPlanById(planId, tenantId);

      // RBAC check via learner
      await ensureCanReadLearner(request, plan.learnerId);

      return reply.send(plan);
    }
  );

  /**
   * PATCH /session-plans/:planId
   * Update a session plan (e.g., status transitions)
   */
  fastify.patch(
    '/session-plans/:planId',
    async (
      request: FastifyRequest<{
        Params: { planId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { planId } = planIdParamSchema.parse(request.params);
      const body = updateSessionPlanSchema.parse(request.body);
      const tenantId = getTenantIdForQuery(user);

      // Get plan to check learner access
      const existing = await getSessionPlanById(planId, tenantId);
      await ensureCanWriteLearner(request, existing.learnerId);

      const plan = await updateSessionPlan(
        planId,
        {
          status: body.status,
          scheduledFor:
            body.scheduledFor !== undefined
              ? body.scheduledFor
                ? new Date(body.scheduledFor)
                : null
              : undefined,
          templateName: body.templateName,
          sessionId: body.sessionId,
          estimatedDurationMinutes: body.estimatedDurationMinutes,
          metadataJson: body.metadataJson,
        },
        tenantId
      );

      return reply.send(plan);
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLAN ITEMS ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /session-plans/:planId/items
   * Replace all items in a session plan
   */
  fastify.post(
    '/session-plans/:planId/items',
    async (
      request: FastifyRequest<{
        Params: { planId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { planId } = planIdParamSchema.parse(request.params);
      const items = createSessionPlanItemsSchema.parse(request.body);
      const tenantId = getTenantIdForQuery(user);

      // Get plan to check learner access
      const plan = await getSessionPlanById(planId, tenantId);
      await ensureCanWriteLearner(request, plan.learnerId);

      const createdItems = await replaceSessionPlanItems(planId, items, tenantId);

      return reply.status(201).send(createdItems);
    }
  );
}
