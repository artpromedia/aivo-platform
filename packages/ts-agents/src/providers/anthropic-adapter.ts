/**
 * AnthropicAdapter - Adapter for Anthropic's Claude API
 */

import { v4 as uuid } from 'uuid';
import type {
  Message,
  ToolDefinition,
  ToolCall,
  TokenUsage,
} from '../core/types';
import {
  ModelAdapter,
  type GenerateRequest,
  type GenerateResponse,
  type StreamCallback,
} from './model-adapter';

// Anthropic SDK types (optional import)
interface AnthropicClient {
  messages: {
    create(params: AnthropicMessageCreateParams): Promise<AnthropicMessage>;
    stream(params: AnthropicMessageCreateParams): AnthropicStream;
  };
}

interface AnthropicMessageCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessageParam[];
  tools?: AnthropicTool[];
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
}

interface AnthropicMessageParam {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStream {
  on(event: 'text', callback: (text: string) => void): this;
  on(event: 'message', callback: (message: AnthropicMessage) => void): this;
  on(event: 'error', callback: (error: Error) => void): this;
  finalMessage(): Promise<AnthropicMessage>;
}

export class AnthropicAdapter extends ModelAdapter {
  private client?: AnthropicClient;
  private modelName: string = 'claude-3-sonnet-20240229';

  constructor(apiKey?: string, baseUrl?: string) {
    super(apiKey, baseUrl);
    this.initializeClient();
  }

  private initializeClient(): void {
    const key = this.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Anthropic = require('@anthropic-ai/sdk').default;
      this.client = new Anthropic({
        apiKey: key,
        baseURL: this.baseUrl,
      });
    } catch {
      // SDK not installed, client will be undefined
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Provide API key or install @anthropic-ai/sdk');
    }

    this.modelName = request.config.model;

    const params: AnthropicMessageCreateParams = {
      model: request.config.model,
      max_tokens: request.config.maxTokens || 4096,
      system: request.systemPrompt,
      messages: this.formatMessages(request.messages) as AnthropicMessageParam[],
      temperature: request.config.temperature,
      top_p: request.config.topP,
      stop_sequences: request.config.stopSequences,
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = this.formatTools(request.tools) as AnthropicTool[];
    }

    const response = await this.client.messages.create(params);

    return this.parseResponse(response);
  }

  async generateStream(
    request: GenerateRequest,
    callback: StreamCallback
  ): Promise<GenerateResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    this.modelName = request.config.model;

    const params: AnthropicMessageCreateParams = {
      model: request.config.model,
      max_tokens: request.config.maxTokens || 4096,
      system: request.systemPrompt,
      messages: this.formatMessages(request.messages) as AnthropicMessageParam[],
      temperature: request.config.temperature,
      top_p: request.config.topP,
      stop_sequences: request.config.stopSequences,
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = this.formatTools(request.tools) as AnthropicTool[];
    }

    const stream = this.client.messages.stream(params);

    stream.on('text', (text) => {
      callback({ type: 'text', content: text });
    });

    const finalMessage = await stream.finalMessage();
    const response = this.parseResponse(finalMessage);

    if (response.usage) {
      callback({ type: 'usage', usage: response.usage });
    }

    callback({ type: 'done' });

    return response;
  }

  async countTokens(text: string): Promise<number> {
    // Anthropic's tokenizer is roughly similar to GPT-4
    // ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  getModelName(): string {
    return this.modelName;
  }

  isReady(): boolean {
    return this.client !== undefined;
  }

  protected formatMessages(messages: Message[]): AnthropicMessageParam[] {
    const formatted: AnthropicMessageParam[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // System messages are handled separately in Anthropic API
        continue;
      }

      if (message.role === 'user') {
        formatted.push({
          role: 'user',
          content: message.content,
        });
      } else if (message.role === 'assistant') {
        if (message.toolCalls && message.toolCalls.length > 0) {
          // Assistant message with tool calls
          const content: AnthropicContentBlock[] = [];

          if (message.content) {
            content.push({ type: 'text', text: message.content });
          }

          for (const toolCall of message.toolCalls) {
            content.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.arguments,
            });
          }

          formatted.push({ role: 'assistant', content });
        } else {
          formatted.push({
            role: 'assistant',
            content: message.content,
          });
        }
      } else if (message.role === 'tool') {
        // Tool results are part of a user message
        formatted.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: message.toolCallId,
              content: message.content,
            },
          ],
        });
      }
    }

    return formatted;
  }

  protected formatTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as unknown as Record<string, unknown>,
    }));
  }

  protected parseToolCalls(response: AnthropicMessage): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id || uuid(),
          name: block.name || '',
          arguments: (block.input || {}) as Record<string, unknown>,
          timestamp: new Date(),
        });
      }
    }

    return toolCalls;
  }

  private parseResponse(response: AnthropicMessage): GenerateResponse {
    let message = '';
    const toolCalls = this.parseToolCalls(response);

    for (const block of response.content) {
      if (block.type === 'text') {
        message += block.text || '';
      }
    }

    const usage: TokenUsage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    let finishReason: GenerateResponse['finishReason'] = 'stop';
    if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_calls';
    } else if (response.stop_reason === 'max_tokens') {
      finishReason = 'length';
    }

    return {
      message: message || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason,
      metadata: {
        model: response.model,
        id: response.id,
      },
    };
  }
}
