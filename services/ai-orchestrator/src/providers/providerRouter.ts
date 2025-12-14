/**
 * Provider Router Module
 *
 * Tenant-aware provider selection with failover support.
 * Responsibilities:
 * - Select appropriate provider based on tenant config
 * - Support model overrides per agent type
 * - Integrate with failover registry for resilience
 * - Track failover metrics
 *
 * Design:
 * - Integrates with existing ProviderFailoverRegistry
 * - Supports tenant-specific configurations
 * - Emits events for observability
 */

import { EventEmitter } from 'node:events';

import type { LLMProvider, IAgentResponse, GenerateParams } from '../types/agent.js';
import type {
  AiAgentType,
  AiProvider,
  AiRequest,
  ProviderSelection,
  TenantAiConfig,
} from '../types/aiRequest.js';

import { ProviderFailoverRegistry, CircuitState, type ProviderHealth } from './failover.js';
import { MockLLMProvider } from './MockLLMProvider.js';

// ────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Default model mapping per provider and agent type.
 */
const DEFAULT_MODEL_MAPPING: Record<AiProvider, Record<AiAgentType, string>> = {
  OPENAI: {
    BASELINE: 'gpt-4o-mini',
    TUTOR: 'gpt-4o',
    HOMEWORK_HELPER: 'gpt-4o',
    FOCUS: 'gpt-4o-mini',
    INSIGHTS: 'gpt-4o',
    VIRTUAL_BRAIN: 'gpt-4o',
    LESSON_PLANNER: 'gpt-4o',
    PROGRESS: 'gpt-4o-mini',
    SAFETY: 'gpt-4o-mini',
    OTHER: 'gpt-4o-mini',
  },
  ANTHROPIC: {
    BASELINE: 'claude-3-haiku-20240307',
    TUTOR: 'claude-3-5-sonnet-20241022',
    HOMEWORK_HELPER: 'claude-3-5-sonnet-20241022',
    FOCUS: 'claude-3-haiku-20240307',
    INSIGHTS: 'claude-3-5-sonnet-20241022',
    VIRTUAL_BRAIN: 'claude-3-5-sonnet-20241022',
    LESSON_PLANNER: 'claude-3-5-sonnet-20241022',
    PROGRESS: 'claude-3-haiku-20240307',
    SAFETY: 'claude-3-haiku-20240307',
    OTHER: 'claude-3-haiku-20240307',
  },
  GEMINI: {
    BASELINE: 'gemini-1.5-flash',
    TUTOR: 'gemini-1.5-pro',
    HOMEWORK_HELPER: 'gemini-1.5-pro',
    FOCUS: 'gemini-1.5-flash',
    INSIGHTS: 'gemini-1.5-pro',
    VIRTUAL_BRAIN: 'gemini-1.5-pro',
    LESSON_PLANNER: 'gemini-1.5-pro',
    PROGRESS: 'gemini-1.5-flash',
    SAFETY: 'gemini-1.5-flash',
    OTHER: 'gemini-1.5-flash',
  },
  MOCK: {
    BASELINE: 'mock-model',
    TUTOR: 'mock-model',
    HOMEWORK_HELPER: 'mock-model',
    FOCUS: 'mock-model',
    INSIGHTS: 'mock-model',
    VIRTUAL_BRAIN: 'mock-model',
    LESSON_PLANNER: 'mock-model',
    PROGRESS: 'mock-model',
    SAFETY: 'mock-model',
    OTHER: 'mock-model',
  },
};

/**
 * Default provider priority order.
 */
const DEFAULT_PROVIDER_PRIORITY: AiProvider[] = ['OPENAI', 'ANTHROPIC', 'GEMINI'];

/**
 * Default tenant AI configuration.
 */
const DEFAULT_TENANT_CONFIG: TenantAiConfig = {
  allowedProviders: ['OPENAI', 'ANTHROPIC', 'GEMINI', 'MOCK'],
  providerPriority: DEFAULT_PROVIDER_PRIORITY,
  dailyTokenLimit: 0, // Unlimited
  contentFilterLevel: 'STANDARD',
  enablePiiRedaction: true,
};

/**
 * Cost per 1K tokens by provider and model (in USD).
 */
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'OPENAI:gpt-4o': { input: 0.0025, output: 0.01 },
  'OPENAI:gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'OPENAI:gpt-4-turbo': { input: 0.01, output: 0.03 },

  // Anthropic
  'ANTHROPIC:claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'ANTHROPIC:claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },

  // Gemini
  'GEMINI:gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'GEMINI:gemini-1.5-flash': { input: 0.000075, output: 0.0003 },

  // Mock
  'MOCK:mock-model': { input: 0, output: 0 },
};

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER ROUTER CLASS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Events emitted by the ProviderRouter.
 */
