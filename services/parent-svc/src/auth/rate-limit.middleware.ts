/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting for parent API endpoints.
 */

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger, metrics } from '@aivo/ts-observability';
import { config } from '../config.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations by endpoint category
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  messaging: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 messages per hour
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
};

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip in development if configured
    if (config.environment === 'development' && !config.enableRateLimitInDev) {
      return next();
    }

    const category = this.getCategory(req.path);
    const limit = RATE_LIMITS[category] || RATE_LIMITS.api;
    const identifier = this.getIdentifier(req, category);
    const key = `${category}:${identifier}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + limit.windowMs,
      };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    // Check if over limit
    if (entry.count > limit.requests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      logger.warn('Rate limit exceeded', {
        category,
        identifier,
        count: entry.count,
      });

      metrics.increment('rate_limit.exceeded', { category });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    next();
  }

  /**
   * Determine rate limit category from path
   */
  private getCategory(path: string): string {
    if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) {
      return 'auth';
    }
    if (path.includes('/messages') || path.includes('/conversations')) {
      return 'messaging';
    }
    return 'api';
  }

  /**
   * Get identifier for rate limiting
   */
  private getIdentifier(req: Request, category: string): string {
    // For authenticated requests, use user ID
    // For unauthenticated requests, use IP address
    const authReq = req as { parent?: { id: string } };
    
    if (authReq.parent?.id) {
      return authReq.parent.id;
    }

    // Use forwarded IP if behind proxy
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return req.ip || 'unknown';
  }
}

/**
 * Cleanup expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Rate limit store cleanup', { cleaned });
  }
}, 60 * 1000); // Run every minute
