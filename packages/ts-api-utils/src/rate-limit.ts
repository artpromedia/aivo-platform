/**
 * Rate Limiting Utilities
 *
 * Provides standardized rate limiting for public API endpoints across all services.
 * Uses sliding window algorithm with in-memory storage and automatic cleanup.
 *
 * CRITICAL: This addresses HIGH-008 - Rate limiting on public endpoints
 *
 * Usage:
 * ```typescript
 * import { createRateLimiter, RateLimitPresets } from '@aivo/ts-api-utils/rate-limit';
 *
 * // Use a preset
 * const loginLimiter = createRateLimiter(RateLimitPresets.LOGIN);
 *
 * // Or customize
 * const customLimiter = createRateLimiter({
 *   max: 100,
 *   windowMs: 60 * 1000,
 *   keyPrefix: 'api:custom',
 * });
 *
 * // In Fastify route
 * fastify.post('/login', { preHandler: loginLimiter }, handler);
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export interface RateLimitOptions {
  /** Maximum requests allowed in window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing different rate limits */
  keyPrefix?: string;
  /** Custom key extractor function */
  keyExtractor?: (request: unknown) => string;
  /** Message to show when rate limited */
  message?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (request: unknown) => boolean;
  /** Custom handler for rate limit exceeded (for non-Fastify frameworks) */
  onRateLimitExceeded?: (info: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ══════════════════════════════════════════════════════════════════════════════

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
const MAX_ENTRY_AGE = 3_600_000; // 1 hour

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > MAX_ENTRY_AGE) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent process exit
  cleanupTimer.unref();
}

/**
 * Stop the cleanup timer (useful for tests)
 */
export function stopRateLimitCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Clear all rate limit entries (useful for tests)
 */
export function clearRateLimitStore(): void {
  store.clear();
}

// ══════════════════════════════════════════════════════════════════════════════
// CORE RATE LIMITER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check rate limit for a key without modifying state
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  const count = entry && now - entry.windowStart <= windowMs ? entry.count : 0;
  const windowStart = entry?.windowStart ?? now;
  const resetAt = windowStart + windowMs;
  const remaining = Math.max(0, max - count);
  const retryAfter = Math.max(0, Math.ceil((resetAt - now) / 1000));

  return {
    allowed: count < max,
    info: {
      limit: max,
      remaining: count < max ? remaining - 1 : 0,
      resetAt,
      retryAfter: count >= max ? retryAfter : 0,
    },
  };
}

/**
 * Record a request for rate limiting
 */
export function recordRequest(key: string, windowMs: number): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT KEY EXTRACTOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Default key extractor that works with Fastify and Express requests
 */
export function defaultKeyExtractor(request: unknown): string {
  const req = request as {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
    connection?: { remoteAddress?: string };
  };

  // Try various methods to get IP
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const forwarded = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0]?.trim()
    : Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : undefined;

  return (
    req.ip ||
    forwarded ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY MIDDLEWARE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

interface FastifyRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface FastifyReply {
  header(name: string, value: string | number): FastifyReply;
  status(code: number): FastifyReply;
  send(payload: unknown): FastifyReply;
}

/**
 * Create a rate limiting middleware for Fastify
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyPrefix = 'ratelimit',
    keyExtractor = defaultKeyExtractor,
    message = 'Too many requests, please try again later.',
    skip,
  } = options;

  // Start cleanup on first use
  startCleanup();

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Skip if skip function returns true
    if (skip && skip(request)) {
      return;
    }

    const identifier = keyExtractor(request);
    const key = `${keyPrefix}:${identifier}`;

    // Check current state
    const result = checkRateLimit(key, max, windowMs);

    // Set rate limit headers
    void reply.header('X-RateLimit-Limit', max);
    void reply.header('X-RateLimit-Remaining', result.info.remaining);
    void reply.header('X-RateLimit-Reset', Math.ceil(result.info.resetAt / 1000));

    // Record this request
    recordRequest(key, windowMs);

    if (!result.allowed) {
      void reply.header('Retry-After', result.info.retryAfter);
      void reply.status(429).send({
        error: 'Too Many Requests',
        message,
        retryAfter: result.info.retryAfter,
      });
      throw new Error('Rate limit exceeded');
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

interface ExpressRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface ExpressResponse {
  set(name: string, value: string | number): ExpressResponse;
  status(code: number): ExpressResponse;
  json(payload: unknown): void;
}

/**
 * Create a rate limiting middleware for Express
 */
export function createExpressRateLimiter(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyPrefix = 'ratelimit',
    keyExtractor = defaultKeyExtractor,
    message = 'Too many requests, please try again later.',
    skip,
  } = options;

  // Start cleanup on first use
  startCleanup();

  return function expressRateLimitMiddleware(
    req: ExpressRequest,
    res: ExpressResponse,
    next: (err?: Error) => void
  ): void {
    // Skip if skip function returns true
    if (skip && skip(req)) {
      next();
      return;
    }

    const identifier = keyExtractor(req);
    const key = `${keyPrefix}:${identifier}`;

    // Check current state
    const result = checkRateLimit(key, max, windowMs);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', max);
    res.set('X-RateLimit-Remaining', result.info.remaining);
    res.set('X-RateLimit-Reset', Math.ceil(result.info.resetAt / 1000));

    // Record this request
    recordRequest(key, windowMs);

    if (!result.allowed) {
      res.set('Retry-After', result.info.retryAfter);
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: result.info.retryAfter,
      });
      return;
    }

    next();
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESETS FOR COMMON USE CASES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-configured rate limit options for common endpoint types.
 * These follow security best practices for educational platforms.
 */
