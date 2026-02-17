/**
 * Rate Limiting Hook
 *
 * Implements rate limiting for parent API endpoints.
 * Used as a Fastify onRequest hook.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../config.js';
import { TooManyRequestsException } from '../errors.js';

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

export async function rateLimitHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Skip in development if configured
  if (config.environment === 'development' && !config.enableRateLimitInDev) {
    return;
  }

  const category = getCategory(request.url);
  const limit = RATE_LIMITS[category] || RATE_LIMITS.api;
  const identifier = getIdentifier(request, category);
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
  reply.header('X-RateLimit-Limit', limit.requests);
  reply.header('X-RateLimit-Remaining', Math.max(0, limit.requests - entry.count));
  reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

  // Check if over limit
  if (entry.count > limit.requests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    reply.header('Retry-After', retryAfter);

    logger.warn(
      {
        category,
        identifier,
        count: entry.count,
      },
      'Rate limit exceeded'
    );

    throw new TooManyRequestsException('Too many requests. Please try again later.');
  }
}

/**
 * Determine rate limit category from path
 */
function getCategory(path: string): string {
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
function getIdentifier(request: FastifyRequest, _category: string): string {
  // For authenticated requests, use user ID
  const authReq = request as FastifyRequest & { parent?: { id: string } };

  if (authReq.parent?.id) {
    return authReq.parent.id;
  }

  // Use forwarded IP if behind proxy
  return request.ip || 'unknown';
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
    logger.debug({ cleaned }, 'Rate limit store cleanup');
  }
}, 60 * 1000); // Run every minute
