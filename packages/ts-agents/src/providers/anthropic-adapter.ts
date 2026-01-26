/**
 * Anthropic (Claude) model adapter implementation
 */

import type { Message, ModelConfig, ToolCall } from '../core/types.js';
import { ModelError } from '../core/types.js';
import {
  BaseModelAdapter,
  type CompletionRequest,
  type CompletionResponse,
  type StreamChunk,
  adapterRegistry,
} from './model-adapter.js';

// Anthropic SDK types (compatible with @anthropic-ai/sdk)
interface AnthropicClient {
  messages: {
    create(params: AnthropicMessageParams): Promise<AnthropicMessage>;
  };
}

interface AnthropicMessageParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string;
      content?: string;
    }>;
  }>;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  temperature?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

interface AnthropicMessage {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicAdapterOptions {
  /** Anthropic client instance */
  client?: AnthropicClient;
  /** API key (if not using client) */
  apiKey?: string;
  /** Base URL override */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
}

/**
 * Anthropic (Claude) model adapter
 */
export class AnthropicAdapter extends BaseModelAdapter {
  readonly provider = 'anthropic';
  readonly model: string;

  private client: AnthropicClient | null = null;
  private readonly options: AnthropicAdapterOptions;

  constructor(config: ModelConfig, options?: AnthropicAdapterOptions) {
    super(config);
    this.model = config.model;
    this.options = options ?? {};

    if (options?.client) {
      this.client = options.client;
    }
  }

  /**
   * Get or create the Anthropic client
   */
  private async getClient(): Promise<AnthropicClient> {
    if (this.client) {
      return this.client;
    }

    // Dynamic import to avoid requiring anthropic as a hard dependency
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');

      this.client = new Anthropic({
        apiKey: this.options.apiKey ?? this.config.apiKey ?? process.env['ANTHROPIC_API_KEY'],
        baseURL: this.options.baseUrl ?? this.config.baseUrl,
        timeout: this.options.timeout ?? this.config.timeout,
        maxRetries: this.options.maxRetries ?? 2,
      }) as unknown as AnthropicClient;

      return this.client;
    } catch {
      throw new ModelError(
        'Anthropic SDK not installed. Please install: npm install @anthropic-ai/sdk',
        false
      );
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = await this.getClient();

    // Extract system message
    let systemMessage: string | undefined;
    const nonSystemMessages: Message[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        nonSystemMessages.push(msg);
      }
    }

    // Convert messages to Anthropic format
    const anthropicMessages = this.convertMessages(nonSystemMessages);

    const params: AnthropicMessageParams = {
      model: this.model,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
      system: systemMessage,
      messages: anthropicMessages,
      temperature: request.temperature ?? this.config.temperature,
      stop_sequences: request.stopSequences ?? this.config.stopSequences,
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters as Record<string, unknown>,
      }));

      if (request.toolChoice) {
        if (request.toolChoice === 'auto') {
          params.tool_choice = { type: 'auto' };
        } else if (request.toolChoice === 'required') {
          params.tool_choice = { type: 'any' };
        } else if (request.toolChoice === 'none') {
          // Don't include tools at all
          delete params.tools;
        } else if (typeof request.toolChoice === 'object') {
          params.tool_choice = {
            type: 'tool',
            name: request.toolChoice.function.name,
          };
        }
      }
    }

    try {
      const message = await client.messages.create(params);

      // Extract text content and tool uses
      let textContent = '';
      const toolCalls: ToolCall[] = [];

      for (const block of message.content) {
        if (block.type === 'text' && block.text) {
          textContent += block.text;
        } else if (block.type === 'tool_use' && block.id && block.name) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: (block.input ?? {}) as Record<string, unknown>,
            timestamp: new Date(),
          });
        }
      }

      return {
        id: message.id,
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapStopReason(message.stop_reason),
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        },
        model: message.model,
      };
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit = message.includes('rate_limit') || message.includes('429');
      const isOverloaded = message.includes('overloaded');

      throw new ModelError(
        `Anthropic API error: ${message}`,
        isRateLimit || isOverloaded,
        { isRateLimit, isOverloaded }
      );
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const client = await this.getClient();

    // Extract system message
    let systemMessage: string | undefined;
    const nonSystemMessages: Message[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        nonSystemMessages.push(msg);
      }
    }

    const anthropicMessages = this.convertMessages(nonSystemMessages);

    const params: AnthropicMessageParams = {
      model: this.model,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
      system: systemMessage,
      messages: anthropicMessages,
      temperature: request.temperature ?? this.config.temperature,
      stop_sequences: request.stopSequences ?? this.config.stopSequences,
      stream: true,
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters as Record<string, unknown>,
      }));
    }

    try {
      // Note: Simplified streaming - in practice use SDK's streaming
      const message = await client.messages.create(params);

      let textContent = '';
      const toolCalls: ToolCall[] = [];

      for (const block of message.content) {
        if (block.type === 'text' && block.text) {
          textContent += block.text;
        } else if (block.type === 'tool_use' && block.id && block.name) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: (block.input ?? {}) as Record<string, unknown>,
            timestamp: new Date(),
          });
        }
      }

      yield {
        id: message.id,
        delta: {
          content: textContent || undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: this.mapStopReason(message.stop_reason),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ModelError(`Anthropic streaming error: ${errorMessage}`);
    }
  }

  private convertMessages(
    messages: Message[]
  ): AnthropicMessageParams['messages'] {
    const result: AnthropicMessageParams['messages'] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        if (msg.toolCallId) {
          // This is a tool result
          result.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: msg.toolCallId,
                content: msg.content,
              },
            ],
          });
        } else {
          result.push({
            role: 'user',
            content: msg.content,
          });
        }
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          // Assistant message with tool calls
          const content: Array<{
            type: 'text' | 'tool_use';
            text?: string;
            id?: string;
            name?: string;
            input?: Record<string, unknown>;
          }> = [];

          if (msg.content) {
            content.push({ type: 'text', text: msg.content });
          }

          for (const tc of msg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            });
          }

          result.push({ role: 'assistant', content });
        } else {
          result.push({
            role: 'assistant',
            content: msg.content,
          });
        }
      } else if (msg.role === 'tool') {
        // Tool result - find previous assistant message's tool call
        result.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId ?? msg.id,
              content: msg.content,
            },
          ],
        });
      }
    }

    return result;
  }

  private mapStopReason(reason: string | null): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create an Anthropic adapter
 */
export function createAnthropicAdapter(
  config: ModelConfig,
  options?: AnthropicAdapterOptions
): AnthropicAdapter {
  return new AnthropicAdapter(config, options);
}

// Register factory
adapterRegistry.registerFactory('anthropic', (config) => new AnthropicAdapter(config));
