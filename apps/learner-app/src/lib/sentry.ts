import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes in production to avoid noise during development
 */
export function initSentry() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Sentry] Skipping initialization in non-production environment');
    return;
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    
    // Performance monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions
    
    // Environment identification
    environment: process.env.NODE_ENV,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    
    // Enable replay for session recording (errors only)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter and sanitize events before sending
    beforeSend(event, hint) {
      // Don't send PII to Sentry
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      
      // Filter out non-actionable errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors that are expected
        if (error.message.includes('Failed to fetch')) {
          return null;
        }
        // Ignore cancelled requests
        if (error.name === 'AbortError') {
          return null;
        }
      }
      
      return event;
    },
    
    // Additional options
    normalizeDepth: 5,
    maxBreadcrumbs: 50,
    
    // Ignore certain error types
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'canvas.contentDocument',
      // ResizeObserver loop errors (not actionable)
      'ResizeObserver loop',
      // Random network errors
      'Network Error',
      'NetworkError',
    ],
    
    // Deny URLs that are not our app
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
    ],
  });
  
  console.log('[Sentry] Initialized successfully');
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 * Do not include PII - only use anonymized user IDs
 */
export function setUser(userId: string | null) {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export { Sentry };
