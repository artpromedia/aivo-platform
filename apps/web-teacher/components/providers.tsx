/**
 * Client-side Providers
 *
 * Wraps all client-side context providers for the teacher app.
 * Includes web push notification support (RE-AUDIT-005).
 *
 * Enterprise UI Audit: RE-AUDIT-AUTH-001
 * - Added AuthProvider to replace hardcoded user data
 */
'use client';

import type { Role } from '@aivo/ts-rbac';
import { GradeThemeProvider, AccessibilityProvider } from '@aivo/ui-web';
import { WebPushProvider } from '@aivo/ui-web/components/notifications';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// VAPID public key should come from environment variable
// This is safe to expose in client-side code as it's the public key
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Auth State Interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  tenantId: string | null;
  userName: string | null;
  userEmail: string | null;
  userInitials: string | null;
  userRole: string | null;
  roles: Role[];
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  userId: null,
  tenantId: null,
  userName: null,
  userEmail: null,
  userInitials: null,
  userRole: null,
  roles: [],
  logout: async () => {},
});

/**
 * Auth Provider Component
 */
export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth: AuthState;
}) {
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

/**
 * Hook to access auth context
 */
export function useAuth() {
  return useContext(AuthContext);
}

interface ProvidersProps {
  children: ReactNode;
  initialAuth?: AuthState;
}

export function Providers({ children, initialAuth }: ProvidersProps) {
  const defaultAuth: AuthState = {
    isAuthenticated: false,
    userId: null,
    tenantId: null,
    userName: null,
    userEmail: null,
    userInitials: null,
    userRole: null,
    roles: [],
  };

  return (
    <AuthProvider initialAuth={initialAuth || defaultAuth}>
      <GradeThemeProvider initialGrade="G6_8">
        <AccessibilityProvider>
          <WebPushProvider
            vapidPublicKey={VAPID_PUBLIC_KEY}
            serviceWorkerPath="/push-service-worker.js"
            userRole="teacher"
            registerEndpoint="/api/notifications/push/subscribe"
            unregisterEndpoint="/api/notifications/push/unsubscribe"
          >
            {children}
          </WebPushProvider>
        </AccessibilityProvider>
      </GradeThemeProvider>
    </AuthProvider>
  );
}
