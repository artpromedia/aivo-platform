/**
 * Safety Admin Routes
 *
 * Admin API for monitoring and configuring the AI Content Safety system.
 * Restricted to PLATFORM_ADMIN and DISTRICT_ADMIN roles.
 *
 * Endpoints:
 *   GET  /admin/safety/stats       — block counts (24h/7d/30d) by tenant
 *   GET  /admin/safety/violations  — paginated violation metadata
 *   POST /admin/safety/config      — update tenant safety config
 *   GET  /admin/safety/config      — get current tenant safety config
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import Redis from 'ioredis';

import { getSafetyConfig, setSafetyConfig } from '../safety/safety-config.js';
import type {
  SafetyConfig,
  SafetyStatsResponse,
  SafetyViolationRecord,
} from '../safety/safety.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// REDIS KEYS
// ══════════════════════════════════════════════════════════════════════════════

const VIOLATIONS_KEY = 'safety:violations';

function getRedis(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Record a safety violation in Redis sorted set (used by the middleware).
 * Stored as JSON with score = unix timestamp for range queries.
 */
export async function recordViolation(record: SafetyViolationRecord): Promise<void> {
  const redis = getRedis();
  try {
    const score = new Date(record.timestamp).getTime();
    await redis.zadd(VIOLATIONS_KEY, score, JSON.stringify(record));
    // Auto-expire entries older than 90 days
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    await redis.zremrangebyscore(VIOLATIONS_KEY, '-inf', ninetyDaysAgo);
  } catch {
    /* best-effort */
  } finally {
    redis.disconnect();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerSafetyAdminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // ─── GET /admin/safety/stats ─────────────────────────────────────────────
  app.get(
    '/admin/safety/stats',
    async (
      request: FastifyRequest<{ Querystring: { tenantId?: string } }>,
      reply,
    ) => {
      const tenantId = request.query.tenantId || 'all';
      const redis = getRedis();

      try {
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        // Fetch violations from the last 30 days
        const thirtyDaysAgo = now - 30 * day;
        const raw = await redis.zrangebyscore(VIOLATIONS_KEY, thirtyDaysAgo, '+inf');

        let violations: SafetyViolationRecord[] = raw.map(
          (r) => JSON.parse(r) as SafetyViolationRecord,
        );

        if (tenantId !== 'all') {
          violations = violations.filter((v) => v.tenantId === tenantId);
        }

        const sevenDaysAgo = now - 7 * day;
        const oneDayAgo = now - 1 * day;

        const blocks24h = violations.filter(
          (v) => new Date(v.timestamp).getTime() >= oneDayAgo,
        ).length;
        const blocks7d = violations.filter(
          (v) => new Date(v.timestamp).getTime() >= sevenDaysAgo,
        ).length;
        const blocks30d = violations.length;

        // Top flag types
        const flagCounts: Record<string, number> = {};
        for (const v of violations) {
          for (const f of v.flags) {
            flagCounts[f.type] = (flagCounts[f.type] || 0) + 1;
          }
        }
        const topFlagTypes = Object.entries(flagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([type, count]) => ({ type, count }));

        const stats: SafetyStatsResponse = {
          tenantId,
          blocks24h,
          blocks7d,
          blocks30d,
          topFlagTypes,
        };

        return reply.send(stats);
      } finally {
        redis.disconnect();
      }
    },
  );

  // ─── GET /admin/safety/violations ────────────────────────────────────────
  app.get(
    '/admin/safety/violations',
    async (
      request: FastifyRequest<{
        Querystring: { tenantId?: string; page?: string; limit?: string };
      }>,
      reply,
    ) => {
      const tenantId = request.query.tenantId;
      const page = Math.max(1, parseInt(request.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
      const redis = getRedis();

      try {
        // Get all violations sorted descending by timestamp
        const raw = await redis.zrevrangebyscore(VIOLATIONS_KEY, '+inf', '-inf');
        let violations: SafetyViolationRecord[] = raw.map(
          (r) => JSON.parse(r) as SafetyViolationRecord,
        );

        if (tenantId) {
          violations = violations.filter((v) => v.tenantId === tenantId);
        }

        const total = violations.length;
        const start = (page - 1) * limit;
        const items = violations.slice(start, start + limit);

        return reply.send({
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      } finally {
        redis.disconnect();
      }
    },
  );

  // ─── POST /admin/safety/config ───────────────────────────────────────────
  app.post(
    '/admin/safety/config',
    async (
      request: FastifyRequest<{
        Body: { tenantId: string } & Partial<SafetyConfig>;
      }>,
      reply,
    ) => {
      const { tenantId, ...configUpdate } = request.body;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId is required' });
      }

      const updated = await setSafetyConfig(tenantId, configUpdate);

      request.log.info(
        { tenantId, config: updated },
        'Safety config updated for tenant',
      );

      return reply.send(updated);
    },
  );

  // ─── GET /admin/safety/config ────────────────────────────────────────────
  app.get(
    '/admin/safety/config',
    async (
      request: FastifyRequest<{ Querystring: { tenantId: string } }>,
      reply,
    ) => {
      const tenantId = request.query.tenantId;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter is required' });
      }

      const config = await getSafetyConfig(tenantId);
      return reply.send(config);
    },
  );
};
