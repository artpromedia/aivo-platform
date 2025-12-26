/**
 * Leaky Bucket Rate Limiter
 *
 * Queue-based algorithm where:
 * - Requests enter a bucket/queue
 * - Bucket "leaks" at a constant rate
 * - If bucket is full, request is rejected
 *
 * Provides very smooth output rate, ideal for preventing sudden spikes.
 */

import { RateLimitStore } from '../stores/types';
import { AlgorithmCheckResult, AlgorithmOptions } from '../types';

export interface LeakyBucketState {
  water: number;
  lastLeak: number;
}

export class LeakyBucket {
  constructor(private store: RateLimitStore) {}

  /**
   * Check if request is allowed without adding to bucket
   */
  async check(
    key: string,
    capacity: number,
    leakRate: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();
    const state = await this.getState(key);

    // Calculate current water level after leaking
    const currentWater = this.calculateWater(state, leakRate, now);

    const allowed = currentWater < capacity;
    const remaining = Math.max(0, capacity - Math.ceil(currentWater));
    const reset = this.calculateResetTime(currentWater, leakRate, now);

    return { allowed, remaining, reset, current: Math.ceil(currentWater) };
  }

  /**
   * Add request(s) to the bucket
   */
  async consume(
    key: string,
    cost: number,
    capacity: number,
    leakRate: number,
    _options?: AlgorithmOptions
  ): Promise<AlgorithmCheckResult> {
    const now = Date.now();

    // Use atomic Redis operation if available
    const result = await this.store.leakyBucketConsume(
      key,
      capacity,
      leakRate,
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
  async getState(key: string): Promise<LeakyBucketState> {
    const stateKey = `lb:${key}`;
    const data = await this.store.get(stateKey);
    if (!data) {
      return { water: 0, lastLeak: Date.now() };
    }
    try {
      return JSON.parse(data);
    } catch {
      return { water: 0, lastLeak: Date.now() };
    }
  }

  /**
   * Calculate current water level after leaking
   */
  private calculateWater(
    state: LeakyBucketState,
    leakRate: number, // leaks per second
    now: number
  ): number {
    const elapsed = (now - state.lastLeak) / 1000;
    const leaked = elapsed * leakRate;
    return Math.max(0, state.water - leaked);
  }

  /**
   * Calculate when bucket will be empty
   */
  private calculateResetTime(
    currentWater: number,
    leakRate: number,
    now: number
  ): number {
    if (currentWater <= 0) {
      return now;
    }
    const secondsToEmpty = currentWater / leakRate;
    return now + Math.ceil(secondsToEmpty * 1000);
  }
}
