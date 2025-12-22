'use client';

import * as React from 'react';

import { apiClient, APP_URL, MARKETING_URL } from '@/lib/api-client';
import type { User, Subscription, BillingInterval, RegistrationParams } from '@/lib/types';

// ============================================
// TYPES
// ============================================

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  // State checks
  isPro: boolean;
  isPremium: boolean;
  isTrialing: boolean;
  hasActiveSubscription: boolean;

  // Actions
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>; // Alias for refreshAuth

  // Navigation helpers (new names)
  navigateToRegister: (params?: RegistrationParams) => void;
  navigateToLogin: (returnUrl?: string) => void;
  navigateToDashboard: (path?: string) => void;
  navigateToCheckout: (plan: 'pro' | 'premium', interval: BillingInterval) => void;
  navigateToUpgrade: () => void;

  // Navigation helpers (legacy aliases for backward compatibility)
  goToRegister: (context?: RegistrationParams) => void;
  goToLogin: (returnUrl?: string) => void;
  goToDashboard: (path?: string) => void;
  goToCheckout: (plan: string, interval: string) => void;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// ============================================
// URL BUILDERS
// ============================================

function buildUrl(base: string, path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

// ============================================
// ANALYTICS HELPERS
// ============================================

function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (globalThis.window !== undefined) {
    // Google Analytics
    const gtag = (
      globalThis as unknown as { gtag?: (type: string, event: string, params?: unknown) => void }
    ).gtag;
    if (gtag) {
      gtag('event', eventName, params);
    }

    // Vercel Analytics
    const va = (globalThis as unknown as { va?: (type: string, payload: unknown) => void }).va;
    if (va) {
      va('event', { name: eventName, data: params });
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, params);
    }
  }
}

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    subscription: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // ----------------------------------------
  // Fetch auth state from main app
  // ----------------------------------------
  const refreshAuth = React.useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { isAuthenticated, user, subscription } = await apiClient.checkAuth();

      setState({
        user: user || null,
        subscription: subscription || null,
        isAuthenticated,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setState({
        user: null,
        subscription: null,
        isAuthenticated: false,
        isLoading: false,
        error: null, // Don't show error for auth check failures
      });
    }
  }, []);

  // ----------------------------------------
  // Logout
  // ----------------------------------------
  const logout = React.useCallback(async () => {
    try {
      await apiClient.logout();
      trackEvent('logout', { source: 'marketing' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setState({
        user: null,
        subscription: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  // ----------------------------------------
  // Navigation: Register
  // ----------------------------------------
  const navigateToRegister = React.useCallback((params?: RegistrationParams) => {
    const url = buildUrl(APP_URL, '/register', {
      plan: params?.plan,
      interval: params?.interval,
      ref: params?.ref,
      source: params?.source || 'marketing',
      returnUrl: params?.returnUrl,
    });

    // Track conversion
    trackEvent('begin_sign_up', {
      method: 'redirect',
      plan: params?.plan,
      source: 'marketing',
    });

    globalThis.location.href = url;
  }, []);

  // ----------------------------------------
  // Navigation: Login
  // ----------------------------------------
  const navigateToLogin = React.useCallback((returnUrl?: string) => {
    const url = buildUrl(APP_URL, '/login', {
      returnUrl: returnUrl || MARKETING_URL,
    });

    trackEvent('login_started', { source: 'marketing' });

    globalThis.location.href = url;
  }, []);

  // ----------------------------------------
  // Navigation: Dashboard
  // ----------------------------------------
  const navigateToDashboard = React.useCallback((path = '') => {
    globalThis.location.href = `${APP_URL}/dashboard${path}`;
  }, []);

  // ----------------------------------------
  // Navigation: Checkout
  // ----------------------------------------
  const navigateToCheckout = React.useCallback(
    async (plan: 'pro' | 'premium', interval: BillingInterval) => {
      // Track checkout intent
      trackEvent('begin_checkout', {
        currency: 'USD',
        items: [{ item_name: `${plan}_${interval}` }],
        source: 'marketing',
      });

      // If user is authenticated, try to create checkout session directly
      if (state.isAuthenticated) {
        try {
          const response = await apiClient.createCheckoutSession({
            plan,
            interval,
            cancelUrl: `${MARKETING_URL}/pricing`,
          });

          if (response.data?.url) {
            globalThis.location.href = response.data.url;
            return;
          }
        } catch (error) {
          console.error('Checkout session creation failed:', error);
        }
      }

      // Not authenticated or session creation failed - redirect to register with plan
      navigateToRegister({
        plan,
        interval,
        source: 'checkout',
      });
    },
    [state.isAuthenticated, navigateToRegister]
  );

  // ----------------------------------------
  // Navigation: Upgrade
  // ----------------------------------------
  const navigateToUpgrade = React.useCallback(() => {
    trackEvent('upgrade_started', {
      current_plan: state.subscription?.plan,
      source: 'marketing',
    });

    if (state.isAuthenticated) {
      globalThis.location.href = `${APP_URL}/settings/subscription`;
    } else {
      navigateToRegister({ plan: 'pro', source: 'upgrade' });
    }
  }, [state.isAuthenticated, state.subscription?.plan, navigateToRegister]);

  // ----------------------------------------
  // Navigation: Checkout (legacy signature wrapper)
  // ----------------------------------------
  const goToCheckout = React.useCallback(
    (plan: string, interval: string) => {
      // Convert string to typed values for navigateToCheckout
      const typedPlan = plan as 'pro' | 'premium';
      const typedInterval = interval as BillingInterval;
      void navigateToCheckout(typedPlan, typedInterval);
    },
    [navigateToCheckout]
  );

  // ----------------------------------------
  // Computed values
  // ----------------------------------------
  const isPro = state.subscription?.plan === 'pro';
  const isPremium = state.subscription?.plan === 'premium';
  const isTrialing = state.subscription?.status === 'trialing';
  const hasActiveSubscription =
    state.subscription?.status === 'active' || state.subscription?.status === 'trialing';

  // ----------------------------------------
  // Initial auth check
  // ----------------------------------------
  React.useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  // ----------------------------------------
  // Context value - memoized to prevent unnecessary re-renders
  // ----------------------------------------
  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      isPro,
      isPremium,
      isTrialing,
      hasActiveSubscription,
      refreshAuth,
      logout,
      checkAuth: refreshAuth, // Alias
      navigateToRegister,
      navigateToLogin,
      navigateToDashboard,
      navigateToCheckout,
      navigateToUpgrade,
      // Legacy aliases
      goToRegister: navigateToRegister,
      goToLogin: navigateToLogin,
      goToDashboard: navigateToDashboard,
      goToCheckout,
    }),
    [
      state,
      isPro,
      isPremium,
      isTrialing,
      hasActiveSubscription,
      refreshAuth,
      logout,
      navigateToRegister,
      navigateToLogin,
      navigateToDashboard,
      navigateToCheckout,
      navigateToUpgrade,
      goToCheckout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
