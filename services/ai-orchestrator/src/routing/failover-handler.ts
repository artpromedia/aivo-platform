/**
 * Failover Handler
 *
 * Manages automatic failover between AI providers/models with:
 * - Retry logic with exponential backoff
 * - Error classification for smart failover decisions
 * - Circuit breaker integration
 * - Comprehensive metrics tracking
 */

import type { AIModel } from '../providers/registry.js';
import {
  RateLimitError,
  ContextLengthError,
  TimeoutError,
  ServiceUnavailableError,
  AuthenticationError,
  ContentFilterError,
} from '../providers/adapters/base.adapter.js';
import { getCircuitBreakerRegistry, CircuitBreakerOpenError } from './circuit-breaker.js';
import { getPriorityRouter, type RoutingRequest } from './priority-router.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ============================================================================
// Types
// ============================================================================

export interface FailoverConfig {
  /** Maximum number of retries before giving up */
  maxRetries: number;
  /** Initial retry delay in ms */
  retryDelayMs: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
  /** Maximum delay between retries */
  maxDelayMs: number;
  /** Jitter factor (0-1) to add randomness to delays */
  jitterFactor: number;
  /** Error types that should trigger retry (vs immediate failover) */
  retryableErrors: string[];
  /** Error types that should trigger immediate failover */
  failoverErrors: string[];
  /** Timeout for individual requests */
  requestTimeoutMs: number;
  /** Maximum total time for all attempts */
  totalTimeoutMs: number;
}

export interface FailoverResult<T> {
  /** The result of the successful operation */
  result: T;
  /** List of models that were attempted */
  attemptedModels: string[];
  /** Total latency including all retries and failovers */
  totalLatencyMs: number;
  /** The model that ultimately succeeded */
  finalModel: AIModel;
  /** Whether a failover occurred */
  failoverOccurred: boolean;
  /** Number of retry attempts */
  retryCount: number;
  /** Errors encountered during attempts */
  errors: Array<{
    modelId: string;
    error: string;
    errorType: string;
    latencyMs: number;
  }>;
}

export interface FailoverContext {
  /** Current routing request */
  request: RoutingRequest;
  /** Currently attempted model */
  currentModel?: AIModel;
  /** Number of attempts so far */
  attemptCount: number;
  /** Total time elapsed */
  elapsedMs: number;
}

export type ErrorClassification = 'retry' | 'failover' | 'abort';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: FailoverConfig = {
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
    'ENOTFOUND',
  ],
  failoverErrors: [
    'RateLimitError',
    'ContextLengthError',
    'CircuitBreakerOpenError',
  ],
  requestTimeoutMs: 60000,
  totalTimeoutMs: 180000,
};

// ============================================================================
// Failover Handler
// ============================================================================

export class FailoverHandler {
  private readonly config: FailoverConfig;

  constructor(config?: Partial<FailoverConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute an operation with automatic failover
   */
  async executeWithFailover<T>(
    request: RoutingRequest,
    executor: (model: AIModel) => Promise<T>
  ): Promise<FailoverResult<T>> {
    const startTime = Date.now();
    const attemptedModels: string[] = [];
    const errors: FailoverResult<T>['errors'] = [];
    let retryCount = 0;
    let failoverOccurred = false;

    const router = getPriorityRouter();
    const circuitRegistry = getCircuitBreakerRegistry();

    // Get initial model
    let routingResult = await router.selectModel(request);
    let currentModel = routingResult.model;

    while (true) {
      // Check total timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= this.config.totalTimeoutMs) {
        throw new FailoverExhaustedError(
          'Total timeout exceeded',
          attemptedModels,
          errors
        );
      }

      attemptedModels.push(currentModel.id);
      const attemptStart = Date.now();

      try {
        // Get circuit breaker for this model
        const breaker = circuitRegistry.getBreaker(
          currentModel.providerId,
          currentModel.id
        );

        // Execute with circuit breaker protection
        const result = await breaker.execute(async () => {
          return await this.executeWithTimeout(
            () => executor(currentModel),
            this.config.requestTimeoutMs
          );
        });

        // Success!
        const totalLatencyMs = Date.now() - startTime;

        // Update router with latency info
        router.updateModelLatency(currentModel.id, Date.now() - attemptStart);

        incrementCounter('failover.success', {
          model: currentModel.id,
          provider: currentModel.providerId,
          failover_occurred: String(failoverOccurred),
          retry_count: String(retryCount),
        });

        recordHistogram('failover.total_latency_ms', totalLatencyMs, {
          model: currentModel.id,
          failover_occurred: String(failoverOccurred),
        });

        return {
          result,
          attemptedModels,
          totalLatencyMs,
          finalModel: currentModel,
          failoverOccurred,
          retryCount,
          errors,
        };
      } catch (error) {
        const attemptLatency = Date.now() - attemptStart;
        const errorInfo = this.extractErrorInfo(error);

        errors.push({
          modelId: currentModel.id,
          error: errorInfo.message,
          errorType: errorInfo.type,
          latencyMs: attemptLatency,
        });

        incrementCounter('failover.attempt_failed', {
          model: currentModel.id,
          provider: currentModel.providerId,
          error_type: errorInfo.type,
        });

        // Classify the error
        const classification = this.classifyError(error);

        if (classification === 'abort') {
          // Non-recoverable error - throw immediately
          throw error;
        }

        if (classification === 'retry' && retryCount < this.config.maxRetries) {
          // Retry with same model after delay
          retryCount++;
          const delay = this.calculateDelay(retryCount);

          incrementCounter('failover.retry', {
            model: currentModel.id,
            retry_count: String(retryCount),
          });

          await this.sleep(delay);
          continue;
        }

        // Failover to next model
        const nextModel = await router.getNextFallback(currentModel, {
          ...request,
          excludeModels: attemptedModels,
        });

        if (!nextModel) {
          // No more models available
          throw new FailoverExhaustedError(
            'All available models have failed',
            attemptedModels,
            errors
          );
        }

        failoverOccurred = true;
        currentModel = nextModel;
        retryCount = 0; // Reset retry count for new model

        incrementCounter('failover.model_switch', {
          from_model: attemptedModels[attemptedModels.length - 1],
          to_model: nextModel.id,
        });
      }
    }
  }

