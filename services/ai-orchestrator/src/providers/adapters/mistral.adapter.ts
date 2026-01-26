/**
 * Mistral Provider Adapter
 *
 * Adapter implementation for Mistral AI API supporting:
 * - Mistral Large, Medium, Small models
 * - Function calling
 * - JSON mode
 * - Streaming responses
 */

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
  ServiceUnavailableError,
  TimeoutError,
  registerAdapterFactory,
} from './base.adapter.js';

// ============================================================================
// Mistral Adapter Configuration
// ============================================================================

export interface MistralAdapterConfig extends BaseAdapterConfig {
  endpoint?: string;
}

// ============================================================================
// Mistral Model Definitions
// ============================================================================

const MISTRAL_MODELS: AIModel[] = [
  {
    id: 'mistral-large-latest',
    providerId: 'mistral',
    name: 'mistral-large-latest',
    displayName: 'Mistral Large',
    contextWindow: 128000,
    maxOutputTokens: 8192,
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
      inputPer1kTokens: 0.002,
      outputPer1kTokens: 0.006,
      currency: 'USD',
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['flagship', 'powerful'],
  },
  {
    id: 'mistral-medium-latest',
    providerId: 'mistral',
    name: 'mistral-medium-latest',
    displayName: 'Mistral Medium',
    contextWindow: 32000,
    maxOutputTokens: 8192,
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
      inputPer1kTokens: 0.00275,
      outputPer1kTokens: 0.0081,
      currency: 'USD',
    },
    priority: 5,
    isEnabled: true,
    status: 'available',
    tags: ['balanced'],
  },
  {
    id: 'mistral-small-latest',
    providerId: 'mistral',
    name: 'mistral-small-latest',
    displayName: 'Mistral Small',
    contextWindow: 32000,
    maxOutputTokens: 8192,
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
      inputPer1kTokens: 0.001,
      outputPer1kTokens: 0.003,
      currency: 'USD',
    },
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['fast', 'affordable'],
  },
  {
    id: 'codestral-latest',
    providerId: 'mistral',
    name: 'codestral-latest',
    displayName: 'Codestral',
    contextWindow: 32000,
    maxOutputTokens: 8192,
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
      inputPer1kTokens: 0.001,
      outputPer1kTokens: 0.003,
      currency: 'USD',
    },
    priority: 3,
    isEnabled: true,
    status: 'available',
    tags: ['code', 'specialized'],
  },
  {
    id: 'mistral-embed',
    providerId: 'mistral',
    name: 'mistral-embed',
    displayName: 'Mistral Embed',
    contextWindow: 8192,
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
      inputPer1kTokens: 0.0001,
      outputPer1kTokens: 0,
      currency: 'USD',
      embeddingPer1kTokens: 0.0001,
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['embedding'],
  },
];

// ============================================================================
// Mistral API Types
// ============================================================================

interface MistralMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

interface MistralChatRequest {
  model: string;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  safe_prompt?: boolean;
  random_seed?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: { type: 'text' | 'json_object' };
}

interface MistralChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'error';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MistralStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MistralEmbeddingResponse {
  id: string;
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Mistral Adapter Implementation
// ============================================================================

export class MistralAdapter extends BaseProviderAdapter {
  private baseUrl: string;

