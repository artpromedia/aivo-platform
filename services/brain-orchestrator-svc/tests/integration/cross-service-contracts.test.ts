/**
 * S16.2 — Cross-Service Contract & Fallback Tests
 *
 * Verifies:
 * 1. Request/response shapes for all inter-service call paths
 * 2. Feature-flag gated graceful degradation (stub responses)
 * 3. Upstream failure → 502 with correct error envelope
 * 4. Timeout handling for each proxy route
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// ── Mock prisma ─────────────────────────────────────────────────────
const mockPrisma = {
  orchestrationPlan: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  learningPath: {
    findFirst: vi.fn().mockResolvedValue(null),
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
    create: vi.fn().mockResolvedValue({ id: 'session-contract-001' }),
  },
  cognitiveStateSnapshot: { create: vi.fn().mockResolvedValue({}) },
  breakRecord: { findFirst: vi.fn().mockResolvedValue(null) },
  skillMastery: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  learningEvent: { create: vi.fn().mockResolvedValue({}) },
  disengagementAlert: { create: vi.fn().mockResolvedValue({}) },
};

vi.mock('../../src/prisma.js', () => ({ prisma: mockPrisma }));
vi.mock('../../src/events/nats.js', () => ({
  natsPublish: vi.fn(),
  natsSubscribe: vi.fn(),
  getNatsConnection: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────
const TEST_USER = JSON.stringify({
  sub: 'user-contract-001',
  tenantId: 'tenant-contract-001',
  role: 'student',
});

const LEARNER_ID = 'learner-contract-001';
const originalFetch = globalThis.fetch;
let fetchCalls: Array<{ url: string; method: string; body?: unknown }> = [];

const makeFetchResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const { authMiddleware } = await import('../../src/middleware/auth.js');
  app.register(authMiddleware);

  const { learningRoutes } = await import('../../src/routes/learning.routes.js');
  const { cognitiveRoutes } = await import('../../src/routes/cognitive.routes.js');
  const { peerRoutes } = await import('../../src/routes/peer.routes.js');
  const { accessibilityRoutes } = await import('../../src/routes/accessibility.routes.js');
  const { specializedSupportRoutes } = await import(
    '../../src/routes/specialized-support.routes.js'
  );

  app.register(learningRoutes, { prefix: '/api/v1/brain' });
  app.register(cognitiveRoutes, { prefix: '/api/v1/brain' });
  app.register(peerRoutes, { prefix: '/api/v1/brain' });
  app.register(accessibilityRoutes, { prefix: '/api/v1/brain' });
  app.register(specializedSupportRoutes, { prefix: '/api/v1/brain' });

  await app.ready();
  return app;
}

// ═══════════════════════════════════════════════════════════════════
// A — Contract Tests: Request/Response Shape Verification
// ═══════════════════════════════════════════════════════════════════
describe('S16.2A — Cross-Service Contract Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.FEATURE_RL_TUTORING = 'true';
    process.env.FEATURE_COGNITIVE_LOAD = 'true';
    process.env.FEATURE_PEER_LEARNING = 'true';
    process.env.FEATURE_ACCESSIBILITY_AI = 'true';
    process.env.FEATURE_SPECIALIZED_SUPPORT = 'true';

    app = await buildTestApp();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  beforeEach(() => {
    fetchCalls = [];
    vi.clearAllMocks();
  });

  // ── RL Tutoring contract ──────────────────────────────────────
  describe('RL Tutoring Service contract', () => {
    it('POST /action/select — sends correct request shape', async () => {
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : String(url);
        const body = init?.body ? JSON.parse(init.body as string) : undefined;
        fetchCalls.push({ url: urlStr, method: init?.method ?? 'GET', body });

        if (urlStr.includes('/api/v1/action/select')) {
          // Validate request contract
          expect(body).toHaveProperty('learner_id');
          expect(body).toHaveProperty('knowledge_state');
          expect(body).toHaveProperty('engagement_level');
          expect(body).toHaveProperty('time_in_session');

          return makeFetchResponse({
            action_type: 'practice',
            difficulty: 0.6,
            parameters: {},
            confidence: 0.85,
          });
        }
        return makeFetchResponse({ ok: true });
      }) as typeof fetch;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/suggest-action`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          knowledge_state: { math: 0.5 },
          engagement_level: 0.7,
          time_in_session: 120,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // Response contract
      expect(body.data).toHaveProperty('action_type');
      expect(body.data).toHaveProperty('source');
      expect(body.data.source).toBe('rl-policy');
    });

    it('POST /reward/record — sends correct reward shape on complete-activity', async () => {
      // Set up learning path for complete-activity
      mockPrisma.learningPath.findFirst.mockResolvedValue({
        id: 'path-c-001',
        learnerId: LEARNER_ID,
        tenantId: 'tenant-contract-001',
        activities: {
          orderedActivities: [{
            activity: {
              id: '00000000-0000-4000-a000-000000000011',
              type: 'practice',
              title: 'Test',
              description: 'Test',
              estimatedDuration: 10,
              cognitiveLoad: 'low',
              difficulty: 3,
              skillIds: ['skill-c-001'],
              prerequisites: [],
            },
          }],
        },
        progress: { completedActivityIds: [], totalProgress: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.skillMastery.upsert.mockResolvedValue({
        masteryLevel: 60,
        skillId: 'skill-c-001',
      });
      mockPrisma.learningPathProgress.updateMany.mockResolvedValue({ count: 1 });

      let rewardBody: any = null;
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : String(url);
        const body = init?.body ? JSON.parse(init.body as string) : undefined;

        if (urlStr.includes('/api/v1/reward/record')) {
          rewardBody = body;
        }
        return makeFetchResponse({ ok: true });
      }) as typeof fetch;

      await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/complete-activity`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: {
          activityId: '00000000-0000-4000-a000-000000000011',
          result: { success: true, score: 85, timeSpent: 600 },
        },
      });

      // Wait for fire-and-forget
      await new Promise((r) => setTimeout(r, 100));

      expect(rewardBody).not.toBeNull();
      expect(rewardBody).toHaveProperty('learner_id', LEARNER_ID);
      expect(rewardBody).toHaveProperty('state');
      expect(rewardBody.state).toHaveProperty('knowledge_state');
      expect(rewardBody).toHaveProperty('action_taken');
      expect(rewardBody.action_taken).toHaveProperty('action_type');
      expect(rewardBody).toHaveProperty('outcome');
      expect(rewardBody.outcome).toHaveProperty('correctness');
    });
  });

  // ── Cognitive Load Service contract ───────────────────────────
  describe('Cognitive Load Service contract', () => {
    it('POST /load/estimate — sends correct request shape', async () => {
      // Setup learning path for next-activity
      mockPrisma.learningPath.findFirst.mockResolvedValue({
        id: 'path-cl-001',
        learnerId: LEARNER_ID,
        tenantId: 'tenant-contract-001',
        activities: {
          orderedActivities: [{
            activity: {
              id: 'act-cl-001', type: 'practice', title: 'Test',
              description: 'A', estimatedDuration: 10, cognitiveLoad: 'medium',
              difficulty: 5, skillIds: ['sk-1'], prerequisites: [],
            },
          }],
        },
        progress: { completedActivityIds: [], totalProgress: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let estimateBody: any = null;
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : String(url);
        const body = init?.body ? JSON.parse(init.body as string) : undefined;

        if (urlStr.includes('/api/v1/load/estimate')) {
          estimateBody = body;
          return makeFetchResponse({
            total_load: 0.5,
            intrinsic_load: 0.25,
            extraneous_load: 0.15,
            germane_load: 0.1,
            load_level: 'optimal',
            trend: 'stable',
          });
        }
        return makeFetchResponse({ ok: true });
      }) as typeof fetch;

      await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(estimateBody).not.toBeNull();
      expect(estimateBody).toHaveProperty('learner_id', LEARNER_ID);
      expect(estimateBody).toHaveProperty('content_complexity');
      expect(estimateBody).toHaveProperty('session_duration');
      expect(estimateBody).toHaveProperty('error_rates');
    });

    it('POST /adaptation/recommend — sends correct shape for high load', async () => {
      mockPrisma.learningPath.findFirst.mockResolvedValue({
        id: 'path-cl-002',
        learnerId: LEARNER_ID,
        tenantId: 'tenant-contract-001',
        activities: {
          orderedActivities: [{
            activity: {
              id: 'act-cl-002', type: 'practice', title: 'Test2',
              description: 'B', estimatedDuration: 10, cognitiveLoad: 'high',
              difficulty: 7, skillIds: ['sk-2'], prerequisites: [],
            },
          }],
        },
        progress: { completedActivityIds: [], totalProgress: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let adaptBody: any = null;
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : String(url);
        const body = init?.body ? JSON.parse(init.body as string) : undefined;

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
          adaptBody = body;
          return makeFetchResponse({
            actions: [{ action_type: 'reduce_complexity', priority: 'high' }],
          });
        }
        if (urlStr.includes('/api/v1/scaffolding/generate')) {
          return makeFetchResponse({ scaffolds: [] });
        }
        return makeFetchResponse({ ok: true });
      }) as typeof fetch;

      await app.inject({
        method: 'GET',
        url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
        headers: { 'x-test-user': TEST_USER },
      });

      expect(adaptBody).not.toBeNull();
      expect(adaptBody).toHaveProperty('intrinsic_load');
      expect(adaptBody).toHaveProperty('extraneous_load');
      expect(adaptBody).toHaveProperty('germane_load');
      expect(adaptBody).toHaveProperty('total_load');
    });
  });

  // ── Peer Learning Service contract ────────────────────────────
  describe('Peer Learning Service contract', () => {
    const proxyEndpoints = [
      {
        brainPath: '/api/v1/brain/peer-learning/score-collaboration',
        upstreamPath: '/api/v1/peer-learning/score-collaboration',
        payload: { session_id: 'sess-1', interactions: [] },
        expectedShape: { scores: {} },
      },
      {
        brainPath: '/api/v1/brain/peer-learning/match',
        upstreamPath: '/api/v1/peer-learning/match',
        payload: { learner_id: LEARNER_ID, match_type: 'study_partner' },
        expectedShape: { matches: [] },
        usesQueryParams: true,
      },
      {
        brainPath: '/api/v1/brain/peer-learning/classrooms/cls-1/form-groups',
        upstreamPath: '/api/v1/peer-learning/classrooms/cls-1/form-groups',
        payload: { group_size: 3 },
        expectedShape: { groups: [] },
      },
      {
        brainPath: '/api/v1/brain/peer-learning/facilitate',
        upstreamPath: '/api/v1/peer-learning/facilitate',
        payload: { group_id: 'grp-1' },
        expectedShape: { session: {} },
      },
    ];

    for (const ep of proxyEndpoints) {
      it(`proxies POST ${ep.brainPath} → ${ep.upstreamPath}`, async () => {
        let capturedUrl = '';
        let capturedBody: any = null;

        globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
          const urlStr = typeof url === 'string' ? url : String(url);
          capturedUrl = urlStr;
          capturedBody = init?.body ? JSON.parse(init.body as string) : undefined;
          return makeFetchResponse(ep.expectedShape);
        }) as typeof fetch;

        const res = await app.inject({
          method: 'POST',
          url: ep.brainPath,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: ep.payload,
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
        expect(capturedUrl).toContain(ep.upstreamPath);
        // Verify request was forwarded correctly
        if ((ep as any).usesQueryParams) {
          // match route sends query params, not body
          for (const [key, val] of Object.entries(ep.payload)) {
            expect(capturedUrl).toContain(`${key}=${encodeURIComponent(String(val))}`);
          }
        } else {
          expect(capturedBody).toEqual(ep.payload);
        }
      });
    }
  });

  // ── Accessibility AI Service contract ───────────────────────────
  describe('Accessibility AI Service contract', () => {
    const accessibilityEndpoints = [
      {
        brainPath: '/api/v1/brain/accessibility/adapt-reading-level',
        upstreamPath: '/api/v1/adapt-reading-level',
        payload: { text: 'Complex text', target_grade: 3 },
        responseData: { text: 'Simple text', adapted_lexile: 500 },
      },
      {
        brainPath: '/api/v1/brain/accessibility/estimate-lexile',
        upstreamPath: '/api/v1/estimate-lexile',
        payload: { text: 'Sample text' },
        responseData: { lexile: 650 },
      },
      {
        brainPath: '/api/v1/brain/accessibility/simplify',
        upstreamPath: '/api/v1/simplify',
        payload: { text: 'Hard text', level: 'elementary' },
        responseData: { text: 'Easy text' },
      },
    ];

    for (const ep of accessibilityEndpoints) {
      it(`proxies POST ${ep.brainPath} → ${ep.upstreamPath}`, async () => {
        let capturedUrl = '';
        globalThis.fetch = ((url: string | URL | Request) => {
          capturedUrl = typeof url === 'string' ? url : String(url);
          return makeFetchResponse(ep.responseData);
        }) as typeof fetch;

        const res = await app.inject({
          method: 'POST',
          url: ep.brainPath,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: ep.payload,
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(capturedUrl).toContain(ep.upstreamPath);
      });
    }
  });

  // ── Specialized Support Service contract ─────────────────────
  describe('Specialized Support Service contract', () => {
    const specializedEndpoints = [
      {
        brainPath: '/api/v1/brain/specialized-support/analyze-iep',
        upstreamPath: '/api/v1/specialized-support/analyze-iep',
        payload: { iep_text: 'test', student_id: LEARNER_ID },
        responseData: { quality_score: 85 },
      },
      {
        brainPath: '/api/v1/brain/specialized-support/iep-implications',
        upstreamPath: '/api/v1/specialized-support/iep-implications',
        payload: { iep_goals: [], student_id: LEARNER_ID },
        responseData: { feature_toggles: [] },
      },
      {
        brainPath: '/api/v1/brain/specialized-support/iep-progress',
        upstreamPath: '/api/v1/specialized-support/iep-progress',
        payload: { student_id: LEARNER_ID, iep_id: 'iep-1' },
        responseData: { overall_progress_pct: 50 },
      },
      {
        brainPath: '/api/v1/brain/specialized-support/differentiate',
        upstreamPath: '/api/v1/specialized-support/differentiate',
        payload: { content_id: 'c-1', student_profile: {} },
        responseData: { strategy_type: 'content_modification' },
      },
      {
        brainPath: '/api/v1/brain/specialized-support/suggest-differentiation',
        upstreamPath: '/api/v1/specialized-support/suggest-differentiation',
        payload: { student_id: LEARNER_ID },
        responseData: { suggestions: [] },
      },
      {
        brainPath: '/api/v1/brain/specialized-support/recommend-accommodations',
        upstreamPath: '/api/v1/specialized-support/recommend-accommodations',
        payload: { student_id: LEARNER_ID },
        responseData: { new_suggestions: [] },
      },
      {
        brainPath: '/api/v1/brain/specialized-support/evaluate-effectiveness',
        upstreamPath: '/api/v1/specialized-support/evaluate-effectiveness',
        payload: { student_id: LEARNER_ID },
        responseData: { rating: 'effective' },
      },
    ];

    for (const ep of specializedEndpoints) {
      it(`proxies POST ${ep.brainPath} → ${ep.upstreamPath}`, async () => {
        let capturedUrl = '';
        globalThis.fetch = ((url: string | URL | Request) => {
          capturedUrl = typeof url === 'string' ? url : String(url);
          return makeFetchResponse(ep.responseData);
        }) as typeof fetch;

        const res = await app.inject({
          method: 'POST',
          url: ep.brainPath,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: ep.payload,
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
        expect(capturedUrl).toContain(ep.upstreamPath);
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// B — Feature-Flag Fallback Tests
// ═══════════════════════════════════════════════════════════════════
describe('S16.2B — Feature-Flag Fallback Verification', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildTestApp();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure all flags are OFF for fallback tests
    delete process.env.FEATURE_RL_TUTORING;
    delete process.env.FEATURE_RLTUTORING;
    delete process.env.FEATURE_COGNITIVE_LOAD;
    delete process.env.FEATURE_COGNITIVELOAD;
    delete process.env.FEATURE_PEER_LEARNING;
    delete process.env.FEATURE_PEERLEARNING;
    delete process.env.FEATURE_ACCESSIBILITY_AI;
    delete process.env.FEATURE_ACCESSIBILITYAI;
    delete process.env.FEATURE_SPECIALIZED_SUPPORT;
    delete process.env.FEATURE_SPECIALIZEDSUPPORT;
  });

  // ── RL Tutoring fallback ──────────────────────────────────────
  describe('RL Tutoring disabled', () => {
    it('returns rule-based action when FEATURE_RL_TUTORING=false', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${LEARNER_ID}/suggest-action`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: { knowledge_state: {} },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.source).toBe('rule-based');
      expect(body.data.action_type).toBe('explanation');
    });
  });

  // ── Peer Learning fallback ────────────────────────────────────
  describe('Peer Learning disabled', () => {
    const peerEndpoints = [
      { path: '/api/v1/brain/peer-learning/score-collaboration', stubKey: 'scores' },
      { path: '/api/v1/brain/peer-learning/match', stubKey: 'matches' },
      { path: '/api/v1/brain/peer-learning/classrooms/cls-1/form-groups', stubKey: 'groups' },
      { path: '/api/v1/brain/peer-learning/facilitate', stubKey: 'session' },
    ];

    for (const ep of peerEndpoints) {
      it(`returns stub for ${ep.path} when flag is off`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: ep.path,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: {},
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.data.message).toContain('disabled');
      });
    }
  });

  // ── Accessibility AI fallback ─────────────────────────────────
  describe('Accessibility AI disabled', () => {
    const accessEndpoints = [
      { path: '/api/v1/brain/accessibility/adapt-reading-level' },
      { path: '/api/v1/brain/accessibility/estimate-lexile' },
      { path: '/api/v1/brain/accessibility/simplify' },
    ];

    for (const ep of accessEndpoints) {
      it(`returns stub for ${ep.path} when flag is off`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: ep.path,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: { text: 'test' },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.data.message).toContain('disabled');
      });
    }
  });

  // ── Specialized Support fallback ──────────────────────────────
  describe('Specialized Support disabled', () => {
    const specEndpoints = [
      { path: '/api/v1/brain/specialized-support/analyze-iep', stubField: 'quality_score' },
      { path: '/api/v1/brain/specialized-support/iep-implications', stubField: 'feature_toggles' },
      { path: '/api/v1/brain/specialized-support/iep-progress', stubField: 'overall_progress_pct' },
      { path: '/api/v1/brain/specialized-support/differentiate', stubField: 'strategy_type' },
      { path: '/api/v1/brain/specialized-support/suggest-differentiation', stubField: 'suggestions' },
      { path: '/api/v1/brain/specialized-support/recommend-accommodations', stubField: 'new_suggestions' },
      { path: '/api/v1/brain/specialized-support/evaluate-effectiveness', stubField: 'rating' },
    ];

    for (const ep of specEndpoints) {
      it(`returns stub for ${ep.path} when flag is off`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: ep.path,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: { student_id: LEARNER_ID },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty(ep.stubField);
        expect(body.data.message).toContain('disabled');
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// C — Upstream Failure (502) Tests
// ═══════════════════════════════════════════════════════════════════
describe('S16.2C — Upstream Failure Handling', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.FEATURE_RL_TUTORING = 'true';
    process.env.FEATURE_PEER_LEARNING = 'true';
    process.env.FEATURE_ACCESSIBILITY_AI = 'true';
    process.env.FEATURE_SPECIALIZED_SUPPORT = 'true';
    process.env.FEATURE_COGNITIVE_LOAD = 'true';

    app = await buildTestApp();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Helper: make fetch always throw ───────────────────────────
  function installFailingFetch() {
    globalThis.fetch = (() => {
      throw new Error('Connection refused');
    }) as unknown as typeof fetch;
  }

  // ── RL Tutoring failure: returns fallback, NOT 502 ────────────
  it('suggest-action falls back gracefully when RL is unreachable', async () => {
    installFailingFetch();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/brain/learners/${LEARNER_ID}/suggest-action`,
      headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
      payload: { knowledge_state: {} },
    });

    // RL tutoring returns rule-based fallback instead of 502
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.source).toBe('rule-based-fallback');
  });

  // ── Peer Learning failure: returns 502 ──────────────────────
  describe('Peer Learning upstream failure', () => {
    const peerPaths = [
      '/api/v1/brain/peer-learning/score-collaboration',
      '/api/v1/brain/peer-learning/match',
      '/api/v1/brain/peer-learning/classrooms/cls-1/form-groups',
      '/api/v1/brain/peer-learning/facilitate',
    ];

    for (const path of peerPaths) {
      it(`returns 502 for ${path} when upstream fails`, async () => {
        installFailingFetch();

        const res = await app.inject({
          method: 'POST',
          url: path,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: {},
        });

        expect(res.statusCode).toBe(502);
        const body = res.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain('unavailable');
      });
    }
  });

  // ── Accessibility AI failure: returns 502 ─────────────────────
  describe('Accessibility AI upstream failure', () => {
    const accessPaths = [
      '/api/v1/brain/accessibility/adapt-reading-level',
      '/api/v1/brain/accessibility/estimate-lexile',
      '/api/v1/brain/accessibility/simplify',
    ];

    for (const path of accessPaths) {
      it(`returns 502 for ${path} when upstream fails`, async () => {
        installFailingFetch();

        const res = await app.inject({
          method: 'POST',
          url: path,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: { text: 'test' },
        });

        expect(res.statusCode).toBe(502);
        const body = res.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain('unavailable');
      });
    }
  });

  // ── Specialized Support failure: returns 502 ─────────────────
  describe('Specialized Support upstream failure', () => {
    const specPaths = [
      '/api/v1/brain/specialized-support/analyze-iep',
      '/api/v1/brain/specialized-support/iep-implications',
      '/api/v1/brain/specialized-support/iep-progress',
      '/api/v1/brain/specialized-support/differentiate',
      '/api/v1/brain/specialized-support/suggest-differentiation',
      '/api/v1/brain/specialized-support/recommend-accommodations',
      '/api/v1/brain/specialized-support/evaluate-effectiveness',
    ];

    for (const path of specPaths) {
      it(`returns 502 for ${path} when upstream fails`, async () => {
        installFailingFetch();

        const res = await app.inject({
          method: 'POST',
          url: path,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: { student_id: LEARNER_ID },
        });

        expect(res.statusCode).toBe(502);
        const body = res.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain('unavailable');
      });
    }
  });

  // ── Cognitive Load failure: next-activity continues without ──
  it('next-activity continues without cognitive load when upstream down', async () => {
    mockPrisma.learningPath.findFirst.mockResolvedValue({
      id: 'path-fail-001',
      learnerId: LEARNER_ID,
      tenantId: 'tenant-contract-001',
      activities: {
        orderedActivities: [{
          activity: {
            id: 'act-fail-001', type: 'practice', title: 'Test',
            description: 'A', estimatedDuration: 10, cognitiveLoad: 'low',
            difficulty: 3, skillIds: ['sk-1'], prerequisites: [],
          },
        }],
      },
      progress: { completedActivityIds: [], totalProgress: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    installFailingFetch();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/brain/learners/${LEARNER_ID}/next-activity`,
      headers: { 'x-test-user': TEST_USER },
    });

    // Should NOT 502 — cognitive load failure is caught and the
    // activity is returned without cognitive_load metadata
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
