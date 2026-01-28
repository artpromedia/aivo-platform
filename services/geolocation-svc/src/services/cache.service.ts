import type Redis from 'ioredis';

import { logger } from '../utils/logger';

export class CacheService {
  constructor(private readonly redis: Redis) {}
  
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch {
      logger.warn(`Cache get failed for key ${key}`);
      return null;
    }
  }
  
  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch {
      logger.warn(`Cache set failed for key ${key}`);
    }
  }
  
  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      logger.warn(`Cache delete failed for key ${key}`);
    }
  }
  
  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      logger.warn(`Cache deletePattern failed for ${pattern}`);
    }
  }
  
  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch {
      logger.warn(`Cache exists check failed for key ${key}`);
      return false;
    }
  }
  
  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch {
      logger.warn(`Cache ttl failed for key ${key}`);
      return -2; // Key doesn't exist
    }
  }
  
  /**
   * Increment a counter
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttlSeconds && value === 1) {
        // Set TTL only on first increment
        await this.redis.expire(key, ttlSeconds);
      }
      return value;
    } catch {
      logger.warn(`Cache incr failed for key ${key}`);
      return 0;
    }
  }
}
