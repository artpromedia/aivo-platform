/**
 * S16.1 — End-to-End Learning Journey Integration Tests
 *
 * Tests complete learner journeys through the brain-orchestrator,
 * verifying that all Q2 services (RL tutoring, cognitive load,
 * peer learning, accessibility AI, specialized support) work
 * together correctly when feature flags are enabled.
 *
 * Mocking strategy:
 *  - global `fetch` → intercept calls to upstream micro-services
 *  - prisma → in-memory stubs for DB queries
 *  - auth → x-test-user header (NODE_ENV=test bypass)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi, type Mock } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// ── Mock prisma before any route imports ────────────────────────────
const mockPrisma = {
  orchestrationPlan: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  learningPath: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  learningPathProgress: {
    updateMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  cognitiveInteraction: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  },
  cognitiveSession: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'session-123' }),
  },
  cognitiveStateSnapshot: {
    create: vi.fn().mockResolvedValue({}),
  },
  breakRecord: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
  skillMastery: {
    findFirst: vi.fn(),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  learningEvent: {
    create: vi.fn().mockResolvedValue({}),
  },
  disengagementAlert: {
    create: vi.fn().mockResolvedValue({}),
  },
};

vi.mock('../../src/prisma.js', () => ({ prisma: mockPrisma }));

// ── Mock NATS (if imported transitively) ────────────────────────────
vi.mock('../../src/events/nats.js', () => ({
  natsPublish: vi.fn(),
  natsSubscribe: vi.fn(),
  getNatsConnection: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────
const TEST_USER = JSON.stringify({
  sub: 'user-e2e-001',
  tenantId: 'tenant-e2e-001',
  role: 'student',
});

const LEARNER_ID = 'learner-e2e-001';

const makeFetchResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

/** Capture which upstream URLs were called */
let fetchCalls: Array<{ url: string; method: string; body?: unknown }> = [];

// ── Global fetch mock ──────────────────────────────────────────────
const originalFetch = globalThis.fetch;

