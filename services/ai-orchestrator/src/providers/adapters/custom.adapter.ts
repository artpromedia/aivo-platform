/**
 * Custom Provider Adapter
 *
 * Adapter implementation for custom/self-hosted models that follow
 * OpenAI-compatible APIs (like vLLM, LocalAI, Ollama, etc.)
 *
 * Supports:
 * - OpenAI-compatible chat completions API
 * - Streaming responses
 * - Custom authentication headers
 * - Configurable endpoints
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
  ProviderRequestError,
  registerAdapterFactory,
} from './base.adapter.js';

// ============================================================================
// Custom Adapter Configuration
// ============================================================================

export interface CustomAdapterConfig extends BaseAdapterConfig {
  /** Custom provider ID */
  providerId: string;
  /** Custom provider display name */
  providerName: string;
  /** Base URL for the API (required) */
  baseUrl: string;
  /** Custom headers to include in requests */
  customHeaders?: Record<string, string>;
  /** Authentication type */
  authType?: 'bearer' | 'api-key' | 'none' | 'custom';
  /** API key header name (for api-key auth type) */
  apiKeyHeader?: string;
  /** List of available models */
  models?: CustomModelConfig[];
  /** Health check endpoint path */
  healthCheckPath?: string;
  /** Chat completions endpoint path */
  chatCompletionsPath?: string;
  /** Embeddings endpoint path */
  embeddingsPath?: string;
}

export interface CustomModelConfig {
  id: string;
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming?: boolean;
  supportsFunctionCalling?: boolean;
  supportsJsonMode?: boolean;
  supportsVision?: boolean;
  pricing?: {
    inputPer1kTokens: number;
    outputPer1kTokens: number;
  };
}

// ============================================================================
// OpenAI-Compatible API Types
// ============================================================================

