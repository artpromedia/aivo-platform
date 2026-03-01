/**
 * OpenAI Provider Adapter
 *
 * Adapter implementation for OpenAI's API supporting:
 * - GPT-5.2-instant, GPT-5.2-pro, GPT-5.3-codex (2026 generation)
 * - Legacy: GPT-4o, GPT-4-Turbo, GPT-3.5-Turbo (disabled)
 * - Function calling / tool use
 * - JSON mode
 * - Vision capabilities
 * - Streaming responses
 */

import OpenAI from 'openai';

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
  registerAdapterFactory,
} from './base.adapter.js';

// ============================================================================
// OpenAI Adapter Configuration
// ============================================================================

export interface OpenAIAdapterConfig extends BaseAdapterConfig {
  organizationId?: string;
}

// ============================================================================
// OpenAI Model Definitions
// ============================================================================

const OPENAI_MODELS: AIModel[] = [
  // ── 2026 Generation (active) ──────────────────────────────────────────
  {
    id: 'gpt-5.2-instant',
    providerId: 'openai',
    name: 'gpt-5.2-instant',
    displayName: 'GPT-5.2 Instant',
    contextWindow: 400000,
    maxOutputTokens: 32768,
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
      inputPer1kTokens: 0.0003,
      outputPer1kTokens: 0.001,
      currency: 'USD',
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['fast', 'affordable', 'multimodal'],
  },
  {
    id: 'gpt-5.2-pro',
    providerId: 'openai',
    name: 'gpt-5.2-pro',
    displayName: 'GPT-5.2 Pro',
    contextWindow: 400000,
    maxOutputTokens: 32768,
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
      inputPer1kTokens: 0.005,
      outputPer1kTokens: 0.015,
      currency: 'USD',
    },
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['multimodal', 'flagship'],
  },
  {
    id: 'gpt-5.3-codex',
    providerId: 'openai',
    name: 'gpt-5.3-codex',
    displayName: 'GPT-5.3 Codex',
    contextWindow: 400000,
    maxOutputTokens: 65536,
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
      inputPer1kTokens: 0.006,
      outputPer1kTokens: 0.018,
      currency: 'USD',
    },
    priority: 3,
    isEnabled: true,
    status: 'available',
    tags: ['code', 'complex-reasoning', 'multimodal'],
  },
  {
    id: 'gpt-5.2-thinking',
    providerId: 'openai',
    name: 'gpt-5.2-thinking',
    displayName: 'GPT-5.2 Thinking',
    contextWindow: 400000,
    maxOutputTokens: 65536,
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
      inputPer1kTokens: 0.01,
      outputPer1kTokens: 0.03,
      currency: 'USD',
    },
    priority: 4,
    isEnabled: true,
    status: 'available',
    tags: ['reasoning', 'chain-of-thought', 'multimodal'],
  },
  // ── Legacy Models (disabled) ──────────────────────────────────────────
  {
    id: 'gpt-4o',
    providerId: 'openai',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 16384,
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
      inputPer1kTokens: 0.0025,
      outputPer1kTokens: 0.01,
      currency: 'USD',
    },
    priority: 10,
    isEnabled: false,
    status: 'deprecated',
    tags: ['legacy', 'multimodal'],
  },
  {
    id: 'gpt-4o-mini',
    providerId: 'openai',
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutputTokens: 16384,
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
      inputPer1kTokens: 0.00015,
      outputPer1kTokens: 0.0006,
      currency: 'USD',
    },
    priority: 11,
    isEnabled: false,
    status: 'deprecated',
    tags: ['legacy', 'fast', 'affordable'],
  },
  {
    id: 'gpt-4-turbo',
    providerId: 'openai',
    name: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    contextWindow: 128000,
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
      inputPer1kTokens: 0.01,
      outputPer1kTokens: 0.03,
      currency: 'USD',
    },
    priority: 12,
    isEnabled: false,
    status: 'deprecated',
    tags: ['legacy', 'vision', 'large-context'],
  },
  {
    id: 'gpt-4',
    providerId: 'openai',
    name: 'gpt-4',
    displayName: 'GPT-4',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: true,
      streaming: true,
      jsonMode: false,
    },
    pricing: {
      inputPer1kTokens: 0.03,
      outputPer1kTokens: 0.06,
      currency: 'USD',
    },
    priority: 13,
    isEnabled: false,
    status: 'deprecated',
    tags: ['legacy', 'stable'],
  },
  {
    id: 'gpt-3.5-turbo',
    providerId: 'openai',
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.0005,
      outputPer1kTokens: 0.0015,
      currency: 'USD',
    },
    priority: 20,
    isEnabled: false,
    status: 'deprecated',
    tags: ['legacy', 'fast', 'affordable'],
  },
  {
    id: 'text-embedding-3-small',
    providerId: 'openai',
    name: 'text-embedding-3-small',
    displayName: 'Text Embedding 3 Small',
    contextWindow: 8191,
    maxOutputTokens: 0,
    capabilities: {
      chat: false,
      completion: false,
      embedding: true,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: false,
      streaming: false,
      jsonMode: false,
    },
    pricing: {
      inputPer1kTokens: 0.00002,
      outputPer1kTokens: 0,
      currency: 'USD',
      embeddingPer1kTokens: 0.00002,
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['embedding'],
  },
  {
    id: 'text-embedding-3-large',
    providerId: 'openai',
    name: 'text-embedding-3-large',
    displayName: 'Text Embedding 3 Large',
    contextWindow: 8191,
    maxOutputTokens: 0,
    capabilities: {
      chat: false,
      completion: false,
      embedding: true,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: false,
      streaming: false,
      jsonMode: false,
    },
    pricing: {
      inputPer1kTokens: 0.00013,
      outputPer1kTokens: 0,
      currency: 'USD',
      embeddingPer1kTokens: 0.00013,
    },
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['embedding', 'high-quality'],
  },
];

