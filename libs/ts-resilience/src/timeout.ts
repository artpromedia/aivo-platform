/**
 * Request Timeout Utilities
 *
 * Provides configurable timeouts for async operations.
 * Framework-agnostic implementation.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TimeoutOptions {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Custom error message */
  message?: string;
}

export interface TimeoutError extends Error {
  code: 'TIMEOUT';
  timeout: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const TimeoutConfigs = {
  /** Quick operations (health checks, simple GETs) */
  quick: { timeoutMs: 5_000 },

  /** Standard API operations */
  standard: { timeoutMs: 10_000 },

  /** Heavy operations (file uploads, exports) */
  heavy: { timeoutMs: 60_000 },

  /** AI operations (LLM calls) */
  aiOperation: { timeoutMs: 45_000 },

  /** Background jobs */
  backgroundJob: { timeoutMs: 300_000 },
} as const;

// ============================================================================
// TIMEOUT UTILITIES
// ============================================================================

/**
 * Create a timeout error.
 */
function createTimeoutError(message: string, timeoutMs: number): TimeoutError {
  const error = new Error(message) as TimeoutError;
  error.code = 'TIMEOUT';
  error.timeout = timeoutMs;
  return error;
}

/**
 * Wrap an async operation with a timeout.
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   async () => aiClient.generate(prompt),
 *   { timeoutMs: 45_000 }
 * );
 * ```
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeoutMs, message = 'Operation timed out' } = options;

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createTimeoutError(message, timeoutMs));
    }, timeoutMs);

    operation()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

/**
 * Create a timeout promise that rejects after specified time.
 */
export function createTimeout(ms: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(createTimeoutError(message, ms));
    }, ms);
  });
}

/**
 * Race an operation against a timeout.
 *
 * @example
 * ```typescript
 * const result = await raceTimeout(
 *   fetchData(),
 *   10_000,
 *   'Data fetch timed out'
 * );
 * ```
 */
export function raceTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  return Promise.race([operation, createTimeout(timeoutMs, message)]);
}

/**
 * Execute operations with individual timeouts.
 * Useful when you need to run multiple operations with different timeout requirements.
 *
 * @example
 * ```typescript
 * const results = await executeWithTimeouts([
 *   { operation: fetchUserData, timeoutMs: 5000 },
 *   { operation: fetchPreferences, timeoutMs: 3000 },
 * ]);
 * ```
 */
export async function executeWithTimeouts<T>(
  operations: {
    operation: () => Promise<T>;
    timeoutMs: number;
    message?: string;
  }[]
): Promise<({ success: true; result: T } | { success: false; error: Error })[]> {
  return Promise.all(
    operations.map(async ({ operation, timeoutMs, message }) => {
      try {
        const result = await withTimeout(operation, { timeoutMs, message });
        return { success: true as const, result };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    })
  );
}

/**
 * Check if an error is a timeout error.
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof Error && 'code' in error && (error as TimeoutError).code === 'TIMEOUT';
}
