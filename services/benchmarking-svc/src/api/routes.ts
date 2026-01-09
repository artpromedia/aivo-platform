/**
 * Benchmarking API Routes
 *
 * REST API endpoints for cross-district benchmarking.
 */

import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  ParticipationService,
  BenchmarkService,
  AggregationService,
  InsightsService,
} from '../services';
import { requireAdminRole } from '../middleware/auth';
import type { MetricCategory, InsightType } from '../types';

// Request schemas
const enrollmentSchema = z.object({
  tenantId: z.string(),
  districtName: z.string(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'VERY_LARGE']),
  geographicType: z.enum(['URBAN', 'SUBURBAN', 'RURAL']),
  studentCount: z.number().int().positive(),
  freeReducedLunchPct: z.number().min(0).max(100).optional(),
  state: z.string().length(2),
  gradeLevelsServed: z.array(z.string()),
  consentedBy: z.string(),
  sharingPreferences: z
    .object({
      shareAcademicData: z.boolean(),
      shareEngagementData: z.boolean(),
      shareAiEffectiveness: z.boolean(),
      shareOperationalData: z.boolean(),
      allowPeerContact: z.boolean(),
    })
    .optional(),
});

const preferencesSchema = z.object({
  shareAcademicData: z.boolean().optional(),
  shareEngagementData: z.boolean().optional(),
  shareAiEffectiveness: z.boolean().optional(),
  shareOperationalData: z.boolean().optional(),
  allowPeerContact: z.boolean().optional(),
});

const metricSubmissionSchema = z.object({
  metrics: z.array(
    z.object({
      category: z.enum(['ACADEMIC_PERFORMANCE', 'ENGAGEMENT', 'AI_EFFECTIVENESS', 'OPERATIONAL']),
      metricKey: z.string(),
      metricValue: z.number(),
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
      periodType: z.enum(['monthly', 'quarterly', 'yearly']),
      sampleSize: z.number().int().positive(),
      confidenceLevel: z.number().min(0).max(1).optional(),
    })
  ),
});

