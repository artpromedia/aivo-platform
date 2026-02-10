import { describe, it, expect, vi } from 'vitest';
import {
  withTimeout,
  createTimeout,
  raceTimeout,
  executeWithTimeouts,
  isTimeoutError,
  TimeoutConfigs,
} from '../src/timeout';

describe('timeout', () => {
  describe('withTimeout', () => {
    it('resolves when operation completes before timeout', async () => {
      const result = await withTimeout(async () => 'done', { timeoutMs: 5000 });
      expect(result).toBe('done');
    });

    it('rejects with TimeoutError when operation exceeds timeout', async () => {
      await expect(
        withTimeout(() => new Promise((resolve) => setTimeout(resolve, 5000)), {
          timeoutMs: 10,
          message: 'too slow',
        })
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
        timeout: 10,
        message: 'too slow',
      });
    });

    it('forwards operation errors', async () => {
      await expect(
        withTimeout(
          async () => {
            throw new Error('op failed');
          },
          { timeoutMs: 5000 }
        )
      ).rejects.toThrow('op failed');
    });
  });

  describe('createTimeout', () => {
    it('rejects after specified ms', async () => {
      await expect(createTimeout(10, 'test timeout')).rejects.toMatchObject({
        code: 'TIMEOUT',
        timeout: 10,
        message: 'test timeout',
      });
    });
  });

  describe('raceTimeout', () => {
    it('resolves if operation wins the race', async () => {
      const result = await raceTimeout(Promise.resolve('fast'), 5000);
      expect(result).toBe('fast');
    });

    it('rejects if timeout wins the race', async () => {
      await expect(
        raceTimeout(new Promise((resolve) => setTimeout(resolve, 5000)), 10, 'too slow')
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
      });
    });
  });

  describe('executeWithTimeouts', () => {
    it('returns results for all operations', async () => {
      const results = await executeWithTimeouts([
        { operation: async () => 'a', timeoutMs: 5000 },
        { operation: async () => 'b', timeoutMs: 5000 },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, result: 'a' });
      expect(results[1]).toEqual({ success: true, result: 'b' });
    });

    it('handles mixed success and failure', async () => {
      const results = await executeWithTimeouts([
        { operation: async () => 'ok', timeoutMs: 5000 },
        {
          operation: () => new Promise((resolve) => setTimeout(resolve, 5000)),
          timeoutMs: 10,
        },
      ]);

      expect(results[0]).toEqual({ success: true, result: 'ok' });
      expect(results[1]?.success).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('returns true for timeout errors', () => {
      const err = new Error('timed out') as Error & { code: string; timeout: number };
      err.code = 'TIMEOUT';
      err.timeout = 5000;
      expect(isTimeoutError(err)).toBe(true);
    });

    it('returns false for regular errors', () => {
      expect(isTimeoutError(new Error('regular'))).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
    });
  });

  describe('TimeoutConfigs', () => {
    it('has all expected presets', () => {
      expect(TimeoutConfigs.quick.timeoutMs).toBe(5_000);
      expect(TimeoutConfigs.standard.timeoutMs).toBe(10_000);
      expect(TimeoutConfigs.heavy.timeoutMs).toBe(60_000);
      expect(TimeoutConfigs.aiOperation.timeoutMs).toBe(45_000);
      expect(TimeoutConfigs.backgroundJob.timeoutMs).toBe(300_000);
    });
  });
});
