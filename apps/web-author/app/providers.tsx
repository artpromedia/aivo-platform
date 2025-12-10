'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import type { ContentRole } from '../lib/types';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  roles: ContentRole[];
  tenantId: string | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (auth: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth: AuthState;
}) {
  const [auth, setAuth] = useState<AuthState>(initialAuth);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuth({ isAuthenticated: false, userId: null, roles: [], tenantId: null });
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ ...auth, setAuth, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useIsAuthor() {
  const { roles } = useAuth();
  return roles.some((r) =>
    ['CURRICULUM_AUTHOR', 'DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN'].includes(r)
  );
}

export function useIsReviewer() {
  const { roles } = useAuth();
  return roles.some((r) =>
    ['CURRICULUM_REVIEWER', 'DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN'].includes(r)
  );
}

export function useIsAdmin() {
  const { roles } = useAuth();
  return roles.some((r) => ['DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN'].includes(r));
}
