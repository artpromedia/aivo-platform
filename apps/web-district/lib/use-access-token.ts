/**
 * Access Token Hook
 *
 * Provides the access token from the server session for client-side API calls.
 * This replaces hardcoded 'mock-token' values across district components.
 *
 * @example
 * ```tsx
 * const { accessToken, isLoading } = useAccessToken();
 * useEffect(() => {
 *   if (!accessToken) return;
 *   loadCurricula(accessToken);
 * }, [accessToken]);
 * ```
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseAccessTokenResult {
  accessToken: string | null;
  tenantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

let cachedToken: string | null = null;
let cachedTenantId: string | null = null;
let fetchPromise: Promise<void> | null = null;

async function fetchTokenFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      cachedToken = data.session?.accessToken ?? null;
      cachedTenantId = data.session?.tenantId ?? null;
    } else {
      cachedToken = null;
      cachedTenantId = null;
    }
  } catch {
    cachedToken = null;
    cachedTenantId = null;
  }
  fetchPromise = null;
}

export function useAccessToken(): UseAccessTokenResult {
  const [accessToken, setAccessToken] = useState<string | null>(cachedToken);
  const [tenantId, setTenantId] = useState<string | null>(cachedTenantId);
  const [isLoading, setIsLoading] = useState(cachedToken === null);

  const loadToken = useCallback(async () => {
    if (cachedToken) {
      setAccessToken(cachedToken);
      setTenantId(cachedTenantId);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    if (!fetchPromise) {
      fetchPromise = fetchTokenFromServer();
    }
    await fetchPromise;
    setAccessToken(cachedToken);
    setTenantId(cachedTenantId);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  return useMemo(() => ({
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated: accessToken !== null,
  }), [accessToken, tenantId, isLoading]);
}
