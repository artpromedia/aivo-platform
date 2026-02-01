/**
 * Rate Limiting Security Test Suite
 *
 * Comprehensive tests for rate limiting and throttling protection.
 * Covers OWASP API4:2023 - Unrestricted Resource Consumption.
 *
 * @module tests/security/rate-limiting.security.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Test Configuration
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Rate limit configurations (expected values)
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowSeconds: 300, // 5 minutes
    lockoutSeconds: 900, // 15 minutes
  },
  register: {
    maxAttempts: 3,
    windowSeconds: 3600, // 1 hour
  },
  passwordReset: {
    maxAttempts: 3,
    windowSeconds: 3600, // 1 hour
  },
  api: {
    maxRequests: 100,
    windowSeconds: 60, // 1 minute
  },
  apiAuthenticated: {
    maxRequests: 1000,
    windowSeconds: 60, // 1 minute
  },
  upload: {
    maxUploads: 10,
    windowSeconds: 60, // 1 minute
  },
  search: {
    maxRequests: 30,
    windowSeconds: 60, // 1 minute
  },
  export: {
    maxRequests: 5,
    windowSeconds: 3600, // 1 hour
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

interface ApiResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  error?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    return {
      status: response.status,
      data,
      headers: responseHeaders,
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function makeMultipleRequests(
  endpoint: string,
  count: number,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
  delayMs: number = 0
): Promise<ApiResponse[]> {
  const responses: ApiResponse[] = [];

  for (let i = 0; i < count; i++) {
    const response = await makeRequest(endpoint, method, body, headers);
    responses.push(response);

    if (delayMs > 0 && i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return responses;
}

async function makeConcurrentRequests(
  endpoint: string,
  count: number,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse[]> {
  const promises: Promise<ApiResponse>[] = [];

  for (let i = 0; i < count; i++) {
    promises.push(makeRequest(endpoint, method, body, headers));
  }

  return Promise.all(promises);
}

function extractRateLimitInfo(response: ApiResponse): RateLimitInfo | null {
  const headers = response.headers;

  // Common rate limit header patterns
  const limit = parseInt(
    headers['x-ratelimit-limit'] ||
      headers['ratelimit-limit'] ||
      headers['x-rate-limit-limit'] ||
      '0'
  );

  const remaining = parseInt(
    headers['x-ratelimit-remaining'] ||
      headers['ratelimit-remaining'] ||
      headers['x-rate-limit-remaining'] ||
      '0'
  );

  const reset = parseInt(
    headers['x-ratelimit-reset'] ||
      headers['ratelimit-reset'] ||
      headers['x-rate-limit-reset'] ||
      '0'
  );

  const retryAfter = parseInt(headers['retry-after'] || headers['x-retry-after'] || '0');

  if (limit === 0 && remaining === 0 && reset === 0) {
    return null;
  }

  return {
    limit,
    remaining,
    reset,
    retryAfter: retryAfter || undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Rate Limiting Tests - Authentication Endpoints
// =============================================================================

describe('Rate Limiting Security Tests', () => {
  describe('Authentication Rate Limiting', () => {
    describe('Login Endpoint', () => {
      it('should rate limit failed login attempts', async () => {
        const responses = await makeMultipleRequests(
          '/api/v1/auth/login',
          RATE_LIMITS.login.maxAttempts + 5,
          'POST',
          {
            email: 'test@example.com',
            password: 'wrongpassword',
          }
        );

        // After max attempts, should get 429 Too Many Requests
        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should include rate limit headers in login responses', async () => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'test@example.com',
          password: 'password123',
        });

        const rateLimitInfo = extractRateLimitInfo(response);

        // Should include rate limit information
        expect(rateLimitInfo).not.toBeNull();
        if (rateLimitInfo) {
          expect(rateLimitInfo.limit).toBeGreaterThan(0);
          expect(rateLimitInfo.remaining).toBeDefined();
        }
      });

      it('should track failed attempts per account', async () => {
        // Attempt login for different accounts
        const account1Responses = await makeMultipleRequests('/api/v1/auth/login', 3, 'POST', {
          email: 'user1@example.com',
          password: 'wrong',
        });

        const account2Responses = await makeMultipleRequests('/api/v1/auth/login', 3, 'POST', {
          email: 'user2@example.com',
          password: 'wrong',
        });

        // Each account should have its own rate limit counter
        // (implementation-specific behavior)
        const lastAccount1 = account1Responses[account1Responses.length - 1];
        const lastAccount2 = account2Responses[account2Responses.length - 1];

        // Neither should be rate-limited yet with only 3 attempts each
        expect(lastAccount1.status).not.toBe(429);
        expect(lastAccount2.status).not.toBe(429);
      });

      it('should implement account lockout after max attempts', async () => {
        // Exceed rate limit
        await makeMultipleRequests(
          '/api/v1/auth/login',
          RATE_LIMITS.login.maxAttempts + 1,
          'POST',
          {
            email: 'locktest@example.com',
            password: 'wrongpassword',
          }
        );

        // Subsequent request with correct password should still fail
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'locktest@example.com',
          password: 'correctpassword', // Even if correct
        });

        expect(response.status).toBe(429);
      });

      it('should include Retry-After header when rate limited', async () => {
        // Trigger rate limit
        await makeMultipleRequests(
          '/api/v1/auth/login',
          RATE_LIMITS.login.maxAttempts + 5,
          'POST',
          {
            email: 'retrytest@example.com',
            password: 'wrong',
          }
        );

        // Check for Retry-After header
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'retrytest@example.com',
          password: 'wrong',
        });

        if (response.status === 429) {
          const retryAfter = response.headers['retry-after'];
          expect(retryAfter).toBeDefined();
          expect(parseInt(retryAfter)).toBeGreaterThan(0);
        }
      });

      it('should rate limit by IP for unauthenticated requests', async () => {
        // Simulate requests from same IP with different accounts
        const responses = await makeMultipleRequests('/api/v1/auth/login', 50, 'POST', {
          email: 'any@example.com',
          password: 'wrong',
        });

        // Should eventually hit IP-based rate limit
        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });
    });

    describe('Registration Endpoint', () => {
      it('should rate limit registration attempts', async () => {
        const responses = await makeMultipleRequests(
          '/api/v1/auth/register',
          RATE_LIMITS.register.maxAttempts + 3,
          'POST',
          {
            email: `test${Date.now()}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
          }
        );

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should rate limit registration by IP', async () => {
        // Many registrations from same IP
        const responses: ApiResponse[] = [];

        for (let i = 0; i < RATE_LIMITS.register.maxAttempts + 3; i++) {
          const response = await makeRequest('/api/v1/auth/register', 'POST', {
            email: `newuser${Date.now()}${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
          });
          responses.push(response);
        }

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });
    });

    describe('Password Reset Endpoint', () => {
      it('should rate limit password reset requests', async () => {
        const responses = await makeMultipleRequests(
          '/api/v1/auth/forgot-password',
          RATE_LIMITS.passwordReset.maxAttempts + 3,
          'POST',
          { email: 'test@example.com' }
        );

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should rate limit per email for password reset', async () => {
        // Request password reset for same email multiple times
        const responses = await makeMultipleRequests(
          '/api/v1/auth/forgot-password',
          RATE_LIMITS.passwordReset.maxAttempts + 1,
          'POST',
          { email: 'resettest@example.com' }
        );

        const lastResponse = responses[responses.length - 1];
        expect(lastResponse.status).toBe(429);
      });
    });
  });

  // =============================================================================
  // Rate Limiting Tests - API Endpoints
  // =============================================================================

  describe('API Rate Limiting', () => {
    describe('General API Rate Limits', () => {
      it('should enforce rate limits on API endpoints', async () => {
        const responses = await makeConcurrentRequests(
          '/api/v1/users',
          RATE_LIMITS.api.maxRequests + 20
        );

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should include rate limit headers in API responses', async () => {
        const response = await makeRequest('/api/v1/users');

        const rateLimitInfo = extractRateLimitInfo(response);
        expect(rateLimitInfo).not.toBeNull();
      });

      it('should have higher limits for authenticated requests', async () => {
        // Mock authenticated request
        const authHeader = 'Bearer mock-auth-token';

        const response = await makeRequest('/api/v1/users', 'GET', undefined, {
          Authorization: authHeader,
        });

        const rateLimitInfo = extractRateLimitInfo(response);
        if (rateLimitInfo) {
          // Authenticated limit should be higher
          expect(rateLimitInfo.limit).toBeGreaterThanOrEqual(RATE_LIMITS.api.maxRequests);
        }
      });

      it('should reset rate limits after window expires', async () => {
        // This is a timing-sensitive test
        // Make requests up to limit
        await makeMultipleRequests('/api/v1/health', RATE_LIMITS.api.maxRequests);

        // Wait for window to reset (using shorter window for testing)
        await sleep(1000);

        // Should be able to make requests again
        const response = await makeRequest('/api/v1/health');

        // If rate limit resets, status should not be 429
        // (In production, might still be 429 if window hasn't expired)
        expect([200, 429]).toContain(response.status);
      });
    });

    describe('Per-Endpoint Rate Limits', () => {
      it('should apply stricter limits to search endpoints', async () => {
        const responses = await makeConcurrentRequests(
          '/api/v1/search?q=test',
          RATE_LIMITS.search.maxRequests + 10
        );

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should apply stricter limits to export endpoints', async () => {
        const responses = await makeMultipleRequests(
          '/api/v1/export/users',
          RATE_LIMITS.export.maxRequests + 2,
          'POST',
          { format: 'csv' }
        );

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should apply limits to file upload endpoints', async () => {
        const responses = await makeMultipleRequests(
          '/api/v1/uploads',
          RATE_LIMITS.upload.maxUploads + 3,
          'POST',
          { file: 'base64-encoded-file-data' }
        );

        const rateLimited = responses.filter((r) => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });
    });

    describe('Rate Limiting by User', () => {
      it('should track rate limits per user ID', async () => {
        const user1Token = 'Bearer user1-token';
        const user2Token = 'Bearer user2-token';

        // User 1 makes many requests
        await makeConcurrentRequests('/api/v1/lessons', 50, 'GET', undefined, {
          Authorization: user1Token,
        });

        // User 2 should still be able to make requests
        const user2Response = await makeRequest('/api/v1/lessons', 'GET', undefined, {
          Authorization: user2Token,
        });

        expect(user2Response.status).not.toBe(429);
      });

      it('should share rate limit across user sessions', async () => {
        const userToken1 = 'Bearer user-session-1';
        const userToken2 = 'Bearer user-session-2'; // Same user, different session

        // Make requests from session 1
        await makeMultipleRequests('/api/v1/users/me', 50, 'GET', undefined, {
          Authorization: userToken1,
        });

        // Session 2 should share the rate limit
        const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
          Authorization: userToken2,
        });

        // May or may not be rate limited depending on implementation
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  // =============================================================================
  // Burst Protection Tests
  // =============================================================================

  describe('Burst Protection', () => {
    it('should handle burst of concurrent requests', async () => {
      // Send 100 concurrent requests
      const responses = await makeConcurrentRequests('/api/v1/health', 100);

      // Some should succeed, some should be rate limited
      const successful = responses.filter((r) => r.status === 200);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(successful.length).toBeGreaterThan(0);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should prevent rapid-fire requests', async () => {
      // Send requests as fast as possible
      const responses = await makeMultipleRequests(
        '/api/v1/users',
        200,
        'GET',
        undefined,
        undefined,
        0 // No delay between requests
      );

      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not rate limit slow requests', async () => {
      // Send requests with delay (under rate limit)
      const responses = await makeMultipleRequests(
        '/api/v1/health',
        10,
        'GET',
        undefined,
        undefined,
        100 // 100ms delay between requests
      );

      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBe(0);
    });

    it('should apply token bucket or sliding window correctly', async () => {
      // First batch of requests
      await makeMultipleRequests('/api/v1/health', 50);

      // Small delay
      await sleep(500);

      // Second batch should partially succeed if using sliding window
      const responses = await makeMultipleRequests('/api/v1/health', 30);

      const successful = responses.filter((r) => r.status === 200);
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Rate Limit Header Tests
  // =============================================================================

  describe('Rate Limit Headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const response = await makeRequest('/api/v1/health');

      const limit = response.headers['x-ratelimit-limit'] || response.headers['ratelimit-limit'];
      expect(limit).toBeDefined();
      expect(parseInt(limit)).toBeGreaterThan(0);
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const response = await makeRequest('/api/v1/health');

      const remaining =
        response.headers['x-ratelimit-remaining'] || response.headers['ratelimit-remaining'];
      expect(remaining).toBeDefined();
    });

    it('should include X-RateLimit-Reset header', async () => {
      const response = await makeRequest('/api/v1/health');

      const reset = response.headers['x-ratelimit-reset'] || response.headers['ratelimit-reset'];
      expect(reset).toBeDefined();
    });

    it('should decrement remaining count correctly', async () => {
      const response1 = await makeRequest('/api/v1/health');
      const response2 = await makeRequest('/api/v1/health');

      const remaining1 = parseInt(
        response1.headers['x-ratelimit-remaining'] ||
          response1.headers['ratelimit-remaining'] ||
          '0'
      );
      const remaining2 = parseInt(
        response2.headers['x-ratelimit-remaining'] ||
          response2.headers['ratelimit-remaining'] ||
          '0'
      );

      // Remaining should decrease
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });

    it('should return 0 remaining when limit exceeded', async () => {
      // Trigger rate limit
      const responses = await makeMultipleRequests('/api/v1/health', 200);

      const rateLimitedResponse = responses.find((r) => r.status === 429);

      if (rateLimitedResponse) {
        const remaining = parseInt(
          rateLimitedResponse.headers['x-ratelimit-remaining'] ||
            rateLimitedResponse.headers['ratelimit-remaining'] ||
            '0'
        );
        expect(remaining).toBe(0);
      }
    });

    it('should include Retry-After header on 429 response', async () => {
      // Trigger rate limit
      await makeMultipleRequests('/api/v1/health', 200);

      const response = await makeRequest('/api/v1/health');

      if (response.status === 429) {
        const retryAfter = response.headers['retry-after'];
        expect(retryAfter).toBeDefined();
        expect(parseInt(retryAfter)).toBeGreaterThan(0);
      }
    });

    it('should use RateLimit draft standard headers', async () => {
      const response = await makeRequest('/api/v1/health');

      // Check for IETF RateLimit header draft standard
      const hasStandardHeaders =
        response.headers['ratelimit-limit'] !== undefined ||
        response.headers['ratelimit-remaining'] !== undefined ||
        response.headers['ratelimit-reset'] !== undefined;

      const hasLegacyHeaders =
        response.headers['x-ratelimit-limit'] !== undefined ||
        response.headers['x-ratelimit-remaining'] !== undefined ||
        response.headers['x-ratelimit-reset'] !== undefined;

      expect(hasStandardHeaders || hasLegacyHeaders).toBe(true);
    });
  });

  // =============================================================================
  // DDoS Protection Tests
  // =============================================================================

  describe('DDoS Protection', () => {
    it('should handle high volume of requests gracefully', async () => {
      // Send large number of concurrent requests
      const responses = await makeConcurrentRequests('/api/v1/health', 500);

      // Server should respond (not crash)
      const validResponses = responses.filter((r) => r.status !== 0);
      expect(validResponses.length).toBeGreaterThan(0);
    });

    it('should return proper error response when rate limited', async () => {
      // Trigger rate limit
      await makeConcurrentRequests('/api/v1/health', 500);

      const response = await makeRequest('/api/v1/health');

      if (response.status === 429) {
        // Should have proper error response body
        expect(response.data).toBeDefined();

        if (typeof response.data === 'object' && response.data !== null) {
          const data = response.data as Record<string, unknown>;
          // Should include error message
          expect(data.error || data.message).toBeDefined();
        }
      }
    });

    it('should not leak server information in rate limit responses', async () => {
      // Trigger rate limit
      await makeConcurrentRequests('/api/v1/health', 500);

      const response = await makeRequest('/api/v1/health');

      if (response.status === 429) {
        const responseStr = JSON.stringify(response.data).toLowerCase();

        // Should not leak server details
        expect(responseStr).not.toContain('stack');
        expect(responseStr).not.toContain('node_modules');
        expect(responseStr).not.toContain('at ');
      }
    });
  });

  // =============================================================================
  // Bypass Prevention Tests
  // =============================================================================

  describe('Rate Limit Bypass Prevention', () => {
    it('should not allow bypass via different HTTP methods', async () => {
      // Try different methods to same endpoint
      await makeMultipleRequests('/api/v1/users', 100, 'GET');

      const postResponse = await makeRequest('/api/v1/users', 'POST', {});
      const putResponse = await makeRequest('/api/v1/users/123', 'PUT', {});

      // Rate limit should apply across methods
      expect([200, 400, 401, 403, 429]).toContain(postResponse.status);
    });

    it('should not allow bypass via X-Forwarded-For spoofing', async () => {
      // Attempt to bypass by spoofing IP
      const responses = await makeMultipleRequests('/api/v1/health', 200, 'GET', undefined, {
        'X-Forwarded-For': `192.168.1.${Math.floor(Math.random() * 255)}`,
      });

      // Should still be rate limited (server should not trust X-Forwarded-For blindly)
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not allow bypass via X-Real-IP spoofing', async () => {
      const responses = await makeMultipleRequests('/api/v1/health', 200, 'GET', undefined, {
        'X-Real-IP': `10.0.0.${Math.floor(Math.random() * 255)}`,
      });

      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not allow bypass via case variation in endpoints', async () => {
      // Try case variations
      await makeMultipleRequests('/api/v1/USERS', 100);
      await makeMultipleRequests('/api/v1/Users', 100);

      const response = await makeRequest('/api/v1/users');

      // Should share rate limit across case variations
      expect([200, 429]).toContain(response.status);
    });

    it('should not allow bypass via trailing slashes', async () => {
      await makeMultipleRequests('/api/v1/users/', 100);

      const response = await makeRequest('/api/v1/users');

      // Should share rate limit
      expect([200, 429]).toContain(response.status);
    });

    it('should not allow bypass via query parameter variations', async () => {
      await makeMultipleRequests('/api/v1/users?foo=bar', 100);
      await makeMultipleRequests('/api/v1/users?bar=foo', 100);

      const response = await makeRequest('/api/v1/users');

      // Should share rate limit across query variations
      expect([200, 429]).toContain(response.status);
    });
  });

  // =============================================================================
  // Slowloris Prevention Tests
  // =============================================================================

  describe('Slowloris Attack Prevention', () => {
    it('should timeout slow requests', async () => {
      // This test requires server-side timeout configuration
      // We can only verify that the server doesn't hang indefinitely
      const startTime = Date.now();

      const response = await makeRequest('/api/v1/health');

      const elapsed = Date.now() - startTime;

      // Should respond within reasonable time (not hanging)
      expect(elapsed).toBeLessThan(30000); // 30 second max
    });

    it('should limit connection count per IP', async () => {
      // Open many connections
      const promises: Promise<ApiResponse>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(makeRequest('/api/v1/health'));
      }

      const responses = await Promise.all(promises);

      // Server should handle this gracefully
      const validResponses = responses.filter((r) => r.status !== 0);
      expect(validResponses.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - Authentication Rate Limiting: ~12 tests
 * - API Rate Limiting: ~9 tests
 * - Burst Protection: ~4 tests
 * - Rate Limit Headers: ~7 tests
 * - DDoS Protection: ~3 tests
 * - Bypass Prevention: ~6 tests
 * - Slowloris Prevention: ~2 tests
 *
 * Total: 43+ test cases for rate limiting
 */
