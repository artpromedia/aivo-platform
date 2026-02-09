/**
 * Registration Rate Limit Guard
 *
 * Protects registration endpoints from abuse:
 * - Max 3 registration attempts per IP per hour
 * - Max 10 verification attempts per registration per hour
 * - Max 5 resend attempts per registration per hour
 */

import { logger } from '@aivo/ts-observability';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

import { config } from '../../config.js';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
  blockExpires?: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations by endpoint type
const RATE_LIMITS = {
  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
  'verify-email': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 30 * 60 * 1000, // 30 minute block
  },
  'resend-verification': {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute block
  },
};

@Injectable()
export class RegistrationRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip in development if configured
    if (config.environment === 'development') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const endpoint = this.getEndpointType(request.path);
    const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.default;

    // Create unique key for this client + endpoint
    const key = `${clientIp}:${endpoint}`;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    // Clean up expired entries periodically
    this.cleanupExpiredEntries();

    // Check if currently blocked
    if (entry?.blocked && entry.blockExpires && entry.blockExpires > now) {
      const remainingSeconds = Math.ceil((entry.blockExpires - now) / 1000);
      logger.warn('Rate limit block active', {
        ip: clientIp,
        endpoint,
        remainingSeconds,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Please try again in ${remainingSeconds} seconds.`,
          retryAfter: remainingSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Reset if window has passed
    if (!entry || now - entry.firstAttempt > limits.windowMs) {
      entry = {
        count: 1,
        firstAttempt: now,
        blocked: false,
      };
      rateLimitStore.set(key, entry);
      return true;
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > limits.maxRequests) {
      entry.blocked = true;
      entry.blockExpires = now + limits.blockDurationMs;
      rateLimitStore.set(key, entry);

      const remainingSeconds = Math.ceil(limits.blockDurationMs / 1000);

      logger.warn('Rate limit exceeded', {
        ip: clientIp,
        endpoint,
        count: entry.count,
        maxRequests: limits.maxRequests,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Please try again in ${remainingSeconds} seconds.`,
          retryAfter: remainingSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    rateLimitStore.set(key, entry);

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    const remaining = limits.maxRequests - entry.count;
    const resetTime = Math.ceil((entry.firstAttempt + limits.windowMs) / 1000);

    response.setHeader('X-RateLimit-Limit', limits.maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    response.setHeader('X-RateLimit-Reset', resetTime);

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return request.socket?.remoteAddress || 'unknown';
  }

  private getEndpointType(path: string): keyof typeof RATE_LIMITS {
    if (path.endsWith('/register')) return 'register';
    if (path.endsWith('/verify-email')) return 'verify-email';
    if (path.endsWith('/resend-verification')) return 'resend-verification';
    return 'default';
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanupCount = 0;

    // Only cleanup occasionally (1% of requests)
    if (Math.random() > 0.01) return;

    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries that are both expired and not blocked
      // or blocked entries whose block has expired
      const isWindowExpired = now - entry.firstAttempt > RATE_LIMITS.default.windowMs;
      const isBlockExpired = entry.blockExpires && entry.blockExpires < now;

      if (isWindowExpired && (!entry.blocked || isBlockExpired)) {
        rateLimitStore.delete(key);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      logger.debug('Rate limit store cleanup', { removed: cleanupCount });
    }
  }
}

/**
 * IP-based rate limit guard for fraud detection
 * Tracks suspicious patterns across multiple registrations
 */
@Injectable()
export class FraudDetectionGuard implements CanActivate {
  private static readonly suspiciousPatterns = new Map<
    string,
    {
      registrationAttempts: number;
      uniqueEmails: Set<string>;
      firstSeen: number;
      flagged: boolean;
    }
  >();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (config.environment === 'development') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const email = request.body?.email?.toLowerCase();

    if (!email) return true;

    const now = Date.now();
    let pattern = FraudDetectionGuard.suspiciousPatterns.get(clientIp);

    // Reset if older than 24 hours
    if (pattern && now - pattern.firstSeen > 24 * 60 * 60 * 1000) {
      pattern = undefined;
    }

    if (!pattern) {
      pattern = {
        registrationAttempts: 1,
        uniqueEmails: new Set([email]),
        firstSeen: now,
        flagged: false,
      };
    } else {
      pattern.registrationAttempts++;
      pattern.uniqueEmails.add(email);
    }

    // Flag suspicious activity:
    // - More than 10 registration attempts from same IP in 24 hours
    // - More than 5 unique emails from same IP in 24 hours
    const isSuspicious = pattern.registrationAttempts > 10 || pattern.uniqueEmails.size > 5;

    if (isSuspicious && !pattern.flagged) {
      pattern.flagged = true;
      logger.warn('Suspicious registration pattern detected', {
        ip: clientIp,
        attempts: pattern.registrationAttempts,
        uniqueEmails: pattern.uniqueEmails.size,
      });
    }

    FraudDetectionGuard.suspiciousPatterns.set(clientIp, pattern);

    // Don't block, just flag for review
    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return request.socket?.remoteAddress || 'unknown';
  }
}
