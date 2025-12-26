/**
 * Rate Limit Store Interface
 *
 * Defines the contract for rate limit data storage backends
 */

export interface RateLimitStore {
  /**
   * Get a value by key
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value with optional TTL
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;

  /**
   * Increment a counter atomically
   */
  increment(key: string, amount?: number, ttlSeconds?: number): Promise<number>;

  /**
   * Decrement a counter atomically
   */
  decrement(key: string, amount?: number): Promise<number>;

  /**
   * Delete a key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Set expiry on a key
   */
  expire(key: string, ttlSeconds: number): Promise<void>;

  /**
   * Get TTL of a key in seconds
   */
  ttl(key: string): Promise<number>;

  // Sliding window operations

  /**
   * Count entries in a sorted set within a score range
   */
  slidingWindowCount(key: string, minScore: number, maxScore: number): Promise<number>;

  /**
   * Add an entry to the sliding window
   */
  slidingWindowAdd(key: string, score: number, windowMs: number): Promise<number>;

  // Token bucket operations

  /**
   * Consume tokens from a token bucket
   */
  tokenBucketConsume(
    key: string,
    capacity: number,
    refillRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; tokens: number }>;

  // Leaky bucket operations

  /**
   * Add water to a leaky bucket
   */
  leakyBucketConsume(
    key: string,
    capacity: number,
    leakRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; water: number }>;

  /**
   * Get all keys matching a pattern
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Flush all rate limit data
   */
  flushAll(): Promise<void>;

  /**
   * Close the store connection
   */
  close(): Promise<void>;

  /**
   * Check if store is healthy
   */
  isHealthy(): Promise<boolean>;
}
