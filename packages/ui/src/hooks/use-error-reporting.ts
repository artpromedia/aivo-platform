/**
 * Error Reporting Hook
 *
 * Initializes error reporting services (Sentry, Datadog, etc.)
 * and configures global error handlers.
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */
'use client';

import { useEffect, useRef } from 'react';
import {
  initErrorReporter,
  setUser,
  reportError,
  type ErrorContext,
} from '../components/ErrorBoundary';

export interface ErrorReportingConfig {
  /** Error reporting service URL/DSN */
  dsn?: string;
  /** Current environment (development, staging, production) */
  environment: string;
  /** Release/version identifier */
  release?: string;
  /** Sample rate for error reporting (0-1) */
  sampleRate?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UserContext {
  /** User ID */
  id: string;
  /** User email */
  email?: string;
  /** User name */
  name?: string;
  /** User role */
  role?: string;
  /** Additional user metadata */
  metadata?: Record<string, unknown>;
}

export interface UseErrorReportingOptions {
  /** Error reporting configuration */
  config: ErrorReportingConfig;
  /** User context (optional) */
  user?: UserContext | null;
  /** Enable global error handlers */
  enableGlobalHandlers?: boolean;
  /** Callback when error is captured */
  onError?: (error: Error, context: ErrorContext) => void;
}

/**
 * Hook to initialize and manage error reporting
 *
 * @example
 * ```tsx
 * function App() {
 *   useErrorReporting({
 *     config: {
 *       dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
 *       environment: process.env.NODE_ENV,
 *       release: process.env.NEXT_PUBLIC_VERSION,
 *     },
 *     user: session?.user ? {
 *       id: session.user.id,
 *       email: session.user.email,
 *       role: session.user.role,
 *     } : null,
 *   });
 *
 *   return <App />;
 * }
 * ```
 */
export function useErrorReporting({
  config,
  user,
  enableGlobalHandlers = true,
  onError,
}: UseErrorReportingOptions): void {
  const initialized = useRef(false);

  // Initialize error reporter on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initErrorReporter({
      enabled: !!config.dsn && config.environment !== 'test',
      sampleRate: config.sampleRate ?? 1,
      environment: config.environment,
      release: config.release,
      beforeSend: (error, context) => {
        // Filter out known non-actionable errors
        if (error.message?.includes('ResizeObserver loop')) {
          return false;
        }
        if (error.message?.includes('Loading chunk')) {
          return false;
        }

        // Log in development for debugging
        if (config.debug ?? config.environment === 'development') {
          console.debug('[ErrorReporter] Error captured:', error, context);
        }

        // Call custom error handler if provided
        onError?.(error, context);
        return true;
      },
    });
  }, [config, onError]);

  // Set user context when it changes
  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    } else {
      setUser(null);
    }
  }, [user]);

  // Set up global error handlers
  useEffect(() => {
    if (!enableGlobalHandlers) return;

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason)),
        {
          tags: {
            context: 'unhandledRejection',
            originalEvent: 'PromiseRejectionEvent',
          },
        }
      );
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      reportError(
        event.error instanceof Error
          ? event.error
          : new Error(event.message),
        {
          tags: {
            context: 'uncaughtError',
          },
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        }
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [enableGlobalHandlers]);
}

/**
 * Get environment-based error reporting config
 */
export function getErrorReportingConfigFromEnv(): ErrorReportingConfig {
  // Access environment variables safely
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const version = process.env.NEXT_PUBLIC_VERSION ?? process.env.NEXT_PUBLIC_GIT_SHA;

  return {
    dsn: sentryDsn,
    environment: nodeEnv,
    release: version,
    sampleRate: nodeEnv === 'production' ? 0.1 : 1,
    debug: nodeEnv === 'development',
  };
}
