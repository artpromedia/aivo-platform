'use client';

/**
 * Error Boundary Component
 *
 * A React error boundary that catches JavaScript errors anywhere in their child
 * component tree, logs those errors, and displays a fallback UI instead of crashing.
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';

import { reportError } from './error-reporter';

// =============================================================================
// Types
// =============================================================================

export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Custom fallback UI to show when an error occurs */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Keys that, when changed, will reset the error boundary */
  resetKeys?: unknown[];
  /** Whether to report errors to the error tracking service */
  reportToService?: boolean;
  /** Custom error boundary name for error tracking */
  name?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  resetError: () => void;
}

// =============================================================================
// Error Boundary Component
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    reportToService: true,
  };

  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service
    if (this.props.reportToService) {
      reportError(error, {
        componentStack: errorInfo.componentStack ?? undefined,
        boundaryName: this.props.name,
      });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // If fallback is a function, call it with error props
      if (typeof fallback === 'function') {
        return fallback({
          error,
          errorInfo,
          resetError: this.resetError,
        });
      }

      // If fallback is provided as a ReactNode, render it
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// Default Error Fallback
// =============================================================================

export function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
}: ErrorFallbackProps): JSX.Element {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-3">
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Something went wrong
      </h2>

      <p className="mb-4 max-w-md text-sm text-gray-600">
        We&apos;re sorry, but something unexpected happened. Please try again.
      </p>

      {isDev && error && (
        <details className="mb-4 w-full max-w-lg text-left">
          <summary className="cursor-pointer text-sm font-medium text-red-700">
            Error Details (Development Only)
          </summary>
          <div className="mt-2 overflow-auto rounded bg-red-100 p-3">
            <pre className="whitespace-pre-wrap text-xs text-red-800">
              {error.message}
              {errorInfo?.componentStack && (
                <>
                  {'\n\nComponent Stack:'}
                  {errorInfo.componentStack}
                </>
              )}
            </pre>
          </div>
        </details>
      )}

      <button
        onClick={resetError}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
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
      </button>
    </div>
  );
}

// =============================================================================
// Page-level Error Fallback
// =============================================================================

export interface PageErrorFallbackProps extends ErrorFallbackProps {
  title?: string;
  showHomeButton?: boolean;
}

export function PageErrorFallback({
  error,
  resetError,
  title = 'Page Error',
  showHomeButton = true,
}: PageErrorFallbackProps): JSX.Element {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-6 rounded-full bg-red-100 p-4">
        <svg
          className="h-12 w-12 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-2xl font-bold text-gray-900">{title}</h1>

      <p className="mb-6 max-w-md text-center text-gray-600">
        We encountered an unexpected error while loading this page. Our team has
        been notified and is working to fix it.
      </p>

      {isDev && error && (
        <div className="mb-6 w-full max-w-2xl overflow-auto rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 font-mono text-sm font-medium text-red-800">
            {error.name}: {error.message}
          </p>
          {error.stack && (
            <pre className="whitespace-pre-wrap text-xs text-red-700">
              {error.stack}
            </pre>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={resetError}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
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
        </button>

        {showHomeButton && (
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go Home
          </a>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
