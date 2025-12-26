/**
 * Circuit Breaker Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError } from '../circuit-breaker';
import { MemoryStore } from '../stores/memory-store';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    circuitBreaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 1000, // 1 second for testing
      store,
    });
  });

  afterEach(async () => {
    await store.close();
  });

  describe('initial state', () => {
    it('should start in closed state', async () => {
      const state = await circuitBreaker.getState();
      expect(state).toBe('closed');
    });

    it('should allow requests initially', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
    });
  });

  describe('failure handling', () => {
    it('should open after reaching failure threshold', async () => {
      // Cause 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test failure');
          });
        } catch {
          // Expected
        }
      }

      const state = await circuitBreaker.getState();
      expect(state).toBe('open');
    });

    it('should reject requests when open', async () => {
      // Force open
      await circuitBreaker.forceOpen();

      await expect(
        circuitBreaker.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should provide reset time in error', async () => {
      await circuitBreaker.forceOpen();

      try {
        await circuitBreaker.execute(async () => 'should not run');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect((error as CircuitBreakerOpenError).resetTime).toBeGreaterThan(0);
        expect((error as CircuitBreakerOpenError).circuitName).toBe('test-breaker');
      }
    });
  });

  describe('recovery', () => {
    it('should transition to half-open after reset timeout', async () => {
      await circuitBreaker.forceOpen();

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Try a request - should be allowed (half-open)
      const result = await circuitBreaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
    });

    it('should close after success threshold in half-open', async () => {
      await circuitBreaker.forceHalfOpen();

      // Succeed twice
      await circuitBreaker.execute(async () => 'success1');
      await circuitBreaker.execute(async () => 'success2');

      const state = await circuitBreaker.getState();
      expect(state).toBe('closed');
    });

    it('should reopen on failure in half-open', async () => {
      await circuitBreaker.forceHalfOpen();

      try {
        await circuitBreaker.execute(async () => {
          throw new Error('failed during recovery');
        });
      } catch {
        // Expected
      }

      const state = await circuitBreaker.getState();
      expect(state).toBe('open');
    });
  });

  describe('forced state changes', () => {
    it('should allow force open', async () => {
      await circuitBreaker.forceOpen();
      const state = await circuitBreaker.getState();
      expect(state).toBe('open');
    });

    it('should allow force close', async () => {
      await circuitBreaker.forceOpen();
      await circuitBreaker.forceClose();
      const state = await circuitBreaker.getState();
      expect(state).toBe('closed');
    });

    it('should allow force half-open', async () => {
      await circuitBreaker.forceHalfOpen();
      const state = await circuitBreaker.getState();
      expect(state).toBe('half_open');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      await circuitBreaker.forceOpen();
      await circuitBreaker.reset();

      const state = await circuitBreaker.getState();
      expect(state).toBe('closed');

      const stats = await circuitBreaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });
  });

  describe('stats', () => {
    it('should track statistics', async () => {
      // Some successes
      await circuitBreaker.execute(async () => 'success');

      // Some failures
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('failure');
        });
      } catch {
        // Expected
      }

      const stats = await circuitBreaker.getStats();

      expect(stats.name).toBe('test-breaker');
      expect(stats.state).toBe('closed');
      expect(stats.failures).toBe(1);
    });
  });

  describe('custom failure detection', () => {
    it('should use custom failure detector', async () => {
      const customBreaker = new CircuitBreaker({
        name: 'custom-breaker',
        failureThreshold: 1,
        store,
        isFailure: (error) => error.message.includes('critical'),
      });

      // Non-critical error should not count
      try {
        await customBreaker.execute(async () => {
          throw new Error('minor issue');
        });
      } catch {
        // Expected
      }

      let state = await customBreaker.getState();
      expect(state).toBe('closed');

      // Critical error should count
      try {
        await customBreaker.execute(async () => {
          throw new Error('critical failure');
        });
      } catch {
        // Expected
      }

      state = await customBreaker.getState();
      expect(state).toBe('open');
    });
  });

  describe('fallback', () => {
    it('should use fallback when open', async () => {
      const breakerWithFallback = new CircuitBreaker({
        name: 'fallback-breaker',
        store,
        fallback: () => 'fallback value',
      });

      await breakerWithFallback.forceOpen();

      const result = await breakerWithFallback.execute(async () => 'should not run');
      expect(result).toBe('fallback value');
    });
  });
});
