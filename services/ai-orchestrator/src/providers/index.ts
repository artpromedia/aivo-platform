import { config } from '../config.js';
import type { LLMProvider } from '../types/agent.js';

import type {
  ProviderFailoverRegistry,
  createFailoverRegistry,
  type ProviderHealth,
} from './failover.js';
import { MockLLMProvider } from './MockLLMProvider.js';

// Singleton failover registry
let failoverRegistry: ProviderFailoverRegistry | null = null;

/**
 * Get a single provider by name (legacy support)
 */
export function getProvider(providerName?: string): LLMProvider {
  const provider = (providerName ?? config.provider).toUpperCase();
  if (provider === 'MOCK') {
    return new MockLLMProvider(config.mockSeed);
  }
  // Future: add OpenAI, Anthropic, etc.
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

  // TODO: Add real providers when available
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

export {
  ProviderRouter,
  type TenantProviderConfig,
  type ProviderSelection,
} from './providerRouter.js';
