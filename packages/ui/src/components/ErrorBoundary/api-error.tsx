'use client';

/**
 * API Error Component
 *
 * Display component for API-related errors with contextual messages
 * and retry functionality.
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

import { type ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ApiErrorProps {
  /** The error that occurred */
  error: Error | ApiError | unknown;
  /** Callback to retry the failed operation */
  onRetry?: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Custom title override */
  title?: string;
  /** Custom message override */
  message?: string;
  /** Additional actions to display */
  actions?: ReactNode;
  /** Compact mode for inline display */
  compact?: boolean;
  /** CSS class name */
  className?: string;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  code?: string;
  details?: unknown;
}

// =============================================================================
// Error Message Mapping
// =============================================================================

interface ErrorMessage {
  title: string;
  message: string;
  icon: 'auth' | 'forbidden' | 'notFound' | 'rateLimit' | 'server' | 'generic';
}

function getErrorMessage(error: unknown): ErrorMessage {
  if (isApiError(error)) {
    switch (error.status) {
      case 400:
        return {
          title: 'Invalid Request',
          message: 'The request was invalid. Please check your input and try again.',
          icon: 'generic',
        };
      case 401:
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again to continue.',
          icon: 'auth',
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to access this resource.',
          icon: 'forbidden',
        };
      case 404:
        return {
          title: 'Not Found',
          message: 'The requested resource could not be found.',
          icon: 'notFound',
        };
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'You\'ve made too many requests. Please wait a moment and try again.',
          icon: 'rateLimit',
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. We\'re working to fix it.',
          icon: 'server',
        };
      default:
        return {
          title: 'Request Failed',
          message: error.message || 'An unexpected error occurred. Please try again.',
          icon: 'generic',
        };
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        title: 'Request Cancelled',
        message: 'The request was cancelled.',
        icon: 'generic',
      };
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect. Please check your internet connection.',
        icon: 'generic',
      };
    }
  }

  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    icon: 'generic',
  };
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}

// =============================================================================
// Icons
// =============================================================================

const Icons = {
  auth: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  forbidden: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  notFound: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rateLimit: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  server: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  generic: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

// =============================================================================
// API Error Component
// =============================================================================

export function ApiErrorDisplay({
  error,
  onRetry,
  isRetrying = false,
  title,
  message,
  actions,
  compact = false,
  className = '',
}: ApiErrorProps): JSX.Element {
  const errorInfo = getErrorMessage(error);
  const displayTitle = title || errorInfo.title;
  const displayMessage = message || errorInfo.message;
  const Icon = Icons[errorInfo.icon];

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 ${className}`}
        role="alert"
      >
        <div className="flex-shrink-0 text-red-500">{Icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{displayTitle}</p>
          <p className="text-sm text-red-600 truncate">{displayMessage}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-shrink-0 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center ${className}`}
      role="alert"
    >
      <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">{Icon}</div>

      <h3 className="mb-2 text-lg font-semibold text-gray-900">{displayTitle}</h3>

      <p className="mb-4 max-w-sm text-sm text-gray-600">{displayMessage}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isRetrying ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Retrying...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </>
            )}
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}

// =============================================================================
// Inline Error Component
// =============================================================================

export interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
}

export function InlineError({ message, onDismiss }: InlineErrorProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-500 hover:text-red-700"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ApiErrorDisplay;
