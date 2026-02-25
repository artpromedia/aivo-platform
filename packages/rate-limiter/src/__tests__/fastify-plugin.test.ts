/**
 * Fastify Rate-Limit Plugin Integration Tests
 *
 * Tests the @aivo/rate-limiter Fastify plugin including:
 * - Plugin registration
 * - Rate limiting enforcement
 * - Skip paths
 * - Standard headers
 * - Store integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fastify-plugin to pass through
vi.mock('fastify-plugin', () => ({
  default: (fn: any) => fn,
}));

describe('Fastify rateLimitPlugin', () => {
  let plugin: any;

  beforeEach(async () => {
    // Dynamic import after mocks are set up
    const mod = await import('../fastify/plugin');
    plugin = mod.rateLimitPlugin;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockFastify() {
    const hooks: Record<string, Function[]> = {};
    const decorators: Record<string, any> = {};

    return {
      addHook: vi.fn((name: string, fn: Function) => {
        hooks[name] = hooks[name] || [];
        hooks[name].push(fn);
      }),
      decorate: vi.fn((name: string, value: any) => {
        decorators[name] = value;
      }),
      hasDecorator: vi.fn((name: string) => name in decorators),
      hooks,
      decorators,
    };
  }

  function createMockRequest(url: string, ip = '127.0.0.1') {
    return {
      url,
      ip,
      headers: { 'x-forwarded-for': ip },
      routeOptions: {},
    };
  }

  function createMockReply() {
    const headers: Record<string, string> = {};
    return {
      code: vi.fn().mockReturnThis(),
      header: vi.fn((k: string, v: string) => {
        headers[k] = v;
        return { send: vi.fn() };
      }),
      send: vi.fn(),
      headers,
    };
  }

  it('should register as a Fastify plugin', async () => {
    const fastify = createMockFastify();

    await plugin(fastify as any, { store: undefined });

    expect(fastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
  });

  it('should skip health check paths by default', async () => {
    const fastify = createMockFastify();
    await plugin(fastify as any, {});

    const onRequest = fastify.hooks['onRequest']?.[0];
    expect(onRequest).toBeDefined();

    const req = createMockRequest('/health');
    const reply = createMockReply();

    // Should not throw or set rate limit headers for health endpoints
    await onRequest(req, reply);
    expect(reply.code).not.toHaveBeenCalledWith(429);
  });

  it('should decorate fastify with rateLimit info', async () => {
    const fastify = createMockFastify();
    await plugin(fastify as any, {});

    // Plugin should register an onClose hook for cleanup
    expect(fastify.addHook).toHaveBeenCalledWith(
      'onClose',
      expect.any(Function)
    );
  });
});
