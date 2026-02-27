import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  checkRateLimit,
  recordRequest,
  clearRateLimitStore,
  stopRateLimitCleanup,
  defaultKeyExtractor,
  createRateLimiter,
  createHonoRateLimiter,
  createCompositeRateLimiter,
  getRateLimitInfo,
  RateLimitPresets,
  RateLimit,
  createStandardKeyGenerator,
  createStandardErrorBuilder,
  createStandardAllowList,
  getFastifyRateLimitConfig,
  FastifyRateLimitPresets,
} from '../src/rate-limit.js';

// ------------------------------------------------------------------
// Setup / Teardown
// ------------------------------------------------------------------

beforeEach(() => {
  clearRateLimitStore();
});

afterEach(() => {
  stopRateLimitCleanup();
  clearRateLimitStore();
});

// ------------------------------------------------------------------
// checkRateLimit (legacy in-memory)
// ------------------------------------------------------------------

describe('checkRateLimit', () => {
  it('allows first request', () => {
    const result = checkRateLimit('key1', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.info.limit).toBe(5);
    expect(result.info.remaining).toBeGreaterThanOrEqual(0);
  });

  it('tracks count across calls via recordRequest', () => {
    recordRequest('key2', 60_000);
    recordRequest('key2', 60_000);
    recordRequest('key2', 60_000);

    const result = checkRateLimit('key2', 3, 60_000);
    expect(result.allowed).toBe(false);
  });

  it('resets after window expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    recordRequest('key3', 1000);
    recordRequest('key3', 1000);
    recordRequest('key3', 1000);

    // Advance past window
    vi.spyOn(Date, 'now').mockReturnValue(now + 2000);

    const result = checkRateLimit('key3', 3, 1000);
    expect(result.allowed).toBe(true);

    vi.restoreAllMocks();
  });
});

// ------------------------------------------------------------------
// recordRequest
// ------------------------------------------------------------------

describe('recordRequest', () => {
  it('creates entry for new key', () => {
    recordRequest('new-key', 60_000);
    const result = checkRateLimit('new-key', 10, 60_000);
    expect(result.info.remaining).toBeLessThan(10);
  });

  it('increments count for existing key', () => {
    recordRequest('incr-key', 60_000);
    recordRequest('incr-key', 60_000);
    const result = checkRateLimit('incr-key', 10, 60_000);
    // 2 recorded + 0 from check = remaining should be 8
    expect(result.info.remaining).toBeLessThanOrEqual(8);
  });
});

// ------------------------------------------------------------------
// defaultKeyExtractor
// ------------------------------------------------------------------

describe('defaultKeyExtractor', () => {
  it('extracts ip from request.ip', () => {
    const key = defaultKeyExtractor({ ip: '192.168.1.1' });
    expect(key).toBe('192.168.1.1');
  });

  it('extracts first IP from x-forwarded-for', () => {
    const key = defaultKeyExtractor({
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
    });
    expect(key).toBe('10.0.0.1');
  });

  it('falls back to socket.remoteAddress', () => {
    const key = defaultKeyExtractor({
      socket: { remoteAddress: '172.16.0.1' },
    });
    expect(key).toBe('172.16.0.1');
  });

  it('returns "unknown" when no IP found', () => {
    const key = defaultKeyExtractor({});
    expect(key).toBe('unknown');
  });
});

// ------------------------------------------------------------------
// createRateLimiter (Fastify middleware)
// ------------------------------------------------------------------