interface OpenAICompatibleMessage {
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

interface OpenAICompatibleRequest {
  model: string;
  messages: OpenAICompatibleMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: { type: 'text' | 'json_object' };
}

interface OpenAICompatibleResponse {
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
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAICompatibleStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAICompatibleEmbeddingResponse {
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
// Custom Adapter Implementation
// ============================================================================

export class CustomAdapter extends BaseProviderAdapter {
  private readonly customConfig: CustomAdapterConfig;
  private cachedModels: AIModel[] | null = null;

  constructor(config: CustomAdapterConfig) {
    super(config.providerId, config);
    this.customConfig = config;

    if (!config.baseUrl) {
      throw new Error('baseUrl is required for custom adapter');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const healthPath = this.customConfig.healthCheckPath ?? '/health';
      const response = await fetch(`${this.customConfig.baseUrl}${healthPath}`, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      // Try models endpoint as fallback
      try {
        const response = await fetch(`${this.customConfig.baseUrl}/v1/models`, {
          headers: this.getHeaders(),
        });
        return response.ok;
      } catch {
        return false;
      }
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
      const healthy = await this.isHealthy();
      return {
        healthy,
        latencyMs: Date.now() - startTime,
        status: healthy ? 'available' : 'unavailable',
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
    const model = request.model ?? this.config.defaultModel ?? this.getDefaultModel();

    try {
      const openaiRequest = this.transformRequest(request);
      const chatPath = this.customConfig.chatCompletionsPath ?? '/v1/chat/completions';

      const response = await fetch(`${this.customConfig.baseUrl}${chatPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(openaiRequest),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = (await response.json()) as OpenAICompatibleResponse;
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
    const model = request.model ?? this.config.defaultModel ?? this.getDefaultModel();

    try {
      const openaiRequest = this.transformRequest({ ...request, stream: true });
      const chatPath = this.customConfig.chatCompletionsPath ?? '/v1/chat/completions';

      const response = await fetch(`${this.customConfig.baseUrl}${chatPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(openaiRequest),
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
              const chunk = JSON.parse(data) as OpenAICompatibleStreamChunk;
              const content = chunk.choices[0]?.delta?.content ?? '';
              const finishReason = chunk.choices[0]?.finish_reason;

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
    const model = request.model ?? 'text-embedding';
    const input = Array.isArray(request.input) ? request.input : [request.input];
    const embeddingsPath = this.customConfig.embeddingsPath ?? '/v1/embeddings';

    try {
      const response = await fetch(`${this.customConfig.baseUrl}${embeddingsPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
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

      const data = (await response.json()) as OpenAICompatibleEmbeddingResponse;

      return {
        embeddings: data.data.map((d) => d.embedding),
        model: data.model,
        provider: this.customConfig.providerId,
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
    if (this.cachedModels) {
      return this.cachedModels;
    }

    if (this.customConfig.models) {
      this.cachedModels = this.customConfig.models.map((m, index) => ({
        id: m.id,
        providerId: this.customConfig.providerId,
        name: m.name,
        displayName: m.displayName,
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        capabilities: {
          chat: true,
          completion: true,
          embedding: false,
          imageGeneration: false,
          imageAnalysis: m.supportsVision ?? false,
          functionCalling: m.supportsFunctionCalling ?? false,
          streaming: m.supportsStreaming ?? true,
          jsonMode: m.supportsJsonMode ?? false,
        },
        pricing: {
          inputPer1kTokens: m.pricing?.inputPer1kTokens ?? 0,
          outputPer1kTokens: m.pricing?.outputPer1kTokens ?? 0,
          currency: 'USD' as const,
        },
        priority: index + 1,
        isEnabled: true,
        status: 'available' as ModelStatus,
        tags: ['custom'],
      }));
    } else {
      // Return a default model if none configured
      this.cachedModels = [
        {
          id: 'default',
          providerId: this.customConfig.providerId,
          name: 'default',
          displayName: 'Default Model',
          contextWindow: 4096,
          maxOutputTokens: 2048,
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
            inputPer1kTokens: 0,
            outputPer1kTokens: 0,
            currency: 'USD',
          },
          priority: 1,
          isEnabled: true,
          status: 'available',
          tags: ['custom'],
        },
      ];
    }

    return this.cachedModels;
  }

  getProviderInfo(): AIProvider {
    return {
      id: this.customConfig.providerId,
      name: this.customConfig.providerName,
      type: 'custom',
      baseUrl: this.customConfig.baseUrl,
      models: this.getSupportedModels(),
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
        requestsPerMinute: 1000,
        tokensPerMinute: 1000000,
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      isEnabled: true,
      priority: 100,
    };
  }

  protected transformRequest(request: ChatRequest): OpenAICompatibleRequest {
    const messages: OpenAICompatibleMessage[] = request.messages.map((m) => {
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

    const openaiRequest: OpenAICompatibleRequest = {
      model: request.model ?? this.config.defaultModel ?? this.getDefaultModel(),
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      top_p: request.topP ?? 1,
      stream: request.stream ?? false,
    };

    if (request.frequencyPenalty !== undefined) {
      openaiRequest.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      openaiRequest.presence_penalty = request.presencePenalty;
    }

    if (request.stop) {
      openaiRequest.stop = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      openaiRequest.tools = request.tools;
    }

    if (request.toolChoice) {
      openaiRequest.tool_choice = request.toolChoice;
    }

    if (request.responseFormat?.type === 'json_object') {
      openaiRequest.response_format = { type: 'json_object' };
    }

    return openaiRequest;
  }

  protected transformResponse(response: OpenAICompatibleResponse): ChatResponse {
    const message = response.choices[0]?.message;
    const toolCalls = message?.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content: message?.content ?? '',
      model: response.model,
      provider: this.customConfig.providerId,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: response.choices[0]?.finish_reason ?? 'error',
      toolCalls,
      rawResponse: response,
    };
  }

  protected handleError(error: unknown): never {
    throw this.createTypedError(error);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add custom headers
    if (this.customConfig.customHeaders) {
      Object.assign(headers, this.customConfig.customHeaders);
    }

    // Add authentication
    const authType = this.customConfig.authType ?? 'bearer';
    if (authType === 'bearer' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (authType === 'api-key' && this.config.apiKey) {
      const headerName = this.customConfig.apiKeyHeader ?? 'X-API-Key';
      headers[headerName] = this.config.apiKey;
    }

    return headers;
  }

  private getDefaultModel(): string {
    const models = this.getSupportedModels();
    return models[0]?.id ?? 'default';
  }

  private async handleHttpError(response: Response): Promise<never> {
    const body = await response.text();
    let message = `HTTP ${response.status}`;

    try {
      const errorData = JSON.parse(body);
      message = errorData.error?.message ?? errorData.message ?? message;
    } catch {
      message = body || message;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new RateLimitError(message, retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined);
    }

    if (response.status === 401 || response.status === 403) {
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

    throw new ProviderRequestError(message, 'HTTP_ERROR', response.status, false);
  }

  private createTypedError(error: unknown): Error {
    if (error instanceof RateLimitError ||
        error instanceof AuthenticationError ||
        error instanceof ContextLengthError ||
        error instanceof ServiceUnavailableError ||
        error instanceof ProviderRequestError) {
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
registerAdapterFactory('custom', (config) => new CustomAdapter(config as CustomAdapterConfig));

// Also export a factory function for creating custom adapters with specific configurations
export function createCustomAdapter(config: CustomAdapterConfig): CustomAdapter {
  return new CustomAdapter(config);
}
