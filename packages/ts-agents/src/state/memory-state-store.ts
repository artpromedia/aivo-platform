/**
 * MemoryStateStore - In-memory state storage implementation
 * Useful for development, testing, and single-instance deployments
 */

import type { AgentState } from '../core/types';
import type { IStateStore } from './state-manager';

interface StoredState {
  state: AgentState;
  expiresAt?: number;
}

export interface MemoryStoreOptions {
  maxSize?: number;
  cleanupIntervalMs?: number;
}

export class MemoryStateStore implements IStateStore {
  private store = new Map<string, StoredState>();
  private agentIndex = new Map<string, Set<string>>();
  private options: Required<MemoryStoreOptions>;
  // eslint-disable-next-line no-undef
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options?: MemoryStoreOptions) {
    this.options = {
      maxSize: 10000,
      cleanupIntervalMs: 60000, // 1 minute
      ...options,
    };

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Save state to memory
   */
  async save(key: string, state: AgentState): Promise<void> {
    // Check max size
    if (this.store.size >= this.options.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }

    // Store the state (deep clone to prevent mutations)
    this.store.set(key, {
      state: this.deepClone(state),
    });

    // Update agent index
    let sessions = this.agentIndex.get(state.agentId);
    if (!sessions) {
      sessions = new Set();
      this.agentIndex.set(state.agentId, sessions);
    }
    sessions.add(state.sessionId);
  }

  /**
   * Load state from memory
   */
  async load(key: string): Promise<AgentState | null> {
    const stored = this.store.get(key);

    if (!stored) {
      return null;
    }

    // Check if expired
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      await this.delete(key);
      return null;
    }

    // Return deep clone to prevent mutations
    return this.deepClone(stored.state);
  }

  /**
   * Delete state from memory
   */
  async delete(key: string): Promise<void> {
    const stored = this.store.get(key);

    if (stored) {
      // Update agent index
      const sessions = this.agentIndex.get(stored.state.agentId);
      if (sessions) {
        sessions.delete(stored.state.sessionId);
        if (sessions.size === 0) {
          this.agentIndex.delete(stored.state.agentId);
        }
      }
    }

    this.store.delete(key);
  }

  /**
   * Check if state exists
   */
  async exists(key: string): Promise<boolean> {
    const stored = this.store.get(key);

    if (!stored) {
      return false;
    }

    // Check if expired
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Set expiry on a key
   */
  async setExpiry(key: string, ttlSeconds: number): Promise<void> {
    const stored = this.store.get(key);

    if (stored) {
      stored.expiresAt = Date.now() + ttlSeconds * 1000;
    }
  }

  /**
   * List all sessions for an agent
   */
  async listSessions(agentId: string): Promise<string[]> {
    const sessions = this.agentIndex.get(agentId);
    return sessions ? Array.from(sessions) : [];
  }

  /**
   * Clear all stored states
   */
  clear(): void {
    this.store.clear();
    this.agentIndex.clear();
  }

  /**
   * Get store statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    agentCount: number;
  } {
    return {
      size: this.store.size,
      maxSize: this.options.maxSize,
      agentCount: this.agentIndex.size,
    };
  }

  /**
   * Stop the cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupIntervalMs);

    // Don't prevent process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, stored] of this.store) {
      if (stored.expiresAt && now > stored.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }

  /**
   * Evict the oldest entry when max size is reached
   */
  private evictOldest(): void {
    // Find the oldest entry by updatedAt
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, stored] of this.store) {
      const time = stored.state.updatedAt.getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }
}
