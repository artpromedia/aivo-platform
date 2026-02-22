/**
 * StateMachine - Finite state machine for managing agent states and transitions
 */

import { v4 as uuid } from 'uuid';

import type { AgentStatus } from './types';

export interface StateTransition {
  from: AgentStatus | '*';
  to: AgentStatus;
  event: string;
  guard?: (context: StateContext) => boolean;
  action?: (context: StateContext) => void | Promise<void>;
}

export interface StateContext {
  currentState: AgentStatus;
  previousState?: AgentStatus;
  event?: string;
  data: Record<string, unknown>;
  history: StateHistoryEntry[];
}

export interface StateHistoryEntry {
  id: string;
  from: AgentStatus;
  to: AgentStatus;
  event: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface StateMachineConfig {
  initialState: AgentStatus;
  transitions: StateTransition[];
  maxHistorySize?: number;
  onTransition?: (entry: StateHistoryEntry) => void | Promise<void>;
  onInvalidTransition?: (from: AgentStatus, event: string) => void;
}

export type StateChangeHandler = (
  from: AgentStatus,
  to: AgentStatus,
  event: string
) => void | Promise<void>;

export class StateMachine {
  private config: StateMachineConfig;
  private context: StateContext;
  private handlers = new Map<string, StateChangeHandler[]>();
  private stateHandlers = new Map<AgentStatus, StateChangeHandler[]>();

  constructor(config: StateMachineConfig) {
    this.config = {
      maxHistorySize: 100,
      ...config,
    };

    this.context = {
      currentState: config.initialState,
      data: {},
      history: [],
    };
  }

  /**
   * Get the current state
   */
  getCurrentState(): AgentStatus {
    return this.context.currentState;
  }

  /**
   * Get the full context
   */
  getContext(): StateContext {
    return { ...this.context };
  }

  /**
   * Get state history
   */
  getHistory(): StateHistoryEntry[] {
    return [...this.context.history];
  }

  /**
   * Set context data
   */
  setData(key: string, value: unknown): void {
    this.context.data[key] = value;
  }

  /**
   * Get context data
   */
  getData(key: string): unknown {
    return this.context.data[key];
  }

  /**
   * Check if a transition is valid
   */
  canTransition(event: string): boolean {
    const transition = this.findTransition(event);
    if (!transition) return false;

    if (transition.guard && !transition.guard(this.context)) {
      return false;
    }

    return true;
  }

  /**
   * Get available events from current state
   */
  getAvailableEvents(): string[] {
    const events: string[] = [];

    for (const transition of this.config.transitions) {
      if (transition.from === '*' || transition.from === this.context.currentState) {
        if (!transition.guard || transition.guard(this.context)) {
          events.push(transition.event);
        }
      }
    }

    return [...new Set(events)];
  }

  /**
   * Trigger a state transition
   */
  async transition(event: string, data?: Record<string, unknown>): Promise<boolean> {
    const transition = this.findTransition(event);

    if (!transition) {
      if (this.config.onInvalidTransition) {
        this.config.onInvalidTransition(this.context.currentState, event);
      }
      return false;
    }

    // Check guard
    if (transition.guard && !transition.guard(this.context)) {
      return false;
    }

    const previousState = this.context.currentState;
    const newState = transition.to;

    // Update context
    this.context.previousState = previousState;
    this.context.currentState = newState;
    this.context.event = event;
    if (data) {
      this.context.data = { ...this.context.data, ...data };
    }

    // Create history entry
    const historyEntry: StateHistoryEntry = {
      id: uuid(),
      from: previousState,
      to: newState,
      event,
      timestamp: new Date(),
      data,
    };

    // Add to history
    this.context.history.push(historyEntry);
    if (this.context.history.length > (this.config.maxHistorySize || 100)) {
      this.context.history.shift();
    }

    // Execute transition action
    if (transition.action) {
      await transition.action(this.context);
    }

    // Notify global transition handler
    if (this.config.onTransition) {
      await this.config.onTransition(historyEntry);
    }

    // Notify event-specific handlers
    const eventHandlers = this.handlers.get(event) || [];
    for (const handler of eventHandlers) {
      await handler(previousState, newState, event);
    }

    // Notify state-specific handlers
    const stateEntryHandlers = this.stateHandlers.get(newState) || [];
    for (const handler of stateEntryHandlers) {
      await handler(previousState, newState, event);
    }

    return true;
  }