describe('createRateLimiter', () => {
  function createFakeReply() {
    const headers: Record<string, any> = {};
    let statusCode = 200;
    let body: any = null;

    return {
      header(name: string, value: any) {
        headers[name] = value;
        return this;
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(payload: any) {
        body = payload;
        return this;
      },
      getHeaders: () => headers,
      getStatus: () => statusCode,
      getBody: () => body,
    };
  }

  it('allows first request within limit', async () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
    const request = { ip: '1.2.3.4' } as any;
    const reply = createFakeReply() as any;

    await limiter(request, reply);
    expect(reply.getHeaders()['X-RateLimit-Limit']).toBe(5);
    expect(reply.getHeaders()['X-RateLimit-Remaining']).toBeGreaterThanOrEqual(0);
  });

  it('skips when skip function returns true', async () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 60_000,
      skip: () => true,
    });
    const request = { ip: '1.2.3.4' } as any;
    const reply = createFakeReply() as any;

    // Should not throw even if rate limited
    await limiter(request, reply);
    expect(reply.getHeaders()['X-RateLimit-Limit']).toBeUndefined();
  });

  it('uses custom keyExtractor', async () => {
    const limiter = createRateLimiter({
      max: 100,
      windowMs: 60_000,
      keyExtractor: () => 'custom-key',
    });
    const request = {} as any;
    const reply = createFakeReply() as any;

    await limiter(request, reply);
    expect(reply.getHeaders()['X-RateLimit-Limit']).toBe(100);
  });
});

// ------------------------------------------------------------------
// RateLimitPresets
// ------------------------------------------------------------------

describe('RateLimitPresets', () => {
  it('LOGIN preset has reasonable defaults', () => {
    expect(RateLimitPresets.LOGIN.max).toBe(5);
    expect(RateLimitPresets.LOGIN.windowMs).toBe(15 * 60 * 1000);
    expect(RateLimitPresets.LOGIN.keyPrefix).toBe('auth:login');
  });

  it('API_GENERAL preset allows 100 req/min', () => {
    expect(RateLimitPresets.API_GENERAL.max).toBe(100);
    expect(RateLimitPresets.API_GENERAL.windowMs).toBe(60_000);
  });

  it('AI_REQUEST preset is restrictive (20 req/min)', () => {
    expect(RateLimitPresets.AI_REQUEST.max).toBe(20);
  });

  it('all presets have required fields', () => {
    for (const [name, preset] of Object.entries(RateLimitPresets)) {
      expect(preset.max, `${name}.max`).toBeGreaterThan(0);
      expect(preset.windowMs, `${name}.windowMs`).toBeGreaterThan(0);
      expect(preset.keyPrefix, `${name}.keyPrefix`).toBeTruthy();
      expect(preset.message, `${name}.message`).toBeTruthy();
    }
  });
});

// ------------------------------------------------------------------
// createStandardKeyGenerator
// ------------------------------------------------------------------

describe('createStandardKeyGenerator', () => {
  it('uses tenant + user when available', () => {
    const gen = createStandardKeyGenerator('svc');
    const key = gen({ tenantId: 't1', userId: 'u1' });
    expect(key).toBe('svc:t1:u1');
  });

  it('falls back to tenant only', () => {
    const gen = createStandardKeyGenerator('svc');
    const key = gen({ tenantId: 't1' });
    expect(key).toBe('svc:t1');
  });

  it('falls back to IP when no tenant/user', () => {
    const gen = createStandardKeyGenerator('svc');
    const key = gen({ ip: '192.168.1.1', headers: {} });
    expect(key).toBe('svc:ip:192.168.1.1');
  });
});

// ------------------------------------------------------------------
// createStandardErrorBuilder
// ------------------------------------------------------------------

describe('createStandardErrorBuilder', () => {
  it('builds standard error response', () => {
    const builder = createStandardErrorBuilder();
    const result = builder({}, { after: '60', max: 100, ttl: 60 });
    expect(result.error).toBe('Too Many Requests');
    expect(result.retryAfter).toBe('60');
    expect(result.limit).toBe(100);
  });

  it('uses custom message', () => {
    const builder = createStandardErrorBuilder('Custom message');
    const result = builder({}, { after: '30', max: 50, ttl: 30 });
    expect(result.message).toBe('Custom message');
  });
});

// ------------------------------------------------------------------
// createStandardAllowList
// ------------------------------------------------------------------

