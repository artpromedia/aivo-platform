import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiError, NetworkError, buildQueryString } from '@/lib/api/client';

// ── ApiError ─────────────────────────────────────────────────────

describe('ApiError', () => {
  it('constructs with message and status', () => {
    const err = new ApiError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('ApiError');
  });

  it('accepts optional code and details', () => {
    const err = new ApiError('Validation failed', 422, 'VALIDATION_ERROR', {
      field: 'email',
    });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('is an instance of Error', () => {
    const err = new ApiError('test', 500);
    expect(err).toBeInstanceOf(Error);
  });

  it('status is accessible', () => {
    const err = new ApiError('Unauthorized', 401);
    expect(err.status).toBe(401);
  });
});

// ── NetworkError ─────────────────────────────────────────────────

describe('NetworkError', () => {
  it('constructs with message', () => {
    const err = new NetworkError('Network failed');
    expect(err.message).toBe('Network failed');
    expect(err.name).toBe('NetworkError');
  });

  it('accepts original error', () => {
    const originalError = new Error('ECONNREFUSED');
    const err = new NetworkError('Network failed', originalError);
    expect(err.originalError).toBe(originalError);
  });

  it('is an instance of Error', () => {
    const err = new NetworkError('timeout');
    expect(err).toBeInstanceOf(Error);
  });
});

// ── buildQueryString ─────────────────────────────────────────────

describe('buildQueryString', () => {
  it('returns empty string for empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('builds query from simple params', () => {
    const qs = buildQueryString({ page: 1, pageSize: 20 });
    expect(qs).toContain('page=1');
    expect(qs).toContain('pageSize=20');
    expect(qs).toMatch(/^\?/);
  });

  it('skips undefined and null values', () => {
    const qs = buildQueryString({ page: 1, filter: undefined, sort: null });
    expect(qs).toContain('page=1');
    expect(qs).not.toContain('filter');
    expect(qs).not.toContain('sort');
  });

  it('skips empty string values', () => {
    const qs = buildQueryString({ search: '' });
    expect(qs).toBe('');
  });

  it('handles array values', () => {
    const qs = buildQueryString({ tags: ['a', 'b'] });
    expect(qs).toContain('tags=a');
    expect(qs).toContain('tags=b');
  });

  it('handles Date values as ISO strings', () => {
    const date = new Date('2025-01-15T00:00:00Z');
    const qs = buildQueryString({ from: date });
    expect(qs).toContain('from=2025-01-15');
  });

  it('serializes nested objects as JSON', () => {
    const qs = buildQueryString({ filters: { status: 'active' } });
    expect(qs).toContain('filters=');
    expect(qs).toContain('%7B');
  });
});
