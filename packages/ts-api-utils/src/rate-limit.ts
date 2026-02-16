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

/** Header value type for request headers */
type HeaderValue = string | string[] | undefined;

/** Request object shape for key extraction */
interface KeyExtractorRequest {
  ip?: string;
  headers?: Record<string, HeaderValue>;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
}

/**
 * Extract IP from X-Forwarded-For header
 */
function extractForwardedIp(forwardedFor: HeaderValue): string | undefined {
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim();
  }
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }
  return undefined;
}

/**
 * Default key extractor that works with Fastify and Express requests
 */
export function defaultKeyExtractor(request: unknown): string {
  const req = request as KeyExtractorRequest;

  // Try various methods to get IP
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const forwarded = extractForwardedIp(forwardedFor);

  return (
    req.ip || forwarded || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown'
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY MIDDLEWARE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

interface FastifyRequest {
  ip?: string;
  headers?: Record<string, HeaderValue>;
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
    if (skip?.(request)) {
      return;
    }

    const identifier = keyExtractor(request);
    const key = `${keyPrefix}:${identifier}`;

    // Check current state
    const result = checkRateLimit(key, max, windowMs);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', result.info.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(result.info.resetAt / 1000));

    // Record this request
    recordRequest(key, windowMs);

    if (!result.allowed) {
      reply.header('Retry-After', result.info.retryAfter);
      reply.status(429).send({
        error: 'Too Many Requests',
        message,
        retryAfter: result.info.retryAfter,
      });
      throw new Error('Rate limit exceeded');
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HONO MIDDLEWARE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

interface HonoContext {
  req: {
    header: (name: string) => string | undefined;
  };
  header: (name: string, value: string) => void;
  json: (data: unknown, status?: number) => Response;
}

/**
 * Create a rate limiting middleware for Hono
 */
export function createHonoRateLimiter(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyPrefix = 'ratelimit',
    message = 'Too many requests, please try again later.',
    skip,
  } = options;

  // Start cleanup on first use
  startCleanup();

  return async function honoRateLimitMiddleware(
    c: HonoContext,
    next: () => Promise<void>
  ): Promise<Response | undefined> {
    // Skip if skip function returns true
    if (skip?.(c)) {
      return next();
    }

    // Extract IP from Hono request headers
    const identifier =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';
    const key = `${keyPrefix}:${identifier}`;

    // Check current state
    const result = checkRateLimit(key, max, windowMs);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(result.info.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.info.resetAt / 1000)));

    // Record this request
    recordRequest(key, windowMs);

    if (!result.allowed) {
      c.header('Retry-After', String(result.info.retryAfter));
      return c.json(
        {
          error: 'Too Many Requests',
          message,
          retryAfter: result.info.retryAfter,
        },
        429
      );
    }

    return next();
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
export function createCompositeRateLimiter(limiters: ReturnType<typeof createRateLimiter>[]) {
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
export function getRateLimitInfo(key: string, max: number, windowMs: number): RateLimitInfo {
  return checkRateLimit(key, max, windowMs).info;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const RateLimit = {
  create: createRateLimiter,
  createHono: createHonoRateLimiter,
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

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY RATE LIMIT PLUGIN CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Service type presets for @fastify/rate-limit configuration.
 * Use these with the getFastifyRateLimitConfig() helper.
 */
export type ServiceRateLimitType =
  | 'public-api'
  | 'internal-api'
  | 'auth-service'
  | 'ai-service'
  | 'data-ingestion'
  | 'messaging'
  | 'analytics'
  | 'search'
  | 'content'
  | 'billing';

/**
 * Configuration for @fastify/rate-limit plugin.
 * Compatible with @fastify/rate-limit@^9.x
 */
export interface FastifyRateLimitConfig {
  global: boolean;
  max: number;
  timeWindow: string;
  keyGenerator: (request: unknown) => string;
  errorResponseBuilder: (
    request: unknown,
    context: { after: string; max: number; ttl: number }
  ) => Record<string, unknown>;
  allowList: (request: unknown) => boolean;
}

/**
 * Service type configurations for rate limiting
 */
const SERVICE_RATE_LIMIT_CONFIGS: Record<
  ServiceRateLimitType,
  { max: number; timeWindow: string; message: string }
> = {
  'public-api': {
    max: 100,
    timeWindow: '1 minute',
    message: 'Rate limit exceeded. Please try again later.',
  },
  'internal-api': {
    max: 500,
    timeWindow: '1 minute',
    message: 'Internal rate limit exceeded.',
  },
  'auth-service': {
    max: 20,
    timeWindow: '1 minute',
    message: 'Too many authentication requests. Please try again later.',
  },
  'ai-service': {
    max: 30,
    timeWindow: '1 minute',
    message: 'AI request rate limit exceeded. Please wait before making more AI requests.',
  },
  'data-ingestion': {
    max: 500,
    timeWindow: '1 minute',
    message: 'Data ingestion rate limit exceeded.',
  },
  messaging: {
    max: 60,
    timeWindow: '1 minute',
    message: 'Messaging rate limit exceeded. Please slow down.',
  },
  analytics: {
    max: 200,
    timeWindow: '1 minute',
    message: 'Analytics rate limit exceeded.',
  },
  search: {
    max: 60,
    timeWindow: '1 minute',
    message: 'Search rate limit exceeded. Please slow down.',
  },
  content: {
    max: 100,
    timeWindow: '1 minute',
    message: 'Content rate limit exceeded.',
  },
  billing: {
    max: 50,
    timeWindow: '1 minute',
    message: 'Billing rate limit exceeded. Please try again later.',
  },
};

/**
 * Standard key generator for Fastify rate limiting.
 * Uses tenant + user for rate limiting, falls back to IP.
 */
export function createStandardKeyGenerator(prefix: string) {
  return (request: unknown): string => {
    const req = request as {
      tenantId?: string;
      userId?: string;
      user?: { id?: string; tenantId?: string };
      headers?: Record<string, HeaderValue>;
      ip?: string;
    };

    const tenantId = req.tenantId ?? req.user?.tenantId ?? req.headers?.['x-tenant-id'];
    const userId = req.userId ?? req.user?.id ?? req.headers?.['x-user-id'];

    if (tenantId && userId) return `${prefix}:${tenantId}:${userId}`;
    if (tenantId) return `${prefix}:${tenantId}`;
    if (userId) return `${prefix}:user:${userId}`;

    // Fall back to IP
    const forwardedFor = req.headers?.['x-forwarded-for'];
    const ip = extractForwardedIp(forwardedFor) ?? req.ip;

    return `${prefix}:ip:${ip ?? 'unknown'}`;
  };
}

/**
 * Standard error response builder for Fastify rate limiting.
 */
export function createStandardErrorBuilder(customMessage?: string) {
  return (
    _request: unknown,
    context: { after: string; max: number; ttl: number }
  ): Record<string, unknown> => ({
    error: 'Too Many Requests',
    message: customMessage ?? 'Rate limit exceeded. Please try again later.',
    retryAfter: context.after,
    limit: context.max,
  });
}

/**
 * Standard allow list for Fastify rate limiting.
 * Skips health checks and internal endpoints.
 */
export function createStandardAllowList(additionalPaths: string[] = []) {
  const skipPaths = new Set([
    '/health',
    '/ready',
    '/healthz',
    '/readyz',
    '/livez',
    '/metrics',
    ...additionalPaths,
  ]);

  return (request: unknown): boolean => {
    const req = request as {
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
    };
    const url = req.url?.split('?')[0] ?? '';

    // Skip health/ready endpoints
    if (skipPaths.has(url)) return true;

    // Skip internal endpoints
    if (url.startsWith('/internal/')) return true;

    // Skip requests with internal header
    if (req.headers?.['x-internal'] === 'true') return true;

    return false;
  };
}

export interface FastifyRateLimitOptions {
  /** Service type preset */
  serviceType: ServiceRateLimitType;
  /** Service name for key prefix */
  serviceName: string;
  /** Override max requests (optional) */
  max?: number;
  /** Override time window (optional) */
  timeWindow?: string;
  /** Override error message (optional) */
  message?: string;
  /** Additional paths to skip rate limiting */
  additionalSkipPaths?: string[];
  /** Custom key generator (optional) */
  keyGenerator?: (request: unknown) => string;
  /** Whether to apply globally (default: true) */
  global?: boolean;
}

/**
 * Get a complete @fastify/rate-limit configuration for a service.
 *
 * @example
 * ```typescript
 * import rateLimit from '@fastify/rate-limit';
 * import { getFastifyRateLimitConfig } from '@aivo/ts-api-utils';
 *
 * // Simple usage with preset
 * await app.register(rateLimit, getFastifyRateLimitConfig({
 *   serviceType: 'public-api',
 *   serviceName: 'my-service',
 * }));
 *
 * // With overrides
 * await app.register(rateLimit, getFastifyRateLimitConfig({
 *   serviceType: 'ai-service',
 *   serviceName: 'ai-orchestrator',
 *   max: 20,
 *   message: 'Custom message',
 * }));
 * ```
 */
export function getFastifyRateLimitConfig(
  options: FastifyRateLimitOptions
): FastifyRateLimitConfig {
  const {
    serviceType,
    serviceName,
    max,
    timeWindow,
    message,
    additionalSkipPaths = [],
    keyGenerator,
    global = true,
  } = options;

  const preset = SERVICE_RATE_LIMIT_CONFIGS[serviceType];

  return {
    global,
    max: max ?? preset.max,
    timeWindow: timeWindow ?? preset.timeWindow,
    keyGenerator: keyGenerator ?? createStandardKeyGenerator(serviceName),
    errorResponseBuilder: createStandardErrorBuilder(message ?? preset.message),
    allowList: createStandardAllowList(additionalSkipPaths),
  };
}

/**
 * Quick helper to get rate limit config for common service types.
 */
export const FastifyRateLimitPresets = {
  /** Public-facing API service: 100 req/min */
  publicApi: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'public-api', serviceName, ...overrides }),

  /** Internal API service: 500 req/min */
  internalApi: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'internal-api', serviceName, ...overrides }),

  /** Auth service: 20 req/min (strict) */
  authService: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'auth-service', serviceName, ...overrides }),

  /** AI/ML service: 30 req/min (expensive operations) */
  aiService: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'ai-service', serviceName, ...overrides }),

  /** High-throughput data ingestion: 500 req/min */
  dataIngestion: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'data-ingestion', serviceName, ...overrides }),

  /** Messaging service: 60 req/min */
  messaging: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'messaging', serviceName, ...overrides }),

  /** Analytics service: 200 req/min */
  analytics: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'analytics', serviceName, ...overrides }),

  /** Search service: 60 req/min */
  search: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'search', serviceName, ...overrides }),

  /** Content service: 100 req/min */
  content: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'content', serviceName, ...overrides }),

  /** Billing service: 50 req/min */
  billing: (serviceName: string, overrides?: Partial<FastifyRateLimitOptions>) =>
    getFastifyRateLimitConfig({ serviceType: 'billing', serviceName, ...overrides }),
};
