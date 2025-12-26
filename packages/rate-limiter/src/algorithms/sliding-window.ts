/**
 * Sliding Window Rate Limiter
 *
 * Uses a sliding window approach that provides smoother rate limiting
 * than fixed windows by considering the overlap between windows.
 *
 * This implementation uses Redis sorted sets for efficient distributed
 * sliding window calculation.
 */

import { RateLimitStore } from '../stores/types';
import { AlgorithmCheckResult, AlgorithmOptions } from '../types';

export class SlidingWindow {
  constructor(private store: RateLimitStore) {}

  /**
   * Check if request is allowed without consuming
   */
  async check(
    key: string,
    limit: number,
    windowSeconds: number,
    options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Get count of requests in the current window
    const count = await this.store.slidingWindowCount(key, windowStart, now);

    const effectiveLimit = options?.burst ?? limit;
    const allowed = count < effectiveLimit;
    const remaining = Math.max(0, effectiveLimit - count);
    const reset = now + windowMs;

    return { allowed, remaining, reset, current: count };
  }

  /**
   * Consume a request
   */
  async consume(
    key: string,
    cost: number,
    limit: number,
    windowSeconds: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Add the request(s) to the sorted set
    let count = 0;
    for (let i = 0; i < cost; i++) {
      count = await this.store.slidingWindowAdd(key, now + i, windowMs);
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const reset = now + windowMs;

    return { allowed, remaining, reset, current: count };
  }

  /**
   * Get current count without modifying
   */
  async getCount(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    return this.store.slidingWindowCount(key, windowStart, now);
  }
}
