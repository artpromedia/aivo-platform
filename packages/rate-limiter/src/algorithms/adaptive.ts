/**
 * Adaptive Rate Limiter
 *
 * Dynamically adjusts rate limits based on:
 * - Server load
 * - Error rates
 * - Response times
 * - User behavior patterns
 *
 * This algorithm provides intelligent rate limiting that responds to
 * real-time conditions while maintaining fairness.
 */

import { RateLimitStore } from '../stores/types';
import { AlgorithmCheckResult, AlgorithmOptions } from '../types';
import { SlidingWindow } from './sliding-window';

export interface AdaptiveOptions extends AlgorithmOptions {
  /** Current server load (0-1) */
  serverLoad?: number;
  /** Current error rate (0-1) */
  errorRate?: number;
  /** Average response time in ms */
  avgResponseTime?: number;
  /** User's recent error count */
  userErrorCount?: number;
  /** Minimum multiplier for limits */
  minMultiplier?: number;
  /** Maximum multiplier for limits */
  maxMultiplier?: number;
}

export interface AdaptiveState {
  baseLimit: number;
  currentMultiplier: number;
  lastAdjustment: number;
  recentRequests: number;
  recentErrors: number;
}

export class AdaptiveRateLimiter {
  private slidingWindow: SlidingWindow;

  constructor(private store: RateLimitStore) {
    this.slidingWindow = new SlidingWindow(store);
  }

  /**
   * Check if request is allowed with adaptive limits
   */
  async check(
    key: string,
    baseLimit: number,
    windowSeconds: number,
    options?: AdaptiveOptions
  ): Promise<AlgorithmCheckResult> {
    const multiplier = this.calculateMultiplier(options);
    const effectiveLimit = Math.floor(baseLimit * multiplier);

    const result = await this.slidingWindow.check(
      key,
      effectiveLimit,
      windowSeconds
    );

    return {
      ...result,
      metadata: {
        multiplier,
        effectiveLimit,
        baseLimit,
      },
    };
  }

  /**
   * Consume with adaptive limits
   */
  async consume(
    key: string,
    cost: number,
    baseLimit: number,
    windowSeconds: number,
    options?: AdaptiveOptions
  ): Promise<AlgorithmCheckResult> {
    const multiplier = this.calculateMultiplier(options);
    const effectiveLimit = Math.floor(baseLimit * multiplier);

    // Track request for adaptation
    await this.trackRequest(key, options);

    const result = await this.slidingWindow.consume(
      key,
      cost,
      effectiveLimit,
      windowSeconds
    );

    return {
      ...result,
      metadata: {
        multiplier,
        effectiveLimit,
        baseLimit,
      },
    };
  }

  /**
   * Calculate the multiplier based on current conditions
   */
  private calculateMultiplier(options?: AdaptiveOptions): number {
    const minMultiplier = options?.minMultiplier ?? 0.25;
    const maxMultiplier = options?.maxMultiplier ?? 2.0;

    let multiplier = 1.0;

    // Reduce limits under high server load
    if (options?.serverLoad !== undefined) {
      if (options.serverLoad > 0.9) {
        multiplier *= 0.5; // Heavy reduction
      } else if (options.serverLoad > 0.75) {
        multiplier *= 0.75; // Moderate reduction
      } else if (options.serverLoad < 0.3) {
        multiplier *= 1.25; // Light load, increase limits
      }
    }

    // Reduce limits if error rate is high
    if (options?.errorRate !== undefined) {
      if (options.errorRate > 0.1) {
        multiplier *= 0.5; // Many errors, reduce load
      } else if (options.errorRate > 0.05) {
        multiplier *= 0.75;
      }
    }

    // Adjust based on response times
    if (options?.avgResponseTime !== undefined) {
      if (options.avgResponseTime > 2000) {
        multiplier *= 0.5; // Very slow, reduce load
      } else if (options.avgResponseTime > 1000) {
        multiplier *= 0.75;
      } else if (options.avgResponseTime < 100) {
        multiplier *= 1.25; // Fast responses, can handle more
      }
    }

    // Penalize users with many errors
    if (options?.userErrorCount !== undefined && options.userErrorCount > 10) {
      multiplier *= 0.5;
    }

    // Clamp to min/max
    return Math.max(minMultiplier, Math.min(maxMultiplier, multiplier));
  }

  /**
   * Track request for adaptation metrics
   */
  private async trackRequest(
    key: string,
    options?: AdaptiveOptions
  ): Promise<void> {
    const metricsKey = `adaptive:metrics:${key}`;

    try {
      // Get current state
      const stateData = await this.store.get(metricsKey);
      const state: AdaptiveState = stateData
        ? JSON.parse(stateData)
        : {
            baseLimit: 0,
            currentMultiplier: 1.0,
            lastAdjustment: Date.now(),
            recentRequests: 0,
            recentErrors: 0,
          };

      // Update metrics
      state.recentRequests++;
      if (options?.userErrorCount) {
        state.recentErrors++;
      }

      // Save updated state
      await this.store.set(metricsKey, JSON.stringify(state), 3600000); // 1 hour TTL
    } catch {
      // Ignore metrics tracking errors
    }
  }

  /**
   * Get the current state for a key
   */
  async getState(key: string): Promise<AdaptiveState | null> {
    const metricsKey = `adaptive:metrics:${key}`;
    const data = await this.store.get(metricsKey);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Reset adaptation state for a key
   */
  async resetState(key: string): Promise<void> {
    const metricsKey = `adaptive:metrics:${key}`;
    await this.store.delete(metricsKey);
  }
}
