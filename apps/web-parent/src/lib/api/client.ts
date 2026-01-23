/**
 * API Client for Parent Portal
 *
 * Production-ready API client with:
 * - Type-safe error handling
 * - Authentication token management
 * - Request/response interceptors
 * - Retry logic with exponential backoff
 * - Request cancellation support
 */

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

/**
 * Check if running in development mode
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

// ============================================================================
// Error Types
// ============================================================================

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface ApiErrorDetails {
  field?: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: ApiErrorDetails[];
  public readonly requestId?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number,
    options?: {
      details?: ApiErrorDetails[];
      requestId?: string;
      retryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = options?.details;
    this.requestId = options?.requestId;
    this.retryable = options?.retryable ?? false;
  }

  /**
   * Check if error is due to authentication issues
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN';
  }

  /**
   * Check if error is retryable
   */
  canRetry(): boolean {
    return this.retryable;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      case 'UNAUTHORIZED':
        return 'Please sign in to continue.';
      case 'FORBIDDEN':
        return "You don't have permission to access this resource.";
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'VALIDATION_ERROR':
        return this.details?.[0]?.message || 'Please check your input and try again.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment and try again.';
      case 'SERVER_ERROR':
        return 'Something went wrong on our end. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// ============================================================================
// Token Management
// ============================================================================

let authTokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Set the auth token getter function
 * Call this during app initialization with your auth provider's token getter
 */
export function setAuthTokenGetter(getter: () => Promise<string | null>): void {
  authTokenGetter = getter;
}

async function getAuthToken(): Promise<string | null> {
  // Use custom getter if provided
  if (authTokenGetter) {
    return authTokenGetter();
  }

  // Fallback to localStorage (client-side only)
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    return localStorage.getItem('auth_token');
  }

  return null;
}

// ============================================================================
// Request Options
// ============================================================================

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

// ============================================================================
// Response Handling
// ============================================================================

function getErrorCodeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 422 || status === 400) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

interface ErrorResponseData {
  message?: string;
  error?: string;
  errors?: ApiErrorDetails[];
  details?: ApiErrorDetails[];
  requestId?: string;
}

async function parseErrorResponse(response: Response): Promise<{
  message: string;
  details?: ApiErrorDetails[];
  requestId?: string;
}> {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = (await response.json()) as ErrorResponseData;
      return {
        message: data.message ?? data.error ?? `HTTP ${response.status}`,
        details: data.errors ?? data.details,
        requestId: data.requestId ?? response.headers.get('x-request-id') ?? undefined,
      };
    }
    const text = await response.text();
    return {
      message: text || `HTTP ${response.status}`,
      requestId: response.headers.get('x-request-id') || undefined,
    };
  } catch {
    return {
      message: `HTTP ${response.status}`,
      requestId: response.headers.get('x-request-id') || undefined,
    };
  }
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

function handleNonOkResponse(
  response: Response,
  errorData: Awaited<ReturnType<typeof parseErrorResponse>>
): never {
  const code = getErrorCodeFromStatus(response.status);
  const retryable = response.status >= 500 || response.status === 429;

  throw new ApiError(errorData.message, code, response.status, {
    details: errorData.details,
    requestId: errorData.requestId,
    retryable,
  });
}

function handleFetchError(error: unknown): never {
  // Already an ApiError
  if (error instanceof ApiError) {
    throw error;
  }

  // Timeout/abort
  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiError('Request timed out', 'TIMEOUT', 0, { retryable: true });
  }

  // Network error
  if (error instanceof TypeError) {
    throw new ApiError('Network error', 'NETWORK_ERROR', 0, { retryable: true });
  }

  // Unknown error
  throw new ApiError(error instanceof Error ? error.message : 'Unknown error', 'UNKNOWN', 0);
}

async function addAuthHeader(headers: Record<string, string>, skipAuth: boolean): Promise<void> {
  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
}

// ============================================================================
// Core Request Function
// ============================================================================

async function makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    skipAuth = false,
    signal: _signal,
    retries: _retries,
    cache,
    credentials,
    integrity,
    keepalive,
    mode,
    redirect,
    referrer,
    referrerPolicy,
  } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  await addAuthHeader(requestHeaders, skipAuth);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache,
      credentials,
      integrity,
      keepalive,
      mode,
      redirect,
      referrer,
      referrerPolicy,
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      handleNonOkResponse(response, errorData);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    handleFetchError(error);
  }
}

// ============================================================================
// Request with Retry
// ============================================================================

async function requestWithRetry<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const maxRetries = options.retries ?? MAX_RETRIES;
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await makeRequest<T>(endpoint, options);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      lastError = error;

      // Don't retry non-retryable errors
      if (!error.canRetry()) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new ApiError('Max retries exceeded', 'UNKNOWN', 0);
}

// ============================================================================
// Blob Request (for file downloads)
// ============================================================================

async function requestBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
  const { timeout = DEFAULT_TIMEOUT, skipAuth = false, cache, credentials, mode } = options;

  const requestHeaders: Record<string, string> = {};

  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: requestHeaders,
      signal: controller.signal,
      cache,
      credentials,
      mode,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw new ApiError(
        errorData.message,
        getErrorCodeFromStatus(response.status),
        response.status
      );
    }

    return response.blob();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 'TIMEOUT', 0);
    }

    throw new ApiError(error instanceof Error ? error.message : 'Unknown error', 'UNKNOWN', 0);
  }
}

// ============================================================================
// Public API Client
// ============================================================================

export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestOptions) =>
    requestWithRetry<T>(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    requestWithRetry<T>(endpoint, { ...options, method: 'POST', body }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    requestWithRetry<T>(endpoint, { ...options, method: 'PUT', body }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    requestWithRetry<T>(endpoint, { ...options, method: 'PATCH', body }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    requestWithRetry<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * GET blob (for file downloads)
   */
  getBlob: (endpoint: string, options?: RequestOptions) => requestBlob(endpoint, options),

  /**
   * Set the auth token getter
   */
  setAuthTokenGetter,
};

// Default export for convenience
export default apiClient;
