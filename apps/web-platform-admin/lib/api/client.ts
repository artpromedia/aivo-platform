/**
 * Platform Admin API Client
 *
 * Base API client with authentication, error handling, and retry logic.
 * All admin API modules extend from this base.
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

export interface ServiceConfig {
  TENANT_SVC_URL: string;
  AI_ORCHESTRATOR_URL: string;
  BILLING_SVC_URL: string;
  ANALYTICS_SVC_URL: string;
  MODEL_REGISTRY_URL: string;
  HEALTH_AGGREGATOR_URL: string;
  ALERT_SVC_URL: string;
}

function getServiceUrls(): ServiceConfig {
  const requireEnv = (name: string, devDefault: string): string => {
    const value = process.env[name];
    if (value) return value;
    // During Next.js build phase (static generation), use fallback to allow build to complete
    const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
    if (isNextBuild) return devDefault;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${name} environment variable is required in production`);
    }
    return devDefault;
  };

  return {
    TENANT_SVC_URL: requireEnv('TENANT_SVC_URL', 'http://localhost:4002'),
    AI_ORCHESTRATOR_URL: requireEnv('AI_ORCHESTRATOR_URL', 'http://localhost:4010'),
    BILLING_SVC_URL: requireEnv('BILLING_SVC_URL', 'http://localhost:4005'),
    ANALYTICS_SVC_URL: requireEnv('ANALYTICS_SVC_URL', 'http://localhost:4020'),
    MODEL_REGISTRY_URL: requireEnv('MODEL_REGISTRY_URL', 'http://localhost:4015'),
    HEALTH_AGGREGATOR_URL: requireEnv('HEALTH_AGGREGATOR_URL', 'http://localhost:4040'),
    ALERT_SVC_URL: requireEnv('ALERT_SVC_URL', 'http://localhost:4041'),
  };
}

export const serviceUrls = getServiceUrls();

// ══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ══════════════════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface ApiClientOptions {
  /** Bearer token for authorization */
  accessToken?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Cache mode for the request */
  cache?: RequestCache;
  /** Revalidation interval in seconds (for Next.js ISR) */
  revalidate?: number;
  /** Retry count for failed requests (default: 0) */
  retries?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Signal for request cancellation */
  signal?: AbortSignal;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Make an authenticated API request with error handling and retries.
 */
export async function apiClient<T>(
  baseUrl: string,
  path: string,
  options: ApiClientOptions & RequestInit = {}
): Promise<T> {
  const {
    accessToken,
    timeout = 30000,
    cache = 'no-store',
    revalidate,
    retries = 0,
    headers: customHeaders,
    signal,
    ...fetchOptions
  } = options;

  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders && typeof customHeaders === 'object' && !Array.isArray(customHeaders)
      ? (customHeaders as Record<string, string>)
      : {}),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  // Combine signals if external signal provided
  const combinedSignal = signal
    ? combineAbortSignals(signal, controller.signal)
    : controller.signal;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        cache,
        signal: combinedSignal,
        next: revalidate ? { revalidate } : undefined,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await parseErrorResponse(response);
        throw new ApiError(
          errorData.message || `API error: ${response.status}`,
          response.status,
          errorData.code,
          errorData.details
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return {} as T;
      }

      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        // Don't retry 4xx errors
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
    }
  }

  // All retries exhausted
  if (lastError instanceof ApiError || lastError instanceof NetworkError) {
    throw lastError;
  }

  throw new NetworkError(lastError?.message || 'Network request failed', lastError);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function parseErrorResponse(response: Response): Promise<{
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}> {
  try {
    const data = await response.json();
    return {
      message: data.message || data.error || response.statusText,
      code: data.code,
      details: data.details,
    };
  } catch {
    return { message: response.statusText };
  }
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener(
      'abort',
      () => {
        controller.abort();
      },
      { once: true }
    );
  }

  return controller.signal;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

export function buildQueryString(params: object): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          searchParams.append(key, String(v));
        });
      } else if (value instanceof Date) {
        searchParams.append(key, value.toISOString());
      } else {
        searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
