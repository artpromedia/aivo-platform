/**
 * Tool type definitions for the agent framework
 */

import type {
  JSONSchema,
  Tool,
  ToolContext,
  ToolResult,
  ValidationResult,
  ToolDefinition,
} from '../core/types';

export type { Tool, ToolContext, ToolResult, ValidationResult, ToolDefinition, JSONSchema };

/**
 * Options for tool execution
 */
export interface ExecutorOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  onBeforeExecute?: (tool: Tool, params: unknown) => void | Promise<void>;
  onAfterExecute?: (tool: Tool, result: ToolResult) => void | Promise<void>;
  onError?: (tool: Tool, error: Error) => void | Promise<void>;
}

/**
 * Tool call request
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Batch tool execution result
 */
export interface BatchToolResult {
  toolName: string;
  result: ToolResult;
}

/**
 * Tool metadata for registration
 */
export interface ToolMetadata {
  category?: string;
  version?: string;
  author?: string;
  tags?: string[];
  examples?: ToolExample[];
}

/**
 * Example usage of a tool
 */
export interface ToolExample {
  description: string;
  input: Record<string, unknown>;
  expectedOutput?: unknown;
}

/**
 * Extended tool interface with metadata
 */
export interface ExtendedTool extends Tool {
  metadata?: ToolMetadata;
}

/**
 * Tool factory function type
 */
export type ToolFactory = (config?: Record<string, unknown>) => Tool;

/**
 * Built-in tool categories
 */
export type ToolCategory =
  | 'search'
  | 'calculation'
  | 'curriculum'
  | 'communication'
  | 'data'
  | 'file'
  | 'web'
  | 'custom';

/**
 * Helper to create a tool definition
 */
export function defineTool(options: {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: unknown, context: ToolContext) => Promise<ToolResult>;
  validate?: (params: unknown) => ValidationResult;
  metadata?: ToolMetadata;
}): ExtendedTool {
  return {
    name: options.name,
    description: options.description,
    parameters: options.parameters,
    execute: options.execute,
    validate: options.validate,
    metadata: options.metadata,
  };
}

/**
 * Helper to create a simple tool result
 */
export function toolSuccess(data: unknown, executionTimeMs = 0): ToolResult {
  return {
    success: true,
    data,
    executionTimeMs,
  };
}

/**
 * Helper to create an error tool result
 */
export function toolError(error: string, executionTimeMs = 0): ToolResult {
  return {
    success: false,
    error,
    executionTimeMs,
  };
}

/**
 * Helper to validate parameters
 */
export function validateParams(params: unknown, schema: JSONSchema): ValidationResult {
  const errors: string[] = [];

  if (typeof params !== 'object' || params === null) {
    return { valid: false, errors: ['Parameters must be an object'] };
  }

  const paramObj = params as Record<string, unknown>;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in paramObj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check property types
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (key in paramObj) {
        const value = paramObj[key];
        const expectedType = prop.type;

        if (expectedType === 'string' && typeof value !== 'string') {
          errors.push(`Field '${key}' must be a string`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Field '${key}' must be a number`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${key}' must be a boolean`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Field '${key}' must be an array`);
        } else if (expectedType === 'object' && (typeof value !== 'object' || value === null)) {
          errors.push(`Field '${key}' must be an object`);
        }

        // Check enum values
        if (prop.enum && !prop.enum.includes(value as string)) {
          errors.push(`Field '${key}' must be one of: ${prop.enum.join(', ')}`);
        }

        // Check number constraints
        if (typeof value === 'number') {
          if (prop.minimum !== undefined && value < prop.minimum) {
            errors.push(`Field '${key}' must be >= ${prop.minimum}`);
          }
          if (prop.maximum !== undefined && value > prop.maximum) {
            errors.push(`Field '${key}' must be <= ${prop.maximum}`);
          }
        }

        // Check string constraints
        if (typeof value === 'string') {
          if (prop.minLength !== undefined && value.length < prop.minLength) {
            errors.push(`Field '${key}' must have at least ${prop.minLength} characters`);
          }
          if (prop.maxLength !== undefined && value.length > prop.maxLength) {
            errors.push(`Field '${key}' must have at most ${prop.maxLength} characters`);
          }
          if (prop.pattern) {
            const regex = new RegExp(prop.pattern);
            if (!regex.test(value)) {
              errors.push(`Field '${key}' must match pattern: ${prop.pattern}`);
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
