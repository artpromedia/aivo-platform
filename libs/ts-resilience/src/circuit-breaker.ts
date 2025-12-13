/**
 * Circuit Breaker for TypeScript/Node.js Services
 *
 * Provides a simple circuit breaker implementation for protecting
 * against cascading failures in distributed systems.
 */

// ============================================================================
// TYPES
// ============================================================================

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'halfOpen',
}

export interface CircuitBreakerOptions {
  /** Name for logging/metrics */
  name: string;
  /** Timeout in milliseconds for the action */
  timeout?: number;
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Time in ms to wait before testing circuit */
  resetTimeout?: number;
  /** Minimum number of requests before tripping */
  volumeThreshold?: number;
  /** Called on state change */
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  rejects: number;
  timeouts: number;
  fallbacks: number;
  latencyMean: number;
  latencyP99: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default configurations for different service types.
 */
export const CircuitConfigs = {
  /** Standard API calls */
  standard: {
    timeout: 10_000,
    failureThreshold: 5,
    resetTimeout: 30_000,
    volumeThreshold: 5,
  },

  /** AI/LLM service calls (longer timeouts) */
  aiService: {
    timeout: 45_000,
    failureThreshold: 3,
    resetTimeout: 60_000,
    volumeThreshold: 3,
  },

  /** Database operations */
  database: {
    timeout: 5_000,
    failureThreshold: 5,
    resetTimeout: 15_000,
    volumeThreshold: 10,
  },

  /** External API calls */
  externalApi: {
    timeout: 15_000,
    failureThreshold: 5,
    resetTimeout: 30_000,
    volumeThreshold: 5,
  },

  /** Critical operations (auth, payments) */
  critical: {
    timeout: 5_000,
    failureThreshold: 3,
    resetTimeout: 10_000,
    volumeThreshold: 3,
  },
} as const;

// ============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================================================

/**
 * Circuit Breaker class for protecting async operations.
 */
export class CircuitBreaker<TArgs extends unknown[], TResult> {
  readonly name: string;
  private readonly action: (...args: TArgs) => Promise<TResult>;
  private readonly timeout: number;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly volumeThreshold: number;
  private fallbackFn?: (...args: TArgs) => TResult | Promise<TResult>;
  private readonly onStateChangeCb?: (oldState: CircuitState, newState: CircuitState) => void;

  private _state: CircuitState = CircuitState.CLOSED;
  private _failures = 0;
  private _successes = 0;
  private _rejects = 0;
  private _timeouts = 0;
  private _fallbacks = 0;
  private _consecutiveFailures = 0;
  private _consecutiveSuccesses = 0;
  private _openedAt?: Date;
  private _latencies: number[] = [];

  constructor(action: (...args: TArgs) => Promise<TResult>, options: CircuitBreakerOptions) {
    this.action = action;
    this.name = options.name;
    this.timeout = options.timeout ?? 10_000;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30_000;
    this.volumeThreshold = options.volumeThreshold ?? 5;
    this.onStateChangeCb = options.onStateChange;
  }

  get state(): CircuitState {
    return this._state;
  }

  get opened(): boolean {
    return this._state === CircuitState.OPEN;
  }

  get halfOpen(): boolean {
    return this._state === CircuitState.HALF_OPEN;
  }

  get stats(): {
    failures: number;
    successes: number;
    rejects: number;
    timeouts: number;
    fallbacks: number;
    latencyMean: number;
    percentiles: Record<string, number>;
  } {
    return {
      failures: this._failures,
      successes: this._successes,
      rejects: this._rejects,
      timeouts: this._timeouts,
      fallbacks: this._fallbacks,
      latencyMean: this.calculateMean(),
      percentiles: {
        '50': this.calculatePercentile(50),
        '95': this.calculatePercentile(95),
        '99': this.calculatePercentile(99),
      },
    };
  }

  /**
   * Execute the protected action.
   */
  async fire(...args: TArgs): Promise<TResult> {
    // Check if we should allow this request
    if (!this.allowRequest()) {
      this._rejects++;
      return this.handleRejection(args);
    }

    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(args);
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Set a fallback function.
   */
  fallback(fn: (...args: TArgs) => TResult | Promise<TResult>): this {
    this.fallbackFn = fn;
    return this;
  }

  /**
   * Close the circuit (reset to normal).
   */
  close(): void {
    this.transitionTo(CircuitState.CLOSED);
    this._consecutiveFailures = 0;
    this._openedAt = undefined;
  }

  /**
   * Force open the circuit.
   */
  open(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Reset all stats.
   */
  reset(): void {
    this._state = CircuitState.CLOSED;
    this._failures = 0;
    this._successes = 0;
    this._rejects = 0;
    this._timeouts = 0;
    this._fallbacks = 0;
    this._consecutiveFailures = 0;
    this._consecutiveSuccesses = 0;
    this._openedAt = undefined;
    this._latencies = [];
  }

  private allowRequest(): boolean {
    switch (this._state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if reset timeout has elapsed
        if (this._openedAt) {
          const elapsed = Date.now() - this._openedAt.getTime();
          if (elapsed >= this.resetTimeout) {
            this.transitionTo(CircuitState.HALF_OPEN);
            return true;
          }
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow one request at a time in half-open
        return true;
    }
  }

  private async executeWithTimeout(args: TArgs): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._timeouts++;
        reject(new Error(`Operation timed out after ${this.timeout}ms`));
      }, this.timeout);

      this.action(...args)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutId);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  private recordSuccess(latencyMs: number): void {
    this._successes++;
    this._consecutiveSuccesses++;
    this._consecutiveFailures = 0;
    this._latencies.push(latencyMs);

    if (this._latencies.length > 100) {
      this._latencies.shift();
    }

    if (this._state === CircuitState.HALF_OPEN && this._consecutiveSuccesses >= 2) {
      this.transitionTo(CircuitState.CLOSED);
    }
  }

