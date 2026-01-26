/**
 * Agent runner for managing agent execution
 */

import type {
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentEvent,
  AgentEventType,
} from './types.js';
import { AgentError } from './types.js';
import { Agent } from './agent.js';
import { AgentStateMachine, createAgentStateMachine } from './state-machine.js';

export type AgentEventHandler = (event: AgentEvent) => void | Promise<void>;

export interface AgentRunnerConfig {
  /** Maximum concurrent agent executions */
  maxConcurrent?: number;
  /** Default timeout for agent execution */
  defaultTimeout?: number;
  /** Enable event streaming */
  enableEvents?: boolean;
  /** Retry failed executions */
  retryOnFailure?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

interface RunningExecution {
  agent: Agent;
  context: AgentContext;
  stateMachine: AgentStateMachine;
  promise: Promise<AgentOutput>;
  startTime: number;
  abortController: AbortController;
}

/**
 * Manages agent execution with concurrency control and event handling
 */
export class AgentRunner {
  private readonly config: AgentRunnerConfig;
  private readonly executions: Map<string, RunningExecution> = new Map();
  private readonly eventHandlers: Map<AgentEventType | '*', AgentEventHandler[]> = new Map();
  private executionCount = 0;

  constructor(config?: AgentRunnerConfig) {
    this.config = {
      maxConcurrent: config?.maxConcurrent ?? 10,
      defaultTimeout: config?.defaultTimeout ?? 60000,
      enableEvents: config?.enableEvents ?? true,
      retryOnFailure: config?.retryOnFailure ?? false,
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
    };
  }

  /**
   * Run an agent with the given input
   */
  async run(
    agent: Agent,
    input: AgentInput,
    context: AgentContext
  ): Promise<AgentOutput> {
    // Check concurrency limit
    if (this.executions.size >= (this.config.maxConcurrent ?? 10)) {
      throw new AgentError(
        'Maximum concurrent executions reached',
        'MAX_CONCURRENT_EXCEEDED',
        true
      );
    }

    const executionId = this.generateExecutionId();
    const abortController = new AbortController();
    const stateMachine = createAgentStateMachine(async (from, to) => {
      await this.emitEvent({
        type: 'agent:iteration',
        timestamp: new Date(),
        sessionId: context.sessionId,
        agentId: agent.id,
        data: { from, to },
      });
    });

    // Start event
    await this.emitEvent({
      type: 'agent:start',
      timestamp: new Date(),
      sessionId: context.sessionId,
      agentId: agent.id,
      data: { input },
    });

    // Create execution wrapper
    const executeWithRetry = async (): Promise<AgentOutput> => {
      let lastError: Error | null = null;
      const maxRetries = this.config.retryOnFailure ? (this.config.maxRetries ?? 3) : 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await stateMachine.transition('running');

          const result = await Promise.race([
            agent.run(input, context),
            this.createTimeout(context.sessionId, agent.id),
            this.createAbortPromise(abortController.signal, context.sessionId, agent.id),
          ]);

          await stateMachine.transition('completed');

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < maxRetries) {
            // Wait before retry
            await this.delay(this.config.retryDelay ?? 1000);
            continue;
          }

          await stateMachine.transition('failed');
          throw lastError;
        }
      }

