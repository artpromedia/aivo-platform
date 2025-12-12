/**
 * Events Routes - Session Event Recording
 *
 * Endpoints for tools to report events back to Aivo.
 * Events are validated, stored, and forwarded to analytics.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { validateToolLaunchToken } from '../services/token.service.js';
import {
  SessionEventType,
  ToolSessionStatus,
  ToolScope,
  type RecordEventRequest,
  type RecordEventResponse,
} from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schema Validation
// ══════════════════════════════════════════════════════════════════════════════

const RecordEventSchema = z.object({
  sessionId: z.string().uuid(),
  eventType: z.nativeEnum(SessionEventType),
  eventTimestamp: z.string().datetime(),
  activityId: z.string().max(255).optional(),
  score: z.number().min(0).max(100).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  data: z.record(z.unknown()).optional(),
});

const SessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

const EventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  eventType: z.nativeEnum(SessionEventType).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Event Validation
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate event payload based on event type
 */
function validateEventPayload(eventType: SessionEventType, data: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  // Each event type has its own expected structure
  switch (eventType) {
    case SessionEventType.ACTIVITY_COMPLETED:
      if (data.activityName === undefined) {
        return { valid: false, error: 'activityName is required for ACTIVITY_COMPLETED' };
      }
      break;

    case SessionEventType.SCORE_RECORDED:
      if (data.score === undefined) {
        return { valid: false, error: 'score is required for SCORE_RECORDED' };
      }
      break;

    case SessionEventType.BADGE_EARNED:
      if (data.badgeId === undefined || data.badgeName === undefined) {
        return { valid: false, error: 'badgeId and badgeName are required for BADGE_EARNED' };
      }
      break;

    case SessionEventType.TOOL_ERROR:
      if (data.errorCode === undefined || data.errorMessage === undefined) {
        return { valid: false, error: 'errorCode and errorMessage are required for TOOL_ERROR' };
      }
      break;

    // Other event types have no required fields
    default:
      break;
  }

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// Route Handlers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /events
 * Record a session event from a tool
 */
async function recordEvent(
  request: FastifyRequest<{ Body: RecordEventRequest }>,
  reply: FastifyReply
): Promise<RecordEventResponse> {
  const data = RecordEventSchema.parse(request.body);

  // 1. Validate authorization token
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      eventId: '',
      processed: false,
      error: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);
  const tokenValidation = await validateToolLaunchToken(token);

  if (!tokenValidation.valid || !tokenValidation.claims) {
    return reply.status(401).send({
      eventId: '',
      processed: false,
      error: tokenValidation.error ?? 'Invalid token',
    });
  }

  // 2. Verify session matches token
  if (tokenValidation.claims.sub !== data.sessionId) {
    return reply.status(403).send({
      eventId: '',
      processed: false,
      error: 'Token does not match session',
    });
  }

  // 3. Fetch session and verify it's active
  const session = await prisma.toolSession.findUnique({
    where: { id: data.sessionId },
  });

  if (!session) {
    return reply.status(404).send({
      eventId: '',
      processed: false,
      error: 'Session not found',
    });
  }

  if (session.status !== ToolSessionStatus.ACTIVE) {
    return reply.status(400).send({
      eventId: '',
      processed: false,
      error: 'Session is not active',
    });
  }

  // 4. Verify SESSION_EVENTS_WRITE scope
  const scopes = session.grantedScopes as ToolScope[];
  if (!scopes.includes(ToolScope.SESSION_EVENTS_WRITE)) {
    await prisma.sessionEvent.create({
      data: {
        toolSessionId: data.sessionId,
        eventType: SessionEventType.SCOPE_VIOLATION,
        eventTimestamp: new Date(),
        payloadJson: {
          attemptedAction: 'SESSION_EVENTS_WRITE',
          eventType: data.eventType,
        },
        isProcessed: true,
        processingError: 'Scope violation: SESSION_EVENTS_WRITE not granted',
      },
    });

    return reply.status(403).send({
      eventId: '',
      processed: false,
      error: 'SESSION_EVENTS_WRITE scope not granted',
    });
  }

  // 5. Validate event payload
  const payloadValidation = validateEventPayload(data.eventType, data.data ?? {});
  if (!payloadValidation.valid) {
    const event = await prisma.sessionEvent.create({
      data: {
        toolSessionId: data.sessionId,
        eventType: SessionEventType.VALIDATION_ERROR,
        eventTimestamp: new Date(data.eventTimestamp),
        payloadJson: {
          originalEventType: data.eventType,
          originalData: data.data,
          validationError: payloadValidation.error,
        },
        isProcessed: true,
        processingError: payloadValidation.error,
      },
    });

    return {
      eventId: event.id,
      processed: false,
      error: payloadValidation.error,
    };
  }

  // 6. Create the event
  const event = await prisma.sessionEvent.create({
    data: {
      toolSessionId: data.sessionId,
      eventType: data.eventType,
      eventTimestamp: new Date(data.eventTimestamp),
      payloadJson: data.data ?? {},
      activityId: data.activityId ?? null,
      scoreValue: data.score ?? null,
      durationSeconds: data.durationSeconds ?? null,
      isProcessed: false,
    },
  });

  // 7. Update session last activity
  await prisma.toolSession.update({
    where: { id: data.sessionId },
    data: { lastActivityAt: new Date() },
  });

  // 8. TODO: Forward to analytics pipeline
  // This would typically be an async job or message queue publish

  request.log.info(
    { eventId: event.id, sessionId: data.sessionId, eventType: data.eventType },
    'Session event recorded'
  );

  return {
    eventId: event.id,
    processed: true,
  };
}

