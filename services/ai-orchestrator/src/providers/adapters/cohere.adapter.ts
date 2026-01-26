/**
 * Cohere Provider Adapter
 *
 * Adapter implementation for Cohere's API supporting:
 * - Command, Command R, Command R+ models
 * - RAG (Retrieval Augmented Generation)
 * - Embeddings
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
// Cohere Adapter Configuration
// ============================================================================

export interface CohereAdapterConfig extends BaseAdapterConfig {
  clientName?: string;
}

// ============================================================================
// Cohere Model Definitions
// ============================================================================

const COHERE_MODELS: AIModel[] = [
  {
    id: 'command-r-plus',
    providerId: 'cohere',
    name: 'command-r-plus',
    displayName: 'Command R+',
    contextWindow: 128000,
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
      inputPer1kTokens: 0.003,
      outputPer1kTokens: 0.015,
      currency: 'USD',
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['flagship', 'rag', 'multilingual'],
  },
  {
    id: 'command-r',
    providerId: 'cohere',
    name: 'command-r',
    displayName: 'Command R',
    contextWindow: 128000,
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
      inputPer1kTokens: 0.0005,
      outputPer1kTokens: 0.0015,
      currency: 'USD',
    },
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['balanced', 'rag', 'multilingual'],
  },
  {
    id: 'command',
    providerId: 'cohere',
    name: 'command',
    displayName: 'Command',
    contextWindow: 4096,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: false,
      streaming: true,
      jsonMode: false,
    },
    pricing: {
      inputPer1kTokens: 0.001,
      outputPer1kTokens: 0.002,
      currency: 'USD',
    },
    priority: 10,
    isEnabled: true,
    status: 'available',
    tags: ['legacy'],
  },
  {
    id: 'command-light',
    providerId: 'cohere',
    name: 'command-light',
    displayName: 'Command Light',
    contextWindow: 4096,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: false,
      streaming: true,
      jsonMode: false,
    },
    pricing: {
      inputPer1kTokens: 0.0003,
      outputPer1kTokens: 0.0006,
      currency: 'USD',
    },
    priority: 3,
    isEnabled: true,
    status: 'available',
    tags: ['fast', 'affordable'],
  },
  {
    id: 'embed-english-v3.0',
    providerId: 'cohere',
    name: 'embed-english-v3.0',
    displayName: 'Embed English v3.0',
    contextWindow: 512,
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
    tags: ['embedding', 'english'],
  },
  {
    id: 'embed-multilingual-v3.0',
    providerId: 'cohere',
    name: 'embed-multilingual-v3.0',
    displayName: 'Embed Multilingual v3.0',
    contextWindow: 512,
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
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['embedding', 'multilingual'],
  },
];

// ============================================================================
// Cohere API Types
// ============================================================================

interface CohereMessage {
  role: 'USER' | 'CHATBOT' | 'SYSTEM' | 'TOOL';
  message: string;
  tool_results?: Array<{
    call: {
      name: string;
      parameters: Record<string, unknown>;
    };
    outputs: Array<Record<string, unknown>>;
  }>;
}

interface CohereChatRequest {
  model: string;
  message: string;
  preamble?: string;
  chat_history?: CohereMessage[];
  temperature?: number;
  max_tokens?: number;
  p?: number;
  stream?: boolean;
  tools?: Array<{
    name: string;
    description: string;
    parameter_definitions: Record<string, unknown>;
  }>;
}

interface CohereChatResponse {
  response_id: string;
  text: string;
  generation_id: string;
  finish_reason: 'COMPLETE' | 'MAX_TOKENS' | 'ERROR' | 'ERROR_TOXIC';
  tool_calls?: Array<{
    name: string;
    parameters: Record<string, unknown>;
  }>;
  meta: {
    api_version: {
      version: string;
    };
    billed_units: {
      input_tokens: number;
      output_tokens: number;
    };
    tokens: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

interface CohereStreamEvent {
  is_finished: boolean;
  event_type: 'stream-start' | 'text-generation' | 'stream-end' | 'tool-calls-generation';
  text?: string;
  response?: CohereChatResponse;
  tool_calls?: Array<{
    name: string;
    parameters: Record<string, unknown>;
  }>;
}

interface CohereEmbedResponse {
  id: string;
  embeddings: number[][] | { float: number[][] };
  texts: string[];
  meta: {
    api_version: { version: string };
    billed_units: { input_tokens: number };
  };
}

// ============================================================================
// Cohere Adapter Implementation
// ============================================================================

export class CohereAdapter extends BaseProviderAdapter {
  private baseUrl: string;

  constructor(config: CohereAdapterConfig) {
    super('cohere', config);
    this.baseUrl = config.baseUrl ?? 'https://api.cohere.ai/v1';
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
    const model = request.model ?? this.config.defaultModel ?? 'command-r-plus';

    try {
      const cohereRequest = this.transformRequest(request);

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(cohereRequest),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = (await response.json()) as CohereChatResponse;
      const result = this.transformResponse(data, model);
      this.recordMetrics(startTime, result, request);
      return result;
    } catch (error) {
      const typedError = this.createTypedError(error);
      this.recordErrorMetrics(typedError, request);
      throw typedError;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = request.model ?? this.config.defaultModel ?? 'command-r-plus';

    try {
      const cohereRequest = this.transformRequest({ ...request, stream: true });

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(cohereRequest),
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
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as CohereStreamEvent;

            if (event.event_type === 'text-generation' && event.text) {
              yield {
                content: event.text,
                done: false,
              };
            } else if (event.event_type === 'stream-end') {
              const tokens = event.response?.meta?.tokens;
              yield {
                content: '',
                done: true,
                usage: tokens
                  ? {
                      promptTokens: tokens.input_tokens,
                      completionTokens: tokens.output_tokens,
                      totalTokens: tokens.input_tokens + tokens.output_tokens,
                    }
                  : undefined,
              };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    const model = request.model ?? 'embed-english-v3.0';
    const texts = Array.isArray(request.input) ? request.input : [request.input];

    try {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          texts,
          input_type: 'search_document',
          embedding_types: ['float'],
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = (await response.json()) as CohereEmbedResponse;

      // Handle both old and new API response formats
      let embeddings: number[][];
      if (Array.isArray(data.embeddings)) {
        embeddings = data.embeddings;
      } else if (data.embeddings.float) {
        embeddings = data.embeddings.float;
      } else {
        embeddings = [];
      }

      return {
        embeddings,
        model,
        provider: 'cohere',
        usage: {
          totalTokens: data.meta.billed_units.input_tokens,
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
    return COHERE_MODELS;
  }

  getProviderInfo(): AIProvider {
    return {
      id: 'cohere',
      name: 'Cohere',
      type: 'cohere',
      baseUrl: 'https://api.cohere.ai/v1',
      apiVersion: 'v1',
      models: COHERE_MODELS,
      capabilities: {
        chat: true,
        completion: true,
        embedding: true,
        imageGeneration: false,
        imageAnalysis: false,
        functionCalling: true,
        streaming: true,
        jsonMode: false,
        codeExecution: false,
      },
      rateLimits: {
        requestsPerMinute: 100,
        tokensPerMinute: 100000,
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      isEnabled: true,
      priority: 5,
    };
  }

  protected transformRequest(request: ChatRequest): CohereChatRequest {
    // Extract system message as preamble
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;

    // Build chat history from all but the last user message
    const chatHistory: CohereMessage[] = [];
    const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

    for (let i = 0; i < nonSystemMessages.length - 1; i++) {
      const msg = nonSystemMessages[i]!;
      if (msg.role === 'user') {
        chatHistory.push({ role: 'USER', message: msg.content });
      } else if (msg.role === 'assistant') {
        chatHistory.push({ role: 'CHATBOT', message: msg.content });
      } else if (msg.role === 'tool') {
        // Handle tool results
        chatHistory.push({
          role: 'TOOL',
          message: '',
          tool_results: [
            {
              call: {
                name: msg.name ?? 'tool',
                parameters: {},
              },
              outputs: [{ result: msg.content }],
            },
          ],
        });
      }
    }

    // Get the last message as the current message
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    const currentMessage = lastMessage?.content ?? '';

    const cohereRequest: CohereChatRequest = {
      model: request.model ?? this.config.defaultModel ?? 'command-r-plus',
      message: currentMessage,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      p: request.topP ?? 1,
      stream: request.stream ?? false,
    };

    if (systemMessage) {
      cohereRequest.preamble = systemMessage;
    }

    if (chatHistory.length > 0) {
      cohereRequest.chat_history = chatHistory;
    }

    if (request.tools && request.tools.length > 0) {
      cohereRequest.tools = request.tools as CohereChatRequest['tools'];
    }

    return cohereRequest;
  }

  protected transformResponse(response: CohereChatResponse, model: string): ChatResponse {
    const toolCalls = response.tool_calls?.map((tc, index) => ({
      id: `call_${index}`,
      name: tc.name,
      arguments: tc.parameters,
    }));

    let finishReason: ChatResponse['finishReason'] = 'stop';
    if (response.finish_reason === 'MAX_TOKENS') {
      finishReason = 'length';
    } else if (response.finish_reason === 'ERROR_TOXIC') {
      finishReason = 'content_filter';
    } else if (response.finish_reason === 'ERROR') {
      finishReason = 'error';
    } else if (toolCalls && toolCalls.length > 0) {
      finishReason = 'tool_calls';
    }

    return {
      content: response.text,
      model,
      provider: 'cohere',
      usage: {
        promptTokens: response.meta.tokens.input_tokens,
        completionTokens: response.meta.tokens.output_tokens,
        totalTokens: response.meta.tokens.input_tokens + response.meta.tokens.output_tokens,
      },
      finishReason,
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
      message = errorData.message ?? errorData.error ?? message;
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
      if (message.includes('context') || message.includes('token') || message.includes('length')) {
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
registerAdapterFactory('cohere', (config) => new CohereAdapter(config as CohereAdapterConfig));