  /**
   * Force set state (use with caution)
   */
  forceState(state: AgentStatus): void {
    this.context.previousState = this.context.currentState;
    this.context.currentState = state;
  }

  /**
   * Register a handler for a specific event
   */
  onEvent(event: string, handler: StateChangeHandler): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  /**
   * Register a handler for entering a specific state
   */
  onEnter(state: AgentStatus, handler: StateChangeHandler): void {
    const handlers = this.stateHandlers.get(state) || [];
    handlers.push(handler);
    this.stateHandlers.set(state, handlers);
  }

  /**
   * Remove a handler
   */
  off(event: string, handler: StateChangeHandler): void {
    const handlers = this.handlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Reset the state machine
   */
  reset(): void {
    this.context = {
      currentState: this.config.initialState,
      data: {},
      history: [],
    };
  }

  /**
   * Check if in a specific state
   */
  isInState(state: AgentStatus): boolean {
    return this.context.currentState === state;
  }

  /**
   * Check if in any of the specified states
   */
  isInAnyState(states: AgentStatus[]): boolean {
    return states.includes(this.context.currentState);
  }

  /**
   * Find a valid transition for the given event
   */
  private findTransition(event: string): StateTransition | undefined {
    // First look for specific state transitions
    const specificTransition = this.config.transitions.find(
      (t) => t.event === event && t.from === this.context.currentState
    );

    if (specificTransition) {
      return specificTransition;
    }

    // Then look for wildcard transitions
    return this.config.transitions.find((t) => t.event === event && t.from === '*');
  }

  /**
   * Create a state machine for agent status
   */
  static createAgentStateMachine(): StateMachine {
    return new StateMachine({
      initialState: 'idle',
      transitions: [
        // From idle
        { from: 'idle', to: 'running', event: 'start' },

        // From running
        { from: 'running', to: 'waiting_for_tool', event: 'call_tool' },
        { from: 'running', to: 'waiting_for_user', event: 'request_input' },
        { from: 'running', to: 'completed', event: 'complete' },
        { from: 'running', to: 'error', event: 'error' },
        { from: 'running', to: 'paused', event: 'pause' },

        // From waiting_for_tool
        { from: 'waiting_for_tool', to: 'running', event: 'tool_complete' },
        { from: 'waiting_for_tool', to: 'error', event: 'tool_error' },

        // From waiting_for_user
        { from: 'waiting_for_user', to: 'running', event: 'user_input' },
        { from: 'waiting_for_user', to: 'error', event: 'timeout' },

        // From paused
        { from: 'paused', to: 'running', event: 'resume' },
        { from: 'paused', to: 'idle', event: 'stop' },

        // From completed
        { from: 'completed', to: 'idle', event: 'reset' },

        // From error
        { from: 'error', to: 'idle', event: 'reset' },
        { from: 'error', to: 'running', event: 'retry' },

        // Global transitions
        { from: '*', to: 'error', event: 'fatal_error' },
        { from: '*', to: 'idle', event: 'force_reset' },
      ],
    });
  }

  /**
   * Serialize the state machine
   */
  serialize(): string {
    return JSON.stringify({
      currentState: this.context.currentState,
      previousState: this.context.previousState,
      event: this.context.event,
      data: this.context.data,
      history: this.context.history,
    });
  }

  /**
   * Deserialize and restore state
   */
  deserialize(serialized: string): void {
    const parsed = JSON.parse(serialized);
    this.context = {
      currentState: parsed.currentState,
      previousState: parsed.previousState,
      event: parsed.event,
      data: parsed.data,
      history: parsed.history.map((h: StateHistoryEntry) => ({
        ...h,
        timestamp: new Date(h.timestamp),
      })),
    };
  }
}
