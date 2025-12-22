/**
 * LLM Provider Interface
 *
 * Defines the contract for all LLM providers (OpenAI, Anthropic, Google Gemini).
 * Provides a unified interface for completions, streaming, and token counting.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
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
  };
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
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  latencyMs: number;
  cached: boolean;
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

export interface LLMOrchestratorConfig {
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  google?: GoogleGeminiConfig;
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
