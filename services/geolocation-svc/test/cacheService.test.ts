/**
 * Tests for CacheService — Redis cache operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---------- mock Redis ---------- */

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
};

/* ---------- replicate CacheService logic ---------- */

class CacheService {
  constructor(private redis: typeof mockRedis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      for (const k of keys) {
        await this.redis.del(k);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.redis.incr(key);
    if (ttlSeconds) {
      await this.redis.expire(key, ttlSeconds);
    }
    return val;
  }
}

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheService(mockRedis);
  });

  describe('get', () => {
    it('returns parsed JSON for existing key', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ country: 'US' }));
      const result = await cache.get<{ country: string }>('geo:1.2.3.4');
      expect(result).toEqual({ country: 'US' });
    });

    it('returns null for missing key', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await cache.get('missing');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('sets value without TTL', async () => {
      await cache.set('key', { data: 'test' });
      expect(mockRedis.set).toHaveBeenCalledWith('key', '{"data":"test"}');
    });

    it('sets value with TTL using setex', async () => {
      await cache.set('key', 'value', 3600);
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 3600, '"value"');
    });
  });

  describe('delete', () => {
    it('deletes a single key', async () => {
      await cache.delete('geo:1.2.3.4');
      expect(mockRedis.del).toHaveBeenCalledWith('geo:1.2.3.4');
    });
  });

  describe('deletePattern', () => {
    it('deletes all matching keys', async () => {
      mockRedis.keys.mockResolvedValue(['geo:1', 'geo:2', 'geo:3']);
      await cache.deletePattern('geo:*');
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
    });

    it('does nothing when no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);
      await cache.deletePattern('nothing:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('returns true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      expect(await cache.exists('key')).toBe(true);
    });

    it('returns false when key missing', async () => {
      mockRedis.exists.mockResolvedValue(0);
      expect(await cache.exists('key')).toBe(false);
    });
  });

  describe('ttl', () => {
    it('returns remaining TTL', async () => {
      mockRedis.ttl.mockResolvedValue(1200);
      expect(await cache.ttl('key')).toBe(1200);
    });
  });

  describe('incr', () => {
    it('increments and returns new value', async () => {
      mockRedis.incr.mockResolvedValue(5);
      const val = await cache.incr('rate:ip:1.2.3.4');
      expect(val).toBe(5);
    });

    it('sets expire when ttl provided', async () => {
      mockRedis.incr.mockResolvedValue(1);
      await cache.incr('rate:ip:1.2.3.4', 60);
      expect(mockRedis.expire).toHaveBeenCalledWith('rate:ip:1.2.3.4', 60);
    });
  });
});
