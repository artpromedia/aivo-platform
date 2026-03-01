'use client';

import type { Role } from '@aivo/ts-rbac';
import {
  ErrorBoundary,
  PageErrorFallback,
  OfflineBanner,
  useNetworkStatus,
} from '@aivo/ui/components';
import { ToastProvider, ConfirmProvider } from '@aivo/ui-web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  roles: Role[];
  tenantId: string | null;
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  userName: null,
  roles: [],
  tenantId: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  initialAuth: AuthState;
}

export function AuthProvider({
  children,
  initialAuth,
}: Readonly<AuthProviderProps>) {
  const router = useRouter();
  const [state] = useState<AuthState>(initialAuth);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ ...state, logout }), [state, logout]);

  return (
    <ErrorBoundary fallback={({ error, resetError }) => <PageErrorFallback error={error} resetError={resetError} />}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <NetworkStatusWrapper>
            <AuthContext.Provider value={value}>
              <ToastProvider>
                <ConfirmProvider>
                  {children}
                </ConfirmProvider>
              </ToastProvider>
            </AuthContext.Provider>
          </NetworkStatusWrapper>
        </QueryClientProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

/**
 * Network Status Wrapper - Shows offline banner when connectivity is lost
 */
function NetworkStatusWrapper({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus();

  return (
    <>
      {!isOnline && <OfflineBanner />}
      {children}
    </>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Returns true if the current user has write access (PLATFORM_ADMIN only).
 * Use this to conditionally hide mutating buttons from SUPPORT users.
 */
export function useHasWriteAccess(): boolean {
  const { roles } = useAuth();
  return roles.includes('PLATFORM_ADMIN' as Role);
}
