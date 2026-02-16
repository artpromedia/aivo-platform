/**
 * Registration Rate Limit Hook
 *
 * Protects registration endpoints from abuse:
 * - Max 3 registration attempts per IP per hour
 * - Max 10 verification attempts per registration per hour
 * - Max 5 resend attempts per registration per hour
 * Used as a Fastify preHandler hook.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../../config.js';
import { TooManyRequestsException } from '../../errors.js';

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

export async function registrationRateLimitHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip in development if configured
  if (config.environment === 'development') {
    return;
  }

  const clientIp = request.ip;
  const endpoint = getEndpointType(request.url);
  const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.default;

  // Create unique key for this client + endpoint
  const key = `${clientIp}:${endpoint}`;

  const now = Date.now();
  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  cleanupExpiredEntries();

  // Check if currently blocked
  if (entry?.blocked && entry.blockExpires && entry.blockExpires > now) {
    const remainingSeconds = Math.ceil((entry.blockExpires - now) / 1000);
    logger.warn(
      {
        ip: clientIp,
        endpoint,
        remainingSeconds,
      },
      'Rate limit block active'
    );

    throw new TooManyRequestsException(
      `Too many requests. Please try again in ${remainingSeconds} seconds.`
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
    return;
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > limits.maxRequests) {
    entry.blocked = true;
    entry.blockExpires = now + limits.blockDurationMs;
    rateLimitStore.set(key, entry);

    const remainingSeconds = Math.ceil(limits.blockDurationMs / 1000);

    logger.warn(
      {
        ip: clientIp,
        endpoint,
        count: entry.count,
        maxRequests: limits.maxRequests,
      },
      'Rate limit exceeded'
    );

    throw new TooManyRequestsException(
      `Too many requests. Please try again in ${remainingSeconds} seconds.`
    );
  }

  rateLimitStore.set(key, entry);

  // Set rate limit headers
  const remaining = limits.maxRequests - entry.count;
  const resetTime = Math.ceil((entry.firstAttempt + limits.windowMs) / 1000);

  reply.header('X-RateLimit-Limit', limits.maxRequests);
  reply.header('X-RateLimit-Remaining', Math.max(0, remaining));
  reply.header('X-RateLimit-Reset', resetTime);
}

function getEndpointType(path: string): keyof typeof RATE_LIMITS {
  if (path.endsWith('/register')) return 'register';
  if (path.endsWith('/verify-email')) return 'verify-email';
  if (path.endsWith('/resend-verification')) return 'resend-verification';
  return 'default';
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleanupCount = 0;

  // Only cleanup occasionally (1% of requests)
  if (Math.random() > 0.01) return;

  for (const [key, entry] of rateLimitStore.entries()) {
    const isWindowExpired = now - entry.firstAttempt > RATE_LIMITS.default.windowMs;
    const isBlockExpired = entry.blockExpires && entry.blockExpires < now;

    if (isWindowExpired && (!entry.blocked || isBlockExpired)) {
      rateLimitStore.delete(key);
      cleanupCount++;
    }
  }

  if (cleanupCount > 0) {
    logger.debug({ removed: cleanupCount }, 'Rate limit store cleanup');
  }
}

/**
 * IP-based fraud detection hook
 * Tracks suspicious patterns across multiple registrations
 */
const suspiciousPatterns = new Map<
  string,
  {
    registrationAttempts: number;
    uniqueEmails: Set<string>;
    firstSeen: number;
    flagged: boolean;
  }
>();

export async function fraudDetectionHook(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  if (config.environment === 'development') {
    return;
  }

  const clientIp = request.ip;
  const body = request.body as Record<string, unknown> | undefined;
  const email = (body?.email as string)?.toLowerCase();

  if (!email) return;

  const now = Date.now();
  let pattern = suspiciousPatterns.get(clientIp);

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
    logger.warn(
      {
        ip: clientIp,
        attempts: pattern.registrationAttempts,
        uniqueEmails: pattern.uniqueEmails.size,
      },
      'Suspicious registration pattern detected'
    );
  }

  suspiciousPatterns.set(clientIp, pattern);

  // Don't block, just flag for review
}
