/**
 * Rate Limiting Middleware for Auth Service
 *
 * Implements sliding window rate limiting for public authentication endpoints.
 * Supports both Redis (for distributed deployments) and in-memory (for development).
 *
 * Updated: January 2026 - Enterprise QA Audit requirement
 * - Added Redis support for distributed rate limiting
 * - Maintains in-memory fallback for development
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedisClient, isRedisAvailable } from './redis/client.js';
import type Redis from 'ioredis';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitOptions {
  /** Maximum requests allowed in window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing different rate limits */
  keyPrefix?: string;
  /** Custom key extractor (defaults to IP) */
  keyExtractor?: (request: FastifyRequest) => string;
  /** Message to show when rate limited */
  message?: string;
}

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; windowStart: number }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// REDIS STORE (Distributed Rate Limiting)
// ══════════════════════════════════════════════════════════════════════════════

class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; windowStart: number }> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `ratelimit:${key}:${windowStart}`;
    const ttlSeconds = Math.ceil(windowMs / 1000) + 1; // Add 1 second buffer

    // Use Redis MULTI for atomic increment with TTL
    const pipeline = this.redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, ttlSeconds);
    const results = await pipeline.exec();

    // Extract count from INCR result
    const count = results?.[0]?.[1] as number ?? 1;

    return { count, windowStart };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (Development Fallback)
// ══════════════════════════════════════════════════════════════════════════════

const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.windowStart > 3_600_000) {
        memoryStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent process exit
  cleanupTimer.unref();
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

class InMemoryRateLimitStore implements RateLimitStore {
  async increment(key: string, windowMs: number): Promise<{ count: number; windowStart: number }> {
    const now = Date.now();
    let entry = memoryStore.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      entry = { count: 1, windowStart: now };
      memoryStore.set(key, entry);
    } else {
      // Increment in current window
      entry.count++;
    }

    return { count: entry.count, windowStart: entry.windowStart };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STORE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

let redisStore: RedisRateLimitStore | null = null;
const memoryStoreInstance = new InMemoryRateLimitStore();

function getRateLimitStore(): RateLimitStore {
  // Check if Redis is available
  const redis = getRedisClient();

  if (redis && isRedisAvailable()) {
    if (!redisStore) {
      redisStore = new RedisRateLimitStore(redis);
      console.log('[RateLimit] Using Redis store for distributed rate limiting');
    }
    return redisStore;
  }

  // Fallback to in-memory store
  if (process.env.NODE_ENV === 'production') {
    console.warn('[RateLimit] WARNING: Using in-memory store in production - rate limiting will not work across instances');
  }

  startCleanup();
  return memoryStoreInstance;
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyPrefix = 'default',
    keyExtractor,
    message = 'Too many requests, please try again later.',
  } = options;

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Extract key (default to IP address)
    const identifier = keyExtractor
      ? keyExtractor(request)
      : request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';

    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    // Get the appropriate store (Redis or in-memory)
    const store = getRateLimitStore();

    // Increment counter
    const { count, windowStart } = await store.increment(key, windowMs);

    const remaining = Math.max(0, max - count);
    const resetAt = windowStart + windowMs;

    // Set rate limit headers
    void reply.header('X-RateLimit-Limit', max);
    void reply.header('X-RateLimit-Remaining', remaining);
    void reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (count > max) {
      const retryAfter = Math.ceil((resetAt - now) / 1000);
      void reply.header('Retry-After', retryAfter);

      void reply.status(429).send({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });
      // Throw to prevent handler execution
      throw new Error('Rate limit exceeded');
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PRE-CONFIGURED RATE LIMITERS FOR AUTH ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter for login endpoint
 * 5 requests per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: 'auth:login',
  message: 'Too many login attempts. Please try again later.',
});

/**
 * Rate limiter for registration endpoint
 * 3 requests per hour per IP
 */
export const registerRateLimiter = createRateLimiter({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'auth:register',
  message: 'Too many registration attempts. Please try again later.',
});

/**
 * Rate limiter for password reset request endpoint
 * 3 requests per hour per IP (prevent email enumeration)
 */
export const passwordResetRateLimiter = createRateLimiter({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'auth:password-reset',
  message: 'Too many password reset requests. Please try again later.',
});

/**
 * Rate limiter for email verification endpoint
 * 10 requests per hour per IP
 */
export const verifyEmailRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'auth:verify-email',
  message: 'Too many verification attempts. Please try again later.',
});

/**
 * Rate limiter for token refresh endpoint
 * 30 requests per minute per IP (higher limit for legitimate use)
 */
export const refreshTokenRateLimiter = createRateLimiter({
  max: 30,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'auth:refresh',
  message: 'Too many refresh token requests. Please try again later.',
});

/**
 * Rate limiter for SSO initiation
 * 10 requests per minute per IP
 */
export const ssoRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'auth:sso',
  message: 'Too many SSO requests. Please try again later.',
});

/**
 * Rate limiter for health check endpoint
 * 10 requests per minute per IP
 */
export const healthRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'auth:health',
  message: 'Rate limit exceeded.',
});
