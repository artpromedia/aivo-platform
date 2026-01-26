import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../../src/services/cache.service.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({
      defaultTTL: 60,
      maxSize: 100,
      cleanupInterval: 60000,
    });
  });

  afterEach(() => {
    cache.shutdown();
  });

  describe('get and set', () => {
    it('should store and retrieve a value', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');

      expect(result).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should expire values after TTL', async () => {
      await cache.set('key1', 'value1', 1); // 1 second TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await cache.get('key1');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      await cache.set('key1', 'value1');
      const deleted = await cache.delete('key1');

      expect(deleted).toBe(true);

      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    it('should return false for non-existent key', async () => {
      const deleted = await cache.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      await cache.set('key1', 'value1');
      const exists = await cache.exists('key1');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await cache.exists('nonexistent');

      expect(exists).toBe(false);
    });

    it('should return false for expired key', async () => {
      await cache.set('key1', 'value1', 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const exists = await cache.exists('key1');
      expect(exists).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await cache.set('key1', 'cached');
      const factory = vi.fn().mockResolvedValue('new');

      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const factory = vi.fn().mockResolvedValue('new');

      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('new');
      expect(factory).toHaveBeenCalled();

      // Should be cached now
      const cached = await cache.get('key1');
      expect(cached).toBe('new');
    });
  });

  describe('incr', () => {
    it('should increment a numeric value', async () => {
      await cache.set('counter', '5');
      const result = await cache.incr('counter');

      expect(result).toBe(6);
    });

    it('should start from 0 if key does not exist', async () => {
      const result = await cache.incr('newcounter');

      expect(result).toBe(1);
    });

    it('should increment by specified amount', async () => {
      await cache.set('counter', '5');
      const result = await cache.incr('counter', 10);

      expect(result).toBe(15);
    });
  });

  describe('ttl', () => {
    it('should return remaining TTL', async () => {
      await cache.set('key1', 'value1', 60);
      const ttl = await cache.ttl('key1');

      expect(ttl).toBeGreaterThan(55);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should return -2 for non-existent key', async () => {
      const ttl = await cache.ttl('nonexistent');

      expect(ttl).toBe(-2);
    });
  });

  describe('expire', () => {
    it('should update TTL of existing key', async () => {
      await cache.set('key1', 'value1', 10);
      const updated = await cache.expire('key1', 120);

      expect(updated).toBe(true);

      const ttl = await cache.ttl('key1');
      expect(ttl).toBeGreaterThan(100);
    });

    it('should return false for non-existent key', async () => {
      const updated = await cache.expire('nonexistent', 60);

      expect(updated).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return matching keys', async () => {
      await cache.set('user:1', 'data1');
      await cache.set('user:2', 'data2');
      await cache.set('other:1', 'data3');

      const keys = await cache.keys('user:*');

      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).not.toContain('other:1');
    });
  });

  describe('getStats', () => {
    it('should track cache statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1'); // Hit
      await cache.get('key1'); // Hit
      await cache.get('nonexistent'); // Miss

      const stats = cache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('max size eviction', () => {
    it('should evict oldest entries when max size reached', async () => {
      const smallCache = new CacheService({
        defaultTTL: 60,
        maxSize: 3,
        cleanupInterval: 60000,
      });

      try {
        await smallCache.set('key1', 'value1');
        await smallCache.set('key2', 'value2');
        await smallCache.set('key3', 'value3');
        await smallCache.set('key4', 'value4'); // Should evict key1

        const stats = smallCache.getStats();
        expect(stats.size).toBe(3);

        // key1 should be evicted
        const key1 = await smallCache.get('key1');
        expect(key1).toBeNull();
      } finally {
        smallCache.shutdown();
      }
    });
  });
});
