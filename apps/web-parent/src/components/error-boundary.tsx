/**
 * Error Boundary Component
 *
 * React error boundary with recovery options for graceful error handling.
 * Supports both class-based error boundary and functional error display.
 */

'use client';

import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ErrorInfo, ReactNode } from 'react';
import { Component, useCallback } from 'react';

import { ApiError } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
  readonly onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorDisplayProps {
  readonly error: Error | null;
  readonly onRetry?: () => void;
  readonly onReset?: () => void;
  readonly compact?: boolean;
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    console.error('Error boundary caught error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error display
      return <ErrorDisplay error={this.state.error} onRetry={this.handleReset} />;
    }

    return this.props.children;
  }
}

// ============================================================================
// Error Display Component
// ============================================================================

export function ErrorDisplay({
  error,
  onRetry,
  onReset: _onReset,
  compact = false,
}: ErrorDisplayProps) {
  const router = useRouter();

  const handleGoHome = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleRefresh = useCallback(() => {
    globalThis.location.reload();
  }, []);

  // Determine error type and message
  const isApiError = error instanceof ApiError;
  const userMessage = isApiError
    ? error.getUserMessage()
    : 'Something went wrong. Please try again.';
  const isAuthError = isApiError && error.isAuthError();
  const canRetry = isApiError ? error.canRetry() : true;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{userMessage}</span>
        </div>
        {onRetry && canRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1 text-sm text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {isAuthError ? 'Authentication Required' : 'Something went wrong'}
        </h2>

        {/* Message */}
        <p className="text-gray-500 dark:text-gray-400 mb-6">{userMessage}</p>

        {/* Error Code (for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Bug className="w-3 h-3" />
              <span>Debug Info</span>
            </div>
            <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
              {error?.message || 'Unknown error'}
            </code>
            {isApiError && error.requestId && (
              <div className="mt-1 text-xs text-gray-500">Request ID: {error.requestId}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthError ? (
            <button
              onClick={() => {
                router.push('/login');
              }}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </button>
          ) : (
            <>
              {canRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}

              <button
                onClick={handleRefresh}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </>
          )}

          <button
            onClick={handleGoHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Query Error Display (for React Query errors)
// ============================================================================

interface QueryErrorDisplayProps {
  readonly error: Error | null;
  readonly onRetry?: () => void;
  readonly title?: string;
  readonly compact?: boolean;
}

export function QueryErrorDisplay({
  error,
  onRetry,
  title,
  compact = false,
}: QueryErrorDisplayProps) {
  const isApiError = error instanceof ApiError;
  const userMessage = isApiError
    ? error.getUserMessage()
    : 'Failed to load data. Please try again.';
  const canRetry = !isApiError || error.canRetry();

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-700 dark:text-red-300 flex-1">{userMessage}</span>
        {onRetry && canRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100">
            {title || 'Failed to load'}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{userMessage}</p>
          {onRetry && canRetry && (
            <button
              onClick={onRetry}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Inline Error (for form fields, etc.)
// ============================================================================

interface InlineErrorProps {
  readonly message: string;
}

export function InlineError({ message }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-1 mt-1 text-sm text-red-600 dark:text-red-400">
      <AlertTriangle className="w-3 h-3" />
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// Toast-like Error Notification
// ============================================================================

interface ErrorNotificationProps {
  readonly message: string;
  readonly onDismiss?: () => void;
  readonly onRetry?: () => void;
}

export function ErrorNotification({ message, onDismiss, onRetry }: ErrorNotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 max-w-sm w-full bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Error</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
