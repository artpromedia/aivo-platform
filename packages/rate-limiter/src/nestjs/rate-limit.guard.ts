/**
 * NestJS Rate Limit Guard
 *
 * A guard that enforces rate limits on NestJS routes.
 *
 * @example
 * ```typescript
 * @Controller('api')
 * @UseGuards(RateLimitGuard)
 * export class ApiController {
 *   @RateLimit({ limit: 10, windowSeconds: 60 })
 *   @Get('data')
 *   async getData() {}
 * }
 * ```
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiter } from '../rate-limiter';
import { RateLimitContext, RateLimitResult } from '../types';
import { RATE_LIMITER } from './rate-limit.module';
import {
  RATE_LIMIT_KEY,
  RATE_LIMIT_SKIP_KEY,
  THROTTLE_KEY,
  RateLimitDecoratorOptions,
} from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if rate limiting should be skipped
    const skip = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get rate limit options from decorator
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitDecoratorOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Get throttle options from decorator
    const throttleOptions = this.reflector.getAllAndOverride<{
      limit: number;
      windowSeconds: number;
    }>(THROTTLE_KEY, [context.getHandler(), context.getClass()]);

    // Build context
    const rateLimitContext = this.buildContext(request, rateLimitOptions);

    // Perform rate limit check
    let result: RateLimitResult;

    if (rateLimitOptions) {
      // Use decorator options
      result = await this.checkWithOptions(rateLimitContext, rateLimitOptions);
    } else if (throttleOptions) {
      // Use simple throttle
      result = await this.checkWithThrottle(rateLimitContext, throttleOptions);
    } else {
      // Use default rate limiter rules
      result = await this.rateLimiter.consume(rateLimitContext);
    }

    // Attach result to request
    request.rateLimit = result;

    // Set headers
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        response.setHeader(key, value);
      }
    }

    // Check if allowed
    if (!result.allowed) {
      throw new RateLimitExceededException(result);
    }

    return true;
  }

  /**
   * Build rate limit context from request
   */
  private buildContext(
    request: any,
    options?: RateLimitDecoratorOptions
  ): RateLimitContext {
    const ip =
      request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.connection?.remoteAddress;

    const userId = request.user?.id || request.user?.userId;
    const tenantId = request.tenant?.id || request.headers['x-tenant-id'];
    const apiKey = request.headers['x-api-key'];
    const tier = request.user?.tier || request.user?.plan;
    const isInternal = request.headers['x-internal'] === 'true';

    return {
      ip,
      userId,
      tenantId,
      apiKey,
      tier,
      endpoint: request.path,
      method: request.method,
      isInternal,
      headers: request.headers,
    };
  }

  /**
   * Check with decorator options
   */
  private async checkWithOptions(
    context: RateLimitContext,
    options: RateLimitDecoratorOptions
  ): Promise<RateLimitResult> {
    // Create a temporary rule from the options
    const rule = {
      id: `decorator:${context.endpoint}:${context.method}`,
      match: { path: context.endpoint!, method: context.method },
      limits: {
        limit: options.limit,
        windowSeconds: options.windowSeconds,
        burstLimit: options.burstLimit,
      },
      algorithm: options.algorithm,
      scope: options.scope,
    };

    // Temporarily add the rule
    this.rateLimiter.addRule(rule);

    try {
      return await this.rateLimiter.consume(context);
    } finally {
      // Remove the temporary rule
      this.rateLimiter.removeRule(rule.id);
    }
  }

  /**
   * Check with simple throttle options
   */
  private async checkWithThrottle(
    context: RateLimitContext,
    options: { limit: number; windowSeconds: number }
  ): Promise<RateLimitResult> {
    return this.checkWithOptions(context, {
      limit: options.limit,
      windowSeconds: options.windowSeconds,
    });
  }
}

/**
 * Rate limit exceeded exception
 */
export class RateLimitExceededException extends HttpException {
  constructor(public readonly result: RateLimitResult) {
    const message =
      result.action?.message || 'Rate limit exceeded. Please try again later.';

    super(
      {
        statusCode: result.action?.statusCode || HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message,
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
      result.action?.statusCode || HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
