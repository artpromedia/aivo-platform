/**
 * @aivo/auth-web — Client-side React hooks
 *
 * Provides `useSession()` for client components that need to display
 * user info or conditionally render based on auth state.
 *
 * The hook fetches from `/api/auth/session` which is a thin server-side
 * route that calls `getServerSession()` and returns the non-sensitive fields.
 *
 * Usage:
 * ```tsx
 * 'use client';
 * import { useSession, SessionProvider } from '@aivo/auth-web/client';
 *
 * function Header() {
 *   const { session, status } = useSession();
 *   if (status === 'loading') return <Skeleton />;
 *   if (!session) return <LoginButton />;
 *   return <span>{session.name}</span>;
 * }
 * ```
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientImpersonationInfo {
  sessionId: string;
  adminUserId: string;
  readOnly: boolean;
  expiresAt: string;
}

export interface ClientSession {
  userId: string;
  tenantId: string;
  roles: string[];
  name: string | null;
  email: string | null;
  learnerId: string | null;
  isImpersonated?: boolean;
  impersonation?: ClientImpersonationInfo;
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionContextValue {
  session: ClientSession | null;
  status: SessionStatus;
  refresh: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue>({
  session: null,
  status: 'loading',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  refresh: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SessionProviderProps {
  /** Optionally pre-load session on the server (avoids an extra fetch) */
  initialSession?: ClientSession | null;
  children: React.ReactNode;
}

export function SessionProvider({ initialSession, children }: SessionProviderProps) {
  const [session, setSession] = useState<ClientSession | null>(initialSession ?? null);
  const [status, setStatus] = useState<SessionStatus>(
    initialSession !== undefined
      ? initialSession
        ? 'authenticated'
        : 'unauthenticated'
      : 'loading'
  );

  const fetchSession = useCallback(async () => {
    try {
      setStatus('loading');
      const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
      if (res.ok) {
        const data = (await res.json()) as { session: ClientSession | null };
        if (data.session) {
          setSession(data.session);
          setStatus('authenticated');
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    } catch {
      setSession(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    // Only fetch if we weren't given an initial session
    if (initialSession === undefined) {
      void fetchSession();
    }
  }, [initialSession, fetchSession]);

  const value = useMemo(
    () => ({ session, status, refresh: fetchSession }),
    [session, status, fetchSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the current auth session in a client component.
 *
 * Must be used inside a `<SessionProvider>`.
 */
export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

// ─── Re-export shared components ──────────────────────────────────────────────
export { ImpersonationBanner } from './ImpersonationBanner';
