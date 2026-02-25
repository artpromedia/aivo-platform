/**
 * Redis Store for Rate Limiting
 *
 * Provides distributed rate limiting using Redis with atomic Lua scripts
 * for consistency across multiple application instances.
 *
 * Supports fail-open mode for resilience: when Redis is unavailable,
 * operations return safe defaults instead of throwing errors.
 */

import Redis from 'ioredis';
import type { Cluster } from 'ioredis';

import type { Logger } from '../logger';
import { logger as globalLogger, noopLogger } from '../logger';

import type { RateLimitStore } from './types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface RedisStoreOptions {
  /** Redis client instance (mutually exclusive with redisUrl) */
  client?: Redis | Cluster;
  /** Redis connection URL (mutually exclusive with client) */
  redisUrl?: string;
  /** Key prefix for namespacing (default: 'ratelimit') */
  keyPrefix?: string;
  /** When true, return safe defaults on Redis errors instead of throwing (default: true) */
  failOpen?: boolean;
  /** Logger instance (default: global logger) */
  logger?: Logger;
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convenience factory to create a RedisStore from a connection URL.
 *
 * @example
 * ```typescript
 * const store = createRedisStore('redis://localhost:6379', { failOpen: true });
 * ```
 */
export function createRedisStore(
  redisUrl: string,
  options: Omit<RedisStoreOptions, 'client' | 'redisUrl'> = {}
): RedisStore {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    enableReadyCheck: true,
    lazyConnect: false,
  });
  return new RedisStore({ client, ...options });
}

// ══════════════════════════════════════════════════════════════════════════════
// REDIS STORE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Redis-based rate limit store with Lua scripts for atomic operations.
 *
 * Supports two constructor signatures for backward compatibility:
 * - Legacy: `new RedisStore(redis, prefix?)`
 * - Options: `new RedisStore({ client, keyPrefix, failOpen, logger })`
 */
export class RedisStore implements RateLimitStore {
  private scriptsRegistered = false;
  private redis: Redis | Cluster;
  private prefix: string;
  private failOpen: boolean;
  private log: Logger;
  private ownsClient = false;

