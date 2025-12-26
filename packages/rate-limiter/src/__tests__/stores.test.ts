/**
 * Store Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../stores/memory-store';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore({ cleanupInterval: 1000 });
  });

  afterEach(async () => {
    await store.close();
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await store.set('key1', 'value1', 60000);

      const value = await store.get('key1');

      expect(value).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const value = await store.get('non-existent');
      expect(value).toBeNull();
    });

    it('should expire values after TTL', async () => {
      await store.set('expiring', 'value', 50); // 50ms TTL

      // Value should exist immediately
      expect(await store.get('expiring')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Value should be gone
      expect(await store.get('expiring')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete values', async () => {
      await store.set('to-delete', 'value', 60000);

      await store.delete('to-delete');

      expect(await store.get('to-delete')).toBeNull();
    });

    it('should not error on non-existent keys', async () => {
      await expect(store.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('increment', () => {
    it('should increment values', async () => {
      const result1 = await store.increment('counter', 1, 60000);
      const result2 = await store.increment('counter', 1, 60000);
      const result3 = await store.increment('counter', 5, 60000);

      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(result3).toBe(7);
    });

    it('should start from 0 for new keys', async () => {
      const result = await store.increment('new-counter', 10, 60000);
      expect(result).toBe(10);
    });
  });

  describe('slidingWindowAdd', () => {
    it('should add to sliding window', async () => {
      const now = Date.now();
      const windowMs = 60000;

      const count1 = await store.slidingWindowAdd('window', now, windowMs);
      const count2 = await store.slidingWindowAdd('window', now + 1, windowMs);
      const count3 = await store.slidingWindowAdd('window', now + 2, windowMs);

      expect(count1).toBe(1);
      expect(count2).toBe(2);
      expect(count3).toBe(3);
    });

    it('should clean up old entries', async () => {
      const now = Date.now();
      const windowMs = 100; // 100ms window

      await store.slidingWindowAdd('window', now - 200, windowMs); // Old entry
      await store.slidingWindowAdd('window', now, windowMs); // New entry

      const count = await store.slidingWindowCount('window', now - windowMs, now);

      expect(count).toBe(1); // Only the new entry
    });
  });

  describe('slidingWindowCount', () => {
    it('should count entries in window', async () => {
      const now = Date.now();
      const windowMs = 60000;

      await store.slidingWindowAdd('count-window', now, windowMs);
      await store.slidingWindowAdd('count-window', now + 1, windowMs);
      await store.slidingWindowAdd('count-window', now + 2, windowMs);

      const count = await store.slidingWindowCount(
        'count-window',
        now - 1000,
        now + 10
      );

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent window', async () => {
      const count = await store.slidingWindowCount('empty-window', 0, Date.now());
      expect(count).toBe(0);
    });
  });

  describe('tokenBucketConsume', () => {
    it('should consume tokens', async () => {
      const now = Date.now();
      const capacity = 10;
      const refillRate = 1;

      const result = await store.tokenBucketConsume(
        'bucket',
        capacity,
        refillRate,
        3,
        now
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
    });

    it('should deny when no tokens', async () => {
      const now = Date.now();
      const capacity = 5;
      const refillRate = 0.001; // Very slow refill

      // Consume all tokens
      await store.tokenBucketConsume('bucket', capacity, refillRate, 5, now);

      // Try to consume more
      const result = await store.tokenBucketConsume(
        'bucket',
        capacity,
        refillRate,
        1,
        now + 1
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('leakyBucketConsume', () => {
    it('should add to bucket', async () => {
      const now = Date.now();
      const capacity = 10;
      const leakRate = 1;

      const result = await store.leakyBucketConsume(
        'leaky',
        capacity,
        leakRate,
        3,
        now
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny when bucket full', async () => {
      const now = Date.now();
      const capacity = 5;
      const leakRate = 0.001; // Very slow leak

      // Fill bucket
      await store.leakyBucketConsume('leaky', capacity, leakRate, 5, now);

      // Try to add more
      const result = await store.leakyBucketConsume(
        'leaky',
        capacity,
        leakRate,
        1,
        now + 1
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired entries periodically', async () => {
      await store.set('short-lived', 'value', 50); // 50ms TTL

      // Value exists
      expect(await store.get('short-lived')).toBe('value');

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Value should be cleaned up
      expect(await store.get('short-lived')).toBeNull();
    });
  });
});
