/**
 * In-memory state store for development and testing
 */

import type { AgentState } from '../core/types.js';
import type { IStateSerializer } from './state-serializer.js';
import { JSONStateSerializer } from './state-serializer.js';

export interface IStateStore {
  save(key: string, state: AgentState): Promise<void>;
  load(key: string): Promise<AgentState | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  setExpiry(key: string, ttlSeconds: number): Promise<void>;
  listSessions(agentId: string): Promise<string[]>;
}

export interface MemoryStoreOptions {
  serializer?: IStateSerializer;
  maxEntries?: number;
  defaultTtlSeconds?: number;
}

interface StoredEntry {
  state: AgentState;
  expiresAt: number | null;
}

/**
 * In-memory implementation of state store
 * Useful for development, testing, and single-instance deployments
 */
export class MemoryStateStore implements IStateStore {
  private readonly store: Map<string, StoredEntry> = new Map();
  private readonly serializer: IStateSerializer;
  private readonly maxEntries: number;
  private readonly defaultTtlSeconds: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options?: MemoryStoreOptions) {
    this.serializer = options?.serializer ?? new JSONStateSerializer();
    this.maxEntries = options?.maxEntries ?? 10000;
    this.defaultTtlSeconds = options?.defaultTtlSeconds ?? 3600;
    this.startCleanup();
  }

  async save(key: string, state: AgentState): Promise<void> {
    // Enforce max entries limit with LRU-style eviction
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictOldest();
    }

    // Clone the state to prevent mutations
    const serialized = this.serializer.serialize(state);
    const clonedState = this.serializer.deserialize(serialized);

    const expiresAt = this.defaultTtlSeconds > 0
      ? Date.now() + this.defaultTtlSeconds * 1000
      : null;

    this.store.set(key, { state: clonedState, expiresAt });
  }

  async load(key: string): Promise<AgentState | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Return a clone to prevent mutations
    const serialized = this.serializer.serialize(entry.state);
    return this.serializer.deserialize(serialized);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async setExpiry(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);

    if (entry) {
      entry.expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    }
  }

  async listSessions(agentId: string): Promise<string[]> {
    const sessions: string[] = [];
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      // Skip expired entries
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        continue;
      }

      if (entry.state.agentId === agentId) {
        sessions.push(entry.state.sessionId);
      }
    }

    return sessions;
  }

  /**
   * Clear all entries from the store
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the current number of entries
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Stop the cleanup interval
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private evictOldest(): void {
    // Find the oldest entry by updatedAt
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      const time = entry.state.updatedAt.getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt !== null && now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, 60000);

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}
