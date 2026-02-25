/**
 * Fastify Rate Limit Plugin
 *
 * Redis-backed rate limiting plugin for Fastify services.
 * Registers as a Fastify plugin via `fastify-plugin` so decorators
 * are shared across encapsulated contexts.
 *
 * @example
 * ```typescript
 * import { rateLimitPlugin } from '@aivo/rate-limiter/fastify';
 *
 * await app.register(rateLimitPlugin, {
 *   redisUrl: process.env.REDIS_URL!,
 *   max: 100,
 *   windowMs: 60_000,
 *   keyPrefix: 'my-svc',
 * });
 * ```
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import fp from 'fastify-plugin';

import type { Logger } from '../logger';
import { noopLogger } from '../logger';
import { createRedisStore, RedisStore } from '../stores/redis-store';
import type { RedisStoreOptions } from '../stores/redis-store';
import type { RateLimitStore } from '../stores/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FastifyRateLimitOptions {
  /** Maximum requests allowed in window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;

  /**
   * Provide ONE of the following to configure the backing store:
   * - `redisUrl`       – creates a new RedisStore internally
   * - `redisClient`    – reuses an existing ioredis client
   * - `store`          – bring your own RateLimitStore
   *
   * If none are provided the plugin still works but uses a
   * fail-open RedisStore with no connection (always allows).
   */
  redisUrl?: string;
  redisClient?: Redis;
  store?: RateLimitStore;

  /** When true, Redis errors allow requests through (default: true) */
  failOpen?: boolean;
  /** Logger instance */
  logger?: Logger;

  /** Custom key extractor (defaults to IP) */
  keyGenerator?: (request: FastifyRequest) => string;
  /** Paths that should skip rate limiting */
  skipPaths?: string[];
  /** Additional skip predicate */
  skip?: (request: FastifyRequest) => boolean;
  /** Custom error message */
  message?: string;

  /**
   * Per-route overrides keyed by route prefix.
   * Each override can specify `max` and/or `windowMs`.
   */
  routeOverrides?: Record<string, { max?: number; windowMs?: number }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SKIP_PATHS = new Set([
  '/health',
  '/ready',
  '/healthz',
  '/readyz',
  '/livez',
  '/metrics',
]);

function defaultKeyGenerator(request: FastifyRequest): string {
  return request.ip || 'unknown';
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

async function rateLimitPluginImpl(
  fastify: FastifyInstance,
  opts: FastifyRateLimitOptions
): Promise<void> {
  const {
    max,
    windowMs,
    keyPrefix = 'rl',
    failOpen = true,
    logger: log = noopLogger,
    keyGenerator = defaultKeyGenerator,
    skipPaths = [],
    skip,
    message = 'Too many requests, please try again later.',
    routeOverrides = {},
  } = opts;

  // ── Resolve store ──────────────────────────────────────────────────────
  let store: RateLimitStore;

  if (opts.store) {
    store = opts.store;
  } else if (opts.redisClient) {
    store = new RedisStore({
      client: opts.redisClient,
      keyPrefix,
      failOpen,
      logger: log,
    });
  } else if (opts.redisUrl) {
    store = createRedisStore(opts.redisUrl, {
      keyPrefix,
      failOpen,
      logger: log,
    });
  } else {
    log.warn('rateLimitPlugin: no Redis URL or store provided – rate limiting is effectively disabled');
    // Create a pass-through store so the hook still sets headers
    store = createPassThroughStore();
  }

  // Merge skip paths
  const allSkipPaths = new Set([...DEFAULT_SKIP_PATHS, ...skipPaths]);

  // Decorate Fastify so downstream code can access the store
  if (!fastify.hasDecorator('rateLimitStore')) {
    fastify.decorate('rateLimitStore', store);
  }

  // ── onRequest hook ─────────────────────────────────────────────────────
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];

    // Skip health / metrics paths
    if (allSkipPaths.has(path)) return;

    // Custom skip predicate
    if (skip?.(request)) return;

    // Resolve limits (with route overrides)
    let effectiveMax = max;
    let effectiveWindowMs = windowMs;

    for (const [prefix, override] of Object.entries(routeOverrides)) {
      if (path.startsWith(prefix)) {
        effectiveMax = override.max ?? effectiveMax;
        effectiveWindowMs = override.windowMs ?? effectiveWindowMs;
        break;
      }
    }

    const identifier = keyGenerator(request);
    const key = `${keyPrefix}:${identifier}`;
    const ttlSeconds = Math.ceil(effectiveWindowMs / 1000);

    // Atomic increment
    const count = await store.increment(key, 1, ttlSeconds);

    const remaining = Math.max(0, effectiveMax - count);
    const now = Date.now();
    const resetEpochSeconds = Math.ceil((now + effectiveWindowMs) / 1000);

    // Standard rate-limit headers
    void reply.header('X-RateLimit-Limit', effectiveMax);
    void reply.header('X-RateLimit-Remaining', remaining);
    void reply.header('X-RateLimit-Reset', resetEpochSeconds);

    if (count > effectiveMax) {
      const retryAfter = Math.ceil(effectiveWindowMs / 1000);
      void reply.header('Retry-After', retryAfter);

      log.warn('Rate limit exceeded', {
        key,
        count,
        max: effectiveMax,
        windowMs: effectiveWindowMs,
      });

      void reply.status(429).send({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });
    }
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await store.close();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PASS-THROUGH STORE (no-op fallback)
// ══════════════════════════════════════════════════════════════════════════════

function createPassThroughStore(): RateLimitStore {
  return {
    get: async () => null,
    set: async () => { /* noop */ },
    increment: async () => 0,
    decrement: async () => 0,
    delete: async () => { /* noop */ },
    exists: async () => false,
    expire: async () => { /* noop */ },
    ttl: async () => -1,
    slidingWindowCount: async () => 0,
    slidingWindowAdd: async () => 0,
    tokenBucketConsume: async (_k, cap) => ({ success: true, tokens: cap }),
    leakyBucketConsume: async () => ({ success: true, water: 0 }),
    keys: async () => [],
    flushAll: async () => { /* noop */ },
    close: async () => { /* noop */ },
    isHealthy: async () => true,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const rateLimitPlugin = fp(rateLimitPluginImpl, {
  fastify: '>=4.0.0',
  name: '@aivo/rate-limiter-fastify',
});
