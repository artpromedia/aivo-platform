import { describe, it, expect, vi, beforeEach } from 'vitest';

import { apiClient as apiClientFetch, ApiError, NetworkError } from '@/lib/api/client';

// ── Mock global fetch ────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function emptyResponse(status = 204) {
  return {
    ok: true,
    status,
    statusText: 'No Content',
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Successful requests ──────────────────────────────────────────

describe('apiClientFetch — success', () => {
  it('returns parsed JSON on 200', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ items: [1, 2] }));
    const result = await apiClientFetch<{ items: number[] }>(
      'http://localhost:4000',
      '/api/data',
    );
    expect(result.items).toEqual([1, 2]);
  });

  it('includes auth header when accessToken provided', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    await apiClientFetch('http://localhost:4000', '/api/data', {
      accessToken: 'my-token',
    });
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer my-token');
  });

  it('returns empty object for non-JSON response', async () => {
    mockFetch.mockResolvedValue(emptyResponse());
    const result = await apiClientFetch('http://localhost:4000', '/api/data');
    expect(result).toEqual({});
  });
});

// ── Error handling ───────────────────────────────────────────────

describe('apiClientFetch — errors', () => {
  it('throws ApiError on 4xx', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));
    await expect(
      apiClientFetch('http://localhost:4000', '/api/missing'),
    ).rejects.toThrow(ApiError);
  });

  it('ApiError has correct status', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Forbidden' }, 403));
    try {
      await apiClientFetch('http://localhost:4000', '/api/secret');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }
  });

  it('throws NetworkError on fetch failure with no retries', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      apiClientFetch('http://localhost:4000', '/api/data', { retries: 0 }),
    ).rejects.toThrow();
  });
});

// ── Retries ──────────────────────────────────────────────────────

describe('apiClientFetch — retries', () => {
  it('retries on 5xx errors', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Server error' }, 500))
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }));

    const result = await apiClientFetch<{ data: string }>(
      'http://localhost:4000',
      '/api/data',
      { retries: 1 },
    );
    expect(result.data).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx errors', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Bad request' }, 400));

    await expect(
      apiClientFetch('http://localhost:4000', '/api/data', { retries: 2 }),
    ).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
