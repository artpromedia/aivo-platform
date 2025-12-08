import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { SessionType, SessionOrigin, SessionEventType, type SessionWithEvents } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CreateSessionSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  sessionType: z.enum([
    SessionType.LEARNING,
    SessionType.HOMEWORK,
    SessionType.BASELINE,
    SessionType.PRACTICE,
    SessionType.SEL,
    SessionType.ASSESSMENT,
  ]),
  origin: z.enum([
    SessionOrigin.MOBILE_LEARNER,
    SessionOrigin.WEB_LEARNER,
    SessionOrigin.TEACHER_LED,
    SessionOrigin.HOMEWORK_HELPER,
    SessionOrigin.PARENT_APP,
    SessionOrigin.SYSTEM,
  ]),
  metadata: z.record(z.any()).optional(),
});

const CreateEventSchema = z.object({
  eventType: z.nativeEnum(SessionEventType),
  eventTime: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const CompleteSessionSchema = z.object({
  endedAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const SessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ListSessionsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  sessionType: z
    .enum([
      SessionType.LEARNING,
      SessionType.HOMEWORK,
      SessionType.BASELINE,
      SessionType.PRACTICE,
      SessionType.SEL,
      SessionType.ASSESSMENT,
    ])
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  includeIncomplete: z.enum(['true', 'false']).default('false'),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  const user = (request as FastifyRequest & { user?: JwtUser }).user;
  if (!user || typeof user.sub !== 'string' || typeof user.tenantId !== 'string') {
    return null;
  }
  return user;
}

function canAccessTenant(user: JwtUser, tenantId: string): boolean {
  // Service role can access any tenant
  if (user.role === 'service') return true;
  // Others must match tenant
  return user.tenantId === tenantId;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /sessions
   * Create a new session. Automatically emits SESSION_STARTED event.
   */
  fastify.post('/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = CreateSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, learnerId, sessionType, origin, metadata } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const now = new Date();

    // Create session with initial SESSION_STARTED event
    const session = await prisma.session.create({
      data: {
        tenantId,
        learnerId,
        sessionType,
        origin,
        startedAt: now,
        ...(metadata && { metadataJson: metadata }),
        events: {
          create: {
            tenantId,
            learnerId,
            eventType: SessionEventType.SESSION_STARTED,
            eventTime: now,
            metadataJson: { origin, sessionType },
          },
        },
      },
      include: {
        events: true,
      },
    });

    return reply.status(201).send(session);
  });

  /**
   * GET /sessions
   * List sessions with filtering options.
   */
  fastify.get('/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = ListSessionsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, learnerId, sessionType, limit, offset, includeIncomplete } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const where: Record<string, unknown> = { tenantId };
    if (learnerId) where.learnerId = learnerId;
    if (sessionType) where.sessionType = sessionType;
    if (includeIncomplete !== 'true') {
      where.endedAt = { not: null };
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: { select: { events: true } },
        },
      }),
      prisma.session.count({ where }),
    ]);

    const items = sessions.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      learnerId: s.learnerId,
      sessionType: s.sessionType,
      origin: s.origin,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMs: s.durationMs,
      eventCount: s._count.events,
      metadata: s.metadataJson,
    }));

    return reply.send({ total, items, limit, offset });
  });

  /**
   * GET /sessions/:id
   * Get a single session with all its events.
   */
  fastify.get('/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const params = SessionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid session ID' });
    }

    const session = await prisma.session.findUnique({
      where: { id: params.data.id },
      include: {
        events: {
          orderBy: { eventTime: 'asc' },
        },
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (!canAccessTenant(user, session.tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const result: SessionWithEvents = {
      id: session.id,
      tenantId: session.tenantId,
      learnerId: session.learnerId,
      sessionType: session.sessionType as SessionType,
      origin: session.origin as SessionOrigin,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMs: session.durationMs,
      metadata: session.metadataJson as Record<string, unknown> | null,
      events: session.events.map((e) => ({
        id: e.id,
        eventType: e.eventType as SessionEventType,
        eventTime: e.eventTime,
        metadata: e.metadataJson as Record<string, unknown> | null,
      })),
    };

    return reply.send(result);
  });

  /**
   * POST /sessions/:id/events
   * Append an event to an existing session.
   */
  fastify.post('/sessions/:id/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const params = SessionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid session ID' });
    }

    const bodyParsed = CreateEventSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: bodyParsed.error.flatten(),
      });
    }

    // First, fetch the session to validate access and get tenant/learner IDs
    const session = await prisma.session.findUnique({
      where: { id: params.data.id },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (!canAccessTenant(user, session.tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    if (session.endedAt) {
      return reply.status(400).send({ error: 'Cannot add events to completed session' });
    }

    const { eventType, eventTime, metadata } = bodyParsed.data;

    const event = await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        tenantId: session.tenantId,
        learnerId: session.learnerId,
        eventType,
        eventTime: eventTime ? new Date(eventTime) : new Date(),
        ...(metadata && { metadataJson: metadata }),
      },
    });

    return reply.status(201).send(event);
  });

  /**
   * POST /sessions/:id/complete
   * Mark a session as completed. Automatically emits SESSION_ENDED event.
   */
  fastify.post('/sessions/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const params = SessionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid session ID' });
    }

    const bodyParsed = CompleteSessionSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: bodyParsed.error.flatten(),
      });
    }

    const session = await prisma.session.findUnique({
      where: { id: params.data.id },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (!canAccessTenant(user, session.tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    if (session.endedAt) {
      return reply.status(400).send({ error: 'Session already completed' });
    }

    const { endedAt, metadata } = bodyParsed.data;
    const endTime = endedAt ? new Date(endedAt) : new Date();
    const durationMs = endTime.getTime() - session.startedAt.getTime();

    // Merge metadata if provided
    const mergedMetadata = metadata
      ? { ...((session.metadataJson as Record<string, unknown>) || {}), ...metadata }
      : session.metadataJson;

    // Update session and create SESSION_ENDED event in transaction
    const [updatedSession] = await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: {
          endedAt: endTime,
          durationMs,
          ...(mergedMetadata && { metadataJson: mergedMetadata }),
        },
        include: {
          events: {
            orderBy: { eventTime: 'asc' },
          },
        },
      }),
      prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          tenantId: session.tenantId,
          learnerId: session.learnerId,
          eventType: SessionEventType.SESSION_ENDED,
          eventTime: endTime,
          metadataJson: { durationMs },
        },
      }),
    ]);

    return reply.send(updatedSession);
  });

  /**
   * GET /sessions/:id/events
   * Get just the events for a session (lighter than full session).
   */
  fastify.get('/sessions/:id/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const params = SessionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid session ID' });
    }

    const session = await prisma.session.findUnique({
      where: { id: params.data.id },
      select: { tenantId: true },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (!canAccessTenant(user, session.tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    const events = await prisma.sessionEvent.findMany({
      where: { sessionId: params.data.id },
      orderBy: { eventTime: 'asc' },
    });

    return reply.send({ events });
  });

  /**
   * GET /learners/:learnerId/sessions/active
   * Get the active (incomplete) session for a learner, if any.
   * Useful for mobile app resume functionality.
   */
  fastify.get(
    '/learners/:learnerId/sessions/active',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const querySchema = z.object({
        tenantId: z.string().uuid(),
      });
      const paramsSchema = z.object({
        learnerId: z.string().uuid(),
      });

      const queryParsed = querySchema.safeParse(request.query);
      const paramsParsed = paramsSchema.safeParse(request.params);

      if (!queryParsed.success || !paramsParsed.success) {
        return reply.status(400).send({ error: 'Invalid parameters' });
      }

      const { tenantId } = queryParsed.data;
      const { learnerId } = paramsParsed.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      const activeSession = await prisma.session.findFirst({
        where: {
          tenantId,
          learnerId,
          endedAt: null,
        },
        orderBy: { startedAt: 'desc' },
        include: {
          events: {
            orderBy: { eventTime: 'asc' },
          },
        },
      });

      if (!activeSession) {
        return reply.status(404).send({ error: 'No active session' });
      }

      return reply.send(activeSession);
    }
  );
}
