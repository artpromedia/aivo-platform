/**
 * AgentRunner - Manages agent execution lifecycle with concurrency control
 */

import { v4 as uuid } from 'uuid';
import type {
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentEvent,
  AgentEventHandler,
  AgentEventType,
} from './types';
import type { Agent } from './agent';

export interface AgentRunnerConfig {
  maxConcurrentRuns: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelayMs: number;
  onError?: (error: Error, context: AgentContext) => void;
}

export interface RunOptions {
  timeout?: number;
  priority?: number;
  retryOnError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentRun {
  id: string;
  agentId: string;
  context: AgentContext;
  input: AgentInput;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output?: AgentOutput;
  error?: Error;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  priority: number;
}

export class AgentRunner {
  private config: AgentRunnerConfig;
  private agents: Map<string, Agent> = new Map();
  private runQueue: AgentRun[] = [];
  private activeRuns: Map<string, AgentRun> = new Map();
  private eventHandlers: Map<AgentEventType, AgentEventHandler[]> = new Map();
  private isProcessing: boolean = false;

  constructor(config?: Partial<AgentRunnerConfig>) {
    this.config = {
      maxConcurrentRuns: 5,
      defaultTimeout: 300000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config,
    };
  }

  /**
   * Register an agent with the runner
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.getId(), agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get a registered agent
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Run an agent with input and context
   */
  async run(
    agentId: string,
    input: AgentInput,
    context: AgentContext,
    options?: RunOptions
  ): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const run: AgentRun = {
      id: uuid(),
      agentId,
      context,
      input,
      status: 'pending',
      attempts: 0,
      priority: options?.priority || 0,
    };

    // Add to queue
    this.runQueue.push(run);
    this.runQueue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already
    this.processQueue();

    // Wait for completion
    return this.waitForRun(run.id, options?.timeout || this.config.defaultTimeout);
  }

  /**
   * Run an agent immediately without queueing
   */
  async runImmediate(
    agentId: string,
    input: AgentInput,
    context: AgentContext,
    options?: RunOptions
  ): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const timeout = options?.timeout || this.config.defaultTimeout;
    const retryOnError = options?.retryOnError ?? true;

    let lastError: Error | undefined;
    const maxAttempts = retryOnError ? this.config.retryAttempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          agent.run(input, context),
          timeout
        );
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts && retryOnError) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    throw lastError || new Error('Agent execution failed');
  }

  /**
   * Cancel a pending or running agent execution
   */
  cancel(runId: string): boolean {
    // Check queue
    const queueIndex = this.runQueue.findIndex(r => r.id === runId);
    if (queueIndex !== -1) {
      const run = this.runQueue[queueIndex];
      run.status = 'cancelled';
      this.runQueue.splice(queueIndex, 1);
      return true;
    }

    // Check active runs
    const activeRun = this.activeRuns.get(runId);
    if (activeRun) {
      activeRun.status = 'cancelled';
      this.activeRuns.delete(runId);
      return true;
    }

    return false;
  }

  /**
   * Get the status of a run
   */
  getRunStatus(runId: string): AgentRun | undefined {
    const queued = this.runQueue.find(r => r.id === runId);
    if (queued) return queued;

    return this.activeRuns.get(runId);
  }

  /**
   * Get all pending runs
   */
  getPendingRuns(): AgentRun[] {
    return [...this.runQueue];
  }

  /**
   * Get all active runs
   */
  getActiveRuns(): AgentRun[] {
    return Array.from(this.activeRuns.values());
  }

  /**
   * Get statistics about the runner
   */
  getStats(): {
    registeredAgents: number;
    pendingRuns: number;
    activeRuns: number;
    maxConcurrentRuns: number;
  } {
    return {
      registeredAgents: this.agents.size,
      pendingRuns: this.runQueue.length,
      activeRuns: this.activeRuns.size,
      maxConcurrentRuns: this.config.maxConcurrentRuns,
    };
  }

  /**
   * Register an event handler
   */
  on(eventType: AgentEventType, handler: AgentEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Emit an event to all handlers
   */
  private async emitEvent(event: AgentEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Process the run queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.runQueue.length > 0 && this.activeRuns.size < this.config.maxConcurrentRuns) {
        const run = this.runQueue.shift();
        if (!run) break;

        // Start the run without awaiting
        this.executeRun(run).catch(error => {
          console.error('Run execution error:', error);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single run
   */
  private async executeRun(run: AgentRun): Promise<void> {
    const agent = this.agents.get(run.agentId);
    if (!agent) {
      run.status = 'failed';
      run.error = new Error(`Agent not found: ${run.agentId}`);
      return;
    }

    run.status = 'running';
    run.startedAt = new Date();
    run.attempts++;
    this.activeRuns.set(run.id, run);

    await this.emitEvent({
      type: 'agent:start',
      timestamp: new Date(),
      agentId: run.agentId,
      sessionId: run.context.sessionId,
      data: { runId: run.id, input: run.input },
    });

    try {
      const output = await agent.run(run.input, run.context);

      run.status = 'completed';
      run.output = output;
      run.completedAt = new Date();

      await this.emitEvent({
        type: 'agent:complete',
        timestamp: new Date(),
        agentId: run.agentId,
        sessionId: run.context.sessionId,
        data: { runId: run.id, output },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry logic
      if (run.attempts < this.config.retryAttempts) {
        await this.delay(this.config.retryDelayMs * run.attempts);
        this.runQueue.unshift(run);
        run.status = 'pending';
      } else {
        run.status = 'failed';
        run.error = err;
        run.completedAt = new Date();

        await this.emitEvent({
          type: 'agent:error',
          timestamp: new Date(),
          agentId: run.agentId,
          sessionId: run.context.sessionId,
          data: { runId: run.id, error: err.message },
        });

        if (this.config.onError) {
          this.config.onError(err, run.context);
        }
      }
    } finally {
      this.activeRuns.delete(run.id);
      // Process more from queue
      this.processQueue();
    }
  }

  /**
   * Wait for a run to complete
   */
  private waitForRun(runId: string, timeout: number): Promise<AgentOutput> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkStatus = () => {
        const run = this.getRunStatus(runId);

        if (!run) {
          reject(new Error(`Run not found: ${runId}`));
          return;
        }

        if (run.status === 'completed' && run.output) {
          resolve(run.output);
          return;
        }

        if (run.status === 'failed') {
          reject(run.error || new Error('Agent run failed'));
          return;
        }

        if (run.status === 'cancelled') {
          reject(new Error('Agent run was cancelled'));
          return;
        }

        if (Date.now() - startTime > timeout) {
          this.cancel(runId);
          reject(new Error('Agent run timed out'));
          return;
        }

        // Check again in 100ms
        setTimeout(checkStatus, 100);
      };

      checkStatus();
    });
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timed out'));
      }, timeout);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown the runner gracefully
   */
  async shutdown(): Promise<void> {
    // Cancel all pending runs
    for (const run of this.runQueue) {
      run.status = 'cancelled';
    }
    this.runQueue = [];

    // Wait for active runs to complete
    while (this.activeRuns.size > 0) {
      await this.delay(100);
    }
  }
}
