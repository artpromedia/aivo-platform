/**
 * Throttle Middleware
 *
 * A simpler middleware that just throttles requests without
 * the full rate limiting infrastructure.
 */

import { SlidingWindow } from '../algorithms/sliding-window';
import type { RateLimiterLogger } from '../logger';
import { noopLogger } from '../logger';
import { MemoryStore } from '../stores/memory-store';
import type { RateLimitStore } from '../stores/types';

export interface ThrottleOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Storage backend (defaults to memory) */
  store?: RateLimitStore;
  /** Function to generate the key for rate limiting */
  keyGenerator?: (req: any) => string;
  /** Custom handler for throttled requests */
  onThrottled?: (req: any, res: any, retryAfter: number) => void;
  /** Skip throttling for certain requests */
  skip?: (req: any) => boolean;
  /** Logger instance */
  logger?: RateLimiterLogger;
  /** Whether to set rate limit headers */
  setHeaders?: boolean;
}

/**
 * Default key generator (by IP)
 */
function defaultKeyGenerator(req: any): string {
  const ip =
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown';
  return `throttle:${ip}`;
}

/**
 * Default throttled handler
 */
function defaultThrottledHandler(_req: any, res: any, retryAfter: number): void {
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Request throttled. Please slow down.',
    retryAfter,
  });
}

/**
 * Create throttle middleware
 */
export function createThrottleMiddleware(
  options: ThrottleOptions
): (req: any, res: any, next: any) => Promise<void> {
  const {
    limit,
    windowSeconds,
    store = new MemoryStore(),
    keyGenerator = defaultKeyGenerator,
    onThrottled = defaultThrottledHandler,
    skip,
    logger = noopLogger,
    setHeaders = true,
  } = options;

  const algorithm = new SlidingWindow(store);

  return async (req: any, res: any, next: any): Promise<void> => {
    try {
      // Check if we should skip
      if (skip?.(req)) {
        return next();
      }

      // Generate key
      const key = keyGenerator(req);

      // Consume a request
      const result = await algorithm.consume(key, 1, limit, windowSeconds);

      // Set headers
      if (setHeaders) {
        res.setHeader('X-RateLimit-Limit', String(limit));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
        res.setHeader('X-RateLimit-Reset', String(Math.floor(result.reset / 1000)));
      }

      // Check if throttled
      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

        if (setHeaders) {
          res.setHeader('Retry-After', String(retryAfter));
        }

        logger.info('Request throttled', {
          key,
          limit,
          retryAfter,
        });

        onThrottled(req, res, retryAfter);
        return;
      }

      next();
    } catch (error) {
      logger.error('Throttle middleware error', { error: String(error) });
      // Continue on error (fail open)
      next();
    }
  };
}

/**
 * Express throttle middleware factory
 */
export function throttle(options: ThrottleOptions) {
  return createThrottleMiddleware(options);
}
