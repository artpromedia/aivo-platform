/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { compress, decompress } from './compression.js';

/**
 * Multi-Layer Cache Manager
 *
 * Implements a hierarchical caching strategy:
 * L1: In-memory LRU cache (per-instance, microseconds)
 * L2: Redis cluster (shared, milliseconds)
 * L3: CDN edge cache (global, for HTTP responses)
 *
 * Features:
 * - Automatic cache invalidation patterns
 * - Cache stampede prevention
 * - Compression for large values
 * - Cache warming strategies
 * - Metrics and monitoring
 */

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    cluster?: boolean;
    clusterNodes?: Array<{ host: string; port: number }>;
    keyPrefix: string;
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    lazyConnect: boolean;
  };
  l1: {
    maxSize: number;
    maxAge: number;
    updateAgeOnGet: boolean;
  };
  l2: {
    defaultTtl: number;
    maxTtl: number;
    compressionThreshold: number;
  };
  stampede: {
    lockTimeout: number;
    waitTimeout: number;
    retryDelay: number;
  };
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  skipL1?: boolean;
  skipL2?: boolean;
  staleWhileRevalidate?: number;
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  hitRate: number;
  avgLatencyMs: number;
}

export type CacheableValue = string | number | boolean | object | null;

interface CacheEntry {
  value: any;
  tags: string[];
  expiresAt: number;
}

interface L2CacheResult<T> {
  value: T;
  tags: string[];
  ttl: number;
}

// Simplified logger and metrics for standalone package
const logger = {
  info: (msg: string, meta?: any) => console.log(`[cache] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[cache] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[cache] ${msg}`, meta || ''),
};

const metrics = {
  increment: (_name: string, _tags?: any) => {},
  histogram: (_name: string, _value: number, _tags?: any) => {},
  gauge: (_name: string, _value: number) => {},
};

