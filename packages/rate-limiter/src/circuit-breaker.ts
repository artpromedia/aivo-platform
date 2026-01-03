/**
 * Circuit Breaker
 *
 * Implements the circuit breaker pattern to prevent cascading failures.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit is tripped, requests are rejected
 * - HALF_OPEN: Testing if service has recovered
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   name: 'api-gateway',
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 *   onOpen: () => logger.warn('Circuit opened'),
 *   onClose: () => logger.info('Circuit closed'),
 * });
 *
 * const result = await breaker.execute(async () => {
 *   return await callExternalService();
 * });
 * ```
 */

import type { RateLimiterLogger } from './logger';
import { noopLogger } from './logger';
import { MemoryStore } from './stores/memory-store';
import type { RateLimitStore } from './stores/types';
import type { CircuitStateValue } from './types';

export interface CircuitBreakerOptions {
  /** Name of the circuit (used for keys) */
  name: string;
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Number of successes needed to close from half-open */
  successThreshold?: number;
  /** Time in ms to wait before transitioning from open to half-open */
  resetTimeout?: number;
  /** Time window in ms to count failures */
  failureWindow?: number;
  /** Store for distributed state */
  store?: RateLimitStore;
  /** Logger instance */
  logger?: RateLimiterLogger;
  /** Callback when circuit opens */
  onOpen?: () => void;
  /** Callback when circuit closes */
  onClose?: () => void;
  /** Callback when circuit goes half-open */
  onHalfOpen?: () => void;
  /** Function to determine if an error should count as a failure */
  isFailure?: (error: Error) => boolean;
  /** Custom fallback when circuit is open */
  fallback?: <T>() => T | Promise<T>;
}

interface CircuitBreakerState {
  state: CircuitStateValue;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeout: number;
  private readonly failureWindow: number;
  private readonly store: RateLimitStore;
  private readonly logger: RateLimiterLogger;
  private readonly onOpen?: () => void;
  private readonly onClose?: () => void;
  private readonly onHalfOpen?: () => void;
  private readonly isFailure: (error: Error) => boolean;
  private readonly fallback?: <T>() => T | Promise<T>;

  // Local cache for performance
  private localState: CircuitBreakerState;
  private lastSync = 0;
  private readonly syncInterval: number = 1000; // 1 second

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 3;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.failureWindow = options.failureWindow ?? 60000;
    this.store = options.store ?? new MemoryStore();
    this.logger = options.logger ?? noopLogger;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;
    this.isFailure = options.isFailure ?? (() => true);
    this.fallback = options.fallback;

    // Initialize local state
    this.localState = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now(),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.syncState();

    const state = await this.getState();

