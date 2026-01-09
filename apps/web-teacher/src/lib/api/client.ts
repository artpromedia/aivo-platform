/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/**
 * API Client for Teacher Portal
 *
 * HTTP client with authentication, error handling, and retry logic
 */

import { getEnvUrl } from '../utils';

const API_BASE_URL = getEnvUrl(
  'NEXT_PUBLIC_API_URL',
  'http://localhost:4000',
  { serviceName: 'Teacher API' }
);

export interface APIError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

class APIClient {
  private readonly baseUrl: string;
  private token: string | null = null;
  private readonly refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  clearAuthToken() {
    this.token = null;
  }

  private async getHeaders(customHeaders?: Record<string, string>): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Try to get token from cookie/session if not set
    if (!this.token && globalThis.window !== undefined) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { getSession } = await import('next-auth/react');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const session = (await getSession()) as { accessToken?: string } | null;
        if (session?.accessToken) {
          this.token = session.accessToken;
        }
      } catch {
        // Session not available
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async get<T>(path: string, params?: Record<string, unknown>, config?: RequestConfig): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => {
              url.searchParams.append(key, String(v));
            });
          } else if (value instanceof Date) {
            url.searchParams.append(key, value.toISOString());
          } else if (typeof value === 'object' && value !== null) {
            url.searchParams.append(key, JSON.stringify(value));
          } else {
            url.searchParams.append(key, String(value as string | number | boolean));
          }
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.getHeaders(config?.headers),
      signal: config?.signal,
      cache: config?.cache,
      next: config?.next,
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(config?.headers),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: await this.getHeaders(config?.headers),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: await this.getHeaders(config?.headers),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: await this.getHeaders(config?.headers),
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async upload<T>(
    path: string,
    file: File | FormData,
    config?: RequestConfig & { onProgress?: (percent: number) => void }
  ): Promise<T> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    const headers = await this.getHeaders(config?.headers);
    // Remove Content-Type to let browser set it with boundary
    delete (headers as Record<string, string>)['Content-Type'];

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await this.parseError(response);

      // Handle 401 - unauthorized
      if (response.status === 401) {
        // Clear token and redirect to login
        this.clearAuthToken();
        if (globalThis.window !== undefined) {
          globalThis.location.href = '/login';
        }
      }

      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
  }

  private async parseError(response: Response): Promise<APIError> {
    let message = 'An error occurred';
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    interface ErrorResponseData {
      message?: string;
      error?: string;
      code?: string;
      details?: Record<string, unknown>;
    }

    try {
      const data = (await response.json()) as ErrorResponseData;
      message = data.message ?? data.error ?? message;
      code = data.code;
      details = data.details;
    } catch {
      message = response.statusText || message;
    }

    const error = new Error(message) as APIError;
    error.status = response.status;
    error.code = code;
    error.details = details;
    return error;
  }
}

// Singleton API client instance
export const api = new APIClient(API_BASE_URL);

// Re-export for convenience
export { API_BASE_URL };
