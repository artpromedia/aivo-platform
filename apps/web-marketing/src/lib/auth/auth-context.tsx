'use client';

import * as React from 'react';

import type { User, AuthState, RegistrationContext } from './types';
import {
  buildRegistrationUrl,
  buildLoginUrl,
  buildDashboardUrl,
  storeRegistrationContext,
  trackConversion,
} from './utils';

interface AuthContextValue extends AuthState {
  // Actions
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;

  // Navigation helpers
  goToRegister: (context?: RegistrationContext) => void;
  goToLogin: (returnUrl?: string) => void;
  goToDashboard: (path?: string) => void;
  goToCheckout: (plan: string, interval: string) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Check if user is authenticated by calling the auth API
   */
  const checkAuth = React.useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${APP_URL}/api/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { user: User };
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null, // Don't show error for auth check failures
      });
    }
  }, []);

  /**
   * Log out the user
   */
  const logout = React.useCallback(async () => {
    try {
      await fetch(`${APP_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  /**
   * Navigate to registration with context
   */
  const goToRegister = React.useCallback((context?: RegistrationContext) => {
    // Store context for retrieval after OAuth flows
    if (context) {
      storeRegistrationContext(context);
    }

    // Track conversion intent
    trackConversion('registration_started', {
      plan: context?.plan,
      source: context?.source || 'marketing',
    });

    // Navigate
    const url = buildRegistrationUrl(context);
    window.location.href = url;
  }, []);

  /**
   * Navigate to login
   */
  const goToLogin = React.useCallback((returnUrl?: string) => {
    trackConversion('login_started', { source: 'marketing' });
    window.location.href = buildLoginUrl(returnUrl);
  }, []);

  /**
   * Navigate to dashboard
   */
  const goToDashboard = React.useCallback((path?: string) => {
    window.location.href = buildDashboardUrl(path);
  }, []);

  /**
   * Navigate to checkout
   */
  const goToCheckout = React.useCallback((plan: string, interval: string) => {
    trackConversion('checkout_started', { plan, interval, source: 'marketing' });

    const params = new URLSearchParams({
      plan,
      interval,
      source: 'marketing',
    });

    window.location.href = `${APP_URL}/checkout?${params.toString()}`;
  }, []);

  // Check auth on mount
  React.useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const value: AuthContextValue = {
    ...state,
    checkAuth,
    logout,
    goToRegister,
    goToLogin,
    goToDashboard,
    goToCheckout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
