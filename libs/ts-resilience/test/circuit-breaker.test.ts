import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitConfigs,
  createCircuitBreaker,
  resetAllCircuits,
} from '../src/circuit-breaker';

describe('CircuitBreaker', () => {
  let successAction: ReturnType<typeof vi.fn>;
  let failAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    successAction = vi.fn().mockResolvedValue('ok');
    failAction = vi.fn().mockRejectedValue(new Error('fail'));
    resetAllCircuits();
  });

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      const cb = new CircuitBreaker(successAction, { name: 'test' });
      expect(cb.state).toBe(CircuitState.CLOSED);
      expect(cb.opened).toBe(false);
      expect(cb.halfOpen).toBe(false);
    });

    it('starts with zero stats', () => {
      const cb = new CircuitBreaker(successAction, { name: 'test' });
      expect(cb.stats.failures).toBe(0);
      expect(cb.stats.successes).toBe(0);
      expect(cb.stats.rejects).toBe(0);
    });
  });

  describe('CLOSED state', () => {
    it('executes the action and returns result', async () => {
      const cb = new CircuitBreaker(successAction, { name: 'test' });
      const result = await cb.fire();
      expect(result).toBe('ok');
      expect(cb.stats.successes).toBe(1);
    });

    it('records failures without opening circuit below threshold', async () => {
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 5,
        volumeThreshold: 5,
      });

      // 2 failures should not open it (below threshold)
      for (let i = 0; i < 2; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }
      expect(cb.state).toBe(CircuitState.CLOSED);
      expect(cb.stats.failures).toBe(2);
    });
  });

  describe('CLOSED → OPEN transition', () => {
    it('opens after reaching failure threshold with enough volume', async () => {
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 3,
        volumeThreshold: 3,
        resetTimeout: 60_000,
      });

      for (let i = 0; i < 3; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }
      expect(cb.state).toBe(CircuitState.OPEN);
      expect(cb.opened).toBe(true);
    });

    it('calls onStateChange callback when transitioning', async () => {
      const onStateChange = vi.fn();
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 3,
        volumeThreshold: 3,
        onStateChange,
      });

      for (let i = 0; i < 3; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }
      expect(onStateChange).toHaveBeenCalledWith(CircuitState.CLOSED, CircuitState.OPEN);
    });
  });

  describe('OPEN state', () => {
    it('rejects requests when open (no fallback)', async () => {
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 3,
        volumeThreshold: 3,
        resetTimeout: 60_000,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }
      expect(cb.state).toBe(CircuitState.OPEN);

      // Next call should be rejected
      await expect(cb.fire()).rejects.toThrow();
      expect(cb.stats.rejects).toBeGreaterThan(0);
    });

    it('uses fallback function when circuit is open', async () => {
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 3,
        volumeThreshold: 3,
        resetTimeout: 60_000,
      });

      cb.fallback(() => 'fallback-value');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }

      // Fallback should be used
      const result = await cb.fire();
      expect(result).toBe('fallback-value');
      expect(cb.stats.fallbacks).toBeGreaterThan(0);
    });
  });

  describe('OPEN → HALF_OPEN transition', () => {
    it('transitions to half-open after resetTimeout', async () => {
      vi.useFakeTimers();
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 3,
        volumeThreshold: 3,
        resetTimeout: 1000,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }
      expect(cb.state).toBe(CircuitState.OPEN);

      // Advance time past reset timeout
      vi.advanceTimersByTime(1100);

      // Replace with success action for the probe
      const probeAction = vi.fn().mockResolvedValue('recovered');
      const cb2 = new CircuitBreaker(probeAction, {
        name: 'test-2',
        failureThreshold: 3,
        volumeThreshold: 3,
        resetTimeout: 1000,
      });

      // Open then wait — use a fn that fails first, then succeeds for probe
      const failThenSucceed = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('recovered');
      const cb3 = new CircuitBreaker(failThenSucceed, {
        name: 'test-3',
        failureThreshold: 3,
        volumeThreshold: 3,
        resetTimeout: 1000,
      });
      for (let i = 0; i < 3; i++) {
        await expect(cb3.fire()).rejects.toThrow();
      }
      expect(cb3.state).toBe(CircuitState.OPEN);
      vi.advanceTimersByTime(1100);

      // The next fire triggers allowRequest() which transitions OPEN → HALF_OPEN
      // The probe call should succeed since the mock now resolves
      const result = await cb3.fire();
      expect(result).toBe('recovered');

      vi.useRealTimers();
    });
  });

  describe('close()', () => {
    it('manually closes the circuit', async () => {
      const cb = new CircuitBreaker(failAction, {
        name: 'test',
        failureThreshold: 3,
        volumeThreshold: 3,
      });

      for (let i = 0; i < 3; i++) {
        await expect(cb.fire()).rejects.toThrow('fail');
      }
      expect(cb.state).toBe(CircuitState.OPEN);

      cb.close();
      expect(cb.state).toBe(CircuitState.CLOSED);
    });
  });

  describe('stats', () => {
    it('tracks latency metrics', async () => {
      const cb = new CircuitBreaker(successAction, { name: 'test' });
      await cb.fire();
      await cb.fire();
      await cb.fire();

      const stats = cb.stats;
      expect(stats.successes).toBe(3);
      expect(stats.latencyMean).toBeGreaterThanOrEqual(0);
      expect(stats.percentiles['50']).toBeGreaterThanOrEqual(0);
      expect(stats.percentiles['99']).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createCircuitBreaker factory', () => {
    it('creates a circuit breaker with the given options', async () => {
      const cb = createCircuitBreaker(successAction, {
        name: 'factory-test',
        ...CircuitConfigs.standard,
      });
      const result = await cb.fire();
      expect(result).toBe('ok');
    });
  });

  describe('CircuitConfigs', () => {
    it('has all expected presets', () => {
      expect(CircuitConfigs.standard).toBeDefined();
      expect(CircuitConfigs.aiService).toBeDefined();
      expect(CircuitConfigs.database).toBeDefined();
      expect(CircuitConfigs.externalApi).toBeDefined();
      expect(CircuitConfigs.critical).toBeDefined();
    });

    it('has reasonable default values', () => {
      expect(CircuitConfigs.standard.failureThreshold).toBeGreaterThan(0);
      expect(CircuitConfigs.standard.timeout).toBeGreaterThan(0);
      expect(CircuitConfigs.standard.resetTimeout).toBeGreaterThan(0);
      expect(CircuitConfigs.aiService.timeout).toBeGreaterThan(CircuitConfigs.standard.timeout);
    });
  });
});
