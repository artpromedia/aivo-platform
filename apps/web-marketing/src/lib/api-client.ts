/**
 * API Client for communicating with the main AIVO app
 *
 * In development: Requests go through Next.js rewrites (proxy)
 * In production: Requests go directly to the app URL with CORS
 */

import type { User, Subscription, AuthSession, CheckoutParams, ApiResponse } from './types';

// ============================================
// CONFIGURATION
// ============================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3001';

/**
 * Whether to use the local proxy (Next.js rewrites) for API requests.
 * In development, we proxy through the marketing site to avoid CORS issues.
 * In production, we make direct requests with proper CORS headers.
 */
const USE_PROXY = process.env.NODE_ENV === 'development';

/**
 * Get the appropriate API URL for an endpoint.
 * Uses local path in dev (proxied), full URL in production (CORS).
 */
function getApiUrl(endpoint: string): string {
  if (USE_PROXY) {
    // Use local proxy in development - requests go through Next.js rewrites
    return endpoint;
  }
  // Direct request in production - requires CORS to be configured
  return `${APP_URL}${endpoint}`;
}

// ============================================
// API CLIENT
// ============================================

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      // Use proxy-aware URL
      const url = getApiUrl(endpoint);

      // Build headers object, ensuring we handle different header formats
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Merge additional headers if provided
      if (options.headers) {
        const optHeaders = options.headers;
        if (optHeaders instanceof Headers) {
          optHeaders.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(optHeaders)) {
          optHeaders.forEach(([key, value]) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, optHeaders);
        }
      }

      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Important for cookie-based auth
        headers,
      });

      const status = response.status;

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        return {
          error: errorData.message || errorData.error || 'Request failed',
          status,
        };
      }

      const data = (await response.json()) as T;
      return { data, status };
    } catch (error) {
      // In development, network errors are expected when main app isn't running
      // Use debug logging to avoid cluttering the console
      if (process.env.NODE_ENV === 'development') {
        console.debug('[API] Request failed (main app may be unavailable):', endpoint);
      } else {
        console.error('API request failed:', error);
      }
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  /**
   * Get current authenticated user session
   */
  async getSession(): Promise<ApiResponse<AuthSession>> {
    return this.request<AuthSession>('/api/auth/session');
  }

  /**
   * Get current user (simpler endpoint)
   */
  async getMe(): Promise<ApiResponse<{ user: User; subscription?: Subscription }>> {
    return this.request<{ user: User; subscription?: Subscription }>('/api/auth/me');
  }

  /**
   * Check if user is authenticated
   * Returns isAuthenticated: false for any error (network, 500, 401, etc.)
   * This allows the marketing site to work standalone when main app is unavailable
   */
  async checkAuth(): Promise<{
    isAuthenticated: boolean;
    user?: User;
    subscription?: Subscription;
  }> {
    // Try /api/auth/me first, fallback to /api/auth/session
    const response = await this.getMe();

    // Handle errors gracefully - treat as not authenticated
    if (response.error || response.status === 0 || response.status >= 500) {
      // Network error, server error, or main app not running
      // This is expected in development when main app isn't started
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Auth] Main app unavailable, treating as not authenticated');
      }
      return { isAuthenticated: false };
    }

    if (response.status === 404) {
      // Endpoint doesn't exist, try session
      const sessionResponse = await this.getSession();
      if (sessionResponse.data?.user) {
        return {
          isAuthenticated: true,
          user: sessionResponse.data.user,
          subscription: sessionResponse.data.subscription || undefined,
        };
      }
      return { isAuthenticated: false };
    }

    if (response.data?.user) {
      return {
        isAuthenticated: true,
        user: response.data.user,
        subscription: response.data.subscription || undefined,
      };
    }

    return { isAuthenticated: false };
  }

  /**
   * Logout user (clears session)
   */
  async logout(): Promise<ApiResponse<null>> {
    return this.request<null>('/api/auth/logout', {
      method: 'POST',
    });
  }

  // ============================================
  // SUBSCRIPTION ENDPOINTS
  // ============================================

  /**
   * Get user's current subscription
   */
  async getSubscription(): Promise<ApiResponse<Subscription | null>> {
    return this.request<Subscription | null>('/api/subscription');
  }

  /**
   * Create checkout session (redirects to Stripe)
   */
  async createCheckoutSession(params: CheckoutParams): Promise<ApiResponse<{ url: string }>> {
    return this.request<{ url: string }>('/api/checkout/session', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        successUrl: params.successUrl || `${APP_URL}/checkout/success`,
        cancelUrl: params.cancelUrl || `${MARKETING_URL}/pricing`,
      }),
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get the base URL for the main app
   */
  getAppUrl(): string {
    return this.baseUrl;
  }

  /**
   * Build a URL to the main app with optional query params
   */
  buildAppUrl(path: string, params?: Record<string, string | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  }
}

// Export singleton instance
export const apiClient = new ApiClient(APP_URL);

// Export class for testing
export { ApiClient };

// Export constants
export { APP_URL, MARKETING_URL };
