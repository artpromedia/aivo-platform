/**
 * AIVO Event Collector Service - Ingest Routes
 *
 * High-throughput event ingestion endpoints.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as ingestService from '../services/ingestService.js';
import * as metricsService from '../services/metricsService.js';
import type { IngestEventInput, IngestBatchInput } from '../types/index.js';

// Validation schemas
const EventPrioritySchema = z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BULK']);

const IngestEventSchema = z.object({
  eventId: z.string().min(1).max(255),
  eventType: z.string().min(1).max(255),
  eventVersion: z.string().optional(),
  payload: z.record(z.unknown()),
  priority: EventPrioritySchema.optional(),
  category: z.string().optional(),
  occurredAt: z.string().optional(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  destinations: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

const IngestBatchSchema = z.object({
  events: z.array(IngestEventSchema).min(1).max(1000),
  batchId: z.string().optional(),
  priority: EventPrioritySchema.optional(),
});

export default async function ingestRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /ingest/event - Ingest a single event
   */
  fastify.post('/event', {
    schema: {
      description: 'Ingest a single event',
      tags: ['Ingest'],
      body: {
        type: 'object',
        required: ['eventId', 'eventType', 'payload'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            eventId: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    // Parse and validate
    const parsed = IngestEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const input: IngestEventInput = parsed.data;
    const eventSize = JSON.stringify(input).length;

    try {
      metricsService.recordEventReceived(tenantId, eventSize);

      const result = await ingestService.ingestEvent(tenantId, input);

      if (result.accepted === 1) {
        return reply.send({
          success: true,
          eventId: input.eventId,
          message: 'Event accepted',
        });
      } else if (result.duplicates === 1) {
        return reply.status(409).send({
          success: false,
          eventId: input.eventId,
          message: 'Duplicate event',
        });
      } else {
        return reply.status(400).send({
          success: false,
          eventId: input.eventId,
          message: result.errors[0]?.error || 'Event rejected',
        });
      }
    } catch (error: any) {
      request.log.error({ error, eventId: input.eventId }, 'Failed to ingest event');
      metricsService.recordEventFailed(tenantId);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * POST /ingest/batch - Ingest a batch of events
   */
  fastify.post('/batch', {
    schema: {
      description: 'Ingest a batch of events',
      tags: ['Ingest'],
      body: {
        type: 'object',
        required: ['events'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accepted: { type: 'number' },
            rejected: { type: 'number' },
            duplicates: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  eventId: { type: 'string' },
                  error: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    // Parse and validate
    const parsed = IngestBatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const input: IngestBatchInput = parsed.data;
    const batchSize = JSON.stringify(input).length;

    try {
      metricsService.recordEventReceived(tenantId, batchSize);

      const result = await ingestService.ingestBatch(tenantId, input);

      return reply.send(result);
    } catch (error: any) {
      request.log.error({ error, batchId: input.batchId }, 'Failed to ingest batch');
      metricsService.recordEventFailed(tenantId);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * POST /ingest/stream - Stream events (for high-throughput scenarios)
   */
  fastify.post('/stream', {
    schema: {
      description: 'Stream multiple events with minimal overhead',
      tags: ['Ingest'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    // Expect newline-delimited JSON
    const rawBody = (request.body as any);
    if (typeof rawBody !== 'string') {
      return reply.status(400).send({
        error: 'Expected newline-delimited JSON',
      });
    }

    const lines = rawBody.split('\n').filter((line: string) => line.trim());
    const results = {
      accepted: 0,
      rejected: 0,
      duplicates: 0,
      errors: [] as Array<{ line: number; error: string }>,
    };

    for (let i = 0; i < lines.length; i++) {
      try {
        const event = JSON.parse(lines[i]);
        const parsed = IngestEventSchema.safeParse(event);

        if (!parsed.success) {
          results.rejected++;
          results.errors.push({ line: i + 1, error: 'Validation failed' });
          continue;
        }

        const result = await ingestService.ingestEvent(tenantId, parsed.data);

        if (result.accepted === 1) {
          results.accepted++;
        } else if (result.duplicates === 1) {
          results.duplicates++;
        } else {
          results.rejected++;
          results.errors.push({ line: i + 1, error: result.errors[0]?.error || 'Unknown error' });
        }
      } catch (error: any) {
        results.rejected++;
        results.errors.push({ line: i + 1, error: error.message });
      }
    }

    return reply.send(results);
  });

  /**
   * GET /ingest/status - Get ingestion status
   */
  fastify.get('/status', {
    schema: {
      description: 'Get current ingestion status',
      tags: ['Ingest'],
      response: {
        200: {
          type: 'object',
          properties: {
            isAccepting: { type: 'boolean' },
            openBatches: { type: 'number' },
            pendingEvents: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    const status = await ingestService.getIngestionStatus(tenantId);
    return reply.send(status);
  });
}
