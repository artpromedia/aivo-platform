/**
 * Base model adapter interface and utilities
 */

import type {
  Message,
  ModelConfig,
  ToolDefinition,
  ToolCall,
  TokenUsage,
  FinishReason,
} from '../core/types.js';

/**
 * Model completion request
 */
export interface CompletionRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  responseFormat?: 'text' | 'json';
}

/**
 * Model completion response
 */
export interface CompletionResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: FinishReason;
  usage: TokenUsage;
  model: string;
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  id: string;
  delta: {
    content?: string;
    toolCalls?: Partial<ToolCall>[];
  };
  finishReason?: FinishReason;
}

/**
 * Base model adapter interface
 */
export interface IModelAdapter {
  /** Provider name */
  readonly provider: string;

  /** Model identifier */
  readonly model: string;

  /** Generate a completion */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /** Generate a streaming completion */
  stream?(request: CompletionRequest): AsyncIterable<StreamChunk>;

  /** Estimate token count for messages */
  estimateTokens(messages: Message[]): number;

  /** Check if the adapter is healthy */
  healthCheck(): Promise<boolean>;
}

/**
 * Model adapter factory
 */
export type ModelAdapterFactory = (config: ModelConfig) => IModelAdapter;

/**
 * Adapter registry for managing multiple providers
 */
export class ModelAdapterRegistry {
  private readonly factories: Map<string, ModelAdapterFactory> = new Map();
  private readonly adapters: Map<string, IModelAdapter> = new Map();

  /**
   * Register a model adapter factory
   */
  registerFactory(provider: string, factory: ModelAdapterFactory): void {
    this.factories.set(provider, factory);
  }

  /**
   * Get or create an adapter for a configuration
   */
  getAdapter(config: ModelConfig): IModelAdapter {
    const key = `${config.provider}:${config.model}`;

    let adapter = this.adapters.get(key);
    if (adapter) {
      return adapter;
    }

    const factory = this.factories.get(config.provider);
    if (!factory) {
      throw new Error(`No adapter factory registered for provider: ${config.provider}`);
    }

    adapter = factory(config);
    this.adapters.set(key, adapter);
    return adapter;
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(provider: string): boolean {
    return this.factories.has(provider);
  }

  /**
   * Get registered providers
   */
  getProviders(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Clear cached adapters
   */
  clearCache(): void {
    this.adapters.clear();
  }
}

/**
 * Global adapter registry
 */
export const adapterRegistry = new ModelAdapterRegistry();

/**
 * Convert internal message format to provider-specific format
 */
export function formatMessages(messages: Message[]): Array<{
  role: string;
  content: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}> {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    name: msg.name,
    tool_calls: msg.toolCalls?.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    })),
    tool_call_id: msg.toolCallId,
  }));
}

/**
 * Simple token estimation (approximate)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a message array
 */
export function estimateMessagesTokens(messages: Message[]): number {
  let tokens = 0;

  for (const msg of messages) {
    // Message overhead
    tokens += 4;

    // Content tokens
    tokens += estimateTokenCount(msg.content);

    // Tool calls
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        tokens += estimateTokenCount(tc.name);
        tokens += estimateTokenCount(JSON.stringify(tc.arguments));
      }
    }
  }

  return tokens;
}

/**
 * Base adapter with common functionality
 */
export abstract class BaseModelAdapter implements IModelAdapter {
  abstract readonly provider: string;
  abstract readonly model: string;

  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  estimateTokens(messages: Message[]): number {
    return estimateMessagesTokens(messages);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete({
        messages: [{ id: 'test', role: 'user', content: 'Hi', timestamp: new Date() }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}