/**
 * GET /events/:sessionId
 * List events for a session (requires SESSION_EVENTS_READ scope)
 */
async function listSessionEvents(
  request: FastifyRequest<{
    Params: z.infer<typeof SessionIdSchema>;
    Querystring: z.infer<typeof EventQuerySchema>;
  }>,
  reply: FastifyReply
) {
  const { sessionId } = SessionIdSchema.parse(request.params);
  const { limit, offset, eventType } = EventQuerySchema.parse(request.query);

  // Validate authorization
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const tokenValidation = await validateToolLaunchToken(token);

  if (!tokenValidation.valid || !tokenValidation.claims) {
    return reply.status(401).send({ error: tokenValidation.error ?? 'Invalid token' });
  }

  // Verify session matches token
  if (tokenValidation.claims.sub !== sessionId) {
    return reply.status(403).send({ error: 'Token does not match session' });
  }

  // Fetch session and verify scope
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  const scopes = session.grantedScopes as ToolScope[];
  if (!scopes.includes(ToolScope.SESSION_EVENTS_READ)) {
    return reply.status(403).send({ error: 'SESSION_EVENTS_READ scope not granted' });
  }

  // Query events
  const where = {
    toolSessionId: sessionId,
    ...(eventType && { eventType }),
  };

  const [events, total] = await Promise.all([
    prisma.sessionEvent.findMany({
      where,
      orderBy: { eventTimestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.sessionEvent.count({ where }),
  ]);

  return {
    data: events.map((e) => ({
      eventId: e.id,
      eventType: e.eventType,
      eventTimestamp: e.eventTimestamp.toISOString(),
      receivedAt: e.receivedAt.toISOString(),
      activityId: e.activityId,
      score: e.scoreValue ? Number(e.scoreValue) : undefined,
      durationSeconds: e.durationSeconds,
      data: e.payloadJson,
    })),
    pagination: {
      total,
      limit,
      offset,
    },
  };
}

/**
 * POST /events/batch
 * Record multiple events at once
 */
async function recordEventsBatch(
  request: FastifyRequest<{
    Body: {
      sessionId: string;
      events: Array<Omit<RecordEventRequest, 'sessionId'>>;
    };
  }>,
  reply: FastifyReply
) {
  const { sessionId, events } = request.body;

  // Validate authorization
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const tokenValidation = await validateToolLaunchToken(token);

  if (!tokenValidation.valid || !tokenValidation.claims) {
    return reply.status(401).send({ error: tokenValidation.error ?? 'Invalid token' });
  }

  if (tokenValidation.claims.sub !== sessionId) {
    return reply.status(403).send({ error: 'Token does not match session' });
  }

  // Fetch session
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.status !== ToolSessionStatus.ACTIVE) {
    return reply.status(400).send({ error: 'Session is not active' });
  }

  const scopes = session.grantedScopes as ToolScope[];
  if (!scopes.includes(ToolScope.SESSION_EVENTS_WRITE)) {
    return reply.status(403).send({ error: 'SESSION_EVENTS_WRITE scope not granted' });
  }

  // Limit batch size
  if (events.length > 50) {
    return reply.status(400).send({ error: 'Batch size cannot exceed 50 events' });
  }

  // Create events
  const results = await Promise.all(
    events.map(async (evt) => {
      try {
        const event = await prisma.sessionEvent.create({
          data: {
            toolSessionId: sessionId,
            eventType: evt.eventType,
            eventTimestamp: new Date(evt.eventTimestamp),
            payloadJson: evt.data ?? {},
            activityId: evt.activityId ?? null,
            scoreValue: evt.score ?? null,
            durationSeconds: evt.durationSeconds ?? null,
            isProcessed: false,
          },
        });
        return { eventId: event.id, processed: true };
      } catch (error) {
        return {
          eventId: '',
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  // Update session last activity
  await prisma.toolSession.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });

  request.log.info({ sessionId, eventCount: events.length }, 'Batch events recorded');

  return { results };
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.post('/', recordEvent);
  fastify.post('/batch', recordEventsBatch);
  fastify.get('/:sessionId', listSessionEvents);
}
