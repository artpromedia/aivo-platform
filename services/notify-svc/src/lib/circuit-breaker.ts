/**
 * Circuit Breaker Configuration for External Services
 *
 * Provides circuit breaker protection for external API calls to prevent
 * cascading failures when email/SMS providers are degraded or unavailable.
 */

import { CircuitBreaker, CircuitBreakerOpenError, MemoryStore } from '@aivo/rate-limiter';

// ============================================================================
// CIRCUIT BREAKER INSTANCES
// ============================================================================

/**
 * Circuit breaker for SendGrid API calls
 */
export const sendgridCircuitBreaker = new CircuitBreaker({
  name: 'sendgrid-api',
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000, // 30 seconds
  failureWindow: 60000, // 60 seconds
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] SendGrid circuit OPENED - failing over to SES');
  },
  onClose: () => {
    console.log('[CircuitBreaker] SendGrid circuit CLOSED - normal operation resumed');
  },
  onHalfOpen: () => {
    console.log('[CircuitBreaker] SendGrid circuit HALF-OPEN - testing recovery');
  },
  isFailure: (error: Error) => {
    // Only count server errors and network issues as failures
    const httpError = error as Error & { statusCode?: number; code?: string };
    if (httpError.statusCode) {
      return httpError.statusCode >= 500;
    }
    // Network errors
    return httpError.code === 'ECONNREFUSED' ||
           httpError.code === 'ENOTFOUND' ||
           httpError.code === 'ETIMEDOUT' ||
           error.message.includes('timeout');
  },
});

/**
 * Circuit breaker for AWS SES API calls
 */
export const sesCircuitBreaker = new CircuitBreaker({
  name: 'ses-api',
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000,
  failureWindow: 60000,
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] SES circuit OPENED - email sending unavailable');
  },
  onClose: () => {
    console.log('[CircuitBreaker] SES circuit CLOSED - normal operation resumed');
  },
  onHalfOpen: () => {
    console.log('[CircuitBreaker] SES circuit HALF-OPEN - testing recovery');
  },
  isFailure: (error: Error) => {
    // AWS SDK errors have a name property
    return error.name === 'ServiceUnavailable' ||
           error.name === 'ThrottlingException' ||
           error.message.includes('timeout') ||
           error.message.includes('ECONNREFUSED');
  },
});

/**
 * Circuit breaker for Twilio API calls
 */
export const twilioCircuitBreaker = new CircuitBreaker({
  name: 'twilio-api',
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000,
  failureWindow: 60000,
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] Twilio circuit OPENED - SMS sending unavailable');
  },
  onClose: () => {
    console.log('[CircuitBreaker] Twilio circuit CLOSED - normal operation resumed');
  },
  onHalfOpen: () => {
    console.log('[CircuitBreaker] Twilio circuit HALF-OPEN - testing recovery');
  },
  isFailure: (error: Error) => {
    const twilioError = error as Error & { status?: number };
    if (twilioError.status) {
      return twilioError.status >= 500;
    }
    return error.message.includes('timeout') ||
           error.message.includes('ECONNREFUSED');
  },
});

/**
 * Circuit breaker for FCM (Firebase Cloud Messaging) API calls
 */
export const fcmCircuitBreaker = new CircuitBreaker({
  name: 'fcm-api',
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000,
  failureWindow: 60000,
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] FCM circuit OPENED - push notifications unavailable');
  },
  onClose: () => {
    console.log('[CircuitBreaker] FCM circuit CLOSED - normal operation resumed');
  },
});

/**
 * Circuit breaker for APNs (Apple Push Notification service) API calls
 */
export const apnsCircuitBreaker = new CircuitBreaker({
  name: 'apns-api',
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000,
  failureWindow: 60000,
  store: new MemoryStore(),
  onOpen: () => {
    console.error('[CircuitBreaker] APNs circuit OPENED - iOS push notifications unavailable');
  },
  onClose: () => {
    console.log('[CircuitBreaker] APNs circuit CLOSED - normal operation resumed');
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get health status of all circuit breakers
 */
export async function getCircuitBreakerHealth(): Promise<{
  email: {
    sendgrid: { state: string; available: boolean };
    ses: { state: string; available: boolean };
  };
  sms: {
    twilio: { state: string; available: boolean };
  };
  push: {
    fcm: { state: string; available: boolean };
    apns: { state: string; available: boolean };
  };
}> {
  const [sendgridStats, sesStats, twilioStats, fcmStats, apnsStats] = await Promise.all([
    sendgridCircuitBreaker.getStats(),
    sesCircuitBreaker.getStats(),
    twilioCircuitBreaker.getStats(),
    fcmCircuitBreaker.getStats(),
    apnsCircuitBreaker.getStats(),
  ]);

  return {
    email: {
      sendgrid: { state: sendgridStats.state, available: sendgridStats.state !== 'open' },
      ses: { state: sesStats.state, available: sesStats.state !== 'open' },
    },
    sms: {
      twilio: { state: twilioStats.state, available: twilioStats.state !== 'open' },
    },
    push: {
      fcm: { state: fcmStats.state, available: fcmStats.state !== 'open' },
      apns: { state: apnsStats.state, available: apnsStats.state !== 'open' },
    },
  };
}

/**
 * Check if any email provider is available
 */
export async function isEmailAvailable(): Promise<boolean> {
  const [sendgridState, sesState] = await Promise.all([
    sendgridCircuitBreaker.getState(),
    sesCircuitBreaker.getState(),
  ]);
  // At least one provider should be available
  return sendgridState !== 'open' || sesState !== 'open';
}

/**
 * Check if SMS is available
 */
export async function isSmsAvailable(): Promise<boolean> {
  const state = await twilioCircuitBreaker.getState();
  return state !== 'open';
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { CircuitBreakerOpenError };
