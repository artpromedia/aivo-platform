/**
 * AI Provider Failover Registry
 *
 * Implements a resilient provider selection strategy with:
 * - Primary/fallback provider chains
 * - Circuit breaker pattern for failing providers
 * - Automatic failover and recovery
 * - Health monitoring
 * - Tenant-specific provider configurations
 */

import { EventEmitter } from 'node:events';

import type { LLMProvider } from '../types/agent.js';

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, requests blocked
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

export interface ProviderHealth {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  lastError?: string;
  avgLatencyMs: number;
  totalRequests: number;
}

export interface ProviderConfig {
  name: string;
  priority: number; // Lower = higher priority
  provider: LLMProvider;
  maxFailures: number; // Failures before circuit opens
  resetTimeout: number; // ms to wait before half-open
  healthCheckInterval: number; // ms between health checks
}

export interface FailoverConfig {
  /** Maximum retries across all providers */
  maxRetries: number;
  /** Timeout for individual provider calls (ms) */
  timeout: number;
  /** Enable automatic health checks */
  enableHealthChecks: boolean;
  /** Health check interval (ms) */
  healthCheckInterval: number;
}

const DEFAULT_FAILOVER_CONFIG: FailoverConfig = {
  maxRetries: 3,
  timeout: 30000,
  enableHealthChecks: true,
  healthCheckInterval: 60000,
};

interface ProviderState {
  config: ProviderConfig;
  health: ProviderHealth;
  circuitOpenedAt?: Date;
}

/**
 * Provider Failover Registry
 *
 * Manages multiple AI providers with automatic failover and circuit breaker.
 */
export class ProviderFailoverRegistry extends EventEmitter {
  private readonly providers = new Map<string, ProviderState>();
  private readonly config: FailoverConfig;
  private healthCheckTimer?: ReturnType<typeof setTimeout> | undefined;

  constructor(config: Partial<FailoverConfig> = {}) {
    super();
    this.config = { ...DEFAULT_FAILOVER_CONFIG, ...config };
  }

  /**
   * Register a provider with the registry
   */
  registerProvider(providerConfig: ProviderConfig): void {
    const state: ProviderState = {
      config: providerConfig,
      health: {
        name: providerConfig.name,
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        avgLatencyMs: 0,
        totalRequests: 0,
      },
    };

    this.providers.set(providerConfig.name, state);
    this.emit('providerRegistered', providerConfig.name);
  }

  /**
   * Get the best available provider
   * Returns providers in priority order, skipping those with open circuits
   */
  getAvailableProvider(): LLMProvider | null {
    const sortedProviders = this.getSortedProviders();

    for (const state of sortedProviders) {
      // Check if circuit allows requests
      if (this.canAttempt(state)) {
        return state.config.provider;
      }
    }

    return null;
  }

  /**
   * Get all healthy providers in priority order
   */
  getAvailableProviders(): LLMProvider[] {
    return this.getSortedProviders()
      .filter((state) => this.canAttempt(state))
      .map((state) => state.config.provider);
  }

