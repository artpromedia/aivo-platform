/**
 * Anthropic Claude LLM Provider
 *
 * Production implementation of Anthropic Claude API integration with:
 * - Model routing based on task complexity
 * - Rate limiting and caching
 * - Comprehensive metrics
 * - Streaming support
 */

import Anthropic from '@anthropic-ai/sdk';

import { LLMCache } from '../cache/llm-cache.js';
import { RateLimiter } from '../utils/rate-limiter.js';

import type {
  LLMProviderInterface,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
  AnthropicConfig,
} from './llm-provider.interface.js';
import { incrementCounter, recordHistogram } from './metrics-helper.js';

export class AnthropicProvider implements LLMProviderInterface {
  readonly name = 'anthropic';
  private client: Anthropic;
  private rateLimiter: RateLimiter;
  private cache: LLMCache;

  // Model routing based on task complexity
  private readonly modelTiers = {
    simple: 'claude-3-haiku-20240307',
    standard: 'claude-3-5-sonnet-20241022',
    complex: 'claude-3-5-sonnet-20241022',
    safety: 'claude-3-5-sonnet-20241022',
  };

  // Pricing per 1M tokens (as of late 2024)
  private readonly pricing: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  };

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: 30000,
      maxRetries: 3,
    });

    this.rateLimiter = new RateLimiter({
      tokensPerMinute: config.rateLimits?.tokensPerMinute ?? 100000,
      requestsPerMinute: config.rateLimits?.requestsPerMinute ?? 500,
    });

    this.cache = new LLMCache(config.cacheConfig);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check with minimal tokens
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (error) {
      incrementCounter('llm.provider.health_check.failed', { provider: this.name });
      return false;
    }
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const startTime = Date.now();
    const model = options.model ?? this.selectModel(options.metadata?.agentType);

    // Check cache first
    const cacheKey = this.cache.generateKey(messages, model, options);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      incrementCounter('llm.cache.hit', { provider: this.name, model });
      return { ...cached, cached: true, latencyMs: Date.now() - startTime };
    }

    // Rate limiting
    const estimatedTokens = await this.estimateTokens(messages, options.maxTokens ?? 1000);
    await this.rateLimiter.acquire(estimatedTokens);

    try {
      // Extract system message (Anthropic handles it separately)
      const systemMessage = messages.find((m) => m.role === 'system')?.content;
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 1000,
        system: systemMessage,
        messages: conversationMessages,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1,
        stop_sequences: options.stop,
        metadata: {
          user_id: options.metadata?.userId,
        },
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const result: LLMCompletionResult = {
        content,
        model: response.model,
        provider: this.name,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        latencyMs: Date.now() - startTime,
        cached: false,
      };

      // Record metrics
      await this.recordMetrics(result, options.metadata);

      // Cache successful responses
      if (result.finishReason === 'stop') {
        await this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      await this.handleError(error, options.metadata);
      throw error;
    }
  }

  async *stream(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): AsyncIterable<LLMStreamChunk> {
    const model = options.model ?? this.selectModel(options.metadata?.agentType);

    const estimatedTokens = await this.estimateTokens(messages, options.maxTokens ?? 1000);
    await this.rateLimiter.acquire(estimatedTokens);

    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const stream = this.client.messages.stream({
      model,
      max_tokens: options.maxTokens ?? 1000,
      system: systemMessage,
      messages: conversationMessages,
      temperature: options.temperature ?? 0.7,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield {
            content: delta.text,
            done: false,
          };
        }
      } else if (event.type === 'message_stop') {
        yield {
          content: '',
          done: true,
        };
      }
    }
  }

  async countTokens(text: string): Promise<number> {
    // Anthropic's tokenizer is similar to Claude's
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private selectModel(agentType?: string): string {
    switch (agentType) {
      case 'safety':
        return this.modelTiers.safety;
      case 'assessment':
      case 'iep_goal':
        return this.modelTiers.complex;
      case 'focus':
      case 'emotional':
        return this.modelTiers.simple;
      default:
        return this.modelTiers.standard;
    }
  }

  private async estimateTokens(messages: LLMMessage[], maxOutput: number): Promise<number> {
    const inputText = messages.map((m) => m.content).join(' ');
    const inputTokens = await this.countTokens(inputText);
    return inputTokens + maxOutput;
  }

  private async recordMetrics(
    result: LLMCompletionResult,
    metadata?: LLMCompletionOptions['metadata']
  ): Promise<void> {
    const tags = {
      provider: this.name,
      model: result.model,
      agent_type: metadata?.agentType ?? 'unknown',
      tenant_id: metadata?.tenantId ?? 'unknown',
    };

    incrementCounter('llm.requests.total', tags);
    recordHistogram('llm.latency.ms', result.latencyMs, tags);
    incrementCounter('llm.tokens.prompt', tags, result.usage.promptTokens);
    incrementCounter('llm.tokens.completion', tags, result.usage.completionTokens);

    // Cost tracking
    const cost = this.calculateCost(result);
    incrementCounter('llm.cost.cents', tags, Math.round(cost * 100));
  }

  private calculateCost(result: LLMCompletionResult): number {
    const modelPricing = this.pricing[result.model] ?? this.pricing['claude-3-5-sonnet-20241022'];
    const inputCost = (result.usage.promptTokens / 1_000_000) * modelPricing.input;
    const outputCost = (result.usage.completionTokens / 1_000_000) * modelPricing.output;
    return inputCost + outputCost;
  }

  private async handleError(
    error: unknown,
    metadata?: LLMCompletionOptions['metadata']
  ): Promise<void> {
    const tags = {
      provider: this.name,
      agent_type: metadata?.agentType ?? 'unknown',
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
    };

    incrementCounter('llm.requests.failed', tags);

    if (error instanceof Anthropic.RateLimitError) {
      incrementCounter('llm.rate_limit.hit', tags);
    } else if (error instanceof Anthropic.APIConnectionError) {
      incrementCounter('llm.connection.failed', tags);
    }
  }
}
