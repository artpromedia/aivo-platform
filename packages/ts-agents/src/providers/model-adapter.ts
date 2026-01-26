/**
 * ModelAdapter - Abstract interface for LLM providers
 */

import type {
  ModelConfig,
  Message,
  ToolDefinition,
  ToolCall,
  TokenUsage,
} from '../core/types';

export interface GenerateRequest {
  systemPrompt: string;
  messages: Message[];
  tools?: ToolDefinition[];
  config: ModelConfig;
}

export interface GenerateResponse {
  message?: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'usage' | 'done';
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: TokenUsage;
}

export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Abstract base class for model adapters
 */
export abstract class ModelAdapter {
  protected apiKey?: string;
  protected baseUrl?: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a response from the model
   */
  abstract generate(request: GenerateRequest): Promise<GenerateResponse>;

  /**
   * Generate a streaming response
   */
  abstract generateStream(
    request: GenerateRequest,
    callback: StreamCallback
  ): Promise<GenerateResponse>;

  /**
   * Count tokens in a text (approximate)
   */
  abstract countTokens(text: string): Promise<number>;

  /**
   * Get the model name
   */
  abstract getModelName(): string;

  /**
   * Check if the adapter is configured and ready
   */
  abstract isReady(): boolean;

  /**
   * Convert messages to provider-specific format
   */
  protected abstract formatMessages(messages: Message[]): unknown[];

  /**
   * Convert tools to provider-specific format
   */
  protected abstract formatTools(tools: ToolDefinition[]): unknown[];

  /**
   * Parse tool calls from provider response
   */
  protected abstract parseToolCalls(response: unknown): ToolCall[];
}

/**
 * Mock model adapter for testing
 */
export class MockModelAdapter extends ModelAdapter {
  private responses: GenerateResponse[] = [];
  private currentIndex = 0;

  constructor() {
    super();
  }

  /**
   * Set mock responses to return
   */
  setResponses(responses: GenerateResponse[]): void {
    this.responses = responses;
    this.currentIndex = 0;
  }

  /**
   * Add a mock response
   */
  addResponse(response: GenerateResponse): void {
    this.responses.push(response);
  }

  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    if (this.responses.length === 0) {
      return {
        message: 'Mock response',
        finishReason: 'stop',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };
    }

    const response = this.responses[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.responses.length;
    return response;
  }

  async generateStream(
    request: GenerateRequest,
    callback: StreamCallback
  ): Promise<GenerateResponse> {
    const response = await this.generate(request);

    if (response.message) {
      // Simulate streaming
      const words = response.message.split(' ');
      for (const word of words) {
        callback({ type: 'text', content: word + ' ' });
      }
    }

    if (response.usage) {
      callback({ type: 'usage', usage: response.usage });
    }

    callback({ type: 'done' });

    return response;
  }

  async countTokens(text: string): Promise<number> {
    // Rough approximation
    return Math.ceil(text.length / 4);
  }

  getModelName(): string {
    return 'mock-model';
  }

  isReady(): boolean {
    return true;
  }

  protected formatMessages(messages: Message[]): unknown[] {
    return messages;
  }

  protected formatTools(tools: ToolDefinition[]): unknown[] {
    return tools;
  }

  protected parseToolCalls(_response: unknown): ToolCall[] {
    return [];
  }
}
