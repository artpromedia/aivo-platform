'use client';

/**
 * Retry Button Component
 *
 * Reusable retry button with loading state and countdown timer
 * for rate-limited retries.
 *
 * Sprint 4.2: Comprehensive Error Boundaries
 */

import React, { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface RetryButtonProps {
  /** Callback when retry is clicked */
  onRetry: () => void | Promise<void>;
  /** Whether a retry is in progress */
  isLoading?: boolean;
  /** Countdown seconds before auto-retry (optional) */
  autoRetrySeconds?: number;
  /** Whether auto-retry is enabled */
  autoRetryEnabled?: boolean;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Custom label */
  label?: string;
  /** Loading label */
  loadingLabel?: string;
  /** Disabled state */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Show icon */
  showIcon?: boolean;
}

// =============================================================================
// Retry Button Component
// =============================================================================

export function RetryButton({
  onRetry,
  isLoading = false,
  autoRetrySeconds,
  autoRetryEnabled = false,
  size = 'md',
  variant = 'primary',
  label = 'Try Again',
  loadingLabel = 'Retrying...',
  disabled = false,
  className = '',
  showIcon = true,
}: Readonly<RetryButtonProps>): React.JSX.Element {
  const [countdown, setCountdown] = useState(autoRetrySeconds ?? 0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(autoRetryEnabled);

  const handleRetry = useCallback(async () => {
    setIsAutoRetrying(false);
    await onRetry();
  }, [onRetry]);

  const cancelAutoRetry = useCallback(() => {
    setIsAutoRetrying(false);
    setCountdown(0);
  }, []);

  // Handle countdown
  useEffect(() => {
    if (!isAutoRetrying || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsAutoRetrying(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isAutoRetrying, countdown]);

  // Auto-retry when countdown reaches 0
  useEffect(() => {
    if (isAutoRetrying && countdown === 0 && !isLoading) {
      void handleRetry();
    }
  }, [countdown, isAutoRetrying, isLoading, handleRetry]);

  // Helper function to get button label (extracted to avoid nested ternary)
  const getButtonLabel = (): string => {
    if (isLoading) return loadingLabel;
    if (isAutoRetrying && countdown > 0) return `Retrying in ${countdown}s`;
    return label;
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  // Variant classes
  const variantClasses = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          void handleRetry();
        }}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center rounded-lg font-medium
          transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {showIcon && (
          isLoading ? (
            <svg
              className={`animate-spin ${iconSizes[size]}`}
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
          ) : (
            <svg
              className={iconSizes[size]}
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
          )
        )}
        <span>
          {getButtonLabel()}
        </span>
      </button>

      {isAutoRetrying && countdown > 0 && (
        <button
          onClick={cancelAutoRetry}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Retry with Backoff Hook
// =============================================================================

export interface UseRetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Condition to check if error is retryable (cspell:disable-line) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback on each retry */
  onRetry?: (attempt: number, error: unknown) => void;
  /** Callback on final failure */
  onMaxRetriesReached?: (error: unknown) => void;
}

export interface UseRetryResult<T> {
  execute: () => Promise<T>;
  isRetrying: boolean;
  attempt: number;
  reset: () => void;
}

export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryResult<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reset = useCallback(() => {
    setAttempt(0);
    setIsRetrying(false);
  }, []);

  const execute = useCallback(async (): Promise<T> => {
    setIsRetrying(true);
    let lastError: unknown;

    for (let i = 0; i <= maxRetries; i++) {
      setAttempt(i);

      try {
        const result = await asyncFn();
        setIsRetrying(false);
        return result;
      } catch (error) {
        lastError = error;

        if (i === maxRetries) {
          setIsRetrying(false);
          onMaxRetriesReached?.(error);
          throw error;
        }

        if (!shouldRetry(error, i)) {
          setIsRetrying(false);
          throw error;
        }

        onRetry?.(i + 1, error);

        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, i),
          maxDelay
        );

        // Add jitter (±10%)
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);

        await new Promise((resolve) =>
          setTimeout(resolve, delay + jitter)
        );
      }
    }

    setIsRetrying(false);
    throw lastError;
  }, [
    asyncFn,
    maxRetries,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    shouldRetry,
    onRetry,
    onMaxRetriesReached,
  ]);

  return { execute, isRetrying, attempt, reset };
}

// =============================================================================
// Fetch with Retry Utility
// =============================================================================

export interface FetchWithRetryOptions extends UseRetryOptions {
  /** HTTP status codes that should trigger a retry */
  retryStatusCodes?: number[];
}

export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    shouldRetry,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const defaultShouldRetry = (error: unknown): boolean => {
    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Retry on specific status codes
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof error.status === 'number'
    ) {
      return retryStatusCodes.includes(error.status);
    }

    return false;
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;

      const canRetry = shouldRetry
        ? shouldRetry(error, attempt)
        : defaultShouldRetry(error);

      if (attempt === maxRetries || !canRetry) {
        onMaxRetriesReached?.(error);
        throw error;
      }

      onRetry?.(attempt + 1, error);

      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);

      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

export default RetryButton;
