/**
 * Transition Routes
 *
 * API endpoints for managing activity transitions in learning sessions.
 * Supports preferences management, transition planning, routine CRUD,
 * and transition analytics.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { billingAccessPreHandler } from '../middleware/billingAccess.js';

import { transitionEventPublisher } from './transition.events.js';
import { transitionService } from './transition.service.js';
import type {
  TransitionContext,
  TransitionPreferencesInput,
  TransitionRoutineStep,
} from './transition.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const GetPreferencesParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

const UpdatePreferencesSchema = z.object({
  tenantId: z.string().uuid(),
  warningStyle: z.enum(['visual_only', 'visual_audio', 'visual_haptic', 'all']).optional(),
  defaultWarningSeconds: z.array(z.number().int().positive()).optional(),
  visualSettings: z
    .object({
      style: z.enum(['circle', 'bar', 'sand_timer', 'character']).optional(),
      colorScheme: z
        .enum(['green_yellow_red', 'blue_purple', 'high_contrast', 'grayscale'])
        .optional(),
      showTimer: z.boolean().optional(),
      showText: z.boolean().optional(),
      animationSpeed: z.enum(['slow', 'normal', 'fast']).optional(),
    })
    .optional(),
  audioSettings: z
    .object({
      enabled: z.boolean().optional(),
      warningType: z
        .enum(['gentle_chime', 'nature_sound', 'musical', 'spoken', 'character_voice'])
        .optional(),
      volume: z.number().min(0).max(1).optional(),
      voiceType: z.string().optional(),
    })
    .optional(),
  hapticSettings: z
    .object({
      enabled: z.boolean().optional(),
      intensity: z.enum(['light', 'medium', 'strong']).optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  preferredRoutineId: z.string().uuid().nullable().optional(),
  showFirstThenBoard: z.boolean().optional(),
  requireAcknowledgment: z.boolean().optional(),
  allowSkipTransition: z.boolean().optional(),
  extendedTimeMultiplier: z.number().min(1).max(5).optional(),
});

const PlanTransitionSchema = z.object({
  sessionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  currentActivity: z.object({
    id: z.string().uuid(),
    title: z.string(),
    type: z.string(),
    thumbnailUrl: z.string().url().optional(),
    remainingSeconds: z.number().int().min(0).optional(),
  }),
  nextActivity: z.object({
    id: z.string().uuid(),
    title: z.string(),
    type: z.string(),
    thumbnailUrl: z.string().url().optional(),
    estimatedDuration: z.number().int().positive().optional(),
  }),
  learnerProfile: z
    .object({
      gradeBand: z.string().optional(),
      requiresPredictableFlow: z.boolean().optional(),
      sensorySensitivities: z.array(z.string()).optional(),
      avoidTimers: z.boolean().optional(),
      preferredTransitionCues: z.array(z.string()).optional(),
    })
    .optional(),
  urgency: z.enum(['low', 'normal', 'high']).optional(),
});

const AcknowledgeTransitionSchema = z.object({
  sessionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  readyState: z.enum(['ready', 'needs_more_time', 'skipped']).optional(),
});

const CompleteTransitionSchema = z.object({
  sessionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  outcome: z.enum(['smooth', 'successful', 'struggled', 'refused', 'timed_out']),
  actualDuration: z.number().int().positive(),
  warningsAcknowledged: z.number().int().min(0),
  routineStepsCompleted: z.number().int().min(0).optional(),
  learnerInteractions: z.number().int().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

const CreateRoutineSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(
    z.object({
      type: z.enum(['breathing', 'movement', 'sensory', 'countdown', 'preview', 'ready_check']),
      duration: z.number().int().positive(),
      instruction: z.string(),
      mediaUrl: z.string().url().optional(),
      requiresCompletion: z.boolean().default(false),
    })
  ),
  isSystemRoutine: z.boolean().optional(),
});

const UpdateRoutineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        type: z.enum(['breathing', 'movement', 'sensory', 'countdown', 'preview', 'ready_check']),
        duration: z.number().int().positive(),
        instruction: z.string(),
        mediaUrl: z.string().url().optional(),
        requiresCompletion: z.boolean().default(false),
      })
    )
    .optional(),
  isActive: z.boolean().optional(),
});

const RoutineIdParamsSchema = z.object({
  routineId: z.string().uuid(),
});

const TransitionIdParamsSchema = z.object({
  transitionId: z.string().uuid(),
});

const AnalyticsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
});

const ListRoutinesQuerySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  includeSystem: z.enum(['true', 'false']).default('true'),
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

export async function transitionRoutes(fastify: FastifyInstance): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /transitions/preferences/:learnerId
   * Get transition preferences for a learner.
   */
  fastify.get(
    '/transitions/preferences/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = GetPreferencesParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const { learnerId } = params.data;

      try {
        const preferences = await transitionService.getOrCreatePreferences(
          user.tenantId,
          learnerId
        );

        return reply.status(200).send(preferences);
      } catch (error) {
        fastify.log.error(error, 'Failed to get transition preferences');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * PUT /transitions/preferences/:learnerId
   * Update transition preferences for a learner.
   */
  fastify.put(
    '/transitions/preferences/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = GetPreferencesParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const body = UpdatePreferencesSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { learnerId } = params.data;
      const { tenantId, ...updates } = body.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      try {
        const preferences = await transitionService.updatePreferences(
          learnerId,
          tenantId,
          updates as TransitionPreferencesInput
        );

        return reply.status(200).send(preferences);
      } catch (error) {
        fastify.log.error(error, 'Failed to update transition preferences');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSITION PLANNING & EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /transitions/plan
   * Plan a transition between activities.
   * Returns a TransitionPlan with warnings, visual settings, routines, etc.
   */
  fastify.post(
    '/transitions/plan',
    { preHandler: [billingAccessPreHandler] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parsed = PlanTransitionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      const {
        tenantId,
        learnerId,
        sessionId,
        currentActivity,
        nextActivity,
        learnerProfile,
        urgency,
      } = parsed.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      try {
        const context: TransitionContext = {
          sessionId,
          learnerId,
          tenantId,
          fromActivity: {
            id: currentActivity.id,
            title: currentActivity.title,
            type: currentActivity.type,
            thumbnail: currentActivity.thumbnailUrl,
          },
          toActivity: {
            id: nextActivity.id,
            title: nextActivity.title,
            type: nextActivity.type,
            thumbnail: nextActivity.thumbnailUrl,
            estimatedDuration: nextActivity.estimatedDuration,
          },
          gradeBand: learnerProfile?.gradeBand,
        };

        const plan = await transitionService.planTransition(tenantId, learnerId, context, urgency);

        // Publish transition started event
        await transitionEventPublisher.publishTransitionStarted(
          tenantId,
          plan.transitionId,
          sessionId,
          learnerId,
          plan,
          context
        );

        return reply.status(200).send(plan);
      } catch (error) {
        fastify.log.error(error, 'Failed to plan transition');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * POST /transitions/:transitionId/acknowledge
   * Acknowledge a transition warning (learner tapped "I'm ready" or similar).
   */
  fastify.post(
    '/transitions/:transitionId/acknowledge',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = TransitionIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const body = AcknowledgeTransitionSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { transitionId } = params.data;
      const { sessionId, tenantId, learnerId, readyState } = body.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      try {
        const result = await transitionService.acknowledgeTransition(
          tenantId,
          transitionId,
          readyState ?? 'ready'
        );

        // Publish acknowledgment event
        await transitionEventPublisher.publishTransitionAcknowledged(
          tenantId,
          transitionId,
          sessionId,
          learnerId,
          result.secondsRemaining ?? 0,
          readyState ?? 'ready'
        );

        return reply.status(200).send(result);
      } catch (error) {
        fastify.log.error(error, 'Failed to acknowledge transition');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * POST /transitions/:transitionId/complete
   * Mark a transition as complete and record analytics.
   */
  fastify.post(
    '/transitions/:transitionId/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = TransitionIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const body = CompleteTransitionSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { transitionId } = params.data;
      const {
        sessionId,
        tenantId,
        learnerId,
        outcome,
        actualDuration,
        warningsAcknowledged,
        routineStepsCompleted,
        learnerInteractions,
        metadata,
      } = body.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      try {
        const result = await transitionService.completeTransition(tenantId, transitionId, {
          outcome,
          actualDuration,
          warningsAcknowledged,
          routineStepsCompleted: routineStepsCompleted ?? 0,
          learnerInteractions: learnerInteractions ?? 0,
          metadata,
        });

        // Publish completion event only if we have all required data
        if (result.success && result.fromActivityId && result.toActivityId && result.outcome) {
          await transitionEventPublisher.publishTransitionCompleted(
            tenantId,
            transitionId,
            sessionId,
            learnerId,
            {
              fromActivityId: result.fromActivityId,
              toActivityId: result.toActivityId,
              outcome: result.outcome as
                | 'smooth'
                | 'successful'
                | 'struggled'
                | 'refused'
                | 'timed_out',
              plannedDuration: result.plannedDuration ?? 0,
              actualDuration: result.actualDuration ?? 0,
              warningsDelivered: result.warningsDelivered ?? 0,
              warningsAcknowledged: result.warningsAcknowledged ?? 0,
              routineStepsCompleted: result.routineStepsCompleted ?? 0,
              routineStepsTotal: result.routineStepsTotal ?? 0,
              learnerInteractions: result.learnerInteractions ?? 0,
            }
          );
        }

        return reply.status(200).send(result);
      } catch (error) {
        fastify.log.error(error, 'Failed to complete transition');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTINES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /transitions/routines
   * List available transition routines (system and tenant-specific).
   */
  fastify.get('/transitions/routines', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const query = ListRoutinesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: query.error.flatten(),
      });
    }

    const { tenantId, learnerId: _learnerId, includeSystem: _includeSystem } = query.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    try {
      const routines = await transitionService.getAllRoutines(tenantId);

      return reply.status(200).send({ routines });
    } catch (error) {
      fastify.log.error(error, 'Failed to list routines');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /transitions/routines
   * Create a new transition routine.
   */
  fastify.post('/transitions/routines', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = CreateRoutineSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: body.error.flatten(),
      });
    }

    const { tenantId, learnerId, name, description, steps, isSystemRoutine } = body.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    // Only service role can create system routines
    if (isSystemRoutine && user.role !== 'service') {
      return reply
        .status(403)
        .send({ error: 'Forbidden: only service role can create system routines' });
    }

    try {
      const routine = await transitionService.createRoutine({
        tenantId,
        learnerId,
        name,
        description,
        steps: steps as Omit<TransitionRoutineStep, 'id'>[],
        isSystemRoutine: isSystemRoutine ?? false,
      });

      return reply.status(201).send(routine);
    } catch (error) {
      fastify.log.error(error, 'Failed to create routine');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /transitions/routines/:routineId
   * Get a specific routine by ID.
   */
  fastify.get(
    '/transitions/routines/:routineId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = RoutineIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const { routineId } = params.data;

      try {
        const routine = await transitionService.getRoutineById(routineId);

        if (!routine) {
          return reply.status(404).send({ error: 'Routine not found' });
        }

        // Check tenant access (system routines are accessible to all)
        if (!routine.isSystemRoutine && !canAccessTenant(user, routine.tenantId)) {
          return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
        }

        return reply.status(200).send(routine);
      } catch (error) {
        fastify.log.error(error, 'Failed to get routine');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * PUT /transitions/routines/:routineId
   * Update a transition routine.
   */
  fastify.put(
    '/transitions/routines/:routineId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = RoutineIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const body = UpdateRoutineSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: body.error.flatten(),
        });
      }

      const { routineId } = params.data;
      const updates = body.data;

      try {
        // Get existing routine to check access
        const existing = await transitionService.getRoutineById(routineId);
        if (!existing) {
          return reply.status(404).send({ error: 'Routine not found' });
        }

        // Check tenant access
        if (!existing.isSystemRoutine && !canAccessTenant(user, existing.tenantId)) {
          return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
        }

        // Only service role can modify system routines
        if (existing.isSystemRoutine && user.role !== 'service') {
          return reply.status(403).send({ error: 'Forbidden: cannot modify system routines' });
        }

        const routine = await transitionService.updateRoutine(routineId, updates);

        return reply.status(200).send(routine);
      } catch (error) {
        fastify.log.error(error, 'Failed to update routine');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * DELETE /transitions/routines/:routineId
   * Soft-delete a transition routine (set isActive=false).
   */
  fastify.delete(
    '/transitions/routines/:routineId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = RoutineIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: params.error.flatten(),
        });
      }

      const { routineId } = params.data;

      try {
        // Get existing routine to check access
        const existing = await transitionService.getRoutineById(routineId);
        if (!existing) {
          return reply.status(404).send({ error: 'Routine not found' });
        }

        // Check tenant access
        if (!existing.isSystemRoutine && !canAccessTenant(user, existing.tenantId)) {
          return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
        }

        // Only service role can delete system routines
        if (existing.isSystemRoutine && user.role !== 'service') {
          return reply.status(403).send({ error: 'Forbidden: cannot delete system routines' });
        }

        await transitionService.deleteRoutine(routineId);

        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error, 'Failed to delete routine');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /transitions/analytics
   * Get transition analytics for a learner.
   */
  fastify.get('/transitions/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const query = AnalyticsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: query.error.flatten(),
      });
    }

    const { tenantId, learnerId, startDate, endDate, limit } = query.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    try {
      const analytics = await transitionService.getTransitionAnalytics(tenantId, learnerId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
      });

      return reply.status(200).send(analytics);
    } catch (error) {
      fastify.log.error(error, 'Failed to get transition analytics');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
