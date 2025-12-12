'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorType: 'AIVO' | 'THIRD_PARTY';
  roles: string[];
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        // TODO: Call auth API to validate session
        // For now, check localStorage for demo
        const stored = localStorage.getItem('creator_user');
        if (stored) {
          setUser(JSON.parse(stored) as User);
        }
      } catch {
        // Session invalid or expired
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void checkAuth();
  }, []);

  const login = async (email: string, _password: string) => {
    // TODO: Implement real auth
    // For demo, create a mock user
    const mockUser: User = {
      id: 'user-123',
      email,
      name: email.split('@')[0] ?? 'Creator',
      vendorId: 'vendor-123',
      vendorSlug: 'demo-vendor',
      vendorName: 'Demo Vendor',
      vendorType: 'THIRD_PARTY',
      roles: ['CREATOR'],
    };
    setUser(mockUser);
    localStorage.setItem('creator_user', JSON.stringify(mockUser));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('creator_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
