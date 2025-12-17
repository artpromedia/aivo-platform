/**
 * API Client for Web Author App
 *
 * Enhanced HTTP client with:
 * - Token refresh interceptors
 * - Multi-tenancy headers
 * - Request/response error normalization
 * - File upload support with progress
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
}

interface RefreshTokenResponse {
  accessToken?: string;
  refreshToken?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

export class ApiClientError extends Error {
  public readonly code: string | undefined;
  public readonly status: number | undefined;
  public readonly details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const AUTH_SVC_URL = process.env.NEXT_PUBLIC_AUTH_SVC_URL || '/api/auth';
const DEFAULT_TIMEOUT = 30000;

// Storage keys
const TOKEN_KEYS = {
  accessToken: 'aivo_access_token',
  refreshToken: 'aivo_refresh_token',
  tenantId: 'aivo_tenant_id',
  userId: 'aivo_user_id',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if we're running in a browser environment.
 * Uses indirect reference to avoid SSR issues where window may not exist.
 */
const isBrowser = (): boolean => {
  try {
    // Check for browser-specific global using property access that TS can't analyze
    const g = globalThis as unknown as Record<string, unknown>;
    return 'document' in g && g.document !== undefined;
  } catch {
    return false;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

class TokenManager {
  private refreshPromise: Promise<boolean> | null = null;

  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(TOKEN_KEYS.accessToken);
  }

  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(TOKEN_KEYS.refreshToken);
  }

  getTenantId(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(TOKEN_KEYS.tenantId);
  }

  getUserId(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(TOKEN_KEYS.userId);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (!isBrowser()) return;
    localStorage.setItem(TOKEN_KEYS.accessToken, accessToken);
    localStorage.setItem(TOKEN_KEYS.refreshToken, refreshToken);
  }

  setTenantId(tenantId: string): void {
    if (!isBrowser()) return;
    localStorage.setItem(TOKEN_KEYS.tenantId, tenantId);
  }

  setUserId(userId: string): void {
    if (!isBrowser()) return;
    localStorage.setItem(TOKEN_KEYS.userId, userId);
  }

  clearTokens(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(TOKEN_KEYS.accessToken);
    localStorage.removeItem(TOKEN_KEYS.refreshToken);
    localStorage.removeItem(TOKEN_KEYS.tenantId);
    localStorage.removeItem(TOKEN_KEYS.userId);
  }

  async refreshAccessToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${AUTH_SVC_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = (await response.json()) as RefreshTokenResponse;
      const tokenData = data.data ?? data;
      const accessToken = tokenData.accessToken;
      const newRefreshToken = tokenData.refreshToken;

      if (accessToken && newRefreshToken) {
        this.setTokens(accessToken, newRefreshToken);
        return true;
      }

      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }
}

export const tokenManager = new TokenManager();

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

class ApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config?: Partial<ApiClientConfig>) {
    this.baseUrl = config?.baseUrl ?? API_BASE_URL;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REQUEST METHODS
  // ════════════════════════════════════════════════════════════════════════════

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', path, undefined, config);
  }

  async post<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', path, data, config);
  }

  async put<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', path, data, config);
  }

  async patch<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', path, data, config);
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', path, undefined, config);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FILE UPLOAD
  // ════════════════════════════════════════════════════════════════════════════

  async upload<T>(
    path: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders();
    delete headers['Content-Type']; // Let browser set multipart boundary

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as { data?: T } | T;
            const result = (response as { data?: T }).data ?? (response as T);
            resolve(result);
          } catch {
            resolve(xhr.responseText as T);
          }
        } else if (xhr.status === 401) {
          // Try to refresh and retry
          const refreshed = await tokenManager.refreshAccessToken();
          if (refreshed) {
            // Retry upload
            this.upload<T>(path, formData, onProgress).then(resolve).catch(reject);
          } else {
            if (isBrowser()) {
              globalThis.location.href = '/login';
            }
            reject(new ApiClientError({ message: 'Session expired', status: 401 }));
          }
        } else {
          reject(this.parseErrorResponse(xhr.status, xhr.responseText));
        }
      });

      xhr.addEventListener('error', () => {
        reject(
          new ApiClientError({
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR',
          })
        );
      });

      xhr.addEventListener('timeout', () => {
        reject(
          new ApiClientError({
            message: 'Request timed out',
            code: 'TIMEOUT',
          })
        );
      });

      xhr.open('POST', url);
      xhr.timeout = this.timeout;

      // Set headers (except Content-Type for multipart)
      Object.entries(headers).forEach(([key, value]) => {
        if (value) xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CORE REQUEST HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    config?: RequestConfig,
    isRetry = false
  ): Promise<T> {
    const url = this.buildUrl(path, config?.params);
    const headers = { ...this.buildHeaders(), ...config?.headers };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: 'include',
        signal: config?.signal ?? controller.signal,
      };

      if (data !== undefined) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleErrorResponse<T>(response, method, path, data, config, isRetry);
      }

      return this.parseSuccessResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleFetchError(error);
    }
  }

  private async handleErrorResponse<T>(
    response: Response,
    method: string,
    path: string,
    data: unknown,
    config: RequestConfig | undefined,
    isRetry: boolean
  ): Promise<T> {
    // Handle 401 with token refresh
    if (response.status === 401 && !isRetry) {
      const refreshed = await tokenManager.refreshAccessToken();
      if (refreshed) {
        return this.request<T>(method, path, data, config, true);
      } else {
        // Redirect to login
        if (isBrowser()) {
          globalThis.location.href = '/login';
        }
        throw new ApiClientError({ message: 'Session expired', status: 401 });
      }
    }

    throw await this.parseErrorResponseFromFetch(response);
  }

  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    const json = JSON.parse(text) as { data?: T } | T;
    return (json as { data?: T }).data ?? (json as T);
  }

  private handleFetchError(error: unknown): ApiClientError {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return new ApiClientError({ message: 'Request timed out', code: 'TIMEOUT' });
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return new ApiClientError({
        message: 'Unable to connect to server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
      });
    }

    return new ApiClientError({ message: String(error), code: 'UNKNOWN' });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const baseOrigin = this.baseUrl || (isBrowser() ? globalThis.location.origin : '');
    const url = new URL(path, baseOrigin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = tokenManager.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const tenantId = tokenManager.getTenantId();
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  private async parseErrorResponseFromFetch(response: Response): Promise<ApiClientError> {
    try {
      const data = (await response.json()) as ApiErrorResponse;
      const errorInfo: ApiError = {
        message: data.message ?? data.error ?? `Request failed with status ${response.status}`,
        status: response.status,
        details: data.details,
      };
      if (data.code) {
        errorInfo.code = data.code;
      }
      return new ApiClientError(errorInfo);
    } catch {
      return new ApiClientError({
        message: `Request failed with status ${response.status}`,
        status: response.status,
      });
    }
  }

  private parseErrorResponse(status: number, responseText: string): ApiClientError {
    try {
      const data = JSON.parse(responseText) as ApiErrorResponse;
      const errorInfo: ApiError = {
        message: data.message ?? data.error ?? `Request failed with status ${status}`,
        status,
        details: data.details,
      };
      if (data.code) {
        errorInfo.code = data.code;
      }
      return new ApiClientError(errorInfo);
    } catch {
      return new ApiClientError({
        message: responseText || `Request failed with status ${status}`,
        status,
      });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const apiClient = new ApiClient();
export default apiClient;
