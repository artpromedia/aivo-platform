/**
 * Base Provider Adapter
 *
 * Abstract base class that defines the contract for all provider adapters.
 * Provides common functionality for request/response handling, error management,
 * and metrics tracking.
 */

import type { LLMMessage, LLMCompletionOptions, LLMCompletionResult, LLMStreamChunk } from '../llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../metrics-helper.js';
import type { AIModel, AIProvider, ModelStatus } from '../registry.js';

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ChatRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  responseFormat?: { type: 'text' | 'json_object' };
  metadata?: {
    tenantId?: string;
    userId?: string;
    agentType?: string;
    sessionId?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  rawResponse?: unknown;
}

export interface ChatChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface EmbedRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
  metadata?: Record<string, unknown>;
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  provider: string;
  usage: {
    totalTokens: number;
  };
}

export interface ProviderError {
  code: string;
  message: string;
  httpStatus?: number;
  retryable: boolean;
  retryAfterMs?: number;
  originalError?: unknown;
}

// ============================================================================
// Error Classes
// ============================================================================

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus?: number,
    public readonly retryable: boolean = false,
    public readonly retryAfterMs?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ProviderRequestError';
  }

  toProviderError(): ProviderError {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      originalError: this.originalError,
    };
  }
}

export class RateLimitError extends ProviderRequestError {
  constructor(message: string, retryAfterMs?: number) {
    super(message, 'RATE_LIMIT', 429, true, retryAfterMs);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends ProviderRequestError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, false);
    this.name = 'AuthenticationError';
  }
}

export class ContextLengthError extends ProviderRequestError {
  constructor(message: string, public readonly maxTokens?: number) {
    super(message, 'CONTEXT_LENGTH_EXCEEDED', 400, false);
    this.name = 'ContextLengthError';
  }
}

export class ContentFilterError extends ProviderRequestError {
  constructor(message: string) {
    super(message, 'CONTENT_FILTER', 400, false);
    this.name = 'ContentFilterError';
  }
}

export class ServiceUnavailableError extends ProviderRequestError {
  constructor(message: string, retryAfterMs?: number) {
    super(message, 'SERVICE_UNAVAILABLE', 503, true, retryAfterMs);
    this.name = 'ServiceUnavailableError';
  }
}

export class TimeoutError extends ProviderRequestError {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message, 'TIMEOUT', undefined, true);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// Base Adapter Configuration
// ============================================================================

export interface BaseAdapterConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  projectId?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

// ============================================================================
// Base Provider Adapter
// ============================================================================

export abstract class BaseProviderAdapter {
  protected readonly config: BaseAdapterConfig;
  protected readonly providerName: string;

  constructor(providerName: string, config: BaseAdapterConfig) {
    this.providerName = providerName;
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Get the provider name
   */
  getName(): string {
    return this.providerName;
  }

  /**
   * Check if the provider is healthy and available
   */
  abstract isHealthy(): Promise<boolean>;

  /**
   * Get the current health status
   */
  abstract getHealthStatus(): Promise<{
    healthy: boolean;
    latencyMs: number;
    status: ModelStatus;
    error?: string;
  }>;

  /**
   * Execute a chat completion request
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Execute a streaming chat completion request
   */
  abstract chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;

  /**
   * Execute an embedding request
   */
  abstract embed(request: EmbedRequest): Promise<EmbedResponse>;

  /**
   * Count tokens in the given text
   */
  abstract countTokens(text: string, model?: string): Promise<number>;

  /**
   * Get supported models for this provider
   */
  abstract getSupportedModels(): AIModel[];

  /**
   * Get the provider configuration
   */
  abstract getProviderInfo(): AIProvider;

  /**
   * Transform internal request to provider-specific format
   */
  protected abstract transformRequest(request: ChatRequest): unknown;

  /**
   * Transform provider response to internal format
   */
  protected abstract transformResponse(response: unknown, model?: string): ChatResponse;

  /**
   * Handle provider-specific errors
   */
  protected abstract handleError(error: unknown): never;

  /**
   * Record request metrics
   */
  protected recordMetrics(
    startTime: number,
    result: ChatResponse,
    request: ChatRequest
  ): void {
    const latencyMs = Date.now() - startTime;
    const tags = {
      provider: this.providerName,
      model: result.model,
      agent_type: request.metadata?.agentType ?? 'unknown',
      tenant_id: request.metadata?.tenantId ?? 'unknown',
    };

    incrementCounter('llm.requests.total', tags);
    recordHistogram('llm.latency.ms', latencyMs, tags);
    incrementCounter('llm.tokens.prompt', tags, result.usage.promptTokens);
    incrementCounter('llm.tokens.completion', tags, result.usage.completionTokens);
  }

  /**
   * Record error metrics
   */
  protected recordErrorMetrics(error: Error, request: ChatRequest): void {
    const errorCode = error instanceof ProviderRequestError ? error.code : error.name;
    const tags = {
      provider: this.providerName,
      error_code: errorCode,
      agent_type: request.metadata?.agentType ?? 'unknown',
      tenant_id: request.metadata?.tenantId ?? 'unknown',
    };

    incrementCounter('llm.requests.failed', tags);

    if (error instanceof RateLimitError) {
      incrementCounter('llm.rate_limit.hit', tags);
    }
  }

  /**
   * Convert LLMCompletionOptions to ChatRequest
   */
  static fromCompletionOptions(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): ChatRequest {
    return {
      messages,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop,
      tools: options.tools,
      toolChoice: options.toolChoice,
      metadata: options.metadata,
    };
  }

  /**
   * Convert ChatResponse to LLMCompletionResult
   */
  static toCompletionResult(
    response: ChatResponse,
    latencyMs: number,
    cached: boolean = false
  ): LLMCompletionResult {
    return {
      content: response.content,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      finishReason: response.finishReason,
      latencyMs,
      cached,
      toolCalls: response.toolCalls,
      rawResponse: response.rawResponse,
    };
  }

  /**
   * Convert ChatChunk to LLMStreamChunk
   */
  static toStreamChunk(chunk: ChatChunk): LLMStreamChunk {
    return {
      content: chunk.content,
      done: chunk.done,
      usage: chunk.usage,
    };
  }
}

// ============================================================================
// Adapter Factory
// ============================================================================

export type AdapterFactory = (config: BaseAdapterConfig) => BaseProviderAdapter;

const adapterFactories = new Map<string, AdapterFactory>();

export function registerAdapterFactory(providerType: string, factory: AdapterFactory): void {
  adapterFactories.set(providerType, factory);
}

export function createAdapter(providerType: string, config: BaseAdapterConfig): BaseProviderAdapter {
  const factory = adapterFactories.get(providerType);
  if (!factory) {
    throw new Error(`No adapter factory registered for provider type: ${providerType}`);
  }
  return factory(config);
}

export function getRegisteredAdapterTypes(): string[] {
  return Array.from(adapterFactories.keys());
}
