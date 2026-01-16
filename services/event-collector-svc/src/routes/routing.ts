/**
 * AIVO Event Collector Service - Routing Configuration Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as routingService from '../services/routingService.js';
import type { CreateRouteInput, UpdateRouteInput } from '../types/index.js';

// Validation schemas
const DestinationTypeSchema = z.enum(['NATS', 'KINESIS', 'SQS', 'WEBHOOK', 'INTERNAL']);

const CreateRouteSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  eventTypePattern: z.string().min(1),
  sourcePattern: z.string().optional(),
  conditions: z.record(z.unknown()).optional(),
  destinationType: DestinationTypeSchema,
  destinationConfig: z.record(z.unknown()),
  transformTemplate: z.string().optional(),
  enrichmentRules: z.record(z.unknown()).optional(),
  filterRules: z.record(z.unknown()).optional(),
  rateLimitPerSec: z.number().int().positive().optional(),
  rateLimitBurst: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryDelayMs: z.number().int().min(100).max(60000).optional(),
  retryBackoff: z.number().min(1).max(5).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
});

const UpdateRouteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  eventTypePattern: z.string().min(1).optional(),
  sourcePattern: z.string().optional(),
  conditions: z.record(z.unknown()).optional(),
  destinationConfig: z.record(z.unknown()).optional(),
  transformTemplate: z.string().optional(),
  enrichmentRules: z.record(z.unknown()).optional(),
  filterRules: z.record(z.unknown()).optional(),
  rateLimitPerSec: z.number().int().positive().optional(),
  rateLimitBurst: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryDelayMs: z.number().int().min(100).max(60000).optional(),
  retryBackoff: z.number().min(1).max(5).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
});

export default async function routingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /routes - List routes
   */
  fastify.get('/', {
    schema: {
      description: 'List event routing rules',
      tags: ['Routes'],
      querystring: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { isActive, page = 1, pageSize = 20 } = request.query as {
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    };

    const { routes, total } = await routingService.listRoutes(tenantId, {
      page,
      pageSize,
      isActive,
    });

    return reply.send({
      data: routes,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  /**
   * POST /routes - Create a new route
   */
  fastify.post('/', {
    schema: {
      description: 'Create a new event routing rule',
      tags: ['Routes'],
      body: {
        type: 'object',
        required: ['name', 'eventTypePattern', 'destinationType', 'destinationConfig'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    const parsed = CreateRouteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const input: CreateRouteInput = parsed.data;

    try {
      const route = await routingService.createRoute(tenantId, input);
      return reply.status(201).send(route);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Route with this name already exists',
        });
      }
      throw error;
    }
  });

  /**
   * GET /routes/:routeId - Get route details
   */
  fastify.get('/:routeId', {
    schema: {
      description: 'Get route details',
      tags: ['Routes'],
      params: {
        type: 'object',
        properties: {
          routeId: { type: 'string' },
        },
        required: ['routeId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { routeId } = request.params as { routeId: string };

    const route = await routingService.getRoute(tenantId, routeId);

    if (!route) {
      return reply.status(404).send({ error: 'Route not found' });
    }

    return reply.send(route);
  });

  /**
   * PUT /routes/:routeId - Update a route
   */
  fastify.put('/:routeId', {
    schema: {
      description: 'Update an event routing rule',
      tags: ['Routes'],
      params: {
        type: 'object',
        properties: {
          routeId: { type: 'string' },
        },
        required: ['routeId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { routeId } = request.params as { routeId: string };

    const parsed = UpdateRouteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const input: UpdateRouteInput = parsed.data;

    try {
      const route = await routingService.updateRoute(tenantId, routeId, input);
      return reply.send(route);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Route not found' });
      }
      throw error;
    }
  });

  /**
   * DELETE /routes/:routeId - Delete a route
   */
  fastify.delete('/:routeId', {
    schema: {
      description: 'Delete an event routing rule',
      tags: ['Routes'],
      params: {
        type: 'object',
        properties: {
          routeId: { type: 'string' },
        },
        required: ['routeId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { routeId } = request.params as { routeId: string };

    try {
      await routingService.deleteRoute(tenantId, routeId);
      return reply.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Route not found' });
      }
      throw error;
    }
  });

  /**
   * POST /routes/:routeId/test - Test a route with sample event
   */
  fastify.post('/:routeId/test', {
    schema: {
      description: 'Test a routing rule with a sample event',
      tags: ['Routes'],
      params: {
        type: 'object',
        properties: {
          routeId: { type: 'string' },
        },
        required: ['routeId'],
      },
      body: {
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          sourceService: { type: 'string' },
          payload: { type: 'object' },
        },
        required: ['eventType'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { routeId } = request.params as { routeId: string };
    const { eventType, sourceService, payload } = request.body as {
      eventType: string;
      sourceService?: string;
      payload?: Record<string, unknown>;
    };

    const route = await routingService.getRoute(tenantId, routeId);

    if (!route) {
      return reply.status(404).send({ error: 'Route not found' });
    }

    // Check if the event would match this route
    const routes = await routingService.getRoutesForEvent(tenantId, eventType, sourceService);
    const wouldMatch = routes.some((r) => r.id === routeId);

    return reply.send({
      routeId,
      eventType,
      sourceService,
      wouldMatch,
      route: {
        name: route.name,
        eventTypePattern: route.eventTypePattern,
        sourcePattern: route.sourcePattern,
        destinationType: route.destinationType,
      },
      message: wouldMatch
        ? 'Event would be routed through this rule'
        : 'Event would NOT match this routing rule',
    });
  });

  /**
   * POST /routes/cache/clear - Clear route cache
   */
  fastify.post('/cache/clear', {
    schema: {
      description: 'Clear the route cache',
      tags: ['Routes'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    routingService.clearRouteCache();
    return reply.send({
      success: true,
      message: 'Route cache cleared',
    });
  });
}