export const RateLimitPresets = {
  /** Login endpoint: 5 requests per 15 minutes */
  LOGIN: {
    max: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'auth:login',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  } as RateLimitOptions,

  /** Registration endpoint: 3 requests per hour */
  REGISTRATION: {
    max: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'auth:register',
    message: 'Too many registration attempts. Please try again later.',
  } as RateLimitOptions,

  /** Password reset: 3 requests per hour (prevent email enumeration) */
  PASSWORD_RESET: {
    max: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'auth:password-reset',
    message: 'Too many password reset requests. Please try again later.',
  } as RateLimitOptions,

  /** Token refresh: 30 requests per minute */
  TOKEN_REFRESH: {
    max: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'auth:refresh',
    message: 'Too many refresh requests. Please try again in a moment.',
  } as RateLimitOptions,

  /** SSO initiation: 10 requests per minute */
  SSO: {
    max: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'auth:sso',
    message: 'Too many SSO requests. Please try again in a moment.',
  } as RateLimitOptions,

  /** General API: 100 requests per minute */
  API_GENERAL: {
    max: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'api:general',
    message: 'Too many requests. Please slow down.',
  } as RateLimitOptions,

  /** Public read endpoints: 200 requests per minute */
  PUBLIC_READ: {
    max: 200,
    windowMs: 60 * 1000,
    keyPrefix: 'api:public-read',
    message: 'Too many requests. Please slow down.',
  } as RateLimitOptions,

  /** Write/mutation endpoints: 30 requests per minute */
  API_WRITE: {
    max: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'api:write',
    message: 'Too many write operations. Please slow down.',
  } as RateLimitOptions,

  /** AI/LLM endpoints: 20 requests per minute (expensive operations) */
  AI_REQUEST: {
    max: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai:request',
    message: 'Too many AI requests. Please wait before making more requests.',
  } as RateLimitOptions,

  /** Health check: 10 requests per minute */
  HEALTH_CHECK: {
    max: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'health',
    message: 'Rate limit exceeded.',
  } as RateLimitOptions,

  /** Report/export generation: 5 requests per hour */
  REPORT_GENERATION: {
    max: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'report:generate',
    message: 'Too many report requests. Please try again later.',
  } as RateLimitOptions,

  /** File upload: 10 requests per 10 minutes */
  FILE_UPLOAD: {
    max: 10,
    windowMs: 10 * 60 * 1000,
    keyPrefix: 'upload:file',
    message: 'Too many upload attempts. Please try again later.',
  } as RateLimitOptions,

  /** Contact form / feedback: 5 requests per hour */
  CONTACT_FORM: {
    max: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'contact:form',
    message: 'Too many submissions. Please try again later.',
  } as RateLimitOptions,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a composite rate limiter that applies multiple limits
 */
export function createCompositeRateLimiter(
  limiters: Array<ReturnType<typeof createRateLimiter>>
) {
  return async function compositeMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    for (const limiter of limiters) {
      await limiter(request, reply);
    }
  };
}

/**
 * Get rate limit info for a key without recording a request
 */
export function getRateLimitInfo(
  key: string,
  max: number,
  windowMs: number
): RateLimitInfo {
  return checkRateLimit(key, max, windowMs).info;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const RateLimit = {
  create: createRateLimiter,
  createExpress: createExpressRateLimiter,
  createComposite: createCompositeRateLimiter,
  check: checkRateLimit,
  record: recordRequest,
  getInfo: getRateLimitInfo,
  presets: RateLimitPresets,
  keyExtractor: defaultKeyExtractor,
  cleanup: {
    stop: stopRateLimitCleanup,
    clearStore: clearRateLimitStore,
  },
};
