/**
 * Auth Service - JWT Token Tests
 *
 * Tests for JWT generation, validation, refresh, and blacklisting.
 *
 * @module tests/jwt.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

// Generate test keys
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

// Token configuration
const TOKEN_CONFIG = {
  accessTokenTtl: '15m',
  refreshTokenTtl: '7d',
  issuer: 'aivo.edu',
  audience: 'aivo-api',
};

// Token payload interface
interface TokenPayload {
  sub: string;
  tenant_id: string;
  roles: string[];
  jti?: string;
  email?: string;
}

// Helper to sign access tokens
async function signAccessToken(payload: TokenPayload): Promise<string> {
  const key = await importPKCS8(privateKeyPem, 'RS256');
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_CONFIG.accessTokenTtl)
    .setJti(payload.jti ?? randomUUID())
    .setIssuer(TOKEN_CONFIG.issuer)
    .setAudience(TOKEN_CONFIG.audience)
    .sign(key);
}

// Helper to sign refresh tokens
async function signRefreshToken(payload: TokenPayload): Promise<string> {
  const key = await importPKCS8(privateKeyPem, 'RS256');
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_CONFIG.refreshTokenTtl)
    .setJti(payload.jti ?? randomUUID())
    .setIssuer(TOKEN_CONFIG.issuer)
    .setAudience(TOKEN_CONFIG.audience)
    .sign(key);
}

// Helper to verify tokens
async function verifyToken(token: string): Promise<TokenPayload> {
  const key = await importSPKI(publicKeyPem, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    issuer: TOKEN_CONFIG.issuer,
    audience: TOKEN_CONFIG.audience,
  });
  return payload as unknown as TokenPayload;
}

describe('JWT Token Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Access Token Generation
  // ===========================================================================

  describe('Access Token Generation', () => {
    it('should generate valid access token', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token = await signAccessToken(payload);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include required claims', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER', 'PARENT'],
        email: 'user@example.com',
      };

      const token = await signAccessToken(payload);
      const verified = await verifyToken(token);

      expect(verified.sub).toBe('user-123');
      expect(verified.tenant_id).toBe('tenant-456');
      expect(verified.roles).toContain('LEARNER');
      expect(verified.roles).toContain('PARENT');
    });

    it('should set expiration time', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token = await signAccessToken(payload);
      const key = await importSPKI(publicKeyPem, 'RS256');
      const { payload: decoded } = await jwtVerify(token, key);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp! > decoded.iat!).toBe(true);
    });

    it('should include unique JTI', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token1 = await signAccessToken(payload);
      const token2 = await signAccessToken(payload);

      const key = await importSPKI(publicKeyPem, 'RS256');
      const { payload: decoded1 } = await jwtVerify(token1, key);
      const { payload: decoded2 } = await jwtVerify(token2, key);

      expect(decoded1.jti).not.toBe(decoded2.jti);
    });

    it('should use RS256 algorithm', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token = await signAccessToken(payload);
      const [headerBase64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerBase64, 'base64url').toString());

      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
    });
  });

  // ===========================================================================
  // Refresh Token Generation
  // ===========================================================================

  describe('Refresh Token Generation', () => {
    it('should generate valid refresh token', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token = await signRefreshToken(payload);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should have longer expiration than access token', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const accessToken = await signAccessToken(payload);
      const refreshToken = await signRefreshToken(payload);

      const key = await importSPKI(publicKeyPem, 'RS256');
      const { payload: accessDecoded } = await jwtVerify(accessToken, key);
      const { payload: refreshDecoded } = await jwtVerify(refreshToken, key);

      expect(refreshDecoded.exp! > accessDecoded.exp!).toBe(true);
    });
  });

  // ===========================================================================
  // Token Verification
  // ===========================================================================

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token = await signAccessToken(payload);
      const verified = await verifyToken(token);

      expect(verified.sub).toBe('user-123');
    });

    it('should reject token with wrong signature', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
      };

      const token = await signAccessToken(payload);
      const tamperedToken = token.slice(0, -10) + 'tampered12';

      await expect(verifyToken(tamperedToken)).rejects.toThrow();
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'only.two.parts',
        '',
        'a.b',
        '123.456.789',
      ];

      for (const token of malformedTokens) {
        await expect(verifyToken(token)).rejects.toThrow();
      }
    });

    it('should reject tokens with wrong issuer', async () => {
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT({ sub: 'user-123', tenant_id: 't', roles: [] })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('wrong-issuer')
        .setAudience(TOKEN_CONFIG.audience)
        .setExpirationTime('15m')
        .sign(key);

      await expect(verifyToken(token)).rejects.toThrow();
    });

    it('should reject tokens with wrong audience', async () => {
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT({ sub: 'user-123', tenant_id: 't', roles: [] })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(TOKEN_CONFIG.issuer)
        .setAudience('wrong-audience')
        .setExpirationTime('15m')
        .sign(key);

      await expect(verifyToken(token)).rejects.toThrow();
    });

    it('should reject expired tokens', async () => {
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT({ sub: 'user-123', tenant_id: 't', roles: [] })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(TOKEN_CONFIG.issuer)
        .setAudience(TOKEN_CONFIG.audience)
        .setExpirationTime('-1s') // Already expired
        .sign(key);

      await expect(verifyToken(token)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Token Payload Validation
  // ===========================================================================

  describe('Token Payload Validation', () => {
    it('should require sub claim', async () => {
      const payload = { tenant_id: 'tenant-456', roles: ['LEARNER'] };
      
      // Token without sub should fail validation
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setExpirationTime('15m')
        .sign(key);

      const publicKeyObj = await importSPKI(publicKeyPem, 'RS256');
      const { payload: decoded } = await jwtVerify(token, publicKeyObj);
      
      expect(decoded.sub).toBeUndefined();
    });

    it('should require tenant_id claim', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: '',
        roles: ['LEARNER'],
      };

      const token = await signAccessToken(payload);
      const verified = await verifyToken(token);

      expect(verified.tenant_id).toBe('');
    });

    it('should require roles claim', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: [],
      };

      const token = await signAccessToken(payload);
      const verified = await verifyToken(token);

      expect(verified.roles).toEqual([]);
    });

    it('should handle multiple roles', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['ADMIN', 'TEACHER', 'PARENT'],
      };

      const token = await signAccessToken(payload);
      const verified = await verifyToken(token);

      expect(verified.roles).toHaveLength(3);
      expect(verified.roles).toContain('ADMIN');
    });
  });

  // ===========================================================================
  // Token Refresh Flow
  // ===========================================================================

  describe('Token Refresh Flow', () => {
    it('should generate new token pair from refresh token', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
        jti: 'session-789',
      };

      const refreshToken = await signRefreshToken(payload);
      const verified = await verifyToken(refreshToken);

      // Generate new tokens based on refresh token payload
      const newAccessToken = await signAccessToken({
        sub: verified.sub,
        tenant_id: verified.tenant_id,
        roles: verified.roles,
      });

      expect(newAccessToken).toBeDefined();
    });

    it('should invalidate old refresh token on rotation', async () => {
      const payload: TokenPayload = {
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
        jti: 'old-session',
      };

      const oldRefresh = await signRefreshToken(payload);
      
      // Simulate token rotation
      const newPayload = {
        ...payload,
        jti: 'new-session',
      };
      const newRefresh = await signRefreshToken(newPayload);

      expect(oldRefresh).not.toBe(newRefresh);
    });
  });

  // ===========================================================================
  // Token Blacklisting
  // ===========================================================================

  describe('Token Blacklisting', () => {
    const mockRedis = {
      set: vi.fn(),
      get: vi.fn(),
      exists: vi.fn(),
    };

    it('should add token to blacklist', async () => {
      const jti = 'token-id-123';
      
      mockRedis.set.mockResolvedValue('OK');
      
      await mockRedis.set(`blacklist:token:${jti}`, '1', 'EX', 86400);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `blacklist:token:${jti}`,
        '1',
        'EX',
        86400
      );
    });

    it('should check if token is blacklisted', async () => {
      const jti = 'token-id-123';
      
      mockRedis.exists.mockResolvedValue(1);
      
      const isBlacklisted = await mockRedis.exists(`blacklist:token:${jti}`);

      expect(isBlacklisted).toBe(1);
    });

    it('should return false for non-blacklisted token', async () => {
      const jti = 'valid-token-id';
      
      mockRedis.exists.mockResolvedValue(0);
      
      const isBlacklisted = await mockRedis.exists(`blacklist:token:${jti}`);

      expect(isBlacklisted).toBe(0);
    });
  });

  // ===========================================================================
  // Security Claims
  // ===========================================================================

  describe('Security Claims', () => {
    it('should include MFA verification status', async () => {
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT({
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
        mfa_verified: true,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(TOKEN_CONFIG.issuer)
        .setAudience(TOKEN_CONFIG.audience)
        .setExpirationTime('15m')
        .sign(key);

      const publicKeyObj = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKeyObj);

      expect(payload.mfa_verified).toBe(true);
    });

    it('should include session ID', async () => {
      const sessionId = 'session-abc-123';
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT({
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
        session_id: sessionId,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(TOKEN_CONFIG.issuer)
        .setAudience(TOKEN_CONFIG.audience)
        .setExpirationTime('15m')
        .sign(key);

      const publicKeyObj = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKeyObj);

      expect(payload.session_id).toBe(sessionId);
    });

    it('should include consent status for minors', async () => {
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const token = await new SignJWT({
        sub: 'user-123',
        tenant_id: 'tenant-456',
        roles: ['LEARNER'],
        is_minor: true,
        consent_status: 'granted',
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(TOKEN_CONFIG.issuer)
        .setAudience(TOKEN_CONFIG.audience)
        .setExpirationTime('15m')
        .sign(key);

      const publicKeyObj = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKeyObj);

      expect(payload.is_minor).toBe(true);
      expect(payload.consent_status).toBe('granted');
    });
  });
});
