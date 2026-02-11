'use client';

import type { Role } from '@aivo/ts-rbac';
import {
  ErrorBoundary,
  PageErrorFallback,
  OfflineBanner,
  useNetworkStatus,
} from '@aivo/ui/components';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  roles: Role[];
  tenantId: string | null;
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  userName: null,
  roles: [],
  tenantId: null,
  accessToken: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  logout: async () => {},
});

export function AuthProvider({
  children,
  initialAuth,
}: Readonly<{
  children: ReactNode;
  initialAuth: AuthState;
}>) {
  const router = useRouter();
  const [state] = useState<AuthState>(initialAuth);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ ...state, logout }), [state, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Network Status Wrapper - Shows offline banner when connectivity is lost
 */
function NetworkStatusWrapper({ children }: Readonly<{ children: ReactNode }>) {
  const { isOnline } = useNetworkStatus();

  return (
    <>
      {!isOnline && <OfflineBanner />}
      {children}
    </>
  );
}

/**
 * Root Providers with Error Boundary and Network Status
 */
export function RootProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ErrorBoundary fallback={({ error, resetError }) => <PageErrorFallback error={error} resetError={resetError} />}>
      <NetworkStatusWrapper>{children}</NetworkStatusWrapper>
    </ErrorBoundary>
  );
}
