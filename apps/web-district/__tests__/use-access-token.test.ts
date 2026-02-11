/**
 * useAccessToken hook tests
 *
 * Validates the hook correctly fetches and caches the access token
 * from the /api/auth/session endpoint.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useAccessToken } from '@/lib/use-access-token';

describe('useAccessToken', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches token from /api/auth/session', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          accessToken: 'real-jwt-token',
        },
      }),
    } as Response);

    const { result } = renderHook(() => useAccessToken());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accessToken).toBe('real-jwt-token');
    expect(result.current.tenantId).toBe('tenant-1');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns null when session endpoint returns 401', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ session: null }),
    } as unknown as Response);

    const { result } = renderHook(() => useAccessToken());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles network errors gracefully', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAccessToken());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