// ============================================================================
// OpenAI Adapter Implementation
// ============================================================================

export class OpenAIAdapter extends BaseProviderAdapter {
  private client: OpenAI;

  constructor(config: OpenAIAdapterConfig) {
    super('openai', config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 60000,
      maxRetries: 0, // We handle retries ourselves
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.models.list();
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
      await this.client.models.list();
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
    const model = request.model ?? this.config.defaultModel ?? 'gpt-5.2-pro';

    try {
      const openaiRequest = this.transformRequest(request);
      const response = await this.client.chat.completions.create(
        openaiRequest as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
      );

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
    const model = request.model ?? this.config.defaultModel ?? 'gpt-5.2-pro';

    try {
      const openaiRequest = this.transformRequest({ ...request, stream: true });
      const stream = await this.client.chat.completions.create(
        openaiRequest as OpenAI.Chat.ChatCompletionCreateParamsStreaming
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? '';
        const finishReason = chunk.choices[0]?.finish_reason;
        const toolCalls = chunk.choices[0]?.delta?.tool_calls?.map((tc) => ({
          id: tc.id ?? '',
          name: tc.function?.name ?? '',
          arguments: tc.function?.arguments
            ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
            : {},
        }));

        yield {
          content,
          done: finishReason !== null && finishReason !== undefined,
          usage: chunk.usage
            ? {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
                totalTokens: chunk.usage.total_tokens,
              }
            : undefined,
          toolCalls,
        };
      }
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    const model = request.model ?? 'text-embedding-3-small';
    const input = Array.isArray(request.input) ? request.input : [request.input];

    try {
      const response = await this.client.embeddings.create({
        model,
        input,
        dimensions: request.dimensions,
      });

      return {
        embeddings: response.data.map((d) => d.embedding),
        model: response.model,
        provider: 'openai',
        usage: {
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    try {
      const { encoding_for_model } = await import('tiktoken');
      const enc = encoding_for_model(
        (model ?? 'gpt-4') as Parameters<typeof encoding_for_model>[0]
      );
      const tokens = enc.encode(text);
      enc.free();
      return tokens.length;
    } catch {
      // Fallback: rough estimate of ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  }

  getSupportedModels(): AIModel[] {
    return OPENAI_MODELS;
  }

  getProviderInfo(): AIProvider {
    return {
      id: 'openai',
      name: 'OpenAI',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiVersion: 'v1',
      models: OPENAI_MODELS,
      capabilities: {
        chat: true,
        completion: true,
        embedding: true,
        imageGeneration: true,
        imageAnalysis: true,
        functionCalling: true,
        streaming: true,
        jsonMode: true,
        codeExecution: false,
      },
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000,
        requestsPerDay: 10000,
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      isEnabled: true,
      priority: 1,
    };
  }

  protected transformRequest(request: ChatRequest): OpenAI.Chat.ChatCompletionCreateParams {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.toolCallId ?? '',
        };
      }

      if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }

      return {
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
        ...(m.name && m.role === 'user' ? { name: m.name } : {}),
      };
    });

    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: request.model ?? this.config.defaultModel ?? 'gpt-5.2-pro',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      top_p: request.topP ?? 1,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0,
      stream: request.stream ?? false,
      user: request.metadata?.userId,
    };

    if (request.stop) {
      params.stop = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools as OpenAI.Chat.ChatCompletionTool[];
    }

    if (request.toolChoice) {
      params.tool_choice = request.toolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption;
    }

    if (request.responseFormat?.type === 'json_object') {
      params.response_format = { type: 'json_object' };
    }

    return params;
  }

  protected transformResponse(response: OpenAI.Chat.ChatCompletion): ChatResponse {
    const message = response.choices[0]?.message;
    const toolCalls = message?.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content: message?.content ?? '',
      model: response.model,
      provider: 'openai',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: this.mapFinishReason(response.choices[0]?.finish_reason),
      toolCalls,
      rawResponse: response,
    };
  }

  protected handleError(error: unknown): never {
    throw this.createTypedError(error);
  }

  private createTypedError(error: unknown): Error {
    // Handle OpenAI SDK errors by checking for status property
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
        if (
          apiError.message.includes('context_length') ||
          apiError.message.includes('maximum context')
        ) {
          return new ContextLengthError(apiError.message);
        }
        if (apiError.message.includes('content_filter')) {
          return new ContentFilterError(apiError.message);
        }
      }

      if (apiError.status >= 500) {
        return new ServiceUnavailableError(apiError.message);
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }

  private mapFinishReason(reason?: string | null): ChatResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'tool_calls':
        return 'tool_calls';
      default:
        return 'error';
    }
  }
}

// Register the adapter factory
registerAdapterFactory('openai', (config) => new OpenAIAdapter(config as OpenAIAdapterConfig));
