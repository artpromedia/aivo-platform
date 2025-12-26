/**
 * Algorithm Tests
 *
 * Tests for individual rate limiting algorithms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryStore } from '../stores/memory-store';
import { SlidingWindow } from '../algorithms/sliding-window';
import { TokenBucket } from '../algorithms/token-bucket';
import { FixedWindow } from '../algorithms/fixed-window';
import { LeakyBucket } from '../algorithms/leaky-bucket';
import { AdaptiveRateLimiter } from '../algorithms/adaptive';

describe('SlidingWindow', () => {
  let store: MemoryStore;
  let algorithm: SlidingWindow;

  beforeEach(() => {
    store = new MemoryStore();
    algorithm = new SlidingWindow(store);
  });

  afterEach(async () => {
    await store.close();
  });

  it('should allow requests within limit', async () => {
    const key = 'test-sliding';
    const limit = 10;
    const windowSeconds = 60;

    const result = await algorithm.check(key, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it('should track consumed requests', async () => {
    const key = 'test-sliding-consume';
    const limit = 5;
    const windowSeconds = 60;

    await algorithm.consume(key, 1, limit, windowSeconds);
    await algorithm.consume(key, 1, limit, windowSeconds);
    await algorithm.consume(key, 1, limit, windowSeconds);

    const result = await algorithm.check(key, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(3);
    expect(result.remaining).toBe(2);
  });

  it('should deny requests when limit exceeded', async () => {
    const key = 'test-sliding-exceed';
    const limit = 3;
    const windowSeconds = 60;

    await algorithm.consume(key, 1, limit, windowSeconds);
    await algorithm.consume(key, 1, limit, windowSeconds);
    await algorithm.consume(key, 1, limit, windowSeconds);
    const result = await algorithm.consume(key, 1, limit, windowSeconds);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should support burst option', async () => {
    const key = 'test-sliding-burst';
    const limit = 5;
    const windowSeconds = 60;
    const burst = 10;

    const result = await algorithm.check(key, limit, windowSeconds, { burst });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10); // Using burst limit
  });
});

describe('TokenBucket', () => {
  let store: MemoryStore;
  let algorithm: TokenBucket;

  beforeEach(() => {
    store = new MemoryStore();
    algorithm = new TokenBucket(store);
  });

  afterEach(async () => {
    await store.close();
  });

  it('should allow requests when tokens available', async () => {
    const key = 'test-token';
    const capacity = 10;
    const refillRate = 1; // 1 token per second

    const result = await algorithm.check(key, capacity, refillRate);

    expect(result.allowed).toBe(true);
  });

  it('should consume tokens', async () => {
    const key = 'test-token-consume';
    const capacity = 5;
    const refillRate = 1;

    const result1 = await algorithm.consume(key, 2, capacity, refillRate);
    const result2 = await algorithm.consume(key, 2, capacity, refillRate);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBeLessThan(result1.remaining);
  });

  it('should deny when no tokens available', async () => {
    const key = 'test-token-empty';
    const capacity = 3;
    const refillRate = 0.01; // Very slow refill

    // Consume all tokens
    await algorithm.consume(key, 3, capacity, refillRate);

    // Try to consume more
    const result = await algorithm.consume(key, 1, capacity, refillRate);

    expect(result.allowed).toBe(false);
  });
});

describe('FixedWindow', () => {
  let store: MemoryStore;
  let algorithm: FixedWindow;

  beforeEach(() => {
    store = new MemoryStore();
    algorithm = new FixedWindow(store);
  });

  afterEach(async () => {
    await store.close();
  });

  it('should count requests in fixed windows', async () => {
    const key = 'test-fixed';
    const limit = 10;
    const windowSeconds = 60;

    await algorithm.consume(key, 1, limit, windowSeconds);
    await algorithm.consume(key, 1, limit, windowSeconds);

    const result = await algorithm.check(key, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
    expect(result.remaining).toBe(8);
  });

  it('should deny when window limit exceeded', async () => {
    const key = 'test-fixed-exceed';
    const limit = 3;
    const windowSeconds = 60;

    await algorithm.consume(key, 3, limit, windowSeconds);
    const result = await algorithm.consume(key, 1, limit, windowSeconds);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should provide reset time at window boundary', async () => {
    const key = 'test-fixed-reset';
    const limit = 10;
    const windowSeconds = 60;

    const result = await algorithm.check(key, limit, windowSeconds);

    expect(result.reset).toBeGreaterThan(Date.now());
    expect(result.reset).toBeLessThanOrEqual(Date.now() + 60000);
  });
});

describe('LeakyBucket', () => {
  let store: MemoryStore;
  let algorithm: LeakyBucket;

  beforeEach(() => {
    store = new MemoryStore();
    algorithm = new LeakyBucket(store);
  });

  afterEach(async () => {
    await store.close();
  });

  it('should allow requests when bucket has space', async () => {
    const key = 'test-leaky';
    const capacity = 10;
    const leakRate = 1; // 1 leak per second

    const result = await algorithm.check(key, capacity, leakRate);

    expect(result.allowed).toBe(true);
  });

  it('should fill bucket as requests come in', async () => {
    const key = 'test-leaky-fill';
    const capacity = 5;
    const leakRate = 1;

    const result1 = await algorithm.consume(key, 2, capacity, leakRate);
    const result2 = await algorithm.consume(key, 2, capacity, leakRate);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });

  it('should deny when bucket is full', async () => {
    const key = 'test-leaky-full';
    const capacity = 3;
    const leakRate = 0.01; // Very slow leak

    await algorithm.consume(key, 3, capacity, leakRate);
    const result = await algorithm.consume(key, 1, capacity, leakRate);

    expect(result.allowed).toBe(false);
  });
});

describe('AdaptiveRateLimiter', () => {
  let store: MemoryStore;
  let algorithm: AdaptiveRateLimiter;

  beforeEach(() => {
    store = new MemoryStore();
    algorithm = new AdaptiveRateLimiter(store);
  });

  afterEach(async () => {
    await store.close();
  });

  it('should allow requests normally', async () => {
    const key = 'test-adaptive';
    const baseLimit = 100;
    const windowSeconds = 60;

    const result = await algorithm.check(key, baseLimit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(result.metadata?.multiplier).toBe(1.0);
    expect(result.metadata?.effectiveLimit).toBe(100);
  });

  it('should reduce limits under high server load', async () => {
    const key = 'test-adaptive-load';
    const baseLimit = 100;
    const windowSeconds = 60;

    const result = await algorithm.check(key, baseLimit, windowSeconds, {
      serverLoad: 0.95, // 95% load
    });

    expect(result.allowed).toBe(true);
    expect(result.metadata?.multiplier).toBeLessThan(1.0);
    expect(result.metadata?.effectiveLimit).toBeLessThan(100);
  });

  it('should reduce limits when error rate is high', async () => {
    const key = 'test-adaptive-errors';
    const baseLimit = 100;
    const windowSeconds = 60;

    const result = await algorithm.check(key, baseLimit, windowSeconds, {
      errorRate: 0.15, // 15% error rate
    });

    expect(result.metadata?.multiplier).toBeLessThan(1.0);
  });

  it('should increase limits when response time is fast', async () => {
    const key = 'test-adaptive-fast';
    const baseLimit = 100;
    const windowSeconds = 60;

    const result = await algorithm.check(key, baseLimit, windowSeconds, {
      avgResponseTime: 50, // 50ms response time
    });

    expect(result.metadata?.multiplier).toBeGreaterThan(1.0);
    expect(result.metadata?.effectiveLimit).toBeGreaterThan(100);
  });

  it('should respect min/max multiplier bounds', async () => {
    const key = 'test-adaptive-bounds';
    const baseLimit = 100;
    const windowSeconds = 60;

    const result = await algorithm.check(key, baseLimit, windowSeconds, {
      serverLoad: 1.0,
      errorRate: 0.5,
      avgResponseTime: 5000,
      minMultiplier: 0.5,
      maxMultiplier: 1.5,
    });

    expect(result.metadata?.multiplier).toBeGreaterThanOrEqual(0.5);
    expect(result.metadata?.multiplier).toBeLessThanOrEqual(1.5);
  });
});
