/**
 * Authentication Bypass Security Test Suite
 *
 * Tests for OWASP A01:2021 - Broken Access Control
 * and A07:2021 - Identification and Authentication Failures.
 *
 * Validates that authentication mechanisms cannot be bypassed
 * through common attack vectors.
 *
 * @module tests/security/authentication-bypass.security.test
 */

import { describe, it, expect } from 'vitest';
import { SECURITY_TEST_CONFIG } from './setup.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = SECURITY_TEST_CONFIG.apiBaseUrl;

// JWT manipulation payloads
const JWT_BYPASS_PAYLOADS = {
  algNone: [
    { alg: 'none', typ: 'JWT' },
    { alg: 'None', typ: 'JWT' },
    { alg: 'NONE', typ: 'JWT' },
    { alg: 'nOnE', typ: 'JWT' },
  ],
  algConfusion: [
    { alg: 'HS256', typ: 'JWT' }, // RS256→HS256 confusion
    { alg: 'HS384', typ: 'JWT' },
    { alg: 'HS512', typ: 'JWT' },
  ],
  invalidHeaders: [
    { alg: 'RS256', typ: 'JWT', kid: '../../../dev/null' },
    { alg: 'RS256', typ: 'JWT', kid: '../../etc/passwd' },
    { alg: 'RS256', typ: 'JWT', jku: 'https://evil.com/jwks.json' },
    { alg: 'RS256', typ: 'JWT', x5u: 'https://evil.com/cert.pem' },
  ],
};

// Auth header bypass attempts
const AUTH_HEADER_BYPASSES = [
  { header: 'Authorization', value: '' },
  { header: 'Authorization', value: 'Bearer' },
  { header: 'Authorization', value: 'Bearer ' },
  { header: 'Authorization', value: 'Bearer null' },
  { header: 'Authorization', value: 'Bearer undefined' },
  { header: 'Authorization', value: 'Bearer [object Object]' },
  { header: 'Authorization', value: 'Basic YWRtaW46YWRtaW4=' }, // admin:admin
  { header: 'Authorization', value: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.' },
  { header: 'X-Forwarded-For', value: '127.0.0.1' },
  { header: 'X-Real-IP', value: '127.0.0.1' },
  { header: 'X-Original-URL', value: '/admin' },
  { header: 'X-Rewrite-URL', value: '/admin' },
];

// Protected endpoints that require authentication
const PROTECTED_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/users/me' },
  { method: 'GET', path: '/api/v1/users' },
  { method: 'PUT', path: '/api/v1/users/me' },
  { method: 'GET', path: '/api/v1/lessons' },
  { method: 'POST', path: '/api/v1/lessons' },
  { method: 'GET', path: '/api/v1/analytics/dashboard' },
  { method: 'GET', path: '/api/v1/admin/settings' },
  { method: 'GET', path: '/api/v1/billing/subscription' },
  { method: 'POST', path: '/api/v1/payments' },
  { method: 'GET', path: '/api/v1/districts' },
];

// Path traversal patterns for accessing protected resources
const PATH_TRAVERSAL_BYPASSES = [
  '/api/v1/admin/../admin/settings',
  '/api/v1/./admin/settings',
  '/api/v1/users/../admin/settings',
  '/api/v1/%2e%2e/admin/settings',
  '/api/v1/..%2fadmin/settings',
  '/api/v1/%2e%2e%2fadmin/settings',
  '/api/v1/admin/settings%00',
  '/api/v1/admin/settings%0a',
  '/api/v1/admin/settings%0d',
  '/api/v1/admin;/settings',
  '/API/V1/ADMIN/SETTINGS',
  '/Api/V1/Admin/Settings',
];

// =============================================================================
// Helper Functions
// =============================================================================