export class CacheManager {
  private redis!: any;
  private redisSubscriber!: any;
  private l1Cache: LRUCache<string, CacheEntry>;
  private locks: Map<string, Promise<any>> = new Map();
  private config: CacheConfig;
  private stats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    totalLatencyMs: 0,
    operations: 0,
  };
  private statsInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = config;

    // Initialize L1 in-memory cache
    this.l1Cache = new LRUCache({
      max: config.l1.maxSize,
      ttl: config.l1.maxAge,
      updateAgeOnGet: config.l1.updateAgeOnGet,
      dispose: (_value, _key) => {
        metrics.increment('cache.l1.eviction');
      },
    });

    // Initialize Redis connection
    if (config.redis.cluster && config.redis.clusterNodes) {
      this.redis = new Redis.Cluster(config.redis.clusterNodes, {
        redisOptions: {
          password: config.redis.password,
          keyPrefix: config.redis.keyPrefix,
          maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
          enableReadyCheck: config.redis.enableReadyCheck,
          lazyConnect: config.redis.lazyConnect,
        },
      });
    } else {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        keyPrefix: config.redis.keyPrefix,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        enableReadyCheck: config.redis.enableReadyCheck,
        lazyConnect: config.redis.lazyConnect,
      });
    }

    // Initialize subscriber for cache invalidation
    this.redisSubscriber = this.redis.duplicate();
    this.setupInvalidationListener();

    // Report stats periodically
    this.statsInterval = setInterval(() => this.reportStats(), 60000);
  }

  /**
   * Get a value from cache with automatic fallback
   */
  async get<T extends CacheableValue>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const startTime = performance.now();
    const fullKey = this.normalizeKey(key);

    try {
      // Try L1 cache first
      if (!options.skipL1) {
        const l1Result = this.l1Cache.get(fullKey);
        if (l1Result && l1Result.expiresAt > Date.now()) {
          this.stats.l1Hits++;
          metrics.increment('cache.l1.hit');
          this.recordLatency(startTime);
          return l1Result.value as T;
        }
        this.stats.l1Misses++;
        metrics.increment('cache.l1.miss');
      }

      // Try L2 (Redis) cache
      if (!options.skipL2) {
        const l2Result = await this.getFromRedis<T>(fullKey);
        if (l2Result !== null) {
          this.stats.l2Hits++;
          metrics.increment('cache.l2.hit');

          // Populate L1 cache
          if (!options.skipL1) {
            this.setL1(fullKey, l2Result.value, l2Result.tags, l2Result.ttl);
          }

          this.recordLatency(startTime);
          return l2Result.value;
        }
        this.stats.l2Misses++;
        metrics.increment('cache.l2.miss');
      }

      this.recordLatency(startTime);
      return null;
    } catch (error) {
      const err = error as Error;
      logger.error('Cache get error', { key, error: err.message });
      metrics.increment('cache.error', { operation: 'get' });
      return null;
    }
  }

  /**
   * Get or compute a value with cache stampede prevention
   */
  async getOrSet<T extends CacheableValue>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Check for stale-while-revalidate
    if (options.staleWhileRevalidate) {
      const stale = await this.getStale<T>(key);
      if (stale !== null) {
        // Return stale value and refresh in background
        this.refreshInBackground(key, factory, options);
        return stale;
      }
    }

    // Prevent cache stampede with distributed lock
    return this.computeWithLock(key, factory, options);
  }

  /**
   * Set a value in cache
   */
  async set<T extends CacheableValue>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = performance.now();
    const fullKey = this.normalizeKey(key);
    const ttl = Math.min(
      options.ttl || this.config.l2.defaultTtl,
      this.config.l2.maxTtl
    );
    const tags = options.tags || [];

    try {
      // Set in L1 cache
      if (!options.skipL1) {
        this.setL1(fullKey, value, tags, ttl);
      }

      // Set in L2 (Redis) cache
      if (!options.skipL2) {
        await this.setInRedis(fullKey, value, ttl, tags, options.compress);
      }

      metrics.increment('cache.set');
      this.recordLatency(startTime);
    } catch (error) {
      const err = error as Error;
      logger.error('Cache set error', { key, error: err.message });
      metrics.increment('cache.error', { operation: 'set' });
      throw error;
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.normalizeKey(key);

    // Delete from L1
    this.l1Cache.delete(fullKey);

    // Delete from L2 and publish invalidation
    await this.redis.del(fullKey);
    await this.publishInvalidation({ type: 'key', key: fullKey });

    metrics.increment('cache.delete');
  }

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = `tag:${tag}`;

    // Get all keys associated with this tag
    const keys = await this.redis.smembers(tagKey);

    if (keys.length === 0) {
      return 0;
    }

    // Delete all tagged keys
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.del(key);
      this.l1Cache.delete(key);
    }
    pipeline.del(tagKey);
    await pipeline.exec();

    // Publish invalidation for other instances
    await this.publishInvalidation({ type: 'tag', tag });

    metrics.increment('cache.invalidate.tag', { tag });
    logger.info('Cache invalidated by tag', { tag, keysInvalidated: keys.length });

    return keys.length;
  }

  /**
   * Invalidate keys matching a pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const fullPattern = `${this.config.redis.keyPrefix}${pattern}`;
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        fullPattern,
        'COUNT',
        100
      );
      cursor = newCursor;

      if (keys.length > 0) {
        // Remove prefix for deletion (Redis adds it back)
        const unprefixedKeys = keys.map((k) =>
          k.replace(this.config.redis.keyPrefix, '')
        );

        await this.redis.del(...unprefixedKeys);
        unprefixedKeys.forEach((k) => this.l1Cache.delete(k));
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    await this.publishInvalidation({ type: 'pattern', pattern });
    metrics.increment('cache.invalidate.pattern');

    return totalDeleted;
  }

  /**
   * Warm cache with precomputed values
   */
  async warmCache<T extends CacheableValue>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const entry of entries) {
      const fullKey = this.normalizeKey(entry.key);
      const ttl = entry.options?.ttl || this.config.l2.defaultTtl;
      const serialized = this.serialize({ value: entry.value, tags: entry.options?.tags || [] }, false);

      pipeline.setex(fullKey, ttl, serialized);

      // Also warm L1
      this.setL1(fullKey, entry.value, entry.options?.tags || [], ttl);
    }

    await pipeline.exec();
    metrics.increment('cache.warm', { count: entries.length });
    logger.info('Cache warmed', { entriesCount: entries.length });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total =
      this.stats.l1Hits +
      this.stats.l1Misses +
      this.stats.l2Hits +
      this.stats.l2Misses;
    const hits = this.stats.l1Hits + this.stats.l2Hits;

    return {
      l1Hits: this.stats.l1Hits,
      l1Misses: this.stats.l1Misses,
      l2Hits: this.stats.l2Hits,
      l2Misses: this.stats.l2Misses,
      hitRate: total > 0 ? hits / total : 0,
      avgLatencyMs:
        this.stats.operations > 0
          ? this.stats.totalLatencyMs / this.stats.operations
          : 0,
    };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    await this.redis.flushdb();
    await this.publishInvalidation({ type: 'clear' });
    logger.info('Cache cleared');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    this.reportStats();
    await this.redis.quit();
    await this.redisSubscriber.quit();
    logger.info('Cache manager shut down');
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  private setL1(
    key: string,
    value: any,
    tags: string[],
    ttlSeconds: number
  ): void {
    this.l1Cache.set(key, {
      value,
      tags,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async getFromRedis<T>(
    key: string
  ): Promise<L2CacheResult<T> | null> {
    const [data, ttl] = await Promise.all([
      this.redis.get(key),
      this.redis.ttl(key),
    ]);

    if (data === null) {
      return null;
    }

    const parsed = this.deserialize<{ value: T; tags: string[] }>(data);
    return {
      value: parsed.value,
      tags: parsed.tags || [],
      ttl: ttl > 0 ? ttl : this.config.l2.defaultTtl,
    };
  }

  private async setInRedis<T>(
    key: string,
    value: T,
    ttl: number,
    tags: string[],
    forceCompress?: boolean
  ): Promise<void> {
    const wrapper = { value, tags };
    const serialized = this.serialize(wrapper, forceCompress);

    const pipeline = this.redis.pipeline();

    // Set the value
    pipeline.setex(key, ttl, serialized);

    // Associate with tags for invalidation
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, ttl + 3600);
    }

    await pipeline.exec();
  }

  private serialize(value: any, forceCompress?: boolean): string {
    const json = JSON.stringify(value);

    const shouldCompress =
      forceCompress || json.length > this.config.l2.compressionThreshold;

    if (shouldCompress) {
      const compressed = compress(json);
      return `__compressed__${compressed}`;
    }

    return json;
  }

  private deserialize<T>(data: string): T {
    if (data.startsWith('__compressed__')) {
      const compressed = data.slice('__compressed__'.length);
      const decompressed = decompress(compressed);
      return JSON.parse(decompressed);
    }
    return JSON.parse(data);
  }

  private async computeWithLock<T extends CacheableValue>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const lockKey = `lock:${key}`;
    const lockValue = `${process.pid}:${Date.now()}`;

    // Try to acquire lock
    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      this.config.stampede.lockTimeout,
      'NX'
    );

    if (acquired) {
      try {
        // We have the lock, compute the value
        const value = await factory();
        await this.set(key, value as any, options);
        return value;
      } finally {
        // Release lock only if we still own it
        const currentLock = await this.redis.get(lockKey);
        if (currentLock === lockValue) {
          await this.redis.del(lockKey);
        }
      }
    }

    // Wait for the lock holder to compute
    return this.waitForComputation(key, lockKey, options);
  }

  private async waitForComputation<T extends CacheableValue>(
    key: string,
    lockKey: string,
    options: CacheOptions
  ): Promise<T> {
    const startTime = Date.now();
    const timeout = this.config.stampede.waitTimeout;
    const retryDelay = this.config.stampede.retryDelay;

    while (Date.now() - startTime < timeout) {
      await this.sleep(retryDelay);

      // Check if value is now in cache
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // Check if lock is still held
      const lockExists = await this.redis.exists(lockKey);
      if (!lockExists) {
        break;
      }
    }

    throw new Error(`Cache computation timeout for key: ${key}`);
  }

  private async getStale<T>(key: string): Promise<T | null> {
    const staleKey = `stale:${key}`;
    const data = await this.redis.get(staleKey);

    if (data === null) {
      return null;
    }

    return this.deserialize<{ value: T }>(data).value;
  }

  private refreshInBackground<T extends CacheableValue>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): void {
    setImmediate(async () => {
      try {
        await this.computeWithLock(key, factory, options);
      } catch (error) {
        const err = error as Error;
        logger.error('Background cache refresh failed', {
          key,
          error: err.message,
        });
      }
    });
  }

  private async publishInvalidation(message: {
    type: 'key' | 'tag' | 'pattern' | 'clear';
    key?: string;
    tag?: string;
    pattern?: string;
  }): Promise<void> {
    await this.redis.publish('cache:invalidation', JSON.stringify(message));
  }

  private setupInvalidationListener(): void {
    this.redisSubscriber.subscribe('cache:invalidation');

    this.redisSubscriber.on('message', (channel, message) => {
      if (channel !== 'cache:invalidation') return;

      try {
        const { type, key, tag, pattern } = JSON.parse(message);

        switch (type) {
          case 'key':
            if (key) this.l1Cache.delete(key);
            break;
          case 'tag':
            for (const [k, v] of this.l1Cache.entries()) {
              if (v.tags.includes(tag)) {
                this.l1Cache.delete(k);
              }
            }
            break;
          case 'pattern':
            if (pattern) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              for (const k of this.l1Cache.keys()) {
                if (regex.test(k)) {
                  this.l1Cache.delete(k);
                }
              }
            }
            break;
          case 'clear':
            this.l1Cache.clear();
            break;
        }
      } catch (error) {
        const err = error as Error;
        logger.error('Invalidation message parse error', { error: err.message });
      }
    });
  }

  private recordLatency(startTime: number): void {
    const latency = performance.now() - startTime;
    this.stats.totalLatencyMs += latency;
    this.stats.operations++;
    metrics.histogram('cache.latency_ms', latency);
  }

  private reportStats(): void {
    const stats = this.getStats();
    metrics.gauge('cache.hit_rate', stats.hitRate);
    metrics.gauge('cache.avg_latency_ms', stats.avgLatencyMs);
    metrics.gauge('cache.l1.size', this.l1Cache.size);

    logger.info('Cache stats', stats);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    throw new Error('CacheManager not initialized');
  }
  return cacheManagerInstance;
}

export function initCacheManager(config: CacheConfig): CacheManager {
  cacheManagerInstance = new CacheManager(config);
  return cacheManagerInstance;
}