  constructor(options: RedisStoreOptions);
  constructor(redis: Redis | Cluster, prefix?: string);
  constructor(
    optionsOrRedis: RedisStoreOptions | Redis | Cluster,
    legacyPrefix?: string
  ) {
    // Detect legacy vs options constructor
    if (this.isRedisClient(optionsOrRedis)) {
      // Legacy: new RedisStore(redis, prefix?)
      this.redis = optionsOrRedis;
      this.prefix = legacyPrefix ?? 'ratelimit';
      this.failOpen = false;
      this.log = globalLogger;
    } else {
      // Options: new RedisStore({ client, keyPrefix, ... })
      const opts = optionsOrRedis;
      if (!opts.client && !opts.redisUrl) {
        throw new Error('RedisStore requires either a client or redisUrl option');
      }
      if (opts.redisUrl && !opts.client) {
        this.redis = new Redis(opts.redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 10) return null;
            return Math.min(times * 200, 2000);
          },
          enableReadyCheck: true,
          lazyConnect: false,
        });
        this.ownsClient = true;
      } else {
        this.redis = opts.client!;
      }
      this.prefix = opts.keyPrefix ?? 'ratelimit';
      this.failOpen = opts.failOpen ?? true;
      this.log = opts.logger ?? globalLogger;
    }

    this.registerScripts();
  }

  private isRedisClient(obj: unknown): obj is Redis | Cluster {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      typeof (obj as Redis).ping === 'function' &&
      typeof (obj as Redis).get === 'function'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FAIL-OPEN HELPER
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Wrap an async operation with fail-open behavior.
   * When failOpen is true, Redis errors return the provided fallback value.
   */
  private async withFailOpen<T>(
    operation: string,
    fallback: T,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.log.error(`Redis ${operation} error`, { ...meta, error });
      if (this.failOpen) {
        this.log.warn(`Fail-open: returning default for ${operation}`, meta);
        return fallback;
      }
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LUA SCRIPTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Register Lua scripts for atomic operations
   */
  private registerScripts(): void {
    if (this.scriptsRegistered) return;

    try {
      // Atomic increment with PEXPIRE in a single round-trip
      (this.redis as Redis).defineCommand('atomicIncrement', {
        numberOfKeys: 1,
        lua: `
          local key   = KEYS[1]
          local amt   = tonumber(ARGV[1])
          local ttlMs = tonumber(ARGV[2])
          local v = redis.call('INCRBY', key, amt)
          if v == amt then
            redis.call('PEXPIRE', key, ttlMs)
          end
          return v
        `,
      });

      // Token bucket consume script
      (this.redis as Redis).defineCommand('tokenBucketConsume', {
        numberOfKeys: 1,
        lua: `
          local key = KEYS[1]
          local capacity = tonumber(ARGV[1])
          local refill_rate = tonumber(ARGV[2])
          local cost = tonumber(ARGV[3])
          local now = tonumber(ARGV[4])
          local ttl = math.ceil(capacity / refill_rate) + 60

          local data = redis.call('GET', key)
          local tokens, last_refill

          if data then
            local parsed = cjson.decode(data)
            tokens = parsed.tokens
            last_refill = parsed.last_refill
          else
            tokens = capacity
            last_refill = now
          end

          -- Calculate refill
          local elapsed = (now - last_refill) / 1000
          tokens = math.min(capacity, tokens + (elapsed * refill_rate))

          local success = false
          if tokens >= cost then
            tokens = tokens - cost
            success = true
          end

          -- Save state
          local state = cjson.encode({tokens = tokens, last_refill = now})
          redis.call('SET', key, state, 'EX', ttl)

          return cjson.encode({success = success, tokens = tokens})
        `,
      });

      // Sliding window add script
      (this.redis as Redis).defineCommand('slidingWindowAdd', {
        numberOfKeys: 1,
        lua: `
          local key = KEYS[1]
          local score = tonumber(ARGV[1])
          local window_ms = tonumber(ARGV[2])
          local member = ARGV[1] .. ':' .. math.random(1000000)

          -- Add new request
          redis.call('ZADD', key, score, member)

          -- Remove old entries
          local cutoff = score - window_ms
          redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

          -- Set expiry
          redis.call('PEXPIRE', key, window_ms * 2)

          return redis.call('ZCARD', key)
        `,
      });

      // Leaky bucket consume script
      (this.redis as Redis).defineCommand('leakyBucketConsume', {
        numberOfKeys: 1,
        lua: `
          local key = KEYS[1]
          local capacity = tonumber(ARGV[1])
          local leak_rate = tonumber(ARGV[2])
          local cost = tonumber(ARGV[3])
          local now = tonumber(ARGV[4])
          local ttl = math.ceil(capacity / leak_rate) + 60

          local data = redis.call('GET', key)
          local water, last_leak

          if data then
            local parsed = cjson.decode(data)
            water = parsed.water
            last_leak = parsed.last_leak
          else
            water = 0
            last_leak = now
          end

          -- Calculate leak
          local elapsed = (now - last_leak) / 1000
          water = math.max(0, water - (elapsed * leak_rate))

          local success = false
          if water + cost <= capacity then
            water = water + cost
            success = true
          end

          -- Save state
          local state = cjson.encode({water = water, last_leak = now})
          redis.call('SET', key, state, 'EX', ttl)

          return cjson.encode({success = success, water = water})
        `,
      });

      this.scriptsRegistered = true;
      this.log.debug('Redis Lua scripts registered');
    } catch (error) {
      this.log.error('Failed to register Redis scripts', { error });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // KEY HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /** Expose the underlying Redis client (for advanced use / testing) */
  getClient(): Redis | Cluster {
    return this.redis;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BASIC OPERATIONS (fail-open wrapped)
  // ══════════════════════════════════════════════════════════════════════════

  async get(key: string): Promise<string | null> {
    return this.withFailOpen('GET', null, () => this.redis.get(this.getKey(key)), { key });
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.withFailOpen('SET', undefined, async () => {
      const fullKey = this.getKey(key);
      if (ttlSeconds) {
        await this.redis.set(fullKey, value, 'EX', ttlSeconds);
      } else {
        await this.redis.set(fullKey, value);
      }
    }, { key });
  }

  async increment(key: string, amount = 1, ttlSeconds?: number): Promise<number> {
    return this.withFailOpen('INCREMENT', 0, async () => {
      const fullKey = this.getKey(key);

      if (ttlSeconds) {
        // Use Lua atomic increment (single round-trip) when possible
        try {
          const result = await (this.redis as any).atomicIncrement(
            fullKey,
            amount,
            ttlSeconds * 1000
          );
          return result as number;
        } catch {
          // Fallback to MULTI for cluster / script-disabled scenarios
          const multi = this.redis.multi();
          multi.incrby(fullKey, amount);
          multi.expire(fullKey, ttlSeconds, 'NX');
          const results = await multi.exec();
          if (!results) throw new Error('Transaction failed');
          return results[0][1] as number;
        }
      }

      return await this.redis.incrby(fullKey, amount);
    }, { key });
  }

  async decrement(key: string, amount = 1): Promise<number> {
    return this.withFailOpen('DECREMENT', 0, () =>
      this.redis.decrby(this.getKey(key), amount), { key });
  }

  async delete(key: string): Promise<void> {
    return this.withFailOpen('DELETE', undefined, async () => {
      await this.redis.del(this.getKey(key));
    }, { key });
  }

  async exists(key: string): Promise<boolean> {
    return this.withFailOpen('EXISTS', false, async () => {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    }, { key });
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    return this.withFailOpen('EXPIRE', undefined, async () => {
      await this.redis.expire(this.getKey(key), ttlSeconds);
    }, { key });
  }

  async ttl(key: string): Promise<number> {
    return this.withFailOpen('TTL', -1, () =>
      this.redis.ttl(this.getKey(key)), { key });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDING WINDOW
  // ══════════════════════════════════════════════════════════════════════════

  async slidingWindowCount(key: string, minScore: number, maxScore: number): Promise<number> {
    return this.withFailOpen('ZCOUNT', 0, () =>
      this.redis.zcount(this.getKey(key), minScore, maxScore), { key });
  }

  async slidingWindowAdd(key: string, score: number, windowMs: number): Promise<number> {
    return this.withFailOpen('slidingWindowAdd', 0, async () => {
      try {
        // Use the registered Lua script
        const result = await (this.redis as any).slidingWindowAdd(
          this.getKey(key),
          score,
          windowMs
        );
        return result as number;
      } catch (error) {
        // Fallback to manual implementation
        this.log.warn('Lua script failed, using fallback', { error });
        return this.slidingWindowAddFallback(key, score, windowMs);
      }
    }, { key });
  }

  private async slidingWindowAddFallback(key: string, score: number, windowMs: number): Promise<number> {
    const fullKey = this.getKey(key);
    const member = `${score}:${Math.random().toString(36).substring(2, 9)}`;
    const cutoff = score - windowMs;

    const multi = this.redis.multi();
    multi.zadd(fullKey, score, member);
    multi.zremrangebyscore(fullKey, '-inf', cutoff);
    multi.pexpire(fullKey, windowMs * 2);
    multi.zcard(fullKey);

    const results = await multi.exec();
    if (!results) throw new Error('Transaction failed');
    return results[3][1] as number;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOKEN BUCKET
  // ══════════════════════════════════════════════════════════════════════════

  async tokenBucketConsume(
    key: string,
    capacity: number,
    refillRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; tokens: number }> {
    return this.withFailOpen(
      'tokenBucketConsume',
      { success: true, tokens: capacity }, // fail-open: allow the request
      async () => {
        try {
          const result = await (this.redis as any).tokenBucketConsume(
            this.getKey(`${key}:bucket`),
            capacity,
            refillRate,
            cost,
            now
          );
          return JSON.parse(result);
        } catch (error) {
          this.log.warn('Token bucket Lua script failed, using fallback', { error });
          return this.tokenBucketConsumeFallback(key, capacity, refillRate, cost, now);
        }
      },
      { key }
    );
  }

  private async tokenBucketConsumeFallback(
    key: string,
    capacity: number,
    refillRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; tokens: number }> {
    const stateKey = this.getKey(`${key}:bucket`);
    const data = await this.redis.get(stateKey);

    let tokens: number;
    let lastRefill: number;

    if (data) {
      const state = JSON.parse(data);
      tokens = state.tokens;
      lastRefill = state.last_refill;
    } else {
      tokens = capacity;
      lastRefill = now;
    }

    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(capacity, tokens + elapsed * refillRate);

    let success = false;
    if (tokens >= cost) {
      tokens -= cost;
      success = true;
    }

    const ttl = Math.ceil(capacity / refillRate) + 60;
    await this.redis.set(stateKey, JSON.stringify({ tokens, last_refill: now }), 'EX', ttl);

    return { success, tokens };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEAKY BUCKET
  // ══════════════════════════════════════════════════════════════════════════

  async leakyBucketConsume(
    key: string,
    capacity: number,
    leakRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; water: number }> {
    return this.withFailOpen(
      'leakyBucketConsume',
      { success: true, water: 0 }, // fail-open: allow the request
      async () => {
        try {
          const result = await (this.redis as any).leakyBucketConsume(
            this.getKey(`${key}:leaky`),
            capacity,
            leakRate,
            cost,
            now
          );
          return JSON.parse(result);
        } catch (error) {
          this.log.warn('Leaky bucket Lua script failed, using fallback', { error });
          return this.leakyBucketConsumeFallback(key, capacity, leakRate, cost, now);
        }
      },
      { key }
    );
  }

  private async leakyBucketConsumeFallback(
    key: string,
    capacity: number,
    leakRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; water: number }> {
    const stateKey = this.getKey(`${key}:leaky`);
    const data = await this.redis.get(stateKey);

    let water: number;
    let lastLeak: number;

    if (data) {
      const state = JSON.parse(data);
      water = state.water;
      lastLeak = state.last_leak;
    } else {
      water = 0;
      lastLeak = now;
    }

    const elapsed = (now - lastLeak) / 1000;
    water = Math.max(0, water - elapsed * leakRate);

    let success = false;
    if (water + cost <= capacity) {
      water += cost;
      success = true;
    }

    const ttl = Math.ceil(capacity / leakRate) + 60;
    await this.redis.set(stateKey, JSON.stringify({ water, last_leak: now }), 'EX', ttl);

    return { success, water };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ══════════════════════════════════════════════════════════════════════════

  async keys(pattern: string): Promise<string[]> {
    return this.withFailOpen('KEYS', [], () =>
      this.redis.keys(this.getKey(pattern)), { pattern });
  }

  async flushAll(): Promise<void> {
    return this.withFailOpen('FLUSHALL', undefined, async () => {
      const allKeys = await this.redis.keys(this.getKey('*'));
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
      }
    });
  }

  async close(): Promise<void> {
    if (this.ownsClient) {
      await this.redis.quit();
    }
    // Otherwise Redis client is managed externally
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
