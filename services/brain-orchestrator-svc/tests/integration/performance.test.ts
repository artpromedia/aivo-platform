/**
 * S16.3 — Performance & Load Integration Tests
 *
 * Verifies:
 * 1. Concurrent learner handling (200 simultaneous requests)
 * 2. Response latency within SLA (p50/p95/p99)
 * 3. Memory stability under sustained load
 * 4. Correct behaviour when services respond slowly
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
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  learningPathProgress: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
    create: vi.fn().mockResolvedValue({ id: 'session-perf-001' }),
  },
  cognitiveStateSnapshot: { create: vi.fn().mockResolvedValue({}) },
  breakRecord: { findFirst: vi.fn().mockResolvedValue(null) },
  skillMastery: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn().mockResolvedValue({ id: 'sm-p', masteryLevel: 55, skillId: 'sk-p' }),
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

// ── Fetch helpers ──────────────────────────────────────────────────
const makeFetchResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

const originalFetch = globalThis.fetch;

function installFastFetch() {
  globalThis.fetch = ((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

    if (urlStr.includes('/api/v1/action/select')) {
      return makeFetchResponse({
        action_type: 'practice', difficulty: 0.5,
        parameters: {}, confidence: 0.8,
      });
    }
    if (urlStr.includes('/api/v1/reward/record')) return makeFetchResponse({ ok: true });
    if (urlStr.includes('/api/v1/load/estimate')) {
      return makeFetchResponse({
        total_load: 0.4, load_level: 'optimal', trend: 'stable',
        intrinsic_load: 0.2, extraneous_load: 0.1, germane_load: 0.1,
      });
    }
    if (urlStr.includes('/api/v1/signal/interaction')) return makeFetchResponse({ ok: true });
    if (urlStr.includes('/training/bkt/update')) return makeFetchResponse({ ok: true });
    if (urlStr.includes('/learner-model/')) return makeFetchResponse({ ok: true });
    if (urlStr.includes('/peer-learning/')) return makeFetchResponse({ scores: {} });
    if (urlStr.includes('/specialized-support/')) return makeFetchResponse({ quality_score: 80 });
    if (urlStr.includes('/adapt-reading-level')) return makeFetchResponse({ text: 'x' });
    return makeFetchResponse({ ok: true });
  }) as typeof fetch;
}

const TEST_USER = JSON.stringify({
  sub: 'user-perf-001',
  tenantId: 'tenant-perf-001',
  role: 'student',
});

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

// ── Latency helpers ────────────────────────────────────────────────
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

// ═══════════════════════════════════════════════════════════════════
describe('S16.3 — Performance & Load Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.FEATURE_RL_TUTORING = 'true';
    process.env.FEATURE_COGNITIVE_LOAD = 'true';
    process.env.FEATURE_PEER_LEARNING = 'true';
    process.env.FEATURE_ACCESSIBILITY_AI = 'true';
    process.env.FEATURE_SPECIALIZED_SUPPORT = 'true';

    installFastFetch();
    app = await buildTestApp();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    installFastFetch();

    mockPrisma.learningPath.findFirst.mockResolvedValue({
      id: 'path-perf-001',
      learnerId: 'any',
      tenantId: 'tenant-perf-001',
      activities: {
        orderedActivities: [{
          activity: {
            id: '00000000-0000-4000-a000-000000000021', type: 'practice', title: 'Perf Test',
            description: 'perf', estimatedDuration: 10, cognitiveLoad: 'low',
            difficulty: 3, skillIds: ['sk-perf'], prerequisites: [],
          },
        }],
      },
      progress: { completedActivityIds: [], totalProgress: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Re-initialize key mock resolved values after clearAllMocks
    mockPrisma.learningPathProgress.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.skillMastery.findMany.mockResolvedValue([]);
    mockPrisma.skillMastery.findUnique.mockResolvedValue(null);
    mockPrisma.skillMastery.upsert.mockResolvedValue({ id: 'sm-p', masteryLevel: 55, skillId: 'sk-p' });
    mockPrisma.cognitiveInteraction.create.mockResolvedValue({});
    mockPrisma.cognitiveInteraction.findMany.mockResolvedValue([]);
    mockPrisma.cognitiveInteraction.findFirst.mockResolvedValue(null);
    mockPrisma.cognitiveSession.findFirst.mockResolvedValue(null);
    mockPrisma.cognitiveSession.create.mockResolvedValue({ id: 'session-perf-001' });
    mockPrisma.cognitiveStateSnapshot.create.mockResolvedValue({});
    mockPrisma.breakRecord.findFirst.mockResolvedValue(null);
    mockPrisma.learningEvent.create.mockResolvedValue({});
    mockPrisma.disengagementAlert.create.mockResolvedValue({});
  });

  // ────────────────────────────────────────────────────────────────
  // 1. Concurrent learner simulation
  // ────────────────────────────────────────────────────────────────
  describe('Concurrent request handling', () => {
    it('should handle 200 concurrent suggest-action requests', async () => {
      const CONCURRENT = 200;
      const start = performance.now();

      const requests = Array.from({ length: CONCURRENT }, (_, i) =>
        app.inject({
          method: 'POST',
          url: `/api/v1/brain/learners/learner-${i}/suggest-action`,
          headers: {
            'x-test-user': JSON.stringify({
              sub: `user-${i}`,
              tenantId: 'tenant-perf-001',
              role: 'student',
            }),
            'content-type': 'application/json',
          },
          payload: {
            knowledge_state: { math: Math.random() },
            engagement_level: Math.random(),
            time_in_session: Math.floor(Math.random() * 1800),
          },
        })
      );

      const responses = await Promise.all(requests);
      const elapsed = performance.now() - start;

      // All should succeed
      const successes = responses.filter((r) => r.statusCode === 200);
      expect(successes.length).toBe(CONCURRENT);

      // All should return valid response shape
      for (const res of responses) {
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      }

      // Total time should be reasonable (< 10s for 200 requests with mocks)
      expect(elapsed).toBeLessThan(10_000);
    });

    it('should handle 100 concurrent next-activity requests', async () => {
      const CONCURRENT = 100;
      const start = performance.now();

      const requests = Array.from({ length: CONCURRENT }, (_, i) =>
        app.inject({
          method: 'GET',
          url: `/api/v1/brain/learners/learner-${i}/next-activity`,
          headers: {
            'x-test-user': JSON.stringify({
              sub: `user-${i}`,
              tenantId: 'tenant-perf-001',
              role: 'student',
            }),
          },
        })
      );

      const responses = await Promise.all(requests);
      const elapsed = performance.now() - start;

      const successes = responses.filter((r) => r.statusCode === 200);
      expect(successes.length).toBe(CONCURRENT);
      expect(elapsed).toBeLessThan(10_000);
    });

    it('should handle 50 concurrent complete-activity requests', async () => {
      const CONCURRENT = 50;

      const requests = Array.from({ length: CONCURRENT }, (_, i) =>
        app.inject({
          method: 'POST',
          url: `/api/v1/brain/learners/learner-${i}/complete-activity`,
          headers: {
            'x-test-user': JSON.stringify({
              sub: `user-${i}`,
              tenantId: 'tenant-perf-001',
              role: 'student',
            }),
            'content-type': 'application/json',
          },
          payload: {
            activityId: '00000000-0000-4000-a000-000000000021',
            result: {
              success: Math.random() > 0.3,
              score: Math.floor(50 + Math.random() * 50),
              timeSpent: Math.floor(300 + Math.random() * 600),
            },
          },
        })
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.statusCode === 200);
      expect(successes.length).toBe(CONCURRENT);

      // Wait for fire-and-forget to settle
      await new Promise((r) => setTimeout(r, 100));
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 2. Response latency verification
  // ────────────────────────────────────────────────────────────────
  describe('Response latency SLA', () => {
    it('suggest-action p95 < 200ms with mocked upstream', async () => {
      const ITERATIONS = 50;
      const latencies: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await app.inject({
          method: 'POST',
          url: `/api/v1/brain/learners/learner-lat-${i}/suggest-action`,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: { knowledge_state: {}, engagement_level: 0.7 },
        });
        latencies.push(performance.now() - start);
      }

      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const p99 = percentile(latencies, 99);

      // With mocked fetch, latencies should be very low
      expect(p50).toBeLessThan(100);
      expect(p95).toBeLessThan(200);
      expect(p99).toBeLessThan(500);
    });

    it('cognitive state retrieval p95 < 100ms', async () => {
      const ITERATIONS = 50;
      const latencies: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await app.inject({
          method: 'GET',
          url: `/api/v1/brain/learners/learner-lat-${i}/cognitive-state`,
          headers: { 'x-test-user': TEST_USER },
        });
        latencies.push(performance.now() - start);
      }

      expect(percentile(latencies, 95)).toBeLessThan(100);
    });

    it('track-interaction p95 < 100ms', async () => {
      const ITERATIONS = 50;
      const latencies: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await app.inject({
          method: 'POST',
          url: `/api/v1/brain/learners/learner-lat-${i}/track-interaction`,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: {
            sessionId: '00000000-0000-4000-a000-aaaaaaaaa002',
            type: 'click',
            duration: 5,
            data: {},
          },
        });
        latencies.push(performance.now() - start);
      }

      expect(percentile(latencies, 95)).toBeLessThan(100);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 3. Memory stability under load
  // ────────────────────────────────────────────────────────────────
  describe('Memory stability', () => {
    it('should not leak memory during sustained request load', async () => {
      // Force GC if available
      if (globalThis.gc) globalThis.gc();

      const baselineMemory = process.memoryUsage().heapUsed;
      const REQUESTS = 500;

      for (let i = 0; i < REQUESTS; i++) {
        await app.inject({
          method: 'POST',
          url: `/api/v1/brain/learners/learner-mem-${i % 50}/suggest-action`,
          headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
          payload: { knowledge_state: {} },
        });
      }

      if (globalThis.gc) globalThis.gc();
      await new Promise((r) => setTimeout(r, 100));

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryGrowthMB = (afterMemory - baselineMemory) / (1024 * 1024);

      // Memory growth should be bounded (<100MB for 500 requests)
      expect(memoryGrowthMB).toBeLessThan(100);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 4. Slow upstream handling
  // ────────────────────────────────────────────────────────────────
  describe('Slow upstream resilience', () => {
    it('should handle slow RL tutoring service gracefully', async () => {
      // Install a slow fetch that delays 2 seconds for RL
      globalThis.fetch = ((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

        if (urlStr.includes('/api/v1/action/select')) {
          return new Promise<Response>((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () =>
                    Promise.resolve({
                      action_type: 'practice',
                      difficulty: 0.5,
                      parameters: {},
                    }),
                  text: () => Promise.resolve('{}'),
                } as Response),
              2000
            )
          );
        }
        return makeFetchResponse({ ok: true });
      }) as typeof fetch;

      const start = performance.now();
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/brain/learners/${encodeURIComponent('learner-slow')}/suggest-action`,
        headers: { 'x-test-user': TEST_USER, 'content-type': 'application/json' },
        payload: { knowledge_state: {} },
      });
      const elapsed = performance.now() - start;

      // Should still succeed (within 3s timeout)
      expect(res.statusCode).toBe(200);
      expect(elapsed).toBeLessThan(4000);
    });

    it('should handle mixed-speed concurrent proxy requests', async () => {
      // Some fast, some slow
      let callCount = 0;
      globalThis.fetch = ((url: string | URL | Request) => {
        callCount++;
        const delay = callCount % 3 === 0 ? 500 : 10;

        return new Promise<Response>((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ scores: {}, message: 'ok' }),
                text: () => Promise.resolve('{}'),
              } as Response),
            delay
          )
        );
      }) as typeof fetch;

      const requests = Array.from({ length: 20 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/brain/peer-learning/score-collaboration',
          headers: {
            'x-test-user': JSON.stringify({
              sub: `user-${i}`,
              tenantId: 'tenant-perf-001',
              role: 'student',
            }),
            'content-type': 'application/json',
          },
          payload: { session_id: `sess-${i}`, interactions: [] },
        })
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.statusCode === 200);
      expect(successes.length).toBe(20);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 5. Throughput measurement
  // ────────────────────────────────────────────────────────────────
  describe('Throughput', () => {
    it('should achieve >100 requests/sec for proxy endpoints', async () => {
      const REQUESTS = 200;
      const start = performance.now();

      const requests = Array.from({ length: REQUESTS }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/brain/peer-learning/score-collaboration',
          headers: {
            'x-test-user': JSON.stringify({
              sub: `user-tp-${i}`,
              tenantId: 'tenant-perf-001',
              role: 'student',
            }),
            'content-type': 'application/json',
          },
          payload: { session_id: `s-${i}`, interactions: [] },
        })
      );

      await Promise.all(requests);
      const elapsed = performance.now() - start;
      const rps = (REQUESTS / elapsed) * 1000;

      expect(rps).toBeGreaterThan(100);
    });
  });
});
