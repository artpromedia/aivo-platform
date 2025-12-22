/**
 * LLM Orchestrator
 *
 * Manages multiple LLM providers with:
 * - Automatic failover between providers
 * - Circuit breaker pattern for resilience
 * - Health monitoring
 * - Unified interface for all AI agents
 */

import { CircuitBreaker, CircuitBreakerState } from '../utils/circuit-breaker.js';

import { AnthropicProvider } from './anthropic.provider.js';
import { GoogleGeminiProvider } from './google-gemini.provider.js';
import type {
  LLMProviderInterface,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
  LLMOrchestratorConfig,
} from './llm-provider.interface.js';
import { incrementCounter } from './metrics-helper.js';
import { OpenAIProvider } from './openai.provider.js';

// Logger helper
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [LLMOrchestrator]`;
  if (level === 'error') {
    console.error(`${prefix} ${message}`, context ?? '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, context ?? '');
  } else {
    console.log(`${prefix} ${message}`, context ?? '');
  }
}

export class LLMOrchestrator {
  private providers = new Map<string, LLMProviderInterface>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private primaryProvider: string;
  private fallbackOrder: string[];

  constructor(config: LLMOrchestratorConfig) {
    // Initialize OpenAI provider
    if (config.openai) {
      const openai = new OpenAIProvider(config.openai);
      this.providers.set('openai', openai);
      this.circuitBreakers.set(
        'openai',
        new CircuitBreaker({
          failureThreshold: 5,
          resetTimeout: 30000,
          onStateChange: (from, to) => {
            log('info', `OpenAI circuit breaker: ${from} -> ${to}`);
            incrementCounter('llm.circuit_breaker.state_change', {
              provider: 'openai',
              from,
              to,
            });
          },
        })
      );
    }

    // Initialize Anthropic provider
    if (config.anthropic) {
      const anthropic = new AnthropicProvider(config.anthropic);
      this.providers.set('anthropic', anthropic);
      this.circuitBreakers.set(
        'anthropic',
        new CircuitBreaker({
          failureThreshold: 5,
          resetTimeout: 30000,
          onStateChange: (from, to) => {
            log('info', `Anthropic circuit breaker: ${from} -> ${to}`);
            incrementCounter('llm.circuit_breaker.state_change', {
              provider: 'anthropic',
              from,
              to,
            });
          },
        })
      );
    }

    // Initialize Google Gemini provider
    if (config.google) {
      const google = new GoogleGeminiProvider(config.google);
      this.providers.set('google', google);
      this.circuitBreakers.set(
        'google',
        new CircuitBreaker({
          failureThreshold: 5,
          resetTimeout: 30000,
          onStateChange: (from, to) => {
            log('info', `Google Gemini circuit breaker: ${from} -> ${to}`);
            incrementCounter('llm.circuit_breaker.state_change', {
              provider: 'google',
              from,
              to,
            });
          },
        })
      );
    }

    // Set primary provider and fallback order
    this.primaryProvider = config.primaryProvider ?? 'openai';
    this.fallbackOrder = config.fallbackOrder ?? ['openai', 'anthropic', 'google'];

    log('info', 'LLM Orchestrator initialized', {
      providers: Array.from(this.providers.keys()),
      primaryProvider: this.primaryProvider,
      fallbackOrder: this.fallbackOrder,
    });
  }

  /**
   * Get a completion from the best available provider
   */
  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const errors: Error[] = [];

    for (const providerName of this.getProviderOrder()) {
      const provider = this.providers.get(providerName);
      const circuitBreaker = this.circuitBreakers.get(providerName);

      if (!provider || !circuitBreaker) continue;

      if (circuitBreaker.isOpen()) {
        log('warn', `Circuit breaker open for ${providerName}, skipping`);
        continue;
      }

      try {
        const result = await circuitBreaker.execute(() => provider.complete(messages, options));

        // Success - record which provider was used
        if (providerName !== this.primaryProvider) {
          incrementCounter('llm.fallback.used', {
            primary: this.primaryProvider,
            fallback: providerName,
          });
          log('info', `Used fallback provider: ${providerName}`);
        }

        return result;
      } catch (error) {
        errors.push(error as Error);
        log('error', `LLM provider ${providerName} failed`, { error });
        incrementCounter('llm.provider.failed', { provider: providerName });
      }
    }

    // All providers failed
    incrementCounter('llm.all_providers.failed');
    throw new AggregateError(errors, 'All LLM providers failed');
  }

  /**
   * Stream a completion from the best available provider
   */
  async *stream(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): AsyncIterable<LLMStreamChunk> {
    const errors: Error[] = [];

    for (const providerName of this.getProviderOrder()) {
      const provider = this.providers.get(providerName);
      const circuitBreaker = this.circuitBreakers.get(providerName);

      if (!provider || !circuitBreaker || circuitBreaker.isOpen()) continue;

      try {
        for await (const chunk of provider.stream(messages, options)) {
          yield chunk;
        }
        // Successfully completed streaming
        circuitBreaker.recordSuccess();

        if (providerName !== this.primaryProvider) {
          incrementCounter('llm.fallback.used', {
            primary: this.primaryProvider,
            fallback: providerName,
          });
        }

        return;
      } catch (error) {
        errors.push(error as Error);
        log('error', `LLM stream provider ${providerName} failed`, { error });
        circuitBreaker.recordFailure(error);
        // Try next provider
      }
    }

    throw new AggregateError(errors, 'All LLM providers failed for streaming');
  }

  /**
   * Check health of all providers
   */
  async healthCheck(): Promise<Record<string, { available: boolean; circuitState: string }>> {
    const results: Record<string, { available: boolean; circuitState: string }> = {};

    for (const [name, provider] of this.providers) {
      const circuitBreaker = this.circuitBreakers.get(name);
      const available = await provider.isAvailable();
      results[name] = {
        available,
        circuitState: circuitBreaker?.getStats().state ?? 'UNKNOWN',
      };
    }

    return results;
  }

  /**
   * Get provider by name (for direct access if needed)
   */
  getProvider(name: string): LLMProviderInterface | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Reset circuit breaker for a specific provider
   */
  resetCircuitBreaker(providerName: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      log('info', `Circuit breaker reset for ${providerName}`);
    }
  }

  /**
   * Get the provider order (primary first, then fallbacks)
   */
  private getProviderOrder(): string[] {
    const order = [this.primaryProvider];
    for (const fallback of this.fallbackOrder) {
      if (fallback !== this.primaryProvider && !order.includes(fallback)) {
        order.push(fallback);
      }
    }
    // Only return providers that are actually registered
    return order.filter((name) => this.providers.has(name));
  }
}

/**
 * Factory function to create an LLM Orchestrator from environment variables
 */
export function createLLMOrchestratorFromEnv(): LLMOrchestrator {
  const config: LLMOrchestratorConfig = {};

  // OpenAI configuration
  if (process.env.OPENAI_API_KEY) {
    config.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      organizationId: process.env.OPENAI_ORGANIZATION_ID,
      rateLimits: {
        tokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TPM ?? '150000', 10),
        requestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_RPM ?? '500', 10),
      },
      cacheConfig: {
        enabled: process.env.LLM_CACHE_ENABLED !== 'false',
        ttlSeconds: parseInt(process.env.LLM_CACHE_TTL_SECONDS ?? '3600', 10),
        redisUrl: process.env.LLM_CACHE_REDIS_URL,
      },
    };
  }

  // Anthropic configuration
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      rateLimits: {
        tokensPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_TPM ?? '100000', 10),
        requestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_RPM ?? '500', 10),
      },
      cacheConfig: {
        enabled: process.env.LLM_CACHE_ENABLED !== 'false',
        ttlSeconds: parseInt(process.env.LLM_CACHE_TTL_SECONDS ?? '3600', 10),
        redisUrl: process.env.LLM_CACHE_REDIS_URL,
      },
    };
  }

  // Google Gemini configuration
  if (process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) {
    config.google = {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY!,
      projectId: process.env.GOOGLE_PROJECT_ID,
      location: process.env.GOOGLE_LOCATION ?? 'us-central1',
      rateLimits: {
        tokensPerMinute: parseInt(process.env.GOOGLE_RATE_LIMIT_TPM ?? '100000', 10),
        requestsPerMinute: parseInt(process.env.GOOGLE_RATE_LIMIT_RPM ?? '500', 10),
      },
      cacheConfig: {
        enabled: process.env.LLM_CACHE_ENABLED !== 'false',
        ttlSeconds: parseInt(process.env.LLM_CACHE_TTL_SECONDS ?? '3600', 10),
        redisUrl: process.env.LLM_CACHE_REDIS_URL,
      },
    };
  }

  // Provider configuration
  config.primaryProvider = process.env.LLM_PRIMARY_PROVIDER ?? 'openai';
  config.fallbackOrder = (process.env.LLM_FALLBACK_ORDER ?? 'openai,anthropic,google')
    .split(',')
    .map((s) => s.trim());

  return new LLMOrchestrator(config);
}
