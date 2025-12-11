/**
 * @aivo/ts-resilience
 *
 * Network resilience patterns for TypeScript/Node.js services.
 *
 * Features:
 * - Circuit breakers (pure implementation)
 * - Retry with exponential backoff
 * - Request timeouts
 * - Telemetry collection
 *
 * @example
 * ```typescript
 * import {
 *   createCircuitBreaker,
 *   CircuitConfigs,
 *   retry,
 *   RetryConfigs,
 *   withTimeout,
 *   TimeoutConfigs,
 *   telemetry,
 * } from '@aivo/ts-resilience';
 *
 * // Create a circuit breaker for AI calls
 * const aiBreaker = createCircuitBreaker(
 *   async (prompt: string) => aiClient.generate(prompt),
 *   {
 *     name: 'ai-generate',
 *     ...CircuitConfigs.aiService,
 *     fallback: () => ({ text: 'AI temporarily unavailable' }),
 *   }
 * );
 *
 * // Use retry for transient failures
 * const data = await retry(
 *   () => fetchFromApi('/data'),
 *   RetryConfigs.standard
 * );
 *
 * // Add timeout to operations
 * const result = await withTimeout(
 *   () => slowOperation(),
 *   TimeoutConfigs.heavy
 * );
 *
 * // Record telemetry
 * telemetry.recordRequestLatency('/api/users', 150);
 * ```
 */

// Circuit Breaker
export {
  createCircuitBreaker,
  getCircuitBreaker,
  registerCircuitBreaker,
  getAllCircuitStats,
  hasOpenCircuits,
  getOpenCircuits,
  resetAllCircuits,
  withCircuitBreaker,
  CircuitConfigs,
  CircuitState,
  type CircuitBreakerOptions,
  type CircuitBreakerStats,
} from './circuit-breaker.js';

// Retry
export {
  retry,
  retryWithResult,
  withRetry,
  calculateRetryDelay,
  isRetryableError,
  RetryConfigs,
  type RetryOptions,
  type RetryResult,
} from './retry.js';

// Timeout
export {
  withTimeout,
  createTimeout,
  raceTimeout,
  executeWithTimeouts,
  isTimeoutError,
  TimeoutConfigs,
  type TimeoutOptions,
  type TimeoutError,
} from './timeout.js';

// Telemetry
export {
  ResilienceTelemetry,
  telemetry,
  type TelemetryMetric,
  type TelemetryReport,
} from './telemetry.js';
