/**
 * Entitlements Routes
 *
 * REST API endpoints for feature entitlements and usage limits.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { entitlementsService } from '../services/entitlements.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const CheckFeatureSchema = z.object({
  feature: z.string(),
});

const CheckLimitSchema = z.object({
  limitType: z.enum(['learners', 'teachers', 'storage', 'aiQueries', 'customModules']),
  currentUsage: z.number().int().min(0),
});

const CheckModuleAccessSchema = z.object({
  moduleId: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RequestContext {
  tenantId: string;
  userId: string;
  correlationId: string;
}

// Extract context from request headers
function getContext(request: FastifyRequest): RequestContext {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;
  const correlationId = (request.headers['x-correlation-id'] as string) ?? crypto.randomUUID();

  if (!tenantId || !userId) {
    throw new Error('Missing required headers: x-tenant-id, x-user-id');
  }

  return { tenantId, userId, correlationId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function entitlementsRoutes(app: FastifyInstance): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  // GET ENTITLEMENTS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /entitlements
   * Get all entitlements for the current tenant
   */
  app.get('/entitlements', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);

    const entitlements = await entitlementsService.getEntitlements(ctx.tenantId);

    if (!entitlements) {
      return reply.status(404).send({
        error: 'No entitlements found',
        message: 'No active subscription found for this tenant',
      });
    }

    return reply.send(entitlements);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK FEATURE ACCESS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /entitlements/check-feature
   * Check if tenant has access to a specific feature
   */
  app.post('/entitlements/check-feature', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const { feature } = CheckFeatureSchema.parse(request.body);

    const hasAccess = await entitlementsService.checkFeatureAccess(ctx.tenantId, feature);

    return reply.send({
      feature,
      hasAccess,
      tenantId: ctx.tenantId,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK USAGE LIMIT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /entitlements/check-limit
   * Check if tenant is within usage limits
   */
  app.post('/entitlements/check-limit', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const { limitType, currentUsage } = CheckLimitSchema.parse(request.body);

    const result = await entitlementsService.checkLimitUsage(ctx.tenantId, limitType, currentUsage);

    return reply.send({
      limitType,
      ...result,
      tenantId: ctx.tenantId,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK LEARNER CAPACITY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /entitlements/can-add-learner
   * Check if tenant can add another learner
   */
  app.get('/entitlements/can-add-learner', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const query = request.query as { currentCount?: string };
    const currentCount = Number.parseInt(query.currentCount || '0', 10);

    const canAdd = await entitlementsService.canAddLearner(ctx.tenantId, currentCount);

    return reply.send({
      canAddLearner: canAdd,
      currentCount,
      tenantId: ctx.tenantId,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK TEACHER CAPACITY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /entitlements/can-add-teacher
   * Check if tenant can add another teacher
   */
  app.get('/entitlements/can-add-teacher', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const query = request.query as { currentCount?: string };
    const currentCount = Number.parseInt(query.currentCount || '0', 10);

    const canAdd = await entitlementsService.canAddTeacher(ctx.tenantId, currentCount);

    return reply.send({
      canAddTeacher: canAdd,
      currentCount,
      tenantId: ctx.tenantId,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK MODULE ACCESS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /entitlements/check-module
   * Check if tenant has access to a specific module
   */
  app.post('/entitlements/check-module', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const { moduleId } = CheckModuleAccessSchema.parse(request.body);

    const hasAccess = await entitlementsService.hasModuleAccess(ctx.tenantId, moduleId);

    return reply.send({
      moduleId,
      hasAccess,
      tenantId: ctx.tenantId,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SYNC ENTITLEMENTS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /entitlements/sync
   * Force sync entitlements from Stripe subscription (internal use)
   */
  app.post('/entitlements/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);

    await entitlementsService.syncEntitlements(ctx.tenantId);

    // Get updated entitlements
    const entitlements = await entitlementsService.getEntitlements(ctx.tenantId);

    return reply.send({
      message: 'Entitlements synced successfully',
      entitlements,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INVALIDATE CACHE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /entitlements/invalidate-cache
   * Invalidate entitlements cache for tenant (internal use)
   */
  app.post('/entitlements/invalidate-cache', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);

    entitlementsService.invalidateCache(ctx.tenantId);

    return reply.send({
      message: 'Cache invalidated successfully',
      tenantId: ctx.tenantId,
    });
  });
}
