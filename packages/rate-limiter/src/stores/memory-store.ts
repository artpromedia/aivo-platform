/**
 * In-Memory Rate Limit Store
 *
 * For development and testing. Not suitable for production
 * multi-instance deployments.
 */

import { RateLimitStore } from './types';

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

interface SortedSetEntry {
  score: number;
  member: string;
}

/**
 * Memory-based rate limit store
 */
export class MemoryStore implements RateLimitStore {
  private cache: Map<string, CacheEntry> = new Map();
  private sortedSets: Map<string, SortedSetEntry[]> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry = { value };
    if (ttlSeconds) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
    this.cache.set(key, entry);
  }

  async increment(key: string, amount: number = 1, ttlSeconds?: number): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + amount);

    const entry: CacheEntry = { value: String(newValue) };

    // Preserve existing TTL or set new one
    const existing = this.cache.get(key);
    if (existing?.expiresAt) {
      entry.expiresAt = existing.expiresAt;
    } else if (ttlSeconds) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }

    this.cache.set(key, entry);
    return newValue;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.sortedSets.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry || !entry.expiresAt) return -1;

    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async slidingWindowCount(key: string, minScore: number, maxScore: number): Promise<number> {
    const entries = this.sortedSets.get(key) || [];
    return entries.filter((e) => e.score >= minScore && e.score <= maxScore).length;
  }

  async slidingWindowAdd(key: string, score: number, windowMs: number): Promise<number> {
    let entries = this.sortedSets.get(key) || [];

    // Add new entry
    const member = `${score}:${Math.random().toString(36).substring(2, 9)}`;
    entries.push({ score, member });

    // Remove old entries outside the window
    const cutoff = score - windowMs;
    entries = entries.filter((e) => e.score > cutoff);

    this.sortedSets.set(key, entries);

    // Set expiry on the cache entry to track the sorted set
    await this.set(`${key}:meta`, 'active', Math.ceil(windowMs / 1000) * 2);

    return entries.length;
  }

  async tokenBucketConsume(
    key: string,
    capacity: number,
    refillRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; tokens: number }> {
    const stateKey = `${key}:bucket`;
    const data = await this.get(stateKey);

    let tokens: number;
    let lastRefill: number;

    if (data) {
      const state = JSON.parse(data);
      tokens = state.tokens;
      lastRefill = state.lastRefill;
    } else {
      tokens = capacity;
      lastRefill = now;
    }

    // Calculate refill
    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(capacity, tokens + elapsed * refillRate);

    let success = false;
    if (tokens >= cost) {
      tokens -= cost;
      success = true;
    }

    // Save state
    const ttl = Math.ceil(capacity / refillRate) + 60;
    await this.set(stateKey, JSON.stringify({ tokens, lastRefill: now }), ttl);

    return { success, tokens };
  }

  async leakyBucketConsume(
    key: string,
    capacity: number,
    leakRate: number,
    cost: number,
    now: number
  ): Promise<{ success: boolean; water: number }> {
    const stateKey = `${key}:leaky`;
    const data = await this.get(stateKey);

    let water: number;
    let lastLeak: number;

    if (data) {
      const state = JSON.parse(data);
      water = state.water;
      lastLeak = state.lastLeak;
    } else {
      water = 0;
      lastLeak = now;
    }

    // Calculate leak
    const elapsed = (now - lastLeak) / 1000;
    water = Math.max(0, water - elapsed * leakRate);

    let success = false;
    if (water + cost <= capacity) {
      water += cost;
      success = true;
    }

    // Save state
    const ttl = Math.ceil(capacity / leakRate) + 60;
    await this.set(stateKey, JSON.stringify({ water, lastLeak: now }), ttl);

    return { success, water };
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  async flushAll(): Promise<void> {
    this.cache.clear();
    this.sortedSets.clear();
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get current cache size (for debugging)
   */
  getSize(): { cache: number; sortedSets: number } {
    return {
      cache: this.cache.size,
      sortedSets: this.sortedSets.size,
    };
  }
}
