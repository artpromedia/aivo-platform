/**
 * In-Memory Cache Implementation
 *
 * Development/testing cache implementation that stores data in memory.
 * Supports TTL expiration and all CacheClient interface methods.
 */

import type { CacheClient } from './types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // null = no expiration
}

/**
 * In-memory cache implementation for testing and development.
 */
export class InMemoryCache implements CacheClient {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor(cleanupIntervalMs = 60000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  /**
   * Remove expired entries from the cache.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check if an entry is expired.
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.expiresAt === null) {
      return false;
    }
    return Date.now() >= entry.expiresAt;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (entry === undefined) {
      return null;
    }
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return false;
    }
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    return result;
  }

  async mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttlSeconds);
    }
  }

  async mdelete(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.store.delete(key);
    }
  }

  async incr(key: string, increment = 1): Promise<number> {
    const entry = this.store.get(key);
    let currentValue = 0;
    let expiresAt: number | null = null;

    if (entry !== undefined && !this.isExpired(entry)) {
      if (typeof entry.value === 'number') {
        currentValue = entry.value;
      }
      expiresAt = entry.expiresAt;
    }

    const newValue = currentValue + increment;
    this.store.set(key, { value: newValue, expiresAt });
    return newValue;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry !== undefined && !this.isExpired(entry)) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return -2; // Key doesn't exist
    }
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return -2;
    }
    if (entry.expiresAt === null) {
      return -1; // No expiry
    }
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async close(): Promise<void> {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  /**
   * Get the current size of the cache.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clear all entries from the cache.
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get all keys in the cache (for debugging).
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }
}
