/**
 * ToolExecutor - Executes tools with validation, timeout, and retry logic
 */

import type { Tool, ToolContext, ToolResult } from '../core/types';

import type { ToolRegistry } from './tool-registry';
import type { ExecutorOptions, ToolCall, BatchToolResult } from './tool-types';
import { validateParams } from './tool-types';

export class ToolExecutor {
  private registry: ToolRegistry;
  private options: Required<ExecutorOptions>;

  constructor(registry: ToolRegistry, options?: ExecutorOptions) {
    this.registry = registry;
    this.options = {
      timeout: 30000, // 30 seconds
      retryAttempts: 0,
      retryDelayMs: 1000,
      onBeforeExecute: () => {
        /* no-op */
      },
      onAfterExecute: () => {
        /* no-op */
      },
      onError: () => {
        /* no-op */
      },
      ...options,
    };
  }

  /**
   * Execute a tool by name
   */
  async execute(toolName: string, params: unknown, context: ToolContext): Promise<ToolResult> {
    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        executionTimeMs: 0,
      };
    }

    return this.executeTool(tool, params, context);
  }

  /**
   * Execute a tool instance
   */
  async executeTool(tool: Tool, params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate parameters
      if (tool.validate) {
        const validation = tool.validate(params);
        if (!validation.valid) {
          return {
            success: false,
            error: `Validation failed: ${validation.errors?.join(', ')}`,
            executionTimeMs: Date.now() - startTime,
          };
        }
      } else {
        // Use default validation
        const validation = validateParams(params, tool.parameters);
        if (!validation.valid) {
          return {
            success: false,
            error: `Validation failed: ${validation.errors?.join(', ')}`,
            executionTimeMs: Date.now() - startTime,
          };
        }
      }

      // Before execute hook
      await this.options.onBeforeExecute(tool, params);

      // Execute with retry logic
      let lastError: Error | undefined;
      const maxAttempts = this.options.retryAttempts + 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await this.executeWithTimeout(
            tool.execute(params, context),
            this.options.timeout
          );

          const executionTimeMs = Date.now() - startTime;
          const finalResult = { ...result, executionTimeMs };

          // After execute hook
          await this.options.onAfterExecute(tool, finalResult);

          return finalResult;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < maxAttempts) {
            await this.delay(this.options.retryDelayMs * attempt);
          }
        }
      }

      // All attempts failed
      const executionTimeMs = Date.now() - startTime;
      const errorResult: ToolResult = {
        success: false,
        error: lastError?.message || 'Unknown error',
        executionTimeMs,
      };

      await this.options.onError(tool, lastError || new Error('Unknown error'));

      return errorResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const executionTimeMs = Date.now() - startTime;

      await this.options.onError(tool, err);

      return {
        success: false,
        error: err.message,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(calls: ToolCall[], context: ToolContext): Promise<ToolResult[]> {
    const promises = calls.map((call) => this.execute(call.name, call.arguments, context));

    return Promise.all(promises);
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeSequential(calls: ToolCall[], context: ToolContext): Promise<BatchToolResult[]> {
    const results: BatchToolResult[] = [];

    for (const call of calls) {
      const result = await this.execute(call.name, call.arguments, context);
      results.push({
        toolName: call.name,
        result,
      });

      // Stop on first failure if needed
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute tools with dependencies
   * Each tool can access results from previous tools
   */
  async executeWithDependencies(
    calls: {
      call: ToolCall;
      dependsOn?: string[];
      transform?: (
        params: Record<string, unknown>,
        previousResults: Map<string, ToolResult>
      ) => Record<string, unknown>;
    }[],
    context: ToolContext
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();
    const pending = new Map(calls.map((c) => [c.call.id, c]));
    const completed = new Set<string>();

    while (pending.size > 0) {
      const readyToExecute: typeof calls = [];

      // Find calls with all dependencies satisfied
      for (const [_id, callInfo] of pending) {
        const deps = callInfo.dependsOn || [];
        if (deps.every((dep) => completed.has(dep))) {
          readyToExecute.push(callInfo);
        }
      }

      if (readyToExecute.length === 0 && pending.size > 0) {
        // Circular dependency or missing dependency
        throw new Error('Circular or missing dependency detected');
      }

      // Execute ready calls in parallel
      const executionPromises = readyToExecute.map(async (callInfo) => {
        let params = callInfo.call.arguments;

        // Transform params using previous results if needed
        if (callInfo.transform) {
          params = callInfo.transform(params, results);
        }

        const result = await this.execute(callInfo.call.name, params, context);

        return { id: callInfo.call.id, result };
      });

      const executionResults = await Promise.all(executionPromises);

      for (const { id, result } of executionResults) {
        results.set(id, result);
        completed.add(id);
        pending.delete(id);
      }
    }

    return results;
  }

  /**
   * Validate tool call parameters without executing
   */
  validateCall(toolName: string, params: unknown): { valid: boolean; errors?: string[] } {
    const tool = this.registry.get(toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool not found: ${toolName}`] };
    }

    if (tool.validate) {
      return tool.validate(params);
    }

    return validateParams(params, tool.parameters);
  }

  /**
   * Get available tools
   */
  getAvailableTools(): string[] {
    return this.registry.getNames();
  }

  /**
   * Check if a tool exists
   */
  hasTool(toolName: string): boolean {
    return this.registry.has(toolName);
  }

  /**
   * Update executor options
   */
  setOptions(options: Partial<ExecutorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
