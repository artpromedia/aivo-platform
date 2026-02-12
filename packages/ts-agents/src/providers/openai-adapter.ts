/**
 * OpenAIAdapter - Adapter for OpenAI's API
 */

import { v4 as uuid } from 'uuid';

import type { Message, ToolDefinition, ToolCall, TokenUsage } from '../core/types';

import {
  ModelAdapter,
  type GenerateRequest,
  type GenerateResponse,
  type StreamCallback,
} from './model-adapter';

// OpenAI SDK types (optional import)
interface OpenAIStreamChunk {
  choices: {
    delta: {
      content?: string;
      tool_calls?: {
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
  }[];
}

interface OpenAIClient {
  chat: {
    completions: {
      create(
        params: OpenAIChatCompletionParams & { stream?: false }
      ): Promise<OpenAIChatCompletion>;
      create(
        params: OpenAIChatCompletionParams & { stream: true }
      ): Promise<AsyncIterable<OpenAIStreamChunk>>;
      create(
        params: OpenAIChatCompletionParams
      ): Promise<OpenAIChatCompletion | AsyncIterable<OpenAIStreamChunk>>;
    };
  };
}

interface OpenAIChatCompletionParams {
  model: string;
  messages: OpenAIChatMessage[];
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export class OpenAIAdapter extends ModelAdapter {
  private client?: OpenAIClient;
  private modelName = 'gpt-4-turbo-preview';
  private initialized = false;

  private async ensureClient(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const key = this.apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      const mod = (await import('openai')) as {
        default: new (opts: { apiKey: string; baseURL?: string }) => OpenAIClient;
      };
      const OpenAI = mod.default;
      this.client = new OpenAI({
        apiKey: key,
        baseURL: this.baseUrl,
      });
    } catch {
      // SDK not installed, client will be undefined
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    await this.ensureClient();
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Provide API key or install openai package');
    }

    this.modelName = request.config.model;

    const params: OpenAIChatCompletionParams = {
      model: request.config.model,
      messages: this.formatMessages(request.messages, request.systemPrompt),
      temperature: request.config.temperature,
      top_p: request.config.topP,
      max_tokens: request.config.maxTokens,
      stop: request.config.stopSequences,
      stream: false, // Explicitly false for non-streaming
    };

    if ((request.tools?.length ?? 0) > 0) {
      params.tools = this.formatTools(request.tools!);
      params.tool_choice = 'auto';
    }

    // Cast needed: TS can't narrow the overload since params.stream is `boolean`, not literal `false`.
    // We set stream=false above, so the SDK returns OpenAIChatCompletion.
    const response = await this.client.chat.completions.create(params) as OpenAIChatCompletion;

    return this.parseResponse(response);
  }

  async generateStream(
    request: GenerateRequest,
    callback: StreamCallback
  ): Promise<GenerateResponse> {
    await this.ensureClient();
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    this.modelName = request.config.model;

    const params: OpenAIChatCompletionParams = {
      model: request.config.model,
      messages: this.formatMessages(request.messages, request.systemPrompt),
      temperature: request.config.temperature,
      top_p: request.config.topP,
      max_tokens: request.config.maxTokens,
      stop: request.config.stopSequences,
      stream: true,
    };

    if ((request.tools?.length ?? 0) > 0) {
      params.tools = this.formatTools(request.tools!);
      params.tool_choice = 'auto';
    }

    // For streaming, we need to collect chunks and build the final response
    let fullMessage = '';
    const toolCallsMap = new Map<number, OpenAIToolCall>();

    // TypeScript doesn't narrow the return type even with `stream: true as const`
    // so we need to explicitly cast. The SDK returns AsyncIterable when stream=true.
    const stream = (await this.client.chat.completions.create({ 
      ...params, 
      stream: true 
    })) as AsyncIterable<OpenAIStreamChunk>;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        fullMessage += delta.content;
        callback({ type: 'text', content: delta.content });
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = toolCallsMap.get(tc.index);
          if (existing) {
            existing.function.arguments += tc.function?.arguments || '';
          } else {
            toolCallsMap.set(tc.index, {
              id: tc.id || uuid(),
              type: 'function',
              function: {
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              },
            });
          }
        }
      }
    }

    // Build final response
    const toolCalls: ToolCall[] = [];
    for (const tc of toolCallsMap.values()) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
          timestamp: new Date(),
        });
      } catch {
        // Skip malformed tool calls
      }
    }

    const response: GenerateResponse = {
      message: fullMessage || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    };

    callback({ type: 'done' });

    return response;
  }

  async countTokens(text: string): Promise<number> {
    // GPT tokenizer is roughly ~4 characters per token
    // For more accurate counting, use tiktoken library
    return Math.ceil(text.length / 4);
  }

  getModelName(): string {
    return this.modelName;
  }

  isReady(): boolean {
    return this.client !== undefined;
  }

  protected formatMessages(messages: Message[], systemPrompt?: string): OpenAIChatMessage[] {
    const formatted: OpenAIChatMessage[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      formatted.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    for (const message of messages) {
      if (message.role === 'system') {
        formatted.push({
          role: 'system',
          content: message.content,
        });
      } else if (message.role === 'user') {
        formatted.push({
          role: 'user',
          content: message.content,
        });
      } else if (message.role === 'assistant') {
        const assistantMessage: OpenAIChatMessage = {
          role: 'assistant',
          content: message.content || null,
        };

        if ((message.toolCalls?.length ?? 0) > 0) {
          assistantMessage.tool_calls = message.toolCalls!.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
        }

        formatted.push(assistantMessage);
      } else {
        // tool role
        formatted.push({
          role: 'tool',
          content: message.content,
          tool_call_id: message.toolCallId,
        });
      }
    }

    return formatted;
  }

  protected formatTools(tools: ToolDefinition[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as unknown as Record<string, unknown>,
      },
    }));
  }

  protected parseToolCalls(choice: OpenAIChatChoice): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        try {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
            timestamp: new Date(),
          });
        } catch {
          // Skip malformed tool calls
        }
      }
    }

    return toolCalls;
  }

  private parseResponse(response: OpenAIChatCompletion): GenerateResponse {
    const choice = response.choices[0];
    if (!choice) {
      return {
        finishReason: 'error',
      };
    }

    const toolCalls = this.parseToolCalls(choice);

    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };

    let finishReason: GenerateResponse['finishReason'] = 'stop';
    if (choice.finish_reason === 'tool_calls') {
      finishReason = 'tool_calls';
    } else if (choice.finish_reason === 'length') {
      finishReason = 'length';
    }

    return {
      message: choice.message.content || undefined,
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
