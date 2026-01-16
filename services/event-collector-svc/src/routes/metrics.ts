/**
 * AIVO Event Collector Service - Metrics Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as metricsService from '../services/metricsService.js';

export default async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /metrics/summary - Get metrics summary
   */
  fastify.get('/summary', {
    schema: {
      description: 'Get event processing metrics summary',
      tags: ['Metrics'],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'number', default: 24 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { hours = 24 } = request.query as { hours?: number };

    const summary = await metricsService.getMetricsSummary(tenantId, hours);
    return reply.send({
      ...summary,
      period: { hours, since: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString() },
    });
  });

  /**
   * GET /metrics/timeseries - Get metrics time series
   */
  fastify.get('/timeseries', {
    schema: {
      description: 'Get event processing metrics time series',
      tags: ['Metrics'],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'number', default: 24 },
          resolution: { type: 'string', enum: ['minute', 'hour', 'day'], default: 'hour' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { hours = 24, resolution = 'hour' } = request.query as {
      hours?: number;
      resolution?: 'minute' | 'hour' | 'day';
    };

    const timeseries = await metricsService.getMetricsTimeSeries(tenantId, hours, resolution);
    return reply.send({
      data: timeseries,
      period: { hours, resolution },
    });
  });

  /**
   * GET /metrics/event-types - Get breakdown by event type
   */
  fastify.get('/event-types', {
    schema: {
      description: 'Get metrics breakdown by event type',
      tags: ['Metrics'],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'number', default: 24 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { hours = 24 } = request.query as { hours?: number };

    const breakdown = await metricsService.getEventTypeBreakdown(tenantId, hours);
    return reply.send({
      data: breakdown,
      period: { hours },
    });
  });

  /**
   * GET /metrics/delivery - Get delivery breakdown by route
   */
  fastify.get('/delivery', {
    schema: {
      description: 'Get delivery metrics breakdown by route',
      tags: ['Metrics'],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'number', default: 24 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { hours = 24 } = request.query as { hours?: number };

    const breakdown = await metricsService.getDeliveryBreakdown(tenantId, hours);
    return reply.send({
      data: breakdown,
      period: { hours },
    });
  });

  /**
   * GET /metrics/health - Get collector health status
   */
  fastify.get('/health', {
    schema: {
      description: 'Get all collector instances health status',
      tags: ['Metrics'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const instances = await metricsService.getCollectorHealthStatus();
    const healthyCount = instances.filter((i) => i.isHealthy).length;

    return reply.send({
      totalInstances: instances.length,
      healthyInstances: healthyCount,
      unhealthyInstances: instances.length - healthyCount,
      instances,
    });
  });

  /**
   * POST /metrics/cleanup - Cleanup stale collector records
   */
  fastify.post('/cleanup', {
    schema: {
      description: 'Cleanup stale collector health records',
      tags: ['Metrics'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const removed = await metricsService.cleanupStaleCollectors();
    return reply.send({
      success: true,
      removed,
      message: `Removed ${removed} stale collector records`,
    });
  });
}
