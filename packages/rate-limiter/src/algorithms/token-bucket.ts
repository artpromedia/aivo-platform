/**
 * Token Bucket Rate Limiter
 *
 * Classic token bucket algorithm where:
 * - Bucket has a maximum capacity
 * - Tokens are added at a constant rate
 * - Requests consume tokens
 * - If no tokens available, request is denied
 *
 * Excellent for handling bursts while maintaining a steady average rate.
 */

import { RateLimitStore } from '../stores/types';
import { AlgorithmCheckResult, AlgorithmOptions } from '../types';

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

export class TokenBucket {
  constructor(private store: RateLimitStore) {}

  /**
   * Check if request is allowed without consuming tokens
   */
  async check(
    key: string,
    capacity: number,
    refillRate: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();
    const stateKey = `tb:${key}`;
    const state = await this.getState(stateKey);

    // Calculate current token count
    const currentTokens = this.calculateTokens(
      state,
      capacity,
      refillRate,
      now
    );

    const allowed = currentTokens >= 1;
    const remaining = Math.floor(currentTokens);
    const reset = this.calculateResetTime(
      currentTokens,
      capacity,
      refillRate,
      now
    );

    return { allowed, remaining, reset, current: capacity - remaining };
  }

  /**
   * Consume tokens from the bucket
   */
  async consume(
    key: string,
    cost: number,
    capacity: number,
    refillRate: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();

    // Use atomic Redis operation if available
    const result = await this.store.tokenBucketConsume(
      key,
      capacity,
      refillRate,
      cost,
      now
    );

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      reset: result.reset,
      current: capacity - result.remaining,
    };
  }

  /**
   * Get current state of the bucket
   */
  async getState(key: string): Promise<TokenBucketState> {
    const data = await this.store.get(key);
    if (!data) {
      return { tokens: 0, lastRefill: Date.now() };
    }
    try {
      return JSON.parse(data);
    } catch {
      return { tokens: 0, lastRefill: Date.now() };
    }
  }

  /**
   * Calculate current token count based on elapsed time
   */
  private calculateTokens(
    state: TokenBucketState,
    capacity: number,
    refillRate: number, // tokens per second
    now: number
  ): number {
    const elapsed = (now - state.lastRefill) / 1000;
    const newTokens = elapsed * refillRate;
    return Math.min(capacity, state.tokens + newTokens);
  }

  /**
   * Calculate when bucket will be full again
   */
  private calculateResetTime(
    currentTokens: number,
    capacity: number,
    refillRate: number,
    now: number
  ): number {
    if (currentTokens >= capacity) {
      return now;
    }
    const tokensNeeded = capacity - currentTokens;
    const secondsToFull = tokensNeeded / refillRate;
    return now + Math.ceil(secondsToFull * 1000);
  }
}
