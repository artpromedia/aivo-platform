/**
 * Redis Store for Rate Limiting
 *
 * Provides distributed rate limiting using Redis with atomic Lua scripts
 * for consistency across multiple application instances.
 */

import type { Redis, Cluster } from 'ioredis';
import { RateLimitStore } from './types';
import { logger } from '../logger';

/**
 * Redis-based rate limit store with Lua scripts for atomic operations
 */
export class RedisStore implements RateLimitStore {
  private scriptsRegistered = false;

  constructor(
    private redis: Redis | Cluster,
    private prefix: string = 'ratelimit'
  ) {
    this.registerScripts();
  }

  /**
   * Register Lua scripts for atomic operations
   */
  private registerScripts(): void {
    if (this.scriptsRegistered) return;

    try {
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
      logger.debug('Redis Lua scripts registered');
    } catch (error) {
      logger.error('Failed to register Redis scripts', { error });
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(this.getKey(key));
    } catch (error) {
      logger.error('Redis GET error', { key, error });
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      if (ttlSeconds) {
        await this.redis.set(fullKey, value, 'EX', ttlSeconds);
      } else {
        await this.redis.set(fullKey, value);
      }
    } catch (error) {
      logger.error('Redis SET error', { key, error });
      throw error;
    }
  }

  async increment(key: string, amount: number = 1, ttlSeconds?: number): Promise<number> {
    try {
      const fullKey = this.getKey(key);

      if (ttlSeconds) {
        // Use MULTI for atomic increment + expire
        const multi = this.redis.multi();
        multi.incrby(fullKey, amount);
        // NX = only set expiry if key is new
        multi.expire(fullKey, ttlSeconds, 'NX');

        const results = await multi.exec();
        if (!results) throw new Error('Transaction failed');
        return results[0][1] as number;
      }

      return await this.redis.incrby(fullKey, amount);
    } catch (error) {
      logger.error('Redis INCREMENT error', { key, error });
      throw error;
    }
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(this.getKey(key), amount);
    } catch (error) {
      logger.error('Redis DECREMENT error', { key, error });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      logger.error('Redis DELETE error', { key, error });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error });
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(this.getKey(key), ttlSeconds);
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, error });
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.getKey(key));
    } catch (error) {
      logger.error('Redis TTL error', { key, error });
      throw error;
    }
  }

  async slidingWindowCount(key: string, minScore: number, maxScore: number): Promise<number> {
    try {
      return await this.redis.zcount(this.getKey(key), minScore, maxScore);
    } catch (error) {
      logger.error('Redis ZCOUNT error', { key, error });
      throw error;
    }
  }

  async slidingWindowAdd(key: string, score: number, windowMs: number): Promise<number> {
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
      logger.warn('Lua script failed, using fallback', { error });
      return this.slidingWindowAddFallback(key, score, windowMs);
    }
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

  async tokenBucketConsume(
    key: string,
    capacity: number,
    refillRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; tokens: number }> {
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
      logger.warn('Token bucket Lua script failed, using fallback', { error });
      return this.tokenBucketConsumeFallback(key, capacity, refillRate, cost, now);
    }
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

  async leakyBucketConsume(
    key: string,
    capacity: number,
    leakRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; water: number }> {
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
      logger.warn('Leaky bucket Lua script failed, using fallback', { error });
      return this.leakyBucketConsumeFallback(key, capacity, leakRate, cost, now);
    }
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

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(this.getKey(pattern));
    } catch (error) {
      logger.error('Redis KEYS error', { pattern, error });
      throw error;
    }
  }

  async flushAll(): Promise<void> {
    try {
      const keys = await this.keys('*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Redis FLUSHALL error', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    // Redis client is managed externally
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
