'use client';

/**
 * API Error Handling Hook
 *
 * Centralized hook for handling API errors with toast notifications,
 * navigation for auth errors, and error reporting.
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

import { reportError, addBreadcrumb } from '../components/ErrorBoundary';

// =============================================================================
// Types
// =============================================================================

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  code?: string;
  details?: unknown;
}

export interface NetworkError extends Error {
  type: 'network';
}

export interface UseApiErrorOptions {
  /** Custom toast function (defaults to console) */
  toast?: {
    error: (message: string) => void;
    warning?: (message: string) => void;
    info?: (message: string) => void;
  };
  /** Callback for 401 errors */
  onUnauthorized?: () => void;
  /** Callback for 403 errors */
  onForbidden?: () => void;
  /** Login redirect path */
  loginPath?: string;
  /** Whether to report errors */
  reportErrors?: boolean;
}

export interface UseApiErrorReturn {
  /** Handle an API error */
  handleError: (error: unknown, context?: string) => void;
  /** Wrap an async function with error handling */
  withErrorHandling: <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ) => Promise<T | undefined>;
  /** Check if error is an API error */
  isApiError: (error: unknown) => error is ApiError;
  /** Check if error is a network error */
  isNetworkError: (error: unknown) => error is NetworkError;
  /** Get user-friendly message for an error */
  getErrorMessage: (error: unknown) => string;
}

// =============================================================================
// Default Toast (Console Fallback)
// =============================================================================

const defaultToast = {
  error: (message: string) => {
    console.error('[Toast Error]', message);
  },
  warning: (message: string) => {
    console.warn('[Toast Warning]', message);
  },
  info: (message: string) => {
    console.info('[Toast Info]', message);
  },
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useApiError(
  options: UseApiErrorOptions = {}
): UseApiErrorReturn {
  const {
    toast = defaultToast,
    onUnauthorized,
    onForbidden,
    loginPath = '/login',
    reportErrors = true,
  } = options;

  const router = useRouter();
  const lastErrorRef = useRef<string | null>(null);
  const lastErrorTimeRef = useRef<number>(0);

  // Prevent duplicate error toasts within 2 seconds
  const shouldShowToast = useCallback((message: string): boolean => {
    const now = Date.now();
    if (
      lastErrorRef.current === message &&
      now - lastErrorTimeRef.current < 2000
    ) {
      return false;
    }
    lastErrorRef.current = message;
    lastErrorTimeRef.current = now;
    return true;
  }, []);

  const isApiError = useCallback((error: unknown): error is ApiError => {
    return error instanceof Error && 'status' in error;
  }, []);

  const isNetworkError = useCallback(
    (error: unknown): error is NetworkError => {
      if (error instanceof Error) {
        return (
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('Network') ||
          error.name === 'TypeError'
        );
      }
      return false;
    },
    []
  );

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (isApiError(error)) {
        switch (error.status) {
          case 400:
            return 'Invalid request. Please check your input.';
          case 401:
            return 'Your session has expired. Please log in again.';
          case 403:
            return 'You do not have permission for this action.';
          case 404:
            return 'The requested resource was not found.';
          case 409:
            return 'This action conflicts with existing data.';
          case 422:
            return 'The provided data is invalid.';
          case 429:
            return 'Too many requests. Please wait a moment.';
          case 500:
            return 'Something went wrong. Please try again later.';
          case 502:
          case 503:
          case 504:
            return 'Service temporarily unavailable. Please try again.';
          default:
            return error.message || 'An unexpected error occurred.';
        }
      }

      if (isNetworkError(error)) {
        return 'Network error. Please check your connection.';
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return 'Request was cancelled.';
        }
        return error.message || 'An unexpected error occurred.';
      }

      return 'An unexpected error occurred.';
    },
    [isApiError, isNetworkError]
  );

  const handleError = useCallback(
    (error: unknown, context?: string) => {
      // Add breadcrumb for debugging
      addBreadcrumb({
        type: 'api',
        category: 'error',
        message: context || 'API Error',
        data: {
          error: error instanceof Error ? error.message : String(error),
          status: isApiError(error) ? error.status : undefined,
        },
      });

      // Report to error tracking
      if (reportErrors) {
        reportError(error, {
          tags: { type: 'api_error', context: context || 'unknown' },
        });
      }

      // Handle specific status codes
      if (isApiError(error)) {
        switch (error.status) {
          case 401:
            if (onUnauthorized) {
              onUnauthorized();
            } else {
              // Default: redirect to login
              router.push(loginPath);
            }
            return;

          case 403:
            if (onForbidden) {
              onForbidden();
            } else {
              const message = getErrorMessage(error);
              if (shouldShowToast(message)) {
                toast.error(message);
              }
            }
            return;

          case 429: {
            const rateLimitMessage = getErrorMessage(error);
            if (shouldShowToast(rateLimitMessage)) {
              if (toast.warning) {
                toast.warning(rateLimitMessage);
              } else {
                toast.error(rateLimitMessage);
              }
            }
            return;
          }
        }
      }

      // Show generic error toast
      const message = getErrorMessage(error);
      if (shouldShowToast(message)) {
        toast.error(message);
      }
    },
    [
      isApiError,
      getErrorMessage,
      shouldShowToast,
      toast,
      router,
      loginPath,
      onUnauthorized,
      onForbidden,
      reportErrors,
    ]
  );

  const withErrorHandling = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: string
    ): Promise<T | undefined> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, context);
        return undefined;
      }
    },
    [handleError]
  );

  return {
    handleError,
    withErrorHandling,
    isApiError,
    isNetworkError,
    getErrorMessage,
  };
}

// =============================================================================
// Query Error Handler for React Query
// =============================================================================

export interface QueryErrorHandlerOptions extends UseApiErrorOptions {
  /** Whether to show toast for query errors */
  showToast?: boolean;
}

/**
 * Create an error handler for React Query's onError callback
 */
export function createQueryErrorHandler(options: QueryErrorHandlerOptions = {}) {
  const { showToast = true } = options;

  return (error: unknown) => {
    // This is a simplified version for use outside of React components
    // In components, use the useApiError hook instead

    const isApiError = (err: unknown): err is ApiError => {
      return err instanceof Error && 'status' in err;
    };

    let message = 'An unexpected error occurred.';

    if (isApiError(error)) {
      switch (error.status) {
        case 401:
          // Redirect to login
          globalThis.window.location.href = options.loginPath || '/login';
          return;
        case 403:
          message = 'You do not have permission for this action.';
          break;
        case 404:
          message = 'The requested resource was not found.';
          break;
        case 429:
          message = 'Too many requests. Please wait a moment.';
          break;
        case 500:
          message = 'Something went wrong. Please try again later.';
          break;
        default:
          message = error.message || message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    if (showToast && options.toast) {
      options.toast.error(message);
    }

    // Report to error tracking
    reportError(error);
  };
}

export default useApiError;
