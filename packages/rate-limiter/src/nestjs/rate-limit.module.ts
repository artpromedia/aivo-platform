/**
 * NestJS Rate Limit Module
 *
 * Provides rate limiting integration for NestJS applications.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     RateLimitModule.forRoot({
 *       store: new RedisStore(redis),
 *       tiers: defaultTiers,
 *       rules: defaultRules,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import { DynamicModule, Module, Global, Provider } from '@nestjs/common';
import { RateLimiter, RateLimiterConfig } from '../rate-limiter';
import { RateLimitStore } from '../stores/types';
import { MemoryStore } from '../stores/memory-store';
import { RedisStore } from '../stores/redis-store';
import type Redis from 'ioredis';

export const RATE_LIMITER = 'RATE_LIMITER';
export const RATE_LIMIT_OPTIONS = 'RATE_LIMIT_OPTIONS';

export interface RateLimitModuleOptions extends RateLimiterConfig {
  /** If true, the module will be global */
  isGlobal?: boolean;
}

export interface RateLimitModuleAsyncOptions {
  /** If true, the module will be global */
  isGlobal?: boolean;
  /** Imports for the module */
  imports?: any[];
  /** Inject tokens for the factory */
  inject?: any[];
  /** Factory function to create options */
  useFactory: (...args: any[]) => Promise<RateLimiterConfig> | RateLimiterConfig;
}

@Global()
@Module({})
export class RateLimitModule {
  /**
   * Register the module with static configuration
   */
  static forRoot(options: RateLimitModuleOptions = {}): DynamicModule {
    const { isGlobal = true, ...rateLimiterConfig } = options;

    const rateLimiterProvider: Provider = {
      provide: RATE_LIMITER,
      useFactory: () => {
        return new RateLimiter(rateLimiterConfig);
      },
    };

    const optionsProvider: Provider = {
      provide: RATE_LIMIT_OPTIONS,
      useValue: rateLimiterConfig,
    };

    return {
      module: RateLimitModule,
      global: isGlobal,
      providers: [rateLimiterProvider, optionsProvider],
      exports: [RATE_LIMITER, RATE_LIMIT_OPTIONS],
    };
  }

  /**
   * Register the module with async configuration
   */
  static forRootAsync(options: RateLimitModuleAsyncOptions): DynamicModule {
    const { isGlobal = true, imports = [], inject = [], useFactory } = options;

    const rateLimiterProvider: Provider = {
      provide: RATE_LIMITER,
      inject: inject,
      useFactory: async (...args: any[]) => {
        const config = await useFactory(...args);
        return new RateLimiter(config);
      },
    };

    const optionsProvider: Provider = {
      provide: RATE_LIMIT_OPTIONS,
      inject: inject,
      useFactory: async (...args: any[]) => {
        return await useFactory(...args);
      },
    };

    return {
      module: RateLimitModule,
      global: isGlobal,
      imports: imports,
      providers: [rateLimiterProvider, optionsProvider],
      exports: [RATE_LIMITER, RATE_LIMIT_OPTIONS],
    };
  }

  /**
   * Register with Redis
   */
  static forRedis(
    redisClient: Redis,
    options: Omit<RateLimitModuleOptions, 'store'> = {}
  ): DynamicModule {
    const store = new RedisStore(redisClient);
    return this.forRoot({ ...options, store });
  }

  /**
   * Register with memory store (for development/testing)
   */
  static forMemory(
    options: Omit<RateLimitModuleOptions, 'store'> = {}
  ): DynamicModule {
    const store = new MemoryStore();
    return this.forRoot({ ...options, store });
  }
}