export interface ProviderRouterEvents {
  providerSelected: (tenantId: string, provider: AiProvider, model: string) => void;
  failoverInitiated: (tenantId: string, from: AiProvider, to: AiProvider, reason: string) => void;
  allProvidersFailed: (tenantId: string, error: Error) => void;
  quotaExceeded: (tenantId: string, current: number, limit: number) => void;
}

/**
 * Result from invoking a provider.
 */
export interface ProviderInvocationResult {
  success: boolean;
  response?: IAgentResponse<string> | undefined;
  provider: AiProvider;
  model: string;
  failoverOccurred: boolean;
  originalProvider?: AiProvider | undefined;
  error?: Error | undefined;
  latencyMs: number;
}

/**
 * Provider Router - Manages provider selection and failover.
 */
export class ProviderRouter extends EventEmitter {
  private readonly failoverRegistry: ProviderFailoverRegistry;
  private readonly tenantConfigs = new Map<string, TenantAiConfig>();
  private readonly providers = new Map<AiProvider, LLMProvider>();

  constructor(failoverRegistry?: ProviderFailoverRegistry) {
    super();
    this.failoverRegistry = failoverRegistry ?? new ProviderFailoverRegistry();

    // Initialize default mock provider
    this.providers.set('MOCK', new MockLLMProvider('default-seed'));
  }

  /**
   * Register a provider implementation.
   */
  registerProvider(providerType: AiProvider, provider: LLMProvider): void {
    this.providers.set(providerType, provider);

    // Also register with failover registry
    const priority = DEFAULT_PROVIDER_PRIORITY.indexOf(providerType);
    this.failoverRegistry.registerProvider({
      name: providerType,
      priority: priority >= 0 ? priority : 99,
      provider,
      maxFailures: 3,
      resetTimeout: 30000,
      healthCheckInterval: 60000,
    });
  }

  /**
   * Set tenant-specific configuration.
   */
  setTenantConfig(tenantId: string, config: Partial<TenantAiConfig>): void {
    const existing = this.tenantConfigs.get(tenantId) ?? { ...DEFAULT_TENANT_CONFIG };
    this.tenantConfigs.set(tenantId, { ...existing, ...config });
  }

  /**
   * Get tenant configuration.
   */
  getTenantConfig(tenantId: string): TenantAiConfig {
    return this.tenantConfigs.get(tenantId) ?? DEFAULT_TENANT_CONFIG;
  }

  /**
   * Select the best provider for a request.
   *
   * @param request - The AI request
   * @returns Provider selection with provider and model
   */
  selectProvider(request: AiRequest): ProviderSelection {
    const config = this.getTenantConfig(request.tenantId);

    // Check for agent-type override
    if (config.modelOverrides?.[request.agentType]) {
      const override = config.modelOverrides[request.agentType]!;
      return {
        provider: override.provider,
        model: override.model,
        priority: 0,
      };
    }

    // Use priority order from tenant config
    const providerOrder = config.providerPriority.filter((p) =>
      config.allowedProviders.includes(p)
    );

    // Find first healthy provider
    for (let i = 0; i < providerOrder.length; i++) {
      const providerType = providerOrder[i];
      if (!providerType) continue;

      const health = this.failoverRegistry.getProviderHealth(providerType);

      if (
        !health ||
        health.state === CircuitState.CLOSED ||
        health.state === CircuitState.HALF_OPEN
      ) {
        const model = DEFAULT_MODEL_MAPPING[providerType][request.agentType];
        this.emit('providerSelected', request.tenantId, providerType, model);

        return {
          provider: providerType,
          model,
          priority: i,
        };
      }
    }

    // Fallback to mock if all others are unhealthy
    return {
      provider: 'MOCK',
      model: 'mock-model',
      priority: 99,
    };
  }

  /**
   * Get a list of fallback providers for a request.
   */
  getFallbackProviders(request: AiRequest): ProviderSelection[] {
    const config = this.getTenantConfig(request.tenantId);
    const providerOrder = config.providerPriority.filter((p) =>
      config.allowedProviders.includes(p)
    );

    return providerOrder
      .filter((providerType): providerType is AiProvider => providerType !== undefined)
      .map((providerType, index) => ({
        provider: providerType,
        model: DEFAULT_MODEL_MAPPING[providerType][request.agentType],
        priority: index,
      }));
  }

