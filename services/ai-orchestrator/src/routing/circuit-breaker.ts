/**
 * Enhanced Circuit Breaker
 *
 * Implements an enhanced circuit breaker pattern with:
 * - Rolling window failure tracking
 * - Per-model circuit breakers
 * - Metrics integration
 * - Registry for managing multiple breakers
 */

import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ============================================================================
// Types
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Number of successes needed in half-open state to close */
  successThreshold: number;
  /** Time in ms before transitioning from open to half-open */
  timeout: number;
  /** Rolling window for counting failures (ms) */
  monitoringWindow: number;
  /** Maximum number of requests allowed in half-open state */
  halfOpenMaxRequests?: number;
  /** Callback for state changes */
  onStateChange?: (from: CircuitState, to: CircuitState, id: string) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  lastStateChange?: Date;
  lastError?: string;
  failureRate: number;
}

export interface CircuitBreakerMetrics {
  id: string;
  providerId: string;
  modelId?: string;
  stats: CircuitBreakerStats;
}

// ============================================================================
// Rolling Window Counter
// ============================================================================

interface TimestampedEvent {
  timestamp: number;
  type: 'success' | 'failure';
}

class RollingWindowCounter {
  private events: TimestampedEvent[] = [];
  private readonly windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  recordSuccess(): void {
    this.cleanup();
    this.events.push({ timestamp: Date.now(), type: 'success' });
  }

  recordFailure(): void {
    this.cleanup();
    this.events.push({ timestamp: Date.now(), type: 'failure' });
  }

  getFailureCount(): number {
    this.cleanup();
    return this.events.filter((e) => e.type === 'failure').length;
  }

  getSuccessCount(): number {
    this.cleanup();
    return this.events.filter((e) => e.type === 'success').length;
  }

  getTotalCount(): number {
    this.cleanup();
    return this.events.length;
  }

  getFailureRate(): number {
    this.cleanup();
    if (this.events.length === 0) return 0;
    return this.getFailureCount() / this.events.length;
  }

  reset(): void {
    this.events = [];
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.events = this.events.filter((e) => e.timestamp > cutoff);
  }
}

