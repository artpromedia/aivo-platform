/**
 * Ollama LLM Provider
 *
 * Local LLM provider using Ollama for development and testing.
 * Supports various open-source models like Llama, Mistral, etc.
 * 
 * Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type {
  LLMProviderInterface,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
  LLMProviderConfig,
} from './llm-provider.interface.js';
import { incrementCounter, recordHistogram } from './metrics-helper.js';

export interface OllamaConfig extends LLMProviderConfig {
  /** Base URL for Ollama API (default: http://localhost:11434) */
  baseUrl?: string;
  /** Default model to use (default: llama3.2:3b) */
  defaultModel?: string;
  /** Request timeout in ms (default: 120000 for local inference) */
  timeout?: number;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Note: OllamaGenerateResponse interface removed (unused - use OllamaResponse for chat API)

// Logger helper
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [OllamaProvider]`;
  if (level === 'error') {
    console.error(`${prefix} ${message}`, context ?? '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, context ?? '');
  } else {
    console.log(`${prefix} ${message}`, context ?? '');
  }
}

export class OllamaProvider implements LLMProviderInterface {
  readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeout: number;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl ?? 'http://ollama:11434';
    this.defaultModel = config.defaultModel ?? 'llama3.2:3b';
    this.timeout = config.timeout ?? 120000; // 2 minutes for local inference
    
    log('info', 'Ollama provider initialized', {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const data = await response.json() as { models?: { name: string }[] };
        log('info', 'Ollama available', { models: data.models?.map(m => m.name) });
        return true;
      }
      return false;
    } catch (error) {
      log('warn', 'Ollama not available', { error: String(error) });
      incrementCounter('llm.provider.health_check.failed', { provider: this.name });
      return false;
    }
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const startTime = Date.now();
    const model = options.model ?? this.defaultModel;

    try {
      // Ollama uses /api/chat for chat completions
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role === 'tool' ? 'user' : m.role, // Ollama doesn't support 'tool' role
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            top_p: options.topP ?? 1,
            num_predict: options.maxTokens ?? 1000,
            stop: options.stop,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as OllamaResponse;
      const latencyMs = Date.now() - startTime;

      // Calculate approximate token counts
      const promptTokens = data.prompt_eval_count ?? this.estimateTokens(messages.map(m => m.content).join(' '));
      const completionTokens = data.eval_count ?? this.estimateTokens(data.message.content);

      incrementCounter('llm.completion.success', { provider: this.name, model });
      recordHistogram('llm.completion.latency_ms', latencyMs, { provider: this.name, model });
      recordHistogram('llm.completion.tokens', promptTokens + completionTokens, { provider: this.name, model });

      log('info', 'Ollama completion successful', {
        model,
        latencyMs,
        promptTokens,
        completionTokens,
      });

      return {
        content: data.message.content,
        model: data.model,
        provider: this.name,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: 'stop',
        latencyMs,
        cached: false,
      };
    } catch (error) {
      incrementCounter('llm.completion.failed', { provider: this.name, model });
      log('error', 'Ollama completion failed', { error: String(error), model });
      throw error;
    }
  }

  async *stream(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): AsyncIterable<LLMStreamChunk> {
    const model = options.model ?? this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role === 'tool' ? 'user' : m.role,
            content: m.content,
          })),
          stream: true,
          options: {
            temperature: options.temperature ?? 0.7,
            top_p: options.topP ?? 1,
            num_predict: options.maxTokens ?? 1000,
            stop: options.stop,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama stream error: ${response.status}`);
      }

      yield* this.processStreamResponse(response.body);
    } catch (error) {
      log('error', 'Ollama stream failed', { error: String(error) });
      throw error;
    }
  }

  /**
   * Process streaming response body and yield chunks
   */
  private async *processStreamResponse(body: ReadableStream<Uint8Array>): AsyncIterable<LLMStreamChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const chunk = this.parseStreamLine(line, totalTokens);
        if (chunk) {
          totalTokens += this.estimateTokens(chunk.content);
          yield chunk;
        }
      }
    }
  }

  /**
   * Parse a single line from the stream response
   */
  private parseStreamLine(line: string, totalTokens: number): LLMStreamChunk | null {
    if (!line.trim()) return null;
    
    try {
      const chunk = JSON.parse(line) as OllamaResponse;
      const content = chunk.message?.content || '';

      return {
        content,
        done: chunk.done,
        usage: chunk.done ? {
          promptTokens: chunk.prompt_eval_count ?? 0,
          completionTokens: chunk.eval_count ?? totalTokens,
          totalTokens: (chunk.prompt_eval_count ?? 0) + (chunk.eval_count ?? totalTokens),
        } : undefined,
      };
    } catch {
      // Skip malformed JSON lines
      return null;
    }
  }

  async countTokens(text: string): Promise<number> {
    // Ollama doesn't have a dedicated tokenize endpoint
    // Use a rough estimate: ~4 characters per token (conservative for most models)
    return this.estimateTokens(text);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    log('info', `Pulling model: ${modelName}`);
    
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    // Wait for pull to complete (streaming response)
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    log('info', `Model pulled successfully: ${modelName}`);
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json() as { models?: { name: string }[] };
    return data.models?.map(m => m.name) ?? [];
  }
}
