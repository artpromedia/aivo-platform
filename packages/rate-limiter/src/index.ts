/**
 * @aivo/rate-limiter - Distributed Rate Limiting Library
 *
 * Provides:
 * - Multiple rate limiting algorithms
 * - Redis-backed distributed limiting
 * - Sliding window, token bucket, fixed window, leaky bucket
 * - Configurable tiers and quotas
 * - Standard rate limit headers
 * - Circuit breaker pattern
 * - Priority queue for request scheduling
 */

// Core
export { RateLimiter, defaultTiers, defaultRules } from './rate-limiter';
export type { RateLimiterConfig } from './rate-limiter';

// Algorithms
export {
  TokenBucket,
  SlidingWindow,
  FixedWindow,
  LeakyBucket,
  AdaptiveRateLimiter,
  createAlgorithm,
  type AlgorithmType,
} from './algorithms';

// Middleware
export {
  createRateLimitMiddleware,
  expressRateLimitMiddleware,
  createThrottleMiddleware,
  throttle,
  type RateLimitMiddlewareOptions,
  type ThrottleOptions,
} from './middleware';

// Decorators
export {
  RateLimit,
  Throttle,
  SkipRateLimit,
  RateLimitByUser,
  RateLimitByIP,
  RateLimitByTenant,
  RateLimitByApiKey,
  StrictRateLimit,
  BurstRateLimit,
  RATE_LIMIT_KEY,
  RATE_LIMIT_SKIP_KEY,
  THROTTLE_KEY,
  type RateLimitDecoratorOptions,
} from './decorators';

// NestJS Integration
export {
  RateLimitModule,
  RateLimitGuard,
  RateLimitExceededException,
  RATE_LIMITER,
  RATE_LIMIT_OPTIONS,
  type RateLimitModuleOptions,
  type RateLimitModuleAsyncOptions,
} from './nestjs';

// Circuit Breaker
export { CircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';
export type { CircuitBreakerOptions } from './circuit-breaker';

// Priority Queue
export { PriorityQueue } from './priority-queue';
export type { PriorityQueueOptions, QueueItem } from './priority-queue';

// Quota Manager
export { QuotaManager } from './quota-manager';
export type { QuotaManagerOptions, QuotaDefinition, QuotaCheckResult } from './quota-manager';

// Stores
export { RedisStore } from './stores/redis-store';
export { MemoryStore } from './stores/memory-store';
export type { RateLimitStore } from './stores/types';

// Types
export * from './types';

// Logger
export {
  RateLimiterLogger,
  createLogger,
  noopLogger,
  setGlobalLogger,
} from './logger';

// Gateway Integration
export {
  GatewayRateLimitModule,
  GatewayRateLimitGuard,
  GatewayRateLimitExceededException,
  QuotaExceededException,
  RateLimitAdminController,
  GATEWAY_RATE_LIMITER,
  GATEWAY_CIRCUIT_BREAKER,
  GATEWAY_PRIORITY_QUEUE,
  GATEWAY_QUOTA_MANAGER,
  GATEWAY_OPTIONS,
  type GatewayRateLimitOptions,
} from './gateway';