interface ApiResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  error?: string;
}

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse> {
  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
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

    return { status: response.status, data, headers: responseHeaders };
  } catch (error) {
    return {
      status: 0,
      data: null,
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createMockJWT(
  payload: Record<string, unknown>,
  header?: Record<string, unknown>
): string {
  const h = { alg: 'RS256', typ: 'JWT', ...header };
  const encodedHeader = Buffer.from(JSON.stringify(h)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedHeader}.${encodedPayload}.`;
}

// =============================================================================
// JWT Algorithm Bypass Tests
// =============================================================================

describe('Authentication Bypass Security Tests', () => {
  describe('JWT Algorithm Bypass (alg:none)', () => {
    it.each(JWT_BYPASS_PAYLOADS.algNone)(
      'should REJECT JWT with alg: $alg',
      async (header) => {
        const token = createMockJWT(
          { sub: '1', email: 'admin@example.com', role: 'ADMIN' },
          header
        );

        const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
          Authorization: `Bearer ${token}`,
        });

        // Must not return 200 with valid user data
        expect([401, 403]).toContain(response.status);
      }
    );
  });

  describe('JWT Algorithm Confusion (RS256→HS256)', () => {
    it.each(JWT_BYPASS_PAYLOADS.algConfusion)(
      'should REJECT JWT with confused algorithm: $alg',
      async (header) => {
        const token = createMockJWT(
          { sub: '1', email: 'admin@example.com', role: 'ADMIN' },
          header
        );

        const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
          Authorization: `Bearer ${token}`,
        });

        expect([401, 403]).toContain(response.status);
      }
    );
  });

  describe('JWT Header Injection (kid, jku, x5u)', () => {
    it.each(JWT_BYPASS_PAYLOADS.invalidHeaders)(
      'should REJECT JWT with manipulated header field',
      async (header) => {
        const token = createMockJWT(
          { sub: '1', email: 'admin@example.com', role: 'ADMIN' },
          header
        );

        const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
          Authorization: `Bearer ${token}`,
        });

        expect([401, 403]).toContain(response.status);
      }
    );
  });

  // =============================================================================
  // Auth Header Bypass Tests
  // =============================================================================

  describe('Authentication Header Bypass', () => {
    it.each(AUTH_HEADER_BYPASSES)(
      'should REJECT bypass via $header: $value',
      async ({ header, value }) => {
        const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
          [header]: value,
        });

        // Must not leak authenticated data
        expect([401, 403]).toContain(response.status);
      }
    );
  });

  // =============================================================================
  // Protected Endpoint Tests (No Auth)
  // =============================================================================

  describe('Protected Endpoints Without Authentication', () => {
    it.each(PROTECTED_ENDPOINTS)(
      'should REJECT unauthenticated $method $path',
      async ({ method, path }) => {
        const response = await makeRequest(path, method);

        // Must require authentication
        expect([401, 403]).toContain(response.status);
      }
    );
  });

  // =============================================================================
  // Path Traversal Authentication Bypass
  // =============================================================================

  describe('Path Traversal to Bypass Auth', () => {
    it.each(PATH_TRAVERSAL_BYPASSES)(
      'should NOT grant access via path traversal: %s',
      async (path) => {
        const response = await makeRequest(path);

        // Should not return 200 with admin data
        expect(response.status).not.toBe(200);
      }
    );
  });

  // =============================================================================
  // Token Manipulation Tests
  // =============================================================================

  describe('Token Manipulation', () => {
    it('should REJECT expired tokens', async () => {
      const token = createMockJWT({
        sub: '1',
        email: 'user@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      });

      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT tokens with future nbf (not before)', async () => {
      const token = createMockJWT({
        sub: '1',
        email: 'user@example.com',
        nbf: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        exp: Math.floor(Date.now() / 1000) + 7200,
      });

      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT tokens with tampered payload', async () => {
      // Create a token, then modify the payload
      const originalToken = createMockJWT({
        sub: '1',
        email: 'user@example.com',
        role: 'LEARNER',
      });

      // Tamper: change role to ADMIN
      const parts = originalToken.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: '1', email: 'user@example.com', role: 'ADMIN' })
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: `Bearer ${tamperedToken}`,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT tokens with missing signature', async () => {
      const token = createMockJWT({
        sub: '1',
        email: 'user@example.com',
      });
      // Token already has empty signature from createMockJWT

      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT tokens with wrong issuer', async () => {
      const token = createMockJWT({
        sub: '1',
        iss: 'https://evil-issuer.com',
        email: 'user@example.com',
      });

      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT tokens with wrong audience', async () => {
      const token = createMockJWT({
        sub: '1',
        aud: 'wrong-audience',
        email: 'user@example.com',
      });

      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: `Bearer ${token}`,
      });

      expect([401, 403]).toContain(response.status);
    });
  });

  // =============================================================================
  // HTTP Method Override Bypass
  // =============================================================================

  describe('HTTP Method Override Bypass', () => {
    it('should NOT allow X-HTTP-Method-Override to bypass restrictions', async () => {
      const response = await makeRequest('/api/v1/admin/settings', 'GET', undefined, {
        'X-HTTP-Method-Override': 'DELETE',
      });

      expect([401, 403, 405]).toContain(response.status);
    });

    it('should NOT allow X-Method-Override to bypass restrictions', async () => {
      const response = await makeRequest('/api/v1/admin/settings', 'POST', undefined, {
        'X-Method-Override': 'GET',
      });

      expect([401, 403, 405]).toContain(response.status);
    });

    it('should NOT allow _method parameter override', async () => {
      const response = await makeRequest('/api/v1/admin/settings?_method=DELETE', 'POST');

      expect([401, 403, 405]).toContain(response.status);
    });
  });

  // =============================================================================
  // Cookie-Based Auth Bypass
  // =============================================================================

  describe('Cookie-Based Authentication Bypass', () => {
    it('should REJECT forged session cookies', async () => {
      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Cookie: 'session=forged-session-id-12345',
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT cookies with SQL injection payloads', async () => {
      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Cookie: "session=' OR 1=1--",
      });

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should REJECT cookies with path traversal', async () => {
      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Cookie: 'session=../../../etc/passwd',
      });

      expect([400, 401, 403]).toContain(response.status);
    });
  });

  // =============================================================================
  // Password Reset Flow Bypass
  // =============================================================================

  describe('Password Reset Flow Bypass', () => {
    it('should REJECT reused password reset tokens', async () => {
      const response = await makeRequest('/api/v1/auth/reset-password', 'POST', {
        token: 'previously-used-token',
        newPassword: 'NewPassword123!',
      });

      expect([400, 401, 403, 422]).toContain(response.status);
    });

    it('should REJECT expired password reset tokens', async () => {
      const response = await makeRequest('/api/v1/auth/reset-password', 'POST', {
        token: 'expired-token-from-yesterday',
        newPassword: 'NewPassword123!',
      });

      expect([400, 401, 403, 422]).toContain(response.status);
    });

    it('should REJECT password reset without valid token', async () => {
      const response = await makeRequest('/api/v1/auth/reset-password', 'POST', {
        email: 'user@example.com',
        newPassword: 'NewPassword123!',
      });

      expect([400, 401, 403, 422]).toContain(response.status);
    });

    it('should NOT reveal user existence via password reset', async () => {
      const realResponse = await makeRequest('/api/v1/auth/forgot-password', 'POST', {
        email: 'real-user@example.com',
      });

      const fakeResponse = await makeRequest('/api/v1/auth/forgot-password', 'POST', {
        email: 'nonexistent-user@example.com',
      });

      // Both should return the same status (no user enumeration)
      expect(realResponse.status).toBe(fakeResponse.status);
    });
  });

  // =============================================================================
  // Registration Bypass
  // =============================================================================

  describe('Registration Bypass', () => {
    it('should NOT allow self-assignment of admin role', async () => {
      const response = await makeRequest('/api/v1/auth/register', 'POST', {
        email: 'attacker@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      });

      // Should either reject or ignore the role field
      if (response.status === 201 || response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data.role).not.toBe('ADMIN');
      }
    });

    it('should NOT allow self-assignment of elevated permissions', async () => {
      const response = await makeRequest('/api/v1/auth/register', 'POST', {
        email: 'attacker@example.com',
        password: 'Password123!',
        permissions: ['admin:*', 'users:delete', 'billing:manage'],
      });

      // Should either reject or ignore the permissions field
      if (response.status === 201 || response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data).not.toHaveProperty('permissions');
      }
    });

    it('should NOT allow tenant ID override on registration', async () => {
      const response = await makeRequest('/api/v1/auth/register', 'POST', {
        email: 'attacker@example.com',
        password: 'Password123!',
        tenantId: 'other-tenant-id',
      });

      // Should either reject or ignore the tenantId field
      if (response.status === 201 || response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data).not.toHaveProperty('tenantId', 'other-tenant-id');
      }
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - JWT Algorithm Bypass (alg:none): ~4 tests
 * - JWT Algorithm Confusion: ~3 tests
 * - JWT Header Injection: ~4 tests
 * - Auth Header Bypass: ~12 tests
 * - Protected Endpoints Without Auth: ~10 tests
 * - Path Traversal: ~12 tests
 * - Token Manipulation: ~6 tests
 * - HTTP Method Override: ~3 tests
 * - Cookie-Based Bypass: ~3 tests
 * - Password Reset Flow: ~4 tests
 * - Registration Bypass: ~3 tests
 *
 * Total: 64+ test cases for authentication bypass
 */