  /**
   * Invoke a provider with automatic failover.
   *
   * @param request - The AI request
   * @param prompt - The prompt to send
   * @param params - Additional generation params
   * @returns Invocation result with response and metadata
   */
  async invokeWithFailover(
    request: AiRequest,
    prompt: string,
    params?: Partial<GenerateParams>
  ): Promise<ProviderInvocationResult> {
    const startTime = Date.now();
    const fallbacks = this.getFallbackProviders(request);
    const primary = fallbacks[0];

    // Ensure we have at least one provider
    if (!primary) {
      return {
        success: false,
        provider: 'MOCK',
        model: 'mock-model',
        failoverOccurred: false,
        error: new Error('No providers configured'),
        latencyMs: Date.now() - startTime,
      };
    }

    let lastError: Error | null = null;
    let originalProvider: AiProvider | undefined;
    let failoverOccurred = false;

    for (let i = 0; i < fallbacks.length; i++) {
      const selection = fallbacks[i];
      if (!selection) continue;

      const provider = this.providers.get(selection.provider);

      if (!provider) {
        continue; // Provider not registered
      }

      // Track if this is a failover
      if (i > 0) {
        failoverOccurred = true;
        originalProvider = primary.provider;
        const prevSelection = fallbacks[i - 1];
        if (prevSelection) {
          this.emit(
            'failoverInitiated',
            request.tenantId,
            prevSelection.provider,
            selection.provider,
            lastError?.message ?? 'Previous provider failed'
          );
        }
      }

      try {
        const response = await this.invokeProvider(provider, prompt, selection.model, params);

        return {
          success: true,
          response,
          provider: selection.provider,
          model: selection.model,
          failoverOccurred,
          originalProvider,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;
        // Continue to next provider
      }
    }

    // All providers failed
    this.emit(
      'allProvidersFailed',
      request.tenantId,
      lastError ?? new Error('All providers failed')
    );

    return {
      success: false,
      provider: primary.provider,
      model: primary.model,
      failoverOccurred,
      originalProvider,
      error: lastError ?? new Error('All providers failed'),
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Invoke a single provider.
   */
  private async invokeProvider(
    provider: LLMProvider,
    prompt: string,
    model: string,
    params?: Partial<GenerateParams>
  ): Promise<IAgentResponse<string>> {
    return provider.generateCompletion({
      prompt,
      modelName: model,
      ...params,
    });
  }

  /**
   * Calculate estimated cost for a request.
   */
  estimateCost(
    provider: AiProvider,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const key = `${provider}:${model}`;
    const rates = COST_PER_1K_TOKENS[key];

    if (!rates) {
      return 0;
    }

    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;

    // Return cost in cents
    return Math.round((inputCost + outputCost) * 100);
  }

  /**
   * Get health status for all providers.
   */
  getProvidersHealth(): ProviderHealth[] {
    return this.failoverRegistry.getHealthStatus();
  }

  /**
   * Manually reset a circuit breaker.
   */
  resetCircuit(provider: AiProvider): boolean {
    return this.failoverRegistry.resetCircuit(provider);
  }

  /**
   * Start health check monitoring.
   */
  startHealthChecks(): void {
    this.failoverRegistry.startHealthChecks();
  }

  /**
   * Stop health check monitoring.
   */
  stopHealthChecks(): void {
    this.failoverRegistry.stopHealthChecks();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.failoverRegistry.destroy();
    this.removeAllListeners();
    this.tenantConfigs.clear();
    this.providers.clear();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SINGLETON & FACTORY
// ────────────────────────────────────────────────────────────────────────────

let globalRouter: ProviderRouter | null = null;

/**
 * Get or create the global provider router.
 */
export function getProviderRouter(): ProviderRouter {
  globalRouter ??= new ProviderRouter();
  return globalRouter;
}

/**
 * Create a new provider router instance.
 */
export function createProviderRouter(failoverRegistry?: ProviderFailoverRegistry): ProviderRouter {
  return new ProviderRouter(failoverRegistry);
}

/**
 * Reset the global router (for testing).
 */
export function resetProviderRouter(): void {
  if (globalRouter) {
    globalRouter.destroy();
    globalRouter = null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the default model for a provider and agent type.
 */
export function getDefaultModel(provider: AiProvider, agentType: AiAgentType): string {
  return DEFAULT_MODEL_MAPPING[provider]?.[agentType] ?? 'mock-model';
}

/**
 * Get cost rates for a provider and model.
 */
export function getCostRates(
  provider: AiProvider,
  model: string
): { input: number; output: number } | null {
  const key = `${provider}:${model}`;
  return COST_PER_1K_TOKENS[key] ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export {
  DEFAULT_MODEL_MAPPING,
  DEFAULT_PROVIDER_PRIORITY,
  DEFAULT_TENANT_CONFIG,
  COST_PER_1K_TOKENS,
};
