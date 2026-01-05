/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter for public endpoints.
 * Uses sliding window algorithm with IP-based tracking.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

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
  /** Skip function to bypass rate limiting */
  skip?: (request: FastifyRequest) => boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ══════════════════════════════════════════════════════════════════════════════

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.windowStart > 3_600_000) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent process exit
  cleanupTimer.unref();
}

function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowMs, keyPrefix = 'default', keyExtractor, skip } = options;

  // Start cleanup on first use
  startCleanup();

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Check if rate limiting should be skipped
    if (skip?.(request)) {
      return;
    }

    // Extract key (default to IP address)
    const identifier = keyExtractor
      ? keyExtractor(request)
      : request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';

    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    // Get or create entry
    let entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      entry = { count: 1, windowStart: now };
      store.set(key, entry);
    } else {
      // Increment in current window
      entry.count++;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetAt = entry.windowStart + windowMs;

    // Set rate limit headers
    void reply.header('X-RateLimit-Limit', max);
    void reply.header('X-RateLimit-Remaining', remaining);
    void reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (entry.count > max) {
      const retryAfter = Math.ceil((resetAt - now) / 1000);
      void reply.header('Retry-After', retryAfter);

      void reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      });
      // Throw to prevent handler execution
      throw new Error('Rate limit exceeded');
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PRE-CONFIGURED RATE LIMITERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter for email tracking endpoints (open/click pixels)
 * Allows 60 requests per minute per IP
 */
export const emailTrackingRateLimiter = createRateLimiter({
  max: 60,
  windowMs: 60_000, // 1 minute
  keyPrefix: 'email-tracking',
});

/**
 * Rate limiter for webhook endpoints
 * Allows 100 requests per minute per IP
 */
export const webhookRateLimiter = createRateLimiter({
  max: 100,
  windowMs: 60_000, // 1 minute
  keyPrefix: 'webhook',
});

/**
 * Rate limiter for health check endpoints
 * Allows 10 requests per minute per IP
 */
export const healthRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 60_000, // 1 minute
  keyPrefix: 'health',
});

// ══════════════════════════════════════════════════════════════════════════════
// CLEANUP EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export { stopCleanup };