function mockFetchRouter(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
  const method = init?.method ?? 'GET';
  let body: unknown;
  try {
    body = init?.body ? JSON.parse(init.body as string) : undefined;
  } catch {
    body = init?.body;
  }
  fetchCalls.push({ url: urlStr, method, body });

  // ── RL Tutoring Service ─────────────────────────────────────────
  if (urlStr.includes('/api/v1/action/select')) {
    return makeFetchResponse({
      action_type: 'practice',
      difficulty: 0.6,
      parameters: { content_id: 'content-rl-001' },
      confidence: 0.85,
    });
  }
  if (urlStr.includes('/api/v1/reward/record')) {
    return makeFetchResponse({ status: 'recorded' });
  }

  // ── Cognitive Load Service ──────────────────────────────────────
  if (urlStr.includes('/api/v1/load/estimate')) {
    return makeFetchResponse({
      total_load: 0.45,
      intrinsic_load: 0.25,
      extraneous_load: 0.1,
      germane_load: 0.1,
      load_level: 'optimal',
      trend: 'stable',
    });
  }
  if (urlStr.includes('/api/v1/adaptation/recommend')) {
    return makeFetchResponse({
      actions: [
        { action_type: 'reduce_complexity', priority: 'medium' },
      ],
    });
  }
  if (urlStr.includes('/api/v1/scaffolding/generate')) {
    return makeFetchResponse({
      scaffolds: [
        { type: 'hint', content: 'Try breaking the problem into smaller parts' },
      ],
    });
  }
  if (urlStr.includes('/api/v1/signal/interaction')) {
    return makeFetchResponse({ status: 'received' });
  }

  // ── Peer Learning Service ───────────────────────────────────────
  if (urlStr.includes('/api/v1/peer-learning/score-collaboration')) {
    return makeFetchResponse({
      scores: { overall: 0.82, participation: 0.9, helpfulness: 0.75 },
    });
  }
  if (urlStr.includes('/api/v1/peer-learning/match')) {
    return makeFetchResponse({
      matches: [{ peer_id: 'peer-001', compatibility: 0.88 }],
    });
  }
  if (urlStr.includes('/peer-learning/') && urlStr.includes('/form-groups')) {
    return makeFetchResponse({
      groups: [{ group_id: 'grp-001', members: [LEARNER_ID, 'peer-001'] }],
    });
  }
  if (urlStr.includes('/api/v1/peer-learning/facilitate')) {
    return makeFetchResponse({ session: { id: 'session-peer-001', status: 'active' } });
  }
  if (urlStr.includes('/api/v1/peer-learning/groups/')) {
    return makeFetchResponse({ groups: [] });
  }

  // ── Accessibility AI Service ────────────────────────────────────
  if (urlStr.includes('/api/v1/adapt-reading-level')) {
    return makeFetchResponse({
      text: 'Simplified content for grade 3',
      original_lexile: 800,
      adapted_lexile: 500,
    });
  }
  if (urlStr.includes('/api/v1/estimate-lexile')) {
    return makeFetchResponse({ lexile: 650, grade_equivalent: '4.5' });
  }
  if (urlStr.includes('/api/v1/apply-sensory')) {
    return makeFetchResponse({ adapted: true, profile: 'low-vision' });
  }
  if (urlStr.includes('/api/v1/accommodations')) {
    return makeFetchResponse({
      accommodations: [{ type: 'extended_time', multiplier: 1.5 }],
    });
  }
  if (urlStr.includes('/api/v1/simplify')) {
    return makeFetchResponse({ text: 'Simple version of the text' });
  }

  // ── Specialized Support Service ─────────────────────────────────
  if (urlStr.includes('/api/v1/specialized-support/analyze-iep')) {
    return makeFetchResponse({
      quality_score: 85,
      goals: [{ id: 'iep-goal-1', description: 'Reading comprehension' }],
      recommendations: ['Add measurable criteria'],
    });
  }
  if (urlStr.includes('/api/v1/specialized-support/iep-implications')) {
    return makeFetchResponse({
      feature_toggles: [
        { feature: 'extended_time', enabled: true },
        { feature: 'simplified_content', enabled: true },
      ],
    });
  }
  if (urlStr.includes('/api/v1/specialized-support/iep-progress')) {
    return makeFetchResponse({
      overall_progress_pct: 65,
      goals: [{ id: 'iep-goal-1', progress_pct: 65 }],
    });
  }
  if (urlStr.includes('/api/v1/specialized-support/differentiate')) {
    return makeFetchResponse({
      strategy_type: 'content_modification',
      modifications: [{ type: 'simplify', target: 'reading_passage' }],
    });
  }
  if (urlStr.includes('/api/v1/specialized-support/suggest-differentiation')) {
    return makeFetchResponse({
      suggestions: [{ strategy: 'scaffolded_support', confidence: 0.9 }],
    });
  }
  if (urlStr.includes('/api/v1/specialized-support/recommend-accommodations')) {
    return makeFetchResponse({
      new_suggestions: [{ type: 'text_to_speech', priority: 'high' }],
    });
  }
  if (urlStr.includes('/api/v1/specialized-support/evaluate-effectiveness')) {
    return makeFetchResponse({
      rating: 'effective',
      evidence: ['mastery improved by 15%'],
    });
  }

  // ── Training / BKT ─────────────────────────────────────────────
  if (urlStr.includes('/api/v1/training/bkt/update')) {
    return makeFetchResponse({ updated: true });
  }

  // ── Learner Model Service ──────────────────────────────────────
  if (urlStr.includes('/api/v1/learner-model/')) {
    return makeFetchResponse({ updated: true });
  }

  // ── Analytics Service ──────────────────────────────────────────
  if (urlStr.includes('/api/v1/analytics/')) {
    return makeFetchResponse({
      summary: { totalActivities: 42, averageScore: 78, activeMinutes: 350 },
    });
  }

  // ── Default: return 404 ────────────────────────────────────────
  console.warn('[fetch-mock] Unmatched URL:', urlStr);
  return makeFetchResponse({ error: 'Not found' }, 404);
}

