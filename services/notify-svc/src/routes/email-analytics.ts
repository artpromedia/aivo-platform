/**
 * Email Analytics Routes
 *
 * REST endpoints for querying OonruMail analytics data.
 * All routes are admin-only (require x-user-roles header with an admin role).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { emailAnalyticsService } from '../channels/email/analytics.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'DISTRICT_ADMIN'];

function requireAdmin(request: FastifyRequest): void {
  const rolesHeader = request.headers['x-user-roles'] as string;
  const roles = rolesHeader ? rolesHeader.split(',').map((r) => r.trim()) : [];
  if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
    const err = new Error('Forbidden');
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const TimeSeriesQuerySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  interval: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerEmailAnalyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // Ensure service is initialised
  emailAnalyticsService.initialize();

  /**
   * GET /api/v1/email/analytics/overview
   * High-level delivery / open / click / bounce rates.
   */
  fastify.get(
    '/api/v1/email/analytics/overview',
    async (request: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(request);

      const stats = await emailAnalyticsService.getOverview();
      if (!stats) {
        return reply.status(503).send({ error: 'Email analytics not available' });
      }
      return reply.send({ data: stats });
    },
  );

  /**
   * GET /api/v1/email/analytics/timeseries?start=<ISO>&end=<ISO>&interval=day
   * Time-series data points over a date range.
   */
  fastify.get(
    '/api/v1/email/analytics/timeseries',
    async (
      request: FastifyRequest<{ Querystring: Record<string, string> }>,
      reply: FastifyReply,
    ) => {
      requireAdmin(request);

      const parsed = TimeSeriesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation error', details: parsed.error.errors });
      }

      const { start, end, interval } = parsed.data;
      const data = await emailAnalyticsService.getTimeSeries(start, end, interval);
      if (!data) {
        return reply.status(503).send({ error: 'Email analytics not available' });
      }
      return reply.send({ data });
    },
  );

  /**
   * GET /api/v1/email/analytics/bounces
   * Bounce breakdown: hard, soft, total, by_domain.
   */
  fastify.get(
    '/api/v1/email/analytics/bounces',
    async (request: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(request);

      const data = await emailAnalyticsService.getBounceBreakdown();
      if (!data) {
        return reply.status(503).send({ error: 'Email analytics not available' });
      }
      return reply.send({ data });
    },
  );

  /**
   * GET /api/v1/email/analytics/realtime
   * Real-time sending stats (not cached).
   */
  fastify.get(
    '/api/v1/email/analytics/realtime',
    async (request: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(request);

      const data = await emailAnalyticsService.getRealtime();
      if (!data) {
        return reply.status(503).send({ error: 'Email analytics not available' });
      }
      return reply.send({ data });
    },
  );
}
