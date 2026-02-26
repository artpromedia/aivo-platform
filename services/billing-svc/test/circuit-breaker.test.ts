import { describe, it, expect, vi, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks — @aivo/rate-limiter provides CircuitBreaker used by billing-svc
// ══════════════════════════════════════════════════════════════════════════════

const mockExecute = vi.fn();
const mockGetState = vi.fn();
const mockGetStats = vi.fn();

vi.mock('@aivo/rate-limiter', () => {
  class CircuitBreaker {
    constructor(public opts: any) {}
    execute = mockExecute;
    getState = mockGetState;
    getStats = mockGetStats;
  }
  class CircuitBreakerOpenError extends Error {
    constructor() {
      super('Circuit is open');
      this.name = 'CircuitBreakerOpenError';
    }
  }
  class MemoryStore {}
  return { CircuitBreaker, CircuitBreakerOpenError, MemoryStore };
});

// ── SUT ────────────────────────────────────────────────────────────────────

import {
  stripeCircuitBreaker,
  webhookCircuitBreaker,
  withStripeCircuitBreaker,
  isStripeAvailable,
  getCircuitBreakerHealth,
  CircuitBreakerOpenError,
} from '../src/lib/circuit-breaker.js';

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Billing Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── instances ─────────────────────────────────────────────────────────

  describe('circuit breaker instances', () => {
    it('should create a stripe circuit breaker', () => {
      expect(stripeCircuitBreaker).toBeDefined();
      expect(stripeCircuitBreaker.opts.name).toBe('stripe-api');
      expect(stripeCircuitBreaker.opts.failureThreshold).toBe(5);
      expect(stripeCircuitBreaker.opts.resetTimeout).toBe(30000);
    });

    it('should create a webhook circuit breaker', () => {
      expect(webhookCircuitBreaker).toBeDefined();
      expect(webhookCircuitBreaker.opts.name).toBe('webhook-delivery');
      expect(webhookCircuitBreaker.opts.failureThreshold).toBe(10);
      expect(webhookCircuitBreaker.opts.resetTimeout).toBe(60000);
    });

    it('should only count 5xx as failures in stripe breaker', () => {
      const isFailure = stripeCircuitBreaker.opts.isFailure;
      expect(isFailure).toBeDefined();

      // Server error → should trip
      const err500 = Object.assign(new Error('Server error'), { statusCode: 500 });
      expect(isFailure(err500)).toBe(true);

      // Client error → should NOT trip
      const err400 = Object.assign(new Error('Bad request'), { statusCode: 400 });
      expect(isFailure(err400)).toBe(false);

      // Network errors → should trip
      const timeout = new Error('Request timeout');
      expect(isFailure(timeout)).toBe(true);

      const connRefused = new Error('ECONNREFUSED');
      expect(isFailure(connRefused)).toBe(true);
    });
  });

  // ── withStripeCircuitBreaker ──────────────────────────────────────────

  describe('withStripeCircuitBreaker', () => {
    it('should execute function through circuit breaker', async () => {
      mockExecute.mockImplementation((fn: () => any) => fn());
      const result = await withStripeCircuitBreaker(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
    });

    it('should use fallback when circuit is open', async () => {
      mockExecute.mockRejectedValueOnce(new CircuitBreakerOpenError());
      const result = await withStripeCircuitBreaker(
        () => Promise.resolve('primary'),
        () => 'fallback',
      );
      expect(result).toBe('fallback');
    });

    it('should throw when circuit is open and no fallback', async () => {
      mockExecute.mockRejectedValueOnce(new CircuitBreakerOpenError());
      await expect(
        withStripeCircuitBreaker(() => Promise.resolve('primary')),
      ).rejects.toThrow('Circuit is open');
    });
  });

  // ── isStripeAvailable ─────────────────────────────────────────────────

  describe('isStripeAvailable', () => {
    it('should return true when circuit is closed', async () => {
      mockGetState.mockResolvedValueOnce('closed');
      expect(await isStripeAvailable()).toBe(true);
    });

    it('should return false when circuit is open', async () => {
      mockGetState.mockResolvedValueOnce('open');
      expect(await isStripeAvailable()).toBe(false);
    });
  });

  // ── getCircuitBreakerHealth ───────────────────────────────────────────

  describe('getCircuitBreakerHealth', () => {
    it('should aggregate health from both breakers', async () => {
      mockGetStats
        .mockResolvedValueOnce({ state: 'closed', failures: 0 })
        .mockResolvedValueOnce({ state: 'half-open', failures: 8 });

      const health = await getCircuitBreakerHealth();

      expect(health.stripe.state).toBe('closed');
      expect(health.stripe.available).toBe(true);
      expect(health.stripe.failures).toBe(0);

      expect(health.webhook.state).toBe('half-open');
      expect(health.webhook.available).toBe(true);
      expect(health.webhook.failures).toBe(8);
    });
  });
});
