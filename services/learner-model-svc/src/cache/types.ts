/**
 * Cache Layer Types
 *
 * Type definitions for the caching layer used by the learner model.
 * Supports both Redis and in-memory implementations.
 */

/**
 * Generic cache interface for learner model state caching.
 */
export interface CacheClient {
  /**
   * Get a value from the cache.
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in the cache.
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time-to-live in seconds (optional)
   */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a value from the cache.
   * @param key Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists in the cache.
   * @param key Cache key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get multiple values from the cache.
   * @param keys Array of cache keys
   * @returns Map of key to value (null if not found)
   */
  mget<T>(keys: string[]): Promise<Map<string, T | null>>;

  /**
   * Set multiple values in the cache.
   * @param entries Map of key-value pairs
   * @param ttlSeconds Time-to-live in seconds (optional)
   */
  mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void>;

  /**
   * Delete multiple values from the cache.
   * @param keys Array of cache keys
   */
  mdelete(keys: string[]): Promise<void>;

  /**
   * Increment a numeric value in the cache.
   * @param key Cache key
   * @param increment Amount to increment (default: 1)
   * @returns The new value
   */
  incr(key: string, increment?: number): Promise<number>;

  /**
   * Set expiration time on an existing key.
   * @param key Cache key
   * @param ttlSeconds Time-to-live in seconds
   */
  expire(key: string, ttlSeconds: number): Promise<void>;

  /**
   * Get the remaining TTL of a key.
   * @param key Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  ttl(key: string): Promise<number>;

  /**
   * Close the cache connection.
   */
  close(): Promise<void>;
}

/**
 * Cache key prefixes for different data types.
 */
export const CACHE_PREFIXES = {
  LEARNER_MODEL: 'lm:',
  BKT_STATE: 'bkt:',
  ENGAGEMENT: 'eng:',
  SESSION_PLAN: 'sp:',
  SKILL_MASTERY: 'sm:',
  RECOMMENDATIONS: 'rec:',
} as const;

/**
 * Default TTL values in seconds.
 */
export const DEFAULT_TTL = {
  LEARNER_MODEL: 3600, // 1 hour
  BKT_STATE: 7200, // 2 hours
  ENGAGEMENT: 300, // 5 minutes
  SESSION_PLAN: 1800, // 30 minutes
  SKILL_MASTERY: 3600, // 1 hour
  RECOMMENDATIONS: 600, // 10 minutes
} as const;

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string | undefined;
  db?: number | undefined;
  keyPrefix?: string | undefined;
  maxRetries?: number | undefined;
  retryDelayMs?: number | undefined;
  connectionTimeoutMs?: number | undefined;
}