// ============================================================================
// Enhanced Circuit Breaker
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private readonly counter: RollingWindowCounter;
  private consecutiveSuccesses = 0;
  private halfOpenRequests = 0;
  private openedAt?: number;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private lastStateChange?: Date;
  private lastError?: string;
  private readonly config: Required<CircuitBreakerConfig>;
  private readonly id: string;

  constructor(id: string, config: CircuitBreakerConfig) {
    this.id = id;
    this.config = {
      failureThreshold: config.failureThreshold,
      successThreshold: config.successThreshold,
      timeout: config.timeout,
      monitoringWindow: config.monitoringWindow,
      halfOpenMaxRequests: config.halfOpenMaxRequests ?? 3,
      onStateChange: config.onStateChange ?? (() => {}),
    };
    this.counter = new RollingWindowCounter(config.monitoringWindow);
  }

  /**
   * Check if the circuit allows requests
   */
  isAvailable(): boolean {
    this.checkTimeout();
    return this.state !== 'OPEN';
  }

  /**
   * Check if the circuit is open (blocking requests)
   */
  isOpen(): boolean {
    this.checkTimeout();
    return this.state === 'OPEN';
  }

  /**
   * Get the current state
   */
  getState(): CircuitState {
    this.checkTimeout();
    return this.state;
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.checkTimeout();

    if (this.state === 'OPEN') {
      throw new CircuitBreakerOpenError(
        `Circuit breaker ${this.id} is open`,
        this.lastError
      );
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker ${this.id} is half-open and at capacity`,
          this.lastError
        );
      }
      this.halfOpenRequests++;
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.counter.recordSuccess();
    this.lastSuccess = new Date();
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests--;
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Keep closed
    }

    incrementCounter('circuit_breaker.success', { id: this.id, state: this.state });
  }

  /**
   * Record a failed operation
   */
  recordFailure(error?: unknown): void {
    this.counter.recordFailure();
    this.lastFailure = new Date();
    this.lastError = error instanceof Error ? error.message : String(error);
    this.consecutiveSuccesses = 0;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests--;
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      if (this.counter.getFailureCount() >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }

    incrementCounter('circuit_breaker.failure', { id: this.id, state: this.state });
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.counter.reset();
    this.consecutiveSuccesses = 0;
    this.halfOpenRequests = 0;
    this.openedAt = undefined;
    this.transitionTo('CLOSED');
  }

  /**
   * Force the circuit to open
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    this.checkTimeout();
    return {
      state: this.state,
      failures: this.counter.getFailureCount(),
      successes: this.counter.getSuccessCount(),
      totalRequests: this.counter.getTotalCount(),
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      lastError: this.lastError,
      failureRate: this.counter.getFailureRate(),
    };
  }

  /**
   * Get the circuit breaker ID
   */
  getId(): string {
    return this.id;
  }

  private checkTimeout(): void {
    if (this.state === 'OPEN' && this.openedAt) {
      if (Date.now() - this.openedAt >= this.config.timeout) {
        this.transitionTo('HALF_OPEN');
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === 'OPEN') {
      this.openedAt = Date.now();
    } else if (newState === 'CLOSED') {
      this.openedAt = undefined;
      this.counter.reset();
      this.consecutiveSuccesses = 0;
    } else if (newState === 'HALF_OPEN') {
      this.consecutiveSuccesses = 0;
      this.halfOpenRequests = 0;
    }

    this.config.onStateChange(oldState, newState, this.id);

    incrementCounter('circuit_breaker.state_change', {
      id: this.id,
      from: oldState,
      to: newState,
    });
  }
}

// ============================================================================
// Circuit Breaker Registry
// ============================================================================

export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig?: Partial<CircuitBreakerConfig>) {
    this.defaultConfig = {
      failureThreshold: defaultConfig?.failureThreshold ?? 5,
      successThreshold: defaultConfig?.successThreshold ?? 2,
      timeout: defaultConfig?.timeout ?? 30000,
      monitoringWindow: defaultConfig?.monitoringWindow ?? 60000,
      halfOpenMaxRequests: defaultConfig?.halfOpenMaxRequests ?? 3,
      onStateChange: defaultConfig?.onStateChange,
    };
  }

  /**
   * Get or create a circuit breaker for a provider/model combination
   */
  getBreaker(providerId: string, modelId?: string): CircuitBreaker {
    const id = this.createId(providerId, modelId);

    let breaker = this.breakers.get(id);
    if (!breaker) {
      breaker = new CircuitBreaker(id, {
        ...this.defaultConfig,
        onStateChange: (from, to, breakerId) => {
          this.defaultConfig.onStateChange?.(from, to, breakerId);
          console.log(`[CircuitBreaker] ${breakerId}: ${from} -> ${to}`);
        },
      });
      this.breakers.set(id, breaker);
    }

    return breaker;
  }

  /**
   * Check if a breaker exists
   */
  hasBreaker(providerId: string, modelId?: string): boolean {
    return this.breakers.has(this.createId(providerId, modelId));
  }

  /**
   * Remove a circuit breaker
   */
  removeBreaker(providerId: string, modelId?: string): boolean {
    return this.breakers.delete(this.createId(providerId, modelId));
  }

  /**
   * Get all breakers for a provider
   */
  getBreakersForProvider(providerId: string): CircuitBreaker[] {
    const breakers: CircuitBreaker[] = [];
    for (const [id, breaker] of this.breakers) {
      if (id.startsWith(`${providerId}:`)) {
        breakers.push(breaker);
      }
    }
    return breakers;
  }

  /**
   * Get IDs of all healthy providers
   */
  getHealthyProviders(): string[] {
    const healthy = new Set<string>();
    const unhealthy = new Set<string>();

    for (const [id, breaker] of this.breakers) {
      const providerId = id.split(':')[0]!;
      if (breaker.isOpen()) {
        unhealthy.add(providerId);
      } else {
        healthy.add(providerId);
      }
    }

    // Remove providers that have any open breakers
    for (const providerId of unhealthy) {
      healthy.delete(providerId);
    }

    return Array.from(healthy);
  }

  /**
   * Get IDs of healthy models for a provider
   */
  getHealthyModels(providerId: string): string[] {
    const healthy: string[] = [];

    for (const [id, breaker] of this.breakers) {
      if (id.startsWith(`${providerId}:`) && !breaker.isOpen()) {
        const modelId = id.split(':')[1];
        if (modelId) {
          healthy.push(modelId);
        }
      }
    }

    return healthy;
  }

  /**
   * Get metrics for all circuit breakers
   */
  getMetrics(): CircuitBreakerMetrics[] {
    const metrics: CircuitBreakerMetrics[] = [];

    for (const [id, breaker] of this.breakers) {
      const [providerId, modelId] = id.split(':');
      metrics.push({
        id,
        providerId: providerId!,
        modelId,
        stats: breaker.getStats(),
      });
    }

    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers for a provider
   */
  resetProvider(providerId: string): void {
    for (const breaker of this.getBreakersForProvider(providerId)) {
      breaker.reset();
    }
  }

  private createId(providerId: string, modelId?: string): string {
    return modelId ? `${providerId}:${modelId}` : `${providerId}:*`;
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly lastError?: string
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: CircuitBreakerRegistry | null = null;

export function getCircuitBreakerRegistry(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreakerRegistry {
  if (!registryInstance) {
    registryInstance = new CircuitBreakerRegistry(config);
  }
  return registryInstance;
}

export function resetCircuitBreakerRegistry(): void {
  registryInstance = null;
}
