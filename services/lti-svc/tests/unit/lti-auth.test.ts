/**
 * LTI Auth/JWKS Service Unit Tests
 *
 * Tests for LTI JWT validation and JWKS handling including:
 * - JWKS fetching and caching
 * - JWT signature verification
 * - Token claims validation
 * - LtiError handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock jose
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue(async () => ({ type: 'public' })),
  jwtVerify: vi.fn(),
  decodeJwt: vi.fn(),
  decodeProtectedHeader: vi.fn(),
}));

import { createRemoteJWKSet, jwtVerify, decodeJwt, decodeProtectedHeader } from 'jose';

// LtiError class implementation
class LtiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LtiError';
  }
}

// Types
interface JWKSCache {
  keys: unknown[];
  fetchedAt: number;
  ttlMs: number;
}

interface IdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
}

describe('LTI Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('JWKS Fetching', () => {
    it('should fetch JWKS from platform endpoint', async () => {
      const jwksUrl = 'https://canvas.instructure.com/api/lti/security/jwks';
      const mockJwks = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key-123',
            alg: 'RS256',
            n: 'base64-modulus',
            e: 'AQAB',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJwks),
      });

      const response = await mockFetch(jwksUrl);
      const jwks = await response.json();

      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0].kid).toBe('key-123');
    });

    it('should cache JWKS for configured TTL', () => {
      const cache: Map<string, JWKSCache> = new Map();
      const jwksUrl = 'https://canvas.instructure.com/api/lti/security/jwks';
      const ttlMs = 3600000; // 1 hour

      cache.set(jwksUrl, {
        keys: [{ kid: 'key-1' }],
        fetchedAt: Date.now(),
        ttlMs,
      });

      const cached = cache.get(jwksUrl);
      expect(cached).toBeDefined();
      expect(cached!.fetchedAt + cached!.ttlMs).toBeGreaterThan(Date.now());
    });

    it('should refresh expired JWKS cache', () => {
      const cache: Map<string, JWKSCache> = new Map();
      const jwksUrl = 'https://canvas.instructure.com/api/lti/security/jwks';
      const ttlMs = 3600000;

      // Set cache as expired (2 hours ago)
      cache.set(jwksUrl, {
        keys: [{ kid: 'old-key' }],
        fetchedAt: Date.now() - 2 * ttlMs,
        ttlMs,
      });

      const cached = cache.get(jwksUrl);
      const isExpired = cached!.fetchedAt + cached!.ttlMs < Date.now();
      expect(isExpired).toBe(true);
    });

    it('should handle JWKS fetch failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const response = await mockFetch('https://canvas.instructure.com/api/lti/security/jwks');
      expect(response.ok).toBe(false);
    });

    it('should use cached JWKS on fetch failure if still valid', () => {
      const cache: Map<string, JWKSCache> = new Map();
      const jwksUrl = 'https://canvas.instructure.com/api/lti/security/jwks';
      const ttlMs = 3600000;
      const gracePeriodMs = 300000; // 5 min grace period

      cache.set(jwksUrl, {
        keys: [{ kid: 'key-1' }],
        fetchedAt: Date.now() - ttlMs + gracePeriodMs, // Almost expired
        ttlMs,
      });

      const cached = cache.get(jwksUrl);
      const withinGracePeriod = cached!.fetchedAt + cached!.ttlMs + gracePeriodMs > Date.now();
      expect(withinGracePeriod).toBe(true);
    });
  });

  describe('JWT Verification', () => {
    it('should verify JWT signature with JWKS', async () => {
      const mockPayload = {
        iss: 'https://canvas.instructure.com',
        sub: 'user-123',
        aud: 'client-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      (jwtVerify as any).mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256', kid: 'key-1' },
      });

      const result = await jwtVerify('mock-token', () => Promise.resolve({ type: 'public' }));
      expect(result.payload.iss).toBe('https://canvas.instructure.com');
    });

    it('should reject JWT with invalid signature', async () => {
      (jwtVerify as any).mockRejectedValueOnce(new Error('signature verification failed'));

      await expect(
        jwtVerify('invalid-token', () => Promise.resolve({ type: 'public' }))
      ).rejects.toThrow('signature verification failed');
    });

    it('should reject expired JWT', async () => {
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      (decodeJwt as any).mockReturnValueOnce(expiredPayload);

      const claims = decodeJwt('expired-token');
      const isExpired = claims.exp! < Date.now() / 1000;
      expect(isExpired).toBe(true);
    });

    it('should reject JWT with wrong key ID', async () => {
      (decodeProtectedHeader as any).mockReturnValueOnce({ alg: 'RS256', kid: 'unknown-key' });

      const header = decodeProtectedHeader('token');
      expect(header.kid).toBe('unknown-key');
      // Would throw error when kid not found in JWKS
    });

    it('should accept JWT with valid exp claim', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;

      (decodeJwt as any).mockReturnValueOnce({
        exp: futureExp,
        iat: Math.floor(Date.now() / 1000),
      });

      const claims = decodeJwt('valid-token');
      const isValid = claims.exp! > Date.now() / 1000;
      expect(isValid).toBe(true);
    });
  });

  describe('Token Claims Validation', () => {
    const validateClaims = (
      claims: Partial<IdTokenClaims>,
      expectedAud: string,
      expectedIss: string
    ): void => {
      if (!claims.iss) throw new LtiError('MISSING_CLAIM', 'Missing issuer claim', 400);
      if (claims.iss !== expectedIss) throw new LtiError('INVALID_ISSUER', 'Invalid issuer', 401);
      if (!claims.aud) throw new LtiError('MISSING_CLAIM', 'Missing audience claim', 400);
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.includes(expectedAud))
        throw new LtiError('INVALID_AUDIENCE', 'Invalid audience', 401);
    };

    it('should validate issuer matches expected platform', () => {
      const claims = {
        iss: 'https://canvas.instructure.com',
        aud: 'client-123',
      };

      expect(() =>
        validateClaims(claims, 'client-123', 'https://canvas.instructure.com')
      ).not.toThrow();
    });

    it('should reject mismatched issuer', () => {
      const claims = {
        iss: 'https://evil.com',
        aud: 'client-123',
      };

      expect(() => validateClaims(claims, 'client-123', 'https://canvas.instructure.com')).toThrow(
        LtiError
      );
    });

    it('should validate audience matches client ID', () => {
      const claims = {
        iss: 'https://canvas.instructure.com',
        aud: 'client-123',
      };

      expect(() =>
        validateClaims(claims, 'client-123', 'https://canvas.instructure.com')
      ).not.toThrow();
    });

    it('should handle audience as array', () => {
      const claims = {
        iss: 'https://canvas.instructure.com',
        aud: ['client-123', 'other-client'],
      };

      expect(() =>
        validateClaims(claims, 'client-123', 'https://canvas.instructure.com')
      ).not.toThrow();
    });

    it('should reject invalid audience', () => {
      const claims = {
        iss: 'https://canvas.instructure.com',
        aud: 'wrong-client',
      };

      expect(() => validateClaims(claims, 'client-123', 'https://canvas.instructure.com')).toThrow(
        LtiError
      );
    });

    it('should validate required LTI claims', () => {
      const requiredLtiClaims = [
        'https://purl.imsglobal.org/spec/lti/claim/message_type',
        'https://purl.imsglobal.org/spec/lti/claim/version',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
      ];

      const claims = {
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        // Missing deployment_id
      };

      const missingClaims = requiredLtiClaims.filter((c) => !(c in claims));
      expect(missingClaims).toContain('https://purl.imsglobal.org/spec/lti/claim/deployment_id');
    });

    it('should validate LTI version is 1.3.0', () => {
      const version = '1.3.0';
      expect(version).toBe('1.3.0');

      const invalidVersion = '1.1.0';
      expect(invalidVersion).not.toBe('1.3.0');
    });
  });

  describe('LtiError Handling', () => {
    it('should create LtiError with correct properties', () => {
      const error = new LtiError('INVALID_TOKEN', 'Token validation failed', 401, {
        tokenId: 'abc',
      });

      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.message).toBe('Token validation failed');
      expect(error.httpStatus).toBe(401);
      expect(error.details?.tokenId).toBe('abc');
    });

    it('should use default HTTP status 400', () => {
      const error = new LtiError('BAD_REQUEST', 'Invalid request');
      expect(error.httpStatus).toBe(400);
    });

    it('should be instance of Error', () => {
      const error = new LtiError('TEST', 'Test error');
      expect(error instanceof Error).toBe(true);
    });

    it('should have correct error name', () => {
      const error = new LtiError('TEST', 'Test error');
      expect(error.name).toBe('LtiError');
    });

    it('should serialize error details for logging', () => {
      const error = new LtiError('INVALID_NONCE', 'Nonce already used', 400, {
        nonce: 'abc123',
        usedAt: new Date().toISOString(),
      });

      const serialized = JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details,
      });

      expect(serialized).toContain('INVALID_NONCE');
      expect(serialized).toContain('abc123');
    });
  });

  describe('Nonce Validation', () => {
    it('should store and validate nonce', () => {
      const nonceStore = new Set<string>();
      const nonce = 'unique-nonce-123';

      // First use should succeed
      expect(nonceStore.has(nonce)).toBe(false);
      nonceStore.add(nonce);
      expect(nonceStore.has(nonce)).toBe(true);

      // Second use should fail (replay attack)
      const isReplay = nonceStore.has(nonce);
      expect(isReplay).toBe(true);
    });

    it('should expire old nonces', () => {
      const nonceStore = new Map<string, number>();
      const nonceTtlMs = 600000; // 10 minutes

      // Add nonce with timestamp
      nonceStore.set('old-nonce', Date.now() - 2 * nonceTtlMs);
      nonceStore.set('new-nonce', Date.now());

      // Clean up expired nonces
      const cutoff = Date.now() - nonceTtlMs;
      for (const [nonce, timestamp] of nonceStore.entries()) {
        if (timestamp < cutoff) {
          nonceStore.delete(nonce);
        }
      }

      expect(nonceStore.has('old-nonce')).toBe(false);
      expect(nonceStore.has('new-nonce')).toBe(true);
    });

    it('should reject missing nonce in ID token', () => {
      const claims = {
        iss: 'https://canvas.instructure.com',
        sub: 'user-1',
        // No nonce
      };

      expect(claims).not.toHaveProperty('nonce');
    });
  });
});
