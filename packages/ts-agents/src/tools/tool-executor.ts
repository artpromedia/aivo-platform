/**
 * Tool executor for running agent tools with timeout, retries, and error handling
 */

import type { Tool, ToolResult, ToolContext, ToolCall, ValidationResult } from '../core/types.js';
import { ToolExecutionError } from '../core/types.js';
import { ToolRegistry } from './tool-registry.js';
import { validateParameters, errorResult, type ToolExecutionOptions } from './tool-types.js';

export interface ExecutorOptions {
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  /** Default retry configuration */
  defaultRetries?: number;
  /** Default retry delay in milliseconds */
  defaultRetryDelay?: number;
  /** Execute tools in sandboxed context */
  sandboxed?: boolean;
  /** Maximum parallel executions */
  maxParallelExecutions?: number;
  /** Pre-execution hook */
  onBeforeExecute?: (toolName: string, params: Record<string, unknown>) => Promise<void>;
  /** Post-execution hook */
  onAfterExecute?: (toolName: string, result: ToolResult) => Promise<void>;
  /** Error hook */
  onError?: (toolName: string, error: Error) => Promise<void>;
}

/**
 * Executes tools with error handling, timeouts, and retries
 */
export class ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly options: ExecutorOptions;
  private activeExecutions = 0;

  constructor(registry: ToolRegistry, options?: ExecutorOptions) {
    this.registry = registry;
    this.options = {
      defaultTimeout: options?.defaultTimeout ?? 30000,
      defaultRetries: options?.defaultRetries ?? 0,
      defaultRetryDelay: options?.defaultRetryDelay ?? 1000,
      sandboxed: options?.sandboxed ?? false,
      maxParallelExecutions: options?.maxParallelExecutions ?? 10,
      onBeforeExecute: options?.onBeforeExecute,
      onAfterExecute: options?.onAfterExecute,
      onError: options?.onError,
    };
  }

  /**
   * Execute a single tool
   */
  async execute(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolContext,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const tool = this.registry.get(toolName);

    if (!tool) {
      return errorResult(`Tool '${toolName}' not found`, 0);
    }

    // Validate parameters
    const validation = this.validateToolParams(tool, params);
    if (!validation.valid) {
      return errorResult(
        `Invalid parameters: ${validation.errors?.join(', ')}`,
        0
      );
    }

    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 30000;
    const maxRetries = options?.retryOnFailure
      ? (options.maxRetries ?? this.options.defaultRetries ?? 1)
      : 0;
    const retryDelay = options?.retryDelay ?? this.options.defaultRetryDelay ?? 1000;

    // Execute with retries
    let lastResult: ToolResult | null = null;
    let attempts = 0;

    while (attempts <= maxRetries) {
      attempts++;

      try {
        await this.options.onBeforeExecute?.(toolName, params);

        lastResult = await this.executeWithTimeout(tool, params, context, timeout);

        await this.options.onAfterExecute?.(toolName, lastResult);

        if (lastResult.success || attempts > maxRetries) {
          return lastResult;
        }

        // Wait before retry
        if (attempts <= maxRetries) {
          await this.delay(retryDelay * attempts);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await this.options.onError?.(toolName, err);

        lastResult = errorResult(err.message, 0);

        if (attempts > maxRetries) {
          return lastResult;
        }

        await this.delay(retryDelay * attempts);
      }
    }

    return lastResult ?? errorResult('Execution failed with no result', 0);
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    calls: ToolCall[],
    context: ToolContext,
    options?: ToolExecutionOptions
  ): Promise<ToolResult[]> {
    const maxParallel = this.options.maxParallelExecutions ?? 10;

    // Execute in batches if exceeding max parallel
    if (calls.length <= maxParallel) {
      return Promise.all(
        calls.map(call =>
          this.execute(call.name, call.arguments, context, options)
        )
      );
    }

    // Batch execution
    const results: ToolResult[] = [];
    for (let i = 0; i < calls.length; i += maxParallel) {
      const batch = calls.slice(i, i + maxParallel);
      const batchResults = await Promise.all(
        batch.map(call =>
          this.execute(call.name, call.arguments, context, options)
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute tools sequentially
   */
  async executeSequential(
    calls: ToolCall[],
    context: ToolContext,
    options?: ToolExecutionOptions & { stopOnError?: boolean }
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of calls) {
      const result = await this.execute(call.name, call.arguments, context, options);
      results.push(result);

      if (!result.success && options?.stopOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Validate tool parameters
   */
  validateToolParams(
    tool: Tool,
    params: Record<string, unknown>
  ): ValidationResult {
    // Use tool's custom validator if available
    if (tool.validate) {
      return tool.validate(params);
    }

    // Use schema validation
    return validateParameters(params, tool.parameters);
  }

  /**
   * Check if a tool can be executed
   */
  canExecute(toolName: string): boolean {
    return this.registry.has(toolName);
  }

  /**
   * Get available tools
   */
  getAvailableTools(): string[] {
    return this.registry.getNames();
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    activeExecutions: number;
    maxParallel: number;
    registeredTools: number;
  } {
    return {
      activeExecutions: this.activeExecutions,
      maxParallel: this.options.maxParallelExecutions ?? 10,
      registeredTools: this.registry.size(),
    };
  }

  private async executeWithTimeout(
    tool: Tool,
    params: Record<string, unknown>,
    context: ToolContext,
    timeout: number
  ): Promise<ToolResult> {
    this.activeExecutions++;

    try {
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        setTimeout(() => {
          reject(new ToolExecutionError(tool.name, `Execution timed out after ${timeout}ms`));
        }, timeout);
      });

      const executionPromise = tool.execute(params, context);

      return await Promise.race([executionPromise, timeoutPromise]);
    } finally {
      this.activeExecutions--;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a tool executor with a registry
 */
export function createToolExecutor(
  registry: ToolRegistry,
  options?: ExecutorOptions
): ToolExecutor {
  return new ToolExecutor(registry, options);
}
