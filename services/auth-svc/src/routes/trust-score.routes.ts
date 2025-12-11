/**
 * Trust Score Routes
 *
 * API endpoints for trust score management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { TrustScoreService, type DataProviders } from '../services/trust-score.service.js';
import { TrustThresholdService, type UserEligibilityData } from '../services/trust-threshold.service.js';
import { ComplianceRepository } from '../repositories/compliance.repository.js';
import {
  CreateComplianceRecordSchema,
  ResolveComplianceRecordSchema,
  CreateThresholdSchema,
  UpdateThresholdSchema,
  TrustScoreTriggerEvent,
  type ThresholdContextType,
  type VerificationLevel,
} from '../types/trust-score.types.js';

// Request Schemas
const GetTrustScoreParamsSchema = z.object({
  userId: z.string().uuid(),
});

const RecalculateBodySchema = z.object({
  triggerEvent: z.nativeEnum(TrustScoreTriggerEvent).optional(),
});

const GetHistoryQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(365).optional(),
});

const CheckEligibilityBodySchema = z.object({
  jobId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  thresholdId: z.string().uuid().optional(),
});

const ComplianceIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ThresholdIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ThresholdContextQuerySchema = z.object({
  contextType: z.enum(['JOB', 'TENANT', 'POD_TEMPLATE', 'GLOBAL']),
  contextId: z.string().uuid().optional(),
});

// Mock data providers - replace with actual service integrations
function createMockDataProviders(): DataProviders {
  return {
    getReviewData: async (userId: string) => ({
      averageRating: 4.5,
      totalReviews: 15,
      ratingStdDev: 0.5,
      recentTotalReviews: 5,
      recentPositiveReviews: 4,
      recentNegativeReviews: 0,
      completedJobs: 20,
    }),
    getVerificationData: async (userId: string) => ({
      emailVerified: true,
      verificationLevel: 'BASIC' as VerificationLevel,
      mfaEnabled: false,
      oauthLinked: false,
      profileCompleteness: 75,
    }),
    getTenureData: async (userId: string) => ({
      accountAgeMonths: 8,
      accountCreatedAt: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000),
      longestInactivePeriodDays: 14,
      isActiveLastMonth: true,
    }),
    getActivityData: async (userId: string) => ({
      loginsLast30Days: 12,
      lastLoginAt: new Date(),
      messageResponseRate: 85,
      avgResponseTimeHours: 3,
      daysSinceProfileUpdate: 45,
      jobsCompletedLast90Days: 5,
    }),
    getSessionCount: async (userId: string) => 25,
  };
}

export async function trustScoreRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient; redis: Redis | null }
): Promise<void> {
  const { prisma, redis } = options;

  // Initialize services
  const dataProviders = createMockDataProviders();
  const trustScoreService = new TrustScoreService(prisma, redis, fastify.log, dataProviders);
  const thresholdService = new TrustThresholdService(prisma);
  const complianceRepository = new ComplianceRepository(prisma);

  // ============================================================================
  // Trust Score Endpoints
  // ============================================================================

  /**
   * GET /trust-score/me
   * Get current user's trust score
   */
  fastify.get(
    '/trust-score/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const result = await trustScoreService.getTrustScore(userId);
      return result;
    }
  );

  /**
   * GET /trust-score/me/explanation
   * Get detailed explanation of current user's trust score
   */
  fastify.get(
    '/trust-score/me/explanation',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const result = await trustScoreService.getTrustScoreExplanation(userId);
      return result;
    }
  );

  /**
   * GET /trust-score/me/history
   * Get trust score history for current user
   */
  fastify.get(
    '/trust-score/me/history',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof GetHistoryQuerySchema> }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const query = GetHistoryQuerySchema.parse(request.query);

      const history = await trustScoreService.getScoreHistory(userId, {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
      });

      return { history };
    }
  );

  /**
   * POST /trust-score/me/recalculate
   * Manually trigger trust score recalculation
   */
  fastify.post(
    '/trust-score/me/recalculate',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof RecalculateBodySchema> }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const body = RecalculateBodySchema.parse(request.body ?? {});

      const result = await trustScoreService.recalculate(userId, body.triggerEvent ?? 'MANUAL_RECALCULATION');

      return result;
    }
  );

  /**
   * GET /users/:userId/trust-score
   * Get trust score for a specific user (requires permission)
   */
  fastify.get(
    '/users/:userId/trust-score',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin', 'trust-score:read'])],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof GetTrustScoreParamsSchema> }>, reply: FastifyReply) => {
      const params = GetTrustScoreParamsSchema.parse(request.params);
      const result = await trustScoreService.getTrustScore(params.userId);
      return result;
    }
  );

  /**
   * POST /users/:userId/trust-score/recalculate
   * Admin trigger recalculation for a user
   */
  fastify.post(
    '/users/:userId/trust-score/recalculate',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof GetTrustScoreParamsSchema>;
        Body: z.infer<typeof RecalculateBodySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const params = GetTrustScoreParamsSchema.parse(request.params);
      const body = RecalculateBodySchema.parse(request.body ?? {});

      const result = await trustScoreService.recalculate(params.userId, body.triggerEvent ?? 'MANUAL_RECALCULATION');

      return result;
    }
  );

  // ============================================================================
  // Eligibility Endpoints
  // ============================================================================

  /**
   * POST /trust-score/me/check-eligibility
   * Check if current user meets eligibility requirements
   */
  fastify.post(
    '/trust-score/me/check-eligibility',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof CheckEligibilityBodySchema> }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const body = CheckEligibilityBodySchema.parse(request.body);

      // Get user's trust score and build eligibility data
      const trustScoreResponse = await trustScoreService.getTrustScore(userId);
      const verificationData = await dataProviders.getVerificationData(userId);
      const reviewData = await dataProviders.getReviewData(userId);

      const userData: UserEligibilityData = {
        trustScore: {
          id: '',
          userId,
          overallScore: trustScoreResponse.trustScore.overallScore,
          reviewScore: trustScoreResponse.trustScore.components.reviews.score,
          complianceScore: trustScoreResponse.trustScore.components.compliance.score,
          verificationScore: trustScoreResponse.trustScore.components.verification.score,
          tenureScore: trustScoreResponse.trustScore.components.tenure.score,
          activityScore: trustScoreResponse.trustScore.components.activity.score,
          reviewWeight: trustScoreResponse.trustScore.components.reviews.weight,
          complianceWeight: trustScoreResponse.trustScore.components.compliance.weight,
          verificationWeight: trustScoreResponse.trustScore.components.verification.weight,
          tenureWeight: trustScoreResponse.trustScore.components.tenure.weight,
          activityWeight: trustScoreResponse.trustScore.components.activity.weight,
          tier: trustScoreResponse.trustScore.tier,
          trend: trustScoreResponse.trustScore.trend,
          previousScore: null,
          scoreChangeAmount: trustScoreResponse.trustScore.scoreChange,
          lastCalculatedAt: new Date(trustScoreResponse.trustScore.lastCalculatedAt),
          calculationVersion: 1,
          factors: trustScoreResponse.trustScore.factors,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        verificationLevel: verificationData.verificationLevel,
        mfaEnabled: verificationData.mfaEnabled,
        totalReviews: reviewData.totalReviews,
        completedJobs: reviewData.completedJobs,
      };

      // Check against appropriate threshold
      if (body.thresholdId) {
        const threshold = await thresholdService.getThreshold(body.thresholdId);
        if (!threshold) {
          return reply.status(404).send({ error: 'Threshold not found' });
        }
        return thresholdService.checkUserEligibility(userData, threshold);
      }

      if (body.jobId) {
        return thresholdService.checkJobEligibility(userId, body.jobId, userData);
      }

      if (body.tenantId) {
        return thresholdService.checkTenantEligibility(body.tenantId, userData);
      }

      // Check against global threshold
      const globalThreshold = await thresholdService.getGlobalThreshold();
      if (!globalThreshold) {
        return { meetsRequirements: true, failures: [], warnings: [] };
      }

      return thresholdService.checkUserEligibility(userData, globalThreshold);
    }
  );

  // ============================================================================
  // Compliance Endpoints
  // ============================================================================

  /**
   * GET /trust-score/me/compliance
   * Get current user's compliance records
   */
  fastify.get(
    '/trust-score/me/compliance',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const [records, stats] = await Promise.all([
        complianceRepository.findMany({ userId }, { take: 50 }),
        complianceRepository.getUserStats(userId),
      ]);

      return { records, stats };
    }
  );

  /**
   * POST /compliance
   * Record a compliance violation (admin/system only)
   */
  fastify.post(
    '/compliance',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin', 'system'])],
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof CreateComplianceRecordSchema> }>, reply: FastifyReply) => {
      const body = CreateComplianceRecordSchema.parse(request.body);

      const record = await complianceRepository.create(body);

      // Trigger trust score recalculation
      await trustScoreService.handleTriggerEvent(body.userId, 'COMPLIANCE_VIOLATION');

      return reply.status(201).send(record);
    }
  );

  /**
   * POST /compliance/:id/resolve
   * Resolve a compliance violation
   */
  fastify.post(
    '/compliance/:id/resolve',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ComplianceIdParamsSchema>;
        Body: z.infer<typeof ResolveComplianceRecordSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const params = ComplianceIdParamsSchema.parse(request.params);
      const body = ResolveComplianceRecordSchema.parse(request.body);

      const existing = await complianceRepository.findById(params.id);
      if (!existing) {
        return reply.status(404).send({ error: 'Compliance record not found' });
      }

      const record = await complianceRepository.resolve(params.id, body);

      // Trigger trust score recalculation
      await trustScoreService.handleTriggerEvent(existing.userId, 'COMPLIANCE_RESOLVED');

      return record;
    }
  );

  /**
   * GET /compliance/:id
   * Get a compliance record by ID
   */
  fastify.get(
    '/compliance/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof ComplianceIdParamsSchema> }>, reply: FastifyReply) => {
      const params = ComplianceIdParamsSchema.parse(request.params);
      const record = await complianceRepository.findById(params.id);

      if (!record) {
        return reply.status(404).send({ error: 'Compliance record not found' });
      }

      return record;
    }
  );

  // ============================================================================
  // Threshold Endpoints
  // ============================================================================

  /**
   * GET /thresholds
   * Get all active thresholds
   */
  fastify.get(
    '/thresholds',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const thresholds = await thresholdService.getAllActiveThresholds();
      return { thresholds };
    }
  );

  /**
   * GET /thresholds/by-context
   * Get threshold by context
   */
  fastify.get(
    '/thresholds/by-context',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ThresholdContextQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = ThresholdContextQuerySchema.parse(request.query);
      const threshold = await thresholdService.getThresholdByContext(
        query.contextType as ThresholdContextType,
        query.contextId
      );

      if (!threshold) {
        return reply.status(404).send({ error: 'Threshold not found' });
      }

      return threshold;
    }
  );

  /**
   * POST /thresholds
   * Create a new threshold
   */
  fastify.post(
    '/thresholds',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof CreateThresholdSchema> }>, reply: FastifyReply) => {
      const body = CreateThresholdSchema.parse(request.body);
      const threshold = await thresholdService.createThreshold(body, request.user.id);
      return reply.status(201).send(threshold);
    }
  );

  /**
   * PUT /thresholds/:id
   * Update a threshold
   */
  fastify.put(
    '/thresholds/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ThresholdIdParamsSchema>;
        Body: z.infer<typeof UpdateThresholdSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const params = ThresholdIdParamsSchema.parse(request.params);
      const body = UpdateThresholdSchema.parse(request.body);

      const existing = await thresholdService.getThreshold(params.id);
      if (!existing) {
        return reply.status(404).send({ error: 'Threshold not found' });
      }

      const threshold = await thresholdService.updateThreshold(params.id, body);
      return threshold;
    }
  );

  /**
   * DELETE /thresholds/:id
   * Delete a threshold
   */
  fastify.delete(
    '/thresholds/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof ThresholdIdParamsSchema> }>, reply: FastifyReply) => {
      const params = ThresholdIdParamsSchema.parse(request.params);

      const existing = await thresholdService.getThreshold(params.id);
      if (!existing) {
        return reply.status(404).send({ error: 'Threshold not found' });
      }

      await thresholdService.deleteThreshold(params.id);
      return reply.status(204).send();
    }
  );

  /**
   * POST /thresholds/presets
   * Create preset thresholds
   */
  fastify.post(
    '/thresholds/presets',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const thresholds = await thresholdService.createPresetThresholds(request.user.id);
      return reply.status(201).send({ thresholds });
    }
  );

  // ============================================================================
  // Admin/Statistics Endpoints
  // ============================================================================

  /**
   * GET /trust-score/statistics
   * Get global trust score statistics
   */
  fastify.get(
    '/trust-score/statistics',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await trustScoreService.getStatistics();
      return stats;
    }
  );

  /**
   * GET /compliance/statistics
   * Get global compliance statistics
   */
  fastify.get(
    '/compliance/statistics',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await complianceRepository.getGlobalStats();
      return stats;
    }
  );

  /**
   * POST /trust-score/batch-recalculate
   * Batch recalculate trust scores (admin only)
   */
  fastify.post(
    '/trust-score/batch-recalculate',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (
      request: FastifyRequest<{ Body: { userIds: string[]; triggerEvent?: TrustScoreTriggerEvent } }>,
      reply: FastifyReply
    ) => {
      const { userIds, triggerEvent } = request.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return reply.status(400).send({ error: 'userIds array is required' });
      }

      if (userIds.length > 100) {
        return reply.status(400).send({ error: 'Maximum 100 users per batch' });
      }

      const result = await trustScoreService.batchRecalculate(userIds, triggerEvent);

      return result;
    }
  );
}

// Type declarations for Fastify decorators
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (permissions: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      permissions: string[];
    };
  }
}
