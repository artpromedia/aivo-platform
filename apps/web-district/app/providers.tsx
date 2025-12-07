'use client';

import type { Role } from '@aivo/ts-rbac';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

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

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth: AuthState;
}) {
  const router = useRouter();
  const [state] = useState<AuthState>(initialAuth);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const value = useMemo(() => ({ ...state, logout }), [state, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
