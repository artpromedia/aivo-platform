/**
 * Anthropic Provider Adapter
 *
 * Adapter implementation for Anthropic's Claude API supporting:
 * - Claude 3.5 Sonnet, Claude 3 Opus, Haiku models
 * - Tool use / function calling
 * - Vision capabilities
 * - Long context handling (200K tokens)
 * - Streaming responses
 */

import Anthropic from '@anthropic-ai/sdk';

import type { AIModel, AIProvider, ModelStatus } from '../registry.js';

import {
  BaseProviderAdapter,
  type BaseAdapterConfig,
  type ChatRequest,
  type ChatResponse,
  type ChatChunk,
  type EmbedRequest,
  type EmbedResponse,
  RateLimitError,
  AuthenticationError,
  ContextLengthError,
  ContentFilterError,
  ServiceUnavailableError,
  TimeoutError,
  ProviderRequestError,
  registerAdapterFactory,
} from './base.adapter.js';

// ============================================================================
// Anthropic Adapter Configuration
// ============================================================================

export interface AnthropicAdapterConfig extends BaseAdapterConfig {
  anthropicVersion?: string;
}

// ============================================================================
// Anthropic Model Definitions
// ============================================================================

const ANTHROPIC_MODELS: AIModel[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    providerId: 'anthropic',
    name: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.003,
      outputPer1kTokens: 0.015,
      currency: 'USD',
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['flagship', 'fast', 'vision'],
  },
  {
    id: 'claude-3-opus-20240229',
    providerId: 'anthropic',
    name: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.015,
      outputPer1kTokens: 0.075,
      currency: 'USD',
    },
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['powerful', 'complex-reasoning', 'vision'],
  },
  {
    id: 'claude-3-sonnet-20240229',
    providerId: 'anthropic',
    name: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.003,
      outputPer1kTokens: 0.015,
      currency: 'USD',
    },
    priority: 5,
    isEnabled: true,
    status: 'available',
    tags: ['balanced', 'vision'],
  },
  {
    id: 'claude-3-haiku-20240307',
    providerId: 'anthropic',
    name: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.00025,
      outputPer1kTokens: 0.00125,
      currency: 'USD',
    },
    priority: 3,
    isEnabled: true,
    status: 'available',
    tags: ['fast', 'affordable', 'vision'],
  },
];

// ============================================================================
// Anthropic Adapter Implementation
// ============================================================================

export class AnthropicAdapter extends BaseProviderAdapter {
  private client: Anthropic;

  constructor(config: AnthropicAdapterConfig) {
    super('anthropic', config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 60000,
      maxRetries: 0, // We handle retries ourselves
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check with minimal tokens
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    latencyMs: number;
    status: ModelStatus;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        status: 'available',
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        status: 'unavailable',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const model = request.model ?? this.config.defaultModel ?? 'claude-3-5-sonnet-20241022';

    try {
      const anthropicRequest = this.transformRequest(request);
      const response = await this.client.messages.create({
        ...anthropicRequest,
        stream: false,
      });

      if (!('content' in response)) {
        throw new Error('Unexpected streaming response for non-streaming request.');
      }

      const result = this.transformResponse(response);
      this.recordMetrics(startTime, result, request);
      return result;
    } catch (error) {
      const typedError = this.createTypedError(error);
      this.recordErrorMetrics(typedError, request);
      throw typedError;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = request.model ?? this.config.defaultModel ?? 'claude-3-5-sonnet-20241022';

    try {
      const anthropicRequest = this.transformRequest(request);
      const stream = this.client.messages.stream(anthropicRequest);

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const event of stream) {
        if (event.type === 'message_start') {
          inputTokens = event.message.usage?.input_tokens ?? 0;
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            yield {
              content: delta.text,
              done: false,
            };
          }
        } else if (event.type === 'message_delta') {
          outputTokens = event.usage?.output_tokens ?? 0;
        } else if (event.type === 'message_stop') {
          yield {
            content: '',
            done: true,
            usage: {
              promptTokens: inputTokens,
              completionTokens: outputTokens,
              totalTokens: inputTokens + outputTokens,
            },
          };
        }
      }
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async embed(_request: EmbedRequest): Promise<EmbedResponse> {
    // Anthropic doesn't provide embedding models
    throw new ProviderRequestError(
      'Anthropic does not support embeddings',
      'UNSUPPORTED_OPERATION',
      400,
      false
    );
  }

  async countTokens(text: string, _model?: string): Promise<number> {
    // Anthropic's tokenizer is similar to Claude's
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  getSupportedModels(): AIModel[] {
    return ANTHROPIC_MODELS;
  }

  getProviderInfo(): AIProvider {
    return {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiVersion: '2023-06-01',
      models: ANTHROPIC_MODELS,
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        imageGeneration: false,
        imageAnalysis: true,
        functionCalling: true,
        streaming: true,
        jsonMode: true,
        codeExecution: false,
      },
      rateLimits: {
        requestsPerMinute: 300,
        tokensPerMinute: 100000,
        requestsPerDay: 10000,
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      isEnabled: true,
      priority: 2,
    };
  }

  protected transformRequest(request: ChatRequest): Anthropic.MessageCreateParams {
    // Extract system message (Anthropic handles it separately)
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;

    // Convert messages, filtering out system messages
    const conversationMessages: Anthropic.MessageParam[] = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: m.toolCallId ?? '',
                content: m.content,
              },
            ],
          };
        }

