/**
 * Rate Limiter
 *
 * The main entry point for rate limiting. Supports multiple algorithms,
 * tiered limits, and flexible configuration.
 *
 * @example
 * ```typescript
 * const rateLimiter = new RateLimiter({
 *   store: new RedisStore(redisClient),
 *   defaultAlgorithm: 'sliding-window',
 *   tiers: defaultTiers,
 *   rules: defaultRules,
 * });
 *
 * const result = await rateLimiter.check({
 *   key: 'user:123',
 *   tier: 'professional',
 *   endpoint: '/api/v1/content',
 *   method: 'POST',
 * });
 *
 * if (!result.allowed) {
 *   throw new RateLimitExceededError(result);
 * }
 * ```
 */

import type {
  AlgorithmType,
  SlidingWindow,
  TokenBucket,
  FixedWindow,
  LeakyBucket,
  AdaptiveRateLimiter,
} from './algorithms';
import { createAlgorithm } from './algorithms';
import type { RateLimiterLogger } from './logger';
import { noopLogger, createLogger } from './logger';
import { MemoryStore } from './stores/memory-store';
import type { RateLimitStore } from './stores/types';
import type {
  RateLimitResult,
  RateLimitContext,
  RateLimitRule,
  RateLimitTier,
  RateLimitMatch,
  RateLimitHeaders,
  RateLimitScope,
} from './types';

/**
 * Normalize algorithm name to hyphenated format (AlgorithmType)
 */
function normalizeAlgorithmType(algorithm: string): AlgorithmType {
  const mapping: Record<string, AlgorithmType> = {
    token_bucket: 'token-bucket',
    sliding_window: 'sliding-window',
    fixed_window: 'fixed-window',
    leaky_bucket: 'leaky-bucket',
    'token-bucket': 'token-bucket',
    'sliding-window': 'sliding-window',
    'fixed-window': 'fixed-window',
    'leaky-bucket': 'leaky-bucket',
    adaptive: 'adaptive',
  };
  return mapping[algorithm] ?? 'sliding-window';
}

/**
 * Convert scope to array format for iteration
 */
function getScopeArray(scope: RateLimitScope | undefined): string[] {
  if (!scope) {
    return ['user'];
  }
  if (Array.isArray(scope)) {
    return scope;
  }
  return [scope.type];
}

export interface RateLimiterConfig {
  /** Storage backend for rate limit data */
  store?: RateLimitStore;
  /** Default algorithm to use */
  defaultAlgorithm?: AlgorithmType;
  /** Rate limit tiers */
  tiers?: Record<string, RateLimitTier>;
  /** Rate limit rules */
  rules?: RateLimitRule[];
  /** Default limits if no rule matches */
  defaultLimits?: {
    limit: number;
    windowSeconds: number;
  };
  /** Logger instance */
  logger?: RateLimiterLogger;
  /** Enable detailed logging */
  debug?: boolean;
  /** Key prefix for all rate limit keys */
  keyPrefix?: string;
  /** Admin/internal IP addresses to bypass rate limiting */
  bypassIPs?: string[];
  /** API keys that bypass rate limiting */
  bypassApiKeys?: string[];
  /** Whether to fail open (allow requests) if the store is unavailable */
  failOpen?: boolean;
}

/**
 * Default tier configurations
 */
