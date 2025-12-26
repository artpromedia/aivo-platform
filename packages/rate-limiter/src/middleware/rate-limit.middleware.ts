/**
 * Rate Limit Middleware
 *
 * Express/NestJS compatible middleware for rate limiting.
 */

import { RateLimiter } from '../rate-limiter';
import { RateLimitContext, RateLimitResult, RateLimitAction } from '../types';
import { RateLimiterLogger, noopLogger } from '../logger';

export interface RateLimitMiddlewareOptions {
  /** The rate limiter instance to use */
  rateLimiter: RateLimiter;
  /** Function to extract context from request */
  contextBuilder?: (req: any) => RateLimitContext;
  /** Custom handler for rate limited requests */
  onRateLimited?: (req: any, res: any, result: RateLimitResult) => void;
  /** Whether to set rate limit headers */
  setHeaders?: boolean;
  /** Logger instance */
  logger?: RateLimiterLogger;
  /** Skip rate limiting for certain requests */
  skip?: (req: any) => boolean;
  /** Custom cost calculator */
  costCalculator?: (req: any) => number;
  /** Key generator override */
  keyGenerator?: (req: any) => string;
}

/**
 * Default context builder for Express-like requests
 */
function defaultContextBuilder(req: any): RateLimitContext {
  // Get IP address (handling proxies)
  const ip =
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress;

  // Get user info from common auth patterns
  const userId =
    req.user?.id ||
    req.user?.userId ||
    req.auth?.userId ||
    req.userId;

  // Get tenant info
  const tenantId =
    req.tenant?.id ||
    req.tenantId ||
    req.headers['x-tenant-id'];

  // Get API key
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['authorization']?.replace(/^Bearer /i, '');

  // Get tier from user or request
  const tier =
    req.user?.tier ||
    req.user?.plan ||
    req.tier ||
    req.headers['x-tier'];

  // Check if internal request
  const isInternal =
    req.headers['x-internal'] === 'true' ||
    req.isInternal;

  return {
    ip,
    userId,
    tenantId,
    apiKey,
    tier,
    endpoint: req.path || req.url?.split('?')[0],
    method: req.method,
    isInternal,
    headers: req.headers,
  };
}

/**
 * Default handler for rate limited requests
 */
function defaultRateLimitedHandler(
  _req: any,
  res: any,
  result: RateLimitResult
): void {
  const action = result.action || {
    type: 'reject',
    statusCode: 429,
    message: 'Too Many Requests',
  };

  if (action.type === 'reject') {
    res.status(action.statusCode || 429).json({
      error: 'Rate Limit Exceeded',
      message: action.message || 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });
  }
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions
): (req: any, res: any, next: any) => Promise<void> {
  const {
    rateLimiter,
    contextBuilder = defaultContextBuilder,
    onRateLimited = defaultRateLimitedHandler,
    setHeaders = true,
    logger = noopLogger,
    skip,
    costCalculator,
    keyGenerator,
  } = options;

  return async (req: any, res: any, next: any): Promise<void> => {
    try {
      // Check if we should skip
      if (skip && skip(req)) {
        logger.debug('Skipping rate limit check', { path: req.path });
        return next();
      }

      // Build context
      let context = contextBuilder(req);

      // Override key if key generator is provided
      if (keyGenerator) {
        (context as any).key = keyGenerator(req);
      }

      // Calculate cost
      const cost = costCalculator ? costCalculator(req) : 1;

      // Perform rate limit check and consume
      const result = await rateLimiter.consume(context, cost);

      // Attach result to request for downstream use
      req.rateLimit = result;

      // Set headers if enabled
      if (setHeaders && result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
      }

      // Handle rate limited requests
      if (!result.allowed) {
        logger.info('Request rate limited', {
          key: result.key,
          limit: result.limit,
          remaining: result.remaining,
          retryAfter: result.retryAfter,
        });

        return onRateLimited(req, res, result);
      }

      logger.debug('Request allowed', {
        key: result.key,
        remaining: result.remaining,
      });

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', error);
      // Continue to next middleware on error (fail open)
      next();
    }
  };
}

/**
 * Express middleware factory
 */
export function expressRateLimitMiddleware(
  options: RateLimitMiddlewareOptions
) {
  return createRateLimitMiddleware(options);
}
