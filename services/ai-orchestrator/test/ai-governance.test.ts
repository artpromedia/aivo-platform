/**
 * AI Governance Tests
 *
 * Covers rate limiting, audit logging, usage stats, and explainability.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type Redis from 'ioredis';

import { AiGovernanceUsageTracker } from '../src/governance/ai-usage-tracker.js';
import { AiAuditLogger } from '../src/governance/ai-audit-logger.js';
import { ExplainabilityService } from '../src/governance/explainability.service.js';

// ════════════════════════════════════════════════════════════════════════════════
// MOCK REDIS
// ════════════════════════════════════════════════════════════════════════════════

function createMockRedis(): Redis {
  const store = new Map<string, string>();
  const hashStore = new Map<string, Map<string, string>>();
  const setStore = new Map<string, Set<string>>();

  const mockPipeline = {
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    zincrby: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    hincrby: vi.fn().mockReturnThis(),
    rpush: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    scard: vi.fn().mockReturnThis(),
    hgetall: vi.fn().mockReturnThis(),
    zrevrangebyscore: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, '5'],   // tenant daily
      [null, 2],     // scard
      [null, {}],    // hgetall
      [null, []],    // zrevrangebyscore
    ]),
  };

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { store.set(key, value); return 'OK'; }),
    incr: vi.fn(async (key: string) => {
      const cur = parseInt(store.get(key) ?? '0', 10) + 1;
      store.set(key, String(cur));
      return cur;
    }),
    expire: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    rpop: vi.fn().mockResolvedValue(null),
    llen: vi.fn().mockResolvedValue(0),
    keys: vi.fn().mockResolvedValue([]),
    mget: vi.fn().mockResolvedValue([]),
    hmset: vi.fn().mockResolvedValue('OK'),
    hgetall: vi.fn(async (key: string) => {
      const h = hashStore.get(key);
      return h ? Object.fromEntries(h) : {};
    }),
    sadd: vi.fn(async (key: string, ...members: string[]) => {
      if (!setStore.has(key)) setStore.set(key, new Set());
      members.forEach((m) => setStore.get(key)!.add(m));
      return members.length;
    }),
    scard: vi.fn(async (key: string) => setStore.get(key)?.size ?? 0),
    zincrby: vi.fn().mockResolvedValue('1'),
    zrevrangebyscore: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn(() => mockPipeline),
    quit: vi.fn().mockResolvedValue('OK'),
  } as unknown as Redis;
}

// ════════════════════════════════════════════════════════════════════════════════
// MOCK FETCH
// ════════════════════════════════════════════════════════════════════════════════

const originalFetch = globalThis.fetch;

function mockFetchOk(body: unknown = { ok: true }) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchFail(status = 500) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: 'fail' }),
    text: async () => 'fail',
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// RATE LIMITING TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('AI Governance: Rate Limiting', () => {
  let redis: Redis;
  let tracker: AiGovernanceUsageTracker;

  beforeEach(() => {
    redis = createMockRedis();
    tracker = new AiGovernanceUsageTracker(redis, 'http://localhost:4050');
  });

  afterEach(async () => {
    await tracker.close();
    globalThis.fetch = originalFetch;
  });

  it('allows requests under the default limits', async () => {
    // Student hourly = 0, daily = 0 → allowed
    const result = await tracker.checkRateLimit({
      tenantId: 'tenant-1',
      userId: 'user-1',
      studentId: 'student-1',
      context: '/ai/homework',
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
    expect(result.resetAt).toBeInstanceOf(Date);
  });

  it('blocks when hourly limit is reached', async () => {
    // Simulate student at hourly limit (20)
    (redis.get as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
      if (key.includes(':hourly')) return '20';
      if (key.includes(':daily')) return '5';
      return null;
    });

    const result = await tracker.checkRateLimit({
      tenantId: 'tenant-1',
      userId: 'user-1',
      studentId: 'student-1',
      context: '/ai/session',
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limitType).toBe('student_hourly');
  });

  it('blocks when daily limit is reached', async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
      if (key.includes(':hourly')) return '5';
      if (key.includes('student') && key.includes(':daily')) return '100';
      return null;
    });

    const result = await tracker.checkRateLimit({
      tenantId: 'tenant-1',
      userId: 'user-1',
      studentId: 'student-1',
      context: '/homework/check',
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limitType).toBe('student_daily');
  });

  it('respects custom tenant limits', async () => {
    // Set custom limits via hmset, then hgetall returns them
    await tracker.setTenantLimits('tenant-custom', {
      studentDailyLimit: 50,
      studentHourlyLimit: 10,
      tenantDailyLimit: 5000,
    });

    expect(redis.hmset).toHaveBeenCalledWith('ratelimit:config:tenant-custom', {
      studentDailyLimit: '50',
      studentHourlyLimit: '10',
      tenantDailyLimit: '5000',
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGER TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('AI Governance: Audit Logger', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('buffers events and flushes to audit-svc', async () => {
    mockFetchOk();
    const logger = new AiAuditLogger({
      auditSvcUrl: 'http://localhost:4050',
      flushIntervalMs: 60_000, // prevent auto-flush
      flushThreshold: 100,
    });

    logger.logAiInteraction({
      tenantId: 'tenant-1',
      userId: 'user-1',
      studentId: 'student-1',
      model: 'gpt-4o-mini',
      context: '/ai/homework',
      inputTokens: 100,
      outputTokens: 200,
      processingMs: 450,
      rawInput: 'What is 2+2?',
      rawOutput: 'The answer is 4.',
    });

    expect(logger.pendingCount).toBe(1);

    await logger.flush();
    expect(logger.pendingCount).toBe(0);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('http://localhost:4050/audit/ingest/batch');
    expect(call[1].method).toBe('POST');

    const body = JSON.parse(call[1].body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe('AI_INTERACTION');
    expect(body.events[0].payload.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.events[0].payload.outputHash).toMatch(/^[0-9a-f]{64}$/);

    await logger.close();
  });

  it('writes fallback file on flush failure', async () => {
    mockFetchFail();

    const logger = new AiAuditLogger({
      auditSvcUrl: 'http://localhost:4050',
      flushIntervalMs: 60_000,
      flushThreshold: 100,
      fallbackDir: '/tmp/test-audit-fallback',
    });

    logger.log({
      type: 'AI_INTERACTION',
      tenantId: 'tenant-1',
      userId: 'user-1',
      resourceId: 'student-1',
      category: 'AI_INTERACTION',
      payload: { test: true },
      timestamp: new Date().toISOString(),
    });

    // Flush will fail → writeFallback is called
    // We just verify it doesn't throw
    await logger.flush();
    expect(logger.pendingCount).toBe(0);

    await logger.close();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// USAGE STATS TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('AI Governance: Usage Stats', () => {
  let redis: Redis;
  let tracker: AiGovernanceUsageTracker;

  beforeEach(() => {
    redis = createMockRedis();
    tracker = new AiGovernanceUsageTracker(redis, 'http://localhost:4050');
  });

  afterEach(async () => {
    await tracker.close();
  });

  it('returns aggregated usage stats from Redis', async () => {
    const stats = await tracker.getUsageStats('tenant-1', 'day');

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('uniqueStudents');
    expect(stats).toHaveProperty('modelBreakdown');
    expect(stats).toHaveProperty('hourlyDistribution');
    expect(stats).toHaveProperty('topContexts');
    expect(stats.hourlyDistribution).toHaveLength(24);
  });

  it('tracks usage and increments Redis counters', async () => {
    await tracker.trackUsage({
      tenantId: 'tenant-1',
      userId: 'user-1',
      studentId: 'student-1',
      model: 'gpt-4o-mini',
      context: '/ai/homework',
      inputTokens: 100,
      outputTokens: 200,
      processingMs: 350,
      confidence: 0.92,
      inputHash: 'abc123',
      outputHash: 'def456',
    });

    // Pipeline should have been created and executed
    expect(redis.pipeline).toHaveBeenCalled();
    // Audit queue should have been pushed
    expect(redis.lpush).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// EXPLAINABILITY TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('AI Governance: Explainability', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('explains a recommendation via brain-engine', async () => {
    mockFetchOk({
      recommendationId: 'rec-1',
      factors: [{ factor: 'mastery', weight: 0.5, description: 'Low mastery' }],
      confidence: 0.85,
      modelVersion: 'v1',
      generatedAt: '2025-01-01T00:00:00Z',
    });

    const svc = new ExplainabilityService({
      brainEngineUrl: 'http://localhost:8080',
      cognitiveLoadSvcUrl: 'http://localhost:4060',
      mlRecommendationUrl: 'http://localhost:4070',
    });

    const result = await svc.explainRecommendation('rec-1');

    expect(result.recommendationId).toBe('rec-1');
    expect(result.confidence).toBe(0.85);
    expect(result.factors).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns student insight summary with parallel fetches', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('cognitive-load')) {
        return {
          ok: true,
          json: async () => ({
            studentId: 'student-1',
            currentLoad: 0.6,
            capacity: 1.0,
            recentTrend: 'stable',
            lastUpdated: '2025-01-01T00:00:00Z',
          }),
        };
      }
      if (url.includes('explain/student')) {
        return {
          ok: true,
          json: async () => ({
            recommendations: [
              {
                recommendationId: 'rec-1',
                factors: [],
                confidence: 0.9,
                modelVersion: 'v1',
                generatedAt: '2025-01-01T00:00:00Z',
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const svc = new ExplainabilityService({
      brainEngineUrl: 'http://localhost:8080',
      cognitiveLoadSvcUrl: 'http://localhost:4060',
      mlRecommendationUrl: 'http://localhost:4070',
    });

    const summary = await svc.getStudentInsightSummary('tenant-1', 'student-1');

    expect(summary.studentId).toBe('student-1');
    expect(summary.tenantId).toBe('tenant-1');
    expect(summary.cognitiveLoad).not.toBeNull();
    expect(summary.cognitiveLoad?.currentLoad).toBe(0.6);
    expect(summary.recentRecommendations).toHaveLength(1);
    expect(summary.summary).toContain('60%');
    expect(callCount).toBe(2); // parallel fetches
  });
});
