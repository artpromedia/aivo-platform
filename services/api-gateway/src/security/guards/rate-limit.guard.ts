/**
 * Rate Limit Guard
 * Implements sliding window rate limiting with Redis
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { METADATA_KEYS, RateLimitOptions } from '../decorators';
import { RATE_LIMITS, SECURITY_ERROR_CODES } from '../constants';

interface RateLimitInfo {
  current: number;
  remaining: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly redis: Redis;
  private readonly keyPrefix = 'rate_limit:';
  
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_RATE_LIMIT_DB', 1),
      keyPrefix: this.keyPrefix,
      enableReadyCheck: true,
      retryDelayOnFailover: 100,
    });
  }
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Get rate limit options from decorator or use defaults
    const customLimit = this.reflector.getAllAndOverride<RateLimitOptions>(
      METADATA_KEYS.RATE_LIMIT,
      [context.getHandler(), context.getClass()]
    );
    
    const limit = customLimit || this.getDefaultLimit(request);
    
    // Build rate limit key
    const key = this.buildKey(request, limit.keyPrefix);
    
    try {
      // Check and update rate limit
      const info = await this.checkRateLimit(key, limit);
      
      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', limit.max);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
      response.setHeader('X-RateLimit-Reset', info.resetAt);
      
      if (info.remaining < 0) {
        // Calculate retry-after
        const retryAfter = Math.ceil((info.resetAt - Date.now()) / 1000);
        response.setHeader('Retry-After', retryAfter);
        
        throw new HttpException(
          {
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            code: SECURITY_ERROR_CODES.RATE_LIMIT_EXCEEDED,
            retryAfter,
          },
          429
        );
      }
      
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // If Redis fails, log and allow request (fail open for availability)
      this.logger.error('Rate limit check failed', {
        error: error.message,
        key,
      });
      
      return true;
    }
  }
  
  private getDefaultLimit(request: Request): RateLimitOptions {
    const path = request.path.toLowerCase();
    
    // Auth endpoints have stricter limits
    if (path.includes('/auth/login')) {
      return {
        windowMs: RATE_LIMITS.AUTH.LOGIN.WINDOW_MS,
        max: RATE_LIMITS.AUTH.LOGIN.MAX,
        keyPrefix: 'auth:login',
      };
    }
    
    if (path.includes('/auth/register')) {
      return {
        windowMs: RATE_LIMITS.AUTH.REGISTER.WINDOW_MS,
        max: RATE_LIMITS.AUTH.REGISTER.MAX,
        keyPrefix: 'auth:register',
      };
    }
    
    if (path.includes('/auth/password-reset')) {
      return {
        windowMs: RATE_LIMITS.AUTH.PASSWORD_RESET.WINDOW_MS,
        max: RATE_LIMITS.AUTH.PASSWORD_RESET.MAX,
        keyPrefix: 'auth:password-reset',
      };
    }
    
    if (path.includes('/auth/mfa')) {
      return {
        windowMs: RATE_LIMITS.AUTH.MFA.WINDOW_MS,
        max: RATE_LIMITS.AUTH.MFA.MAX,
        keyPrefix: 'auth:mfa',
      };
    }
    
    // Export endpoints
    if (path.includes('/export')) {
      return {
        windowMs: RATE_LIMITS.API.EXPORT.WINDOW_MS,
        max: RATE_LIMITS.API.EXPORT.MAX,
        keyPrefix: 'api:export',
      };
    }
    
    // Write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return {
        windowMs: RATE_LIMITS.API.WRITE.WINDOW_MS,
        max: RATE_LIMITS.API.WRITE.MAX,
        keyPrefix: 'api:write',
      };
    }
    
    // Default read operations
    return {
      windowMs: RATE_LIMITS.API.READ.WINDOW_MS,
      max: RATE_LIMITS.API.READ.MAX,
      keyPrefix: 'api:read',
    };
  }
  
  private buildKey(request: Request, prefix?: string): string {
    const ip = request.securityContext?.ip || request.ip || 'unknown';
    const userId = request.user?.id || 'anonymous';
    const base = `${prefix || 'global'}:${ip}:${userId}`;
    return base;
  }
  
  private async checkRateLimit(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const windowKey = `${key}:${Math.floor(now / options.windowMs)}`;
    
    // Use sliding window algorithm with Redis
    const multi = this.redis.multi();
    
    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    multi.zadd(key, now.toString(), `${now}:${Math.random()}`);
    
    // Count requests in window
    multi.zcard(key);
    
    // Set expiry on the key
    multi.pexpire(key, options.windowMs);
    
    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }
    
    const count = results[2]?.[1] as number || 0;
    const remaining = options.max - count;
    const resetAt = now + options.windowMs;
    
    return {
      current: count,
      remaining,
      resetAt,
    };
  }
  
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
