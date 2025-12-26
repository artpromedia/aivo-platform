/**
 * Fixed Window Rate Limiter
 *
 * Simple counter-based approach where:
 * - Requests are counted in fixed time windows
 * - Window resets at the end of each period
 *
 * Simple and memory-efficient but can allow bursts at window boundaries.
 */

import { RateLimitStore } from '../stores/types';
import { AlgorithmCheckResult, AlgorithmOptions } from '../types';

export class FixedWindow {
  constructor(private store: RateLimitStore) {}

  /**
   * Check if request is allowed without incrementing counter
   */
  async check(
    key: string,
    limit: number,
    windowSeconds: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();
    const windowKey = this.getWindowKey(key, windowSeconds, now);

    const countStr = await this.store.get(windowKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    const allowed = count < limit;
    const remaining = Math.max(0, limit - count);
    const reset = this.getWindowReset(windowSeconds, now);

    return { allowed, remaining, reset, current: count };
  }

  /**
   * Consume request(s) from the current window
   */
  async consume(
    key: string,
    cost: number,
    limit: number,
    windowSeconds: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();
    const windowKey = this.getWindowKey(key, windowSeconds, now);
    const ttl = windowSeconds * 1000;

    // Increment counter
    const count = await this.store.increment(windowKey, cost, ttl);

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const reset = this.getWindowReset(windowSeconds, now);

    return { allowed, remaining, reset, current: count };
  }

  /**
   * Get the current count in the window
   */
  async getCount(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const windowKey = this.getWindowKey(key, windowSeconds, now);

    const countStr = await this.store.get(windowKey);
    return countStr ? parseInt(countStr, 10) : 0;
  }

  /**
   * Generate window-specific key
   */
  private getWindowKey(key: string, windowSeconds: number, now: number): string {
    const windowStart = Math.floor(now / (windowSeconds * 1000));
    return `fw:${key}:${windowStart}`;
  }

  /**
   * Calculate when the current window resets
   */
  private getWindowReset(windowSeconds: number, now: number): number {
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    return windowStart + windowMs;
  }
}
