/**
 * OpenAI LLM Provider
 *
 * Production implementation of OpenAI API integration with:
 * - Model routing based on task complexity
 * - Rate limiting and caching
 * - Comprehensive metrics and cost tracking
 * - Streaming support
 */

import OpenAI from 'openai';

import { LLMCache } from '../cache/llm-cache.js';
import { RateLimiter } from '../utils/rate-limiter.js';

import type {
  LLMProviderInterface,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
  OpenAIConfig,
} from './llm-provider.interface.js';
import { incrementCounter, recordHistogram } from './metrics-helper.js';

export class OpenAIProvider implements LLMProviderInterface {
  readonly name = 'openai';
  private client: OpenAI;
  private rateLimiter: RateLimiter;
  private cache: LLMCache;

  // Model routing based on task complexity
  private readonly modelTiers = {
    simple: 'gpt-4o-mini', // Fast, cheap - simple Q&A
    standard: 'gpt-4o', // Balanced - most tutoring
    complex: 'gpt-4-turbo', // Complex reasoning
    safety: 'gpt-4o', // Content moderation
  };

  // Pricing per 1M tokens (as of late 2024)
  private readonly pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
  };

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      timeout: 30000,
      maxRetries: 3,
    });

    this.rateLimiter = new RateLimiter({
      tokensPerMinute: config.rateLimits?.tokensPerMinute ?? 150000,
      requestsPerMinute: config.rateLimits?.requestsPerMinute ?? 500,
    });

    this.cache = new LLMCache(config.cacheConfig);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
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
    const model = options.model ?? this.selectModel(messages, options);

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
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          name: m.name,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        top_p: options.topP ?? 1,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stop: options.stop,
        user: options.user ?? options.metadata?.userId,
      });

      const result: LLMCompletionResult = {
        content: response.choices[0]?.message?.content ?? '',
        model: response.model,
        provider: this.name,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        finishReason: this.mapFinishReason(response.choices[0]?.finish_reason),
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
    const model = options.model ?? this.selectModel(messages, options);

    const estimatedTokens = await this.estimateTokens(messages, options.maxTokens ?? 1000);
    await this.rateLimiter.acquire(estimatedTokens);

    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
      stream: true,
      user: options.user ?? options.metadata?.userId,
    });

    for await (const chunk of stream) {
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
    }
  }

  async countTokens(text: string): Promise<number> {
    try {
      // Use tiktoken for accurate counting
      const { encoding_for_model } = await import('tiktoken');
      const enc = encoding_for_model('gpt-4');
      const tokens = enc.encode(text);
      enc.free();
      return tokens.length;
    } catch {
      // Fallback: rough estimate of ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  }

  private selectModel(messages: LLMMessage[], options: LLMCompletionOptions): string {
    // Select model based on task complexity and agent type
    const agentType = options.metadata?.agentType;

    switch (agentType) {
      case 'safety':
        return this.modelTiers.safety;
      case 'assessment':
      case 'iep_goal':
        return this.modelTiers.complex;
      case 'focus':
      case 'emotional':
        return this.modelTiers.simple;
      default: {
        // Estimate complexity from message length
        const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
        if (totalLength > 5000) return this.modelTiers.complex;
        if (totalLength > 1000) return this.modelTiers.standard;
        return this.modelTiers.simple;
      }
    }
  }

  private mapFinishReason(reason?: string | null): LLMCompletionResult['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
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

    // Cost tracking (approximate)
    const cost = this.calculateCost(result);
    incrementCounter('llm.cost.cents', tags, Math.round(cost * 100));
  }

  private calculateCost(result: LLMCompletionResult): number {
    const modelPricing = this.pricing[result.model] ?? this.pricing['gpt-4o'];
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

    if (error instanceof OpenAI.RateLimitError) {
      incrementCounter('llm.rate_limit.hit', tags);
    } else if (error instanceof OpenAI.APIConnectionError) {
      incrementCounter('llm.connection.failed', tags);
    }
  }
}
