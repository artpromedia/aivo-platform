import { config } from '../config.js';
import type { LLMProvider } from '../types/agent.js';

import {
  createFailoverRegistry,
  type ProviderHealth,
  type ProviderFailoverRegistry,
} from './failover.js';
import type { LLMOrchestrator } from './llm-orchestrator.js';
import { createLLMOrchestratorFromEnv } from './llm-orchestrator.js';
import { MockLLMProvider } from './MockLLMProvider.js';

// Singleton instances
let failoverRegistry: ProviderFailoverRegistry | null = null;
let _llmOrchestrator: LLMOrchestrator | null = null;

// ════════════════════════════════════════════════════════════════════════════════
// PRODUCTION-READY PROVIDER ACCESS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get the LLM Orchestrator instance (RECOMMENDED)
 *
 * This is the primary method for obtaining LLM access in production.
 * Supports: Google Gemini, OpenAI, Anthropic, Ollama with automatic failover.
 *
 * @example
 * const orchestrator = getOrchestrator();
 * const result = await orchestrator.complete([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 */
export function getOrchestrator(): LLMOrchestrator {
  if (!_llmOrchestrator) {
    _llmOrchestrator = createLLMOrchestratorFromEnv();
  }
  return _llmOrchestrator;
}

// ════════════════════════════════════════════════════════════════════════════════
// LEGACY PROVIDER ACCESS (DEPRECATED)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get a single provider by name (DEPRECATED - use getOrchestrator() instead)
 *
 * @deprecated This function only returns MockLLMProvider and does not support
 * production LLM providers. Use `getOrchestrator()` for production workloads.
 *
 * In production (NODE_ENV=production), this function will throw an error
 * to prevent accidental use of mock data.
 */
export function getProvider(providerName?: string): LLMProvider {
  const provider = (providerName ?? config.provider).toUpperCase();
  const isProduction = config.nodeEnv === 'production';

  // In production, reject mock provider usage through this legacy function
  if (isProduction && provider !== 'MOCK') {
    console.warn(
      '[DEPRECATED] getProvider() called in production. ' +
        'This function is deprecated and only returns MockLLMProvider. ' +
        'Use getOrchestrator() instead for production workloads.'
    );
  }

  // If explicitly requesting mock OR in development with mock config
  if (provider === 'MOCK') {
    return new MockLLMProvider(config.mockSeed);
  }

  // For any other provider request in production, throw error to force migration
  if (isProduction) {
    throw new Error(
      'getProvider() is deprecated and cannot be used in production. ' +
        'Migrate to getOrchestrator() which supports Google, OpenAI, Anthropic, and Ollama ' +
        'with automatic failover. See: services/ai-orchestrator/src/providers/llm-orchestrator.ts'
    );
  }

  // In development, warn but allow fallback to mock for backwards compatibility
  console.warn(
    `[DEPRECATED] getProvider("${provider}") returning MockLLMProvider. ` +
      'Migrate to getOrchestrator() for real LLM access.'
  );
  return new MockLLMProvider(config.mockSeed);
}

/**
 * Initialize the failover registry with configured providers
 */
export function initializeFailoverRegistry(): ProviderFailoverRegistry {
  if (failoverRegistry) {
    return failoverRegistry;
  }

  // Configure providers based on environment
  const providers: {
    name: string;
    provider: LLMProvider;
    priority: number;
    maxFailures?: number;
    resetTimeout?: number;
  }[] = [];

  // Primary provider from config
  const primaryProvider = config.provider.toUpperCase();

  if (primaryProvider === 'MOCK' || !primaryProvider) {
    providers.push({
      name: 'mock-primary',
      provider: new MockLLMProvider(config.mockSeed),
      priority: 0,
    });
  }

  // NOTE: Future integration - add real providers when available
  // Example:
  // if (process.env.OPENAI_API_KEY) {
  //   providers.push({
  //     name: 'openai',
  //     provider: new OpenAIProvider(process.env.OPENAI_API_KEY),
  //     priority: 0,
  //     maxFailures: 3,
  //     resetTimeout: 60000,
  //   });
  // }
  //
  // if (process.env.ANTHROPIC_API_KEY) {
  //   providers.push({
  //     name: 'anthropic',
  //     provider: new AnthropicProvider(process.env.ANTHROPIC_API_KEY),
  //     priority: 1, // Fallback
  //     maxFailures: 3,
  //     resetTimeout: 60000,
  //   });
  // }

  // Add mock provider as ultimate fallback if no other providers
  if (providers.length === 0) {
    providers.push({
      name: 'mock-fallback',
      provider: new MockLLMProvider(config.mockSeed),
      priority: 100,
    });
  }

  failoverRegistry = createFailoverRegistry(providers, {
    maxRetries: 3,
    timeout: 120000, // 2 minutes for AI calls
    enableHealthChecks: true,
    healthCheckInterval: 60000,
  });

  // Log provider events
  failoverRegistry.on('circuitOpened', (name: string, health: ProviderHealth) => {
    console.warn(`[AI Failover] Circuit opened for provider ${name}. Failures: ${health.failures}`);
  });

  failoverRegistry.on('circuitClosed', (name: string) => {
    console.info(`[AI Failover] Circuit closed for provider ${name}. Provider recovered.`);
  });

  failoverRegistry.on('providerFailed', (name: string, error: Error) => {
    console.error(`[AI Failover] Provider ${name} failed:`, error.message);
  });

  failoverRegistry.on('allProvidersFailed', (error: Error) => {
    console.error(`[AI Failover] All providers failed:`, error.message);
  });

  // Start health checks
  failoverRegistry.startHealthChecks();

  return failoverRegistry;
}

/**
 * Get the failover registry instance
 */
export function getFailoverRegistry(): ProviderFailoverRegistry {
  if (!failoverRegistry) {
    return initializeFailoverRegistry();
  }
  return failoverRegistry;
}

/**
 * Get health status of all providers
 */
export function getProvidersHealth(): ProviderHealth[] {
  return getFailoverRegistry().getHealthStatus();
}

/**
 * Execute an AI operation with automatic failover
 */
export async function executeWithFailover<T>(
  operation: (provider: LLMProvider) => Promise<T>,
  context?: { tenantId?: string; requestId?: string }
): Promise<T> {
  return getFailoverRegistry().executeWithFailover(operation, context);
}

// Re-exports
export {
  ProviderFailoverRegistry,
  createFailoverRegistry,
  CircuitState,
  type ProviderHealth,
} from './failover.js';

export { ProviderRouter, type ProviderInvocationResult } from './providerRouter.js';

// New LLM Provider exports
export type {
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
  LLMProviderInterface,
  LLMProviderConfig,
  OpenAIConfig,
  AnthropicConfig,
  GoogleGeminiConfig,
  LLMOrchestratorConfig,
} from './llm-provider.interface.js';

export { OpenAIProvider } from './openai.provider.js';
export { AnthropicProvider } from './anthropic.provider.js';
export { GoogleGeminiProvider } from './google-gemini.provider.js';
export { OllamaProvider } from './ollama.provider.js';
export {
  LLMOrchestrator,
  createLLMOrchestratorFromEnv,
  getLLMOrchestrator,
} from './llm-orchestrator.js';

// Environment validation
export {
  validateEnvironment,
  validateAndStartOrFail,
  getEnvironmentConfig,
  type ValidationResult,
  type EnvironmentConfig,
} from '../utils/env-validator.js';
