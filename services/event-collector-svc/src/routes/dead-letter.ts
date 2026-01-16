/**
 * AIVO Event Collector Service - Dead Letter Queue Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as deadLetterService from '../services/deadLetterService.js';
import type { ListDeadLetterQuery, ResolveDeadLetterInput } from '../types/index.js';

// Validation schemas
const ResolveDeadLetterSchema = z.object({
  resolution: z.enum(['reprocess', 'discard', 'manual']),
  notes: z.string().optional(),
});

const BulkResolveSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  resolution: z.enum(['reprocess', 'discard', 'manual']),
  notes: z.string().optional(),
});

const AutoRetrySchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  maxRetryCount: z.number().int().min(0).max(10).optional(),
  failureReasonPattern: z.string().optional(),
});

export default async function deadLetterRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /dead-letter - List dead letter events
   */
  fastify.get('/', {
    schema: {
      description: 'List dead letter queue events',
      tags: ['Dead Letter'],
      querystring: {
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          isResolved: { type: 'boolean' },
          fromDate: { type: 'string' },
          toDate: { type: 'string' },
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const query = request.query as ListDeadLetterQuery;

    const result = await deadLetterService.listDeadLetterEvents(tenantId, query);
    return reply.send(result);
  });

  /**
   * GET /dead-letter/stats - Get dead letter statistics
   */
  fastify.get('/stats', {
    schema: {
      description: 'Get dead letter queue statistics',
      tags: ['Dead Letter'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    const stats = await deadLetterService.getDeadLetterStats(tenantId);
    return reply.send(stats);
  });

  /**
   * GET /dead-letter/:deadLetterId - Get dead letter event details
   */
  fastify.get('/:deadLetterId', {
    schema: {
      description: 'Get dead letter event details',
      tags: ['Dead Letter'],
      params: {
        type: 'object',
        properties: {
          deadLetterId: { type: 'string' },
        },
        required: ['deadLetterId'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { deadLetterId } = request.params as { deadLetterId: string };

    const event = await deadLetterService.getDeadLetterEvent(tenantId, deadLetterId);

    if (!event) {
      return reply.status(404).send({ error: 'Dead letter event not found' });
    }

    return reply.send(event);
  });

  /**
   * POST /dead-letter/:deadLetterId/resolve - Resolve a dead letter event
   */
  fastify.post('/:deadLetterId/resolve', {
    schema: {
      description: 'Resolve a dead letter event',
      tags: ['Dead Letter'],
      params: {
        type: 'object',
        properties: {
          deadLetterId: { type: 'string' },
        },
        required: ['deadLetterId'],
      },
      body: {
        type: 'object',
        required: ['resolution'],
        properties: {
          resolution: { type: 'string', enum: ['reprocess', 'discard', 'manual'] },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { deadLetterId } = request.params as { deadLetterId: string };

    const parsed = ResolveDeadLetterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const input: ResolveDeadLetterInput = parsed.data;

    try {
      const resolved = await deadLetterService.resolveDeadLetterEvent(
        tenantId,
        deadLetterId,
        userId,
        input
      );
      return reply.send(resolved);
    } catch (error: any) {
      if (error.message === 'Dead letter event not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message === 'Dead letter event is already resolved') {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /dead-letter/bulk-resolve - Bulk resolve dead letter events
   */
  fastify.post('/bulk-resolve', {
    schema: {
      description: 'Bulk resolve multiple dead letter events',
      tags: ['Dead Letter'],
      body: {
        type: 'object',
        required: ['ids', 'resolution'],
        properties: {
          ids: { type: 'array', items: { type: 'string' } },
          resolution: { type: 'string', enum: ['reprocess', 'discard', 'manual'] },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;

    const parsed = BulkResolveSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const { ids, resolution, notes } = parsed.data;

    const result = await deadLetterService.bulkResolveDeadLetterEvents(
      tenantId,
      ids,
      userId,
      { resolution, notes }
    );

    return reply.send(result);
  });

  /**
   * POST /dead-letter/auto-retry - Auto-retry events matching criteria
   */
  fastify.post('/auto-retry', {
    schema: {
      description: 'Auto-retry dead letter events matching criteria',
      tags: ['Dead Letter'],
      body: {
        type: 'object',
        properties: {
          eventTypes: { type: 'array', items: { type: 'string' } },
          maxRetryCount: { type: 'number' },
          failureReasonPattern: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    const parsed = AutoRetrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const result = await deadLetterService.autoRetryEvents(tenantId, parsed.data);

    return reply.send({
      success: true,
      ...result,
      message: `Retried ${result.retried} events, skipped ${result.skipped}`,
    });
  });

  /**
   * GET /dead-letter/export - Export dead letter events
   */
  fastify.get('/export', {
    schema: {
      description: 'Export dead letter events',
      tags: ['Dead Letter'],
      querystring: {
        type: 'object',
        properties: {
          fromDate: { type: 'string' },
          toDate: { type: 'string' },
          eventTypes: { type: 'string' },
          includeResolved: { type: 'boolean', default: false },
          format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const {
      fromDate,
      toDate,
      eventTypes,
      includeResolved = false,
      format = 'json',
    } = request.query as {
      fromDate?: string;
      toDate?: string;
      eventTypes?: string;
      includeResolved?: boolean;
      format?: 'json' | 'csv';
    };

    const data = await deadLetterService.exportDeadLetterEvents(tenantId, {
      fromDate,
      toDate,
      eventTypes: eventTypes ? eventTypes.split(',') : undefined,
      includeResolved,
      format,
    });

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `dead-letter-export-${new Date().toISOString().split('T')[0]}.${format}`;

    return reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(data);
  });

  /**
   * DELETE /dead-letter/purge - Purge old resolved events
   */
  fastify.delete('/purge', {
    schema: {
      description: 'Purge old resolved dead letter events',
      tags: ['Dead Letter'],
      querystring: {
        type: 'object',
        properties: {
          olderThanDays: { type: 'number', default: 30 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { olderThanDays = 30 } = request.query as { olderThanDays?: number };

    const purgedCount = await deadLetterService.purgeResolvedEvents(tenantId, olderThanDays);

    return reply.send({
      success: true,
      purgedCount,
      message: `Purged ${purgedCount} resolved events older than ${olderThanDays} days`,
    });
  });
}
