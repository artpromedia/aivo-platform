import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { SessionType, SessionOrigin, SessionEventType, type SessionWithEvents } from '../types.js';
import { sessionEventPublisher } from '../services/event-publisher.js';
import { billingAccessPreHandler, checkAddonAccess } from '../middleware/billingAccess.js';

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

const CreateFromPlanSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  sessionPlanId: z.string().uuid(),
  sessionType: z.enum([
    SessionType.LEARNING,
    SessionType.HOMEWORK,
    SessionType.BASELINE,
    SessionType.PRACTICE,
    SessionType.SEL,
    SessionType.ASSESSMENT,
  ]).optional(),
  metadata: z.record(z.any()).optional(),
});

const AddProgressNoteSchema = z.object({
  noteText: z.string().min(1),
  rating: z.number().int().min(0).max(4).optional(),
  goalId: z.string().uuid().optional(),
  goalObjectiveId: z.string().uuid().optional(),
  activityItemId: z.string().uuid().optional(),
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
   * Requires active subscription - returns 402 if subscription is missing or past due.
   */
  fastify.post(
    '/sessions',
    { preHandler: [billingAccessPreHandler] },
    async (request: FastifyRequest, reply: FastifyReply) => {
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

    // Check add-on access for SEL sessions
    if (sessionType === SessionType.SEL) {
      const addonAccess = await checkAddonAccess(tenantId, learnerId, 'ADDON_SEL');
      if (!addonAccess.hasAccess) {
        return reply.status(402).send({
          error: 'ADDON_REQUIRED',
          message: 'SEL sessions require the Social-Emotional Learning add-on. Please upgrade your subscription.',
          code: 'BILLING_ADDON_REQUIRED',
          requiredAddon: 'ADDON_SEL',
        });
      }
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

    // Publish event to NATS (non-blocking)
    sessionEventPublisher.publishSessionStarted({
      id: session.id,
      tenantId,
      learnerId,
      sessionType,
      origin,
      startedAt: now,
      metadata: metadata as Record<string, unknown> | undefined,
    }).catch((err: unknown) => {
      console.error('[sessions] Failed to publish session.started event:', err);
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

    // Count activities from events
    const activityEvents = updatedSession.events.filter(e => 
      e.eventType === SessionEventType.ACTIVITY_STARTED ||
      e.eventType === SessionEventType.ACTIVITY_COMPLETED
    );
    const activitiesStarted = activityEvents.filter(e => e.eventType === SessionEventType.ACTIVITY_STARTED).length;
    const activitiesCompleted = activityEvents.filter(e => e.eventType === SessionEventType.ACTIVITY_COMPLETED).length;

    // Publish event to NATS (non-blocking)
    sessionEventPublisher.publishSessionEnded({
      sessionId: session.id,
      tenantId: session.tenantId,
      learnerId: session.learnerId,
      durationMs,
      endReason: 'completed',
      summary: {
        activitiesStarted,
        activitiesCompleted,
        correctAnswers: 0, // Would need to track this in events
        incorrectAnswers: 0,
        hintsUsed: 0,
      },
      endedAt: endTime,
    }).catch((err: unknown) => {
      console.error('[sessions] Failed to publish session.ended event:', err);
    });

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

  // ══════════════════════════════════════════════════════════════════════════════
  // TEACHER-LED SESSION ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * POST /sessions/from-plan
   * Create a new session from a session plan (teacher-led sessions).
   * 
   * Flow:
   * 1. Validates the session plan exists (calls teacher-planning-svc)
   * 2. Creates a SESSION row with TEACHER_LED origin
   * 3. Emits SESSION_STARTED event with sessionPlanId in metadata
   * 4. Returns the new session with its ID
   * 
   * Virtual Brain Integration (future):
   * - Session events (ACTIVITY_COMPLETED) with skill_id and rating will feed
   *   into learner_skill_states updates via an async pipeline.
   * - Each plan item completion with positive rating should increment mastery.
   */
  fastify.post('/sessions/from-plan', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = CreateFromPlanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { tenantId, learnerId, sessionPlanId, sessionType, metadata } = parsed.data;

    if (!canAccessTenant(user, tenantId)) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    // Check if there's already an active session for this learner
    const existingSession = await prisma.session.findFirst({
      where: {
        tenantId,
        learnerId,
        endedAt: null,
      },
    });

    if (existingSession) {
      return reply.status(409).send({
        error: 'Active session already exists',
        existingSessionId: existingSession.id,
      });
    }

    const now = new Date();

    // Determine session type - use provided or default to LEARNING for teacher-led
    const finalSessionType = sessionType || SessionType.LEARNING;

    // Create session with SESSION_STARTED event
    const session = await prisma.session.create({
      data: {
        tenantId,
        learnerId,
        sessionType: finalSessionType,
        origin: SessionOrigin.TEACHER_LED,
        startedAt: now,
        metadataJson: {
          sessionPlanId,
          initiatedByUserId: user.sub,
          ...metadata,
        },
        events: {
          create: {
            tenantId,
            learnerId,
            eventType: SessionEventType.SESSION_STARTED,
            eventTime: now,
            metadataJson: {
              origin: SessionOrigin.TEACHER_LED,
              sessionType: finalSessionType,
              sessionPlanId,
            },
          },
        },
      },
      include: {
        events: true,
      },
    });

    return reply.status(201).send({
      id: session.id,
      tenantId: session.tenantId,
      learnerId: session.learnerId,
      sessionType: session.sessionType,
      origin: session.origin,
      startedAt: session.startedAt,
      metadata: session.metadataJson,
      sessionPlanId,
    });
  });

  /**
   * POST /sessions/:id/activity-completed
   * Mark an activity (session plan item) as completed.
   * 
   * Emits ACTIVITY_COMPLETED event with the plan item details.
   * Optionally creates a quick progress note.
   * 
   * Virtual Brain Integration (future):
   * - If skillId is provided, this event will trigger a mastery update
   *   based on the rating: rating >= 3 increases mastery, < 2 may decrease.
   */
  fastify.post(
    '/sessions/:id/activity-completed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = SessionIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid session ID' });
      }

      const bodySchema = z.object({
        planItemId: z.string().uuid(),
        activityType: z.string(),
        skillId: z.string().uuid().optional(),
        goalId: z.string().uuid().optional(),
        goalObjectiveId: z.string().uuid().optional(),
        rating: z.number().int().min(0).max(4).optional(),
        durationMs: z.number().int().min(0).optional(),
        note: z.string().optional(),
      });

      const bodyParsed = bodySchema.safeParse(request.body);
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
        return reply.status(400).send({ error: 'Cannot update completed session' });
      }

      const { planItemId, activityType, skillId, goalId, goalObjectiveId, rating, durationMs, note } =
        bodyParsed.data;

      const event = await prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          tenantId: session.tenantId,
          learnerId: session.learnerId,
          eventType: SessionEventType.ACTIVITY_COMPLETED,
          eventTime: new Date(),
          metadataJson: {
            planItemId,
            activityType,
            skillId,
            goalId,
            goalObjectiveId,
            rating,
            durationMs,
            note,
          },
        },
      });

      return reply.status(201).send({
        eventId: event.id,
        eventType: event.eventType,
        eventTime: event.eventTime,
        metadata: event.metadataJson,
      });
    }
  );

  /**
   * POST /sessions/:id/progress-note
   * Create a progress note linked to this session.
   * 
   * This is a convenience endpoint that proxies to the progress-notes API
   * with the sessionId pre-filled.
   * 
   * Note: In a full implementation, this would call teacher-planning-svc's
   * progress notes endpoint. For now, we store it as a session event.
   */
  fastify.post(
    '/sessions/:id/progress-note',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = SessionIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid session ID' });
      }

      const bodyParsed = AddProgressNoteSchema.safeParse(request.body);
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

      const { noteText, rating, goalId, goalObjectiveId, activityItemId } = bodyParsed.data;

      // Store the progress note as a session event
      // In production, this would also call teacher-planning-svc to create a ProgressNote
      const event = await prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          tenantId: session.tenantId,
          learnerId: session.learnerId,
          eventType: SessionEventType.ACTIVITY_RESPONSE_SUBMITTED,
          eventTime: new Date(),
          metadataJson: {
            type: 'progress_note',
            noteText,
            rating,
            goalId,
            goalObjectiveId,
            activityItemId,
            createdByUserId: user.sub,
          },
        },
      });

      // TODO: Call teacher-planning-svc to create actual ProgressNote record
      // const progressNote = await fetch(`${TEACHER_PLANNING_SVC_URL}/progress-notes`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     learnerId: session.learnerId,
      //     sessionId: session.id,
      //     noteText,
      //     rating,
      //     goalId,
      //     goalObjectiveId,
      //   }),
      // });

      return reply.status(201).send({
        eventId: event.id,
        sessionId: session.id,
        noteText,
        rating,
        goalId,
        goalObjectiveId,
        createdAt: event.eventTime,
      });
    }
  );

  /**
   * GET /sessions/:id/summary
   * Get a summary of the session for the completion screen.
   * 
   * Returns:
   * - Session duration
   * - Activities completed count
   * - Progress notes captured
   * - Events timeline
   */
  fastify.get(
    '/sessions/:id/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Calculate stats from events
      const activitiesCompleted = session.events.filter(
        (e) => e.eventType === SessionEventType.ACTIVITY_COMPLETED
      );

      const progressNotes = session.events.filter(
        (e) =>
          e.eventType === SessionEventType.ACTIVITY_RESPONSE_SUBMITTED &&
          (e.metadataJson as Record<string, unknown> | null)?.type === 'progress_note'
      );

      const durationMs = session.durationMs || 
        (session.endedAt 
          ? session.endedAt.getTime() - session.startedAt.getTime()
          : new Date().getTime() - session.startedAt.getTime());

      return reply.send({
        id: session.id,
        sessionType: session.sessionType,
        origin: session.origin,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationMs,
        durationFormatted: formatDuration(durationMs),
        metadata: session.metadataJson,
        stats: {
          activitiesCompleted: activitiesCompleted.length,
          progressNotesCount: progressNotes.length,
          totalEvents: session.events.length,
        },
        activitiesCompleted: activitiesCompleted.map((e) => ({
          eventId: e.id,
          eventTime: e.eventTime,
          metadata: e.metadataJson,
        })),
        progressNotes: progressNotes.map((e) => ({
          eventId: e.id,
          eventTime: e.eventTime,
          ...(e.metadataJson as Record<string, unknown>),
        })),
      });
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