  /**
   * Execute a call with automatic failover
   */
  async executeWithFailover<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    context?: { tenantId?: string; requestId?: string }
  ): Promise<T> {
    const sortedProviders = this.getSortedProviders();
    let lastError: Error | null = null;
    let attempts = 0;

    for (const state of sortedProviders) {
      if (attempts >= this.config.maxRetries) {
        break;
      }

      if (!this.canAttempt(state)) {
        continue;
      }

      attempts++;
      const startTime = Date.now();

      try {
        // If half-open, this is a test request
        if (state.health.state === CircuitState.HALF_OPEN) {
          this.emit('halfOpenAttempt', state.config.name, context);
        }

        const result = await this.withTimeout(
          operation(state.config.provider),
          this.config.timeout
        );

        // Record success
        this.recordSuccess(state, Date.now() - startTime);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.recordFailure(state, lastError);
        this.emit('providerFailed', state.config.name, lastError, context);
      }
    }

    // All providers failed
    this.emit('allProvidersFailed', lastError, context);
    throw new Error(
      `All providers failed after ${attempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Record a successful call
   */
  private recordSuccess(state: ProviderState, latencyMs: number): void {
    state.health.successes++;
    state.health.totalRequests++;
    state.health.lastSuccess = new Date();
    delete state.health.lastError;

    // Update average latency (exponential moving average)
    const alpha = 0.2;
    state.health.avgLatencyMs =
      state.health.avgLatencyMs === 0
        ? latencyMs
        : alpha * latencyMs + (1 - alpha) * state.health.avgLatencyMs;

    // If was half-open, close the circuit
    if (state.health.state === CircuitState.HALF_OPEN) {
      this.closeCircuit(state);
    }

    // Reset failure count on success
    state.health.failures = 0;
  }

  /**
   * Record a failed call
   */
  private recordFailure(state: ProviderState, error: Error): void {
    state.health.failures++;
    state.health.totalRequests++;
    state.health.lastFailure = new Date();
    state.health.lastError = error.message;

    // Check if we should open the circuit
    if (state.health.failures >= state.config.maxFailures) {
      this.openCircuit(state);
    }

    // If was half-open, re-open the circuit
    if (state.health.state === CircuitState.HALF_OPEN) {
      this.openCircuit(state);
    }
  }

  /**
   * Check if a provider can accept requests
   */
  private canAttempt(state: ProviderState): boolean {
    switch (state.health.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if reset timeout has passed
        if (state.circuitOpenedAt) {
          const elapsed = Date.now() - state.circuitOpenedAt.getTime();
          if (elapsed >= state.config.resetTimeout) {
            this.halfOpenCircuit(state);
            return true;
          }
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow one test request
        return true;

      default:
        return false;
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(state: ProviderState): void {
    state.health.state = CircuitState.OPEN;
    state.circuitOpenedAt = new Date();
    this.emit('circuitOpened', state.config.name, state.health);
  }

  /**
   * Move circuit to half-open state
   */
  private halfOpenCircuit(state: ProviderState): void {
    state.health.state = CircuitState.HALF_OPEN;
    this.emit('circuitHalfOpen', state.config.name);
  }

  /**
   * Close the circuit breaker
   */
  private closeCircuit(state: ProviderState): void {
    state.health.state = CircuitState.CLOSED;
    delete state.circuitOpenedAt;
    state.health.failures = 0;
    this.emit('circuitClosed', state.config.name, state.health);
  }

  /**
   * Get providers sorted by priority
   */
  private getSortedProviders(): ProviderState[] {
    return Array.from(this.providers.values()).sort(
      (a, b) => a.config.priority - b.config.priority
    );
  }

  /**
   * Wrap a promise with a timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Provider timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutHandle);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutHandle);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  /**
   * Get health status for all providers
   */
  getHealthStatus(): ProviderHealth[] {
    return Array.from(this.providers.values())
      .sort((a, b) => a.config.priority - b.config.priority)
      .map((state) => ({ ...state.health }));
  }

  /**
   * Get health status for a specific provider
   */
  getProviderHealth(name: string): ProviderHealth | undefined {
    return this.providers.get(name)?.health;
  }

  /**
   * Manually reset a circuit breaker
   */
  resetCircuit(name: string): boolean {
    const state = this.providers.get(name);
    if (state) {
      this.closeCircuit(state);
      return true;
    }
    return false;
  }

  /**
   * Start health check monitoring
   */
  startHealthChecks(): void {
    if (!this.config.enableHealthChecks || this.healthCheckTimer) {
      return;
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.runHealthChecks();
    }, this.config.healthCheckInterval);

    this.emit('healthChecksStarted');
  }

  /**
   * Stop health check monitoring
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined as ReturnType<typeof setTimeout> | undefined;
      this.emit('healthChecksStopped');
    }
  }

  /**
   * Run health checks on all providers
   */
  private async runHealthChecks(): Promise<void> {
    for (const state of this.providers.values()) {
      // Only check providers with open circuits
      if (state.health.state !== CircuitState.OPEN) {
        continue;
      }

      try {
        // Simple ping/health check
        const provider = state.config.provider;
        if ('healthCheck' in provider && typeof provider.healthCheck === 'function') {
          const startTime = Date.now();
          await (provider as { healthCheck: () => Promise<void> }).healthCheck();
          this.recordSuccess(state, Date.now() - startTime);
          this.emit('healthCheckPassed', state.config.name);
        }
      } catch (error) {
        this.emit('healthCheckFailed', state.config.name, error);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopHealthChecks();
    this.providers.clear();
    this.removeAllListeners();
  }
}

/**
 * Create a configured provider failover registry
 */
export function createFailoverRegistry(
  providers: {
    name: string;
    provider: LLMProvider;
    priority?: number;
    maxFailures?: number;
    resetTimeout?: number;
  }[],
  config?: Partial<FailoverConfig>
): ProviderFailoverRegistry {
  const registry = new ProviderFailoverRegistry(config);

  providers.forEach((p, index) => {
    registry.registerProvider({
      name: p.name,
      priority: p.priority ?? index,
      provider: p.provider,
      maxFailures: p.maxFailures ?? 3,
      resetTimeout: p.resetTimeout ?? 30000,
      healthCheckInterval: config?.healthCheckInterval ?? 60000,
    });
  });

  return registry;
}

export default ProviderFailoverRegistry;
