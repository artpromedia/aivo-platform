/**
 * Usage Metering API Routes (Sprint 12)
 *
 * Public routes (district dashboard):
 *   GET  /billing/metering/:tenantId            — current period summary
 *   GET  /billing/metering/:tenantId/history     — historical usage data
 *   GET  /billing/metering/:tenantId/limits      — limit check for all metrics
 *   GET  /billing/metering/:tenantId/export      — CSV export of usage data
 *
 * Internal routes (service-to-service):
 *   POST /internal/billing/metering/:tenantId/record   — record usage event
 *   POST /internal/billing/metering/:tenantId/provision — provision meters
 *   POST /internal/billing/metering/report-stripe       — force Stripe report
 *   POST /internal/billing/metering/rollover            — force period rollover
 *   POST /internal/billing/metering/snapshots           — build snapshots
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  meteringService,
  type MeterMetric,
  ALL_METRICS,
} from '../services/metering.service.js';
import { stripeUsageReporter } from '../events/stripe-usage-reporter.js';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

const VALID_METRICS: readonly string[] = ALL_METRICS;
const VALID_GRANULARITIES = ['hourly', 'daily'] as const;

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function meteringRoutes(fastify: FastifyInstance): Promise<void> {

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC — Current period usage summary
  // ────────────────────────────────────────────────────────────────────────

  fastify.get<{ Params: { tenantId: string } }>(
    '/billing/metering/:tenantId',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { tenantId: string } }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const summary = await meteringService.getSummary(tenantId);
      return reply.send(summary);
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC — Usage history for charts
  // ────────────────────────────────────────────────────────────────────────

  fastify.get<{
    Params: { tenantId: string };
    Querystring: {
      metric: string;
      granularity?: string;
      from?: string;
      to?: string;
    };
  }>(
    '/billing/metering/:tenantId/history',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        querystring: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            granularity: { type: 'string', enum: ['hourly', 'daily'] },
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
          required: ['metric'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = request.params;
      const { metric, granularity = 'daily', from, to } = request.query;

      if (!VALID_METRICS.includes(metric)) {
        return reply.status(400).send({ error: 'INVALID_METRIC', metric });
      }

      if (!VALID_GRANULARITIES.includes(granularity as typeof VALID_GRANULARITIES[number])) {
        return reply.status(400).send({ error: 'INVALID_GRANULARITY', granularity });
      }

      const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to) : new Date();

      const history = await meteringService.getHistory(
        tenantId,
        metric as MeterMetric,
        granularity as 'hourly' | 'daily',
        fromDate,
        toDate,
      );

      return reply.send(history);
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC — Limit checks (all metrics)
  // ────────────────────────────────────────────────────────────────────────

  fastify.get<{ Params: { tenantId: string } }>(
    '/billing/metering/:tenantId/limits',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = request.params;
      const limits = await meteringService.checkAllLimits(tenantId);
      return reply.send({ tenantId, limits });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC — CSV export of usage data
  // ────────────────────────────────────────────────────────────────────────

  fastify.get<{
    Params: { tenantId: string };
    Querystring: { from?: string; to?: string };
  }>(
    '/billing/metering/:tenantId/export',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = request.params;
      const fromDate = request.query.from
        ? new Date(request.query.from)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = request.query.to ? new Date(request.query.to) : new Date();

      // Get daily history for all metrics
      const allHistory = await Promise.all(
        ALL_METRICS.map((metric) =>
          meteringService.getHistory(tenantId, metric, 'daily', fromDate, toDate),
        ),
      );

      // Build CSV
      const rows: string[] = ['Date,Metric,Value,EventCount'];

      for (const history of allHistory) {
        for (const point of history.points) {
          rows.push(
            `${point.bucketStart.toISOString().slice(0, 10)},${history.metric},${point.value},${point.eventCount}`,
          );
        }
      }

      reply.header('Content-Type', 'text/csv');
      reply.header(
        'Content-Disposition',
        `attachment; filename="usage-${tenantId}-${fromDate.toISOString().slice(0, 10)}.csv"`,
      );

      return reply.send(rows.join('\n'));
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Record a usage event
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Params: { tenantId: string };
    Body: {
      metric: string;
      delta?: number;
      uniqueKey?: string;
      source: string;
      userId?: string;
      idempotencyKey?: string;
      metadata?: Record<string, unknown>;
      timestamp?: string;
    };
  }>(
    '/internal/billing/metering/:tenantId/record',
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
            metric: { type: 'string' },
            delta: { type: 'number' },
            uniqueKey: { type: 'string' },
            source: { type: 'string' },
            userId: { type: 'string' },
            idempotencyKey: { type: 'string' },
            metadata: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['metric', 'source'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = request.params;
      const { metric, delta, uniqueKey, source, userId, idempotencyKey, metadata, timestamp } =
        request.body;

      if (!VALID_METRICS.includes(metric)) {
        return reply.status(400).send({ error: 'INVALID_METRIC', metric });
      }

      const result = await meteringService.recordUsage({
        tenantId,
        metric: metric as MeterMetric,
        delta,
        uniqueKey,
        source,
        userId,
        idempotencyKey,
        metadata,
        timestamp: timestamp ? new Date(timestamp) : undefined,
      });

      return reply.send({
        tenantId,
        metric,
        currentValue: result.currentValue,
        limitCheck: result.limitCheck,
      });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Provision meters for a tenant
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Params: { tenantId: string };
    Body: {
      periodStart: string;
      periodEnd: string;
      limits?: Record<string, { soft?: number; hard?: number; stripeSubItemId?: string }>;
    };
  }>(
    '/internal/billing/metering/:tenantId/provision',
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
            periodStart: { type: 'string', format: 'date-time' },
            periodEnd: { type: 'string', format: 'date-time' },
            limits: { type: 'object' },
          },
          required: ['periodStart', 'periodEnd'],
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = request.params;
      const { periodStart, periodEnd, limits } = request.body;

      await meteringService.ensureMeters(
        tenantId,
        { start: new Date(periodStart), end: new Date(periodEnd) },
        limits as Parameters<typeof meteringService.ensureMeters>[2],
      );

      return reply.send({ success: true, tenantId });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Force Stripe usage report
  // ────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/internal/billing/metering/report-stripe',
    async (_request, reply) => {
      const results = await stripeUsageReporter.reportAllNow();
      return reply.send({
        total: results.length,
        successes: results.filter((r) => r.success).length,
        failures: results.filter((r) => !r.success).length,
        results,
      });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Force period rollover
  // ────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/internal/billing/metering/rollover',
    async (_request, reply) => {
      const count = await meteringService.rolloverExpiredPeriods();
      return reply.send({ rolledOver: count });
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // INTERNAL — Build snapshots
  // ────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: { type?: 'hourly' | 'daily' };
  }>(
    '/internal/billing/metering/snapshots',
    async (request, reply) => {
      const type = request.body?.type ?? 'hourly';

      let count: number;
      if (type === 'daily') {
        count = await meteringService.buildDailySnapshots();
      } else {
        count = await meteringService.buildHourlySnapshots();
      }

      return reply.send({ type, snapshotsBuilt: count });
    },
  );
}