  private recordFailure(): void {
    this._failures++;
    this._consecutiveFailures++;
    this._consecutiveSuccesses = 0;

    const totalRequests = this._successes + this._failures;

    // Open circuit if in half-open and failure occurs,
    // or if in closed state and thresholds are exceeded
    const shouldOpen =
      this._state === CircuitState.HALF_OPEN ||
      (this._state === CircuitState.CLOSED &&
        totalRequests >= this.volumeThreshold &&
        this._consecutiveFailures >= this.failureThreshold);

    if (shouldOpen) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private handleRejection(args: TArgs): Promise<TResult> {
    if (this.fallbackFn) {
      this._fallbacks++;
      const result = this.fallbackFn(...args);
      return Promise.resolve(result);
    }

    throw new CircuitBreakerOpenError(this.name, this.remainingOpenTime());
  }

  private remainingOpenTime(): number {
    if (!this._openedAt) return 0;
    const elapsed = Date.now() - this._openedAt.getTime();
    return Math.max(0, this.resetTimeout - elapsed);
  }

  private transitionTo(newState: CircuitState): void {
    if (this._state === newState) return;

    const oldState = this._state;
    this._state = newState;

    if (newState === CircuitState.OPEN) {
      this._openedAt = new Date();
    }

    this.onStateChangeCb?.(oldState, newState);
    logCircuitEvent(this.name, `${oldState} -> ${newState}`);
  }

  private calculateMean(): number {
    if (this._latencies.length === 0) return 0;
    const sum = this._latencies.reduce((a, b) => a + b, 0);
    return sum / this._latencies.length;
  }

  private calculatePercentile(p: number): number {
    if (this._latencies.length === 0) return 0;
    const sorted = [...this._latencies].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * Error thrown when circuit breaker is open.
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly remainingMs: number
  ) {
    super(`Circuit breaker '${serviceName}' is open. Retry in ${Math.ceil(remainingMs / 1000)}s`);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a circuit breaker for an async function.
 */
export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: CircuitBreakerOptions
): CircuitBreaker<TArgs, TResult> {
  return new CircuitBreaker(action, options);
}

// ============================================================================
// CIRCUIT BREAKER REGISTRY
// ============================================================================

const circuitRegistry = new Map<string, CircuitBreaker<unknown[], unknown>>();

/**
 * Get or create a circuit breaker by name.
 */
export function getCircuitBreaker<TArgs extends unknown[], TResult>(
  name: string,
  factory?: () => CircuitBreaker<TArgs, TResult>
): CircuitBreaker<TArgs, TResult> | undefined {
  let breaker = circuitRegistry.get(name);

  if (!breaker && factory) {
    breaker = factory() as unknown as CircuitBreaker<unknown[], unknown>;
    circuitRegistry.set(name, breaker);
  }

  return breaker as CircuitBreaker<TArgs, TResult> | undefined;
}

/**
 * Register a circuit breaker.
 */
export function registerCircuitBreaker<TArgs extends unknown[], TResult>(
  name: string,
  breaker: CircuitBreaker<TArgs, TResult>
): void {
  circuitRegistry.set(name, breaker as unknown as CircuitBreaker<unknown[], unknown>);
}

/**
 * Get all circuit breaker stats.
 */
export function getAllCircuitStats(): CircuitBreakerStats[] {
  return Array.from(circuitRegistry.entries()).map(([name, breaker]) => {
    let state: CircuitState;
    if (breaker.opened) {
      state = CircuitState.OPEN;
    } else if (breaker.halfOpen) {
      state = CircuitState.HALF_OPEN;
    } else {
      state = CircuitState.CLOSED;
    }

    return {
      name,
      state,
      failures: breaker.stats.failures,
      successes: breaker.stats.successes,
      rejects: breaker.stats.rejects,
      timeouts: breaker.stats.timeouts,
      fallbacks: breaker.stats.fallbacks,
      latencyMean: breaker.stats.latencyMean,
      latencyP99: breaker.stats.percentiles['99'],
    };
  });
}

/**
 * Check if any circuits are open.
 */
export function hasOpenCircuits(): boolean {
  return Array.from(circuitRegistry.values()).some((b) => b.opened);
}

/**
 * Get names of open circuits.
 */
export function getOpenCircuits(): string[] {
  return Array.from(circuitRegistry.entries())
    .filter(([, breaker]) => breaker.opened)
    .map(([name]) => name);
}

/**
 * Reset all circuit breakers.
 */
export function resetAllCircuits(): void {
  for (const breaker of circuitRegistry.values()) {
    breaker.close();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function logCircuitEvent(name: string, event: string): void {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [CircuitBreaker:${name}] ${event}`);
}

/**
 * Wrap an async function with circuit breaker protection.
 */
export function withCircuitBreaker<TArgs extends unknown[], TResult>(
  options: CircuitBreakerOptions
): (target: (...args: TArgs) => Promise<TResult>) => (...args: TArgs) => Promise<TResult> {
  return (target) => {
    const breaker = createCircuitBreaker(target, options);
    registerCircuitBreaker(options.name, breaker);

    return async (...args: TArgs): Promise<TResult> => {
      return breaker.fire(...args);
    };
  };
}
