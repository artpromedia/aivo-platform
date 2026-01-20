'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

interface AuthResponse {
  user: User;
  accessToken?: string;
}

interface ApiError {
  error: string;
  message?: string;
}

// ============================================================================
// Constants
// ============================================================================

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

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
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate the current session with the auth API
   */
  const validateSession = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired or invalid
          return null;
        }
        throw new Error('Failed to validate session');
      }

      const data = (await response.json()) as AuthResponse;
      return data.user;
    } catch (err) {
      console.error('[Auth] Session validation failed:', err);
      return null;
    }
  }, []);

  /**
   * Refresh the session (called periodically or manually)
   */
  const refreshSession = useCallback(async () => {
    const validatedUser = await validateSession();
    if (validatedUser) {
      setUser(validatedUser);
      setError(null);
    } else {
      setUser(null);
    }
  }, [validateSession]);

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const validatedUser = await validateSession();
        setUser(validatedUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();
  }, [validateSession]);

  /**
   * Set up periodic session validation
   */
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      void refreshSession();
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, refreshSession]);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as ApiError;
        const errorMessage = errorData.message || errorData.error || 'Login failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as AuthResponse;
      setUser(data.user);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout and clear session
   */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[Auth] Logout request failed:', err);
    } finally {
      setUser(null);
      setError(null);
      // Redirect to login page
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
