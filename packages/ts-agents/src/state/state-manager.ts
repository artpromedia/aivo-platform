/**
 * State manager for agent state persistence and checkpointing
 */

import type {
  AgentState,
  AgentStatus,
  Checkpoint,
  Message,
  StateConfig,
  ToolCall,
} from '../core/types.js';
import { StateError } from '../core/types.js';
import type { IStateStore } from './memory-state-store.js';
import { MemoryStateStore } from './memory-state-store.js';
import { RedisStateStore, type RedisClient } from './redis-state-store.js';
import { createSerializer, type IStateSerializer } from './state-serializer.js';

export interface StateManagerOptions {
  /** Custom state store implementation */
  store?: IStateStore;
  /** Custom serializer */
  serializer?: IStateSerializer;
}

/**
 * Manages agent state with persistence, checkpointing, and recovery
 */
export class StateManager {
  private readonly store: IStateStore;
  private readonly config: StateConfig;
  private readonly serializer: IStateSerializer;

  constructor(store: IStateStore, config: StateConfig, options?: StateManagerOptions) {
    this.store = options?.store ?? store;
    this.config = config;
    this.serializer = options?.serializer ?? createSerializer({
      encryptionKey: config.encryptionKey,
    });
  }

  /**
   * Initialize a new agent state for a session
   */
  async initialize(sessionId: string, agentId: string): Promise<AgentState> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.ttlSeconds * 1000);

    const state: AgentState = {
      sessionId,
      agentId,
      status: 'idle',
      currentStep: 0,
      variables: {},
      conversationHistory: [],
      toolCallHistory: [],
      checkpoints: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await this.store.save(sessionId, state);
    return state;
  }

  /**
   * Get the current state for a session
   */
  async get(sessionId: string): Promise<AgentState | null> {
    const state = await this.store.load(sessionId);

    if (!state) {
      return null;
    }

    // Check if expired
    if (new Date() > state.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return state;
  }

  /**
   * Get or initialize state for a session
   */
  async getOrCreate(sessionId: string, agentId: string): Promise<AgentState> {
    const existing = await this.get(sessionId);
    if (existing) {
      return existing;
    }
    return this.initialize(sessionId, agentId);
  }

  /**
   * Update the state for a session
   */
  async update(sessionId: string, updates: Partial<AgentState>): Promise<void> {
    const state = await this.get(sessionId);

    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    const updatedState: AgentState = {
      ...state,
      ...updates,
      sessionId: state.sessionId, // Prevent overwriting
      agentId: state.agentId, // Prevent overwriting
      createdAt: state.createdAt, // Prevent overwriting
      updatedAt: new Date(),
    };

    // Check if we should create a checkpoint
    if (this.shouldCheckpoint(state, updatedState)) {
      await this.createCheckpoint(sessionId, updatedState);
    }

    await this.store.save(sessionId, updatedState);
  }

  /**
   * Update the agent status
   */
  async setStatus(sessionId: string, status: AgentStatus): Promise<void> {
    await this.update(sessionId, { status });
  }

  /**
   * Increment the current step
   */
  async incrementStep(sessionId: string): Promise<number> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    const newStep = state.currentStep + 1;
    await this.update(sessionId, { currentStep: newStep });
    return newStep;
  }

  /**
   * Add a message to the conversation history
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    const conversationHistory = [...state.conversationHistory, message];
    await this.update(sessionId, { conversationHistory });
  }

  /**
   * Add a tool call to the history
   */
  async addToolCall(sessionId: string, toolCall: ToolCall): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    const toolCallHistory = [...state.toolCallHistory, toolCall];
    await this.update(sessionId, { toolCallHistory });
  }

  /**
   * Set a variable in the state
   */
  async setVariable(sessionId: string, key: string, value: unknown): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    const variables = { ...state.variables, [key]: value };
    await this.update(sessionId, { variables });
  }

  /**
   * Get a variable from the state
   */
  async getVariable(sessionId: string, key: string): Promise<unknown> {
    const state = await this.get(sessionId);
    if (!state) {
      return undefined;
    }
    return state.variables[key];
  }

  /**
   * Delete a variable from the state
   */
  async deleteVariable(sessionId: string, key: string): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    const { [key]: _, ...variables } = state.variables;
    await this.update(sessionId, { variables });
  }

  /**
   * Create a checkpoint of the current state
   */
  async checkpoint(sessionId: string, label?: string): Promise<Checkpoint> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    return this.createCheckpoint(sessionId, state, label);
  }

  /**
   * Restore state from a checkpoint
   */
  async restore(sessionId: string, checkpointId?: string): Promise<AgentState> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new StateError(`State not found for session: ${sessionId}`);
    }

    if (state.checkpoints.length === 0) {
      throw new StateError(`No checkpoints available for session: ${sessionId}`);
    }

    let checkpoint: Checkpoint | undefined;

    if (checkpointId) {
      checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
      if (!checkpoint) {
        throw new StateError(`Checkpoint not found: ${checkpointId}`);
      }
    } else {
      // Restore from the most recent checkpoint
      checkpoint = state.checkpoints[state.checkpoints.length - 1];
    }

    if (!checkpoint) {
      throw new StateError(`No checkpoint found`);
    }

    // Restore the state but keep the checkpoints
    const restoredState: AgentState = {
      ...checkpoint.state,
      checkpoints: state.checkpoints,
      updatedAt: new Date(),
    };

    await this.store.save(sessionId, restoredState);
    return restoredState;
  }

  /**
   * List all checkpoints for a session
   */
  async listCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    const state = await this.get(sessionId);
    return state?.checkpoints ?? [];
  }

  /**
   * Delete a session's state
   */
  async delete(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }

  /**
   * Check if a session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    return this.store.exists(sessionId);
  }

  /**
   * Extend the expiration time for a session
   */
  async extendExpiry(sessionId: string, additionalSeconds?: number): Promise<void> {
    const seconds = additionalSeconds ?? this.config.ttlSeconds;
    await this.store.setExpiry(sessionId, seconds);

    const state = await this.get(sessionId);
    if (state) {
      const expiresAt = new Date(Date.now() + seconds * 1000);
      await this.update(sessionId, { expiresAt });
    }
  }

  /**
   * List all sessions for an agent
   */
  async listSessions(agentId: string): Promise<string[]> {
    return this.store.listSessions(agentId);
  }

  private async createCheckpoint(
    sessionId: string,
    state: AgentState,
    label?: string
  ): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: this.generateCheckpointId(),
      label,
      state: { ...state, checkpoints: [] }, // Don't nest checkpoints
      createdAt: new Date(),
    };

    let checkpoints = [...state.checkpoints, checkpoint];

    // Enforce max checkpoints limit
    if (checkpoints.length > this.config.maxCheckpoints) {
      checkpoints = checkpoints.slice(-this.config.maxCheckpoints);
    }

    await this.store.save(sessionId, { ...state, checkpoints, updatedAt: new Date() });

    return checkpoint;
  }

  private shouldCheckpoint(oldState: AgentState, newState: AgentState): boolean {
    if (this.config.checkpointInterval <= 0) {
      return false;
    }

    // Checkpoint every N steps
    return (
      newState.currentStep > 0 &&
      newState.currentStep % this.config.checkpointInterval === 0 &&
      newState.currentStep !== oldState.currentStep
    );
  }

  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Create a state manager with the appropriate store based on configuration
 */
export function createStateManager(
  config: StateConfig,
  redisClient?: RedisClient
): StateManager {
  let store: IStateStore;

  if (config.store === 'redis') {
    if (!redisClient) {
      throw new Error('Redis client required for redis store type');
    }
    store = new RedisStateStore(redisClient, {
      defaultTtlSeconds: config.ttlSeconds,
    });
  } else {
    store = new MemoryStateStore({
      defaultTtlSeconds: config.ttlSeconds,
    });
  }

  return new StateManager(store, config);
}