      throw lastError ?? new Error('Execution failed');
    };

    const promise = executeWithRetry();

    // Track execution
    this.executions.set(executionId, {
      agent,
      context,
      stateMachine,
      promise,
      startTime: Date.now(),
      abortController,
    });

    this.executionCount++;

    try {
      const output = await promise;

      // Complete event
      await this.emitEvent({
        type: 'agent:complete',
        timestamp: new Date(),
        sessionId: context.sessionId,
        agentId: agent.id,
        data: { output },
      });

      return output;
    } catch (error) {
      // Error event
      await this.emitEvent({
        type: 'agent:error',
        timestamp: new Date(),
        sessionId: context.sessionId,
        agentId: agent.id,
        data: { error: error instanceof Error ? error.message : String(error) },
      });

      throw error;
    } finally {
      this.executions.delete(executionId);
    }
  }

  /**
   * Run an agent and stream events
   */
  async *stream(
    agent: Agent,
    input: AgentInput,
    context: AgentContext
  ): AsyncIterable<AgentEvent> {
    const events: AgentEvent[] = [];
    let resolve: (() => void) | null = null;
    let error: Error | null = null;
    let done = false;

    // Capture events
    const handler: AgentEventHandler = (event) => {
      events.push(event);
      resolve?.();
    };

    this.on('*', handler);

    // Start execution
    const executionPromise = this.run(agent, input, context)
      .catch(e => {
        error = e instanceof Error ? e : new Error(String(e));
      })
      .finally(() => {
        done = true;
        resolve?.();
      });

    try {
      while (!done || events.length > 0) {
        if (events.length > 0) {
          yield events.shift()!;
        } else if (!done) {
          await new Promise<void>(r => {
            resolve = r;
          });
        }
      }

      await executionPromise;

      if (error) {
        throw error;
      }
    } finally {
      this.off('*', handler);
    }
  }

  /**
   * Cancel an execution
   */
  cancel(sessionId: string): boolean {
    for (const [id, execution] of this.executions) {
      if (execution.context.sessionId === sessionId) {
        execution.abortController.abort();
        this.executions.delete(id);
        return true;
      }
    }
    return false;
  }

  /**
   * Cancel all executions
   */
  cancelAll(): number {
    let count = 0;
    for (const [id, execution] of this.executions) {
      execution.abortController.abort();
      this.executions.delete(id);
      count++;
    }
    return count;
  }

  /**
   * Get execution status
   */
  getStatus(sessionId: string): {
    running: boolean;
    state: string;
    elapsed: number;
  } | null {
    for (const execution of this.executions.values()) {
      if (execution.context.sessionId === sessionId) {
        return {
          running: true,
          state: execution.stateMachine.getState(),
          elapsed: Date.now() - execution.startTime,
        };
      }
    }
    return null;
  }

  /**
   * Get runner statistics
   */
  getStats(): {
    running: number;
    maxConcurrent: number;
    totalExecuted: number;
  } {
    return {
      running: this.executions.size,
      maxConcurrent: this.config.maxConcurrent ?? 10,
      totalExecuted: this.executionCount,
    };
  }

  /**
   * Register an event handler
   */
  on(event: AgentEventType | '*', handler: AgentEventHandler): void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = [];
      this.eventHandlers.set(event, handlers);
    }
    handlers.push(handler);
  }

  /**
   * Remove an event handler
   */
  off(event: AgentEventType | '*', handler: AgentEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Wait for all executions to complete
   */
  async waitAll(): Promise<void> {
    const promises = Array.from(this.executions.values()).map(e =>
      e.promise.catch(() => {})
    );
    await Promise.all(promises);
  }

  private async emitEvent(event: AgentEvent): Promise<void> {
    if (!this.config.enableEvents) return;

    // Specific handlers
    const handlers = this.eventHandlers.get(event.type) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }

    // Wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') ?? [];
    for (const handler of wildcardHandlers) {
      await handler(event);
    }
  }

  private createTimeout(
    sessionId: string,
    agentId: string
  ): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new AgentError(
            `Agent execution timed out after ${this.config.defaultTimeout}ms`,
            'TIMEOUT',
            false
          )
        );
      }, this.config.defaultTimeout);
    });
  }

  private createAbortPromise(
    signal: AbortSignal,
    sessionId: string,
    agentId: string
  ): Promise<never> {
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => {
        reject(
          new AgentError('Agent execution was cancelled', 'CANCELLED', false)
        );
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Create an agent runner
 */
export function createAgentRunner(config?: AgentRunnerConfig): AgentRunner {
  return new AgentRunner(config);
}