    // Check if circuit is open
    if (state === 'open') {
      // Check if we should transition to half-open
      if (await this.shouldTransitionToHalfOpen()) {
        await this.transitionTo('half_open');
      } else {
        this.logger.debug('Circuit is open, rejecting request', { name: this.name });

        if (this.fallback) {
          return this.fallback();
        }

        throw new CircuitBreakerOpenError(
          `Circuit breaker '${this.name}' is open`,
          this.name,
          await this.getResetTime()
        );
      }
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      if (this.isFailure(error as Error)) {
        await this.onFailure();
      }
      throw error;
    }
  }

  /**
   * Handle a successful execution
   */
  private async onSuccess(): Promise<void> {
    const state = await this.getState();

    if (state === 'half_open') {
      this.localState.successes++;
      await this.saveState();

      if (this.localState.successes >= this.successThreshold) {
        await this.transitionTo('closed');
      }
    } else if (state === 'closed') {
      // Reset failure count on success in closed state
      if (this.localState.failures > 0) {
        this.localState.failures = 0;
        await this.saveState();
      }
    }
  }

  /**
   * Handle a failed execution
   */
  private async onFailure(): Promise<void> {
    this.localState.failures++;
    this.localState.lastFailureTime = Date.now();
    await this.saveState();

    const state = await this.getState();

    if (state === 'half_open') {
      // Any failure in half-open state opens the circuit
      await this.transitionTo('open');
    } else if (state === 'closed') {
      // Check if we should open
      if (this.localState.failures >= this.failureThreshold) {
        await this.transitionTo('open');
      }
    }

    this.logger.debug('Circuit breaker recorded failure', {
      name: this.name,
      failures: this.localState.failures,
      state,
    });
  }

  /**
   * Transition to a new state
   */
  private async transitionTo(newState: CircuitStateValue): Promise<void> {
    const oldState = this.localState.state;

    if (oldState === newState) {
      return;
    }

    this.localState.state = newState;
    this.localState.lastStateChange = Date.now();

    // Reset counters on state change
    if (newState === 'closed') {
      this.localState.failures = 0;
      this.localState.successes = 0;
    } else if (newState === 'half_open') {
      this.localState.successes = 0;
    }

    await this.saveState();

    this.logger.info('Circuit breaker state changed', {
      name: this.name,
      from: oldState,
      to: newState,
    });

    // Trigger callbacks
    switch (newState) {
      case 'open':
        this.onOpen?.();
        break;
      case 'closed':
        this.onClose?.();
        break;
      case 'half_open':
        this.onHalfOpen?.();
        break;
    }
  }

  /**
   * Check if we should transition from open to half-open
   */
  private async shouldTransitionToHalfOpen(): Promise<boolean> {
    const elapsed = Date.now() - this.localState.lastStateChange;
    return elapsed >= this.resetTimeout;
  }

  /**
   * Get current circuit state
   */
  async getState(): Promise<CircuitStateValue> {
    await this.syncState();
    return this.localState.state;
  }

  /**
   * Get time until reset (when circuit will try half-open)
   */
  private async getResetTime(): Promise<number> {
    const timeInOpen = Date.now() - this.localState.lastStateChange;
    return Math.max(0, this.resetTimeout - timeInOpen);
  }

  /**
   * Force the circuit open
   */
  async forceOpen(): Promise<void> {
    await this.transitionTo('open');
  }

  /**
   * Force the circuit closed
   */
  async forceClose(): Promise<void> {
    await this.transitionTo('closed');
  }

  /**
   * Force the circuit half-open
   */
  async forceHalfOpen(): Promise<void> {
    await this.transitionTo('half_open');
  }

  /**
   * Reset the circuit breaker
   */
  async reset(): Promise<void> {
    this.localState = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now(),
    };
    await this.saveState();
    this.logger.info('Circuit breaker reset', { name: this.name });
  }

  /**
   * Get circuit breaker stats
   */
  async getStats(): Promise<{
    name: string;
    state: CircuitStateValue;
    failures: number;
    successes: number;
    lastFailureTime: number;
    lastStateChange: number;
    resetTime: number;
  }> {
    await this.syncState();
    return {
      name: this.name,
      state: this.localState.state,
      failures: this.localState.failures,
      successes: this.localState.successes,
      lastFailureTime: this.localState.lastFailureTime,
      lastStateChange: this.localState.lastStateChange,
      resetTime: await this.getResetTime(),
    };
  }

  /**
   * Sync state from store
   */
  private async syncState(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSync < this.syncInterval) {
      return;
    }

    try {
      const key = `cb:${this.name}:state`;
      const data = await this.store.get(key);

      if (data) {
        const state = JSON.parse(data) as CircuitBreakerState;
        // Use remote state if it's newer
        if (state.lastStateChange > this.localState.lastStateChange) {
          this.localState = state;
        }
      }

      this.lastSync = now;
    } catch (error) {
      this.logger.debug('Failed to sync circuit breaker state', { error });
    }
  }

  /**
   * Save state to store
   */
  private async saveState(): Promise<void> {
    try {
      const key = `cb:${this.name}:state`;
      await this.store.set(key, JSON.stringify(this.localState), 86400000); // 24 hour TTL
      this.lastSync = Date.now();
    } catch (error) {
      this.logger.debug('Failed to save circuit breaker state', { error });
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly circuitName: string,
    public readonly resetTime: number
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
