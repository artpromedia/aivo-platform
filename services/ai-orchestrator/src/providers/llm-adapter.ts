/**
 * LLM Adapter - Unified Interface for AI Completions
 *
 * This adapter provides a consistent, high-level interface for all LLM operations
 * across the AIVO platform. It wraps the LLMOrchestrator to provide:
 *
 * - Simple request/response interface
 * - Automatic provider failover
 * - Metrics and observability
 * - Backward compatibility during migration
 *
 * @module providers/llm-adapter
 */

import type { LLMMessage, LLMCompletionOptions } from './llm-provider.interface.js';
import { incrementCounter, recordHistogram } from './metrics-helper.js';

import { getOrchestrator } from './index.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Simplified LLM request for common use cases
 */
export interface LLMRequest {
  /** Main user prompt */
  prompt: string;
  /** Optional system prompt for context/instructions */
  systemPrompt?: string;
  /** Temperature for generation (0.0-2.0, default 0.7) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Additional context passed to the model */
  context?: Record<string, unknown>;
  /** Agent type for metrics tracking */
  agentType?: string;
  /** Tenant ID for metrics tracking */
  tenantId?: string;
}

/**
 * Standardized LLM response
 */
export interface LLMResponse {
  /** Generated content */
  content: string;
  /** Provider that fulfilled the request */
  provider: string;
  /** Model used for generation */
  model: string;
  /** Token usage statistics */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Request latency in milliseconds */
  latencyMs: number;
  /** Whether a fallback provider was used */
  usedFallback: boolean;
  /** Finish reason from the model */
  finishReason?: string;
}

/**
 * Error thrown when all LLM providers fail
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly errors: Error[],
    public readonly attemptedProviders: string[]
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN API
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generate a completion using the LLM Orchestrator
 *
 * This is the recommended method for obtaining LLM completions across all services.
 * It automatically handles provider failover, metrics, and error handling.
 *
 * @example
 * ```typescript
 * const response = await generateCompletion({
 *   prompt: 'Generate a math question for grade 3',
 *   systemPrompt: 'You are an educational content generator.',
 *   temperature: 0.7,
 *   agentType: 'BASELINE',
 *   tenantId: 'tenant-123',
 * });
 * console.log(response.content);
 * ```
 */
export async function generateCompletion(request: LLMRequest): Promise<LLMResponse> {
  const startTime = Date.now();
  const orchestrator = getOrchestrator();

  // Build message array
  const messages: LLMMessage[] = [];

  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }

  messages.push({ role: 'user', content: request.prompt });

  // Build options
  const options: LLMCompletionOptions = {
    temperature: request.temperature ?? 0.7,
    maxTokens: request.maxTokens,
  };

  // Track metrics labels
  const metricsLabels = {
    agentType: request.agentType ?? 'unknown',
    tenantId: request.tenantId ?? 'unknown',
  };

  try {
    const result = await orchestrator.complete(messages, options);
    const latencyMs = Date.now() - startTime;

    // Record success metrics
    incrementCounter('llm.adapter.request.success', metricsLabels);
    recordHistogram('llm.adapter.latency_ms', latencyMs, metricsLabels);

    if (result.usage) {
      incrementCounter('llm.adapter.tokens.input', metricsLabels, result.usage.promptTokens);
      incrementCounter('llm.adapter.tokens.output', metricsLabels, result.usage.completionTokens);
    }

    return {
      content: result.content,
      provider: result.provider,
      model: result.model,
      usage: result.usage
        ? {
            inputTokens: result.usage.promptTokens,
            outputTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
      latencyMs,
      usedFallback: result.provider !== getOrchestrator().getPrimaryProvider(),
      finishReason: result.finishReason,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Record failure metrics
    incrementCounter('llm.adapter.request.failed', metricsLabels);
    recordHistogram('llm.adapter.latency_ms', latencyMs, metricsLabels);

    if (error instanceof AggregateError) {
      throw new LLMProviderError(
        'All LLM providers failed',
        error.errors as Error[],
        getOrchestrator().getProviderNames()
      );
    }

    throw error;
  }
}

/**
 * Generate a completion with structured output (JSON)
 *
 * @example
 * ```typescript
 * const result = await generateJsonCompletion<{ question: string; answer: string }>({
 *   prompt: 'Generate a math question and answer',
 *   systemPrompt: 'Respond with JSON: { "question": "...", "answer": "..." }',
 * });
 * console.log(result.data.question);
 * ```
 */
export async function generateJsonCompletion<T = unknown>(
  request: LLMRequest
): Promise<LLMResponse & { data: T }> {
  // Add JSON instruction to system prompt if not present
  const systemPrompt = request.systemPrompt ?? '';
  const jsonInstruction = 'Respond with valid JSON only. No markdown, no explanation.';
  const enhancedSystemPrompt = systemPrompt.toLowerCase().includes('json')
    ? systemPrompt
    : `${systemPrompt}\n\n${jsonInstruction}`;

  const response = await generateCompletion({
    ...request,
    systemPrompt: enhancedSystemPrompt,
  });

  // Parse JSON from response
  try {
    // Try to extract JSON from potential markdown code blocks
    let jsonContent = response.content.trim();

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const data = JSON.parse(jsonContent) as T;
    return { ...response, data };
  } catch (parseError) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${(parseError as Error).message}\nContent: ${response.content}`
    );
  }
}

/**
 * Check if the LLM orchestrator is available and has at least one provider
 */
export function isLLMAvailable(): boolean {
  try {
    const orchestrator = getOrchestrator();
    return orchestrator.getProviderNames().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get health status of all LLM providers
 */
export function getLLMHealth(): {
  available: boolean;
  providers: { name: string; healthy: boolean }[];
  primaryProvider: string;
} {
  try {
    const orchestrator = getOrchestrator();
    const health = orchestrator.getProvidersHealth();

    return {
      available: health.some((p) => p.healthy),
      providers: health.map((p) => ({ name: p.name, healthy: p.healthy })),
      primaryProvider: orchestrator.getPrimaryProvider(),
    };
  } catch {
    // Return unavailable status if orchestrator cannot be initialized
    return {
      available: false,
      providers: [],
      primaryProvider: 'unknown',
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY (DEPRECATED)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Legacy provider interface for backward compatibility
 *
 * @deprecated Use `generateCompletion()` or `getOrchestrator()` instead.
 * This function exists only to ease migration from the old `getProvider()` pattern.
 * It will be removed in a future version.
 */
export function getLegacyProvider() {
  console.warn(
    '[DEPRECATED] getLegacyProvider() is deprecated. ' +
      'Migrate to generateCompletion() or getOrchestrator() for production use.'
  );

  return {
    /**
     * @deprecated Use generateCompletion() instead
     */
    async generateCompletion(params: {
      prompt: string;
      promptTemplate?: string;
      temperature?: number;
      maxTokens?: number;
    }): Promise<{ text: string; tokensUsed: number }> {
      console.warn(
        '[DEPRECATED] provider.generateCompletion() is deprecated. ' +
          'Use the generateCompletion() function from llm-adapter.ts instead.'
      );

      const response = await generateCompletion({
        prompt: params.prompt,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      return {
        text: response.content,
        tokensUsed: response.usage?.totalTokens ?? 0,
      };
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export type {
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
} from './llm-provider.interface.js';
