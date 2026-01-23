'use client';

/**
 * Network Error Component
 *
 * Display component for network-related errors with offline detection
 * and connection status feedback.
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

import { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface NetworkErrorProps {
  /** Callback to retry the failed operation */
  onRetry?: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Custom message override */
  message?: string;
  /** Show connection status indicator */
  showStatus?: boolean;
  /** CSS class name */
  className?: string;
}

export interface OfflineBannerProps {
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
}

// =============================================================================
// Network Status Hook
// =============================================================================

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Could trigger sync here
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

// =============================================================================
// Network Error Component
// =============================================================================

export function NetworkErrorDisplay({
  onRetry,
  isRetrying = false,
  message,
  showStatus = true,
  className = '',
}: NetworkErrorProps): JSX.Element {
  const { isOnline } = useNetworkStatus();

  const displayMessage =
    message ||
    (isOnline
      ? 'Unable to connect to the server. Please try again.'
      : 'You appear to be offline. Please check your internet connection.');

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-orange-200 bg-orange-50 p-6 text-center ${className}`}
      role="alert"
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-orange-100 p-3">
        {isOnline ? (
          <svg
            className="h-8 w-8 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        ) : (
          <svg
            className="h-8 w-8 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {isOnline ? 'Connection Error' : 'You\'re Offline'}
      </h3>

      {/* Message */}
      <p className="mb-4 max-w-sm text-sm text-gray-600">{displayMessage}</p>

      {/* Status Indicator */}
      {showStatus && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      )}

      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying || !isOnline}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              Reconnecting...
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
    </div>
  );
}

// =============================================================================
// Offline Banner Component
// =============================================================================

export function OfflineBanner({
  position = 'top',
  dismissible = false,
}: OfflineBannerProps): JSX.Element | null {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setIsDismissed(false);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isDismissed) {
    return null;
  }

  // Show reconnected message
  if (showReconnected && isOnline) {
    return (
      <div
        className={`fixed left-0 right-0 z-50 ${
          position === 'top' ? 'top-0' : 'bottom-0'
        }`}
      >
        <div className="bg-green-500 px-4 py-2 text-center text-sm font-medium text-white">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You&apos;re back online!
          </div>
        </div>
      </div>
    );
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div
        className={`fixed left-0 right-0 z-50 ${
          position === 'top' ? 'top-0' : 'bottom-0'
        }`}
      >
        <div className="bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white">
          <div className="flex items-center justify-center gap-2">
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
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span>You&apos;re offline. Some features may be unavailable.</span>
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="ml-2 rounded p-0.5 hover:bg-orange-600"
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
        </div>
      </div>
    );
  }

  return null;
}

export default NetworkErrorDisplay;
