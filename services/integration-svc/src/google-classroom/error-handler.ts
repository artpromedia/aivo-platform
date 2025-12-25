/**
 * Google Classroom Error Handler
 *
 * Provides centralized error handling for Google Classroom API interactions.
 * Translates Google API errors into user-friendly messages and determines
 * appropriate retry strategies.
 *
 * @module google-classroom/error-handler
 */

import { GoogleClassroomError } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ══════════════════════════════════════════════════════════════════════════════

export const ErrorCodes = {
  // Authentication errors
  TOKEN_EXPIRED: 'GC_TOKEN_EXPIRED',
  TOKEN_REVOKED: 'GC_TOKEN_REVOKED',
  INVALID_GRANT: 'GC_INVALID_GRANT',
  UNAUTHORIZED: 'GC_UNAUTHORIZED',

  // Permission errors
  PERMISSION_DENIED: 'GC_PERMISSION_DENIED',
  INSUFFICIENT_SCOPES: 'GC_INSUFFICIENT_SCOPES',
  NOT_COURSE_MEMBER: 'GC_NOT_COURSE_MEMBER',
  NOT_COURSE_TEACHER: 'GC_NOT_COURSE_TEACHER',

  // Resource errors
  COURSE_NOT_FOUND: 'GC_COURSE_NOT_FOUND',
  STUDENT_NOT_FOUND: 'GC_STUDENT_NOT_FOUND',
  ASSIGNMENT_NOT_FOUND: 'GC_ASSIGNMENT_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'GC_SUBMISSION_NOT_FOUND',

  // Rate limiting
  RATE_LIMITED: 'GC_RATE_LIMITED',
  QUOTA_EXCEEDED: 'GC_QUOTA_EXCEEDED',

  // Server errors
  GOOGLE_SERVER_ERROR: 'GC_SERVER_ERROR',
  GOOGLE_UNAVAILABLE: 'GC_UNAVAILABLE',

  // Conflict errors
  ALREADY_EXISTS: 'GC_ALREADY_EXISTS',
  CONFLICT: 'GC_CONFLICT',

  // Domain errors
  DOMAIN_NOT_ALLOWED: 'GC_DOMAIN_NOT_ALLOWED',
  GUARDIANS_DISABLED: 'GC_GUARDIANS_DISABLED',

  // Unknown
  UNKNOWN: 'GC_UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ══════════════════════════════════════════════════════════════════════════════
// USER-FRIENDLY MESSAGES
// ══════════════════════════════════════════════════════════════════════════════

const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.TOKEN_EXPIRED]:
    'Your Google Classroom connection has expired. Please reconnect your account.',
  [ErrorCodes.TOKEN_REVOKED]:
    'Your Google Classroom access has been revoked. Please reconnect your account.',
  [ErrorCodes.INVALID_GRANT]:
    'Your Google Classroom authorization is no longer valid. Please reconnect your account.',
  [ErrorCodes.UNAUTHORIZED]:
    'You are not authorized to access Google Classroom. Please sign in again.',

  [ErrorCodes.PERMISSION_DENIED]:
    'You do not have permission to perform this action in Google Classroom.',
  [ErrorCodes.INSUFFICIENT_SCOPES]:
    'Additional permissions are required. Please reconnect with the required permissions.',
  [ErrorCodes.NOT_COURSE_MEMBER]: 'You are not a member of this Google Classroom course.',
  [ErrorCodes.NOT_COURSE_TEACHER]: 'You must be a teacher in this course to perform this action.',

  [ErrorCodes.COURSE_NOT_FOUND]:
    'The Google Classroom course was not found. It may have been deleted or archived.',
  [ErrorCodes.STUDENT_NOT_FOUND]: 'The student was not found in this Google Classroom course.',
  [ErrorCodes.ASSIGNMENT_NOT_FOUND]:
    'The assignment was not found in Google Classroom. It may have been deleted.',
  [ErrorCodes.SUBMISSION_NOT_FOUND]: 'The student submission was not found in Google Classroom.',

  [ErrorCodes.RATE_LIMITED]:
    'Too many requests to Google Classroom. Please wait a moment and try again.',
  [ErrorCodes.QUOTA_EXCEEDED]: 'Google Classroom API quota exceeded. Please try again later.',

  [ErrorCodes.GOOGLE_SERVER_ERROR]:
    'Google Classroom is experiencing issues. Please try again later.',
  [ErrorCodes.GOOGLE_UNAVAILABLE]:
    'Google Classroom is temporarily unavailable. Please try again later.',

  [ErrorCodes.ALREADY_EXISTS]: 'This item already exists in Google Classroom.',
  [ErrorCodes.CONFLICT]:
    'There was a conflict with the current state in Google Classroom. Please refresh and try again.',

  [ErrorCodes.DOMAIN_NOT_ALLOWED]:
    'Your school domain is not configured for this Google Classroom integration.',
  [ErrorCodes.GUARDIANS_DISABLED]:
    'Guardian access is not enabled for your Google Workspace domain.',

  [ErrorCodes.UNKNOWN]: 'An unexpected error occurred with Google Classroom. Please try again.',
};

