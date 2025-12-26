/**
 * Rate Limit Decorators
 *
 * Decorators for NestJS controllers to apply rate limiting.
 */

import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import type { RateLimitRule } from '../types';
import { AlgorithmType } from '../algorithms';

// Metadata keys
export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip';
export const THROTTLE_KEY = 'throttle';

/**
 * Rate limit options for decorators
 */
export interface RateLimitDecoratorOptions {
  /** Maximum requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Burst limit (if applicable) */
  burstLimit?: number;
  /** Algorithm to use */
  algorithm?: AlgorithmType;
  /** Scopes for the rate limit */
  scope?: ('user' | 'ip' | 'apiKey' | 'tenant' | 'endpoint' | 'global')[];
  /** Custom key generator */
  keyGenerator?: string; // Name of method on controller
  /** Custom error message */
  message?: string;
  /** Skip condition method name */
  skipIf?: string;
}

/**
 * Apply rate limiting to a controller or handler
 *
 * @example
 * ```typescript
 * @RateLimit({ limit: 10, windowSeconds: 60 })
 * @Controller('api')
 * export class ApiController {
 *   @RateLimit({ limit: 5, windowSeconds: 60, algorithm: 'sliding-window' })
 *   @Post('expensive')
 *   async expensiveOperation() {}
 * }
 * ```
 */
export function RateLimit(options: RateLimitDecoratorOptions): MethodDecorator & ClassDecorator {
  return SetMetadata(RATE_LIMIT_KEY, options);
}

/**
 * Throttle decorator - shorthand for simple throttling
 *
 * @example
 * ```typescript
 * @Throttle(100, 60) // 100 requests per 60 seconds
 * @Get('data')
 * async getData() {}
 * ```
 */
export function Throttle(
  limit: number,
  windowSeconds: number
): MethodDecorator & ClassDecorator {
  return SetMetadata(THROTTLE_KEY, { limit, windowSeconds });
}

/**
 * Skip rate limiting for a handler
 *
 * @example
 * ```typescript
 * @SkipRateLimit()
 * @Get('health')
 * async healthCheck() {}
 * ```
 */
export function SkipRateLimit(): MethodDecorator & ClassDecorator {
  return SetMetadata(RATE_LIMIT_SKIP_KEY, true);
}

/**
 * Rate limit by user
 */
export function RateLimitByUser(
  limit: number,
  windowSeconds: number,
  options?: Partial<RateLimitDecoratorOptions>
): MethodDecorator & ClassDecorator {
  return RateLimit({
    limit,
    windowSeconds,
    scope: ['user'],
    ...options,
  });
}

/**
 * Rate limit by IP
 */
export function RateLimitByIP(
  limit: number,
  windowSeconds: number,
  options?: Partial<RateLimitDecoratorOptions>
): MethodDecorator & ClassDecorator {
  return RateLimit({
    limit,
    windowSeconds,
    scope: ['ip'],
    ...options,
  });
}

/**
 * Rate limit by tenant
 */
export function RateLimitByTenant(
  limit: number,
  windowSeconds: number,
  options?: Partial<RateLimitDecoratorOptions>
): MethodDecorator & ClassDecorator {
  return RateLimit({
    limit,
    windowSeconds,
    scope: ['tenant'],
    ...options,
  });
}

/**
 * Rate limit by API key
 */
export function RateLimitByApiKey(
  limit: number,
  windowSeconds: number,
  options?: Partial<RateLimitDecoratorOptions>
): MethodDecorator & ClassDecorator {
  return RateLimit({
    limit,
    windowSeconds,
    scope: ['apiKey'],
    ...options,
  });
}

/**
 * Strict rate limit for sensitive operations
 * Uses token bucket algorithm for smooth limiting
 */
export function StrictRateLimit(
  limit: number,
  windowSeconds: number
): MethodDecorator & ClassDecorator {
  return RateLimit({
    limit,
    windowSeconds,
    algorithm: 'token-bucket',
    scope: ['user', 'ip'],
    message: 'Too many requests. Please wait before trying again.',
  });
}

/**
 * Burst-friendly rate limit
 * Uses leaky bucket to allow bursts while maintaining average rate
 */
export function BurstRateLimit(
  limit: number,
  windowSeconds: number,
  burstLimit: number
): MethodDecorator & ClassDecorator {
  return RateLimit({
    limit,
    windowSeconds,
    burstLimit,
    algorithm: 'leaky-bucket',
    scope: ['user'],
  });
}

/**
 * Get rate limit metadata from a target
 */
export function getRateLimitMetadata(
  target: any
): RateLimitDecoratorOptions | undefined {
  return Reflect.getMetadata(RATE_LIMIT_KEY, target);
}

/**
 * Check if rate limit should be skipped
 */
export function shouldSkipRateLimit(target: any): boolean {
  return Reflect.getMetadata(RATE_LIMIT_SKIP_KEY, target) === true;
}

/**
 * Get throttle metadata from a target
 */
export function getThrottleMetadata(
  target: any
): { limit: number; windowSeconds: number } | undefined {
  return Reflect.getMetadata(THROTTLE_KEY, target);
}
