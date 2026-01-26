/**
 * Provider Configuration
 *
 * Default and runtime configuration for AI providers.
 * Supports environment-based configuration and tenant overrides.
 */

import type { AIProvider, RateLimitConfig, HealthCheckConfig } from '../providers/registry.js';
import type { FailoverConfig } from '../routing/failover-handler.js';
import type { CircuitBreakerConfig } from '../routing/circuit-breaker.js';

// ============================================================================
// Types
// ============================================================================

export interface ProviderConfigEntry {
  enabled: boolean;
  priority: number;
  models: string[];
  rateLimits: RateLimitConfig;
  healthCheck?: Partial<HealthCheckConfig>;
  apiKeyEnvVar?: string;
  baseUrl?: string;
}

export interface ProvidersConfig {
  openai: ProviderConfigEntry;
  anthropic: ProviderConfigEntry;
  google: ProviderConfigEntry;
  mistral: ProviderConfigEntry;
  cohere: ProviderConfigEntry;
}

export interface GatewayConfig {
  providers: ProvidersConfig;
  routing: RoutingConfig;
  failover: FailoverConfig;
  circuitBreaker: CircuitBreakerConfig;
  cache: CacheConfig;
  tenantDefaults: TenantDefaultConfig;
}

export interface RoutingConfig {
  defaultProvider: string;
  fallbackOrder: string[];
  preferCheapestModel: boolean;
  maxLatencyMs: number;
  timeoutMs: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  redisUrl?: string;
}

export interface TenantDefaultConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  dailyBudgetUsd?: number;
  monthlyBudgetUsd?: number;
  allowedProviders: string[];
  preferredProvider?: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultProviderConfig: ProvidersConfig = {
  openai: {
    enabled: true,
    priority: 1,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    rateLimits: {
      requestsPerMinute: 500,
      tokensPerMinute: 150000,
      requestsPerDay: 10000,
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
    },
    apiKeyEnvVar: 'OPENAI_API_KEY',
  },
  anthropic: {
    enabled: true,
    priority: 2,
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    rateLimits: {
      requestsPerMinute: 300,
      tokensPerMinute: 100000,
      requestsPerDay: 10000,
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
    },
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
  },
  google: {
    enabled: true,
    priority: 3,
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-pro'],
    rateLimits: {
      requestsPerMinute: 360,
      tokensPerMinute: 120000,
      requestsPerDay: 1500,
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
    },
    apiKeyEnvVar: 'GOOGLE_API_KEY',
  },
  mistral: {
    enabled: true,
    priority: 4,
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
    rateLimits: {
      requestsPerMinute: 120,
      tokensPerMinute: 500000,
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
    },
    apiKeyEnvVar: 'MISTRAL_API_KEY',
  },
  cohere: {
    enabled: true,
    priority: 5,
    models: ['command-r-plus', 'command-r', 'command', 'command-light'],
    rateLimits: {
      requestsPerMinute: 100,
      tokensPerMinute: 100000,
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
    },
    apiKeyEnvVar: 'COHERE_API_KEY',
  },
};

export const defaultRoutingConfig: RoutingConfig = {
  defaultProvider: 'openai',
  fallbackOrder: ['openai', 'anthropic', 'google', 'mistral', 'cohere'],
  preferCheapestModel: false,
  maxLatencyMs: 30000,
  timeoutMs: 60000,
};

export const defaultFailoverConfig: FailoverConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  maxDelayMs: 10000,
  jitterFactor: 0.2,
  retryableErrors: [
    'ServiceUnavailableError',
    'TimeoutError',
    'ECONNRESET',
    'ETIMEDOUT',
  ],
  failoverErrors: [
    'RateLimitError',
    'ContextLengthError',
    'CircuitBreakerOpenError',
  ],
  requestTimeoutMs: 60000,
  totalTimeoutMs: 180000,
};

export const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  monitoringWindow: 60000,
  halfOpenMaxRequests: 3,
};

export const defaultCacheConfig: CacheConfig = {
  enabled: true,
  ttlSeconds: 3600,
  maxSize: 10000,
};

export const defaultTenantConfig: TenantDefaultConfig = {
  maxRequestsPerMinute: 100,
  maxTokensPerMinute: 100000,
  allowedProviders: ['openai', 'anthropic', 'google', 'mistral', 'cohere'],
};

// ============================================================================
// Configuration Loader
// ============================================================================

export class ConfigurationManager {
  private config: GatewayConfig;
  private tenantOverrides = new Map<string, Partial<TenantDefaultConfig>>();

  constructor(customConfig?: Partial<GatewayConfig>) {
    this.config = {
      providers: { ...defaultProviderConfig, ...customConfig?.providers },
      routing: { ...defaultRoutingConfig, ...customConfig?.routing },
      failover: { ...defaultFailoverConfig, ...customConfig?.failover },
      circuitBreaker: { ...defaultCircuitBreakerConfig, ...customConfig?.circuitBreaker },
      cache: { ...defaultCacheConfig, ...customConfig?.cache },
      tenantDefaults: { ...defaultTenantConfig, ...customConfig?.tenantDefaults },
    };
  }