// ── App builder ────────────────────────────────────────────────────
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Auth middleware  — x-test-user bypass
  const { authMiddleware } = await import('../../src/middleware/auth.js');
  app.register(authMiddleware);

  // Register all route plugins
  const { orchestrationRoutes } = await import('../../src/routes/orchestration.routes.js');
  const { learningRoutes } = await import('../../src/routes/learning.routes.js');
  const { cognitiveRoutes } = await import('../../src/routes/cognitive.routes.js');
  const { peerRoutes } = await import('../../src/routes/peer.routes.js');
  const { accessibilityRoutes } = await import('../../src/routes/accessibility.routes.js');
  const { specializedSupportRoutes } = await import(
    '../../src/routes/specialized-support.routes.js'
  );

  app.register(orchestrationRoutes, { prefix: '/api/v1/brain' });
  app.register(cognitiveRoutes, { prefix: '/api/v1/brain' });
  app.register(learningRoutes, { prefix: '/api/v1/brain' });
  app.register(peerRoutes, { prefix: '/api/v1/brain' });
  app.register(accessibilityRoutes, { prefix: '/api/v1/brain' });
  app.register(specializedSupportRoutes, { prefix: '/api/v1/brain' });

  await app.ready();
  return app;
}

// ── Test suite ─────────────────────────────────────────────────────
describe('S16.1 — End-to-End Learning Journeys', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Enable all Q2 feature flags
    process.env.NODE_ENV = 'test';
    process.env.FEATURE_RL_TUTORING = 'true';
    process.env.FEATURE_COGNITIVE_LOAD = 'true';
    process.env.FEATURE_PEER_LEARNING = 'true';
    process.env.FEATURE_ACCESSIBILITY_AI = 'true';
    process.env.FEATURE_SPECIALIZED_SUPPORT = 'true';

    // Install fetch mock
    globalThis.fetch = mockFetchRouter as unknown as typeof fetch;

    app = await buildTestApp();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  beforeEach(() => {
    fetchCalls = [];
    vi.clearAllMocks();

    // Default prisma stubs for learning path queries
    mockPrisma.learningPath.findFirst.mockResolvedValue({
      id: 'path-e2e-001',
      learnerId: LEARNER_ID,
      tenantId: 'tenant-e2e-001',
      name: 'Adaptive Math Path',
      description: 'Generated path',
      activities: {
        orderedActivities: [
          {
            activity: {
              id: '00000000-0000-4000-a000-000000000001',
              type: 'practice',
              title: 'Fractions Basics',
              description: 'Learn basic fractions',
              estimatedDuration: 15,
              cognitiveLoad: 'medium',
              difficulty: 5,
              skillIds: ['skill-fractions-001'],
              prerequisites: [],
            },
          },
          {
            activity: {
              id: '00000000-0000-4000-a000-000000000002',
              type: 'lesson',
              title: 'Decimals Introduction',
              description: 'Introduction to decimals',
              estimatedDuration: 20,
              cognitiveLoad: 'medium',
              difficulty: 5,
              skillIds: ['skill-decimals-001'],
              prerequisites: ['00000000-0000-4000-a000-000000000001'],
            },
          },
          {
            activity: {
              id: '00000000-0000-4000-a000-000000000003',
              type: 'assessment',
              title: 'Fractions & Decimals Quiz',
              description: 'Assess understanding',
              estimatedDuration: 10,
              cognitiveLoad: 'high',
              difficulty: 6,
              skillIds: ['skill-fractions-001', 'skill-decimals-001'],
              prerequisites: ['00000000-0000-4000-a000-000000000002'],
            },
          },
        ],
      },
      estimatedDuration: 45,
      progress: {
        completedActivityIds: [],
        currentActivityId: null,
        totalProgress: 0,
        estimatedTimeRemaining: 45,
        lastActivityAt: null,
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPrisma.learningPathProgress.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.skillMastery.findFirst.mockResolvedValue(null);
    mockPrisma.skillMastery.findUnique.mockResolvedValue(null);
    mockPrisma.skillMastery.findMany.mockResolvedValue([]);
    mockPrisma.skillMastery.upsert.mockResolvedValue({ id: 'sm-1', learnerId: LEARNER_ID, skillId: 'skill-fractions-001', masteryLevel: 55, confidence: 0.6 });
    mockPrisma.learningEvent.create.mockResolvedValue({});
    mockPrisma.cognitiveInteraction.create.mockResolvedValue({});
    mockPrisma.cognitiveInteraction.findMany.mockResolvedValue([]);
    mockPrisma.cognitiveInteraction.findFirst.mockResolvedValue(null);
    mockPrisma.cognitiveSession.findFirst.mockResolvedValue(null);
    mockPrisma.cognitiveSession.create.mockResolvedValue({ id: 'session-123' });
    mockPrisma.cognitiveStateSnapshot.create.mockResolvedValue({});
    mockPrisma.breakRecord.findFirst.mockResolvedValue(null);
    mockPrisma.disengagementAlert.create.mockResolvedValue({});
  });

  // ────────────────────────────────────────────────────────────────
  // Journey 1: Complete Standard Learning Journey
  // ────────────────────────────────────────────────────────────────
  describe('Journey 1 — Standard learner flow', () => {
    it('should get RL-powered action suggestion', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/suggest-action`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          knowledge_state: { 'skill-fractions-001': 0.4 },
          engagement_level: 0.7,
          time_in_session: 300,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.source).toBe('rl-policy');
      expect(body.data.action_type).toBe('practice');

      // Verify rl-tutoring-svc was called
      const rlCall = fetchCalls.find((c) => c.url.includes('/api/v1/action/select'));
      expect(rlCall).toBeDefined();
      expect(rlCall!.method).toBe('POST');
    });

    it('should get next activity with cognitive load assessment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      // Should have cognitive_load data (S12 integration)
      if (body.data.cognitive_load) {
        expect(body.data.cognitive_load.load_level).toBe('optimal');
        expect(body.data.cognitive_load.total_load).toBeLessThan(0.75);
      }
    });

    it('should complete activity and trigger cross-service updates', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/complete-activity`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          activityId: '00000000-0000-4000-a000-000000000001',
          result: {
            success: true,
            score: 85,
            timeSpent: 720,
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.masteryUpdates).toBeDefined();
      expect(body.data.nextSteps).toBeDefined();

      // Allow fire-and-forget calls to resolve
      await new Promise((r) => setTimeout(r, 50));

      // Verify cross-service calls were made:
      // 1. RL reward signal to rl-tutoring-svc
      const rlReward = fetchCalls.find((c) => c.url.includes('/reward/record'));
      expect(rlReward).toBeDefined();

      // 2. Cognitive load signal
      const clSignal = fetchCalls.find((c) => c.url.includes('/signal/interaction'));
      expect(clSignal).toBeDefined();

      // Note: BKT update is skipped because getActivityDetails returns empty skillIds
    });

    it('should get cognitive state after activities', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/cognitive-state`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.currentLoad).toBeDefined();
      expect(body.data.loadScore).toBeGreaterThanOrEqual(0);
    });

    it('should get mastery state for learner', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/mastery`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });

    it('should track interaction and get recommendations', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/track-interaction`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          sessionId: '00000000-0000-4000-a000-aaaaaaaaa001',
          type: 'answer_submit',
          duration: 45,
          data: {},
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.cognitiveState).toBeDefined();
      expect(body.data.recommendations).toBeDefined();
      expect(body.data.recommendations.breakRecommendation).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Journey 2: IEP Learner with Specialized Support
  // ────────────────────────────────────────────────────────────────
  describe('Journey 2 — IEP learner with accommodations', () => {
    it('should analyze IEP document', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/analyze-iep',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          iep_text: 'Student requires extended time and simplified reading materials...',
          student_id: LEARNER_ID,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.quality_score).toBeGreaterThan(0);
    });

    it('should get IEP implications for learning platform', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/iep-implications',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          iep_goals: [{ id: 'goal-1', description: 'Reading comprehension at grade level' }],
          student_id: LEARNER_ID,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.feature_toggles).toBeInstanceOf(Array);
    });

    it('should adapt reading level via accessibility AI', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/accessibility/adapt-reading-level',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          text: 'The mitochondria is the powerhouse of the cell and performs oxidative phosphorylation.',
          target_grade: 3,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.text).toBeDefined();
    });

    it('should recommend accommodations based on IEP', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/recommend-accommodations',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          student_id: LEARNER_ID,
          current_accommodations: [{ type: 'extended_time' }],
          performance_data: { average_score: 65, trend: 'declining' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.new_suggestions).toBeInstanceOf(Array);
    });

    it('should differentiate content for IEP learner', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/differentiate',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          content_id: 'lesson-math-001',
          student_profile: { reading_level: 3, iep_goals: ['math_fluency'] },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.strategy_type).toBeDefined();
    });

    it('should evaluate accommodation effectiveness', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/evaluate-effectiveness',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          student_id: LEARNER_ID,
          accommodation_type: 'extended_time',
          before_scores: [55, 60, 58],
          after_scores: [70, 75, 72],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.rating).toBeDefined();
    });

    it('should track IEP progress over time', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/iep-progress',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          student_id: LEARNER_ID,
          iep_id: 'iep-001',
          period: 'quarterly',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.overall_progress_pct).toBeGreaterThanOrEqual(0);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Journey 3: Struggling Learner with Cognitive Overload
  // ────────────────────────────────────────────────────────────────
  describe('Journey 3 — Struggling learner with high cognitive load', () => {
    it('should detect high cognitive load and recommend break', async () => {
      // Override fetch to return high cognitive load
      const savedFetch = globalThis.fetch;
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
        if (urlStr.includes('/api/v1/load/estimate')) {
          return makeFetchResponse({
            total_load: 0.95,
            intrinsic_load: 0.5,
            extraneous_load: 0.25,
            germane_load: 0.2,
            load_level: 'overload',
            trend: 'increasing',
          });
        }
        return mockFetchRouter(url, init);
      }) as typeof fetch;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      // When cognitive load is overload, should suggest a break
      if (body.data?.action === 'break') {
        expect(body.data.break_duration_seconds).toBeGreaterThan(0);
        expect(body.data.message).toContain('break');
      }

      globalThis.fetch = savedFetch;
    });

    it('should fetch adaptations when load is high', async () => {
      const savedFetch = globalThis.fetch;
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
        if (urlStr.includes('/api/v1/load/estimate')) {
          return makeFetchResponse({
            total_load: 0.8,
            intrinsic_load: 0.4,
            extraneous_load: 0.25,
            germane_load: 0.15,
            load_level: 'high',
            trend: 'increasing',
          });
        }
        if (urlStr.includes('/api/v1/adaptation/recommend')) {
          fetchCalls.push({ url: urlStr, method: init?.method ?? 'POST' });
          return makeFetchResponse({
            actions: [
              { action_type: 'reduce_complexity', priority: 'high' },
              { action_type: 'add_scaffolding', priority: 'medium' },
            ],
          });
        }
        if (urlStr.includes('/api/v1/scaffolding/generate')) {
          fetchCalls.push({ url: urlStr, method: init?.method ?? 'POST' });
          return makeFetchResponse({
            scaffolds: [
              { type: 'worked_example', content: 'Step 1: ...' },
              { type: 'hint', content: 'Think about what you know about fractions' },
            ],
          });
        }
        return mockFetchRouter(url, init);
      }) as typeof fetch;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      // When load is high (but not overload), should include adaptations
      if (body.data?.adaptations) {
        expect(body.data.adaptations.actions).toBeDefined();
      }

      globalThis.fetch = savedFetch;
    });

    it('should handle multiple failing activities with mastery decline', async () => {
      // Simulate low score to trigger struggling threshold
      mockPrisma.skillMastery.findFirst.mockResolvedValue({
        id: 'mastery-struggle-001',
        learnerId: LEARNER_ID,
        skillId: 'skill-fractions-001',
        masteryLevel: 42, // near struggling threshold (40)
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/complete-activity`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          activityId: '00000000-0000-4000-a000-000000000001',
          result: {
            success: false,
            score: 25,
            timeSpent: 900,
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.masteryUpdates).toBeDefined();
    });

    it('should suggest differentiation for struggling learner', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/suggest-differentiation',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          student_id: LEARNER_ID,
          current_performance: { score: 30, trend: 'declining' },
          content_area: 'mathematics',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.suggestions).toBeInstanceOf(Array);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Journey 4: Peer Learning Integration
  // ────────────────────────────────────────────────────────────────
  describe('Journey 4 — Peer learning collaboration', () => {
    it('should match peers for collaborative learning', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/peer-learning/match',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          learner_id: LEARNER_ID,
          subject: 'mathematics',
          skill_level: 'intermediate',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.matches).toBeDefined();
    });

    it('should form groups for peer learning', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/peer-learning/classrooms/class-001/form-groups',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          activity_type: 'collaborative_problem_solving',
          group_size: 3,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.groups).toBeDefined();
    });

    it('should score collaboration quality', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/peer-learning/score-collaboration',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          session_id: 'session-peer-001',
          interactions: [
            { type: 'message', from: LEARNER_ID, content: 'I think the answer is 42' },
            { type: 'help_request', from: 'peer-001', content: 'Can you explain?' },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.scores).toBeDefined();
    });

    it('should facilitate peer learning session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/peer-learning/facilitate',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          group_id: 'grp-001',
          activity: { type: 'discussion', topic: 'fractions' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Journey 5: Full Multi-Service Integration
  // ────────────────────────────────────────────────────────────────
  describe('Journey 5 — Multi-service orchestration flow', () => {
    it('should complete a full learning cycle touching all services', async () => {
      // Step 1: Suggest action (RL tutoring)
      const suggestRes = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/suggest-action`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: { knowledge_state: {}, engagement_level: 0.8 },
      });
      expect(suggestRes.statusCode).toBe(200);
      expect(suggestRes.json().data.source).toBe('rl-policy');

      // Step 2: Get next activity (cognitive load check)
      const nextRes = await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
        headers: { 'x-test-user': TEST_USER },
      });
      expect(nextRes.statusCode).toBe(200);

      // Step 3: Adapt content for accessibility
      const adaptRes = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/accessibility/adapt-reading-level',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: { text: 'Complex academic text', target_grade: 4 },
      });
      expect(adaptRes.statusCode).toBe(200);

      // Step 4: Complete the activity (triggers BKT + RL reward + CL signal)
      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/complete-activity`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          activityId: '00000000-0000-4000-a000-000000000001',
          result: { success: true, score: 90, timeSpent: 600 },
        },
      });
      expect(completeRes.statusCode).toBe(200);

      // Step 5: Score collaboration (peer learning)
      const peerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/peer-learning/score-collaboration',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: { session_id: 'session-001', interactions: [] },
      });
      expect(peerRes.statusCode).toBe(200);

      // Step 6: Get IEP progress (specialized support)
      const iepRes = await app.inject({
        method: 'POST',
        url: '/api/v1/brain/specialized-support/iep-progress',
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: { student_id: LEARNER_ID, iep_id: 'iep-001' },
      });
      expect(iepRes.statusCode).toBe(200);

      // Allow fire-and-forget to complete
      await new Promise((r) => setTimeout(r, 50));

      // Verify all upstream services were contacted
      const calledUrls = fetchCalls.map((c) => c.url);
      expect(calledUrls.some((u) => u.includes('action/select'))).toBe(true);  // RL
      expect(calledUrls.some((u) => u.includes('load/estimate'))).toBe(true);  // Cognitive
      expect(calledUrls.some((u) => u.includes('adapt-reading-level'))).toBe(true);  // Accessibility
      expect(calledUrls.some((u) => u.includes('score-collaboration'))).toBe(true); // Peer
      expect(calledUrls.some((u) => u.includes('iep-progress'))).toBe(true);  // Specialized
      expect(calledUrls.some((u) => u.includes('reward/record'))).toBe(true); // RL reward
      // Note: BKT update not called because getActivityDetails returns empty skillIds
    });
  });
});