export const defaultTiers: Record<string, RateLimitTier> = {
  free: {
    name: 'free',
    limits: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
      concurrentRequests: 5,
    },
    quotas: {
      daily: { limit: 10000, resetAt: 'midnight' },
      monthly: { limit: 100000, resetAt: 'first-of-month' },
    },
    priority: 1,
    features: [],
  },
  basic: {
    name: 'basic',
    limits: {
      requestsPerMinute: 300,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      burstLimit: 30,
      concurrentRequests: 10,
    },
    quotas: {
      daily: { limit: 100000, resetAt: 'midnight' },
      monthly: { limit: 1000000, resetAt: 'first-of-month' },
    },
    priority: 2,
    features: ['priority-queue'],
  },
  professional: {
    name: 'professional',
    limits: {
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
      requestsPerDay: 500000,
      burstLimit: 100,
      concurrentRequests: 25,
    },
    quotas: {
      daily: { limit: 500000, resetAt: 'midnight' },
      monthly: { limit: 5000000, resetAt: 'first-of-month' },
    },
    priority: 3,
    features: ['priority-queue', 'burst-handling'],
  },
  enterprise: {
    name: 'enterprise',
    limits: {
      requestsPerMinute: 5000,
      requestsPerHour: 250000,
      requestsPerDay: 2500000,
      burstLimit: 500,
      concurrentRequests: 100,
    },
    quotas: {
      daily: { limit: 2500000, resetAt: 'midnight' },
      monthly: { limit: 25000000, resetAt: 'first-of-month' },
    },
    priority: 4,
    features: ['priority-queue', 'burst-handling', 'dedicated-pool'],
  },
};

/**
 * Default rate limit rules
 */
export const defaultRules: RateLimitRule[] = [
  // Authentication endpoints - stricter limits
  {
    id: 'auth-login',
    match: { path: '/api/*/auth/login', method: 'POST' },
    limits: { limit: 5, windowSeconds: 60, burstLimit: 2 },
    algorithm: 'sliding-window',
    priority: 100,
    scope: ['ip'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Too many login attempts. Please try again later.',
    },
  },
  {
    id: 'auth-register',
    match: { path: '/api/*/auth/register', method: 'POST' },
    limits: { limit: 3, windowSeconds: 60, burstLimit: 1 },
    algorithm: 'sliding-window',
    priority: 100,
    scope: ['ip'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Too many registration attempts.',
    },
  },
  {
    id: 'auth-password-reset',
    match: { path: '/api/*/auth/password-reset', method: 'POST' },
    limits: { limit: 3, windowSeconds: 3600, burstLimit: 1 },
    algorithm: 'fixed-window',
    priority: 100,
    scope: ['ip', 'user'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Too many password reset requests.',
    },
  },

  // File upload endpoints
  {
    id: 'file-upload',
    match: { path: '/api/*/upload*', method: 'POST' },
    limits: { limit: 10, windowSeconds: 60, burstLimit: 5 },
    algorithm: 'token-bucket',
    priority: 90,
    scope: ['user', 'tenant'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Upload rate limit exceeded.',
    },
  },

  // AI/ML endpoints - expensive operations
  {
    id: 'ai-generate',
    match: { path: '/api/*/ai/*', method: 'POST' },
    limits: { limit: 20, windowSeconds: 60, burstLimit: 5 },
    algorithm: 'leaky-bucket',
    priority: 85,
    scope: ['user', 'tenant'],
    action: {
      type: 'queue',
      queueTimeout: 30000,
      message: 'AI request queued.',
    },
  },

  // Search endpoints
  {
    id: 'search',
    match: { path: '/api/*/search*' },
    limits: { limit: 30, windowSeconds: 60, burstLimit: 10 },
    algorithm: 'sliding-window',
    priority: 80,
    scope: ['user'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Search rate limit exceeded.',
    },
  },

  // Bulk/batch operations
  {
    id: 'bulk-operations',
    match: { path: '/api/*/bulk/*', method: 'POST' },
    limits: { limit: 5, windowSeconds: 60, burstLimit: 2 },
    algorithm: 'fixed-window',
    priority: 75,
    scope: ['user', 'tenant'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Bulk operation rate limit exceeded.',
    },
  },

  // Export endpoints
  {
    id: 'export',
    match: { path: '/api/*/export*', method: 'POST' },
    limits: { limit: 10, windowSeconds: 3600, burstLimit: 3 },
    algorithm: 'fixed-window',
    priority: 70,
    scope: ['user', 'tenant'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Export rate limit exceeded.',
    },
  },

  // Default API endpoints
  {
    id: 'api-default',
    match: { path: '/api/*' },
    limits: { limit: 100, windowSeconds: 60, burstLimit: 20 },
    algorithm: 'sliding-window',
    priority: 1,
    scope: ['user'],
    action: {
      type: 'reject',
      statusCode: 429,
      message: 'Rate limit exceeded.',
    },
  },
];

