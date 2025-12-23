/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/no-unnecessary-condition */
/**
 * Redis Cache Implementation
 *
 * Production-ready Redis client wrapper implementing the CacheClient interface.
 * Supports connection pooling, automatic reconnection, and serialization.
 */

import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

import type { CacheClient, CacheConfig } from './types.js';

/**
 * Redis-based cache implementation.
 * Uses ioredis for connection management and operations.
 */
export class RedisCache implements CacheClient {
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private isConnected = false;

  constructor(config: CacheConfig) {
    this.keyPrefix = config.keyPrefix ?? 'learner-model:';

    const redisOptions: RedisOptions = {
      host: config.host,
      port: config.port,
      ...(config.password ? { password: config.password } : {}),
      db: config.db ?? 0,
      retryStrategy: (times: number) => {
        const maxRetries = config.maxRetries ?? 10;
        if (times > maxRetries) {
          return null; // Stop retrying
        }
        const delay = config.retryDelayMs ?? 100;
        return Math.min(times * delay, 5000);
      },
      connectTimeout: config.connectionTimeoutMs ?? 10000,
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    };

    this.client = new Redis(redisOptions);

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis connection error:', err.message);
    });
  }

  /**
   * Ensure connection is established before operations.
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Build a prefixed cache key.
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Serialize a value for storage.
   */
  private serialize(value: unknown): string {
    return JSON.stringify(value);
  }

  /**
   * Deserialize a stored value.
   */
  private deserialize<T>(value: string | null): T | null {
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      console.error('Failed to deserialize cache value');
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnection();
    const value = await this.client.get(this.buildKey(key));
    return this.deserialize<T>(value);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.ensureConnection();
    const serialized = this.serialize(value);
    const fullKey = this.buildKey(key);

    if (ttlSeconds === undefined) {
      await this.client.set(fullKey, serialized);
    } else {
      await this.client.setex(fullKey, ttlSeconds, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnection();
    await this.client.del(this.buildKey(key));
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await this.client.exists(this.buildKey(key));
    return result === 1;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    await this.ensureConnection();
    const fullKeys = keys.map((k) => this.buildKey(k));
    const values = await this.client.mget(...fullKeys);

    const result = new Map<string, T | null>();
    keys.forEach((key, index) => {
      const value = values[index];
      result.set(key, this.deserialize<T>(value ?? null));
    });
    return result;
  }

  async mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    await this.ensureConnection();

    if (entries.size === 0) {
      return;
    }

    const pipeline = this.client.pipeline();

    for (const [key, value] of entries) {
      const fullKey = this.buildKey(key);
      const serialized = this.serialize(value);

      if (ttlSeconds === undefined) {
        pipeline.set(fullKey, serialized);
      } else {
        pipeline.setex(fullKey, ttlSeconds, serialized);
      }
    }

    await pipeline.exec();
  }

  async mdelete(keys: string[]): Promise<void> {
    await this.ensureConnection();
    if (keys.length === 0) {
      return;
    }
    const fullKeys = keys.map((k) => this.buildKey(k));
    await this.client.del(...fullKeys);
  }

  async incr(key: string, increment = 1): Promise<number> {
    await this.ensureConnection();
    const fullKey = this.buildKey(key);
    if (increment === 1) {
      return await this.client.incr(fullKey);
    }
    return await this.client.incrby(fullKey, increment);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnection();
    await this.client.expire(this.buildKey(key), ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnection();
    return await this.client.ttl(this.buildKey(key));
  }

  async close(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

  /**
   * Get the underlying Redis client for advanced operations.
   * Use with caution - prefer the CacheClient interface methods.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if the cache is connected.
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Ping the Redis server to check connectivity.
   */
  async ping(): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

/**
 * Create a Redis cache instance from environment variables.
 */
export function createRedisCacheFromEnv(): RedisCache {
  const config: CacheConfig = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? Number.parseInt(process.env.REDIS_DB, 10) : undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'learner-model:',
  };

  return new RedisCache(config);
}
