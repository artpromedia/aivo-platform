/**
 * Session Routes Unit Tests
 *
 * Tests for the tutor session lifecycle: creation, messaging, ending,
 * locale switching, and entitlement enforcement.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP — must be above imports that use them
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  tutorSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  tutorMessage: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  tutorSessionAnalytics: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
  TutorSessionStatus: {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    EXPIRED: 'EXPIRED',
    ERROR: 'ERROR',
  },
  TutorMessageRole: {
    USER: 'USER',
    ASSISTANT: 'ASSISTANT',
    SYSTEM: 'SYSTEM',
  },
}));

vi.mock('../config.js', () => ({
  config: {
    aiOrchestratorUrl: 'http://localhost:4005',
    learnerModelUrl: 'http://localhost:4015',
    billingSvcUrl: 'http://localhost:3150',
    ttsServiceUrl: 'http://localhost:5100',
    ttsEnabled: false,
  },
}));

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS (after mocks)
// ══════════════════════════════════════════════════════════════════════════════

import {
  SessionService,
  detectEmotion,
  mapEmotionToAvatarState,
} from '../services/session.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function createMockPersona(overrides = {}) {
  return {
    id: 'persona-nova-001',
    slug: 'nova',
    name: 'Nova',
    subject: 'MATH',
    systemPromptTemplate: 'You are Nova, a math tutor...',
    avatarRivAsset: 'nova.riv',
    avatarStaticImage: 'nova.png',
    ...overrides,
  };
}

function createMockSession(overrides = {}) {
  return {
    id: 'session-001',
    tenantId: 'tenant-001',
    learnerId: 'learner-001',
    parentUserId: 'parent-001',
    personaId: 'persona-nova-001',
    subject: 'MATH',
    topic: 'Fractions',
    locale: 'en-US',
    status: 'ACTIVE',
    startedAt: new Date('2026-01-15T10:00:00Z'),
    endedAt: null,
    totalMessages: 0,
    totalDurationMs: 0,
    totalTokensUsed: 0,
    persona: createMockPersona(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionService();

    // Default: AI orchestrator succeeds
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          content: "Hi! I'm Nova, your math tutor. Let's work on fractions today!",
          metadata: { tokens: 42, latencyMs: 200 },
        }),
        { status: 200 },
      ),
    );
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates session with persona and generates opening message', async () => {
      const mockSession = createMockSession();
      mockPrisma.tutorSession.create.mockResolvedValue(mockSession);
      mockPrisma.tutorSessionAnalytics.create.mockResolvedValue({});
      mockPrisma.tutorMessage.create.mockResolvedValue({});

      const result = await service.create({
        tenantId: 'tenant-001',
        learnerId: 'learner-001',
        parentUserId: 'parent-001',
        personaId: 'persona-nova-001',
        subject: 'MATH',
        topic: 'Fractions',
        locale: 'en-US',
      });

      expect(result.session.id).toBe('session-001');
      expect(result.session.status).toBe('ACTIVE');
      expect(result.openingMessage).toContain('Nova');
      expect(result.emotionTag).toBeDefined();
      expect(result.avatarState).toBeDefined();

      // Session was created in DB
      expect(mockPrisma.tutorSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-001',
            learnerId: 'learner-001',
            personaId: 'persona-nova-001',
            subject: 'MATH',
            status: 'ACTIVE',
          }),
        }),
      );

      // Analytics record was created
      expect(mockPrisma.tutorSessionAnalytics.create).toHaveBeenCalledOnce();

      // Opening message was stored
      expect(mockPrisma.tutorMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-001',
            role: 'ASSISTANT',
          }),
        }),
      );
    });

    it('uses fallback greeting when AI orchestrator fails', async () => {
      const mockSession = createMockSession();
      mockPrisma.tutorSession.create.mockResolvedValue(mockSession);
      mockPrisma.tutorSessionAnalytics.create.mockResolvedValue({});
      mockPrisma.tutorMessage.create.mockResolvedValue({});

      // AI orchestrator fails
      (globalThis.fetch as Mock).mockRejectedValue(new Error('AI service down'));

      const result = await service.create({
        tenantId: 'tenant-001',
        learnerId: 'learner-001',
        personaId: 'persona-nova-001',
        subject: 'MATH',
        topic: 'Fractions',
        locale: 'en-US',
      });

      expect(result.openingMessage).toContain('Nova');
      expect(result.openingMessage).toContain('Fractions');
      expect(result.emotionTag).toBe('cheerful');
    });

    it('passes learner profile to AI orchestrator when available', async () => {
      const mockSession = createMockSession();
      mockPrisma.tutorSession.create.mockResolvedValue(mockSession);
      mockPrisma.tutorSessionAnalytics.create.mockResolvedValue({});
      mockPrisma.tutorMessage.create.mockResolvedValue({});

      const learnerProfile = {
        id: 'profile-001',
        learnerId: 'learner-001',
        gradeBand: 'K-2',
        gradeLevel: 2,
        age: 7,
        summary: { totalSkills: 10, byDomain: { MATH: { count: 5, avgMastery: 0.6 } } },
      };

      await service.create({
        tenantId: 'tenant-001',
        learnerId: 'learner-001',
        personaId: 'persona-nova-001',
        subject: 'MATH',
        learnerProfile,
      });

      // Verify AI orchestrator was called with profile context
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ai/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('learnerProfile'),
        }),
      );
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns session with persona', async () => {
      const mockSession = createMockSession();
      mockPrisma.tutorSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.getById('session-001');
      expect(result?.id).toBe('session-001');
      expect(result?.persona?.name).toBe('Nova');
    });

    it('returns null for non-existent session', async () => {
      mockPrisma.tutorSession.findUnique.mockResolvedValue(null);

      const result = await service.getById('session-missing');
      expect(result).toBeNull();
    });
  });

  // ── listByLearner ───────────────────────────────────────────────────────

  describe('listByLearner', () => {
    it('returns paginated sessions for learner', async () => {
      const sessions = [createMockSession(), createMockSession({ id: 'session-002' })];
      mockPrisma.tutorSession.findMany.mockResolvedValue(sessions);
      mockPrisma.tutorSession.count.mockResolvedValue(2);

      const result = await service.listByLearner({
        tenantId: 'tenant-001',
        learnerId: 'learner-001',
        limit: 20,
        offset: 0,
      });

      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status when provided', async () => {
      mockPrisma.tutorSession.findMany.mockResolvedValue([]);
      mockPrisma.tutorSession.count.mockResolvedValue(0);

      await service.listByLearner({
        tenantId: 'tenant-001',
        learnerId: 'learner-001',
        status: 'COMPLETED',
      });

      expect(mockPrisma.tutorSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  // ── end ─────────────────────────────────────────────────────────────────

  describe('end', () => {
    it('updates session to COMPLETED and calculates analytics', async () => {
      const endedSession = createMockSession({
        status: 'COMPLETED',
        endedAt: new Date('2026-01-15T10:30:00Z'),
      });
      mockPrisma.tutorSession.update.mockResolvedValue(endedSession);
      mockPrisma.tutorMessage.count
        .mockResolvedValueOnce(10)  // total messages
        .mockResolvedValueOnce(5)   // user messages
        .mockResolvedValueOnce(5);  // assistant messages
      mockPrisma.tutorSessionAnalytics.update.mockResolvedValue({});

      const result = await service.end('session-001');

      expect(result.status).toBe('COMPLETED');
      expect(result.endedAt).toBeDefined();

      // Analytics updated with counts
      expect(mockPrisma.tutorSessionAnalytics.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'session-001' },
          data: expect.objectContaining({
            messageCount: 10,
            userMessageCount: 5,
            assistantMessageCount: 5,
          }),
        }),
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EMOTION DETECTION
// ══════════════════════════════════════════════════════════════════════════════

describe('detectEmotion', () => {
  it('detects encouraging tone', () => {
    expect(detectEmotion('Great job! You got this!')).toBe('encouraging');
  });

  it('detects celebrating tone', () => {
    expect(detectEmotion('Congratulations! You nailed it! Perfect!')).toBe('celebrating');
  });

  it('detects empathetic tone', () => {
    expect(detectEmotion("Don't worry, take your time. It's okay.")).toBe('empathetic');
  });

  it('detects curious tone', () => {
    expect(detectEmotion("That's interesting! I wonder what would happen if we explore this further.")).toBe('curious');
  });

  it('detects thinking tone', () => {
    expect(detectEmotion("Hmm, let me think about this. Let's work through it step by step.")).toBe('thinking');
  });

  it('detects cheerful tone', () => {
    expect(detectEmotion("Hello! Welcome! I'm glad to see you. Let's get started!")).toBe('cheerful');
  });

  it('returns neutral for unrecognized text', () => {
    expect(detectEmotion('The answer is 42.')).toBe('neutral');
  });

  it('handles empty text', () => {
    expect(detectEmotion('')).toBe('neutral');
  });

  it('is case insensitive', () => {
    expect(detectEmotion('GREAT JOB! AWESOME WORK!')).toBe('encouraging');
  });
});

describe('mapEmotionToAvatarState', () => {
  it('maps encouraging to talking', () => {
    expect(mapEmotionToAvatarState('encouraging')).toBe('talking');
  });

  it('maps celebrating to celebrating', () => {
    expect(mapEmotionToAvatarState('celebrating')).toBe('celebrating');
  });

  it('maps empathetic to thinking', () => {
    expect(mapEmotionToAvatarState('empathetic')).toBe('thinking');
  });

  it('maps neutral to idle', () => {
    expect(mapEmotionToAvatarState('neutral')).toBe('idle');
  });

  it('maps unknown emotion to idle', () => {
    expect(mapEmotionToAvatarState('unknown_emotion')).toBe('idle');
  });
});
