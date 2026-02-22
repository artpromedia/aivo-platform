/**
 * RedisStateStore - Redis-backed state storage implementation
 */

import type { AgentState, Checkpoint, Message, ToolCall } from '../core/types';

import type { IStateStore } from './state-manager';

export interface RedisStoreOptions {
  keyPrefix?: string;
  serializer?: 'json' | 'msgpack';
}

// Redis client interface (compatible with ioredis)
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(key: string | string[]): Promise<number>;
  exists(key: string | string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: number | string, ...args: unknown[]): Promise<[string, string[]]>;
  multi(): RedisPipeline;
}

export interface RedisPipeline {
  get(key: string): this;
  set(key: string, value: string, ...args: unknown[]): this;
  del(key: string): this;
  expire(key: string, seconds: number): this;
  exec(): Promise<[Error | null, unknown][]>;
}

export class RedisStateStore implements IStateStore {
  private redis: RedisClient;
  private options: Required<RedisStoreOptions>;

  constructor(redisClient: unknown, options?: RedisStoreOptions) {
    this.redis = redisClient as RedisClient;
    this.options = {
      keyPrefix: 'aivo:agent:',
      serializer: 'json',
      ...options,
    };
  }

  /**
   * Save state to Redis
   */
  async save(key: string, state: AgentState): Promise<void> {
    const fullKey = this.getFullKey(key);
    const serialized = this.serialize(state);
    await this.redis.set(fullKey, serialized);

    // Also index by agent ID for listing
    const indexKey = this.getIndexKey(state.agentId);
    await this.redis.set(`${indexKey}:${state.sessionId}`, fullKey);
  }

  /**
   * Load state from Redis
   */
  async load(key: string): Promise<AgentState | null> {
    const fullKey = this.getFullKey(key);
    const data = await this.redis.get(fullKey);

    if (!data) {
      return null;
    }

    return this.deserialize(data);
  }

  /**
   * Delete state from Redis
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);

    // Load state first to get agent ID for index cleanup
    const state = await this.load(key);
    if (state) {
      const indexKey = this.getIndexKey(state.agentId);
      await this.redis.del([fullKey, `${indexKey}:${state.sessionId}`]);
    } else {
      await this.redis.del(fullKey);
    }
  }

  /**
   * Check if state exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const result = await this.redis.exists(fullKey);
    return result === 1;
  }

  /**
   * Set expiry on a key
   */
  async setExpiry(key: string, ttlSeconds: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.redis.expire(fullKey, ttlSeconds);
  }

  /**
   * List all sessions for an agent
   */
  async listSessions(agentId: string): Promise<string[]> {
    const indexKey = this.getIndexKey(agentId);
    const pattern = `${indexKey}:*`;

    // Use SCAN for large datasets
    const sessions: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys) {
        const sessionId = key.split(':').pop();
        if (sessionId) {
          sessions.push(sessionId);
        }
      }
    } while (cursor !== '0');

    return sessions;
  }

  /**
   * Batch save multiple states
   */
  async batchSave(states: { key: string; state: AgentState }[]): Promise<void> {
    const pipeline = this.redis.multi();

    for (const { key, state } of states) {
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(state);
      pipeline.set(fullKey, serialized);
    }

    await pipeline.exec();
  }

  /**
   * Batch load multiple states
   */
  async batchLoad(keys: string[]): Promise<Map<string, AgentState | null>> {
    const results = new Map<string, AgentState | null>();
    const pipeline = this.redis.multi();

    for (const key of keys) {
      pipeline.get(this.getFullKey(key));
    }

    const execResults = await pipeline.exec();

    for (let i = 0; i < keys.length; i++) {
      const execResult = execResults?.[i];
      const key = keys[i];
      if (!key) continue;
      if (!execResult) {
        results.set(key, null);
        continue;
      }
      const [err, data] = execResult;
      if (err || !data) {
        results.set(key, null);
      } else {
        results.set(key, this.deserialize(data as string));
      }
    }

    return results;
  }

  /**
   * Get full Redis key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.options.keyPrefix}${key}`;
  }

  /**
   * Get index key for agent
   */
  private getIndexKey(agentId: string): string {
    return `${this.options.keyPrefix}index:${agentId}`;
  }

  /**
   * Serialize state to string
   */
  private serialize(state: AgentState): string {
    return JSON.stringify(this.toSerializable(state));
  }

  /**
   * Deserialize string to state
   */
  private deserialize(data: string): AgentState {
    const parsed = JSON.parse(data);
    return this.fromSerializable(parsed);
  }

  /**
   * Convert state to serializable format
   */
  private toSerializable(state: AgentState): Record<string, unknown> {
    return {
      ...state,
      conversationHistory: state.conversationHistory.map((m) => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
        toolCalls: m.toolCalls?.map((tc) => ({
          ...tc,
          timestamp: tc.timestamp.toISOString(),
        })),
      })),
      toolCallHistory: state.toolCallHistory.map((tc) => ({
        ...tc,
        timestamp: tc.timestamp.toISOString(),
      })),
      checkpoints: state.checkpoints.map((cp) => ({
        ...cp,
        state: this.toSerializable(cp.state),
        createdAt: cp.createdAt.toISOString(),
      })),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      expiresAt: state.expiresAt.toISOString(),
    };
  }

  /**
   * Convert serializable format back to state
   */
  private fromSerializable(data: Record<string, unknown>): AgentState {
    const conversationHistory = (data.conversationHistory as Record<string, unknown>[]).map(
      (m): Message => ({
        id: m.id as string,
        role: m.role as Message['role'],
        content: m.content as string,
        name: m.name as string | undefined,
        toolCallId: m.toolCallId as string | undefined,
        toolCalls: m.toolCalls
          ? (m.toolCalls as Record<string, unknown>[]).map(
              (tc): ToolCall => ({
                id: tc.id as string,
                name: tc.name as string,
                arguments: tc.arguments as Record<string, unknown>,
                timestamp: new Date(tc.timestamp as string),
              })
            )
          : undefined,
        timestamp: new Date(m.timestamp as string),
        metadata: m.metadata as Record<string, unknown> | undefined,
      })
    );

    const toolCallHistory = (data.toolCallHistory as Record<string, unknown>[]).map(
      (tc): ToolCall => ({
        id: tc.id as string,
        name: tc.name as string,
        arguments: tc.arguments as Record<string, unknown>,
        timestamp: new Date(tc.timestamp as string),
      })
    );

    const checkpoints = (data.checkpoints as Record<string, unknown>[]).map(
      (cp): Checkpoint => ({
        id: cp.id as string,
        sessionId: cp.sessionId as string,
        label: cp.label as string | undefined,
        state: this.fromSerializable(cp.state as Record<string, unknown>),
        createdAt: new Date(cp.createdAt as string),
      })
    );

    return {
      sessionId: data.sessionId as string,
      agentId: data.agentId as string,
      status: data.status as AgentState['status'],
      currentStep: data.currentStep as number,
      variables: data.variables as Record<string, unknown>,
      conversationHistory,
      toolCallHistory,
      checkpoints,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      expiresAt: new Date(data.expiresAt as string),
    };
  }
}
