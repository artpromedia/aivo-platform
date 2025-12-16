/**
 * Badge Routes - Badge listing and awarding
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as publisher from '../events/publisher.js';
import { BadgeCategory } from '../prisma.js';
import * as badgeAwardEngine from '../services/badgeAwardEngine.js';
import * as badgeService from '../services/badgeService.js';
import * as engagementService from '../services/engagementService.js';

// Schemas
const learnerIdParamSchema = z.object({
  learnerId: z.string().uuid(),
});

const badgeCodeParamSchema = z.object({
  learnerId: z.string().uuid(),
  badgeCode: z.string().min(1).max(100),
});

const grantBadgeBodySchema = z.object({
  tenantId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

const listBadgesQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  category: z.nativeEnum(BadgeCategory).optional(),
});

export async function badgeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /badges
   * List all active badge definitions
   */
  app.get(
    '/badges',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listBadgesQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = listBadgesQuerySchema.parse(request.query);
      const badges = await badgeService.getActiveBadges(query.tenantId, query.category);
      return reply.status(200).send({ badges });
    }
  );

  /**
   * GET /learners/:learnerId/badges
   * List earned badges for a learner
   */
  app.get(
    '/learners/:learnerId/badges',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const tenantId = request.query.tenantId;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter required' });
      }

      // Authorization
      const user = (request as FastifyRequest & { user?: { tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const badges = await badgeService.getLearnerBadges(tenantId, learnerId);

      return reply.status(200).send({
        badges: badges.map((lb) => ({
          id: lb.id,
          badgeCode: lb.badge.code,
          badgeName: lb.badge.name,
          badgeDescription: lb.badge.description,
          category: lb.badge.category,
          iconKey: lb.badge.iconKey,
          awardedAt: lb.awardedAt,
          firstSeenAt: lb.firstSeenAt,
          source: lb.source,
          note: lb.note,
        })),
      });
    }
  );

  /**
   * GET /learners/:learnerId/badges/progress
   * Get badge progress for a learner (includes unearned badges)
   */
  app.get(
    '/learners/:learnerId/badges/progress',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const tenantId = request.query.tenantId;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter required' });
      }

      const user = (request as FastifyRequest & { user?: { tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const profile = await engagementService.getOrCreateProfile(tenantId, learnerId);
      const progress = await badgeAwardEngine.getBadgeProgress(tenantId, learnerId, profile);

      return reply.status(200).send({
        badges: progress.map((p) => ({
          badgeCode: p.badge.code,
          badgeName: p.badge.name,
          badgeDescription: p.badge.description,
          category: p.badge.category,
          iconKey: p.badge.iconKey,
          progress: p.progress,
          target: p.target,
          progressPercent: p.target > 0 ? Math.round((p.progress / p.target) * 100) : 100,
          earned: p.earned,
        })),
      });
    }
  );

  /**
   * GET /learners/:learnerId/badges/unseen
   * Get unseen (newly earned) badges
   */
  app.get(
    '/learners/:learnerId/badges/unseen',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const tenantId = request.query.tenantId;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter required' });
      }

      const unseenBadges = await badgeService.getUnseenBadges(tenantId, learnerId);

      return reply.status(200).send({
        badges: unseenBadges.map((lb) => ({
          id: lb.id,
          badgeCode: lb.badge.code,
          badgeName: lb.badge.name,
          badgeDescription: lb.badge.description,
          category: lb.badge.category,
          iconKey: lb.badge.iconKey,
          awardedAt: lb.awardedAt,
        })),
      });
    }
  );

  /**
   * POST /learners/:learnerId/badges/:badgeCode/seen
   * Mark a badge as seen by the learner
   */
  app.post(
    '/learners/:learnerId/badges/:badgeCode/seen',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof badgeCodeParamSchema>;
        Body: { tenantId: string; learnerBadgeId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerBadgeId } = request.body;

      if (!learnerBadgeId) {
        return reply.status(400).send({ error: 'learnerBadgeId required' });
      }

      const updated = await badgeService.markBadgeSeen(learnerBadgeId);
      return reply.status(200).send({ firstSeenAt: updated.firstSeenAt });
    }
  );

  /**
   * POST /learners/:learnerId/badges/:badgeCode/grant
   * Manually grant a badge (teacher/parent)
   */
  app.post(
    '/learners/:learnerId/badges/:badgeCode/grant',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof badgeCodeParamSchema>;
        Body: z.infer<typeof grantBadgeBodySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId, badgeCode } = badgeCodeParamSchema.parse(request.params);
      const { tenantId, note } = grantBadgeBodySchema.parse(request.body);

      // Authorization
      const user = (
        request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }
      ).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden - wrong tenant' });
      }

      // Only parent, teacher, or admin can grant badges
      const allowedRoles = ['parent', 'teacher', 'tenant_admin', 'platform_admin', 'service'];
      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden - insufficient role' });
      }

      // Determine source based on role
      const source =
        user.role === 'parent' ? 'PARENT' : user.role === 'teacher' ? 'TEACHER' : 'SYSTEM';

      const result = await badgeService.awardBadge({
        tenantId,
        learnerId,
        badgeCode,
        source,
        note: note ?? undefined,
      });

      if (!result) {
        return reply.status(404).send({ error: 'Badge not found or not available' });
      }

      // Publish event if new
      if (result.isNew) {
        await publisher.publishBadgeAwarded(
          tenantId,
          learnerId,
          result.badge,
          source,
          true,
          user.sub
        );
      }

      return reply.status(result.isNew ? 201 : 200).send({
        badge: {
          code: result.badge.code,
          name: result.badge.name,
          description: result.badge.description,
          category: result.badge.category,
          iconKey: result.badge.iconKey,
        },
        learnerBadge: {
          id: result.learnerBadge.id,
          awardedAt: result.learnerBadge.awardedAt,
          source: result.learnerBadge.source,
          note: result.learnerBadge.note,
        },
        isNew: result.isNew,
      });
    }
  );
}
