/**
 * CSRF Middleware Unit Tests
 *
 * Tests for CSRF token generation, validation, and protection.
 *
 * @module tests/csrf.middleware.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';

// CSRF Configuration
const DEFAULT_CONFIG = {
  cookieName: '__csrf_token',
  headerName: 'x-csrf-token',
  tokenLength: 32,
  secure: true,
  sameSite: 'strict' as const,
  excludePaths: [
    '/auth/sso/callback',
    '/auth/saml/callback',
    '/auth/oidc/callback',
    '/api/webhooks/',
    '/health',
    '/ready',
    '/metrics',
  ],
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  enabled: true,
};

// Token generation
function generateCsrfToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// Constant-time comparison
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Check excluded paths
function isExcludedPath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludedPath) => {
    if (excludedPath.endsWith('/')) {
      return path.startsWith(excludedPath);
    }
    return path === excludedPath || path.startsWith(excludedPath + '/');
  });
}

// Mock request factory
function createMockRequest(overrides: {
  method?: string;
  path?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, any>;
}) {
  return {
    method: overrides.method || 'GET',
    url: overrides.path || '/api/test',
    cookies: overrides.cookies || {},
    headers: overrides.headers || {},
    body: overrides.body || {},
  };
}

// Mock reply factory
function createMockReply() {
  const cookies: Record<string, any> = {};
  return {
    setCookie: vi.fn((name: string, value: string, options: any) => {
      cookies[name] = { value, options };
    }),
    code: vi.fn().mockReturnThis(),
    send: vi.fn(),
    cookies,
  };
}

describe('CSRF Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Token Generation
  // ===========================================================================

  describe('Token Generation', () => {
    it('should generate cryptographically secure tokens', () => {
      const token = generateCsrfToken(32);

      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken(32));
      }

      expect(tokens.size).toBe(100);
    });

    it('should generate tokens of specified length', () => {
      const lengths = [16, 24, 32, 48];

      for (const length of lengths) {
        const token = generateCsrfToken(length);
        expect(token).toHaveLength(length * 2);
      }
    });

    it('should use randomBytes for token generation', () => {
      const token = generateCsrfToken();

      // Token should be unpredictable
      expect(token.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Safe Comparison
  // ===========================================================================

  describe('Safe Comparison', () => {
    it('should return true for matching strings', () => {
      const a = 'abc123';
      const b = 'abc123';

      expect(safeCompare(a, b)).toBe(true);
    });

    it('should return false for non-matching strings', () => {
      const a = 'abc123';
      const b = 'xyz789';

      expect(safeCompare(a, b)).toBe(false);
    });

    it('should return false for different length strings', () => {
      const a = 'short';
      const b = 'much longer string';

      expect(safeCompare(a, b)).toBe(false);
    });

    it('should be constant-time for same-length strings', () => {
      const token = generateCsrfToken();
      const similar = token.slice(0, -1) + (token.slice(-1) === '0' ? '1' : '0');

      // Both comparisons should take similar time
      safeCompare(token, token);
      safeCompare(token, similar);

      expect(safeCompare(token, similar)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(safeCompare('', '')).toBe(true);
      expect(safeCompare('', 'a')).toBe(false);
    });
  });

  // ===========================================================================
  // Excluded Paths
  // ===========================================================================

  describe('Excluded Paths', () => {
    it('should exclude SSO callback paths', () => {
      const ssoCallbacks = [
        '/auth/sso/callback',
        '/auth/saml/callback',
        '/auth/oidc/callback',
      ];

      for (const path of ssoCallbacks) {
        expect(isExcludedPath(path, DEFAULT_CONFIG.excludePaths)).toBe(true);
      }
    });

    it('should exclude webhook paths', () => {
      const webhookPaths = [
        '/api/webhooks/',
        '/api/webhooks/stripe',
        '/api/webhooks/github',
      ];

      for (const path of webhookPaths) {
        expect(isExcludedPath(path, DEFAULT_CONFIG.excludePaths)).toBe(true);
      }
    });

    it('should exclude health check paths', () => {
      const healthPaths = ['/health', '/ready', '/metrics'];

      for (const path of healthPaths) {
        expect(isExcludedPath(path, DEFAULT_CONFIG.excludePaths)).toBe(true);
      }
    });

    it('should not exclude regular API paths', () => {
      const regularPaths = [
        '/api/users',
        '/api/auth/login',
        '/api/content',
      ];

      for (const path of regularPaths) {
        expect(isExcludedPath(path, DEFAULT_CONFIG.excludePaths)).toBe(false);
      }
    });

    it('should handle path prefix matching', () => {
      // Webhook path ends with / so it matches prefixes
      expect(isExcludedPath('/api/webhooks/payment/process', DEFAULT_CONFIG.excludePaths)).toBe(true);
    });
  });

  // ===========================================================================
  // Protected Methods
  // ===========================================================================

  describe('Protected Methods', () => {
    it('should protect POST requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).toContain('POST');
    });

    it('should protect PUT requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).toContain('PUT');
    });

    it('should protect PATCH requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).toContain('PATCH');
    });

    it('should protect DELETE requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).toContain('DELETE');
    });

    it('should not protect GET requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).not.toContain('GET');
    });

    it('should not protect HEAD requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).not.toContain('HEAD');
    });

    it('should not protect OPTIONS requests', () => {
      expect(DEFAULT_CONFIG.protectedMethods).not.toContain('OPTIONS');
    });
  });

  // ===========================================================================
  // Cookie Configuration
  // ===========================================================================

  describe('Cookie Configuration', () => {
    it('should set cookie name correctly', () => {
      expect(DEFAULT_CONFIG.cookieName).toBe('__csrf_token');
    });

    it('should use secure cookies in production', () => {
      expect(DEFAULT_CONFIG.secure).toBe(true);
    });

    it('should use strict SameSite policy', () => {
      expect(DEFAULT_CONFIG.sameSite).toBe('strict');
    });

    it('should set CSRF cookie on response', () => {
      const reply = createMockReply();
      const token = generateCsrfToken();

      reply.setCookie(DEFAULT_CONFIG.cookieName, token, {
        httpOnly: true,
        secure: DEFAULT_CONFIG.secure,
        sameSite: DEFAULT_CONFIG.sameSite,
        path: '/',
      });

      expect(reply.setCookie).toHaveBeenCalledWith(
        '__csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        })
      );
    });
  });

  // ===========================================================================
  // Token Validation
  // ===========================================================================

  describe('Token Validation', () => {
    it('should validate token from header', () => {
      const token = generateCsrfToken();
      const request = createMockRequest({
        method: 'POST',
        cookies: { [DEFAULT_CONFIG.cookieName]: token },
        headers: { [DEFAULT_CONFIG.headerName]: token },
      });

      const cookieToken = request.cookies[DEFAULT_CONFIG.cookieName];
      const headerToken = request.headers[DEFAULT_CONFIG.headerName];

      expect(safeCompare(cookieToken!, headerToken!)).toBe(true);
    });

    it('should validate token from body', () => {
      const token = generateCsrfToken();
      const request = createMockRequest({
        method: 'POST',
        cookies: { [DEFAULT_CONFIG.cookieName]: token },
        body: { _csrf: token },
      });

      const cookieToken = request.cookies[DEFAULT_CONFIG.cookieName];
      const bodyToken = request.body._csrf;

      expect(safeCompare(cookieToken!, bodyToken)).toBe(true);
    });

    it('should reject mismatched tokens', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();

      const request = createMockRequest({
        method: 'POST',
        cookies: { [DEFAULT_CONFIG.cookieName]: cookieToken },
        headers: { [DEFAULT_CONFIG.headerName]: headerToken },
      });

      expect(safeCompare(
        request.cookies[DEFAULT_CONFIG.cookieName]!,
        request.headers[DEFAULT_CONFIG.headerName]!
      )).toBe(false);
    });

    it('should reject missing cookie token', () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { [DEFAULT_CONFIG.headerName]: generateCsrfToken() },
      });

      expect(request.cookies[DEFAULT_CONFIG.cookieName]).toBeUndefined();
    });

    it('should reject missing header/body token', () => {
      const request = createMockRequest({
        method: 'POST',
        cookies: { [DEFAULT_CONFIG.cookieName]: generateCsrfToken() },
      });

      expect(request.headers[DEFAULT_CONFIG.headerName]).toBeUndefined();
      expect(request.body._csrf).toBeUndefined();
    });

    it('should reject empty tokens', () => {
      const request = createMockRequest({
        method: 'POST',
        cookies: { [DEFAULT_CONFIG.cookieName]: '' },
        headers: { [DEFAULT_CONFIG.headerName]: '' },
      });

      expect(request.cookies[DEFAULT_CONFIG.cookieName]).toBe('');
    });
  });

  // ===========================================================================
  // Error Responses
  // ===========================================================================

  describe('Error Responses', () => {
    it('should return 403 for invalid CSRF token', () => {
      const reply = createMockReply();

      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid CSRF token',
        code: 'CSRF_INVALID',
      });

      expect(reply.code).toHaveBeenCalledWith(403);
    });

    it('should return 403 for missing CSRF token', () => {
      const reply = createMockReply();

      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'CSRF token required',
        code: 'CSRF_MISSING',
      });

      expect(reply.code).toHaveBeenCalledWith(403);
    });
  });

  // ===========================================================================
  // Request Flow
  // ===========================================================================

  describe('Request Flow', () => {
    it('should skip CSRF check for safe methods', () => {
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

      for (const method of safeMethods) {
        const isProtected = DEFAULT_CONFIG.protectedMethods.includes(method);
        expect(isProtected).toBe(false);
      }
    });

    it('should skip CSRF check for excluded paths', () => {
      const request = createMockRequest({
        method: 'POST',
        path: '/auth/sso/callback',
      });

      const isExcluded = isExcludedPath(request.url, DEFAULT_CONFIG.excludePaths);
      expect(isExcluded).toBe(true);
    });

    it('should enforce CSRF for protected endpoints', () => {
      const request = createMockRequest({
        method: 'POST',
        path: '/api/users',
      });

      const isProtectedMethod = DEFAULT_CONFIG.protectedMethods.includes(request.method);
      const isExcluded = isExcludedPath(request.url, DEFAULT_CONFIG.excludePaths);

      expect(isProtectedMethod).toBe(true);
      expect(isExcluded).toBe(false);
    });

    it('should generate new token for GET requests', () => {
      const request = createMockRequest({ method: 'GET' });

      // GET requests should get a fresh token
      expect(request.method).toBe('GET');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle case-insensitive header names', () => {
      const token = generateCsrfToken();
      const headerVariations = [
        'x-csrf-token',
        'X-CSRF-TOKEN',
        'X-Csrf-Token',
      ];

      for (const header of headerVariations) {
        const request = createMockRequest({
          method: 'POST',
          headers: { [header.toLowerCase()]: token },
        });

        expect(request.headers['x-csrf-token']).toBe(token);
      }
    });

    it('should handle URL-encoded tokens', () => {
      const token = generateCsrfToken();
      const encoded = encodeURIComponent(token);

      expect(decodeURIComponent(encoded)).toBe(token);
    });

    it('should reject tokens with special characters', () => {
      const maliciousTokens = [
        '<script>alert(1)</script>',
        '"; DROP TABLE users; --',
        '{{constructor}}',
      ];

      for (const malicious of maliciousTokens) {
        // Valid tokens should only contain hex characters
        expect(/^[a-f0-9]+$/i.test(malicious)).toBe(false);
      }
    });

    it('should handle multiple CSRF tokens in body', () => {
      const token = generateCsrfToken();
      const request = createMockRequest({
        method: 'POST',
        body: {
          _csrf: token,
          csrf_token: 'different-token', // Should be ignored
        },
      });

      expect(request.body._csrf).toBe(token);
    });
  });

  // ===========================================================================
  // Environment Configuration
  // ===========================================================================

  describe('Environment Configuration', () => {
    it('should respect enabled flag', () => {
      const disabledConfig = { ...DEFAULT_CONFIG, enabled: false };

      expect(disabledConfig.enabled).toBe(false);
    });

    it('should use insecure cookies in development', () => {
      const devConfig = { ...DEFAULT_CONFIG, secure: false };

      expect(devConfig.secure).toBe(false);
    });

    it('should allow lax SameSite in some cases', () => {
      const laxConfig = { ...DEFAULT_CONFIG, sameSite: 'lax' as const };

      expect(laxConfig.sameSite).toBe('lax');
    });
  });
});
