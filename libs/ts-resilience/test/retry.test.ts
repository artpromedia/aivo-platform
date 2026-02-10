import { describe, it, expect, vi } from 'vitest';
import {
  retry,
  retryWithResult,
  calculateRetryDelay,
  isRetryableError,
  RetryConfigs,
} from '../src/retry';

describe('retry', () => {
  describe('isRetryableError', () => {
    it('returns false for non-Error values', () => {
      expect(isRetryableError('string error')).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });

    it('recognizes network error codes', () => {
      const codes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH'];
      for (const code of codes) {
        const err = new Error('network error') as Error & { code: string };
        err.code = code;
        expect(isRetryableError(err)).toBe(true);
      }
    });

    it('recognizes retryable HTTP status codes', () => {
      const statuses = [408, 429, 500, 502, 503, 504];
      for (const statusCode of statuses) {
        const err = new Error('http error') as Error & { statusCode: number };
        err.statusCode = statusCode;
        expect(isRetryableError(err)).toBe(true);
      }
    });

    it('recognizes status property', () => {
      const err = new Error('http error') as Error & { status: number };
      err.status = 503;
      expect(isRetryableError(err)).toBe(true);
    });

    it('recognizes timeout in error message', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError(new Error('Operation timed out'))).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      expect(isRetryableError(new Error('Not found'))).toBe(false);
      expect(isRetryableError(new Error('Unauthorized'))).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('returns 0 for first attempt', () => {
      const opts = {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 30_000,
        backoffMultiplier: 2,
        jitterFactor: 0,
        isRetryable: isRetryableError,
        onRetry: vi.fn(),
      };
      expect(calculateRetryDelay(1, opts)).toBe(0);
    });

    it('increases delay exponentially', () => {
      const opts = {
        maxAttempts: 5,
        initialDelayMs: 100,
        maxDelayMs: 100_000,
        backoffMultiplier: 2,
        jitterFactor: 0,
        isRetryable: isRetryableError,
        onRetry: vi.fn(),
      };
      const delay2 = calculateRetryDelay(2, opts);
      const delay3 = calculateRetryDelay(3, opts);
      const delay4 = calculateRetryDelay(4, opts);

      expect(delay2).toBe(100); // 100 * 2^0
      expect(delay3).toBe(200); // 100 * 2^1
      expect(delay4).toBe(400); // 100 * 2^2
    });

    it('caps delay at maxDelayMs', () => {
      const opts = {
        maxAttempts: 10,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 3,
        jitterFactor: 0,
        isRetryable: isRetryableError,
        onRetry: vi.fn(),
      };
      const delay = calculateRetryDelay(10, opts);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('retry()', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, RetryConfigs.none);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable error and succeeds', async () => {
      const err = new Error('timeout') as Error & { code: string };
      err.code = 'ETIMEDOUT';
      const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('recovered');

      const result = await retry(fn, {
        ...RetryConfigs.quick,
        initialDelayMs: 1,
      });
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Bad request'));

      await expect(retry(fn, { ...RetryConfigs.standard, initialDelayMs: 1 })).rejects.toThrow(
        'Bad request'
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('exhausts all retries and throws last error', async () => {
      const err = new Error('timeout') as Error & { code: string };
      err.code = 'ETIMEDOUT';
      const fn = vi.fn().mockRejectedValue(err);

      await expect(
        retry(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10 })
      ).rejects.toThrow('timeout');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('calls onRetry callback before each retry', async () => {
      const err = new Error('timeout') as Error & { code: string };
      err.code = 'ETIMEDOUT';
      const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');
      const onRetry = vi.fn();

      await retry(fn, {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 10,
        onRetry,
      });
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number));
    });
  });

  describe('retryWithResult()', () => {
    it('returns success result', async () => {
      const fn = vi.fn().mockResolvedValue('data');
      const result = await retryWithResult(fn, RetryConfigs.none);
      expect(result.success).toBe(true);
      expect(result.result).toBe('data');
      expect(result.attempts).toBe(1);
      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns failure result after exhausting retries', async () => {
      const err = new Error('timeout') as Error & { code: string };
      err.code = 'ETIMEDOUT';
      const fn = vi.fn().mockRejectedValue(err);
      const result = await retryWithResult(fn, {
        maxAttempts: 2,
        initialDelayMs: 1,
        maxDelayMs: 10,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(2);
    });
  });

  describe('RetryConfigs', () => {
    it('has all expected presets', () => {
      expect(RetryConfigs.standard).toBeDefined();
      expect(RetryConfigs.aggressive).toBeDefined();
      expect(RetryConfigs.quick).toBeDefined();
      expect(RetryConfigs.none).toBeDefined();
    });

    it('none config has maxAttempts of 1', () => {
      expect(RetryConfigs.none.maxAttempts).toBe(1);
    });
  });
});
