/**
 * Session Plan Routes
 *
 * REST endpoints for managing session plans and items.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  CreateSessionPlanSchema,
  UpdateSessionPlanSchema,
  CreateSessionPlanItemSchema,
} from '../schemas/goal.schemas.js';
import * as sessionPlanService from '../services/sessionPlanService.js';

interface AuthUser {
  userId: string;
  tenantId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string || request.user?.tenantId;
  const userId = request.headers['x-user-id'] as string || request.user?.userId;

  if (!tenantId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId: userId || 'system' };
}

export async function registerSessionPlanRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLAN ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /session-plans
   * Create a new session plan
   */
  fastify.post(
    '/session-plans',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const body = CreateSessionPlanSchema.parse({
        ...request.body as object,
        tenantId: ctx.tenantId,
        createdByUserId: ctx.userId,
      }) as Parameters<typeof sessionPlanService.createSessionPlan>[0];

      const sessionPlan = await sessionPlanService.createSessionPlan(body);

      fastify.log.info({ sessionPlanId: sessionPlan.id, tenantId: ctx.tenantId }, 'Session plan created');

      return reply.status(201).send({ data: sessionPlan });
    }
  );

  /**
   * GET /session-plans
   * List session plans with filters
   */
  fastify.get(
    '/session-plans',
    async (
      request: FastifyRequest<{
        Querystring: {
          learnerId?: string;
          status?: string;
          sessionType?: string;
          scheduledFrom?: string;
          scheduledTo?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId, status, sessionType, scheduledFrom, scheduledTo, page, pageSize } = request.query;

      const result = await sessionPlanService.listSessionPlans(
        {
          tenantId: ctx.tenantId,
          learnerId,
          status: status as any,
          sessionType: sessionType as any,
          scheduledFrom: scheduledFrom ? new Date(scheduledFrom) : undefined,
          scheduledTo: scheduledTo ? new Date(scheduledTo) : undefined,
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
   * GET /session-plans/:planId
   * Get a specific session plan with items
   */
  fastify.get(
    '/session-plans/:planId',
    async (
      request: FastifyRequest<{ Params: { planId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;

      const sessionPlan = await sessionPlanService.getSessionPlanById(planId, ctx.tenantId);

      if (!sessionPlan) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      return reply.send({ data: sessionPlan });
    }
  );

  /**
   * PATCH /session-plans/:planId
   * Update a session plan
   */
  fastify.patch(
    '/session-plans/:planId',
    async (
      request: FastifyRequest<{ Params: { planId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;
      const body = UpdateSessionPlanSchema.parse(request.body);

      const sessionPlan = await sessionPlanService.updateSessionPlan(planId, ctx.tenantId, body);

      if (!sessionPlan) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ sessionPlanId: planId, tenantId: ctx.tenantId }, 'Session plan updated');

      return reply.send({ data: sessionPlan });
    }
  );

  /**
   * DELETE /session-plans/:planId
   * Delete a session plan
   */
  fastify.delete(
    '/session-plans/:planId',
    async (
      request: FastifyRequest<{ Params: { planId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;

      const deleted = await sessionPlanService.deleteSessionPlan(planId, ctx.tenantId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ sessionPlanId: planId, tenantId: ctx.tenantId }, 'Session plan deleted');

      return reply.status(204).send();
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLAN LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /session-plans/:planId/start
   * Start a session plan (transition to IN_PROGRESS)
   */
  fastify.post(
    '/session-plans/:planId/start',
    async (
      request: FastifyRequest<{ Params: { planId: string }; Body: { sessionId?: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;
      const { sessionId } = request.body || {};

      const sessionPlan = await sessionPlanService.startSessionPlan(planId, ctx.tenantId, sessionId);

      if (!sessionPlan) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ sessionPlanId: planId, tenantId: ctx.tenantId }, 'Session plan started');

      return reply.send({ data: sessionPlan });
    }
  );

  /**
   * POST /session-plans/:planId/complete
   * Complete a session plan
   */
  fastify.post(
    '/session-plans/:planId/complete',
    async (
      request: FastifyRequest<{ Params: { planId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;

      const sessionPlan = await sessionPlanService.completeSessionPlan(planId, ctx.tenantId);

      if (!sessionPlan) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ sessionPlanId: planId, tenantId: ctx.tenantId }, 'Session plan completed');

      return reply.send({ data: sessionPlan });
    }
  );

  /**
   * POST /session-plans/:planId/cancel
   * Cancel a session plan
   */
  fastify.post(
    '/session-plans/:planId/cancel',
    async (
      request: FastifyRequest<{ Params: { planId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;

      const sessionPlan = await sessionPlanService.cancelSessionPlan(planId, ctx.tenantId);

      if (!sessionPlan) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ sessionPlanId: planId, tenantId: ctx.tenantId }, 'Session plan cancelled');

      return reply.send({ data: sessionPlan });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLAN ITEMS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /session-plans/:planId/items
   * Add an item to a session plan
   */
  fastify.post(
    '/session-plans/:planId/items',
    async (
      request: FastifyRequest<{ Params: { planId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;
      const body = CreateSessionPlanItemSchema.parse(request.body) as Parameters<typeof sessionPlanService.addSessionPlanItem>[2];

      const item = await sessionPlanService.addSessionPlanItem(planId, ctx.tenantId, body);

      if (!item) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ itemId: item.id, sessionPlanId: planId, tenantId: ctx.tenantId }, 'Session plan item added');

      return reply.status(201).send({ data: item });
    }
  );

  /**
   * PUT /session-plans/:planId/items
   * Replace all items in a session plan
   */
  fastify.put(
    '/session-plans/:planId/items',
    async (
      request: FastifyRequest<{ Params: { planId: string }; Body: { items: unknown[] } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { planId } = request.params;
      const { items } = request.body;

      const parsedItems = items.map((item) => CreateSessionPlanItemSchema.parse(item)) as Parameters<typeof sessionPlanService.replaceSessionPlanItems>[2];

      const sessionPlan = await sessionPlanService.replaceSessionPlanItems(planId, ctx.tenantId, parsedItems);

      if (!sessionPlan) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      fastify.log.info({ sessionPlanId: planId, itemCount: parsedItems.length, tenantId: ctx.tenantId }, 'Session plan items replaced');

      return reply.send({ data: sessionPlan });
    }
  );

  /**
   * DELETE /session-plans/:planId/items/:itemId
   * Remove an item from a session plan
   */
  fastify.delete(
    '/session-plans/:planId/items/:itemId',
    async (
      request: FastifyRequest<{ Params: { planId: string; itemId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { itemId } = request.params;

      const deleted = await sessionPlanService.deleteSessionPlanItem(itemId, ctx.tenantId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Session plan item not found' });
      }

      fastify.log.info({ itemId, tenantId: ctx.tenantId }, 'Session plan item deleted');

      return reply.status(204).send();
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // UPCOMING SESSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /session-plans/upcoming
   * Get upcoming session plans
   */
  fastify.get(
    '/session-plans/upcoming',
    async (
      request: FastifyRequest<{
        Querystring: {
          learnerId?: string;
          days?: string;
          limit?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId, days, limit } = request.query;

      const sessions = await sessionPlanService.getUpcomingSessions(ctx.tenantId, {
        learnerId,
        createdByUserId: ctx.userId,
        days: days ? parseInt(days, 10) : 7,
        limit: limit ? parseInt(limit, 10) : 10,
      });

      return reply.send({ data: sessions });
    }
  );
}