const compareQuerySchema = z.object({
  cohortIds: z.string().optional(), // Comma-separated
  categories: z.string().optional(), // Comma-separated
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

export function registerBenchmarkingRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const participationService = new ParticipationService(prisma);
  const benchmarkService = new BenchmarkService(prisma);
  const aggregationService = new AggregationService(prisma);
  const insightsService = new InsightsService(prisma);

  // ============================================================
  // Participation Endpoints
  // ============================================================

  /**
   * Get participation status
   */
  app.get(
    '/api/v1/participation',
    async (
      request: FastifyRequest<{ Headers: { 'x-tenant-id': string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const profile = await participationService.getProfile(tenantId);

      if (!profile) {
        return reply.status(404).send({ error: 'Not enrolled in benchmarking' });
      }

      return profile;
    }
  );

  /**
   * Enroll in benchmarking program
   */
  app.post('/api/v1/participation/enroll', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = enrollmentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
    }

    try {
      const profile = await participationService.enroll(parseResult.data);
      return reply.status(201).send(profile);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already enrolled')) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * Update sharing preferences
   */
  app.patch(
    '/api/v1/participation/settings',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string; 'x-user-id': string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];
      const userId = request.headers['x-user-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const parseResult = preferencesSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.issues,
        });
      }

      const profile = await participationService.updatePreferences(
        tenantId,
        parseResult.data,
        userId ?? 'system'
      );

      return profile;
    }
  );

  /**
   * Withdraw from benchmarking
   */
  app.delete(
    '/api/v1/participation',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string; 'x-user-id': string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];
      const userId = request.headers['x-user-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      await participationService.withdraw(tenantId, userId ?? 'system');
      return reply.status(204).send();
    }
  );

  // ============================================================
  // Benchmark Comparison Endpoints
  // ============================================================

  /**
   * Get district summary
   */
  app.get(
    '/api/v1/benchmarks/summary',
    async (
      request: FastifyRequest<{ Headers: { 'x-tenant-id': string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const summary = await benchmarkService.getDistrictSummary(tenantId);

      if (!summary) {
        return reply.status(404).send({ error: 'Not enrolled or not active' });
      }

      return summary;
    }
  );

  /**
   * Compare against peers
   */
  app.get(
    '/api/v1/benchmarks/compare',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string };
        Querystring: z.infer<typeof compareQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const query = request.query;

      const options = {
        cohortIds: query.cohortIds?.split(','),
        categories: query.categories?.split(',') as MetricCategory[] | undefined,
        periodStart: query.periodStart ? new Date(query.periodStart) : undefined,
        periodEnd: query.periodEnd ? new Date(query.periodEnd) : undefined,
      };

      const comparisons = await benchmarkService.compareWithPeers(tenantId, options);
      return { comparisons };
    }
  );

  /**
   * Get peer rankings
   */
  app.get(
    '/api/v1/benchmarks/rankings/:metricKey',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string };
        Params: { metricKey: string };
        Querystring: { cohortId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];
      const { metricKey } = request.params;
      const { cohortId } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const rankings = await benchmarkService.getPeerRankings(tenantId, metricKey, cohortId);

      if (!rankings) {
        return reply.status(404).send({ error: 'Rankings not available' });
      }

      return rankings;
    }
  );

  // ============================================================
  // Metric Submission Endpoints
  // ============================================================

  /**
   * Submit metrics
   */
  app.post(
    '/api/v1/metrics',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string; 'x-user-id': string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];
      const userId = request.headers['x-user-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const parseResult = metricSubmissionSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.issues,
        });
      }

      const metrics = parseResult.data.metrics.map((m) => ({
        ...m,
        periodStart: new Date(m.periodStart),
        periodEnd: new Date(m.periodEnd),
      }));

      const result = await aggregationService.submitMetrics(tenantId, metrics, userId ?? 'system');

      return result;
    }
  );

  // ============================================================
  // Insights Endpoints
  // ============================================================

  /**
   * Get insights
   */
  app.get(
    '/api/v1/insights',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string };
        Querystring: {
          category?: MetricCategory;
          type?: InsightType;
          limit?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const { category, type, limit } = request.query;

      const insights = await insightsService.getInsights(tenantId, {
        category,
        type,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return { insights };
    }
  );

  /**
   * Get recommendations
   */
  app.get(
    '/api/v1/insights/recommendations',
    async (
      request: FastifyRequest<{ Headers: { 'x-tenant-id': string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const recommendations = await insightsService.getRecommendations(tenantId);
      return { recommendations };
    }
  );

  /**
   * Generate fresh insights
   */
  app.post(
    '/api/v1/insights/generate',
    async (
      request: FastifyRequest<{ Headers: { 'x-tenant-id': string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const insights = await insightsService.generateInsights(tenantId);
      return { insights, generated: insights.length };
    }
  );

  /**
   * Acknowledge an insight
   */
  app.post(
    '/api/v1/insights/:insightId/acknowledge',
    async (
      request: FastifyRequest<{
        Headers: { 'x-tenant-id': string; 'x-user-id': string };
        Params: { insightId: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'];
      const userId = request.headers['x-user-id'];
      const { insightId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      await insightsService.acknowledgeInsight(tenantId, insightId, userId ?? 'system');

      return reply.status(204).send();
    }
  );

  // ============================================================
  // Admin Endpoints
  // ============================================================

  /**
   * List all participants (admin)
   */
  app.get(
    '/api/v1/admin/participants',
    { preHandler: [requireAdminRole] },
    async (
      request: FastifyRequest<{
        Querystring: {
          status?: string;
          state?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { status, state, limit, offset } = request.query;

      const result = await participationService.listParticipants({
        status: status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | undefined,
        state,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return result;
    }
  );

  /**
   * Activate a pending participant (admin)
   */
  app.post(
    '/api/v1/admin/participants/:tenantId/activate',
    { preHandler: [requireAdminRole] },
    async (
      request: FastifyRequest<{
        Headers: { 'x-admin-id': string };
        Params: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      // Extract admin ID from JWT user subject
      const adminId = request.user?.sub ?? request.headers['x-admin-id'];
      const { tenantId } = request.params;

      const profile = await participationService.activate(tenantId, adminId ?? 'admin');

      return profile;
    }
  );

  /**
   * Suspend a participant (admin)
   */
  app.post(
    '/api/v1/admin/participants/:tenantId/suspend',
    { preHandler: [requireAdminRole] },
    async (
      request: FastifyRequest<{
        Headers: { 'x-admin-id': string };
        Params: { tenantId: string };
        Body: { reason: string };
      }>,
      reply: FastifyReply
    ) => {
      // Extract admin ID from JWT user subject
      const adminId = request.user?.sub ?? request.headers['x-admin-id'];
      const { tenantId } = request.params;
      const body = request.body as { reason?: string };

      await participationService.suspend(
        tenantId,
        adminId ?? 'admin',
        body.reason ?? 'Administrative action'
      );

      return reply.status(204).send();
    }
  );

  /**
   * Trigger aggregate recomputation (admin)
   */
  app.post(
    '/api/v1/admin/cohorts/:cohortId/recompute',
    { preHandler: [requireAdminRole] },
    async (request: FastifyRequest<{ Params: { cohortId: string } }>, reply: FastifyReply) => {
      const { cohortId } = request.params;

      await aggregationService.recomputeCohortAggregates(cohortId);

      return { status: 'completed', cohortId };
    }
  );
}