// ══════════════════════════════════════════════════════════════════════════════
// RETRY CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface RetryConfig {
  /** Whether this error is retryable */
  retryable: boolean;
  /** Suggested delay before retry in milliseconds */
  retryDelayMs: number;
  /** Maximum number of retries */
  maxRetries: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
}

const RETRY_CONFIGS: Record<ErrorCode, RetryConfig> = {
  // Auth errors - not retryable, user action required
  [ErrorCodes.TOKEN_EXPIRED]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.TOKEN_REVOKED]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.INVALID_GRANT]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.UNAUTHORIZED]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },

  // Permission errors - not retryable
  [ErrorCodes.PERMISSION_DENIED]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.INSUFFICIENT_SCOPES]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.NOT_COURSE_MEMBER]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.NOT_COURSE_TEACHER]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },

  // Resource errors - not retryable
  [ErrorCodes.COURSE_NOT_FOUND]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.STUDENT_NOT_FOUND]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.ASSIGNMENT_NOT_FOUND]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.SUBMISSION_NOT_FOUND]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },

  // Rate limiting - retryable with backoff
  [ErrorCodes.RATE_LIMITED]: {
    retryable: true,
    retryDelayMs: 1000,
    maxRetries: 5,
    useExponentialBackoff: true,
  },
  [ErrorCodes.QUOTA_EXCEEDED]: {
    retryable: true,
    retryDelayMs: 60000,
    maxRetries: 3,
    useExponentialBackoff: true,
  },

  // Server errors - retryable
  [ErrorCodes.GOOGLE_SERVER_ERROR]: {
    retryable: true,
    retryDelayMs: 5000,
    maxRetries: 3,
    useExponentialBackoff: true,
  },
  [ErrorCodes.GOOGLE_UNAVAILABLE]: {
    retryable: true,
    retryDelayMs: 10000,
    maxRetries: 3,
    useExponentialBackoff: true,
  },

  // Conflict - retryable once
  [ErrorCodes.ALREADY_EXISTS]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.CONFLICT]: {
    retryable: true,
    retryDelayMs: 1000,
    maxRetries: 1,
    useExponentialBackoff: false,
  },

  // Domain errors - not retryable
  [ErrorCodes.DOMAIN_NOT_ALLOWED]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },
  [ErrorCodes.GUARDIANS_DISABLED]: {
    retryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    useExponentialBackoff: false,
  },

  // Unknown - limited retry
  [ErrorCodes.UNKNOWN]: {
    retryable: true,
    retryDelayMs: 2000,
    maxRetries: 2,
    useExponentialBackoff: true,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ERROR PARSING
// ══════════════════════════════════════════════════════════════════════════════

export interface ParsedGoogleError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  httpStatus: number;
  retryConfig: RetryConfig;
  originalError?: Error;
}

