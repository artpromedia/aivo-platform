/**
 * AIVO Event Collector Service - Event Query Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { prisma } from '../prisma.js';
import * as processorService from '../services/processorService.js';
import type { ListEventsQuery, PaginatedResponse } from '../types/index.js';

export default async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /events - List events
   */
  fastify.get('/', {
    schema: {
      description: 'List events with filtering',
      tags: ['Events'],
      querystring: {
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          fromDate: { type: 'string' },
          toDate: { type: 'string' },
          correlationId: { type: 'string' },
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const query = request.query as ListEventsQuery;

    const {
      eventType,
      status,
      priority,
      fromDate,
      toDate,
      correlationId,
      page = 1,
      pageSize = 20,
    } = query;

    const where = {
      tenantId,
      ...(eventType && { eventType }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(correlationId && { correlationId }),
      ...(fromDate || toDate ? {
        createdAt: {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        },
      } : {}),
    };

    const skip = (page - 1) * pageSize;

    const [events, totalItems] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          eventId: true,
          eventType: true,
          eventVersion: true,
          status: true,
          priority: true,
          category: true,
          occurredAt: true,
          correlationId: true,
          causationId: true,
          sourceService: true,
          deliveredTo: true,
          processingTime: true,
          retryCount: true,
          createdAt: true,
          processedAt: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    const response: PaginatedResponse<typeof events[0]> = {
      data: events,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };

    return reply.send(response);
  });

  /**
   * GET /events/:eventId - Get event details
   */
  fastify.get('/:eventId', {
    schema: {
      description: 'Get event details by ID',
      tags: ['Events'],
      params: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
        },
        required: ['eventId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { eventId } = request.params as { eventId: string };

    // Try by eventId (client ID) first, then by internal ID
    let event = await prisma.event.findFirst({
      where: { tenantId, eventId },
    });

    if (!event) {
      event = await prisma.event.findFirst({
        where: { tenantId, id: eventId },
      });
    }

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    // Get delivery attempts
    const deliveryAttempts = await prisma.deliveryAttempt.findMany({
      where: { eventId: event.id },
      orderBy: { attemptedAt: 'desc' },
      include: { route: { select: { name: true, destinationType: true } } },
    });

    return reply.send({
      ...event,
      deliveryAttempts,
    });
  });

  /**
   * POST /events/:eventId/reprocess - Reprocess an event
   */
  fastify.post('/:eventId/reprocess', {
    schema: {
      description: 'Reprocess a specific event',
      tags: ['Events'],
      params: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
        },
        required: ['eventId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { eventId } = request.params as { eventId: string };

    // Find the event
    let event = await prisma.event.findFirst({
      where: { tenantId, eventId },
    });

    if (!event) {
      event = await prisma.event.findFirst({
        where: { tenantId, id: eventId },
      });
    }

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    try {
      const result = await processorService.reprocessEvent(event.id);
      return reply.send({
        success: result.success,
        eventId: result.eventId,
        deliveredTo: result.deliveredTo,
        failedDestinations: result.failedDestinations,
        processingTimeMs: result.processingTimeMs,
      });
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Reprocessing failed',
        message: error.message,
      });
    }
  });

  /**
   * GET /events/by-correlation/:correlationId - Get events by correlation ID
   */
  fastify.get('/by-correlation/:correlationId', {
    schema: {
      description: 'Get all events with a specific correlation ID',
      tags: ['Events'],
      params: {
        type: 'object',
        properties: {
          correlationId: { type: 'string' },
        },
        required: ['correlationId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { correlationId } = request.params as { correlationId: string };

    const events = await prisma.event.findMany({
      where: { tenantId, correlationId },
      orderBy: { occurredAt: 'asc' },
      select: {
        id: true,
        eventId: true,
        eventType: true,
        status: true,
        priority: true,
        occurredAt: true,
        causationId: true,
        sourceService: true,
        deliveredTo: true,
        processingTime: true,
        createdAt: true,
      },
    });

    return reply.send({ events, count: events.length });
  });

  /**
   * GET /events/stats - Get event statistics
   */
  fastify.get('/stats', {
    schema: {
      description: 'Get event statistics',
      tags: ['Events'],
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

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [statusCounts, priorityCounts, typeCounts, total] = await Promise.all([
      prisma.event.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { status: true },
      }),
      prisma.event.groupBy({
        by: ['priority'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { priority: true },
      }),
      prisma.event.groupBy({
        by: ['eventType'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      }),
      prisma.event.count({ where: { tenantId, createdAt: { gte: since } } }),
    ]);

    return reply.send({
      total,
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status])),
      byPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count.priority])),
      topEventTypes: typeCounts.map((t) => ({ eventType: t.eventType, count: t._count.eventType })),
      period: { hours, since: since.toISOString() },
    });
  });
}
