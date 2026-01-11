/**
 * LLM Function Calling Integration
 *
 * Converts tool definitions to LLM-native function schemas and handles
 * function call parsing from LLM responses. Supports:
 * - OpenAI function calling format
 * - Anthropic tool use format
 * - Google Gemini function calling format
 *
 * @module ai-orchestrator/agentic/function-calling
 */

import type { ToolDefinition, ToolParameter } from '../execution/tool-executor.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * OpenAI function schema format
 */
export interface OpenAIFunctionSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, OpenAIParameterSchema>;
      required: string[];
    };
  };
}

export interface OpenAIParameterSchema {
  type: string;
  description: string;
  enum?: unknown[];
  items?: { type: string };
  properties?: Record<string, OpenAIParameterSchema>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * Anthropic tool schema format
 */
export interface AnthropicToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, AnthropicParameterSchema>;
    required: string[];
  };
}

export interface AnthropicParameterSchema {
  type: string;
  description: string;
  enum?: unknown[];
  items?: { type: string };
  properties?: Record<string, AnthropicParameterSchema>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * Parsed function call from LLM response
 */
export interface ParsedFunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Function call result to send back to LLM
 */
export interface FunctionCallResult {
  callId: string;
  name: string;
  result: unknown;
  error?: string;
}

/**
 * Provider type for schema conversion
 */
export type FunctionCallingProvider = 'openai' | 'anthropic' | 'gemini';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMA CONVERTERS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Convert a ToolParameter to JSON Schema format
 */
function parameterToJsonSchema(param: ToolParameter): OpenAIParameterSchema {
  const schema: OpenAIParameterSchema = {
    type: param.type === 'array' ? 'array' : param.type,
    description: param.description,
  };

  // Handle array items
  if (param.type === 'array') {
    schema.items = { type: 'string' }; // Default to string array
  }

  // Add validation constraints
  if (param.validation) {
    if (param.validation.enum) {
      schema.enum = param.validation.enum;
    }
    if (param.validation.min !== undefined) {
      schema.minimum = param.validation.min;
    }
    if (param.validation.max !== undefined) {
      schema.maximum = param.validation.max;
    }
    if (param.validation.minLength !== undefined) {
      schema.minLength = param.validation.minLength;
    }
    if (param.validation.maxLength !== undefined) {
      schema.maxLength = param.validation.maxLength;
    }
  }

  return schema;
}

/**
 * Convert ToolDefinition to OpenAI function schema
 */
export function toolToOpenAISchema(tool: ToolDefinition): OpenAIFunctionSchema {
  const properties: Record<string, OpenAIParameterSchema> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = parameterToJsonSchema(param);
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.id,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}

/**
 * Convert ToolDefinition to Anthropic tool schema
 */
export function toolToAnthropicSchema(tool: ToolDefinition): AnthropicToolSchema {
  const properties: Record<string, AnthropicParameterSchema> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = parameterToJsonSchema(param);
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: tool.id,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Convert multiple tools to provider-specific schemas
 */
export function toolsToSchemas(
  tools: ToolDefinition[],
  provider: FunctionCallingProvider
): OpenAIFunctionSchema[] | AnthropicToolSchema[] {
  switch (provider) {
    case 'openai':
    case 'gemini':
      return tools.map(toolToOpenAISchema);
    case 'anthropic':
      return tools.map(toolToAnthropicSchema);
    default:
      return tools.map(toolToOpenAISchema);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSERS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Parse function calls from OpenAI response
 */
export function parseOpenAIFunctionCalls(response: {
  choices: Array<{
    message: {
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}): ParsedFunctionCall[] {
  const calls: ParsedFunctionCall[] = [];

  for (const choice of response.choices) {
    const toolCalls = choice.message.tool_calls;
    if (!toolCalls) continue;

    for (const call of toolCalls) {
      if (call.type !== 'function') continue;

      try {
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        calls.push({
          id: call.id,
          name: call.function.name,
          arguments: args,
        });
      } catch (error) {
        console.error('Failed to parse function arguments:', call.function.arguments);
      }
    }
  }

  return calls;
}

/**
 * Parse tool use from Anthropic response
 */
export function parseAnthropicToolUse(response: {
  content: Array<{
    type: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    text?: string;
  }>;
}): ParsedFunctionCall[] {
  const calls: ParsedFunctionCall[] = [];

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.id && block.name) {
      calls.push({
        id: block.id,
        name: block.name,
        arguments: block.input ?? {},
      });
    }
  }

  return calls;
}

/**
 * Parse function calls from raw LLM response (provider-agnostic)
 */
export function parseFunctionCalls(
  response: unknown,
  provider: FunctionCallingProvider
): ParsedFunctionCall[] {
  switch (provider) {
    case 'openai':
    case 'gemini':
      return parseOpenAIFunctionCalls(response as Parameters<typeof parseOpenAIFunctionCalls>[0]);
    case 'anthropic':
      return parseAnthropicToolUse(response as Parameters<typeof parseAnthropicToolUse>[0]);
    default:
      return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MESSAGE BUILDERS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Build OpenAI tool result message
 */
export function buildOpenAIToolResultMessage(result: FunctionCallResult): {
  role: 'tool';
  tool_call_id: string;
  content: string;
} {
  return {
    role: 'tool',
    tool_call_id: result.callId,
    content: result.error
      ? JSON.stringify({ error: result.error })
      : JSON.stringify(result.result),
  };
}

/**
 * Build Anthropic tool result message
 */
export function buildAnthropicToolResultMessage(result: FunctionCallResult): {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
} {
  return {
    type: 'tool_result',
    tool_use_id: result.callId,
    content: result.error
      ? result.error
      : typeof result.result === 'string'
        ? result.result
        : JSON.stringify(result.result),
    is_error: !!result.error,
  };
}

/**
 * Build tool result messages for provider
 */
export function buildToolResultMessages(
  results: FunctionCallResult[],
  provider: FunctionCallingProvider
): unknown[] {
  switch (provider) {
    case 'openai':
    case 'gemini':
      return results.map(buildOpenAIToolResultMessage);
    case 'anthropic':
      return results.map(buildAnthropicToolResultMessage);
    default:
      return results.map(buildOpenAIToolResultMessage);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FUNCTION CALLING OPTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Options for function calling behavior
 */
export interface FunctionCallingOptions {
  /** Whether function calling is enabled */
  enabled: boolean;

  /** Tool choice mode */
  toolChoice: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };

  /** Maximum number of function calls in a single turn */
  maxCalls: number;

  /** Whether to allow parallel function calls */
  parallelCalls: boolean;
}

export const DEFAULT_FUNCTION_CALLING_OPTIONS: FunctionCallingOptions = {
  enabled: true,
  toolChoice: 'auto',
  maxCalls: 10,
  parallelCalls: true,
};

/**
 * Build provider-specific function calling request options
 */
export function buildFunctionCallingRequestOptions(
  tools: ToolDefinition[],
  options: FunctionCallingOptions,
  provider: FunctionCallingProvider
): Record<string, unknown> {
  if (!options.enabled || tools.length === 0) {
    return {};
  }

  const schemas = toolsToSchemas(tools, provider);

  switch (provider) {
    case 'openai':
    case 'gemini':
      return {
        tools: schemas,
        tool_choice: options.toolChoice === 'required' ? 'required' : options.toolChoice,
        parallel_tool_calls: options.parallelCalls,
      };
    case 'anthropic':
      return {
        tools: schemas,
        tool_choice:
          options.toolChoice === 'required'
            ? { type: 'any' }
            : options.toolChoice === 'auto'
              ? { type: 'auto' }
              : { type: 'none' },
      };
    default:
      return {
        tools: schemas,
        tool_choice: options.toolChoice,
      };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export {
  parameterToJsonSchema,
};