/**
 * Parse a Google API error and extract relevant information
 */
export function parseGoogleError(error: unknown): ParsedGoogleError {
  // Handle already-parsed GoogleClassroomError
  if (error instanceof GoogleClassroomError) {
    const code = mapErrorTypeToCode(error.code);
    return {
      code,
      message: error.message,
      userMessage: USER_FRIENDLY_MESSAGES[code],
      httpStatus: error.statusCode || 500,
      retryConfig: RETRY_CONFIGS[code],
      originalError: error,
    };
  }

  // Parse Google API errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as any;
  const status = err?.status || err?.code || err?.response?.status || 500;
  const errorMessage = extractErrorMessage(error);
  const code = determineErrorCode(status, errorMessage);

  return {
    code,
    message: errorMessage,
    userMessage: USER_FRIENDLY_MESSAGES[code],
    httpStatus: typeof status === 'number' ? status : 500,
    retryConfig: RETRY_CONFIGS[code],
    originalError: error as Error,
  };
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as any;
  if (err?.message) return err.message;
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.errors?.[0]?.message) return err.errors[0].message;
  return 'Unknown error';
}

/**
 * Determine error code based on HTTP status and message
 */
function determineErrorCode(status: number | string, message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  // Check for specific error messages first
  if (lowerMessage.includes('token has been expired')) return ErrorCodes.TOKEN_EXPIRED;
  if (lowerMessage.includes('token has been revoked')) return ErrorCodes.TOKEN_REVOKED;
  if (lowerMessage.includes('invalid_grant')) return ErrorCodes.INVALID_GRANT;
  if (lowerMessage.includes('insufficient scope')) return ErrorCodes.INSUFFICIENT_SCOPES;
  if (lowerMessage.includes('not a member')) return ErrorCodes.NOT_COURSE_MEMBER;
  if (lowerMessage.includes('teacher in course')) return ErrorCodes.NOT_COURSE_TEACHER;
  if (lowerMessage.includes('guardian') && lowerMessage.includes('disabled'))
    return ErrorCodes.GUARDIANS_DISABLED;
  if (lowerMessage.includes('already exists')) return ErrorCodes.ALREADY_EXISTS;
  if (lowerMessage.includes('domain') && lowerMessage.includes('not allowed'))
    return ErrorCodes.DOMAIN_NOT_ALLOWED;

  // Map by status code
  const statusNum = typeof status === 'number' ? status : parseInt(status, 10);

  switch (statusNum) {
    case 400:
      return ErrorCodes.UNKNOWN;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.PERMISSION_DENIED;
    case 404:
      if (lowerMessage.includes('course')) return ErrorCodes.COURSE_NOT_FOUND;
      if (lowerMessage.includes('student')) return ErrorCodes.STUDENT_NOT_FOUND;
      if (lowerMessage.includes('assignment') || lowerMessage.includes('coursework'))
        return ErrorCodes.ASSIGNMENT_NOT_FOUND;
      if (lowerMessage.includes('submission')) return ErrorCodes.SUBMISSION_NOT_FOUND;
      return ErrorCodes.UNKNOWN;
    case 409:
      return ErrorCodes.CONFLICT;
    case 429:
      return ErrorCodes.RATE_LIMITED;
    case 500:
      return ErrorCodes.GOOGLE_SERVER_ERROR;
    case 502:
    case 503:
    case 504:
      return ErrorCodes.GOOGLE_UNAVAILABLE;
    default:
      return ErrorCodes.UNKNOWN;
  }
}

/**
 * Map internal error types to error codes
 */