  /**
   * Get full configuration
   */
  getConfig(): GatewayConfig {
    return this.config;
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerId: string): ProviderConfigEntry | undefined {
    return this.config.providers[providerId as keyof ProvidersConfig];
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): string[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([id]) => id);
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerId: string): boolean {
    const config = this.config.providers[providerId as keyof ProvidersConfig];
    return config?.enabled ?? false;
  }

  /**
   * Update provider configuration at runtime
   */
  updateProviderConfig(providerId: string, updates: Partial<ProviderConfigEntry>): void {
    const providerKey = providerId as keyof ProvidersConfig;
    if (this.config.providers[providerKey]) {
      this.config.providers[providerKey] = {
        ...this.config.providers[providerKey],
        ...updates,
      };
    }
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    this.updateProviderConfig(providerId, { enabled });
  }

  /**
   * Set tenant-specific configuration overrides
   */
  setTenantOverrides(tenantId: string, overrides: Partial<TenantDefaultConfig>): void {
    this.tenantOverrides.set(tenantId, overrides);
  }

  /**
   * Get configuration for a specific tenant
   */
  getTenantConfig(tenantId: string): TenantDefaultConfig {
    const overrides = this.tenantOverrides.get(tenantId);
    if (overrides) {
      return { ...this.config.tenantDefaults, ...overrides };
    }
    return this.config.tenantDefaults;
  }

  /**
   * Clear tenant overrides
   */
  clearTenantOverrides(tenantId: string): boolean {
    return this.tenantOverrides.delete(tenantId);
  }

  /**
   * Get routing configuration
   */
  getRoutingConfig(): RoutingConfig {
    return this.config.routing;
  }

  /**
   * Get failover configuration
   */
  getFailoverConfig(): FailoverConfig {
    return this.config.failover;
  }

  /**
   * Get circuit breaker configuration
   */
  getCircuitBreakerConfig(): CircuitBreakerConfig {
    return this.config.circuitBreaker;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return this.config.cache;
  }

  /**
   * Load configuration from environment variables
   */
  static fromEnvironment(): ConfigurationManager {
    const config: Partial<GatewayConfig> = {};

    // Load provider configurations from environment
    const providers: Partial<ProvidersConfig> = {};

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      providers.openai = {
        ...defaultProviderConfig.openai,
        enabled: process.env.OPENAI_ENABLED !== 'false',
        priority: parseInt(process.env.OPENAI_PRIORITY ?? '1', 10),
        rateLimits: {
          requestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_RPM ?? '500', 10),
          tokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TPM ?? '150000', 10),
        },
      };
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      providers.anthropic = {
        ...defaultProviderConfig.anthropic,
        enabled: process.env.ANTHROPIC_ENABLED !== 'false',
        priority: parseInt(process.env.ANTHROPIC_PRIORITY ?? '2', 10),
        rateLimits: {
          requestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_RPM ?? '300', 10),
          tokensPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_TPM ?? '100000', 10),
        },
      };
    }

    // Google
    const googleApiKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      providers.google = {
        ...defaultProviderConfig.google,
        enabled: process.env.GOOGLE_ENABLED !== 'false',
        priority: parseInt(process.env.GOOGLE_PRIORITY ?? '3', 10),
        rateLimits: {
          requestsPerMinute: parseInt(process.env.GOOGLE_RATE_LIMIT_RPM ?? '360', 10),
          tokensPerMinute: parseInt(process.env.GOOGLE_RATE_LIMIT_TPM ?? '120000', 10),
        },
      };
    }

    // Mistral
    if (process.env.MISTRAL_API_KEY) {
      providers.mistral = {
        ...defaultProviderConfig.mistral,
        enabled: process.env.MISTRAL_ENABLED !== 'false',
        priority: parseInt(process.env.MISTRAL_PRIORITY ?? '4', 10),
      };
    }

    // Cohere
    if (process.env.COHERE_API_KEY) {
      providers.cohere = {
        ...defaultProviderConfig.cohere,
        enabled: process.env.COHERE_ENABLED !== 'false',
        priority: parseInt(process.env.COHERE_PRIORITY ?? '5', 10),
      };
    }

    config.providers = providers as ProvidersConfig;

    // Load routing configuration
    if (process.env.AI_DEFAULT_PROVIDER || process.env.AI_FALLBACK_ORDER) {
      config.routing = {
        ...defaultRoutingConfig,
        defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? defaultRoutingConfig.defaultProvider,
        fallbackOrder: process.env.AI_FALLBACK_ORDER
          ? process.env.AI_FALLBACK_ORDER.split(',').map((s) => s.trim())
          : defaultRoutingConfig.fallbackOrder,
      };
    }

    // Load cache configuration
    if (process.env.AI_CACHE_ENABLED !== undefined || process.env.AI_CACHE_REDIS_URL) {
      config.cache = {
        ...defaultCacheConfig,
        enabled: process.env.AI_CACHE_ENABLED !== 'false',
        ttlSeconds: parseInt(process.env.AI_CACHE_TTL_SECONDS ?? '3600', 10),
        redisUrl: process.env.AI_CACHE_REDIS_URL,
      };
    }

    return new ConfigurationManager(config);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let configInstance: ConfigurationManager | null = null;

export function getConfigurationManager(): ConfigurationManager {
  if (!configInstance) {
    configInstance = ConfigurationManager.fromEnvironment();
  }
  return configInstance;
}

export function resetConfigurationManager(): void {
  configInstance = null;
}
