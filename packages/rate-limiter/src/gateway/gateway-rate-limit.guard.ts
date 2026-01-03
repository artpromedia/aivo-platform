/**
 * Gateway Rate Limit Guard
 *
 * A comprehensive guard for API Gateway that handles rate limiting,
 * circuit breaking, and quota management.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CircuitBreaker, CircuitBreakerOpenError } from '../circuit-breaker';
import { RATE_LIMIT_SKIP_KEY } from '../decorators/rate-limit.decorator';
import { QuotaManager } from '../quota-manager';
import { RateLimiter } from '../rate-limiter';
import { RateLimitContext, RateLimitResult } from '../types';

import {
  GATEWAY_RATE_LIMITER,
  GATEWAY_CIRCUIT_BREAKER,
  GATEWAY_QUOTA_MANAGER,
} from './gateway-rate-limit.module';

@Injectable()
export class GatewayRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(GATEWAY_RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Optional()
    @Inject(GATEWAY_CIRCUIT_BREAKER)
    private readonly circuitBreaker: CircuitBreaker | null,
    @Optional() @Inject(GATEWAY_QUOTA_MANAGER) private readonly quotaManager: QuotaManager | null
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if rate limiting should be skipped
    const skip = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    // Build rate limit context
    const rateLimitContext = this.buildContext(request);

    // Check circuit breaker first
    if (this.circuitBreaker) {
      try {
        await this.circuitBreaker.execute(async () => {
          // Just checking state, not actually executing anything
        });
      } catch (error) {
        if (error instanceof CircuitBreakerOpenError) {
          throw new HttpException(
            {
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              error: 'Service Unavailable',
              message: 'Service temporarily unavailable due to high error rate.',
              retryAfter: Math.ceil(error.resetTime / 1000),
            },
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
        throw error;
      }
    }

    // Check rate limit
    const result = await this.rateLimiter.consume(rateLimitContext);

    // Attach to request for downstream use
    request.rateLimit = result;

    // Set rate limit headers
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        response.setHeader(key, value);
      }
    }

    if (!result.allowed) {
      throw new GatewayRateLimitExceededException(result);
    }

    // Check quota if applicable
    if (this.quotaManager && rateLimitContext.userId) {
      const quotaResult = await this.checkQuotas(rateLimitContext);
      if (!quotaResult.allowed) {
        throw new QuotaExceededException(quotaResult);
      }
    }

    return true;
  }

  private buildContext(request: any): RateLimitContext {
    const ip =
      request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.connection?.remoteAddress;

    const userId = request.user?.id || request.user?.userId;
    const tenantId = request.tenant?.id || request.headers['x-tenant-id'];
    const apiKey = request.headers['x-api-key'];
    const tier = request.user?.tier || request.user?.plan;
    const isInternal = request.headers['x-internal'] === 'true';

    const path = request.path || request.url?.split('?')[0] || '/';
    return {
      ip,
      userId,
      tenantId,
      apiKey,
      tier,
      path,
      endpoint: path,
      method: request.method,
      isInternal,
      headers: request.headers,
      timestamp: Date.now(),
    };
  }

  private async checkQuotas(
    context: RateLimitContext
  ): Promise<{ allowed: boolean; quotaName?: string; remaining?: number }> {
    if (!this.quotaManager || !context.userId) {
      return { allowed: true };
    }

    // Check AI quota for AI endpoints
    if (context.endpoint?.includes('/ai/')) {
      const result = await this.quotaManager.check(`user:${context.userId}`, 'ai-requests');
      if (!result.allowed) {
        return {
          allowed: false,
          quotaName: 'ai-requests',
          remaining: result.remaining.daily,
        };
      }
    }

    // Check upload quota for upload endpoints
    if (context.endpoint?.includes('/upload')) {
      const result = await this.quotaManager.check(`user:${context.userId}`, 'file-uploads');
      if (!result.allowed) {
        return {
          allowed: false,
          quotaName: 'file-uploads',
          remaining: result.remaining.daily,
        };
      }
    }

    return { allowed: true };
  }
}

/**
 * Gateway rate limit exceeded exception
 */
export class GatewayRateLimitExceededException extends HttpException {
  constructor(public readonly result: RateLimitResult) {
    const message = result.action?.message || 'Rate limit exceeded. Please try again later.';

    super(
      {
        statusCode: result.action?.statusCode || HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message,
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        policy: result.rule?.id,
      },
      result.action?.statusCode || HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

/**
 * Quota exceeded exception
 */
export class QuotaExceededException extends HttpException {
  constructor(
    public readonly quotaInfo: {
      allowed: boolean;
      quotaName?: string;
      remaining?: number;
    }
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Quota Exceeded',
        message: `${quotaInfo.quotaName} quota exceeded. Please upgrade your plan or wait for quota reset.`,
        quotaName: quotaInfo.quotaName,
        remaining: quotaInfo.remaining,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
