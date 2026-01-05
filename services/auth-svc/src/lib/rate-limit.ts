/**
 * Rate Limiting Middleware for Auth Service
 *
 * Implements sliding window rate limiting for public authentication endpoints.
 * Uses in-memory storage with automatic cleanup.
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
  /** Message to show when rate limited */
  message?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ══════════════════════════════════════════════════════════════════════════════

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;

let cleanupTimer: NodeJS.Timeout | null = null;

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

export function stopCleanup(): void {
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
  const {
    max,
    windowMs,
    keyPrefix = 'default',
    keyExtractor,
    message = 'Too many requests, please try again later.',
  } = options;

  // Start cleanup on first use
  startCleanup();

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
