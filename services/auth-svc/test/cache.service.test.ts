import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService, CacheKeys } from '../src/services/cache.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Mock Redis
// ══════════════════════════════════════════════════════════════════════════════

function makeRedis() {
  const store = new Map<string, { value: string; ttl: number }>();
  return {
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    setex: vi.fn(async (key: string, ttl: number, value: string) => {
      store.set(key, { value, ttl });
    }),
    del: vi.fn(async (...keys: string[]) => {
      for (const k of keys) store.delete(k);
      return keys.length;
    }),
    keys: vi.fn(async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    }),
    incrby: vi.fn(async (_key: string, by: number) => by),
    expire: vi.fn(async () => 1),
    exists: vi.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    _store: store,
  } as any;
}

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
} as any;

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('CacheService', () => {
  let redis: ReturnType<typeof makeRedis>;
  let cache: CacheService;

  beforeEach(() => {
    redis = makeRedis();
    cache = new CacheService(redis, logger);
  });

  // ── get / set ─────────────────────────────────────────────────────────

  it('should set and get a value', async () => {
    await cache.set('user:1', { id: '1', name: 'Alice' });
    const val = await cache.get<{ id: string; name: string }>('user:1');
    expect(val).toEqual({ id: '1', name: 'Alice' });
  });

  it('should return null for cache miss', async () => {
    const val = await cache.get('nonexistent');
    expect(val).toBeNull();
  });

  it('should use default TTL of 300s', async () => {
    await cache.set('key', 'value');
    expect(redis.setex).toHaveBeenCalledWith('auth:key', 300, JSON.stringify('value'));
  });

  it('should use custom TTL when provided', async () => {
    await cache.set('key', 'value', { ttl: 60 });
    expect(redis.setex).toHaveBeenCalledWith('auth:key', 60, JSON.stringify('value'));
  });

  // ── delete ────────────────────────────────────────────────────────────

  it('should delete a key', async () => {
    await cache.set('key', 'value');
    await cache.delete('key');
    expect(redis.del).toHaveBeenCalledWith('auth:key');
  });

  // ── deletePattern ─────────────────────────────────────────────────────

  it('should delete keys matching pattern', async () => {
    redis._store.set('auth:user:1:profile', { value: '"p1"', ttl: 300 });
    redis._store.set('auth:user:1:sessions', { value: '"s1"', ttl: 300 });
    redis.keys.mockResolvedValueOnce(['auth:user:1:profile', 'auth:user:1:sessions']);

    await cache.deletePattern('user:1*');
    expect(redis.del).toHaveBeenCalledWith('auth:user:1:profile', 'auth:user:1:sessions');
  });

  // ── getOrSet ──────────────────────────────────────────────────────────

  it('should return cached value if present', async () => {
    redis._store.set('auth:user:2', { value: JSON.stringify({ cached: true }), ttl: 300 });
    const factory = vi.fn().mockResolvedValue({ cached: false });

    const result = await cache.getOrSet('user:2', factory);
    expect(result).toEqual({ cached: true });
    expect(factory).not.toHaveBeenCalled();
  });

  it('should call factory and cache result on miss', async () => {
    const factory = vi.fn().mockResolvedValue({ fresh: true });

    const result = await cache.getOrSet('user:3', factory, { ttl: 120 });
    expect(result).toEqual({ fresh: true });
    expect(factory).toHaveBeenCalledOnce();
    expect(redis.setex).toHaveBeenCalled();
  });

  // ── increment ─────────────────────────────────────────────────────────

  it('should increment a counter', async () => {
    redis.incrby.mockResolvedValue(5);
    const result = await cache.increment('rate-limit:login:user-1', 1);
    expect(result).toBe(5);
    expect(redis.incrby).toHaveBeenCalledWith('auth:rate-limit:login:user-1', 1);
  });

  // ── exists ────────────────────────────────────────────────────────────

  it('should check if key exists', async () => {
    redis.exists.mockResolvedValueOnce(1);
    const result = await cache.exists('session:abc');
    expect(result).toBe(true);
  });

  it('should return false for non-existent key', async () => {
    redis.exists.mockResolvedValueOnce(0);
    const result = await cache.exists('session:none');
    expect(result).toBe(false);
  });

  // ── stats ─────────────────────────────────────────────────────────────

  it('should track hit/miss stats', async () => {
    // Miss
    await cache.get('miss1');
    await cache.get('miss2');
    // Hit
    redis._store.set('auth:hit1', { value: '"v"', ttl: 300 });
    await cache.get('hit1');

    const stats = cache.getStats();
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.hitRate).toBeCloseTo(1 / 3);
  });

  it('should reset stats', () => {
    cache.resetStats();
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  // ── null redis (graceful degradation) ─────────────────────────────────

  it('should return null/0/false when redis is null', async () => {
    const noRedisCache = new CacheService(null, logger);
    expect(await noRedisCache.get('key')).toBeNull();
    await noRedisCache.set('key', 'value'); // no-op
    expect(await noRedisCache.increment('key')).toBe(0);
    expect(await noRedisCache.exists('key')).toBe(false);
  });

  // ── flush ─────────────────────────────────────────────────────────────

  it('should flush all keys with prefix', async () => {
    redis.keys.mockResolvedValueOnce(['auth:a', 'auth:b', 'auth:c']);
    await cache.flush();
    expect(redis.del).toHaveBeenCalledWith('auth:a', 'auth:b', 'auth:c');
  });

  // ── error handling ────────────────────────────────────────────────────

  it('should catch redis errors and return null', async () => {
    redis.get.mockRejectedValueOnce(new Error('connection refused'));
    const val = await cache.get('key');
    expect(val).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CacheKeys unit tests
// ══════════════════════════════════════════════════════════════════════════════

describe('CacheKeys', () => {
  it('should generate user cache keys', () => {
    expect(CacheKeys.user('u1')).toBe('user:u1');
    expect(CacheKeys.userByEmail('a@b.com')).toBe('user:email:a@b.com');
    expect(CacheKeys.userProfile('u1')).toBe('user:u1:profile');
  });

  it('should generate trust score keys', () => {
    expect(CacheKeys.trustScore('u1')).toBe('trust-score:u1');
  });

  it('should generate rate limit keys', () => {
    expect(CacheKeys.rateLimit('ip-1', '/login')).toBe('rate-limit:/login:ip-1');
    expect(CacheKeys.loginAttempts('user@test.com')).toBe('login-attempts:user@test.com');
  });

  it('should generate pattern keys', () => {
    expect(CacheKeys.patterns.user('u1')).toBe('user:u1*');
    expect(CacheKeys.patterns.allSessions()).toBe('session:*');
  });
});
