import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock metrics-helper before imports ──────────────────────────────────
vi.mock('../src/providers/metrics-helper.js', () => ({
  incrementCounter: vi.fn(),
  recordHistogram: vi.fn(),
}));

import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
} from '../src/routing/circuit-breaker.js';

// ══════════════════════════════════════════════════════════════════════════════
// CircuitBreaker
// ══════════════════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100, // 100 ms for fast tests
      monitoringWindow: 60_000,
    });
  });

  // ── Initial state ────────────────────────────────────────────────────

  it('should start in CLOSED state', () => {
    expect(breaker.getState()).toBe('CLOSED');
    const stats = breaker.getStats();
    expect(stats.state).toBe('CLOSED');
    expect(stats.failures).toBe(0);
    expect(stats.successes).toBe(0);
  });

  it('should report its id', () => {
    expect(breaker.getId()).toBe('test-breaker');
  });

  it('should be available when closed', () => {
    expect(breaker.isAvailable()).toBe(true);
    expect(breaker.isOpen()).toBe(false);
  });

  // ── Successful execution ─────────────────────────────────────────────

  it('should pass through successful calls in CLOSED state', async () => {
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.getStats().successes).toBeGreaterThanOrEqual(1);
  });

  // ── CLOSED → OPEN on failure threshold ────────────────────────────────

  it('should open circuit after reaching failure threshold', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.isAvailable()).toBe(false);
  });

  it('should reject calls when OPEN with CircuitBreakerOpenError', async () => {
    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await expect(
      breaker.execute(() => Promise.resolve('should not run')),
    ).rejects.toThrow(CircuitBreakerOpenError);
  });

  // ── OPEN → HALF_OPEN after timeout ────────────────────────────────────

  it('should transition to HALF_OPEN after timeout', async () => {
    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.getState()).toBe('OPEN');

    // Wait for timeout
    await new Promise((r) => setTimeout(r, 150));

    // Next call should be allowed (HALF_OPEN probe)
    const result = await breaker.execute(() => Promise.resolve('probe'));
    expect(result).toBe('probe');
  });

  // ── HALF_OPEN → CLOSED on success threshold ──────────────────────────

  it('should close circuit after success threshold in HALF_OPEN', async () => {
    // Trip
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    // Wait for half-open
    await new Promise((r) => setTimeout(r, 150));

    // 2 successes should close it
    await breaker.execute(() => Promise.resolve('s1'));
    await breaker.execute(() => Promise.resolve('s2'));
    expect(breaker.getState()).toBe('CLOSED');
  });

  // ── HALF_OPEN → OPEN on failure ───────────────────────────────────────

  it('should reopen circuit on failure during HALF_OPEN', async () => {
    // Trip
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    // Wait for half-open
    await new Promise((r) => setTimeout(r, 150));

    // Failure → back to OPEN
    await breaker.execute(() => Promise.reject(new Error('still failing'))).catch(() => {});
    expect(breaker.getState()).toBe('OPEN');
  });

  // ── Manual controls ───────────────────────────────────────────────────

  it('should support forceOpen', () => {
    breaker.forceOpen();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isOpen()).toBe(true);
  });

  it('should support reset', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getStats().failures).toBe(0);
  });

  // ── Error propagation ────────────────────────────────────────────────

  it('should propagate the original error', async () => {
    const err = new Error('original');
    await expect(breaker.execute(() => Promise.reject(err))).rejects.toBe(err);
  });

  // ── recordSuccess / recordFailure directly ────────────────────────────

  it('should track manual recordSuccess calls', () => {
    breaker.recordSuccess();
    expect(breaker.getStats().successes).toBeGreaterThanOrEqual(1);
  });

  it('should track manual recordFailure calls', () => {
    breaker.recordFailure(new Error('manual fail'));
    expect(breaker.getStats().failures).toBeGreaterThanOrEqual(1);
  });

  // ── Stats shape ─────────────────────────────────────────────────────

  it('should return properly shaped stats', () => {
    const stats = breaker.getStats();
    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('failures');
    expect(stats).toHaveProperty('successes');
    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('failureRate');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CircuitBreakerRegistry
// ══════════════════════════════════════════════════════════════════════════════

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
      monitoringWindow: 60_000,
    });
  });

  it('should create a breaker on first getBreaker call', () => {
    const b = registry.getBreaker('openai', 'gpt-4');
    expect(b).toBeInstanceOf(CircuitBreaker);
  });

  it('should return the same breaker for repeated calls', () => {
    const b1 = registry.getBreaker('openai', 'gpt-4');
    const b2 = registry.getBreaker('openai', 'gpt-4');
    expect(b1).toBe(b2);
  });

  it('should return different breakers for different providers', () => {
    const b1 = registry.getBreaker('openai', 'gpt-4');
    const b2 = registry.getBreaker('anthropic', 'claude-3');
    expect(b1).not.toBe(b2);
  });

  it('should report hasBreaker correctly', () => {
    expect(registry.hasBreaker('openai', 'gpt-4')).toBe(false);
    registry.getBreaker('openai', 'gpt-4');
    expect(registry.hasBreaker('openai', 'gpt-4')).toBe(true);
  });

  it('should remove a breaker', () => {
    registry.getBreaker('openai', 'gpt-4');
    expect(registry.removeBreaker('openai', 'gpt-4')).toBe(true);
    expect(registry.hasBreaker('openai', 'gpt-4')).toBe(false);
  });

  it('should identify healthy providers', () => {
    registry.getBreaker('openai', 'gpt-4');
    registry.getBreaker('anthropic', 'claude-3');
    const healthy = registry.getHealthyProviders();
    expect(healthy).toContain('openai');
    expect(healthy).toContain('anthropic');
  });

  it('should exclude unhealthy providers', () => {
    const b = registry.getBreaker('openai', 'gpt-4');
    b.forceOpen();
    const healthy = registry.getHealthyProviders();
    expect(healthy).not.toContain('openai');
  });

  it('should get healthy models for a provider', () => {
    registry.getBreaker('openai', 'gpt-4');
    registry.getBreaker('openai', 'gpt-3.5');
    const models = registry.getHealthyModels('openai');
    expect(models).toContain('gpt-4');
    expect(models).toContain('gpt-3.5');
  });

  it('should exclude unhealthy models', () => {
    const b = registry.getBreaker('openai', 'gpt-4');
    registry.getBreaker('openai', 'gpt-3.5');
    b.forceOpen();
    const models = registry.getHealthyModels('openai');
    expect(models).not.toContain('gpt-4');
    expect(models).toContain('gpt-3.5');
  });

  it('should get breakers for a provider', () => {
    registry.getBreaker('openai', 'gpt-4');
    registry.getBreaker('openai', 'gpt-3.5');
    registry.getBreaker('anthropic', 'claude-3');
    const breakers = registry.getBreakersForProvider('openai');
    expect(breakers).toHaveLength(2);
  });

  it('should resetAll breakers', () => {
    const b1 = registry.getBreaker('openai', 'gpt-4');
    const b2 = registry.getBreaker('anthropic', 'claude-3');
    b1.forceOpen();
    b2.forceOpen();

    registry.resetAll();
    expect(b1.getState()).toBe('CLOSED');
    expect(b2.getState()).toBe('CLOSED');
  });

  it('should resetProvider breakers only', () => {
    const b1 = registry.getBreaker('openai', 'gpt-4');
    const b2 = registry.getBreaker('anthropic', 'claude-3');
    b1.forceOpen();
    b2.forceOpen();

    registry.resetProvider('openai');
    expect(b1.getState()).toBe('CLOSED');
    expect(b2.getState()).toBe('OPEN');
  });

  it('should aggregate metrics with correct shape', () => {
    registry.getBreaker('openai', 'gpt-4');
    registry.getBreaker('anthropic', 'claude-3');
    const metrics = registry.getMetrics();
    expect(metrics).toHaveLength(2);
    expect(metrics[0]).toHaveProperty('id');
    expect(metrics[0]).toHaveProperty('providerId');
    expect(metrics[0]).toHaveProperty('stats');
    expect(metrics[0]!.stats).toHaveProperty('state');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CircuitBreakerOpenError
// ══════════════════════════════════════════════════════════════════════════════

describe('CircuitBreakerOpenError', () => {
  it('should be an instance of Error', () => {
    const err = new CircuitBreakerOpenError('circuit open');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CircuitBreakerOpenError');
    expect(err.message).toBe('circuit open');
  });

  it('should store lastError', () => {
    const err = new CircuitBreakerOpenError('open', 'previous failure');
    expect(err.lastError).toBe('previous failure');
  });
});
