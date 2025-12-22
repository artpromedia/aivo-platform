/**
 * Circuit Breaker
 *
 * Implements the circuit breaker pattern for resilient LLM provider calls.
 * Prevents cascading failures by failing fast when a provider is unhealthy.
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation, requests flow through
  OPEN = 'OPEN', // Failing, requests are rejected immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before trying again (half-open) */
  resetTimeout: number;
  /** Number of successful calls in half-open to close circuit */
  successThreshold?: number;
  /** Optional callback when state changes */
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  lastError?: string;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private lastError?: string;
  private openedAt?: number;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      successThreshold: config.successThreshold ?? 1,

      onStateChange:
        config.onStateChange ??
        (() => {
          /* noop */
        }),
    };
  }

  /**
   * Check if the circuit breaker allows requests
   */
  isOpen(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return false;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      // Check if reset timeout has passed
      if (this.openedAt && Date.now() - this.openedAt >= this.config.resetTimeout) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        return false;
      }
      return true;
    }

    // HALF_OPEN - allow limited requests
    return false;
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new CircuitBreakerOpenError(`Circuit breaker is open. Last error: ${this.lastError}`);
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
    this.successes++;
    this.lastSuccess = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED);
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(error: unknown): void {
    this.failures++;
    this.lastFailure = new Date();
    this.lastError = error instanceof Error ? error.message : String(error);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN);
      }
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo(CircuitBreakerState.CLOSED);
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
    };
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitBreakerState.OPEN) {
      this.openedAt = Date.now();
    } else if (newState === CircuitBreakerState.CLOSED) {
      this.openedAt = undefined;
      this.failures = 0;
      this.successes = 0;
    } else if (newState === CircuitBreakerState.HALF_OPEN) {
      this.successes = 0;
    }

    this.config.onStateChange(oldState, newState);
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
