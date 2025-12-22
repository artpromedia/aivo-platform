/**
 * Google Gemini LLM Provider
 *
 * Production implementation of Google Gemini API integration with:
 * - Model routing based on task complexity
 * - Rate limiting and caching
 * - Comprehensive metrics
 * - Streaming support
 * - Safety settings for K-12 education
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerativeModel,
  type GenerationConfig,
  type Content,
  type Part,
} from '@google/generative-ai';

import { LLMCache } from '../cache/llm-cache.js';
import { RateLimiter } from '../utils/rate-limiter.js';

import type {
  LLMProviderInterface,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
  GoogleGeminiConfig,
} from './llm-provider.interface.js';
import { incrementCounter, recordHistogram } from './metrics-helper.js';

export class GoogleGeminiProvider implements LLMProviderInterface {
  readonly name = 'google';
  private client: GoogleGenerativeAI;
  private rateLimiter: RateLimiter;
  private cache: LLMCache;

  // Model routing based on task complexity
  private readonly modelTiers = {
    simple: 'gemini-1.5-flash', // Fast, cheap - simple Q&A
    standard: 'gemini-1.5-pro', // Balanced - most tutoring
    complex: 'gemini-1.5-pro', // Complex reasoning
    safety: 'gemini-1.5-pro', // Content moderation
  };

  // Pricing per 1M tokens (as of late 2024)
  // Note: Gemini has different pricing for prompts ≤128K and >128K tokens
  private readonly pricing: Record<string, { input: number; output: number }> = {
    'gemini-1.5-pro': { input: 1.25, output: 5.0 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free during preview
  };

  // Safety settings for K-12 education - block all harmful content
  private readonly safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ];

  constructor(config: GoogleGeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);

    this.rateLimiter = new RateLimiter({
      tokensPerMinute: config.rateLimits?.tokensPerMinute ?? 100000,
      requestsPerMinute: config.rateLimits?.requestsPerMinute ?? 500,
    });

    this.cache = new LLMCache(config.cacheConfig);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('Hi');
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
    const modelName = options.model ?? this.selectModel(options.metadata?.agentType);

    // Check cache first
    const cacheKey = this.cache.generateKey(messages, modelName, options);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      incrementCounter('llm.cache.hit', { provider: this.name, model: modelName });
      return { ...cached, cached: true, latencyMs: Date.now() - startTime };
    }

    // Rate limiting
    const estimatedTokens = await this.estimateTokens(messages, options.maxTokens ?? 1000);
    await this.rateLimiter.acquire(estimatedTokens);

    try {
      // Extract system instruction and convert messages to Gemini format
      const { systemInstruction, contents } = this.convertMessages(messages);

      const generationConfig: GenerationConfig = {
        temperature: options.temperature ?? 0.7,
        topP: options.topP ?? 1,
        maxOutputTokens: options.maxTokens ?? 1000,
        stopSequences: options.stop,
      };

      const model = this.client.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig,
        safetySettings: this.safetySettings,
      });

      const result = await model.generateContent({ contents });
      const response = result.response;

      // Check for blocked content
      if (response.promptFeedback?.blockReason) {
        const llmResult: LLMCompletionResult = {
          content: '',
          model: modelName,
          provider: this.name,
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          finishReason: 'content_filter',
          latencyMs: Date.now() - startTime,
          cached: false,
        };
        return llmResult;
      }

      const content = response.text();
      const usageMetadata = response.usageMetadata;

      const llmResult: LLMCompletionResult = {
        content,
        model: modelName,
        provider: this.name,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount ?? 0,
          completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: usageMetadata?.totalTokenCount ?? 0,
        },
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
        latencyMs: Date.now() - startTime,
        cached: false,
      };

      // Record metrics
      await this.recordMetrics(llmResult, options.metadata);

      // Cache successful responses
      if (llmResult.finishReason === 'stop') {
        await this.cache.set(cacheKey, llmResult);
      }

      return llmResult;
    } catch (error) {
      await this.handleError(error, options.metadata);
      throw error;
    }
  }

  async *stream(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): AsyncIterable<LLMStreamChunk> {
    const modelName = options.model ?? this.selectModel(options.metadata?.agentType);

    const estimatedTokens = await this.estimateTokens(messages, options.maxTokens ?? 1000);
    await this.rateLimiter.acquire(estimatedTokens);

    // Extract system instruction and convert messages
    const { systemInstruction, contents } = this.convertMessages(messages);

    const generationConfig: GenerationConfig = {
      temperature: options.temperature ?? 0.7,
      topP: options.topP ?? 1,
      maxOutputTokens: options.maxTokens ?? 1000,
      stopSequences: options.stop,
    };

    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction,
      generationConfig,
      safetySettings: this.safetySettings,
    });

    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      const finishReason = chunk.candidates?.[0]?.finishReason;

      yield {
        content: text,
        done: finishReason !== undefined && finishReason !== null,
        usage: chunk.usageMetadata
          ? {
              promptTokens: chunk.usageMetadata.promptTokenCount ?? 0,
              completionTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: chunk.usageMetadata.totalTokenCount ?? 0,
            }
          : undefined,
      };
    }
  }

  async countTokens(text: string): Promise<number> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.countTokens(text);
      return result.totalTokens;
    } catch {
      // Fallback: rough estimate of ~4 chars per token
      return Math.ceil(text.length / 4);
    }
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

  /**
   * Convert LLMMessage array to Gemini format
   * Gemini uses a different message structure with Content and Parts
   */
  private convertMessages(messages: LLMMessage[]): {
    systemInstruction?: string;
    contents: Content[];
  } {
    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Convert to Gemini Content format
    const contents: Content[] = conversationMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }] as Part[],
    }));

    return {
      systemInstruction: systemMessage?.content,
      contents,
    };
  }

  private mapFinishReason(reason?: string): LLMCompletionResult['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
        return 'content_filter';
      default:
        return 'stop';
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
    const modelPricing = this.pricing[result.model] ?? this.pricing['gemini-1.5-pro'];
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

    // Check for specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
        incrementCounter('llm.rate_limit.hit', tags);
      } else if (error.message.includes('UNAVAILABLE') || error.message.includes('network')) {
        incrementCounter('llm.connection.failed', tags);
      }
    }
  }
}