export class RateLimiter {
  private store: RateLimitStore;
  private algorithms: Map<AlgorithmType, ReturnType<typeof createAlgorithm>>;
  private defaultAlgorithm: AlgorithmType;
  private tiers: Record<string, RateLimitTier>;
  private rules: RateLimitRule[];
  private defaultLimits: { limit: number; windowSeconds: number };
  private logger: RateLimiterLogger;
  private keyPrefix: string;
  private bypassIPs: Set<string>;
  private bypassApiKeys: Set<string>;
  private failOpen: boolean;

  constructor(config: RateLimiterConfig = {}) {
    this.store = config.store ?? new MemoryStore();
    this.defaultAlgorithm = config.defaultAlgorithm ?? 'sliding-window';
    this.tiers = config.tiers ?? defaultTiers;
    this.rules = config.rules ?? defaultRules;
    this.defaultLimits = config.defaultLimits ?? {
      limit: 100,
      windowSeconds: 60,
    };
    this.logger = config.logger ?? (config.debug ? createLogger() : noopLogger);
    this.keyPrefix = config.keyPrefix ?? 'rl:';
    this.bypassIPs = new Set(config.bypassIPs ?? []);
    this.bypassApiKeys = new Set(config.bypassApiKeys ?? []);
    this.failOpen = config.failOpen ?? true;

    // Initialize algorithms
    this.algorithms = new Map();
    const algorithmTypes: AlgorithmType[] = [
      'sliding-window',
      'token-bucket',
      'fixed-window',
      'leaky-bucket',
      'adaptive',
    ];
    for (const type of algorithmTypes) {
      this.algorithms.set(type, createAlgorithm(type, this.store));
    }

    this.logger.debug('RateLimiter initialized', {
      defaultAlgorithm: this.defaultAlgorithm,
      tierCount: Object.keys(this.tiers).length,
      ruleCount: this.rules.length,
    });
  }

  /**
   * Check if a request is allowed
   */
  async check(context: RateLimitContext): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      // Check for bypass
      if (this.shouldBypass(context)) {
        return this.createBypassResult();
      }

      // Find matching rule
      const rule = this.findMatchingRule(context);
      if (!rule) {
        // Use default limits
        return this.checkWithDefaults(context);
      }

      // Get tier limits if applicable
      const tier = context.tier ? this.tiers[context.tier] : undefined;
      const limits = this.calculateEffectiveLimits(rule, tier);

      // Build the rate limit key
      const key = this.buildKey(context, rule);

      // Get the algorithm
      const rawAlgorithmType = rule.algorithm ?? this.defaultAlgorithm;
      const algorithmType = normalizeAlgorithmType(rawAlgorithmType);
      const algorithm = this.algorithms.get(algorithmType);

      if (!algorithm) {
        throw new Error(`Algorithm not found: ${algorithmType}`);
      }

      // Check rate limit
      const result = await this.executeCheck(
        algorithm,
        algorithmType,
        key,
        limits.limit,
        limits.windowSeconds,
        { burst: limits.burstLimit }
      );

      // Build full result
      const fullResult: RateLimitResult = {
        allowed: result.allowed,
        limit: limits.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.allowed ? undefined : this.calculateRetryAfter(result.reset),
        key,
        rule,
        tier: tier?.name,
        headers: this.buildHeaders(result, limits.limit, rule),
        action: result.allowed ? undefined : rule.action,
      };

      this.logger.debug('Rate limit check completed', {
        key,
        allowed: result.allowed,
        remaining: result.remaining,
        duration: Date.now() - startTime,
      });

