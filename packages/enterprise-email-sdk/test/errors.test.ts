import { describe, it, expect } from 'vitest';

import {
  OonruMailError,
  OonruMailTimeoutError,
  OonruMailAuthError,
  OonruMailRateLimitError,
} from '../src/index.js';

// ── OonruMailError tests ─────────────────────────────────────────

describe('OonruMailError', () => {
  it('sets message', () => {
    const err = new OonruMailError('something broke');
    expect(err.message).toBe('something broke');
  });

  it('defaults retryable to false', () => {
    const err = new OonruMailError('fail');
    expect(err.retryable).toBe(false);
  });

  it('accepts retryable=true', () => {
    const err = new OonruMailError('fail', { retryable: true });
    expect(err.retryable).toBe(true);
  });

  it('stores statusCode', () => {
    const err = new OonruMailError('fail', { statusCode: 500 });
    expect(err.statusCode).toBe(500);
  });

  it('stores errorCode', () => {
    const err = new OonruMailError('fail', { errorCode: 'ERR_001' });
    expect(err.errorCode).toBe('ERR_001');
  });

  it('name is OonruMailError', () => {
    const err = new OonruMailError('x');
    expect(err.name).toBe('OonruMailError');
  });

  it('is an Error instance', () => {
    const err = new OonruMailError('x');
    expect(err).toBeInstanceOf(Error);
  });
});

// ── OonruMailTimeoutError tests ──────────────────────────────────

describe('OonruMailTimeoutError', () => {
  it('has default message', () => {
    const err = new OonruMailTimeoutError();
    expect(err.message).toBe('Request timed out');
  });

  it('is retryable', () => {
    const err = new OonruMailTimeoutError();
    expect(err.retryable).toBe(true);
  });

  it('has TIMEOUT errorCode', () => {
    const err = new OonruMailTimeoutError();
    expect(err.errorCode).toBe('TIMEOUT');
  });

  it('uses custom message', () => {
    const err = new OonruMailTimeoutError('custom timeout');
    expect(err.message).toBe('custom timeout');
  });

  it('extends OonruMailError', () => {
    const err = new OonruMailTimeoutError();
    expect(err).toBeInstanceOf(OonruMailError);
  });
});

// ── OonruMailAuthError tests ─────────────────────────────────────

describe('OonruMailAuthError', () => {
  it('has default message', () => {
    const err = new OonruMailAuthError();
    expect(err.message).toBe('Authentication failed');
  });

  it('is NOT retryable', () => {
    const err = new OonruMailAuthError();
    expect(err.retryable).toBe(false);
  });

  it('has statusCode 401', () => {
    const err = new OonruMailAuthError();
    expect(err.statusCode).toBe(401);
  });

  it('has AUTH_ERROR errorCode', () => {
    const err = new OonruMailAuthError();
    expect(err.errorCode).toBe('AUTH_ERROR');
  });
});

// ── OonruMailRateLimitError tests ────────────────────────────────

describe('OonruMailRateLimitError', () => {
  it('has default message', () => {
    const err = new OonruMailRateLimitError();
    expect(err.message).toBe('Rate limit exceeded');
  });

  it('is retryable', () => {
    const err = new OonruMailRateLimitError();
    expect(err.retryable).toBe(true);
  });

  it('has statusCode 429', () => {
    const err = new OonruMailRateLimitError();
    expect(err.statusCode).toBe(429);
  });

  it('stores retryAfterMs', () => {
    const err = new OonruMailRateLimitError('limit', 5000);
    expect(err.retryAfterMs).toBe(5000);
  });

  it('retryAfterMs is undefined when not provided', () => {
    const err = new OonruMailRateLimitError();
    expect(err.retryAfterMs).toBeUndefined();
  });
});
