/**
 * Predictability Routes - ND-2.2
 *
 * API routes for predictability enforcement in sessions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { PredictabilityService } from '../predictability/predictability.service.js';
import { predictabilityEventPublisher } from '../predictability/predictability.events.js';
import type { SessionActivityInput, RoutineType } from '../predictability/predictability.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const TenantLearnerParamsSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
});

const SessionPlanParamsSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
});

const GetPreferencesQuerySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
});

const UpsertPreferencesSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  enabled: z.boolean(),
  warnMinutesBefore: z.number().int().min(1).max(30).default(5),
  showRemainingTime: z.boolean().default(true),
  useVisualSchedule: z.boolean().default(true),
  preferredRoutineTypes: z.array(z.string()).optional(),
  customSettings: z.record(z.unknown()).optional(),
});

const CreateSessionPlanSchema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  activities: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.string(),
      estimatedMinutes: z.number().min(1),
      isNew: z.boolean().optional(),
    })
  ),
  structureType: z.enum(['default', 'minimal', 'high_support', 'custom']).default('default'),
});

const UpdateProgressSchema = z.object({
  currentItemId: z.string(),
});

const RequestChangeSchema = z.object({
  changeType: z.enum(['add', 'remove', 'reorder', 'skip', 'extend']),
  reason: z.string(),
  targetItemId: z.string().optional(),
  newActivity: z
    .object({
      id: z.string(),
      title: z.string(),
      type: z.string(),
      estimatedMinutes: z.number().min(1),
      isNew: z.boolean().optional(),
    })
    .optional(),
  additionalMinutes: z.number().optional(),
});

const ApplyChangeSchema = z.object({
  changeId: z.string().uuid(),
  approved: z.boolean(),
});

const ReportAnxietySchema = z.object({
  level: z.enum(['mild', 'moderate', 'severe']),
  triggerCategory: z.string().optional(),
  triggerId: z.string().optional(),
});

const GetRoutineQuerySchema = z.object({
  routineType: z.string(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  const user = (request as FastifyRequest & { user?: JwtUser }).user;
  if (!user || typeof user.sub !== 'string' || typeof user.tenantId !== 'string') {
    return null;
  }
  return user;
}

function canAccessTenant(user: JwtUser, tenantId: string): boolean {
  if (user.role === 'service') return true;
  return user.tenantId === tenantId;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function predictabilityRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new PredictabilityService();

  // ════════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /predictability/preferences
   * Get predictability preferences for a learner.
   */
  fastify.get('/predictability/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = GetPreferencesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, learnerId } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const preferences = await service.getPreferences(tenantId, learnerId);
    return reply.send(preferences);
  });

  /**
   * PUT /predictability/preferences
   * Update predictability preferences for a learner.
   */
  fastify.put('/predictability/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = UpsertPreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, learnerId, ...prefs } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const preferences = await service.upsertPreferences(tenantId, learnerId, {
      ...prefs,
      preferredRoutineTypes: (prefs.preferredRoutineTypes ?? []) as RoutineType[],
    });

    // Publish event
    predictabilityEventPublisher
      .publishPreferencesUpdated(tenantId, learnerId, preferences, Object.keys(prefs))
      .catch((err) => {
        console.error('[predictability] Failed to publish preferences.updated event:', err);
      });

    return reply.send(preferences);
  });

  /**
   * GET /predictability/check
   * Check if predictability is required for a learner.
   */
  fastify.get('/predictability/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = GetPreferencesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, learnerId } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const required = await service.requiresPredictability(tenantId, learnerId);
    return reply.send({ requiresPredictability: required });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PLANS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /predictability/plans
   * Create a predictable session plan.
   */
  fastify.post('/predictability/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = CreateSessionPlanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, sessionId, learnerId, activities, structureType } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const plan = await service.createPredictableSessionPlan(
      tenantId,
      sessionId,
      learnerId,
      activities as SessionActivityInput[],
      structureType
    );

    // Publish event
    predictabilityEventPublisher
      .publishSessionPlanCreated(tenantId, learnerId, plan.id, sessionId, plan.outline, structureType)
      .catch((err) => {
        console.error('[predictability] Failed to publish plan.created event:', err);
      });

    return reply.status(201).send(plan);
  });

  /**
   * GET /predictability/plans/:planId
   * Get a session plan by ID.
   */
  fastify.get('/predictability/plans/:planId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const paramsSchema = z.object({ planId: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        error: 'Invalid plan ID',
        details: params.error.flatten(),
      });
    }

    const querySchema = z.object({ tenantId: z.string().uuid() });
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: query.error.flatten(),
      });
    }

    const { planId } = params.data;
    const { tenantId } = query.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const plan = await service.getSessionPlan(tenantId, planId);
    if (!plan) {
      return reply.status(404).send({ error: 'Session plan not found' });
    }

    return reply.send(plan);
  });

  /**
   * PATCH /predictability/plans/:planId/progress
   * Update session progress (move to next item).
   */
  fastify.patch(
    '/predictability/plans/:planId/progress',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsSchema = z.object({ planId: z.string().uuid() });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid plan ID',
          details: params.error.flatten(),
        });
      }

      const bodySchema = z.object({
        tenantId: z.string().uuid(),
        currentItemId: z.string(),
      });
      const body = bodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { planId } = params.data;
      const { tenantId, currentItemId } = body.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      const result = await service.updateProgress(tenantId, planId, currentItemId);
      if (!result) {
        return reply.status(404).send({ error: 'Session plan not found' });
      }

      // Publish event
      const plan = await service.getSessionPlan(tenantId, planId);
      if (plan) {
        predictabilityEventPublisher
          .publishProgressUpdated(
            tenantId,
            plan.learnerId,
            planId,
            plan.sessionId,
            currentItemId,
            result.phase,
            result.progress
          )
          .catch((err) => {
            console.error('[predictability] Failed to publish progress.updated event:', err);
          });
      }

      return reply.send(result);
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // CHANGES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /predictability/plans/:planId/changes
   * Request an unexpected change to the session plan.
   */
  fastify.post(
    '/predictability/plans/:planId/changes',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsSchema = z.object({ planId: z.string().uuid() });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid plan ID',
          details: params.error.flatten(),
        });
      }

      const bodySchema = RequestChangeSchema.extend({
        tenantId: z.string().uuid(),
        sessionId: z.string().uuid(),
        learnerId: z.string().uuid(),
      });
      const body = bodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { planId } = params.data;
      const { tenantId, sessionId, learnerId, changeType, reason, targetItemId, newActivity } = body.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      const result = await service.requestUnexpectedChange(
        tenantId,
        planId,
        sessionId,
        learnerId,
        changeType,
        reason,
        {
          targetItemId,
          newActivity: newActivity as SessionActivityInput | undefined,
        }
      );

      // Publish event
      predictabilityEventPublisher
        .publishUnexpectedChangeRequested(
          tenantId,
          learnerId,
          planId,
          sessionId,
          changeType,
          reason,
          result.explanation,
          result.requiresApproval
        )
        .catch((err) => {
          console.error('[predictability] Failed to publish change.requested event:', err);
        });

      return reply.status(201).send(result);
    }
  );

  /**
   * POST /predictability/plans/:planId/changes/:changeId/apply
   * Apply or decline a pending change.
   */
  fastify.post(
    '/predictability/plans/:planId/changes/:changeId/apply',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsSchema = z.object({
        planId: z.string().uuid(),
        changeId: z.string().uuid(),
      });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const bodySchema = z.object({
        tenantId: z.string().uuid(),
        approved: z.boolean(),
      });
      const body = bodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { planId, changeId } = params.data;
      const { tenantId, approved } = body.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      const result = await service.applyChange(tenantId, planId, changeId, approved);
      if (!result) {
        return reply.status(404).send({ error: 'Change not found' });
      }

      // Publish event
      const plan = await service.getSessionPlan(tenantId, planId);
      if (plan) {
        predictabilityEventPublisher
          .publishChangeApplied(tenantId, plan.learnerId, planId, plan.sessionId, changeId, 'skip', approved)
          .catch((err) => {
            console.error('[predictability] Failed to publish change.applied event:', err);
          });
      }

      return reply.send(result);
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTINES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /predictability/routines
   * Get available routine for a learner.
   */
  fastify.get('/predictability/routines', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const querySchema = GetPreferencesQuerySchema.extend({
      routineType: z.string().optional(),
    });
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: query.error.flatten(),
      });
    }

    const { tenantId, learnerId, routineType } = query.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    if (routineType) {
      const routine = await service.getRoutine(tenantId, learnerId, routineType as RoutineType);
      return reply.send({ routine });
    }

    // Return all default routines if no specific type requested
    const { getAllSystemDefaultRoutines } = await import('../predictability/routine-manager.js');
    const routines = getAllSystemDefaultRoutines();
    return reply.send({ routines });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ANXIETY REPORTING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /predictability/anxiety
   * Report anxiety during a session.
   */
  fastify.post('/predictability/anxiety', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const bodySchema = ReportAnxietySchema.extend({
      tenantId: z.string().uuid(),
      sessionId: z.string().uuid(),
      learnerId: z.string().uuid(),
    });
    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: body.error.flatten(),
      });
    }

    const { tenantId, sessionId, learnerId, level, triggerCategory, triggerId } = body.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const result = await service.reportAnxiety(
      tenantId,
      sessionId,
      learnerId,
      level,
      triggerCategory,
      triggerId
    );

    // Publish event
    predictabilityEventPublisher
      .publishAnxietyReported(tenantId, sessionId, learnerId, level, result.supportActions, triggerCategory, triggerId)
      .catch((err) => {
        console.error('[predictability] Failed to publish anxiety.reported event:', err);
      });

    return reply.status(201).send(result);
  });
}