      return fullResult;
    } catch (error) {
      this.logger.error('Rate limit check failed', { error: String(error) });

      // Fail open if configured
      if (this.failOpen) {
        return this.createBypassResult();
      }

      throw error;
    }
  }

  /**
   * Consume a request (increment counter)
   */
  async consume(context: RateLimitContext, cost = 1): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      // Check for bypass
      if (this.shouldBypass(context)) {
        return this.createBypassResult();
      }

      // Find matching rule
      const rule = this.findMatchingRule(context);
      if (!rule) {
        return this.consumeWithDefaults(context, cost);
      }

      // Get tier limits if applicable
      const tier = context.tier ? this.tiers[context.tier] : undefined;
      const limits = this.calculateEffectiveLimits(rule, tier);

      // Build the rate limit key
      const key = this.buildKey(context, rule);

      // Get the algorithm
      const rawAlgorithmType = rule.algorithm ?? this.defaultAlgorithm;
      const algorithmType = normalizeAlgorithmType(rawAlgorithmType);
      const algorithm = this.algorithms.get(algorithmType);

      if (!algorithm) {
        throw new Error(`Algorithm not found: ${algorithmType}`);
      }

      // Consume
      const result = await this.executeConsume(
        algorithm,
        algorithmType,
        key,
        cost,
        limits.limit,
        limits.windowSeconds,
        { burst: limits.burstLimit }
      );

      // Build full result
      const fullResult: RateLimitResult = {
        allowed: result.allowed,
        limit: limits.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.allowed ? undefined : this.calculateRetryAfter(result.reset),
        key,
        rule,
        tier: tier?.name,
        headers: this.buildHeaders(result, limits.limit, rule),
        action: result.allowed ? undefined : rule.action,
      };

      this.logger.debug('Rate limit consume completed', {
        key,
        cost,
        allowed: result.allowed,
        remaining: result.remaining,
        duration: Date.now() - startTime,
      });

      return fullResult;
    } catch (error) {
      this.logger.error('Rate limit consume failed', { error: String(error) });

      if (this.failOpen) {
        return this.createBypassResult();
      }

      throw error;
    }
  }

  /**
   * Check if the request should bypass rate limiting
   */
  private shouldBypass(context: RateLimitContext): boolean {
    // Check bypass IP
    if (context.ip && this.bypassIPs.has(context.ip)) {
      this.logger.debug('Bypassing rate limit for IP', { ip: context.ip });
      return true;
    }

    // Check bypass API key
    if (context.apiKey && this.bypassApiKeys.has(context.apiKey)) {
      this.logger.debug('Bypassing rate limit for API key');
      return true;
    }

    // Check internal flag
    if (context.isInternal) {
      this.logger.debug('Bypassing rate limit for internal request');
      return true;
    }

    return false;
  }

  /**
   * Create a bypass result (always allowed)
   */
  private createBypassResult(): RateLimitResult {
    return {
      allowed: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now() + 60000,
      key: 'bypass',
      headers: {
        'X-RateLimit-Limit': 'unlimited',
        'X-RateLimit-Remaining': 'unlimited',
        'X-RateLimit-Reset': String(Math.floor((Date.now() + 60000) / 1000)),
      },
    };
  }

  /**
   * Find the matching rule for a context
   */
  private findMatchingRule(context: RateLimitContext): RateLimitRule | undefined {
    // Sort rules by priority (highest first)
    const sortedRules = [...this.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const rule of sortedRules) {
      if (this.matchesRule(context, rule.match ?? {})) {
        this.logger.debug('Found matching rule', { ruleId: rule.id });
        return rule;
      }
    }

    return undefined;
  }

  /**
   * Check if context matches a rule
   */
  private matchesRule(context: RateLimitContext, match: RateLimitMatch): boolean {
    // Check path
    if (match.path && context.endpoint) {
      if (!this.matchPath(context.endpoint, match.path)) {
        return false;
      }
    }

    // Check method
    if (match.method && context.method) {
      const methods = Array.isArray(match.method) ? match.method : [match.method];
      if (!methods.includes(context.method.toUpperCase())) {
        return false;
      }
    }

    // Check tier
    if (match.tier && context.tier) {
      const tiers = Array.isArray(match.tier) ? match.tier : [match.tier];
      if (!tiers.includes(context.tier)) {
        return false;
      }
    }

    // Check tenant
    if (match.tenant && context.tenantId) {
      const tenants = Array.isArray(match.tenant) ? match.tenant : [match.tenant];
      if (!tenants.includes(context.tenantId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match a path against a pattern (supports * wildcards)
   */
  private matchPath(path: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  /**
   * Calculate effective limits based on rule and tier
   */
  private calculateEffectiveLimits(
    rule: RateLimitRule,
    tier?: RateLimitTier
  ): { limit: number; windowSeconds: number; burstLimit?: number } {
    // Use rule.limits if available, otherwise fall back to defaults
    const ruleLimits = rule.limits ?? {
      limit: rule.limit ?? this.defaultLimits.limit,
      windowSeconds: rule.window ?? this.defaultLimits.windowSeconds,
      burstLimit: rule.burst,
    };

    let limit = ruleLimits.limit;
    const windowSeconds = ruleLimits.windowSeconds;
    let burstLimit = ruleLimits.burstLimit;

    // Apply tier multipliers if available
    if (tier) {
      // Scale limit based on tier's per-minute rate
      const tierMultiplier = tier.limits.requestsPerMinute / 60;
      limit = Math.max(1, Math.floor(limit * ((tierMultiplier / 100) * 60)));

      if (burstLimit) {
        burstLimit = Math.max(1, Math.floor(burstLimit * (tier.limits.burstLimit / 10)));
      }
    }

    return { limit, windowSeconds, burstLimit };
  }

  /**
   * Build the rate limit key
   */
  private buildKey(context: RateLimitContext, rule: RateLimitRule): string {
    const parts: string[] = [this.keyPrefix, rule.id];

    // Add scope-based parts
    const scopes = getScopeArray(rule.scope);
    for (const scope of scopes) {
      switch (scope) {
        case 'user':
          if (context.userId) {
            parts.push(`u:${context.userId}`);
          }
          break;
        case 'ip':
          if (context.ip) {
            parts.push(`ip:${context.ip}`);
          }
          break;
        case 'apiKey':
          if (context.apiKey) {
            parts.push(`ak:${context.apiKey}`);
          }
          break;
        case 'tenant':
          if (context.tenantId) {
            parts.push(`t:${context.tenantId}`);
          }
          break;
        case 'endpoint':
          if (context.endpoint) {
            parts.push(`e:${context.endpoint}`);
          }
          break;
        case 'global':
          parts.push('global');
          break;
      }
    }

    // If no identifiable parts, use IP or global
    if (parts.length === 2) {
      if (context.ip) {
        parts.push(`ip:${context.ip}`);
      } else {
        parts.push('anon');
      }
    }

    return parts.join(':');
  }

  /**
   * Execute a check on an algorithm
   */
  private async executeCheck(
    algorithm: ReturnType<typeof createAlgorithm>,
    type: AlgorithmType,
    key: string,
    limit: number,
    windowSeconds: number,
    options?: { burst?: number }
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    switch (type) {
      case 'sliding-window':
        return (algorithm as SlidingWindow).check(key, limit, windowSeconds, options);
      case 'token-bucket': {
        // For token bucket, convert to capacity/refill rate
        const refillRate = limit / windowSeconds;
        return (algorithm as TokenBucket).check(key, limit, refillRate, options);
      }
      case 'fixed-window':
        return (algorithm as FixedWindow).check(key, limit, windowSeconds, options);
      case 'leaky-bucket': {
        const leakRate = limit / windowSeconds;
        return (algorithm as LeakyBucket).check(key, limit, leakRate, options);
      }
      case 'adaptive':
        return (algorithm as AdaptiveRateLimiter).check(key, limit, windowSeconds, options);
      default:
        throw new Error(`Unknown algorithm: ${type as string}`);
    }
  }

  /**
   * Execute a consume on an algorithm
   */
  private async executeConsume(
    algorithm: ReturnType<typeof createAlgorithm>,
    type: AlgorithmType,
    key: string,
    cost: number,
    limit: number,
    windowSeconds: number,
    options?: { burst?: number }
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    switch (type) {
      case 'sliding-window':
        return (algorithm as SlidingWindow).consume(key, cost, limit, windowSeconds, options);
      case 'token-bucket': {
        const refillRate = limit / windowSeconds;
        return (algorithm as TokenBucket).consume(key, cost, limit, refillRate, options);
      }
      case 'fixed-window':
        return (algorithm as FixedWindow).consume(key, cost, limit, windowSeconds, options);
      case 'leaky-bucket': {
        const leakRate = limit / windowSeconds;
        return (algorithm as LeakyBucket).consume(key, cost, limit, leakRate, options);
      }
      case 'adaptive':
        return (algorithm as AdaptiveRateLimiter).consume(key, cost, limit, windowSeconds, options);
      default:
        throw new Error(`Unknown algorithm: ${type as string}`);
    }
  }

  /**
   * Check with default limits
   */
  private async checkWithDefaults(context: RateLimitContext): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}default:${context.userId ?? context.ip ?? 'anon'}`;
    const algorithm = this.algorithms.get(this.defaultAlgorithm) as SlidingWindow;

    const result = await algorithm.check(
      key,
      this.defaultLimits.limit,
      this.defaultLimits.windowSeconds
    );

    return {
      allowed: result.allowed,
      limit: this.defaultLimits.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.allowed ? undefined : this.calculateRetryAfter(result.reset),
      key,
      headers: this.buildHeaders(result, this.defaultLimits.limit),
    };
  }

  /**
   * Consume with default limits
   */
  private async consumeWithDefaults(
    context: RateLimitContext,
    cost: number
  ): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}default:${context.userId ?? context.ip ?? 'anon'}`;
    const algorithm = this.algorithms.get(this.defaultAlgorithm) as SlidingWindow;

    const result = await algorithm.consume(
      key,
      cost,
      this.defaultLimits.limit,
      this.defaultLimits.windowSeconds
    );

    return {
      allowed: result.allowed,
      limit: this.defaultLimits.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.allowed ? undefined : this.calculateRetryAfter(result.reset),
      key,
      headers: this.buildHeaders(result, this.defaultLimits.limit),
    };
  }

  /**
   * Calculate retry-after in seconds
   */
  private calculateRetryAfter(reset: number): number {
    return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  }

  /**
   * Build rate limit headers
   */
  private buildHeaders(
    result: { remaining: number; reset: number },
    limit: number,
    rule?: RateLimitRule
  ): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
      'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
    };

    if (rule?.id) {
      headers['X-RateLimit-Policy'] = rule.id;
    }

    if (result.remaining <= 0) {
      headers['Retry-After'] = String(this.calculateRetryAfter(result.reset));
    }

    return headers;
  }

  /**
   * Add a rate limit rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.push(rule);
    this.logger.info('Added rate limit rule', { ruleId: rule.id });
  }

  /**
   * Remove a rate limit rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      this.logger.info('Removed rate limit rule', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Add a bypass IP
   */
  addBypassIP(ip: string): void {
    this.bypassIPs.add(ip);
    this.logger.info('Added bypass IP', { ip });
  }

  /**
   * Remove a bypass IP
   */
  removeBypassIP(ip: string): boolean {
    const result = this.bypassIPs.delete(ip);
    if (result) {
      this.logger.info('Removed bypass IP', { ip });
    }
    return result;
  }

  /**
   * Add a bypass API key
   */
  addBypassApiKey(apiKey: string): void {
    this.bypassApiKeys.add(apiKey);
    this.logger.info('Added bypass API key');
  }

  /**
   * Remove a bypass API key
   */
  removeBypassApiKey(apiKey: string): boolean {
    const result = this.bypassApiKeys.delete(apiKey);
    if (result) {
      this.logger.info('Removed bypass API key');
    }
    return result;
  }

  /**
   * Get all rules
   */
  getRules(): RateLimitRule[] {
    return [...this.rules];
  }

  /**
   * Get all tiers
   */
  getTiers(): Record<string, RateLimitTier> {
    return { ...this.tiers };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    await this.store.delete(key);
    this.logger.info('Reset rate limit', { key });
  }

  /**
   * Get the underlying store
   */
  getStore(): RateLimitStore {
    return this.store;
  }
}