describe('createStandardAllowList', () => {
  it('skips health endpoints', () => {
    const allow = createStandardAllowList();
    expect(allow({ url: '/health' })).toBe(true);
    expect(allow({ url: '/ready' })).toBe(true);
    expect(allow({ url: '/healthz' })).toBe(true);
  });

  it('skips internal endpoints', () => {
    const allow = createStandardAllowList();
    expect(allow({ url: '/internal/something' })).toBe(true);
  });

  it('skips requests with x-internal header', () => {
    const allow = createStandardAllowList();
    expect(allow({ url: '/api/data', headers: { 'x-internal': 'true' } })).toBe(true);
  });

  it('does not skip normal API endpoints', () => {
    const allow = createStandardAllowList();
    expect(allow({ url: '/api/users' })).toBe(false);
  });

  it('respects additional paths', () => {
    const allow = createStandardAllowList(['/custom-health']);
    expect(allow({ url: '/custom-health' })).toBe(true);
  });
});

// ------------------------------------------------------------------
// getFastifyRateLimitConfig
// ------------------------------------------------------------------

describe('getFastifyRateLimitConfig', () => {
  it('returns config for public-api service', () => {
    const config = getFastifyRateLimitConfig({
      serviceType: 'public-api',
      serviceName: 'my-svc',
    });
    expect(config.global).toBe(true);
    expect(config.max).toBe(100);
    expect(config.timeWindow).toBe('1 minute');
    expect(typeof config.keyGenerator).toBe('function');
    expect(typeof config.errorResponseBuilder).toBe('function');
    expect(typeof config.allowList).toBe('function');
  });

  it('allows overriding max and timeWindow', () => {
    const config = getFastifyRateLimitConfig({
      serviceType: 'public-api',
      serviceName: 'my-svc',
      max: 50,
      timeWindow: '30 seconds',
    });
    expect(config.max).toBe(50);
    expect(config.timeWindow).toBe('30 seconds');
  });

  it('supports all service types', () => {
    const types = [
      'public-api', 'internal-api', 'auth-service', 'ai-service',
      'data-ingestion', 'messaging', 'analytics', 'search', 'content', 'billing',
    ] as const;

    for (const serviceType of types) {
      const config = getFastifyRateLimitConfig({ serviceType, serviceName: 'test' });
      expect(config.max, `${serviceType} max`).toBeGreaterThan(0);
    }
  });
});

// ------------------------------------------------------------------
// RateLimit convenience namespace
// ------------------------------------------------------------------

describe('RateLimit convenience namespace', () => {
  it('exposes all expected members', () => {
    expect(RateLimit.configure).toBeDefined();
    expect(RateLimit.create).toBeDefined();
    expect(RateLimit.createHono).toBeDefined();
    expect(RateLimit.createComposite).toBeDefined();
    expect(RateLimit.check).toBeDefined();
    expect(RateLimit.record).toBeDefined();
    expect(RateLimit.getInfo).toBeDefined();
    expect(RateLimit.presets).toBeDefined();
    expect(RateLimit.keyExtractor).toBeDefined();
    expect(RateLimit.cleanup.stop).toBeDefined();
    expect(RateLimit.cleanup.clearStore).toBeDefined();
  });
});

// ------------------------------------------------------------------
// getRateLimitInfo
// ------------------------------------------------------------------

describe('getRateLimitInfo', () => {
  it('returns info without recording', () => {
    const info = getRateLimitInfo('test-key', 10, 60_000);
    expect(info.limit).toBe(10);
    expect(info.remaining).toBeGreaterThanOrEqual(0);
  });
});

// ------------------------------------------------------------------
// FastifyRateLimitPresets
// ------------------------------------------------------------------

describe('FastifyRateLimitPresets', () => {
  it('publicApi returns valid config', () => {
    const config = FastifyRateLimitPresets.publicApi('test-svc');
    expect(config.max).toBe(100);
    expect(config.timeWindow).toBe('1 minute');
  });

  it('authService has strict limits', () => {
    const config = FastifyRateLimitPresets.authService('auth-svc');
    expect(config.max).toBe(20);
  });

  it('aiService preset works', () => {
    const config = FastifyRateLimitPresets.aiService('ai-svc');
    expect(config.max).toBe(30);
  });
});
