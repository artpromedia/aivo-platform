// =============================================================================
// analytics-svc Internal Events API
// =============================================================================
//
// Internal routes for event replay, DLQ management, and stream inspection.
// These routes are for internal/admin use only.

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createEventReplayService,
  createDLQService,
  type ReplayOptions,
} from '@aivo/events';
import { config } from '../config.js';

// -----------------------------------------------------------------------------
// Request Schemas
// -----------------------------------------------------------------------------

const ReplayRequestSchema = z.object({
  stream: z.enum(['LEARNING', 'FOCUS', 'HOMEWORK', 'RECOMMENDATION']),
  filterSubject: z.string().optional(),
  startSequence: z.number().int().positive().optional(),
  startTime: z.string().datetime().optional(),
  endSequence: z.number().int().positive().optional(),
  endTime: z.string().datetime().optional(),
  tenantId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  maxEvents: z.number().int().min(1).max(10000).default(1000),
  targetSubject: z.string().optional(), // For republishing
});

const ListDLQQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  filterSubject: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});

const RetryDLQSchema = z.object({
  sequences: z.array(z.number().int().positive()).optional(),
  filterSubject: z.string().optional(),
  maxMessages: z.number().int().min(1).max(1000).default(100),
});

const PurgeDLQSchema = z.object({
  filterSubject: z.string().optional(),
  olderThanDays: z.number().int().min(1).optional(),
  confirm: z.literal(true), // Require explicit confirmation
});

// -----------------------------------------------------------------------------
// Service Instances
// -----------------------------------------------------------------------------

let replayService: ReturnType<typeof createEventReplayService> | null = null;
let dlqService: ReturnType<typeof createDLQService> | null = null;

function getReplayService() {
  if (!replayService) {
    replayService = createEventReplayService({
      servers: config.nats?.servers ?? 'nats://localhost:4222',
      name: 'analytics-replay-service',
      token: config.nats?.token,
      user: config.nats?.user,
      pass: config.nats?.pass,
    });
  }
  return replayService;
}

