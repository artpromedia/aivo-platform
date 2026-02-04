/* eslint-disable */
/**
 * Type declarations for @aivo/rate-limiter package
 * Provides type stubs until the package is built with proper declarations.
 */

declare module '@aivo/rate-limiter' {
  // ============================================================================
  // Store Types
  // ============================================================================

  export interface RateLimitStore {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttl?: number): Promise<void>;
    increment(key: string, ttl?: number): Promise<number>;
    reset(key: string): Promise<void>;
  }

  export class MemoryStore implements RateLimitStore {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttl?: number): Promise<void>;
    increment(key: string, ttl?: number): Promise<number>;
    reset(key: string): Promise<void>;
  }

  export class RedisStore implements RateLimitStore {
    constructor(options: { client: unknown; prefix?: string });
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttl?: number): Promise<void>;
    increment(key: string, ttl?: number): Promise<number>;
    reset(key: string): Promise<void>;
  }

  // ============================================================================
  // Circuit Breaker
  // ============================================================================

  export interface CircuitBreakerOptions {
    name: string;
    failureThreshold: number;
    successThreshold: number;
    resetTimeout: number;
    failureWindow?: number;
    store?: RateLimitStore;
    onOpen?: () => void;
    onClose?: () => void;
    onHalfOpen?: () => void;
    isFailure?: (error: Error) => boolean;
  }

  export class CircuitBreakerOpenError extends Error {
    constructor(message?: string);
  }

  export class CircuitBreaker {
    constructor(options: CircuitBreakerOptions);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    getState(): Promise<'closed' | 'open' | 'half-open'>;
    getStats(): Promise<{
      state: string;
      failures: number;
      successes: number;
      lastFailure?: Date;
    }>;
    reset(): Promise<void>;
  }

  // ============================================================================
  // Rate Limiter
  // ============================================================================

  export interface RateLimiterConfig {
    store: RateLimitStore;
    tiers?: Record<string, unknown>;
    rules?: unknown[];
  }

  export class RateLimiter {
    constructor(config: RateLimiterConfig);
    check(
      key: string,
      tier?: string
    ): Promise<{
      allowed: boolean;
      remaining: number;
      resetAt: number;
    }>;
    consume(key: string, tier?: string): Promise<void>;
  }

  export const defaultTiers: Record<string, unknown>;
  export const defaultRules: unknown[];

  // ============================================================================
  // Algorithms
  // ============================================================================

  export class TokenBucket {
    constructor(options: unknown);
  }

  export class SlidingWindow {
    constructor(options: unknown);
  }

  export class FixedWindow {
    constructor(options: unknown);
  }

  export class LeakyBucket {
    constructor(options: unknown);
  }

  export class AdaptiveRateLimiter {
    constructor(options: unknown);
  }

  export type AlgorithmType = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';
  export function createAlgorithm(type: AlgorithmType, options: unknown): unknown;

  // ============================================================================
  // Middleware
  // ============================================================================

  export interface RateLimitMiddlewareOptions {
    store: RateLimitStore;
    max?: number;
    windowMs?: number;
  }

  export interface ThrottleOptions {
    delay: number;
  }

  export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions): unknown;
  export function expressRateLimitMiddleware(options: RateLimitMiddlewareOptions): unknown;
  export function createThrottleMiddleware(options: ThrottleOptions): unknown;
  export function throttle(options: ThrottleOptions): unknown;

  // ============================================================================
  // Decorators
  // ============================================================================

  export interface RateLimitDecoratorOptions {
    max?: number;
    windowMs?: number;
    keyPrefix?: string;
  }

  export function RateLimit(options: RateLimitDecoratorOptions): MethodDecorator;
  export function Throttle(options: ThrottleOptions): MethodDecorator;
  export function SkipRateLimit(): MethodDecorator;
  export function RateLimitByUser(options?: RateLimitDecoratorOptions): MethodDecorator;
  export function RateLimitByIP(options?: RateLimitDecoratorOptions): MethodDecorator;
  export function RateLimitByTenant(options?: RateLimitDecoratorOptions): MethodDecorator;
  export function RateLimitByApiKey(options?: RateLimitDecoratorOptions): MethodDecorator;
  export function StrictRateLimit(options?: RateLimitDecoratorOptions): MethodDecorator;
  export function BurstRateLimit(options?: RateLimitDecoratorOptions): MethodDecorator;

  export const RATE_LIMIT_KEY: string;
  export const RATE_LIMIT_SKIP_KEY: string;
  export const THROTTLE_KEY: string;

  // ============================================================================
  // NestJS Integration
  // ============================================================================

  export class RateLimitModule {
    static forRoot(options: unknown): unknown;
    static forRootAsync(options: unknown): unknown;
  }

  export class RateLimitGuard {
    canActivate(context: unknown): Promise<boolean>;
  }

  export class RateLimitExceededException extends Error {
    constructor(message?: string);
  }

  export const RATE_LIMITER: string;
  export const RATE_LIMIT_OPTIONS: string;

  export interface RateLimitModuleOptions {
    store: RateLimitStore;
  }

  export interface RateLimitModuleAsyncOptions {
    useFactory: (...args: unknown[]) => Promise<RateLimitModuleOptions>;
    inject?: unknown[];
  }

  // ============================================================================
  // Priority Queue
  // ============================================================================

  export interface PriorityQueueOptions {
    maxSize?: number;
  }

  export interface QueueItem {
    priority: number;
    data: unknown;
  }

  export class PriorityQueue {
    constructor(options?: PriorityQueueOptions);
    enqueue(item: QueueItem): void;
    dequeue(): QueueItem | undefined;
    size(): number;
  }

  // ============================================================================
  // Quota Manager
  // ============================================================================

  export interface QuotaDefinition {
    name: string;
    limit: number;
    period: string;
  }

  export interface QuotaCheckResult {
    allowed: boolean;
    remaining: number;
    quota: QuotaDefinition;
  }

  export interface QuotaManagerOptions {
    store: RateLimitStore;
    quotas: QuotaDefinition[];
  }

  export class QuotaManager {
    constructor(options: QuotaManagerOptions);
    check(key: string, quotaName: string): Promise<QuotaCheckResult>;
    consume(key: string, quotaName: string): Promise<void>;
  }

  // ============================================================================
  // Logger
  // ============================================================================

  export interface Logger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  }

  export type RateLimiterLogger = Logger;

  export function createLogger(name: string): Logger;
  export const noopLogger: Logger;
  export function setGlobalLogger(logger: Logger): void;

  // ============================================================================
  // Gateway Integration
  // ============================================================================

  export class GatewayRateLimitModule {
    static forRoot(options: unknown): unknown;
  }

  export class GatewayRateLimitGuard {
    canActivate(context: unknown): Promise<boolean>;
  }

  export class GatewayRateLimitExceededException extends Error {}
  export class QuotaExceededException extends Error {}
  export class RateLimitAdminController {}

  export const GATEWAY_RATE_LIMITER: string;
  export const GATEWAY_CIRCUIT_BREAKER: string;
  export const GATEWAY_PRIORITY_QUEUE: string;
  export const GATEWAY_QUOTA_MANAGER: string;
  export const GATEWAY_OPTIONS: string;

  export interface GatewayRateLimitOptions {
    store: RateLimitStore;
  }
}
