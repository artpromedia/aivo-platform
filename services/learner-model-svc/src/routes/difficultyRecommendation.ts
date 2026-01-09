/**
 * Difficulty Recommendation Routes
 *
 * API endpoints for parent approval workflow for difficulty adjustments.
 * These endpoints allow:
 * - Parents to view pending recommendations
 * - Parents to approve/modify/deny recommendations
 * - Parents to set preferences (auto-approve, domain locks)
 * - Parents to directly override difficulty levels
 * - Viewing difficulty change history
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { SkillDomain } from '@prisma/client';

import { prisma } from '../prisma.js';
import {
  createDifficultyRecommendationService,
  type ParentNotificationPayload,
} from '../services/difficulty-recommendation.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const GetPendingSchema = z.object({
  learnerId: z.string().uuid(),
});

const RespondSchema = z.object({
  recommendationId: z.string().uuid(),
  action: z.enum(['approve', 'modify', 'deny']),
  modifiedLevel: z.number().int().min(1).max(5).optional(),
  parentNotes: z.string().max(500).optional(),
});

const SetDomainDifficultySchema = z.object({
  learnerId: z.string().uuid(),
  domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']),
  level: z.number().int().min(1).max(5),
  reason: z.string().max(500).optional(),
});

const UpdatePreferencesSchema = z.object({
  learnerId: z.string().uuid(),
  autoApproveIncreases: z.boolean().optional(),
  autoApproveDecreases: z.boolean().optional(),
  notifyOnRecommendation: z.boolean().optional(),
  maxDifficultyLevel: z.number().int().min(1).max(5).nullable().optional(),
  minDifficultyLevel: z.number().int().min(1).max(5).nullable().optional(),
});

const AnalyzeSchema = z.object({
  learnerId: z.string().uuid(),
  virtualBrainId: z.string().uuid(),
  difficultyStates: z.array(z.object({
    domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']),
    currentLevel: z.number().int().min(1).max(5),
    masteryScore: z.number().min(0).max(1),
    recentAccuracy: z.number().min(0).max(1),
    practiceCount: z.number().int().min(0),
    consecutiveSuccesses: z.number().int().min(0),
  })),
});

const GetHistorySchema = z.object({
  learnerId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const GetCurrentLevelsSchema = z.object({
  learnerId: z.string().uuid(),
});

// ── Route Handler ────────────────────────────────────────────────────────────

export async function difficultyRecommendationRoutes(fastify: FastifyInstance): Promise<void> {
  const difficultyService = createDifficultyRecommendationService(prisma);

  // Helper to extract tenant ID from JWT
  const getTenantId = (request: FastifyRequest): string => {
    const user = request.user as JwtUser | undefined;
    return user?.tenantId || user?.tenant_id || 'default-tenant';
  };

  // Helper to extract user ID from JWT
  const getUserId = (request: FastifyRequest): string => {
    const user = request.user as JwtUser | undefined;
    return user?.sub || 'unknown';
  };

  /**
   * GET /difficulty/recommendations/pending/:learnerId
   * Get pending difficulty recommendations for a learner
   */
  fastify.get(
    '/difficulty/recommendations/pending/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = GetPendingSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid learner ID', details: params.error.issues });
      }

      const tenantId = getTenantId(request);
      const { learnerId } = params.data;

      try {
        const recommendations = await difficultyService.getPendingRecommendations(tenantId, learnerId);

        return reply.send({
          learnerId,
          pendingCount: recommendations.length,
          recommendations: recommendations.map((r) => ({
            id: r.id,
            domain: r.domain,
            currentLevel: r.currentLevel,
            recommendedLevel: r.recommendedLevel,
            reasonTitle: r.reasonTitle,
            reasonDescription: r.reasonDescription,
            evidence: r.evidenceSummary,
            expiresAt: r.expiresAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to get pending recommendations', { error: message, learnerId });
        return reply.status(500).send({ error: 'Failed to get pending recommendations' });
      }
    }
  );

  /**
   * POST /difficulty/recommendations/respond
   * Parent responds to a difficulty recommendation (approve/modify/deny)
   */
  fastify.post(
    '/difficulty/recommendations/respond',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = RespondSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
      }

      const parentId = getUserId(request);
      const { recommendationId, action, modifiedLevel, parentNotes } = body.data;

      try {
        const result = await difficultyService.respondToRecommendation({
          recommendationId,
          parentId,
          action,
          modifiedLevel,
          parentNotes,
        });

        if (!result.success) {
          return reply.status(400).send({ error: result.message, status: result.status });
        }

        return reply.send({
          success: true,
          status: result.status,
          appliedLevel: result.appliedLevel,
          message: result.message,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to respond to recommendation', { error: message, recommendationId });
        return reply.status(500).send({ error: 'Failed to process response' });
      }
    }
  );

  /**
   * POST /difficulty/domain/set
   * Parent directly sets difficulty level for a domain (override)
   */
  fastify.post(
    '/difficulty/domain/set',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = SetDomainDifficultySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
      }

      const tenantId = getTenantId(request);
      const parentId = getUserId(request);
      const { learnerId, domain, level, reason } = body.data;

      try {
        const result = await difficultyService.setDomainDifficulty(
          tenantId,
          learnerId,
          parentId,
          domain as SkillDomain,
          level,
          reason
        );

        if (!result.success) {
          return reply.status(400).send({ error: result.message });
        }

        return reply.send({
          success: true,
          message: result.message,
          domain,
          level,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to set domain difficulty', { error: message, learnerId, domain });
        return reply.status(500).send({ error: 'Failed to set difficulty' });
      }
    }
  );

  /**
   * GET /difficulty/preferences/:learnerId
   * Get parent's difficulty preferences for a learner
   */
  fastify.get(
    '/difficulty/preferences/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = GetPendingSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid learner ID', details: params.error.issues });
      }

      const tenantId = getTenantId(request);
      const { learnerId } = params.data;

      try {
        const preferences = await difficultyService.getParentPreferences(tenantId, learnerId);

        if (!preferences) {
          // Return defaults
          return reply.send({
            learnerId,
            preferences: {
              autoApproveIncreases: false,
              autoApproveDecreases: false,
              notifyOnRecommendation: true,
              domainOverrides: null,
              maxDifficultyLevel: null,
              minDifficultyLevel: null,
            },
          });
        }

        return reply.send({
          learnerId,
          preferences,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to get preferences', { error: message, learnerId });
        return reply.status(500).send({ error: 'Failed to get preferences' });
      }
    }
  );

  /**
   * PUT /difficulty/preferences
   * Update parent's difficulty preferences for a learner
   */
  fastify.put(
    '/difficulty/preferences',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = UpdatePreferencesSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
      }

      const tenantId = getTenantId(request);
      const parentId = getUserId(request);
      const { learnerId, ...updates } = body.data;

      try {
        const preferences = await difficultyService.updateParentPreferences(
          tenantId,
          learnerId,
          parentId,
          updates
        );

        return reply.send({
          success: true,
          learnerId,
          preferences,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to update preferences', { error: message, learnerId });
        return reply.status(500).send({ error: 'Failed to update preferences' });
      }
    }
  );

  /**
   * GET /difficulty/levels/:learnerId
   * Get current difficulty levels for a learner by domain
   */
  fastify.get(
    '/difficulty/levels/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = GetCurrentLevelsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid learner ID', details: params.error.issues });
      }

      const tenantId = getTenantId(request);
      const { learnerId } = params.data;

      try {
        const levels = await difficultyService.getCurrentDifficultyLevels(tenantId, learnerId);

        return reply.send({
          learnerId,
          levels,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to get difficulty levels', { error: message, learnerId });
        return reply.status(500).send({ error: 'Failed to get difficulty levels' });
      }
    }
  );

  /**
   * GET /difficulty/history/:learnerId
   * Get difficulty change history for a learner
   */
  fastify.get(
    '/difficulty/history/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = GetPendingSchema.safeParse(request.params);
      const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }).safeParse(request.query);

      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid learner ID', details: params.error.issues });
      }

      const tenantId = getTenantId(request);
      const { learnerId } = params.data;
      const limit = query.success ? query.data.limit : 20;

      try {
        const history = await difficultyService.getDifficultyHistory(tenantId, learnerId, limit);

        return reply.send({
          learnerId,
          count: history.length,
          history: history.map((h) => ({
            id: h.id,
            domain: h.domain,
            previousLevel: h.previousLevel,
            newLevel: h.newLevel,
            changeSource: h.changeSource,
            changedByType: h.changedByType,
            wasEffective: h.wasEffective,
            createdAt: h.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to get difficulty history', { error: message, learnerId });
        return reply.status(500).send({ error: 'Failed to get difficulty history' });
      }
    }
  );

  /**
   * POST /difficulty/analyze
   * Analyze learner state and generate recommendations (called by system/scheduler)
   * This is typically called after learning sessions to check if difficulty should change.
   */
  fastify.post(
    '/difficulty/analyze',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = AnalyzeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
      }

      const tenantId = getTenantId(request);
      const { learnerId, virtualBrainId, difficultyStates } = body.data;

      try {
        // Convert to service format
        const states = difficultyStates.map((s) => ({
          domain: s.domain as SkillDomain,
          currentLevel: s.currentLevel,
          masteryScore: s.masteryScore,
          recentAccuracy: s.recentAccuracy,
          practiceCount: s.practiceCount,
          consecutiveSuccesses: s.consecutiveSuccesses,
        }));

        const results = await difficultyService.analyzeAndRecommend({
          tenantId,
          learnerId,
          virtualBrainId,
          difficultyStates: states,
        });

        return reply.send({
          learnerId,
          recommendationsGenerated: results.length,
          recommendations: results.map((r) => ({
            id: r.recommendationId,
            status: r.status,
            domain: r.domain,
            currentLevel: r.currentLevel,
            recommendedLevel: r.recommendedLevel,
            appliedLevel: r.appliedLevel,
            reasonTitle: r.reasonTitle,
            wasAutoApplied: r.wasAutoApplied,
            notificationSent: r.notificationSent,
          })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to analyze and recommend', { error: message, learnerId });
        return reply.status(500).send({ error: 'Failed to analyze learner state' });
      }
    }
  );

  /**
   * POST /difficulty/expire-old
   * Expire old pending recommendations (called by scheduler/cron)
   */
  fastify.post(
    '/difficulty/expire-old',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const expiredCount = await difficultyService.expireOldRecommendations();

        return reply.send({
          success: true,
          expiredCount,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error('Failed to expire old recommendations', { error: message });
        return reply.status(500).send({ error: 'Failed to expire recommendations' });
      }
    }
  );
}
