/**
 * OpenAI model adapter implementation
 */

import type { Message, ModelConfig, ToolCall } from '../core/types.js';
import { ModelError } from '../core/types.js';
import {
  BaseModelAdapter,
  type CompletionRequest,
  type CompletionResponse,
  type StreamChunk,
  formatMessages,
  adapterRegistry,
} from './model-adapter.js';

// OpenAI SDK types (compatible with openai package)
interface OpenAIClient {
  chat: {
    completions: {
      create(params: OpenAIChatParams): Promise<OpenAIChatCompletion>;
    };
  };
}

interface OpenAIChatParams {
  model: string;
  messages: Array<{
    role: string;
    content: string;
    name?: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
  }>;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  tool_choice?: string | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  response_format?: { type: string };
  stream?: boolean;
}

interface OpenAIChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIAdapterOptions {
  /** OpenAI client instance */
  client?: OpenAIClient;
  /** API key (if not using client) */
  apiKey?: string;
  /** Base URL override */
  baseUrl?: string;
  /** Organization ID */
  organization?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
}

/**
 * OpenAI model adapter
 */
export class OpenAIAdapter extends BaseModelAdapter {
  readonly provider = 'openai';
  readonly model: string;

  private client: OpenAIClient | null = null;
  private readonly options: OpenAIAdapterOptions;

  constructor(config: ModelConfig, options?: OpenAIAdapterOptions) {
    super(config);
    this.model = config.model;
    this.options = options ?? {};

    if (options?.client) {
      this.client = options.client;
    }
  }

  /**
   * Get or create the OpenAI client
   */
  private async getClient(): Promise<OpenAIClient> {
    if (this.client) {
      return this.client;
    }

    // Dynamic import to avoid requiring openai as a hard dependency
    try {
      const { default: OpenAI } = await import('openai');

      this.client = new OpenAI({
        apiKey: this.options.apiKey ?? this.config.apiKey ?? process.env['OPENAI_API_KEY'],
        baseURL: this.options.baseUrl ?? this.config.baseUrl,
        timeout: this.options.timeout ?? this.config.timeout,
        maxRetries: this.options.maxRetries ?? 2,
      }) as unknown as OpenAIClient;

      return this.client;
    } catch {
      throw new ModelError(
        'OpenAI SDK not installed. Please install: npm install openai',
        false
      );
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = await this.getClient();

    const params: OpenAIChatParams = {
      model: this.model,
      messages: formatMessages(request.messages),
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      stop: request.stopSequences ?? this.config.stopSequences,
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as Record<string, unknown>,
        },
      }));

      if (request.toolChoice) {
        params.tool_choice = request.toolChoice === 'required'
          ? 'required'
          : request.toolChoice;
      }
    }

    // Add response format
    if (request.responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    try {
      const completion = await client.chat.completions.create(params);
      const choice = completion.choices[0];

      if (!choice) {
        throw new ModelError('No completion choice returned');
      }

      // Parse tool calls
      const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
        timestamp: new Date(),
      }));

      return {
        id: completion.id,
        content: choice.message.content ?? '',
        toolCalls,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        },
        model: completion.model,
      };
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit = message.includes('rate_limit') || message.includes('429');
      const isQuota = message.includes('quota') || message.includes('insufficient');

      throw new ModelError(
        `OpenAI API error: ${message}`,
        !isQuota, // Rate limits are recoverable, quota issues are not
        { isRateLimit, isQuota }
      );
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const client = await this.getClient();

    const params: OpenAIChatParams = {
      model: this.model,
      messages: formatMessages(request.messages),
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      stop: request.stopSequences ?? this.config.stopSequences,
      stream: true,
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as Record<string, unknown>,
        },
      }));
    }

    try {
      // Note: This is a simplified streaming implementation
      // In practice, you'd use the streaming response from the SDK
      const completion = await client.chat.completions.create(params);
      const choice = completion.choices[0];

      if (choice) {
        yield {
          id: completion.id,
          delta: {
            content: choice.message.content ?? undefined,
            toolCalls: choice.message.tool_calls?.map(tc => ({
              id: tc.id,
              name: tc.function.name,
              arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
              timestamp: new Date(),
            })),
          },
          finishReason: this.mapFinishReason(choice.finish_reason),
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ModelError(`OpenAI streaming error: ${message}`);
    }
  }

  private mapFinishReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      // Simple models list check
      await client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create an OpenAI adapter
 */
export function createOpenAIAdapter(
  config: ModelConfig,
  options?: OpenAIAdapterOptions
): OpenAIAdapter {
  return new OpenAIAdapter(config, options);
}

// Register factory
adapterRegistry.registerFactory('openai', (config) => new OpenAIAdapter(config));
