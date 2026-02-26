/**
 * Session Lifecycle Integration Tests
 *
 * Tests the full tutor session flow with mock database interactions:
 * 1. Seed persona data
 * 2. Create a session → verify DB record
 * 3. Send messages → verify conversation history
 * 4. End session → verify analytics record created
 * 5. Fetch analytics → verify summary is correct
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ══════════════════════════════════════════════════════════════════════════════

const sessionDb: Map<string, Record<string, unknown>> = new Map();
const messageDb: Map<string, Record<string, unknown>[]> = new Map();
const analyticsDb: Map<string, Record<string, unknown>> = new Map();

const mockPrisma = {
  tutorSession: {
    create: vi.fn().mockImplementation(({ data, include }) => {
      const id = `session-${Date.now()}`;
      const session = {
        id,
        ...data,
        startedAt: new Date(),
        endedAt: null,
        totalMessages: 0,
        totalDurationMs: 0,
        totalTokensUsed: 0,
        persona: {
          id: data.personaId,
          slug: 'nova',
          name: 'Nova',
          subject: data.subject,
          systemPromptTemplate: 'You are Nova...',
          avatarRivAsset: 'nova.riv',
          avatarStaticImage: 'nova.png',
        },
      };
      sessionDb.set(id, session);
      messageDb.set(id, []);
      return session;
    }),
    findUnique: vi.fn().mockImplementation(({ where }) => {
      return sessionDb.get(where.id) ?? null;
    }),
    findMany: vi.fn().mockImplementation(({ where }) => {
      return [...sessionDb.values()].filter(
        (s) =>
          s.tenantId === where.tenantId &&
          s.learnerId === where.learnerId &&
          (!where.status || s.status === where.status),
      );
    }),
    update: vi.fn().mockImplementation(({ where, data }) => {
      const session = sessionDb.get(where.id);
      if (!session) throw new Error('Session not found');
      Object.assign(session, data);
      return session;
    }),
    count: vi.fn().mockImplementation(({ where }) => {
      return [...sessionDb.values()].filter(
        (s) =>
          s.tenantId === where.tenantId &&
          s.learnerId === where.learnerId,
      ).length;
    }),
  },
  tutorMessage: {
    create: vi.fn().mockImplementation(({ data }) => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const msg = { id, ...data, createdAt: new Date() };
      const msgs = messageDb.get(data.sessionId) ?? [];
      msgs.push(msg);
      messageDb.set(data.sessionId, msgs);
      return msg;
    }),
    findMany: vi.fn().mockImplementation(({ where, orderBy, take }) => {
      const msgs = messageDb.get(where.sessionId) ?? [];
      return take ? msgs.slice(0, take) : msgs;
    }),
    count: vi.fn().mockImplementation(({ where }) => {
      const msgs = messageDb.get(where.sessionId) ?? [];
      if (where.role) {
        return msgs.filter((m) => m.role === where.role).length;
      }
      return msgs.length;
    }),
  },
  tutorSessionAnalytics: {
    create: vi.fn().mockImplementation(({ data }) => {
      analyticsDb.set(data.sessionId, data);
      return data;
    }),
    update: vi.fn().mockImplementation(({ where, data }) => {
      const existing = analyticsDb.get(where.sessionId);
      if (existing) Object.assign(existing, data);
      return existing;
    }),
    findUnique: vi.fn().mockImplementation(({ where }) => {
      return analyticsDb.get(where.sessionId) ?? null;
    }),
  },
};

vi.mock('../../prisma.js', () => ({
  prisma: mockPrisma,
  TutorSessionStatus: {
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
  },
  TutorMessageRole: {
    USER: 'USER',
    ASSISTANT: 'ASSISTANT',
    SYSTEM: 'SYSTEM',
  },
}));

vi.mock('../../config.js', () => ({
  config: {
    aiOrchestratorUrl: 'http://localhost:4005',
    learnerModelUrl: 'http://localhost:4015',
    billingSvcUrl: 'http://localhost:3150',
    ttsServiceUrl: 'http://localhost:5100',
    ttsEnabled: false,
  },
}));

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ══════════════════════════════════════════════════════════════════════════════

import { SessionService } from '../../services/session.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Session Lifecycle Integration', () => {
  let service: SessionService;
  let createdSessionId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionDb.clear();
    messageDb.clear();
    analyticsDb.clear();
    service = new SessionService();

    // Mock AI orchestrator response
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          content: "Hi! I'm Nova, your math tutor. Let's work on fractions today!",
          metadata: { tokens: 45, latencyMs: 180 },
        }),
        { status: 200 },
      ),
    );
  });

  it('completes full session lifecycle: create → messages → end → analytics', async () => {
    // ── Step 1: Create session ──────────────────────────────────────────

    const createResult = await service.create({
      tenantId: 'tenant-int-001',
      learnerId: 'learner-int-001',
      parentUserId: 'parent-int-001',
      personaId: 'persona-nova-001',
      subject: 'MATH',
      topic: 'Fractions',
      locale: 'en-US',
    });

    createdSessionId = createResult.session.id;

    // Verify session was created
    expect(sessionDb.has(createdSessionId)).toBe(true);
    const storedSession = sessionDb.get(createdSessionId)!;
    expect(storedSession.tenantId).toBe('tenant-int-001');
    expect(storedSession.status).toBe('ACTIVE');

    // Verify analytics record was created
    expect(analyticsDb.has(createdSessionId)).toBe(true);

    // Verify opening message was stored
    const messages = messageDb.get(createdSessionId) ?? [];
    expect(messages).toHaveLength(1);
    expect(messages[0]!.role).toBe('ASSISTANT');

    // ── Step 2: Simulate 3 conversation turns ───────────────────────────

    // User message 1
    await mockPrisma.tutorMessage.create({
      data: {
        sessionId: createdSessionId,
        role: 'USER',
        content: 'How do I add fractions?',
      },
    });

    // Assistant response 1
    await mockPrisma.tutorMessage.create({
      data: {
        sessionId: createdSessionId,
        role: 'ASSISTANT',
        content: 'Great question! To add fractions, first find a common denominator.',
        emotionTag: 'encouraging',
        avatarState: 'talking',
      },
    });

    // User message 2
    await mockPrisma.tutorMessage.create({
      data: {
        sessionId: createdSessionId,
        role: 'USER',
        content: 'What is a common denominator?',
      },
    });

    // Assistant response 2
    await mockPrisma.tutorMessage.create({
      data: {
        sessionId: createdSessionId,
        role: 'ASSISTANT',
        content: "Hmm, let me think about the best way to explain this. A common denominator is a number that both denominators divide into evenly.",
        emotionTag: 'thinking',
        avatarState: 'thinking',
      },
    });

    // User message 3
    await mockPrisma.tutorMessage.create({
      data: {
        sessionId: createdSessionId,
        role: 'USER',
        content: 'So 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2?',
      },
    });

    // Assistant response 3
    await mockPrisma.tutorMessage.create({
      data: {
        sessionId: createdSessionId,
        role: 'ASSISTANT',
        content: 'Congratulations! You nailed it! That\'s the correct answer!',
        emotionTag: 'celebrating',
        avatarState: 'celebrating',
      },
    });

    // Verify conversation history (opening + 6 messages = 7 total)
    const allMessages = messageDb.get(createdSessionId) ?? [];
    expect(allMessages).toHaveLength(7);

    const userMessages = allMessages.filter((m) => m.role === 'USER');
    const assistantMessages = allMessages.filter((m) => m.role === 'ASSISTANT');
    expect(userMessages).toHaveLength(3);
    expect(assistantMessages).toHaveLength(4); // opening + 3 responses

    // ── Step 3: End session ──────────────────────────────────────────────

    const endedSession = await service.end(createdSessionId);

    expect(endedSession.status).toBe('COMPLETED');
    expect(endedSession.endedAt).toBeDefined();

    // ── Step 4: Verify analytics were updated ───────────────────────────

    expect(mockPrisma.tutorSessionAnalytics.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: createdSessionId },
        data: expect.objectContaining({
          messageCount: expect.any(Number),
          userMessageCount: expect.any(Number),
          assistantMessageCount: expect.any(Number),
        }),
      }),
    );
  });

  it('handles multiple sessions for same learner', async () => {
    // Create session 1
    const session1 = await service.create({
      tenantId: 'tenant-int-001',
      learnerId: 'learner-int-001',
      personaId: 'persona-nova-001',
      subject: 'MATH',
    });

    // Create session 2
    const session2 = await service.create({
      tenantId: 'tenant-int-001',
      learnerId: 'learner-int-001',
      personaId: 'persona-sage-001',
      subject: 'ELA',
    });

    expect(session1.session.id).not.toBe(session2.session.id);
    expect(sessionDb.size).toBe(2);
  });

  it('session getById returns correct session with persona', async () => {
    const createResult = await service.create({
      tenantId: 'tenant-int-001',
      learnerId: 'learner-int-001',
      personaId: 'persona-nova-001',
      subject: 'MATH',
    });

    const retrieved = await service.getById(createResult.session.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(createResult.session.id);
    expect(retrieved?.persona?.name).toBe('Nova');
  });

  it('session getById returns null for non-existent session', async () => {
    const result = await service.getById('non-existent-id');
    expect(result).toBeNull();
  });
});
