/**
 * State machine for managing agent execution states
 */

import type { AgentStatus } from './types.js';

export type StateTransition = {
  from: AgentStatus;
  to: AgentStatus;
  action?: string;
};

export type TransitionHandler = (
  from: AgentStatus,
  to: AgentStatus,
  context?: Record<string, unknown>
) => Promise<void>;

/**
 * State machine configuration
 */
export interface StateMachineConfig {
  /** Initial state */
  initialState: AgentStatus;
  /** Valid state transitions */
  transitions: StateTransition[];
  /** Global transition handler */
  onTransition?: TransitionHandler;
  /** Handler for invalid transitions */
  onInvalidTransition?: (from: AgentStatus, to: AgentStatus) => void;
}

/**
 * Agent state machine for managing execution states
 */
export class AgentStateMachine {
  private currentState: AgentStatus;
  private readonly transitions: Map<AgentStatus, Set<AgentStatus>> = new Map();
  private readonly handlers: Map<string, TransitionHandler[]> = new Map();
  private readonly config: StateMachineConfig;

  constructor(config: StateMachineConfig) {
    this.config = config;
    this.currentState = config.initialState;

    // Build transition map
    for (const transition of config.transitions) {
      let allowedStates = this.transitions.get(transition.from);
      if (!allowedStates) {
        allowedStates = new Set();
        this.transitions.set(transition.from, allowedStates);
      }
      allowedStates.add(transition.to);
    }
  }

  /**
   * Get the current state
   */
  getState(): AgentStatus {
    return this.currentState;
  }

  /**
   * Check if a transition is valid
   */
  canTransition(to: AgentStatus): boolean {
    const allowed = this.transitions.get(this.currentState);
    return allowed?.has(to) ?? false;
  }

  /**
   * Get all valid transitions from current state
   */
  getValidTransitions(): AgentStatus[] {
    const allowed = this.transitions.get(this.currentState);
    return allowed ? Array.from(allowed) : [];
  }

  /**
   * Transition to a new state
   */
  async transition(
    to: AgentStatus,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.canTransition(to)) {
      this.config.onInvalidTransition?.(this.currentState, to);
      return false;
    }

    const from = this.currentState;
    this.currentState = to;

    // Call global handler
    if (this.config.onTransition) {
      await this.config.onTransition(from, to, context);
    }

    // Call specific handlers
    const key = `${from}:${to}`;
    const specificHandlers = this.handlers.get(key);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        await handler(from, to, context);
      }
    }

    // Call "any" handlers
    const anyHandlers = this.handlers.get(`${from}:*`) ?? [];
    for (const handler of anyHandlers) {
      await handler(from, to, context);
    }

    return true;
  }

  /**
   * Register a handler for a specific transition
   */
  onTransition(
    from: AgentStatus | '*',
    to: AgentStatus | '*',
    handler: TransitionHandler
  ): void {
    const key = `${from}:${to}`;
    let handlers = this.handlers.get(key);
    if (!handlers) {
      handlers = [];
      this.handlers.set(key, handlers);
    }
    handlers.push(handler);
  }

  /**
   * Register a handler for entering a state
   */
  onEnter(state: AgentStatus, handler: TransitionHandler): void {
    this.onTransition('*', state, handler);
  }

  /**
   * Register a handler for leaving a state
   */
  onLeave(state: AgentStatus, handler: TransitionHandler): void {
    this.onTransition(state, '*', handler);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = this.config.initialState;
  }

  /**
   * Check if in a terminal state
   */
  isTerminal(): boolean {
    return (
      this.currentState === 'completed' ||
      this.currentState === 'failed' ||
      this.currentState === 'cancelled'
    );
  }

  /**
   * Check if the agent is active (running or processing)
   */
  isActive(): boolean {
    return (
      this.currentState === 'running' ||
      this.currentState === 'thinking' ||
      this.currentState === 'executing_tool'
    );
  }
}

/**
 * Default agent state transitions
 */
export const DEFAULT_AGENT_TRANSITIONS: StateTransition[] = [
  // From idle
  { from: 'idle', to: 'running', action: 'start' },

  // From running
  { from: 'running', to: 'thinking', action: 'think' },
  { from: 'running', to: 'waiting_for_input', action: 'wait' },
  { from: 'running', to: 'completed', action: 'complete' },
  { from: 'running', to: 'failed', action: 'fail' },
  { from: 'running', to: 'cancelled', action: 'cancel' },

  // From thinking
  { from: 'thinking', to: 'executing_tool', action: 'execute_tool' },
  { from: 'thinking', to: 'running', action: 'continue' },
  { from: 'thinking', to: 'completed', action: 'complete' },
  { from: 'thinking', to: 'failed', action: 'fail' },

  // From executing_tool
  { from: 'executing_tool', to: 'thinking', action: 'tool_complete' },
  { from: 'executing_tool', to: 'running', action: 'continue' },
  { from: 'executing_tool', to: 'failed', action: 'fail' },

  // From waiting_for_input
  { from: 'waiting_for_input', to: 'running', action: 'receive_input' },
  { from: 'waiting_for_input', to: 'cancelled', action: 'cancel' },
  { from: 'waiting_for_input', to: 'failed', action: 'timeout' },

  // From terminal states (can restart)
  { from: 'completed', to: 'idle', action: 'reset' },
  { from: 'failed', to: 'idle', action: 'reset' },
  { from: 'cancelled', to: 'idle', action: 'reset' },
];

/**
 * Create a default agent state machine
 */
export function createAgentStateMachine(
  onTransition?: TransitionHandler
): AgentStateMachine {
  return new AgentStateMachine({
    initialState: 'idle',
    transitions: DEFAULT_AGENT_TRANSITIONS,
    onTransition,
  });
}
