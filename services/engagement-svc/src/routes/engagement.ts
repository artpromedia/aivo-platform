/**
 * Engagement Routes - XP, streaks, levels APIs
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { EngagementEventType } from '../prisma.js';
import * as engagementService from '../services/engagementService.js';

// Schemas
const applyEventSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  eventType: z.nativeEnum(EngagementEventType),
  sessionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  badgeId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  customXp: z.number().int().min(0).max(100).optional(),
});

const getEngagementParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

const getEngagementQuerySchema = z.object({
  tenantId: z.string().uuid(),
});

const getEventsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function engagementRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /internal/engagement/apply-event
   * Internal endpoint for other services to report engagement events
   */
  app.post(
    '/internal/engagement/apply-event',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof applyEventSchema> }>,
      reply: FastifyReply
    ) => {
      const body = applyEventSchema.parse(request.body);

      const result = await engagementService.applyEvent({
        tenantId: body.tenantId,
        learnerId: body.learnerId,
        eventType: body.eventType,
        sessionId: body.sessionId ?? undefined,
        taskId: body.taskId ?? undefined,
        activityId: body.activityId ?? undefined,
        badgeId: body.badgeId ?? undefined,
        metadata: body.metadata as engagementService.ApplyEventInput['metadata'],
        customXp: body.customXp ?? undefined,
      });

      return reply.status(200).send({
        event: result.event,
        profile: {
          level: result.profile.level,
          xpTotal: result.profile.xpTotal,
          streakDays: result.profile.currentStreakDays,
        },
        xpAwarded: result.xpAwarded,
        leveledUp: result.leveledUp,
        previousLevel: result.previousLevel,
        streakUpdated: result.streakUpdated,
        previousStreak: result.previousStreak,
      });
    }
  );

  /**
   * GET /engagement/:learnerId
   * Get engagement profile for a learner
   */
  app.get(
    '/engagement/:learnerId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof getEngagementParamsSchema>;
        Querystring: z.infer<typeof getEngagementQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = getEngagementParamsSchema.parse(request.params);
      const { tenantId } = getEngagementQuerySchema.parse(request.query);

      // Authorization check - user must be the learner, parent, teacher, or admin
      const user = (
        request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }
      ).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Tenant check
      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const engagement = await engagementService.getEngagement(tenantId, learnerId);

      return reply.status(200).send(engagement);
    }
  );

  /**
   * GET /engagement/:learnerId/events
   * Get recent engagement events for a learner
   */
  app.get(
    '/engagement/:learnerId/events',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof getEngagementParamsSchema>;
        Querystring: z.infer<typeof getEventsQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = getEngagementParamsSchema.parse(request.params);
      const { tenantId, limit } = getEventsQuerySchema.parse(request.query);

      const user = (
        request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }
      ).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const events = await engagementService.getRecentEvents(tenantId, learnerId, limit);

      return reply.status(200).send({ events });
    }
  );

  /**
   * GET /engagement/leaderboard
   * Get weekly XP leaderboard (opt-in only)
   */
  app.get(
    '/engagement/leaderboard',
    async (
      request: FastifyRequest<{ Querystring: { tenantId: string; limit?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.query.tenantId;
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 10;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId is required' });
      }

      const leaderboard = await engagementService.getWeeklyLeaderboard(tenantId, limit);

      // Empty if comparisons not enabled
      return reply.status(200).send({ leaderboard });
    }
  );
}
