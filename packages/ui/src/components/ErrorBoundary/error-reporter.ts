/**
 * Error Reporter Utility
 *
 * Centralized error reporting that can be connected to any error tracking service
 * (Sentry, LogRocket, Datadog, etc.)
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

// =============================================================================
// Types
// =============================================================================

export interface ErrorContext {
  /** Component stack from React error boundary */
  componentStack?: string;
  /** Name of the error boundary that caught this error */
  boundaryName?: string;
  /** Additional tags for categorization */
  tags?: Record<string, string>;
  /** Extra context data */
  extra?: Record<string, unknown>;
  /** User information */
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  /** Breadcrumbs leading up to the error */
  breadcrumbs?: Breadcrumb[];
}

export interface Breadcrumb {
  type: 'navigation' | 'click' | 'api' | 'console' | 'custom';
  category: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface ErrorReporterConfig {
  /** Whether error reporting is enabled */
  enabled: boolean;
  /** Error tracking service DSN/key */
  dsn?: string;
  /** Environment (production, staging, development) */
  environment: string;
  /** Application version */
  release?: string;
  /** Sample rate for error reporting (0.0 - 1.0) */
  sampleRate: number;
  /** Callback before sending error */
  beforeSend?: (error: Error, context: ErrorContext) => boolean;
}

// =============================================================================
// Error Reporter State
// =============================================================================

let config: ErrorReporterConfig = {
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV || 'development',
  sampleRate: 1,
};

const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Initialize the error reporter with configuration
 */
export function initErrorReporter(newConfig: Partial<ErrorReporterConfig>): void {
  config = { ...config, ...newConfig };

  if (config.enabled) {
    // Set up global error handlers
    setupGlobalHandlers();
  }
}

/**
 * Get current configuration
 */
export function getErrorReporterConfig(): ErrorReporterConfig {
  return { ...config };
}

// =============================================================================
// Breadcrumbs
// =============================================================================

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
  breadcrumbs.push({
    ...breadcrumb,
    timestamp: Date.now(),
  });

  // Keep only the last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Clear all breadcrumbs
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

/**
 * Get current breadcrumbs
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// =============================================================================
// Error Reporting
// =============================================================================

/**
 * Report an error to the error tracking service
 */
export function reportError(
  error: unknown,
  context: ErrorContext = {}
): void {
  // Ensure we have an Error object
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Check if reporting is enabled
  if (!config.enabled) {
    console.error('[ErrorReporter] Error (reporting disabled):', errorObj);
    return;
  }

  // Apply sample rate
  if (Math.random() > config.sampleRate) {
    return;
  }

  // Check beforeSend callback
  if (config.beforeSend && !config.beforeSend(errorObj, context)) {
    return;
  }

  // Add breadcrumbs to context
  const fullContext: ErrorContext = {
    ...context,
    breadcrumbs: getBreadcrumbs(),
  };

  // In a real implementation, this would send to Sentry, Datadog, etc.
  // For now, we'll log to console and could make an API call
  void sendErrorToService(errorObj, fullContext);
}

/**
 * Report a message (non-error) to the tracking service
 */
export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: ErrorContext = {}
): void {
  if (!config.enabled) {
    console.log(`[ErrorReporter] ${level}: ${message}`);
    return;
  }

  void sendMessageToService(message, level, context);
}

// =============================================================================
// Internal Functions
// =============================================================================

function setupGlobalHandlers(): void {
  // Handle unhandled promise rejections
  globalThis.addEventListener('unhandledrejection', (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

    reportError(error, {
      tags: { type: 'unhandledrejection' },
    });
  });

  // Handle global errors (cspell:disable-next-line globalerror)
  globalThis.addEventListener('error', (event) => {
    // Ignore errors from browser extensions or cross-origin scripts
    if (!event.filename || event.filename.includes('chrome-extension')) {
      return;
    }

    const error = event.error instanceof Error ? event.error : new Error(event.message);
    reportError(error, {
      tags: { type: 'globalerror' }, // cspell:disable-line
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Track navigation for breadcrumbs
  const originalPushState = globalThis.history.pushState.bind(globalThis.history);
    globalThis.history.pushState = function (...args) {
      addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Navigated to ${args[2] as string}`,
        data: { url: args[2] },
      });
      originalPushState(...args);
    };
}

async function sendErrorToService(
  error: Error,
  context: ErrorContext
): Promise<void> {
  // Build error payload
  const payload = {
    type: 'error',
    timestamp: new Date().toISOString(),
    environment: config.environment,
    release: config.release,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    url: globalThis.location.href,
    userAgent: globalThis.navigator.userAgent,
  };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorReporter] Would send error:', payload);
    return;
  }

  // Send to error tracking API
  try {
    const apiUrl = process.env.NEXT_PUBLIC_ERROR_REPORTING_URL;
    if (apiUrl) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (sendError) {
    // Silently fail - don't cause more errors trying to report errors
    console.error('[ErrorReporter] Failed to send error:', sendError);
  }
}

async function sendMessageToService(
  message: string,
  level: string,
  context: ErrorContext
): Promise<void> {
  const payload = {
    type: 'message',
    timestamp: new Date().toISOString(),
    environment: config.environment,
    release: config.release,
    message,
    level,
    context,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[ErrorReporter] Would send message:', payload);
    return;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_ERROR_REPORTING_URL;
    if (apiUrl) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch {
    // Silently fail
  }
}

// =============================================================================
// User Context
// =============================================================================

let userContext: ErrorContext['user'] | null = null;

/**
 * Set user context for error reports
 */
export function setUser(user: ErrorContext['user'] | null): void {
  userContext = user;
}

/**
 * Get current user context
 */
export function getUser(): ErrorContext['user'] | null {
  return userContext;
}

export default {
  init: initErrorReporter,
  reportError,
  reportMessage,
  addBreadcrumb,
  clearBreadcrumbs,
  setUser,
};
