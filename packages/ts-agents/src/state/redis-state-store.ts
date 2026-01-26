/**
 * Redis-backed state store for distributed agent state persistence
 */

import type { AgentState } from '../core/types.js';
import type { IStateStore } from './memory-state-store.js';
import type { IStateSerializer } from './state-serializer.js';
import { JSONStateSerializer } from './state-serializer.js';

// Redis client type (compatible with ioredis)
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string | number, ...args: (string | number)[]): Promise<[string, string[]]>;
  ping(): Promise<string>;
}

export interface RedisStoreOptions {
  /** Key prefix for all state entries */
  keyPrefix?: string;
  /** Serializer for state objects */
  serializer?: IStateSerializer;
  /** Default TTL in seconds (0 = no expiry) */
  defaultTtlSeconds?: number;
  /** Enable key scanning for listSessions (may be slow on large datasets) */
  enableKeyScanning?: boolean;
  /** Batch size for scan operations */
  scanBatchSize?: number;
}

/**
 * Redis implementation of state store
 * Provides distributed, persistent state storage for agents
 */
export class RedisStateStore implements IStateStore {
  private readonly client: RedisClient;
  private readonly keyPrefix: string;
  private readonly serializer: IStateSerializer;
  private readonly defaultTtlSeconds: number;
  private readonly enableKeyScanning: boolean;
  private readonly scanBatchSize: number;

  constructor(redisClient: RedisClient, options?: RedisStoreOptions) {
    this.client = redisClient;
    this.keyPrefix = options?.keyPrefix ?? 'agent:state:';
    this.serializer = options?.serializer ?? new JSONStateSerializer();
    this.defaultTtlSeconds = options?.defaultTtlSeconds ?? 3600;
    this.enableKeyScanning = options?.enableKeyScanning ?? true;
    this.scanBatchSize = options?.scanBatchSize ?? 100;
  }

  /**
   * Build the full Redis key for a state entry
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Build the index key for agent sessions
   */
  private buildAgentIndexKey(agentId: string): string {
    return `${this.keyPrefix}index:agent:${agentId}`;
  }

  async save(key: string, state: AgentState): Promise<void> {
    const redisKey = this.buildKey(key);
    const serialized = this.serializer.serialize(state);

    if (this.defaultTtlSeconds > 0) {
      await this.client.set(redisKey, serialized, 'EX', this.defaultTtlSeconds);
    } else {
      await this.client.set(redisKey, serialized);
    }

    // Also add to the agent's session index for faster lookups
    await this.addToAgentIndex(state.agentId, state.sessionId);
  }

  async load(key: string): Promise<AgentState | null> {
    const redisKey = this.buildKey(key);
    const data = await this.client.get(redisKey);

    if (!data) {
      return null;
    }

    try {
      return this.serializer.deserialize(data);
    } catch {
      // Handle corrupted data
      await this.client.del(redisKey);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const redisKey = this.buildKey(key);

    // Try to load the state first to remove from index
    const state = await this.load(key);
    if (state) {
      await this.removeFromAgentIndex(state.agentId, state.sessionId);
    }

    await this.client.del(redisKey);
  }

  async exists(key: string): Promise<boolean> {
    const redisKey = this.buildKey(key);
    const result = await this.client.exists(redisKey);
    return result > 0;
  }

  async setExpiry(key: string, ttlSeconds: number): Promise<void> {
    const redisKey = this.buildKey(key);
    if (ttlSeconds > 0) {
      await this.client.expire(redisKey, ttlSeconds);
    }
  }

  async listSessions(agentId: string): Promise<string[]> {
    // Try to use the index first
    const indexKey = this.buildAgentIndexKey(agentId);
    const indexData = await this.client.get(indexKey);

    if (indexData) {
      try {
        const sessions = JSON.parse(indexData) as string[];
        // Verify sessions still exist
        const validSessions: string[] = [];
        for (const sessionId of sessions) {
          if (await this.exists(sessionId)) {
            validSessions.push(sessionId);
          }
        }
        // Update index if sessions were removed
        if (validSessions.length !== sessions.length) {
          await this.updateAgentIndex(agentId, validSessions);
        }
        return validSessions;
      } catch {
        // Index corrupted, fall back to scanning
      }
    }

    // Fall back to key scanning if enabled
    if (!this.enableKeyScanning) {
      return [];
    }

    return this.scanForSessions(agentId);
  }

  /**
   * Check if Redis connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get all keys matching a pattern (use with caution in production)
   */
  async getAllKeys(): Promise<string[]> {
    const pattern = `${this.keyPrefix}*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        this.scanBatchSize
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys.map(key => key.replace(this.keyPrefix, ''));
  }

  private async addToAgentIndex(agentId: string, sessionId: string): Promise<void> {
    const indexKey = this.buildAgentIndexKey(agentId);
    const indexData = await this.client.get(indexKey);

    let sessions: string[] = [];
    if (indexData) {
      try {
        sessions = JSON.parse(indexData) as string[];
      } catch {
        sessions = [];
      }
    }

    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId);
      await this.client.set(indexKey, JSON.stringify(sessions));
    }
  }

  private async removeFromAgentIndex(agentId: string, sessionId: string): Promise<void> {
    const indexKey = this.buildAgentIndexKey(agentId);
    const indexData = await this.client.get(indexKey);

    if (indexData) {
      try {
        const sessions = JSON.parse(indexData) as string[];
        const filtered = sessions.filter(s => s !== sessionId);
        if (filtered.length > 0) {
          await this.client.set(indexKey, JSON.stringify(filtered));
        } else {
          await this.client.del(indexKey);
        }
      } catch {
        // Index corrupted, just delete it
        await this.client.del(indexKey);
      }
    }
  }

  private async updateAgentIndex(agentId: string, sessions: string[]): Promise<void> {
    const indexKey = this.buildAgentIndexKey(agentId);
    if (sessions.length > 0) {
      await this.client.set(indexKey, JSON.stringify(sessions));
    } else {
      await this.client.del(indexKey);
    }
  }

  private async scanForSessions(agentId: string): Promise<string[]> {
    const sessions: string[] = [];
    const pattern = `${this.keyPrefix}*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        this.scanBatchSize
      );
      cursor = nextCursor;

      for (const key of keys) {
        // Skip index keys
        if (key.includes(':index:')) continue;

        const data = await this.client.get(key);
        if (data) {
          try {
            const state = this.serializer.deserialize(data);
            if (state.agentId === agentId) {
              sessions.push(state.sessionId);
            }
          } catch {
            // Skip corrupted entries
          }
        }
      }
    } while (cursor !== '0');

    // Update the index for faster future lookups
    await this.updateAgentIndex(agentId, sessions);

    return sessions;
  }
}

/**
 * Create a Redis state store with connection verification
 */
export async function createRedisStateStore(
  redisClient: RedisClient,
  options?: RedisStoreOptions
): Promise<RedisStateStore> {
  const store = new RedisStateStore(redisClient, options);

  // Verify connection
  const healthy = await store.healthCheck();
  if (!healthy) {
    throw new Error('Failed to connect to Redis');
  }

  return store;
}
