/**
 * Auth Store
 *
 * Zustand store for authentication state management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { User } from '../api/auth';
import { getCurrentUser, logout as apiLogout, isAuthenticated } from '../api/auth';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;

  // Computed
  isAuthor: boolean;
  isReviewer: boolean;
  isAdmin: boolean;
  tenantId: string | null;

  // Actions
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// STORE
// ══════════════════════════════════════════════════════════════════════════════

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      isAuthor: false,
      isReviewer: false,
      isAdmin: false,
      tenantId: null,

      // Initialize auth state on app load
      initialize: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          // Check if we have a valid token
          if (!isAuthenticated()) {
            set((state) => {
              state.user = null;
              state.isAuthenticated = false;
              state.isAuthor = false;
              state.isReviewer = false;
              state.isAdmin = false;
              state.tenantId = null;
              state.isLoading = false;
            });
            return;
          }

          // Fetch current user
          const user = await getCurrentUser();

          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
            state.isAuthor = user.roles.includes('author');
            state.isReviewer = user.roles.includes('reviewer');
            state.isAdmin = user.roles.includes('admin');
            state.tenantId = user.tenantId ?? null;
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isAuthor = false;
            state.isReviewer = false;
            state.isAdmin = false;
            state.tenantId = null;
            state.isLoading = false;
            state.error = error instanceof Error ? error : new Error('Failed to initialize auth');
          });
        }
      },

      // Set user after login
      setUser: (user) => {
        set((state) => {
          state.user = user;
          state.isAuthenticated = user !== null;
          state.isAuthor = user?.roles.includes('author') ?? false;
          state.isReviewer = user?.roles.includes('reviewer') ?? false;
          state.isAdmin = user?.roles.includes('admin') ?? false;
          state.tenantId = user?.tenantId ?? null;
          state.error = null;
        });
      },

      // Logout
      logout: async () => {
        try {
          await apiLogout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
        } finally {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isAuthor = false;
            state.isReviewer = false;
            state.isAdmin = false;
            state.tenantId = null;
            state.error = null;
          });
        }
      },

      // Refresh user data
      refreshUser: async () => {
        const { isAuthenticated: isAuth } = get();
        if (!isAuth) return;

        try {
          const user = await getCurrentUser();
          set((state) => {
            state.user = user;
            state.isAuthor = user.roles.includes('author');
            state.isReviewer = user.roles.includes('reviewer');
            state.isAdmin = user.roles.includes('admin');
            state.tenantId = user.tenantId ?? null;
          });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      // Clear error
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
    })),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAuthor: state.isAuthor,
        isReviewer: state.isReviewer,
        isAdmin: state.isAdmin,
        tenantId: state.tenantId,
      }),
    }
  )
);

// ══════════════════════════════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════════════════════════════

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsAuthor = (state: AuthState) => state.isAuthor;
export const selectIsReviewer = (state: AuthState) => state.isReviewer;
export const selectIsAdmin = (state: AuthState) => state.isAdmin;
export const selectTenantId = (state: AuthState) => state.tenantId;

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════════════════════

// Re-export convenient hooks
export const useUser = () => useAuthStore(selectUser);
export const useIsAuthor = () => useAuthStore(selectIsAuthor);
export const useIsReviewer = () => useAuthStore(selectIsReviewer);
export const useIsAdmin = () => useAuthStore(selectIsAdmin);
export const useTenantId = () => useAuthStore(selectTenantId);

export default useAuthStore;
