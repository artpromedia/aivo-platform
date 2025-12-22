/**
 * API Test Client
 *
 * A typed HTTP client for integration testing with:
 * - Automatic authentication headers
 * - Request/response logging
 * - WebSocket support for real-time features
 * - Retry logic for flaky services
 *
 * @module tests/integration/utils/api-client
 */

import { EventEmitter } from 'node:events';

// ============================================================================
// Types
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  wsBaseUrl?: string;
  token?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  debug?: boolean;
}

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
  requestId?: string;
  duration: number;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: number;
}

// ============================================================================
// API Client Implementation
// ============================================================================

export class ApiClient {
  private baseUrl: string;
  private wsBaseUrl: string;
  private token: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private debug: boolean;
  private requestCounter = 0;

  constructor(tokenOrConfig: string | ApiClientConfig) {
    if (typeof tokenOrConfig === 'string') {
      this.baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
      this.wsBaseUrl = process.env.WS_BASE_URL ?? 'ws://localhost:4000';
      this.token = tokenOrConfig;
      this.timeout = 30000;
      this.retries = 3;
      this.retryDelay = 1000;
      this.debug = process.env.DEBUG === 'true';
    } else {
      this.baseUrl = tokenOrConfig.baseUrl;
      this.wsBaseUrl = tokenOrConfig.wsBaseUrl ?? tokenOrConfig.baseUrl.replace('http', 'ws');
      this.token = tokenOrConfig.token ?? '';
      this.timeout = tokenOrConfig.timeout ?? 30000;
      this.retries = tokenOrConfig.retries ?? 3;
      this.retryDelay = tokenOrConfig.retryDelay ?? 1000;
      this.debug = tokenOrConfig.debug ?? false;
    }
  }

  /**
   * Set or update the authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * GET request
   */
  async get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Connect to WebSocket endpoint
   */
  async connectWebSocket(path: string): Promise<MockWebSocket> {
    const url = `${this.wsBaseUrl}${path}`;
    
    if (this.debug) {
      console.log(`🔌 WebSocket connecting to: ${url}`);
    }

    // Return mock WebSocket for testing
    // In real implementation, use the 'ws' package
    const ws = new MockWebSocket(url, this.token);
    await ws.connect();
    
    return ws;
  }

  /**
   * Perform HTTP request with retries
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const url = this.buildUrl(path, options?.params);
    const timeout = options?.timeout ?? this.timeout;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-ID': requestId,
      ...options?.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.retries) {
      attempt++;
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const responseData = await this.parseResponse<T>(response);
        const responseHeaders = this.extractHeaders(response);

        const result: ApiResponse<T> = {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          headers: responseHeaders,
          requestId,
          duration,
        };

        if (this.debug) {
          this.logRequest(method, url, response.status, duration, data);
        }

        // Don't retry on client errors (4xx), only server errors (5xx)
        if (response.status >= 500 && attempt < this.retries) {
          lastError = new Error(`Server error: ${response.status}`);
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        if (this.debug) {
          console.error(`❌ Request failed (attempt ${attempt}/${this.retries}):`, error);
        }

        // Retry on network errors
        if (attempt < this.retries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Request failed after ${this.retries} attempts: ${lastError?.message}`);
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        return (await response.json()) as T;
      } catch {
        return {} as T;
      }
    }

    if (contentType.includes('text/')) {
      return (await response.text()) as unknown as T;
    }

    return {} as T;
  }

  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `test-${Date.now()}-${this.requestCounter}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
    data?: unknown
  ): void {
    const statusIcon = this.getStatusIcon(status);
    console.log(`${statusIcon} ${method} ${url} → ${status} (${duration}ms)`);
    if (data && Object.keys(data as object).length > 0) {
      console.log('   Request body:', JSON.stringify(data).slice(0, 200));
    }
  }

  private getStatusIcon(status: number): string {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 400) return '❌';
    return '⚠️';
  }
}

// ============================================================================
// Mock WebSocket (for testing without real WebSocket server)
// ============================================================================

export class MockWebSocket extends EventEmitter {
  private url: string;
  private token: string;
  private connected = false;
  private messages: WebSocketMessage[] = [];

  constructor(url: string, token: string) {
    super();
    this.url = url;
    this.token = token;
  }

  async connect(): Promise<void> {
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.connected = true;
    this.emit('open');
  }

  send(data: string | object): void {
    if (!this.connected) {
      throw new Error('WebSocket is not connected');
    }

    const message = typeof data === 'string' ? JSON.parse(data) : data;
    this.messages.push({
      type: message.type ?? 'message',
      data: message,
      timestamp: Date.now(),
    });
  }

  close(): void {
    this.connected = false;
    this.emit('close');
  }

  /**
   * Simulate receiving a message (for testing)
   */
  simulateMessage(data: unknown): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.emit('message', message);
  }

  /**
   * Get all sent messages (for assertions)
   */
  getSentMessages(): WebSocketMessage[] {
    return [...this.messages];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create an API client for a specific user from test context
 */
export function createApiClientForUser(
  userToken: string,
  options?: Partial<ApiClientConfig>
): ApiClient {
  return new ApiClient({
    baseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
    token: userToken,
    debug: process.env.DEBUG === 'true',
    ...options,
  });
}

/**
 * Create an unauthenticated API client
 */
export function createAnonymousClient(options?: Partial<ApiClientConfig>): ApiClient {
  return new ApiClient({
    baseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
    debug: process.env.DEBUG === 'true',
    ...options,
  });
}
