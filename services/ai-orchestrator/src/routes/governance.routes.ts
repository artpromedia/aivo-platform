/**
 * AI Governance Routes
 *
 * Admin / teacher endpoints for AI usage stats, rate-limit configuration,
 * student AI history, and explainability.
 *
 * Endpoints:
 *   GET  /governance/usage-stats               — tenant AI usage stats
 *   POST /governance/rate-limits               — set tenant AI rate limits
 *   GET  /governance/students/:studentId/history — student AI audit trail
 *   GET  /governance/explain/:recommendationId — explain a recommendation
 *   GET  /governance/students/:studentId/insights — student insight summary
 *   GET  /governance/content/:contentId/score  — explain content score
 *
 * @module routes/governance
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import type Redis from 'ioredis';

import { config } from '../config.js';
import { AiAuditLogger } from '../governance/ai-audit-logger.js';
import { AiGovernanceUsageTracker } from '../governance/ai-usage-tracker.js';
import type { TenantAiLimits } from '../governance/ai-usage-tracker.js';
import { ExplainabilityService } from '../governance/explainability.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface GovernanceRoutesOptions {
  redis: Redis;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export const registerGovernanceRoutes: FastifyPluginAsync<GovernanceRoutesOptions> = async (
  app: FastifyInstance,
  opts,
) => {
  const { redis } = opts;

  // Initialise governance services
  const auditSvcUrl = config.auditSvcUrl || 'http://audit-svc:4050';
  const usageTracker = new AiGovernanceUsageTracker(redis, auditSvcUrl);
  const auditLogger = new AiAuditLogger({ auditSvcUrl });
  const explainability = new ExplainabilityService({
    brainEngineUrl: config.brainEngineUrl || 'http://brain-engine:8080',
    cognitiveLoadSvcUrl: config.cognitiveLoadSvcUrl || 'http://cognitive-load-svc:4060',
    mlRecommendationUrl: config.mlRecommendationUrl || 'http://ml-recommendation-svc:4070',
  });

  // Cleanup on server close
  app.addHook('onClose', async () => {
    await usageTracker.close();
    await auditLogger.close();
  });

  // ─── GET /governance/usage-stats ───────────────────────────────────────

  app.get(
    '/governance/usage-stats',
    async (
      request: FastifyRequest<{
        Querystring: { tenantId: string; period?: 'day' | 'week' | 'month' };
      }>,
      reply,
    ) => {
      const { tenantId, period } = request.query;
      if (!tenantId) {
        return reply.code(400).send({ error: 'tenantId is required' });
      }

      try {
        const stats = await usageTracker.getUsageStats(tenantId, period ?? 'day');
        return reply.send(stats);
      } catch (err) {
        request.log.error(err, 'Failed to fetch usage stats');
        return reply.code(500).send({ error: 'Failed to fetch usage stats' });
      }
    },
  );

  // ─── POST /governance/rate-limits ──────────────────────────────────────

  app.post(
    '/governance/rate-limits',
    async (
      request: FastifyRequest<{
        Body: { tenantId: string; limits: TenantAiLimits };
      }>,
      reply,
    ) => {
      const { tenantId, limits } = request.body ?? {};
      if (!tenantId || !limits) {
        return reply.code(400).send({ error: 'tenantId and limits are required' });
      }

      if (
        typeof limits.studentDailyLimit !== 'number' ||
        typeof limits.studentHourlyLimit !== 'number' ||
        typeof limits.tenantDailyLimit !== 'number'
      ) {
        return reply
          .code(400)
          .send({ error: 'limits must include studentDailyLimit, studentHourlyLimit, tenantDailyLimit' });
      }

      try {
        await usageTracker.setTenantLimits(tenantId, limits);
        return reply.send({ ok: true, tenantId, limits });
      } catch (err) {
        request.log.error(err, 'Failed to set rate limits');
        return reply.code(500).send({ error: 'Failed to set rate limits' });
      }
    },
  );

  // ─── GET /governance/students/:studentId/history ───────────────────────

  app.get(
    '/governance/students/:studentId/history',
    async (
      request: FastifyRequest<{
        Params: { studentId: string };
        Querystring: {
          tenantId: string;
          startDate?: string;
          endDate?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply,
    ) => {
      const { studentId } = request.params;
      const { tenantId, startDate, endDate, limit, offset } = request.query;

      if (!tenantId) {
        return reply.code(400).send({ error: 'tenantId is required' });
      }

      try {
        const result = await auditLogger.queryStudentHistory({
          tenantId,
          studentId,
          startDate,
          endDate,
          limit: limit ? parseInt(limit, 10) : undefined,
          offset: offset ? parseInt(offset, 10) : undefined,
        });
        return reply.send(result);
      } catch (err) {
        request.log.error(err, 'Failed to fetch student AI history');
        return reply.code(500).send({ error: 'Failed to fetch student AI history' });
      }
    },
  );

  // ─── GET /governance/explain/:recommendationId ─────────────────────────

  app.get(
    '/governance/explain/:recommendationId',
    async (
      request: FastifyRequest<{ Params: { recommendationId: string } }>,
      reply,
    ) => {
      const { recommendationId } = request.params;

      try {
        const explanation = await explainability.explainRecommendation(recommendationId);
        return reply.send(explanation);
      } catch (err) {
        request.log.error(err, 'Failed to explain recommendation');
        return reply.code(502).send({ error: 'Explainability service unavailable' });
      }
    },
  );

  // ─── GET /governance/students/:studentId/insights ──────────────────────

  app.get(
    '/governance/students/:studentId/insights',
    async (
      request: FastifyRequest<{
        Params: { studentId: string };
        Querystring: { tenantId: string };
      }>,
      reply,
    ) => {
      const { studentId } = request.params;
      const { tenantId } = request.query;

      if (!tenantId) {
        return reply.code(400).send({ error: 'tenantId is required' });
      }

      try {
        const insights = await explainability.getStudentInsightSummary(tenantId, studentId);
        return reply.send(insights);
      } catch (err) {
        request.log.error(err, 'Failed to build student insights');
        return reply.code(500).send({ error: 'Failed to build student insights' });
      }
    },
  );

  // ─── GET /governance/content/:contentId/score ──────────────────────────

  app.get(
    '/governance/content/:contentId/score',
    async (
      request: FastifyRequest<{ Params: { contentId: string } }>,
      reply,
    ) => {
      const { contentId } = request.params;

      try {
        const explanation = await explainability.explainContentScore(contentId);
        return reply.send(explanation);
      } catch (err) {
        request.log.error(err, 'Failed to explain content score');
        return reply.code(502).send({ error: 'Content score service unavailable' });
      }
    },
  );
};
