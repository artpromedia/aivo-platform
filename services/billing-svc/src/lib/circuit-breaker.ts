/**
 * Circuit Breaker Configuration for External Services
 *
 * Provides circuit breaker protection for external API calls to prevent
 * cascading failures when external services are degraded or unavailable.
 */

import { CircuitBreaker, CircuitBreakerOpenError, MemoryStore } from '@aivo/rate-limiter';

// ============================================================================
// CIRCUIT BREAKER INSTANCES
// ============================================================================

/**
 * Circuit breaker for Stripe API calls
 * Opens after 5 failures within 60 seconds, resets after 30 seconds
 */
export const stripeCircuitBreaker = new CircuitBreaker({
  name: 'stripe-api',
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  failureWindow: 60000, // 60 seconds
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] Stripe circuit OPENED - requests will be rejected');
  },
  onClose: () => {
    console.log('[CircuitBreaker] Stripe circuit CLOSED - normal operation resumed');
  },
  onHalfOpen: () => {
    console.log('[CircuitBreaker] Stripe circuit HALF-OPEN - testing recovery');
  },
  // Only count network/server errors as failures, not client errors (4xx)
  isFailure: (error: Error) => {
    // Stripe errors have a statusCode property
    const stripeError = error as Error & { statusCode?: number };
    if (stripeError.statusCode) {
      // 4xx errors are client errors, don't trip the circuit
      return stripeError.statusCode >= 500;
    }
    // Network errors and timeouts should trip the circuit
    return error.message.includes('timeout') ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('ENOTFOUND') ||
           error.message.includes('network');
  },
});

/**
 * Circuit breaker for webhook delivery (external endpoints)
 */
export const webhookCircuitBreaker = new CircuitBreaker({
  name: 'webhook-delivery',
  failureThreshold: 10,
  successThreshold: 2,
  resetTimeout: 60000, // 60 seconds
  failureWindow: 120000, // 2 minutes
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] Webhook delivery circuit OPENED');
  },
  onClose: () => {
    console.log('[CircuitBreaker] Webhook delivery circuit CLOSED');
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Execute a function with Stripe circuit breaker protection
 */
export async function withStripeCircuitBreaker<T>(
  fn: () => Promise<T>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  try {
    return await stripeCircuitBreaker.execute(fn);
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError && fallback) {
      console.warn('[CircuitBreaker] Using fallback for Stripe operation');
      return fallback();
    }
    throw error;
  }
}

/**
 * Check if Stripe is available (circuit is not open)
 */
export async function isStripeAvailable(): Promise<boolean> {
  const state = await stripeCircuitBreaker.getState();
  return state !== 'open';
}

/**
 * Get circuit breaker health status for monitoring
 */
export async function getCircuitBreakerHealth(): Promise<{
  stripe: {
    state: string;
    failures: number;
    available: boolean;
  };
  webhook: {
    state: string;
    failures: number;
    available: boolean;
  };
}> {
  const [stripeStats, webhookStats] = await Promise.all([
    stripeCircuitBreaker.getStats(),
    webhookCircuitBreaker.getStats(),
  ]);

  return {
    stripe: {
      state: stripeStats.state,
      failures: stripeStats.failures,
      available: stripeStats.state !== 'open',
    },
    webhook: {
      state: webhookStats.state,
      failures: webhookStats.failures,
      available: webhookStats.state !== 'open',
    },
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { CircuitBreakerOpenError };
