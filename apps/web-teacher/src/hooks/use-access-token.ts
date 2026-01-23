/**
 * Access Token Hook
 *
 * Provides access token from next-auth session for API calls.
 * This replaces hardcoded 'mock-token' values across the application.
 */

'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

interface SessionWithToken {
  accessToken?: string;
}

interface UseAccessTokenResult {
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook to get the current access token from the session
 *
 * @returns Object containing accessToken, loading state, and authentication status
 *
 * @example
 * ```tsx
 * const { accessToken, isLoading, isAuthenticated } = useAccessToken();
 *
 * useEffect(() => {
 *   if (!accessToken) return;
 *   fetchData(accessToken);
 * }, [accessToken]);
 * ```
 */
export function useAccessToken(): UseAccessTokenResult {
  const { data: session, status } = useSession();

  const result = useMemo(() => {
    const typedSession = session as SessionWithToken | null;
    return {
      accessToken: typedSession?.accessToken ?? null,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
    };
  }, [session, status]);

  return result;
}

/**
 * Get access token - throws if not authenticated
 * Use this in contexts where authentication is guaranteed
 *
 * @throws Error if not authenticated
 */
export function useRequiredAccessToken(): string {
  const { accessToken, isLoading, isAuthenticated } = useAccessToken();

  if (isLoading) {
    throw new Error('Session is still loading');
  }

  if (!isAuthenticated || !accessToken) {
    throw new Error('User is not authenticated');
  }

  return accessToken;
}
