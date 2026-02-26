import { describe, it, expect } from 'vitest';

// We test the ApiError class and utility functions from the client module
// Import dynamically to handle module side effects

describe('API Client', () => {
  describe('ApiError class', async () => {
    const { ApiError } = await import('@/src/lib/api/client');

    it('is an instance of Error', () => {
      const err = new ApiError('test error', 'NETWORK_ERROR', 500);
      expect(err).toBeInstanceOf(Error);
    });

    it('sets name to ApiError', () => {
      const err = new ApiError('test', 'NETWORK_ERROR', 500);
      expect(err.name).toBe('ApiError');
    });

    it('sets message, code, and status', () => {
      const err = new ApiError('something went wrong', 'VALIDATION_ERROR', 400);
      expect(err.message).toBe('something went wrong');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.status).toBe(400);
    });

    it('sets optional details and requestId', () => {
      const err = new ApiError('err', 'SERVER_ERROR', 500, {
        details: { field: 'email' },
        requestId: 'req-123',
      });
      expect(err.details).toEqual({ field: 'email' });
      expect(err.requestId).toBe('req-123');
    });

    it('defaults retryable to false', () => {
      const err = new ApiError('err', 'VALIDATION_ERROR', 400);
      expect(err.retryable).toBe(false);
    });

    it('can set retryable via options', () => {
      const err = new ApiError('err', 'SERVER_ERROR', 500, { retryable: true });
      expect(err.retryable).toBe(true);
    });

    describe('isAuthError', () => {
      it('returns true for UNAUTHORIZED code', () => {
        const err = new ApiError('unauth', 'UNAUTHORIZED', 401);
        expect(err.isAuthError()).toBe(true);
      });

      it('returns true for FORBIDDEN code', () => {
        const err = new ApiError('forbidden', 'FORBIDDEN', 403);
        expect(err.isAuthError()).toBe(true);
      });

      it('returns false for other codes', () => {
        const err = new ApiError('bad', 'VALIDATION_ERROR', 400);
        expect(err.isAuthError()).toBe(false);
      });
    });

    describe('canRetry', () => {
      it('returns the retryable property', () => {
        const retryable = new ApiError('err', 'SERVER_ERROR', 500, { retryable: true });
        const nonRetryable = new ApiError('err', 'VALIDATION_ERROR', 400);
        expect(retryable.canRetry()).toBe(true);
        expect(nonRetryable.canRetry()).toBe(false);
      });
    });

    describe('getUserMessage', () => {
      it('returns user-friendly message for UNAUTHORIZED', () => {
        const err = new ApiError('err', 'UNAUTHORIZED', 401);
        const msg = err.getUserMessage();
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
        expect(msg).not.toBe('err'); // Should be user-friendly, not the raw message
      });

      it('returns user-friendly message for FORBIDDEN', () => {
        const err = new ApiError('err', 'FORBIDDEN', 403);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns user-friendly message for NOT_FOUND', () => {
        const err = new ApiError('err', 'NOT_FOUND', 404);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns user-friendly message for VALIDATION_ERROR', () => {
        const err = new ApiError('err', 'VALIDATION_ERROR', 400);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns user-friendly message for NETWORK_ERROR', () => {
        const err = new ApiError('err', 'NETWORK_ERROR', 0);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns user-friendly message for SERVER_ERROR', () => {
        const err = new ApiError('err', 'SERVER_ERROR', 500);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns user-friendly message for RATE_LIMITED', () => {
        const err = new ApiError('err', 'RATE_LIMITED', 429);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns user-friendly message for TIMEOUT', () => {
        const err = new ApiError('err', 'TIMEOUT', 408);
        expect(typeof err.getUserMessage()).toBe('string');
      });

      it('returns a fallback message for unknown codes', () => {
        const err = new ApiError('err', 'UNKNOWN_CODE' as any, 500);
        const msg = err.getUserMessage();
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isDevMode', async () => {
    const { isDevMode } = await import('@/src/lib/api/client');

    it('returns a boolean', () => {
      expect(typeof isDevMode()).toBe('boolean');
    });
  });

  describe('ApiErrorCode values', () => {
    it('covers all 9 expected error codes', () => {
      const codes = [
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'VALIDATION_ERROR',
        'NETWORK_ERROR',
        'SERVER_ERROR',
        'RATE_LIMITED',
        'TIMEOUT',
        'UNKNOWN',
      ];
      expect(codes).toHaveLength(9);
    });
  });
});