function mapErrorTypeToCode(errorType: string): ErrorCode {
  const typeMap: Record<string, ErrorCode> = {
    AUTH_REQUIRED: ErrorCodes.UNAUTHORIZED,
    INVALID_TOKEN: ErrorCodes.TOKEN_EXPIRED,
    PERMISSION_DENIED: ErrorCodes.PERMISSION_DENIED,
    RATE_LIMITED: ErrorCodes.RATE_LIMITED,
    COURSE_NOT_FOUND: ErrorCodes.COURSE_NOT_FOUND,
  };

  return typeMap[errorType] || ErrorCodes.UNKNOWN;
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLER CLASS
// ══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GoogleClassroomErrorHandler {
  /**
   * Handle an error and return a structured response
   */
  static handle(error: unknown): ParsedGoogleError {
    return parseGoogleError(error);
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    const parsed = parseGoogleError(error);
    return parsed.retryConfig.retryable;
  }

  /**
   * Get the retry delay for an error (with optional attempt number for backoff)
   */
  static getRetryDelay(error: unknown, attemptNumber = 0): number {
    const parsed = parseGoogleError(error);
    const { retryConfig } = parsed;

    if (!retryConfig.retryable) return 0;

    if (retryConfig.useExponentialBackoff) {
      // Exponential backoff with jitter
      const baseDelay = retryConfig.retryDelayMs;
      const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      return Math.min(exponentialDelay + jitter, 300000); // Max 5 minutes
    }

    return retryConfig.retryDelayMs;
  }

  /**
   * Check if we should retry based on attempt count
   */
  static shouldRetry(error: unknown, attemptNumber: number): boolean {
    const parsed = parseGoogleError(error);
    return parsed.retryConfig.retryable && attemptNumber < parsed.retryConfig.maxRetries;
  }

  /**
   * Get a user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    const parsed = parseGoogleError(error);
    return parsed.userMessage;
  }

  /**
   * Check if the error requires user action (e.g., reconnecting)
   */
  static requiresUserAction(error: unknown): boolean {
    const parsed = parseGoogleError(error);
    return [
      ErrorCodes.TOKEN_EXPIRED,
      ErrorCodes.TOKEN_REVOKED,
      ErrorCodes.INVALID_GRANT,
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.INSUFFICIENT_SCOPES,
    ].includes(parsed.code);
  }

  /**
   * Check if the error is a rate limit error
   */
  static isRateLimited(error: unknown): boolean {
    const parsed = parseGoogleError(error);
    return [ErrorCodes.RATE_LIMITED, ErrorCodes.QUOTA_EXCEEDED].includes(parsed.code);
  }

  /**
   * Check if the error is a server error (Google's side)
   */
  static isServerError(error: unknown): boolean {
    const parsed = parseGoogleError(error);
    return [ErrorCodes.GOOGLE_SERVER_ERROR, ErrorCodes.GOOGLE_UNAVAILABLE].includes(parsed.code);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RETRY UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

export interface RetryOptions {
  maxRetries?: number;
  onRetry?: (error: ParsedGoogleError, attemptNumber: number) => void;
}

/**
 * Execute a function with automatic retry on transient errors
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, onRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const parsed = parseGoogleError(error);

      if (!GoogleClassroomErrorHandler.shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = GoogleClassroomErrorHandler.getRetryDelay(error, attempt);

      if (onRetry) {
        onRetry(parsed, attempt);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGGING UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

export interface ErrorLogEntry {
  timestamp: Date;
  code: ErrorCode;
  message: string;
  httpStatus: number;
  userId?: string;
  courseId?: string;
  operation?: string;
  retryable: boolean;
}

/**
 * Create a structured log entry for an error
 */
export function createErrorLogEntry(
  error: unknown,
  context?: { userId?: string; courseId?: string; operation?: string }
): ErrorLogEntry {
  const parsed = parseGoogleError(error);

  return {
    timestamp: new Date(),
    code: parsed.code,
    message: parsed.message,
    httpStatus: parsed.httpStatus,
    userId: context?.userId,
    courseId: context?.courseId,
    operation: context?.operation,
    retryable: parsed.retryConfig.retryable,
  };
}
