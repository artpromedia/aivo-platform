/**
 * AI Rate-Limit Middleware (Governance)
 *
 * Fastify plugin that enforces per-student / per-tenant AI request limits
 * using Redis-backed counters via AiGovernanceUsageTracker.
 *
 * Applied as a preHandler hook on AI-related routes:
 *   /ai/*, /homework/*, /session/*, /generation/*, /iep/*, /social-story/*
 *
 * Returns 429 with standard rate-limit headers when a limit is hit.
 *
 * @module middleware/rate-limit.middleware
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';

import { config } from '../config.js';
import { AiGovernanceUsageTracker } from '../governance/ai-usage-tracker.js';

// ══════════════════════════════════════════════════════════════════════════════
// OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface AiRateLimitOptions {
  redis: Redis;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE MATCHER
// ══════════════════════════════════════════════════════════════════════════════

const AI_ROUTE_PREFIXES = [
  '/ai/',
  '/homework/',
  '/session/',
  '/generation/',
  '/iep/',
  '/social-story/',
  '/emotional-state/',
  '/brain/',
];

function isAiRoute(url: string): boolean {
  const path = url.split('?')[0]!.toLowerCase();
  return AI_ROUTE_PREFIXES.some((prefix) => path.includes(prefix));
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export const aiRateLimitMiddleware: FastifyPluginAsync<AiRateLimitOptions> = async (
  app: FastifyInstance,
  opts,
) => {
  const enabled = config.aiRateLimitEnabled;

  if (!enabled) {
    app.log.warn('[ai-rate-limit] AI rate limiting is DISABLED via AI_RATE_LIMIT_ENABLED=false');
    return;
  }

  const { redis } = opts;
  const auditSvcUrl = config.auditSvcUrl || 'http://audit-svc:4050';
  const tracker = new AiGovernanceUsageTracker(redis, auditSvcUrl);

  // Cleanup on close
  app.addHook('onClose', async () => {
    await tracker.close();
  });

  // preHandler — runs before the route handler
  app.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!isAiRoute(request.url)) return;

      // Extract identity from request body or query
      const body = (request.body ?? {}) as Record<string, unknown>;
      const query = (request.query ?? {}) as Record<string, unknown>;

      const tenantId =
        (body.tenantId as string) ??
        (query.tenantId as string) ??
        ((request as Record<string, unknown>).tenantId as string) ??
        '';
      const studentId =
        (body.studentId as string) ??
        (query.studentId as string) ??
        ((request as Record<string, unknown>).studentId as string) ??
        '';
      const userId =
        (body.userId as string) ??
        (query.userId as string) ??
        ((request as Record<string, unknown>).userId as string) ??
        '';

      // If we can't identify the student, skip rate limiting (don't block)
      if (!studentId || !tenantId) return;

      try {
        const result = await tracker.checkRateLimit({
          tenantId,
          userId,
          studentId,
          context: request.url.split('?')[0] ?? request.url,
        });

        // Always set rate-limit headers
        reply.header('X-RateLimit-Remaining', String(result.remaining));
        reply.header('X-RateLimit-Reset', result.resetAt.toISOString());

        if (!result.allowed) {
          reply.header(
            'X-RateLimit-Limit',
            result.limitType === 'student_hourly'
              ? String(config.aiRateLimitStudentHourly)
              : String(config.aiRateLimitStudentDaily),
          );
          reply.header('Retry-After', String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)));

          request.log.warn(
            {
              tenantId,
              studentId,
              limitType: result.limitType,
              resetAt: result.resetAt.toISOString(),
            },
            'AI rate limit exceeded',
          );

          reply.code(429).send({
            error: 'AI rate limit exceeded',
            limitType: result.limitType,
            remaining: 0,
            resetAt: result.resetAt.toISOString(),
          });
        }
      } catch (err) {
        // Rate-limit check failure should NEVER block the AI pipeline
        request.log.error(err, 'Rate-limit check failed — allowing request');
      }
    },
  );

  app.log.info('[ai-rate-limit] AI Rate Limiting active');
};
