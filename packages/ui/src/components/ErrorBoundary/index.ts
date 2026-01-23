/**
 * Error Boundary Components Index
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

// Error Boundary
export {
  ErrorBoundary,
  DefaultErrorFallback,
  PageErrorFallback,
  type ErrorBoundaryProps,
  type ErrorBoundaryState,
  type ErrorFallbackProps,
  type PageErrorFallbackProps,
} from './error-boundary';

// API Error
export {
  ApiErrorDisplay,
  InlineError,
  type ApiErrorProps,
  type ApiError,
  type InlineErrorProps,
} from './api-error';

// Network Error
export {
  NetworkErrorDisplay,
  OfflineBanner,
  useNetworkStatus,
  type NetworkErrorProps,
  type OfflineBannerProps,
} from './network-error';

// Retry Button
export {
  RetryButton,
  useRetry,
  fetchWithRetry,
  type RetryButtonProps,
  type UseRetryOptions,
  type UseRetryResult,
  type FetchWithRetryOptions,
} from './retry-button';

// Error Reporter
export {
  reportError,
  reportMessage,
  initErrorReporter,
  getErrorReporterConfig,
  addBreadcrumb,
  clearBreadcrumbs,
  getBreadcrumbs,
  setUser,
  getUser,
  type ErrorContext,
  type Breadcrumb,
  type ErrorReporterConfig,
} from './error-reporter';
