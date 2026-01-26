/**
 * StateManager - Manages agent state with persistence and checkpointing
 */

import { v4 as uuid } from 'uuid';
import type {
  AgentState,
  AgentStatus,
  StateConfig,
  Checkpoint,
  Message,
  ToolCall,
} from '../core/types';
import { StateSerializer, type SerializerOptions } from './state-serializer';

/**
 * Interface for state storage backends
 */
export interface IStateStore {
  save(key: string, state: AgentState): Promise<void>;
  load(key: string): Promise<AgentState | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  setExpiry(key: string, ttlSeconds: number): Promise<void>;
  listSessions(agentId: string): Promise<string[]>;
}

export class StateManager {
  private store: IStateStore;
  private config: StateConfig;
  private serializer: StateSerializer;

  constructor(store: IStateStore, config: StateConfig) {
    this.store = store;
    this.config = config;

    const serializerOptions: SerializerOptions = {};
    if (config.encryptionKey) {
      serializerOptions.encryptionKey = config.encryptionKey;
    }
    this.serializer = new StateSerializer(serializerOptions);
  }

  /**
   * Initialize a new agent state
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

    await this.store.save(this.getKey(sessionId), state);
    await this.store.setExpiry(this.getKey(sessionId), this.config.ttlSeconds);

    return state;
  }

  /**
   * Get agent state by session ID
   */
  async get(sessionId: string): Promise<AgentState | null> {
    const state = await this.store.load(this.getKey(sessionId));

    if (!state) {
      return null;
    }

    // Check if expired
    if (new Date() > new Date(state.expiresAt)) {
      await this.delete(sessionId);
      return null;
    }

    return state;
  }

  /**
   * Update agent state
   */
  async update(sessionId: string, updates: Partial<AgentState>): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const updatedState: AgentState = {
      ...state,
      ...updates,
      updatedAt: new Date(),
    };

    // Check if we should create a checkpoint
    if (
      this.config.checkpointInterval > 0 &&
      updatedState.currentStep % this.config.checkpointInterval === 0 &&
      updatedState.currentStep > state.currentStep
    ) {
      await this.checkpoint(sessionId);
    }

    await this.store.save(this.getKey(sessionId), updatedState);
  }

  /**
   * Create a checkpoint of the current state
   */
  async checkpoint(sessionId: string, label?: string): Promise<Checkpoint> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const checkpoint: Checkpoint = {
      id: uuid(),
      sessionId,
      label,
      state: { ...state },
      createdAt: new Date(),
    };

    // Add checkpoint to state
    const checkpoints = [...state.checkpoints, checkpoint];

    // Limit checkpoints
    while (checkpoints.length > this.config.maxCheckpoints) {
      checkpoints.shift();
    }

    await this.update(sessionId, { checkpoints });

    return checkpoint;
  }

  /**
   * Restore state from a checkpoint
   */
  async restore(sessionId: string, checkpointId?: string): Promise<AgentState> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    let checkpoint: Checkpoint | undefined;

    if (checkpointId) {
      checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
      if (!checkpoint) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }
    } else {
      // Get the most recent checkpoint
      checkpoint = state.checkpoints[state.checkpoints.length - 1];
      if (!checkpoint) {
        throw new Error('No checkpoints available');
      }
    }

    // Restore from checkpoint but keep the checkpoints array
    const restoredState: AgentState = {
      ...checkpoint.state,
      checkpoints: state.checkpoints,
      updatedAt: new Date(),
    };

    await this.store.save(this.getKey(sessionId), restoredState);

    return restoredState;
  }

  /**
   * Delete agent state
   */
  async delete(sessionId: string): Promise<void> {
    await this.store.delete(this.getKey(sessionId));
  }

  /**
   * Set a variable in the state
   */
  async setVariable(
    sessionId: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
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
      throw new Error(`State not found for session: ${sessionId}`);
    }

    return state.variables[key];
  }

  /**
   * Add a message to conversation history
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const conversationHistory = [...state.conversationHistory, message];
    await this.update(sessionId, { conversationHistory });
  }

  /**
   * Add a tool call to history
   */
  async addToolCall(sessionId: string, toolCall: ToolCall): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const toolCallHistory = [...state.toolCallHistory, toolCall];
    await this.update(sessionId, { toolCallHistory });
  }

  /**
   * Update agent status
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
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const currentStep = state.currentStep + 1;
    await this.update(sessionId, { currentStep });

    return currentStep;
  }

  /**
   * Extend the session expiry
   */
  async extendExpiry(sessionId: string, additionalSeconds?: number): Promise<void> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const ttl = additionalSeconds || this.config.ttlSeconds;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await this.update(sessionId, { expiresAt });
    await this.store.setExpiry(this.getKey(sessionId), ttl);
  }

  /**
   * Check if a session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    return this.store.exists(this.getKey(sessionId));
  }

  /**
   * List all sessions for an agent
   */
  async listSessions(agentId: string): Promise<string[]> {
    return this.store.listSessions(agentId);
  }

  /**
   * Get all checkpoints for a session
   */
  async getCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    const state = await this.get(sessionId);
    if (!state) {
      return [];
    }

    return state.checkpoints;
  }

  /**
   * Clear all checkpoints for a session
   */
  async clearCheckpoints(sessionId: string): Promise<void> {
    await this.update(sessionId, { checkpoints: [] });
  }

  /**
   * Export state to serialized format
   */
  async export(sessionId: string): Promise<string> {
    const state = await this.get(sessionId);
    if (!state) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    return this.serializer.serialize(state);
  }

  /**
   * Import state from serialized format
   */
  async import(serialized: string): Promise<AgentState> {
    const state = this.serializer.deserialize(serialized);
    await this.store.save(this.getKey(state.sessionId), state);
    return state;
  }

  /**
   * Generate storage key for a session
   */
  private getKey(sessionId: string): string {
    return `agent:state:${sessionId}`;
  }
}