function getDLQService() {
  if (!dlqService) {
    dlqService = createDLQService({
      servers: config.nats?.servers ?? 'nats://localhost:4222',
      name: 'analytics-dlq-service',
      token: config.nats?.token,
      user: config.nats?.user,
      pass: config.nats?.pass,
    });
  }
  return dlqService;
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

export async function eventsAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes are prefixed with /internal/events

  /**
   * GET /internal/events/streams
   * List all JetStream streams and their stats.
   */
  fastify.get('/streams', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const service = getReplayService();
      const streams = await service.listStreams();
      return reply.send({ streams });
    } catch (err) {
      fastify.log.error(err, 'Failed to list streams');
      return reply.status(500).send({ 
        error: 'Failed to list streams',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /internal/events/streams/:name
   * Get detailed info for a specific stream.
   */
  fastify.get('/streams/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };
    
    try {
      const service = getReplayService();
      const streamInfo = await service.getStreamInfo(name);
      
      if (!streamInfo) {
        return reply.status(404).send({ error: `Stream '${name}' not found` });
      }
      
      return reply.send(streamInfo);
    } catch (err) {
      fastify.log.error(err, `Failed to get stream info for ${name}`);
      return reply.status(500).send({ 
        error: 'Failed to get stream info',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /internal/events/messages/:stream/:sequence
   * Get a specific message by stream and sequence.
   */
  fastify.get('/messages/:stream/:sequence', async (request: FastifyRequest, reply: FastifyReply) => {
    const { stream, sequence } = request.params as { stream: string; sequence: string };
    const seq = parseInt(sequence, 10);
    
    if (isNaN(seq)) {
      return reply.status(400).send({ error: 'Invalid sequence number' });
    }
    
    try {
      const service = getReplayService();
      const message = await service.getMessage(stream, seq);
      
      if (!message) {
        return reply.status(404).send({ error: `Message not found at sequence ${seq}` });
      }
      
      return reply.send(message);
    } catch (err) {
      fastify.log.error(err, `Failed to get message ${stream}:${seq}`);
      return reply.status(500).send({ 
        error: 'Failed to get message',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /internal/events/replay
   * Replay events from a stream with optional filtering.
   * Can either return events or republish to a target subject.
   */
  fastify.post('/replay', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = ReplayRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { targetSubject, ...params } = parsed.data;
    const service = getReplayService();

    try {
      const replayOptions: ReplayOptions = {
        stream: params.stream,
        filterSubject: params.filterSubject,
        startSequence: params.startSequence,
        startTime: params.startTime ? new Date(params.startTime) : undefined,
        endSequence: params.endSequence,
        endTime: params.endTime ? new Date(params.endTime) : undefined,
        tenantId: params.tenantId,
        eventType: params.eventType,
        maxEvents: params.maxEvents,
      };

      if (targetSubject) {
        // Republish to target subject
        const result = await service.republish(replayOptions, targetSubject);
        return reply.send({
          action: 'republished',
          targetSubject,
          ...result,
        });
      } else {
        // Return events as response
        const events: unknown[] = [];
        const result = await service.replay(replayOptions, async (event, sequence) => {
          events.push({ sequence, event });
        });
        
        return reply.send({
          action: 'fetched',
          events,
          ...result,
        });
      }
    } catch (err) {
      fastify.log.error(err, 'Failed to replay events');
      return reply.status(500).send({ 
        error: 'Failed to replay events',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // DLQ Routes
  // ---------------------------------------------------------------------------

  /**
   * GET /internal/events/dlq/stats
   * Get DLQ statistics.
   */
  fastify.get('/dlq/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const service = getDLQService();
      const stats = await service.getStats();
      return reply.send(stats);
    } catch (err) {
      fastify.log.error(err, 'Failed to get DLQ stats');
      return reply.status(500).send({ 
        error: 'Failed to get DLQ stats',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /internal/events/dlq/messages
   * List messages in the DLQ.
   */
  fastify.get('/dlq/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = ListDLQQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = getDLQService();
      const messages = await service.listMessages({
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        filterSubject: parsed.data.filterSubject,
        filterTenantId: parsed.data.tenantId,
      });
      
      return reply.send({
        messages,
        count: messages.length,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
    } catch (err) {
      fastify.log.error(err, 'Failed to list DLQ messages');
      return reply.status(500).send({ 
        error: 'Failed to list DLQ messages',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /internal/events/dlq/messages/:sequence
   * Get a specific DLQ message.
   */
  fastify.get('/dlq/messages/:sequence', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sequence } = request.params as { sequence: string };
    const seq = parseInt(sequence, 10);
    
    if (isNaN(seq)) {
      return reply.status(400).send({ error: 'Invalid sequence number' });
    }

    try {
      const service = getDLQService();
      const message = await service.getMessage(seq);
      
      if (!message) {
        return reply.status(404).send({ error: `DLQ message not found at sequence ${seq}` });
      }
      
      return reply.send(message);
    } catch (err) {
      fastify.log.error(err, `Failed to get DLQ message ${seq}`);
      return reply.status(500).send({ 
        error: 'Failed to get DLQ message',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /internal/events/dlq/retry
   * Retry (republish) DLQ messages.
   */
  fastify.post('/dlq/retry', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = RetryDLQSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = getDLQService();
      const result = await service.retryMessages({
        sequences: parsed.data.sequences,
        filterSubject: parsed.data.filterSubject,
        maxMessages: parsed.data.maxMessages,
      });
      
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err, 'Failed to retry DLQ messages');
      return reply.status(500).send({ 
        error: 'Failed to retry DLQ messages',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /internal/events/dlq/retry/:sequence
   * Retry a single DLQ message.
   */
  fastify.post('/dlq/retry/:sequence', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sequence } = request.params as { sequence: string };
    const seq = parseInt(sequence, 10);
    
    if (isNaN(seq)) {
      return reply.status(400).send({ error: 'Invalid sequence number' });
    }

    try {
      const service = getDLQService();
      const success = await service.retryMessage(seq);
      
      if (success) {
        return reply.send({ success: true, sequence: seq, message: 'Message retried successfully' });
      } else {
        return reply.status(400).send({ error: 'Failed to retry message' });
      }
    } catch (err) {
      fastify.log.error(err, `Failed to retry DLQ message ${seq}`);
      return reply.status(500).send({ 
        error: 'Failed to retry DLQ message',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /internal/events/dlq/messages/:sequence
   * Delete a single DLQ message.
   */
  fastify.delete('/dlq/messages/:sequence', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sequence } = request.params as { sequence: string };
    const seq = parseInt(sequence, 10);
    
    if (isNaN(seq)) {
      return reply.status(400).send({ error: 'Invalid sequence number' });
    }

    try {
      const service = getDLQService();
      const success = await service.deleteMessage(seq);
      
      if (success) {
        return reply.send({ success: true, sequence: seq, message: 'Message deleted' });
      } else {
        return reply.status(400).send({ error: 'Failed to delete message' });
      }
    } catch (err) {
      fastify.log.error(err, `Failed to delete DLQ message ${seq}`);
      return reply.status(500).send({ 
        error: 'Failed to delete DLQ message',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /internal/events/dlq/purge
   * Purge DLQ messages (requires confirmation).
   */
  fastify.post('/dlq/purge', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = PurgeDLQSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = getDLQService();
      
      const olderThan = parsed.data.olderThanDays
        ? new Date(Date.now() - parsed.data.olderThanDays * 24 * 60 * 60 * 1000)
        : undefined;
      
      const purged = await service.purge({
        filterSubject: parsed.data.filterSubject,
        olderThan,
      });
      
      return reply.send({
        success: true,
        purged,
        message: `Purged ${purged} messages from DLQ`,
      });
    } catch (err) {
      fastify.log.error(err, 'Failed to purge DLQ');
      return reply.status(500).send({ 
        error: 'Failed to purge DLQ',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
}
