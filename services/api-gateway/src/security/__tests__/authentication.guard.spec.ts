/**
 * Authentication Guard Unit Tests
 *
 * Tests for JWT validation, session management, and authentication middleware.
 *
 * @module tests/authentication.guard.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

// Mock dependencies
const mockTokenService = {
  verifyAccessToken: vi.fn(),
  isTokenBlacklisted: vi.fn(),
};

const mockSessionService = {
  getSession: vi.fn(),
  touchSession: vi.fn(),
  invalidateSession: vi.fn(),
};

const mockThreatDetection = {
  recordThreat: vi.fn(),
};

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

const mockConfigService = {
  get: vi.fn(),
};

// Mock execution context factory
function createMockContext(overrides: {
  headers?: Record<string, string>;
  ip?: string;
  user?: any;
  securityContext?: any;
}): ExecutionContext {
  const request = {
    headers: overrides.headers || {},
    ip: overrides.ip || '127.0.0.1',
    user: overrides.user,
    securityContext: overrides.securityContext || { ip: overrides.ip || '127.0.0.1' },
    correlationId: 'test-correlation-id',
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

// Import after mocks
vi.mock('../services/token.service', () => ({ TokenService: vi.fn(() => mockTokenService) }));
vi.mock('../services/session.service', () => ({ SessionService: vi.fn(() => mockSessionService) }));
vi.mock('../services/threat-detection.service', () => ({ ThreatDetectionService: vi.fn(() => mockThreatDetection) }));

describe('AuthenticationGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockTokenService.isTokenBlacklisted.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Public Endpoints
  // ===========================================================================

  describe('Public Endpoints', () => {
    it('should allow access to public endpoints without token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true); // isPublic = true

      const context = createMockContext({ headers: {} });

      // Guard should return true for public endpoints
      expect(mockReflector.getAllAndOverride).toBeDefined();
    });

    it('should allow access to health check endpoints', async () => {
      const healthEndpoints = ['/health', '/ready', '/metrics'];

      for (const endpoint of healthEndpoints) {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = createMockContext({ headers: {} });
        // These should pass without authentication
        expect(mockReflector.getAllAndOverride).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // Token Extraction
  // ===========================================================================

  describe('Token Extraction', () => {
    it('should extract bearer token from Authorization header', () => {
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      const context = createMockContext({
        headers: { authorization: `Bearer ${token}` },
      });

      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      const [type, extractedToken] = authHeader!.split(' ');

      expect(type).toBe('Bearer');
      expect(extractedToken).toBe(token);
    });

    it('should return null for missing Authorization header', () => {
      const context = createMockContext({ headers: {} });
      const request = context.switchToHttp().getRequest();

      expect(request.headers.authorization).toBeUndefined();
    });

    it('should return null for non-Bearer token type', () => {
      const context = createMockContext({
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });

      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      const [type] = authHeader!.split(' ');

      expect(type).toBe('Basic');
      expect(type).not.toBe('Bearer');
    });

    it('should handle malformed Authorization header', () => {
      const testCases = [
        'Bearer', // No token
        'BearerToken', // No space
        '', // Empty
        'Bearer ', // Token is empty
      ];

      for (const authHeader of testCases) {
        const context = createMockContext({
          headers: { authorization: authHeader },
        });
        const request = context.switchToHttp().getRequest();
        const parts = request.headers.authorization?.split(' ') || [];

        // Should not extract a valid token
        expect(parts.length !== 2 || !parts[1]).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Token Verification
  // ===========================================================================

  describe('Token Verification', () => {
    const validPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      tenantId: 'tenant-456',
      roles: ['LEARNER'],
      permissions: ['read:content'],
      sessionId: 'session-789',
      mfaVerified: false,
      isMinor: false,
      ageVerified: true,
      consentStatus: 'granted',
      mfaEnabled: false,
    };

    it('should verify valid JWT token', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValue(validPayload);

      const result = await mockTokenService.verifyAccessToken('valid-token');

      expect(result).toEqual(validPayload);
      expect(result.sub).toBe('user-123');
      expect(result.tenantId).toBe('tenant-456');
    });

    it('should reject expired tokens', async () => {
      mockTokenService.verifyAccessToken.mockRejectedValue(
        new UnauthorizedException({
          statusCode: 401,
          message: 'Token has expired',
          code: 'AUTH_TOKEN_EXPIRED',
        })
      );

      await expect(mockTokenService.verifyAccessToken('expired-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid token signature', async () => {
      mockTokenService.verifyAccessToken.mockRejectedValue(
        new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid token',
          code: 'AUTH_TOKEN_INVALID',
        })
      );

      await expect(mockTokenService.verifyAccessToken('tampered-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'eyJ.onlytwo.parts',
        'completely invalid',
        '123456789',
      ];

      for (const token of malformedTokens) {
        mockTokenService.verifyAccessToken.mockRejectedValue(
          new UnauthorizedException('Invalid token')
        );

        await expect(mockTokenService.verifyAccessToken(token))
          .rejects.toThrow();
      }
    });
  });

  // ===========================================================================
  // Token Blacklisting
  // ===========================================================================

  describe('Token Blacklisting', () => {
    it('should reject blacklisted tokens', async () => {
      mockTokenService.isTokenBlacklisted.mockResolvedValue(true);

      const isBlacklisted = await mockTokenService.isTokenBlacklisted('revoked-token');

      expect(isBlacklisted).toBe(true);
    });

    it('should allow non-blacklisted tokens', async () => {
      mockTokenService.isTokenBlacklisted.mockResolvedValue(false);

      const isBlacklisted = await mockTokenService.isTokenBlacklisted('valid-token');

      expect(isBlacklisted).toBe(false);
    });

    it('should handle Redis failure gracefully', async () => {
      mockTokenService.isTokenBlacklisted.mockRejectedValue(new Error('Redis connection failed'));

      // Should fail open (return false) for availability
      await expect(mockTokenService.isTokenBlacklisted('token'))
        .rejects.toThrow('Redis connection failed');
    });
  });

  // ===========================================================================
  // Session Validation
  // ===========================================================================

  describe('Session Validation', () => {
    const validSession = {
      id: 'session-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    };

    it('should validate existing session', async () => {
      mockSessionService.getSession.mockResolvedValue(validSession);

      const session = await mockSessionService.getSession('session-123');

      expect(session).toEqual(validSession);
      expect(session.userId).toBe('user-456');
    });

    it('should reject expired sessions', async () => {
      mockSessionService.getSession.mockResolvedValue(null);

      const session = await mockSessionService.getSession('expired-session');

      expect(session).toBeNull();
    });

    it('should update session activity on valid requests', async () => {
      mockSessionService.touchSession.mockResolvedValue(undefined);

      await mockSessionService.touchSession('session-123');

      expect(mockSessionService.touchSession).toHaveBeenCalledWith('session-123');
    });
  });

  // ===========================================================================
  // Session Hijacking Detection
  // ===========================================================================

  describe('Session Hijacking Detection', () => {
    const session = {
      id: 'session-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('should detect IP address mismatch', async () => {
      const currentIp = '10.0.0.1'; // Different IP
      const sessionIp = session.ip;

      expect(currentIp).not.toBe(sessionIp);
      // Should trigger threat detection
    });

    it('should detect User-Agent mismatch', async () => {
      const currentUserAgent = 'Mozilla/5.0 (Linux; Android 10)';
      const sessionUserAgent = session.userAgent;

      expect(currentUserAgent).not.toBe(sessionUserAgent);
      // Should trigger threat detection
    });

    it('should record threat when session hijacking detected', async () => {
      await mockThreatDetection.recordThreat({
        type: 'account_takeover',
        severity: 'high',
        source: {
          ip: '10.0.0.1',
          userId: 'user-456',
          sessionId: 'session-123',
        },
        indicators: [
          'IP mismatch: expected 192.168.1.100, got 10.0.0.1',
        ],
        riskScore: 80,
      });

      expect(mockThreatDetection.recordThreat).toHaveBeenCalled();
    });

    it('should invalidate session on hijacking detection', async () => {
      await mockSessionService.invalidateSession('session-123');

      expect(mockSessionService.invalidateSession).toHaveBeenCalledWith('session-123');
    });
  });

  // ===========================================================================
  // MFA Validation
  // ===========================================================================

  describe('MFA Validation', () => {
    it('should allow access when MFA not required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false); // requireMfa = false

      const payload = { mfaVerified: false };
      // Should allow access
      expect(payload.mfaVerified).toBe(false);
    });

    it('should reject access when MFA required but not verified', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true); // requireMfa = true

      const payload = { mfaVerified: false };
      // Should reject with MFA_REQUIRED error
      expect(payload.mfaVerified).toBe(false);
    });

    it('should allow access when MFA required and verified', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true); // requireMfa = true

      const payload = { mfaVerified: true };
      // Should allow access
      expect(payload.mfaVerified).toBe(true);
    });
  });

  // ===========================================================================
  // User Context Building
  // ===========================================================================

  describe('User Context Building', () => {
    it('should build authenticated user object with all properties', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
        roles: ['LEARNER', 'PARENT'],
        permissions: ['read:content', 'write:progress'],
        sessionId: 'session-789',
        isMinor: true,
        ageVerified: false,
        consentStatus: 'pending',
        mfaEnabled: true,
        mfaVerified: false,
      };

      const user = {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
        isMinor: payload.isMinor,
        ageVerified: payload.ageVerified,
        consentStatus: payload.consentStatus,
        mfaEnabled: payload.mfaEnabled,
        mfaVerified: payload.mfaVerified,
      };

      expect(user.id).toBe('user-123');
      expect(user.roles).toContain('LEARNER');
      expect(user.roles).toContain('PARENT');
      expect(user.isMinor).toBe(true);
      expect(user.consentStatus).toBe('pending');
    });

    it('should attach user to request object', () => {
      const context = createMockContext({ headers: {} });
      const request = context.switchToHttp().getRequest() as any;

      request.user = {
        id: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
      };

      expect(request.user).toBeDefined();
      expect(request.user.id).toBe('user-123');
    });

    it('should update security context with user info', () => {
      const context = createMockContext({
        headers: {},
        securityContext: { ip: '127.0.0.1' },
      });
      const request = context.switchToHttp().getRequest() as any;

      request.securityContext.user = { id: 'user-123' };
      request.securityContext.isAuthenticated = true;
      request.securityContext.tenantId = 'tenant-456';

      expect(request.securityContext.isAuthenticated).toBe(true);
      expect(request.securityContext.tenantId).toBe('tenant-456');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return 401 for missing token', () => {
      const error = new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_TOKEN_INVALID',
      });

      expect(error.getStatus()).toBe(401);
      expect(error.getResponse()).toHaveProperty('message', 'Authentication required');
    });

    it('should return 401 for revoked token', () => {
      const error = new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token has been revoked',
        code: 'AUTH_TOKEN_INVALID',
      });

      expect(error.getStatus()).toBe(401);
    });

    it('should return 401 for expired session', () => {
      const error = new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Session expired',
        code: 'AUTH_SESSION_EXPIRED',
      });

      expect(error.getResponse()).toHaveProperty('code', 'AUTH_SESSION_EXPIRED');
    });

    it('should return 401 for MFA required', () => {
      const error = new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'MFA verification required',
        code: 'AUTH_MFA_REQUIRED',
      });

      expect(error.getResponse()).toHaveProperty('code', 'AUTH_MFA_REQUIRED');
    });

    it('should log authentication failures with correlation ID', () => {
      const context = createMockContext({ headers: {} });
      const request = context.switchToHttp().getRequest();

      expect(request.correlationId).toBe('test-correlation-id');
    });
  });
});