  /**
   * Execute an operation with streaming and failover support
   */
  async *executeStreamWithFailover<T>(
    request: RoutingRequest,
    executor: (model: AIModel) => AsyncIterable<T>
  ): AsyncIterable<T | { _failover: { fromModel: string; toModel: string } }> {
    const router = getPriorityRouter();
    const circuitRegistry = getCircuitBreakerRegistry();
    const attemptedModels: string[] = [];

    let routingResult = await router.selectModel(request);
    let currentModel = routingResult.model;

    while (true) {
      attemptedModels.push(currentModel.id);

      try {
        const breaker = circuitRegistry.getBreaker(
          currentModel.providerId,
          currentModel.id
        );

        if (breaker.isOpen()) {
          throw new CircuitBreakerOpenError(
            `Circuit breaker open for ${currentModel.id}`,
            undefined
          );
        }

        // Stream from current model
        let hasStarted = false;
        for await (const chunk of executor(currentModel)) {
          hasStarted = true;
          breaker.recordSuccess();
          yield chunk;
        }

        // Successfully completed streaming
        if (hasStarted) {
          return;
        }
      } catch (error) {
        const errorInfo = this.extractErrorInfo(error);

        incrementCounter('failover.stream_failed', {
          model: currentModel.id,
          error_type: errorInfo.type,
        });

        // Record failure in circuit breaker
        const breaker = circuitRegistry.getBreaker(
          currentModel.providerId,
          currentModel.id
        );
        breaker.recordFailure(error);

        // Try to failover
        const nextModel = await router.getNextFallback(currentModel, {
          ...request,
          excludeModels: attemptedModels,
        });

        if (!nextModel) {
          throw new FailoverExhaustedError(
            'All available models have failed during streaming',
            attemptedModels,
            [{ modelId: currentModel.id, error: errorInfo.message, errorType: errorInfo.type, latencyMs: 0 }]
          );
        }

        // Yield a failover notification
        yield {
          _failover: {
            fromModel: currentModel.id,
            toModel: nextModel.id,
          },
        };

        currentModel = nextModel;
      }
    }
  }

  /**
   * Classify an error to determine the appropriate action
   */
  classifyError(error: unknown): ErrorClassification {
    // Authentication errors are not recoverable
    if (error instanceof AuthenticationError) {
      return 'abort';
    }

    // Content filter errors should not retry
    if (error instanceof ContentFilterError) {
      return 'abort';
    }

    // Rate limit errors should failover immediately
    if (error instanceof RateLimitError) {
      return 'failover';
    }

    // Context length errors should failover to a model with larger context
    if (error instanceof ContextLengthError) {
      return 'failover';
    }

    // Circuit breaker errors should failover
    if (error instanceof CircuitBreakerOpenError) {
      return 'failover';
    }

    // Timeout errors might be transient - retry first
    if (error instanceof TimeoutError) {
      return 'retry';
    }

    // Service unavailable - retry with backoff
    if (error instanceof ServiceUnavailableError) {
      return 'retry';
    }

    // Check error name/message for classification
    const errorName = error instanceof Error ? error.name : '';
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

    if (this.config.retryableErrors.some((e) => errorName.includes(e) || errorMessage.includes(e.toLowerCase()))) {
      return 'retry';
    }

    if (this.config.failoverErrors.some((e) => errorName.includes(e) || errorMessage.includes(e.toLowerCase()))) {
      return 'failover';
    }

    // Default to retry for unknown errors
    return 'retry';
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attemptNumber: number): number {
    let delay = this.config.retryDelayMs;

    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.retryDelayMs * Math.pow(2, attemptNumber - 1),
        this.config.maxDelayMs
      );
    }

    // Add jitter
    if (this.config.jitterFactor > 0) {
      const jitter = delay * this.config.jitterFactor * (Math.random() * 2 - 1);
      delay += jitter;
    }

    return Math.max(0, delay);
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Extract error information
   */
  private extractErrorInfo(error: unknown): { type: string; message: string } {
    if (error instanceof Error) {
      return {
        type: error.constructor.name,
        message: error.message,
      };
    }
    return {
      type: 'Unknown',
      message: String(error),
    };
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class FailoverExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attemptedModels: string[],
    public readonly errors: Array<{
      modelId: string;
      error: string;
      errorType: string;
      latencyMs: number;
    }>
  ) {
    super(message);
    this.name = 'FailoverExhaustedError';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let handlerInstance: FailoverHandler | null = null;

export function getFailoverHandler(config?: Partial<FailoverConfig>): FailoverHandler {
  if (!handlerInstance) {
    handlerInstance = new FailoverHandler(config);
  }
  return handlerInstance;
}

export function resetFailoverHandler(): void {
  handlerInstance = null;
}
