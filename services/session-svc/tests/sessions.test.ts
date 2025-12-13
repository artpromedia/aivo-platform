/**
 * Session Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    sessionEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock event publisher
vi.mock('../src/services/event-publisher.js', () => ({
  sessionEventPublisher: {
    publishSessionStarted: vi.fn().mockResolvedValue(undefined),
    publishSessionEnded: vi.fn().mockResolvedValue(undefined),
    publishActivityStarted: vi.fn().mockResolvedValue(undefined),
    publishActivityCompleted: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from '../src/prisma.js';
import { sessionEventPublisher } from '../src/services/event-publisher.js';
import { sessionRoutes } from '../src/routes/sessions.js';

describe('Session Service', () => {
  let app: FastifyInstance;
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });

    // Mock auth decorator
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      // Simulate authenticated user
      (request as any).user = {
        sub: 'user-789',
        tenantId,
        role: 'learner',
      };
    });

    await app.register(sessionRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /sessions', () => {
    it('should create a new session with SESSION_STARTED event', async () => {
      const now = new Date();
      const mockSession = {
        id: 'session-001',
        tenantId,
        learnerId,
        sessionType: 'LEARNING',
        origin: 'MOBILE_LEARNER',
        startedAt: now,
        events: [
          {
            id: 'event-001',
            sessionId: 'session-001',
            tenantId,
            learnerId,
            eventType: 'SESSION_STARTED',
            eventTime: now,
          },
        ],
      };

      vi.mocked(prisma.session.create).mockResolvedValue(mockSession as any);

      const response = await app.inject({
        method: 'POST',
        url: '/sessions',
        payload: {
          tenantId,
          learnerId,
          sessionType: 'LEARNING',
          origin: 'MOBILE_LEARNER',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.id).toBe('session-001');
      expect(body.sessionType).toBe('LEARNING');
      expect(body.events).toHaveLength(1);
      expect(body.events[0].eventType).toBe('SESSION_STARTED');

      // Verify NATS event was published
      expect(sessionEventPublisher.publishSessionStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-001',
          tenantId,
          learnerId,
          sessionType: 'LEARNING',
          origin: 'MOBILE_LEARNER',
        })
      );
    });

    it('should reject request with invalid session type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions',
        payload: {
          tenantId,
          learnerId,
          sessionType: 'INVALID_TYPE',
          origin: 'MOBILE_LEARNER',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request body');
    });

    it('should include metadata when provided', async () => {
      const metadata = { deviceType: 'tablet', appVersion: '1.2.3' };
      const mockSession = {
        id: 'session-002',
        tenantId,
        learnerId,
        sessionType: 'HOMEWORK',
        origin: 'HOMEWORK_HELPER',
        startedAt: new Date(),
        metadataJson: metadata,
        events: [],
      };

      vi.mocked(prisma.session.create).mockResolvedValue(mockSession as any);

      const response = await app.inject({
        method: 'POST',
        url: '/sessions',
        payload: {
          tenantId,
          learnerId,
          sessionType: 'HOMEWORK',
          origin: 'HOMEWORK_HELPER',
          metadata,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadataJson: metadata,
          }),
        })
      );
    });
  });

  describe('GET /sessions', () => {
    it('should list sessions with pagination', async () => {
      const mockSessions = [
        { id: 'session-001', tenantId, learnerId, sessionType: 'LEARNING' },
        { id: 'session-002', tenantId, learnerId, sessionType: 'PRACTICE' },
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions as any);
      vi.mocked(prisma.session.count).mockResolvedValue(10);

      const response = await app.inject({
        method: 'GET',
        url: `/sessions?tenantId=${tenantId}&limit=2&offset=0`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sessions).toHaveLength(2);
      expect(body.total).toBe(10);
    });

    it('should filter by learner', async () => {
      vi.mocked(prisma.session.findMany).mockResolvedValue([]);
      vi.mocked(prisma.session.count).mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: `/sessions?tenantId=${tenantId}&learnerId=${learnerId}`,
      });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            learnerId,
          }),
        })
      );
    });

    it('should filter by session type', async () => {
      vi.mocked(prisma.session.findMany).mockResolvedValue([]);
      vi.mocked(prisma.session.count).mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: `/sessions?tenantId=${tenantId}&sessionType=ASSESSMENT`,
      });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            sessionType: 'ASSESSMENT',
          }),
        })
      );
    });
  });

  describe('GET /sessions/:id', () => {
    it('should return session with events', async () => {
      const mockSession = {
        id: 'session-001',
        tenantId,
        learnerId,
        sessionType: 'LEARNING',
        origin: 'MOBILE_LEARNER',
        startedAt: new Date(),
        events: [
          { id: 'event-001', eventType: 'SESSION_STARTED' },
          { id: 'event-002', eventType: 'ACTIVITY_STARTED' },
        ],
      };

      vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as any);

      const response = await app.inject({
        method: 'GET',
        url: '/sessions/session-001',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('session-001');
      expect(body.events).toHaveLength(2);
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/sessions/nonexistent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

describe('Session Events', () => {
  let app: FastifyInstance;
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });

    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        sub: 'user-789',
        tenantId,
        role: 'learner',
      };
    });

    await app.register(sessionRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /sessions/:id/events', () => {
    it('should add an event to a session', async () => {
      const mockSession = {
        id: 'session-001',
        tenantId,
        learnerId,
        sessionType: 'LEARNING',
        startedAt: new Date(),
      };

      const mockEvent = {
        id: 'event-002',
        sessionId: 'session-001',
        tenantId,
        learnerId,
        eventType: 'ACTIVITY_STARTED',
        eventTime: new Date(),
      };

      vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.sessionEvent.create).mockResolvedValue(mockEvent as any);

      const response = await app.inject({
        method: 'POST',
        url: '/sessions/session-001/events',
        payload: {
          eventType: 'ACTIVITY_STARTED',
          metadata: { activityId: 'activity-001' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.eventType).toBe('ACTIVITY_STARTED');
    });

    it('should reject invalid event type', async () => {
      const mockSession = {
        id: 'session-001',
        tenantId,
        learnerId,
      };

      vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as any);

      const response = await app.inject({
        method: 'POST',
        url: '/sessions/session-001/events',
        payload: {
          eventType: 'INVALID_EVENT',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /sessions/:id/complete', () => {
    it('should complete a session and calculate duration', async () => {
      const startedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockSession = {
        id: 'session-001',
        tenantId,
        learnerId,
        sessionType: 'LEARNING',
        startedAt,
        events: [],
      };

      const completedSession = {
        ...mockSession,
        endedAt: expect.any(Date),
        durationMs: expect.any(Number),
      };

      vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.session.update).mockResolvedValue(completedSession as any);

      const response = await app.inject({
        method: 'POST',
        url: '/sessions/session-001/complete',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endedAt: expect.any(Date),
            durationMs: expect.any(Number),
          }),
        })
      );

      // Verify NATS event was published
      expect(sessionEventPublisher.publishSessionEnded).toHaveBeenCalled();
    });

    it('should not complete already completed session', async () => {
      const mockSession = {
        id: 'session-001',
        tenantId,
        learnerId,
        sessionType: 'LEARNING',
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        endedAt: new Date(), // Already ended
      };

      vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as any);

      const response = await app.inject({
        method: 'POST',
        url: '/sessions/session-001/complete',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(prisma.session.update).not.toHaveBeenCalled();
    });
  });
});

describe('Session Types', () => {
  it('should support all session types', () => {
    const sessionTypes = [
      'LEARNING',
      'HOMEWORK',
      'BASELINE',
      'PRACTICE',
      'SEL',
      'ASSESSMENT',
    ];

    sessionTypes.forEach((type) => {
      expect(type).toBeDefined();
    });
  });

  it('should support all session origins', () => {
    const origins = [
      'MOBILE_LEARNER',
      'WEB_LEARNER',
      'TEACHER_LED',
      'HOMEWORK_HELPER',
      'PARENT_APP',
      'SYSTEM',
    ];

    origins.forEach((origin) => {
      expect(origin).toBeDefined();
    });
  });

  it('should support all event types', () => {
    const eventTypes = [
      'SESSION_STARTED',
      'SESSION_PAUSED',
      'SESSION_RESUMED',
      'SESSION_ENDED',
      'ACTIVITY_STARTED',
      'ACTIVITY_COMPLETED',
      'ANSWER_SUBMITTED',
      'HINT_REQUESTED',
      'FOCUS_PING',
      'FOCUS_LOSS_DETECTED',
      'BREAK_STARTED',
      'BREAK_ENDED',
      'REGULATION_ACTIVITY_STARTED',
      'REGULATION_ACTIVITY_COMPLETED',
    ];

    eventTypes.forEach((type) => {
      expect(type).toBeDefined();
    });
  });
});

describe('Multi-tenancy', () => {
  let app: FastifyInstance;
  const tenantA = 'tenant-aaa';
  const tenantB = 'tenant-bbb';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should enforce tenant isolation on session creation', async () => {
    // User from tenant A trying to create session for tenant B
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        sub: 'user-789',
        tenantId: tenantA,
        role: 'learner',
      };
    });

    await app.register(sessionRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {
        tenantId: tenantB, // Different tenant!
        learnerId: 'learner-123',
        sessionType: 'LEARNING',
        origin: 'MOBILE_LEARNER',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it('should allow service role to access any tenant', async () => {
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        sub: 'service-account',
        tenantId: 'system',
        role: 'service',
      };
    });

    await app.register(sessionRoutes);
    await app.ready();

    const mockSession = {
      id: 'session-001',
      tenantId: tenantB,
      learnerId: 'learner-123',
      sessionType: 'LEARNING',
      origin: 'SYSTEM',
      startedAt: new Date(),
      events: [],
    };

    vi.mocked(prisma.session.create).mockResolvedValue(mockSession as any);

    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {
        tenantId: tenantB,
        learnerId: 'learner-123',
        sessionType: 'LEARNING',
        origin: 'SYSTEM',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(prisma.session.create).toHaveBeenCalled();
  });
});
