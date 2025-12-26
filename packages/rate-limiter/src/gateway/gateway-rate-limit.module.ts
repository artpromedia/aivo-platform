/**
 * API Gateway Rate Limit Integration
 *
 * This module provides integration with the API Gateway for centralized
 * rate limiting across all microservices.
 *
 * @example
 * ```typescript
 * // In your API Gateway or any NestJS service
 * import { GatewayRateLimitModule } from '@aivo/rate-limiter/gateway';
 *
 * @Module({
 *   imports: [
 *     GatewayRateLimitModule.forRoot({
 *       redis: redisClient,
 *       loadFromDatabase: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import { DynamicModule, Module, Global, OnModuleInit, Inject } from '@nestjs/common';
import { RateLimiter, defaultTiers, defaultRules } from '../rate-limiter';
import { RedisStore } from '../stores/redis-store';
import { MemoryStore } from '../stores/memory-store';
import { CircuitBreaker } from '../circuit-breaker';
import { PriorityQueue } from '../priority-queue';
import { QuotaManager } from '../quota-manager';
import { createLogger } from '../logger';
import type Redis from 'ioredis';

export const GATEWAY_RATE_LIMITER = 'GATEWAY_RATE_LIMITER';
export const GATEWAY_CIRCUIT_BREAKER = 'GATEWAY_CIRCUIT_BREAKER';
export const GATEWAY_PRIORITY_QUEUE = 'GATEWAY_PRIORITY_QUEUE';
export const GATEWAY_QUOTA_MANAGER = 'GATEWAY_QUOTA_MANAGER';
export const GATEWAY_OPTIONS = 'GATEWAY_OPTIONS';

export interface GatewayRateLimitOptions {
  /** Redis client for distributed rate limiting */
  redis?: Redis;
  /** Custom tiers (defaults to defaultTiers) */
  tiers?: Record<string, any>;
  /** Custom rules (defaults to defaultRules) */
  rules?: any[];
  /** Whether to load rules from database */
  loadFromDatabase?: boolean;
  /** Prisma client for loading rules */
  prisma?: any;
  /** IPs that bypass rate limiting */
  bypassIPs?: string[];
  /** API keys that bypass rate limiting */
  bypassApiKeys?: string[];
  /** Enable debug logging */
  debug?: boolean;
  /** Circuit breaker configuration */
  circuitBreaker?: {
    enabled?: boolean;
    failureThreshold?: number;
    resetTimeout?: number;
  };
  /** Priority queue configuration */
  priorityQueue?: {
    enabled?: boolean;
    maxSize?: number;
    processInterval?: number;
  };
  /** Quota manager configuration */
  quotaManager?: {
    enabled?: boolean;
    quotas?: Record<string, any>;
  };
}