  constructor(config: MistralAdapterConfig) {
    super('mistral', config);
    this.baseUrl = config.baseUrl ?? 'https://api.mistral.ai/v1';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return {
        healthy: response.ok,
        latencyMs: Date.now() - startTime,
        status: response.ok ? 'available' : 'unavailable',
        error: response.ok ? undefined : `HTTP ${response.status}`,
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
    const model = request.model ?? this.config.defaultModel ?? 'mistral-large-latest';

    try {
      const mistralRequest = this.transformRequest(request);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(mistralRequest),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = (await response.json()) as MistralChatResponse;
      const result = this.transformResponse(data);
      this.recordMetrics(startTime, result, request);
      return result;
    } catch (error) {
      const typedError = this.createTypedError(error);
      this.recordErrorMetrics(typedError, request);
      throw typedError;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = request.model ?? this.config.defaultModel ?? 'mistral-large-latest';

    try {
      const mistralRequest = this.transformRequest({ ...request, stream: true });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(mistralRequest),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const chunk = JSON.parse(data) as MistralStreamChunk;
              const content = chunk.choices[0]?.delta?.content ?? '';
              const finishReason = chunk.choices[0]?.finish_reason;

              yield {
                content,
                done: finishReason !== undefined && finishReason !== null,
                usage: chunk.usage
                  ? {
                      promptTokens: chunk.usage.prompt_tokens,
                      completionTokens: chunk.usage.completion_tokens,
                      totalTokens: chunk.usage.total_tokens,
                    }
                  : undefined,
              };
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    const model = request.model ?? 'mistral-embed';
    const input = Array.isArray(request.input) ? request.input : [request.input];

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input,
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = (await response.json()) as MistralEmbeddingResponse;

      return {
        embeddings: data.data.map((d) => d.embedding),
        model: data.model,
        provider: 'mistral',
        usage: {
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async countTokens(text: string, _model?: string): Promise<number> {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  getSupportedModels(): AIModel[] {
    return MISTRAL_MODELS;
  }

  getProviderInfo(): AIProvider {
    return {
      id: 'mistral',
      name: 'Mistral AI',
      type: 'mistral',
      baseUrl: 'https://api.mistral.ai/v1',
      apiVersion: 'v1',
      models: MISTRAL_MODELS,
      capabilities: {
        chat: true,
        completion: true,
        embedding: true,
        imageGeneration: false,
        imageAnalysis: false,
        functionCalling: true,
        streaming: true,
        jsonMode: true,
        codeExecution: false,
      },
      rateLimits: {
        requestsPerMinute: 120,
        tokensPerMinute: 500000,
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      isEnabled: true,
      priority: 4,
    };
  }

  protected transformRequest(request: ChatRequest): MistralChatRequest {
    const messages: MistralMessage[] = request.messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId,
        };
      }

      if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: m.content,
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
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
      };
    });

    const mistralRequest: MistralChatRequest = {
      model: request.model ?? this.config.defaultModel ?? 'mistral-large-latest',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      top_p: request.topP ?? 1,
      stream: request.stream ?? false,
      safe_prompt: true,
    };

    if (request.tools && request.tools.length > 0) {
      mistralRequest.tools = request.tools;
    }

    if (request.toolChoice) {
      mistralRequest.tool_choice = request.toolChoice;
    }

    if (request.responseFormat?.type === 'json_object') {
      mistralRequest.response_format = { type: 'json_object' };
    }

    return mistralRequest;
  }

  protected transformResponse(response: MistralChatResponse): ChatResponse {
    const message = response.choices[0]?.message;
    const toolCalls = message?.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content: message?.content ?? '',
      model: response.model,
      provider: 'mistral',
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: response.choices[0]?.finish_reason ?? 'error',
      toolCalls,
      rawResponse: response,
    };
  }

  protected handleError(error: unknown): never {
    throw this.createTypedError(error);
  }

  private async handleHttpError(response: Response): Promise<never> {
    const body = await response.text();
    let message = `HTTP ${response.status}`;

    try {
      const errorData = JSON.parse(body);
      message = errorData.message ?? errorData.error?.message ?? message;
    } catch {
      message = body || message;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new RateLimitError(message, retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined);
    }

    if (response.status === 401) {
      throw new AuthenticationError(message);
    }

    if (response.status === 400) {
      if (message.includes('context') || message.includes('token')) {
        throw new ContextLengthError(message);
      }
    }

    if (response.status >= 500) {
      throw new ServiceUnavailableError(message);
    }

    throw new Error(message);
  }

  private createTypedError(error: unknown): Error {
    if (error instanceof RateLimitError ||
        error instanceof AuthenticationError ||
        error instanceof ContextLengthError ||
        error instanceof ServiceUnavailableError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new TimeoutError(error.message, this.config.timeout ?? 60000);
      }
      return error;
    }

    return new Error(String(error));
  }
}

// Register the adapter factory
registerAdapterFactory('mistral', (config) => new MistralAdapter(config as MistralAdapterConfig));
