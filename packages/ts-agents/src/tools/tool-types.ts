/**
 * Tool types and validation utilities
 */

import type {
  Tool,
  ToolResult,
  ToolContext,
  ToolDefinition,
  JSONSchema,
  JSONSchemaProperty,
  ValidationResult,
} from '../core/types.js';

export type { Tool, ToolResult, ToolContext, ToolDefinition, JSONSchema, ValidationResult };

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry on failure */
  retryOnFailure?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Tool metadata for registration
 */
export interface ToolMetadata {
  /** Tool category */
  category?: string;
  /** Tool version */
  version?: string;
  /** Required permissions */
  permissions?: string[];
  /** Tool tags for filtering */
  tags?: string[];
  /** Whether tool is deprecated */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
}

/**
 * Extended tool interface with metadata
 */
export interface ExtendedTool extends Tool {
  metadata?: ToolMetadata;
}

/**
 * Validate parameters against a JSON schema
 */
export function validateParameters(
  params: Record<string, unknown>,
  schema: JSONSchema
): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (schema.required) {
    for (const required of schema.required) {
      if (!(required in params) || params[required] === undefined) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
  }

  // Validate properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in params) {
        const propErrors = validateProperty(params[key], propSchema, key);
        errors.push(...propErrors);
      }
    }

    // Check for additional properties
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(params)) {
        if (!(key in schema.properties)) {
          errors.push(`Unknown parameter: ${key}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate a single property value
 */
function validateProperty(
  value: unknown,
  schema: JSONSchemaProperty,
  path: string
): string[] {
  const errors: string[] = [];

  // Type validation
  const actualType = getValueType(value);
  if (schema.type && actualType !== schema.type) {
    // Allow null for any type if value is null
    if (value !== null) {
      errors.push(`Parameter '${path}' expected ${schema.type}, got ${actualType}`);
      return errors;
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value as string)) {
    errors.push(`Parameter '${path}' must be one of: ${schema.enum.join(', ')}`);
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`Parameter '${path}' must have at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`Parameter '${path}' must have at most ${schema.maxLength} characters`);
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`Parameter '${path}' must match pattern: ${schema.pattern}`);
      }
    }
  }

  // Number validations
  if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Parameter '${path}' must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Parameter '${path}' must be at most ${schema.maximum}`);
    }
    if (schema.type === 'integer' && !Number.isInteger(value)) {
      errors.push(`Parameter '${path}' must be an integer`);
    }
  }

  // Array validation
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemErrors = validateProperty(value[i], schema.items, `${path}[${i}]`);
        errors.push(...itemErrors);
      }
    }
  }

  // Object validation
  if (schema.type === 'object' && typeof value === 'object' && value !== null) {
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in (value as Record<string, unknown>)) {
          const propErrors = validateProperty(
            (value as Record<string, unknown>)[key],
            propSchema,
            `${path}.${key}`
          );
          errors.push(...propErrors);
        }
      }

      // Check required
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in (value as Record<string, unknown>))) {
            errors.push(`Missing required property: ${path}.${required}`);
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Get the type of a value as a JSON Schema type
 */
function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return typeof value;
}

/**
 * Create a tool definition for LLM function calling
 */
export function createToolDefinition(tool: Tool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

/**
 * Create a successful tool result
 */
export function successResult(data: unknown, executionTimeMs: number): ToolResult {
  return {
    success: true,
    data,
    executionTimeMs,
  };
}

/**
 * Create a failed tool result
 */
export function errorResult(error: string, executionTimeMs: number): ToolResult {
  return {
    success: false,
    error,
    executionTimeMs,
  };
}

/**
 * Helper to create tools with type inference
 */
export function defineTool<TParams extends Record<string, unknown>>(config: {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: TParams, context: ToolContext) => Promise<unknown>;
  validate?: (params: TParams) => ValidationResult;
  metadata?: ToolMetadata;
}): ExtendedTool {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: async (params, context) => {
      const startTime = Date.now();
      try {
        const result = await config.execute(params as TParams, context);
        return successResult(result, Date.now() - startTime);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return errorResult(message, Date.now() - startTime);
      }
    },
    validate: config.validate as Tool['validate'],
    metadata: config.metadata,
  };
}