@Global()
@Module({})
export class GatewayRateLimitModule {
  static forRoot(options: GatewayRateLimitOptions = {}): DynamicModule {
    const providers = [
      {
        provide: GATEWAY_OPTIONS,
        useValue: options,
      },
      {
        provide: GATEWAY_RATE_LIMITER,
        useFactory: () => {
          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new RateLimiter({
            store,
            tiers: options.tiers ?? defaultTiers,
            rules: options.rules ?? defaultRules,
            bypassIPs: options.bypassIPs,
            bypassApiKeys: options.bypassApiKeys,
            debug: options.debug,
            logger: options.debug ? createLogger() : undefined,
          });
        },
      },
      {
        provide: GATEWAY_CIRCUIT_BREAKER,
        useFactory: () => {
          if (options.circuitBreaker?.enabled === false) {
            return null;
          }

          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new CircuitBreaker({
            name: 'api-gateway',
            store,
            failureThreshold: options.circuitBreaker?.failureThreshold ?? 5,
            resetTimeout: options.circuitBreaker?.resetTimeout ?? 30000,
            logger: options.debug ? createLogger() : undefined,
          });
        },
      },
      {
        provide: GATEWAY_PRIORITY_QUEUE,
        useFactory: () => {
          if (options.priorityQueue?.enabled === false) {
            return null;
          }

          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new PriorityQueue({
            name: 'api-gateway-queue',
            store,
            maxSize: options.priorityQueue?.maxSize ?? 10000,
            processInterval: options.priorityQueue?.processInterval ?? 100,
            logger: options.debug ? createLogger() : undefined,
          });
        },
      },
      {
        provide: GATEWAY_QUOTA_MANAGER,
        useFactory: () => {
          if (options.quotaManager?.enabled === false) {
            return null;
          }

          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new QuotaManager({
            store,
            quotas: options.quotaManager?.quotas ?? {
              'ai-requests': { daily: 100, monthly: 2000 },
              'file-uploads': { daily: 50, monthly: 500 },
              'exports': { daily: 10, monthly: 100 },
            },
            logger: options.debug ? createLogger() : undefined,
          });
        },
      },
    ];

    return {
      module: GatewayRateLimitModule,
      global: true,
      providers,
      exports: [
        GATEWAY_RATE_LIMITER,
        GATEWAY_CIRCUIT_BREAKER,
        GATEWAY_PRIORITY_QUEUE,
        GATEWAY_QUOTA_MANAGER,
        GATEWAY_OPTIONS,
      ],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<GatewayRateLimitOptions> | GatewayRateLimitOptions;
  }): DynamicModule {
    const { imports = [], inject = [], useFactory } = options;

    const providers = [
      {
        provide: GATEWAY_OPTIONS,
        inject,
        useFactory,
      },
      {
        provide: GATEWAY_RATE_LIMITER,
        inject: [GATEWAY_OPTIONS],
        useFactory: (options: GatewayRateLimitOptions) => {
          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new RateLimiter({
            store,
            tiers: options.tiers ?? defaultTiers,
            rules: options.rules ?? defaultRules,
            bypassIPs: options.bypassIPs,
            bypassApiKeys: options.bypassApiKeys,
            debug: options.debug,
          });
        },
      },
      {
        provide: GATEWAY_CIRCUIT_BREAKER,
        inject: [GATEWAY_OPTIONS],
        useFactory: (options: GatewayRateLimitOptions) => {
          if (options.circuitBreaker?.enabled === false) {
            return null;
          }

          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new CircuitBreaker({
            name: 'api-gateway',
            store,
            failureThreshold: options.circuitBreaker?.failureThreshold ?? 5,
            resetTimeout: options.circuitBreaker?.resetTimeout ?? 30000,
          });
        },
      },
      {
        provide: GATEWAY_PRIORITY_QUEUE,
        inject: [GATEWAY_OPTIONS],
        useFactory: (options: GatewayRateLimitOptions) => {
          if (options.priorityQueue?.enabled === false) {
            return null;
          }

          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new PriorityQueue({
            name: 'api-gateway-queue',
            store,
            maxSize: options.priorityQueue?.maxSize ?? 10000,
            processInterval: options.priorityQueue?.processInterval ?? 100,
          });
        },
      },
      {
        provide: GATEWAY_QUOTA_MANAGER,
        inject: [GATEWAY_OPTIONS],
        useFactory: (options: GatewayRateLimitOptions) => {
          if (options.quotaManager?.enabled === false) {
            return null;
          }

          const store = options.redis
            ? new RedisStore(options.redis)
            : new MemoryStore();

          return new QuotaManager({
            store,
            quotas: options.quotaManager?.quotas ?? {
              'ai-requests': { daily: 100, monthly: 2000 },
              'file-uploads': { daily: 50, monthly: 500 },
              'exports': { daily: 10, monthly: 100 },
            },
          });
        },
      },
    ];

    return {
      module: GatewayRateLimitModule,
      global: true,
      imports,
      providers,
      exports: [
        GATEWAY_RATE_LIMITER,
        GATEWAY_CIRCUIT_BREAKER,
        GATEWAY_PRIORITY_QUEUE,
        GATEWAY_QUOTA_MANAGER,
        GATEWAY_OPTIONS,
      ],
    };
  }
}