        if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
          const content: Anthropic.ContentBlock[] = [];
          if (m.content) {
            content.push({ type: 'text', text: m.content });
          }
          for (const tc of m.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            });
          }
          return {
            role: 'assistant' as const,
            content,
          };
        }

        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        };
      });

    const params: Anthropic.MessageCreateParams = {
      model: request.model ?? this.config.defaultModel ?? 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens ?? 1000,
      messages: conversationMessages,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP ?? 1,
    };

    if (systemMessage) {
      params.system = systemMessage;
    }

    if (request.stop) {
      params.stop_sequences = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools as Anthropic.Tool[];
    }

    if (request.toolChoice) {
      if (request.toolChoice === 'auto') {
        params.tool_choice = { type: 'auto' };
      } else if (request.toolChoice === 'required') {
        params.tool_choice = { type: 'any' };
      } else if (
        typeof request.toolChoice === 'object' &&
        'function' in (request.toolChoice as Record<string, unknown>)
      ) {
        const tc = request.toolChoice as { function: { name: string } };
        params.tool_choice = { type: 'tool', name: tc.function.name };
      }
    }

    if (request.metadata?.userId) {
      params.metadata = {
        user_id: request.metadata.userId,
      };
    }

    return params;
  }

  protected transformResponse(response: Anthropic.Message): ChatResponse {
    // Extract text content
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const content = textBlocks.map((block) => block.text).join('');

    // Extract tool calls
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );
    const toolCalls =
      toolUseBlocks.length > 0
        ? toolUseBlocks.map((block) => ({
            id: block.id,
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          }))
        : undefined;

    return {
      content,
      model: response.model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: this.mapFinishReason(response.stop_reason),
      toolCalls,
      rawResponse: response,
    };
  }

  protected handleError(error: unknown): never {
    throw this.createTypedError(error);
  }

  private createTypedError(error: unknown): Error {
    // Handle Anthropic SDK errors
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as {
        status: number;
        message: string;
        headers?: Record<string, string>;
      };

      if (apiError.status === 429) {
        const retryAfter = apiError.headers?.['retry-after'];
        return new RateLimitError(
          apiError.message,
          retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined
        );
      }

      if (apiError.status === 401) {
        return new AuthenticationError(apiError.message);
      }

      if (apiError.status === 400) {
        if (apiError.message.includes('context') || apiError.message.includes('token')) {
          return new ContextLengthError(apiError.message);
        }
      }

      if (apiError.status >= 500) {
        return new ServiceUnavailableError(apiError.message);
      }
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('timeout')) {
        return new TimeoutError(error.message, this.config.timeout ?? 60000);
      }

      if (message.includes('rate limit') || message.includes('429')) {
        return new RateLimitError(error.message);
      }

      if (message.includes('authentication') || message.includes('401')) {
        return new AuthenticationError(error.message);
      }

      return error;
    }

    return new Error(String(error));
  }

  private mapFinishReason(reason?: string | null): ChatResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'error';
    }
  }
}

// Register the adapter factory
registerAdapterFactory(
  'anthropic',
  (config) => new AnthropicAdapter(config as AnthropicAdapterConfig)
);
