import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the factory function directly — no Fastify is needed.
// The middleware accepts (request, reply) so we create minimal mocks.

import { createRateLimiter, stopCleanup } from '../src/lib/rate-limit.js';

type AnyFn = (...args: any[]) => any;

function makeRequest(ip = '127.0.0.1', headers: Record<string, string> = {}): any {
  return { ip, headers };
}

function makeReply(): any {
  const sentHeaders: Record<string, unknown> = {};
  let statusCode = 200;
  let body: unknown;

  return {
    header: vi.fn((k: string, v: unknown) => { sentHeaders[k] = v; }),
    status: vi.fn(function (this: any, code: number) { statusCode = code; return this; }),
    send: vi.fn((b: unknown) => { body = b; }),
    _sentHeaders: sentHeaders,
    _getStatus: () => statusCode,
    _getBody: () => body,
  };
}

// ══════════════════════════════════════════════════════════════════════════════

describe('createRateLimiter', () => {
  afterEach(() => {
    stopCleanup();
  });

  it('should allow requests under the limit', async () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000, keyPrefix: 't1' });
    const req = makeRequest('10.0.0.1');
    const reply = makeReply();

    await limiter(req, reply);

    expect(reply.header).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(reply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('should return 429 when limit is exceeded', async () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, keyPrefix: 't2' });
    const req = makeRequest('10.0.0.2');
    const reply = makeReply();

    await limiter(req, reply); // 1
    await limiter(req, reply); // 2
    await expect(limiter(req, reply)).rejects.toThrow('Rate limit exceeded'); // 3 → blocked

    expect(reply.status).toHaveBeenCalledWith(429);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Too Many Requests' })
    );
    expect(reply.header).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('should respect skip function', async () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 60_000,
      keyPrefix: 't3',
      skip: (r: any) => r.ip === '10.0.0.3',
    });
    const req = makeRequest('10.0.0.3');
    const reply = makeReply();

    // Even called multiple times, should never block
    await limiter(req, reply);
    await limiter(req, reply);
    await limiter(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should use custom keyExtractor', async () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 60_000,
      keyPrefix: 't4',
      keyExtractor: () => 'custom-key',
    });
    const req1 = makeRequest('10.0.0.4');
    const req2 = makeRequest('10.0.0.5'); // different IP but same extracted key
    const reply = makeReply();

    await limiter(req1, reply); // 1
    // Second request shares the key so it counts as #2
    await expect(limiter(req2, reply)).rejects.toThrow('Rate limit exceeded');
  });

  it('should start a new window after expiry', async () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 50, // very short
      keyPrefix: 't5',
    });
    const req = makeRequest('10.0.0.6');
    const reply = makeReply();

    await limiter(req, reply); // 1

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    // Should be allowed again (new window)
    await limiter(req, makeReply());
  });
});

describe('pre-configured limiters', () => {
  it('should export named limiters', async () => {
    // Dynamic import to get the pre-configured instances
    const mod = await import('../src/lib/rate-limit.js');
    expect(typeof mod.emailTrackingRateLimiter).toBe('function');
    expect(typeof mod.webhookRateLimiter).toBe('function');
    expect(typeof mod.healthRateLimiter).toBe('function');
  });
});
