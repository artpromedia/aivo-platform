/**
 * LLM Cache
 *
 * Caches LLM responses to reduce costs and latency for repeated queries.
 * Supports both in-memory and Redis caching backends.
 */

import { createHash } from 'node:crypto';

import type {
  LLMCompletionResult,
  LLMMessage,
  LLMCompletionOptions,
} from '../providers/llm-provider.interface.js';

export interface LLMCacheConfig {
  enabled?: boolean;
  ttlSeconds?: number;
  redisUrl?: string;
  maxMemoryEntries?: number;
}

interface CacheEntry {
  result: LLMCompletionResult;
  timestamp: number;
  ttl: number;
}

/**
 * LLM response cache with in-memory storage
 * Can be extended to use Redis for distributed caching
 */
export class LLMCache {
  private readonly enabled: boolean;
  private readonly ttlSeconds: number;
  private readonly maxEntries: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(config?: LLMCacheConfig) {
    this.enabled = config?.enabled ?? true;
    this.ttlSeconds = config?.ttlSeconds ?? 3600; // 1 hour default
    this.maxEntries = config?.maxMemoryEntries ?? 10000;
  }

  /**
   * Generate a cache key from messages and options
   */
  generateKey(messages: LLMMessage[], model: string, options?: LLMCompletionOptions): string {
    const keyData = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
      })),
      model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      topP: options?.topP,
    };

    const hash = createHash('sha256').update(JSON.stringify(keyData)).digest('hex');

    return `llm:${model}:${hash}`;
  }

  /**
   * Get a cached result
   */
  async get(key: string): Promise<LLMCompletionResult | null> {
    if (!this.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache a result
   */
  async set(key: string, result: LLMCompletionResult, ttlOverride?: number): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttlOverride ?? this.ttlSeconds,
    });
  }

  /**
   * Invalidate a cached entry
   */
  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    enabled: boolean;
    ttlSeconds: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxEntries,
      enabled: this.enabled,
      ttlSeconds: this.ttlSeconds,
    };
  }

  private evictOldest(): void {
    // Remove 10% of oldest entries
    const entriesToRemove = Math.max(1, Math.floor(this.maxEntries * 0.1));
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove);

    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }
}
