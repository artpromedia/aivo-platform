/**
 * Retry Utilities for TypeScript/Node.js Services
 *
 * Provides retry with exponential backoff and jitter for
 * transient failure handling.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds */
  maxDelayMs?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Jitter factor (0-1) for randomization */
  jitterFactor?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RetryConfigs = {
  /** Standard retry for transient errors */
  standard: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 30_000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },

  /** Aggressive retry for important operations */
  aggressive: {
    maxAttempts: 5,
    initialDelayMs: 250,
    maxDelayMs: 60_000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },

  /** Quick retry for fast-fail scenarios */
  quick: {
    maxAttempts: 2,
    initialDelayMs: 100,
    maxDelayMs: 1_000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  /** No retry */
  none: {
    maxAttempts: 1,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
    jitterFactor: 0,
  },
} as const;

// ============================================================================
// DEFAULT RETRYABLE ERRORS
// ============================================================================

const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'EPIPE',
  'EAI_AGAIN',
]);

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

interface ErrorWithCode extends Error {
  code?: string;
}

/**
 * Default function to determine if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // Check for network error codes
  const errorWithCode = error as ErrorWithCode;
  if (typeof errorWithCode.code === 'string') {
    if (RETRYABLE_ERROR_CODES.has(errorWithCode.code)) {
      return true;
    }
  }

  // Check for HTTP status codes
  const errorWithStatus = error as { statusCode?: number; status?: number };
  if (typeof errorWithStatus.statusCode === 'number') {
    if (RETRYABLE_STATUS_CODES.has(errorWithStatus.statusCode)) {
      return true;
    }
  }

  if (typeof errorWithStatus.status === 'number') {
    if (RETRYABLE_STATUS_CODES.has(errorWithStatus.status)) {
      return true;
    }
  }

  // Check for timeout errors
  const message = error.message.toLowerCase();
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnreset')
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// RETRY IMPLEMENTATION
// ============================================================================

/**
 * Calculate delay for a retry attempt with exponential backoff and jitter.
 */
export function calculateRetryDelay(attempt: number, options: Required<RetryOptions>): number {
  if (attempt <= 1) return 0;

  const baseDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 2);
  const cappedDelay = Math.min(baseDelay, options.maxDelayMs);

  // Add jitter
  const jitter = (Math.random() * 2 - 1) * options.jitterFactor;
  const finalDelay = cappedDelay * (1 + jitter);

  return Math.round(finalDelay);
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic.
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   async () => {
 *     return await fetch('https://api.example.com/data');
 *   },
 *   {
 *     ...RetryConfigs.standard,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry ${attempt}: ${error.message}`);
 *     },
 *   }
 * );
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const defaultOnRetry = (_attempt: number, _error: Error, _delayMs: number): void => {
    // no-op
  };

  const opts: Required<RetryOptions> = {
    maxAttempts: options.maxAttempts ?? 3,
    initialDelayMs: options.initialDelayMs ?? 500,
    maxDelayMs: options.maxDelayMs ?? 30_000,
    backoffMultiplier: options.backoffMultiplier ?? 2,
    jitterFactor: options.jitterFactor ?? 0.2,
    isRetryable: options.isRetryable ?? isRetryableError,
    onRetry: options.onRetry ?? defaultOnRetry,
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.isRetryable(lastError)) {
        throw lastError;
      }

      // Calculate and wait for delay
      const delay = calculateRetryDelay(attempt + 1, opts);
      opts.onRetry(attempt, lastError, delay);

      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Retry failed with unknown error');
}

/**
 * Execute a function with retry logic, returning detailed result.
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const result = await retry(
      async () => {
        attempts++;
        return await fn();
      },
      {
        ...options,
        onRetry: (attempt, error, delay) => {
          options.onRetry?.(attempt, error, delay);
        },
      }
    );

    return {
      success: true,
      result,
      attempts,
      totalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// DECORATOR-STYLE UTILITY
// ============================================================================

/**
 * Wrap an async function with retry logic.
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   RetryConfigs.standard
 * );
 *
 * const data = await fetchWithRetry('https://api.example.com/data');
 * ```
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return retry(() => fn(...args), options);
  };
}
