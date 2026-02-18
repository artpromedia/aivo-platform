/**
 * Usage Tracking API Routes
 *
 * Public route: GET  /billing/usage/:tenantId        — dashboard view
 * Internal routes for service-to-service counter updates:
 *   POST /internal/billing/usage/:tenantId/increment
 *   POST /internal/billing/usage/:tenantId/decrement
 *   POST /internal/billing/usage/:tenantId/set
 *   POST /internal/billing/usage/:tenantId/reconcile-seats
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type { PlanLimits } from '../config/plans.config.js';
import { entitlementsService } from '../services/entitlements.service.js';
import {
  usageTrackingService,
  type CounterType,
} from '../services/usage-tracking.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// VALID COUNTER TYPES (for input validation)
// ══════════════════════════════════════════════════════════════════════════════

const VALID_COUNTER_TYPES: readonly string[] = [
  'learners',
  'teachers',
  'admins',
  'sessionsThisMonth',
  'contentItems',
  'assessments',
  'storageBytes',
  'apiCallsThisMonth',
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function usageRoutes(fastify: FastifyInstance): Promise<void> {

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC — Dashboard usage summary
  // ────────────────────────────────────────────────────────────────────────

  /**
   * GET /billing/usage/:tenantId
   *
   * Returns used / limit / remaining for every tracked counter.
   */
  fastify.get<{ Params: { tenantId: string } }>(
    '/billing/usage/:tenantId',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              usage: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    counter: { type: 'string' },
                    used: { type: 'number' },
                    limit: { type: ['number', 'null'] },
                    remaining: { type: ['number', 'null'] },
                    percentUsed: { type: ['number', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { tenantId: string } }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;

      const [summary, entitlements] = await Promise.all([
        usageTrackingService.getAllCounters(tenantId),
        entitlementsService.getEntitlements(tenantId),
      ]);

      // Build limit map from entitlements
      const limits = entitlements?.limits ?? null;

      const usage = summary.counters.map((c) => {
        const limit = limitForCounter(c.counterType, limits, entitlements);
        const used = c.currentValue;
        const remaining = limit === null ? null : Math.max(0, limit - used);
        const percentUsed = limit === null || limit === 0
          ? null
          : Math.round((used / limit) * 100);

        return {
          counter: c.counterType,
          used,
          limit,
          remaining,
          percentUsed,
        };
      });

      return reply.send({ tenantId, usage });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Increment counter
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Params: { tenantId: string };
    Body: { counterType: string; delta?: number; periodStart?: string; periodEnd?: string };
  }>(
    '/internal/billing/usage/:tenantId/increment',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        body: {
          type: 'object',
          properties: {
            counterType: { type: 'string' },
            delta: { type: 'number' },
            periodStart: { type: 'string', format: 'date-time' },
            periodEnd: { type: 'string', format: 'date-time' },
          },
          required: ['counterType'],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: { counterType: string; delta?: number; periodStart?: string; periodEnd?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const { counterType, periodStart, periodEnd } = request.body;
      const delta = request.body.delta ?? 1;

      if (!VALID_COUNTER_TYPES.includes(counterType)) {
        return reply.status(400).send({ error: 'INVALID_COUNTER_TYPE', counterType });
      }

      const period =
        periodStart && periodEnd
          ? { start: new Date(periodStart), end: new Date(periodEnd) }
          : undefined;

      const newValue = await usageTrackingService.increment(
        tenantId,
        counterType as CounterType,
        delta,
        period,
      );

      // Invalidate entitlements cache since usage changed
      entitlementsService.invalidateCache(tenantId);

      return reply.send({ tenantId, counterType, currentValue: newValue });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Decrement counter
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Params: { tenantId: string };
    Body: { counterType: string; delta?: number };
  }>(
    '/internal/billing/usage/:tenantId/decrement',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        body: {
          type: 'object',
          properties: {
            counterType: { type: 'string' },
            delta: { type: 'number' },
          },
          required: ['counterType'],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: { counterType: string; delta?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const { counterType } = request.body;
      const delta = request.body.delta ?? 1;

      if (!VALID_COUNTER_TYPES.includes(counterType)) {
        return reply.status(400).send({ error: 'INVALID_COUNTER_TYPE', counterType });
      }

      const newValue = await usageTrackingService.decrement(
        tenantId,
        counterType as CounterType,
        delta,
      );

      entitlementsService.invalidateCache(tenantId);

      return reply.send({ tenantId, counterType, currentValue: newValue });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Set counter (absolute)
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Params: { tenantId: string };
    Body: { counterType: string; value: number; periodStart?: string; periodEnd?: string };
  }>(
    '/internal/billing/usage/:tenantId/set',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        body: {
          type: 'object',
          properties: {
            counterType: { type: 'string' },
            value: { type: 'number' },
            periodStart: { type: 'string', format: 'date-time' },
            periodEnd: { type: 'string', format: 'date-time' },
          },
          required: ['counterType', 'value'],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: { counterType: string; value: number; periodStart?: string; periodEnd?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const { counterType, value, periodStart, periodEnd } = request.body;

      if (!VALID_COUNTER_TYPES.includes(counterType)) {
        return reply.status(400).send({ error: 'INVALID_COUNTER_TYPE', counterType });
      }

      const period =
        periodStart && periodEnd
          ? { start: new Date(periodStart), end: new Date(periodEnd) }
          : undefined;

      await usageTrackingService.set(
        tenantId,
        counterType as CounterType,
        value,
        period,
      );

      entitlementsService.invalidateCache(tenantId);

      return reply.send({ tenantId, counterType, currentValue: value });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Reconcile seat counts
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Params: { tenantId: string };
    Body: { learners: number; teachers: number; admins: number };
  }>(
    '/internal/billing/usage/:tenantId/reconcile-seats',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        body: {
          type: 'object',
          properties: {
            learners: { type: 'number' },
            teachers: { type: 'number' },
            admins: { type: 'number' },
          },
          required: ['learners', 'teachers', 'admins'],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: { learners: number; teachers: number; admins: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const { learners, teachers, admins } = request.body;

      await usageTrackingService.reconcileSeats(tenantId, { learners, teachers, admins });
      entitlementsService.invalidateCache(tenantId);

      return reply.send({ success: true, tenantId });
    },
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve the numeric limit for a given counter type from plan entitlements.
 */
function limitForCounter(
  counterType: string,
  limits: PlanLimits | null,
  entitlements: { maxLearners: number; maxTeachers: number; maxAdmins: number } | null,
): number | null {
  if (!limits && !entitlements) return null;

  switch (counterType) {
    case 'learners':
      return entitlements?.maxLearners ?? null;
    case 'teachers':
      return entitlements?.maxTeachers ?? null;
    case 'admins':
      return entitlements?.maxAdmins ?? null;
    case 'sessionsThisMonth':
      return limits?.sessionsPerMonth ?? null;
    case 'contentItems':
      return limits?.contentItems ?? null;
    case 'assessments':
      return limits?.assessments ?? null;
    case 'storageBytes':
      // Convert GB limit to bytes for comparison
      return limits?.storageGb != null ? limits.storageGb * 1_073_741_824 : null;
    case 'apiCallsThisMonth':
      return limits?.apiCallsPerMonth ?? null;
    default:
      return null;
  }
}
