/**
 * AI Cache
 *
 * Caching layer for AI operations to reduce API calls and improve response times.
 * Supports both in-memory and Redis-based caching.
 */

import type { CacheConfig, CachedResult } from '../types/ai-authoring.js';

// ══════════════════════════════════════════════════════════════════════════════
// CACHE INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface AICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache implements AICache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.defaultTtl = config?.ttlSeconds ?? 3600; // 1 hour default
    this.maxSize = config?.maxSize ?? 1000;

    // Start cleanup interval
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Enforce max size - remove oldest entries if needed
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = ttlSeconds ?? this.defaultTtl;
    const expiresAt = Date.now() + ttl * 1000;

    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; defaultTtl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTtl: this.defaultTtl,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  private evictOldest(): void {
    // Remove the oldest 10% of entries
    const toRemove = Math.max(Math.floor(this.maxSize * 0.1), 1);
    const keys = Array.from(this.cache.keys()).slice(0, toRemove);
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REDIS CACHE IMPLEMENTATION (Placeholder)
// ══════════════════════════════════════════════════════════════════════════════

export class RedisCache implements AICache {
  private readonly prefix: string;
  private readonly defaultTtl: number;
  private client: any; // Would be ioredis client in production

  constructor(config?: { redisUrl?: string; prefix?: string; ttlSeconds?: number }) {
    this.prefix = config?.prefix ?? 'ai-authoring:';
    this.defaultTtl = config?.ttlSeconds ?? 3600;

    // In production, initialize Redis client here
    // this.client = new Redis(config?.redisUrl);
    console.info('RedisCache initialized (placeholder - using in-memory fallback)');
  }

  async get<T>(key: string): Promise<T | null> {
    // Placeholder implementation
    // const value = await this.client.get(this.prefix + key);
    // return value ? JSON.parse(value) : null;
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Placeholder implementation
    // const ttl = ttlSeconds ?? this.defaultTtl;
    // await this.client.setex(this.prefix + key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    // await this.client.del(this.prefix + key);
  }

  async clear(): Promise<void> {
    // const keys = await this.client.keys(this.prefix + '*');
    // if (keys.length > 0) {
    //   await this.client.del(...keys);
    // }
  }

  async has(key: string): Promise<boolean> {
    // return (await this.client.exists(this.prefix + key)) === 1;
    return false;
  }

  async disconnect(): Promise<void> {
    // await this.client.quit();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE MANAGER
// ══════════════════════════════════════════════════════════════════════════════

export class CacheManager {
  private readonly alignmentCache: AICache;
  private readonly qualityCache: AICache;
  private readonly draftCache: AICache;

  constructor(config?: {
    alignment?: Partial<CacheConfig>;
    quality?: Partial<CacheConfig>;
    draft?: Partial<CacheConfig>;
  }) {
    // Use different TTLs for different cache types
    this.alignmentCache = new InMemoryCache({
      ttlSeconds: config?.alignment?.ttlSeconds ?? 86400, // 24 hours
      maxSize: config?.alignment?.maxSize ?? 500,
    });

    this.qualityCache = new InMemoryCache({
      ttlSeconds: config?.quality?.ttlSeconds ?? 3600, // 1 hour
      maxSize: config?.quality?.maxSize ?? 500,
    });

    this.draftCache = new InMemoryCache({
      ttlSeconds: config?.draft?.ttlSeconds ?? 7200, // 2 hours
      maxSize: config?.draft?.maxSize ?? 200,
    });
  }

  /**
   * Get alignment cache
   */
  getAlignmentCache(): AICache {
    return this.alignmentCache;
  }

  /**
   * Get quality cache
   */
  getQualityCache(): AICache {
    return this.qualityCache;
  }

  /**
   * Get draft cache
   */
  getDraftCache(): AICache {
    return this.draftCache;
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.alignmentCache.clear(),
      this.qualityCache.clear(),
      this.draftCache.clear(),
    ]);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cache key from multiple parts
 */
export function buildCacheKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p)).join(':');
}

/**
 * Hash a string for use in cache keys
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a content-based cache key
 */
export function contentCacheKey(prefix: string, content: string, ...extras: string[]): string {
  const contentHash = hashString(content);
  return buildCacheKey([prefix, contentHash, ...extras]);
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ══════════════════════════════════════════════════════════════════════════════

let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

export function createCacheManager(config?: {
  alignment?: Partial<CacheConfig>;
  quality?: Partial<CacheConfig>;
  draft?: Partial<CacheConfig>;
}): CacheManager {
  return new CacheManager(config);
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHED FUNCTION WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap an async function with caching
 */
export function withCache<T, Args extends unknown[]>(
  cache: AICache,
  keyFn: (...args: Args) => string,
  fn: (...args: Args) => Promise<T>,
  ttlSeconds?: number
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const key = keyFn(...args);

    // Check cache
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    await cache.set(key, result, ttlSeconds);

    return result;
  };
}
