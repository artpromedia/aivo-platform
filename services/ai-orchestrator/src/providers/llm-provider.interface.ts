/**
 * LLM Provider Interface
 *
 * Defines the contract for all LLM providers (OpenAI, Anthropic, Google Gemini).
 * Provides a unified interface for completions, streaming, and token counting.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  /** Tool calls made by the assistant (for function calling) */
  toolCalls?: LLMToolCall[];
  /** Tool call ID (for tool role messages) */
  toolCallId?: string;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  user?: string; // For abuse tracking
  metadata?: {
    tenantId: string;
    userId: string;
    agentType: string;
    sessionId?: string;
    [key: string]: unknown;
  };
  /** Tools available for the model to call (function calling) */
  tools?: unknown[];
  /** How the model should choose tools */
  toolChoice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | 'tool_calls';
  latencyMs: number;
  cached: boolean;
  /** Tool calls requested by the model */
  toolCalls?: LLMToolCall[];
  /** Raw response from the provider (for advanced parsing) */
  rawResponse?: unknown;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: LLMCompletionResult['usage'];
}

export interface LLMProviderConfig {
  apiKey: string;
  organizationId?: string;
  projectId?: string;
  rateLimits?: {
    tokensPerMinute?: number;
    requestsPerMinute?: number;
  };
  cacheConfig?: {
    enabled?: boolean;
    ttlSeconds?: number;
    redisUrl?: string;
  };
}

export interface OpenAIConfig extends LLMProviderConfig {
  organizationId?: string;
}

export type AnthropicConfig = LLMProviderConfig;

export interface GoogleGeminiConfig extends LLMProviderConfig {
  projectId?: string;
  location?: string;
}

export interface OllamaConfig extends LLMProviderConfig {
  /** Base URL for Ollama API (default: http://localhost:11434) */
  baseUrl?: string;
  /** Default model to use (default: llama3.2:3b) */
  defaultModel?: string;
  /** Request timeout in ms (default: 120000 for local inference) */
  timeout?: number;
}

export interface LLMOrchestratorConfig {
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  google?: GoogleGeminiConfig;
  ollama?: OllamaConfig;
  primaryProvider?: string;
  fallbackOrder?: string[];
}

/**
 * LLM Provider interface for unified access to different LLM backends
 */
export interface LLMProviderInterface {
  readonly name: string;

  /**
   * Check if the provider is available and healthy
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate a completion for the given messages
   */
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;

  /**
   * Stream a completion for the given messages
   */
  stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<LLMStreamChunk>;

  /**
   * Count tokens in the given text
   */
  countTokens(text: string): Promise<number>;
}
