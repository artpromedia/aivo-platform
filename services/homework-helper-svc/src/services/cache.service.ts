/**
 * Cache Service
 * Provides caching functionality for OCR results and other data
 * Uses in-memory cache with optional Redis support
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxSize: number; // maximum number of entries
  cleanupInterval: number; // milliseconds
  redisUrl?: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hitCount: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class CacheService {
  private readonly cache: Map<string, CacheEntry<string>> = new Map();
  private readonly config: CacheConfig;
  private cleanupTimer: NodeJS.Timer | null = null;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: config?.defaultTTL ?? 24 * 60 * 60, // 24 hours
      maxSize: config?.maxSize ?? 10000,
      cleanupInterval: config?.cleanupInterval ?? 60 * 1000, // 1 minute
      redisUrl: config?.redisUrl ?? process.env.REDIS_URL,
    };

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get a value from the cache
   */
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update hit count
    entry.hitCount++;
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.config.defaultTTL;
    const now = Date.now();

    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: now + ttl * 1000,
      hitCount: 0,
      createdAt: now,
    });
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Check if a key exists in the cache
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet(
    key: string,
    factory: () => Promise<string>,
    ttlSeconds?: number
  ): Promise<string> {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let oldestCreatedAt = Infinity;
    let newestCreatedAt = 0;

    for (const entry of this.cache.values()) {
      if (entry.createdAt < oldestCreatedAt) {
        oldestCreatedAt = entry.createdAt;
      }
      if (entry.createdAt > newestCreatedAt) {
        newestCreatedAt = entry.createdAt;
      }
    }

    const totalRequests = this.hits + this.misses;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      oldestEntry: oldestCreatedAt < Infinity ? new Date(oldestCreatedAt) : undefined,
      newestEntry: newestCreatedAt > 0 ? new Date(newestCreatedAt) : undefined,
    };
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );

    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const entry = this.cache.get(key);
        if (entry && Date.now() <= entry.expiresAt) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, amount: number = 1): Promise<number> {
    const current = await this.get(key);
    const value = current ? Number.parseInt(current, 10) : 0;
    const newValue = value + amount;

    await this.set(key, newValue.toString());

    return newValue;
  }

  /**
   * Set expiration on an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry || Date.now() > entry.expiresAt) {
      return false;
    }

    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }

  /**
   * Get time-to-live for a key
   */
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);

    if (!entry) {
      return -2; // Key does not exist
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return -2;
    }

    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  /**
   * Stop the cleanup timer
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Don't prevent process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  private evictOldest(): void {
    // Find the oldest entry (LRU-style eviction)
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Consider both creation time and hit count
      const lastActivity = entry.createdAt + entry.hitCount * 1000;
      if (lastActivity < oldestAccess) {
        oldestAccess = lastActivity;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED CACHE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a namespaced cache key
 */
export function createCacheKey(namespace: string, ...parts: string[]): string {
  return `${namespace}:${parts.join(':')}`;
}

/**
 * OCR result cache helpers
 */
export const ocrCacheKeys = {
  result: (uploadId: string) => createCacheKey('ocr', 'result', uploadId),
  imageHash: (hash: string) => createCacheKey('ocr', 'hash', hash),
  providerStatus: (provider: string) => createCacheKey('ocr', 'status', provider),
};

/**
 * Upload cache helpers
 */
export const uploadCacheKeys = {
  upload: (uploadId: string) => createCacheKey('upload', uploadId),
  userUploads: (userId: string) => createCacheKey('upload', 'user', userId),
};

/**
 * Cost tracking cache helpers
 */
export const costCacheKeys = {
  tenantUsage: (tenantId: string, month: string) =>
    createCacheKey('cost', 'tenant', tenantId, month),
  providerUsage: (provider: string, date: string) =>
    createCacheKey('cost', 'provider', provider, date),
};

// Export singleton instance
export const cacheService = new CacheService();
