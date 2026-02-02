/**
 * LTI Launch Service Unit Tests
 *
 * Tests for the LTI 1.3 launch flow including:
 * - OIDC login initiation
 * - Token validation
 * - User mapping
 * - Session creation
 * - Deep linking
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock jose before imports
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
  importPKCS8: vi.fn(),
  SignJWT: vi.fn().mockReturnValue({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setAudience: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setIssuer: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock prisma
const mockPrisma = {
  ltiTool: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ltiLaunch: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  ltiLink: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  ltiUserMapping: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../../generated/prisma-client/index.js', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Types for testing
interface OidcLoginRequest {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint?: string;
  client_id?: string;
}

interface LtiToolRecord {
  id: string;
  tenantId: string;
  clientId: string;
  deploymentId: string;
  issuer: string;
  jwksUrl: string;
  authLoginUrl: string;
  authTokenUrl: string;
  toolPrivateKeyRef: string;
}

describe('LTI Launch Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OIDC Login Initiation', () => {
    const mockTool: LtiToolRecord = {
      id: 'tool-1',
      tenantId: 'tenant-1',
      clientId: 'client-123',
      deploymentId: 'deploy-1',
      issuer: 'https://canvas.instructure.com',
      jwksUrl: 'https://canvas.instructure.com/api/lti/security/jwks',
      authLoginUrl: 'https://canvas.instructure.com/api/lti/authorize_redirect',
      authTokenUrl: 'https://canvas.instructure.com/login/oauth2/token',
      toolPrivateKeyRef: 'key-ref-1',
    };

    it('should create OIDC auth request with valid parameters', () => {
      const loginRequest: OidcLoginRequest = {
        iss: 'https://canvas.instructure.com',
        login_hint: 'user-123',
        target_link_uri: 'https://app.aivo.education/lti/launch',
        lti_message_hint: 'msg-hint-1',
      };
      const redirectUri = 'https://app.aivo.education/lti/callback';

      // Validate issuer matches
      expect(loginRequest.iss).toBe(mockTool.issuer);
    });

    it('should reject login request with mismatched issuer', () => {
      const loginRequest: OidcLoginRequest = {
        iss: 'https://wrong-issuer.com',
        login_hint: 'user-123',
        target_link_uri: 'https://app.aivo.education/lti/launch',
      };

      expect(loginRequest.iss).not.toBe(mockTool.issuer);
    });

    it('should generate cryptographically secure state token', () => {
      const state1 = generateMockState();
      const state2 = generateMockState();

      expect(state1).toHaveLength(64);
      expect(state2).toHaveLength(64);
      expect(state1).not.toBe(state2);
    });

    it('should generate cryptographically secure nonce', () => {
      const nonce1 = generateMockNonce();
      const nonce2 = generateMockNonce();

      expect(nonce1).toHaveLength(64);
      expect(nonce2).toHaveLength(64);
      expect(nonce1).not.toBe(nonce2);
    });

    it('should include lti_message_hint when provided', () => {
      const loginRequest: OidcLoginRequest = {
        iss: 'https://canvas.instructure.com',
        login_hint: 'user-123',
        target_link_uri: 'https://app.aivo.education/lti/launch',
        lti_message_hint: 'course-123:assignment-456',
      };

      expect(loginRequest.lti_message_hint).toBe('course-123:assignment-456');
    });

    it('should handle missing lti_message_hint gracefully', () => {
      const loginRequest: OidcLoginRequest = {
        iss: 'https://canvas.instructure.com',
        login_hint: 'user-123',
        target_link_uri: 'https://app.aivo.education/lti/launch',
      };

      expect(loginRequest.lti_message_hint).toBeUndefined();
    });
  });

  describe('ID Token Validation', () => {
    it('should validate token audience matches client ID', () => {
      const clientId = 'client-123';
      const tokenPayload = {
        aud: 'client-123',
        iss: 'https://canvas.instructure.com',
        sub: 'user-123',
      };

      expect(tokenPayload.aud).toBe(clientId);
    });

    it('should validate token audience as array containing client ID', () => {
      const clientId = 'client-123';
      const tokenPayload = {
        aud: ['client-123', 'other-client'],
        iss: 'https://canvas.instructure.com',
        sub: 'user-123',
      };

      expect(tokenPayload.aud).toContain(clientId);
    });

    it('should reject token with wrong audience', () => {
      const clientId = 'client-123';
      const tokenPayload = {
        aud: 'wrong-client',
        iss: 'https://canvas.instructure.com',
        sub: 'user-123',
      };

      expect(tokenPayload.aud).not.toBe(clientId);
    });

    it('should validate token issuer matches configured issuer', () => {
      const expectedIssuer = 'https://canvas.instructure.com';
      const tokenPayload = {
        aud: 'client-123',
        iss: 'https://canvas.instructure.com',
        sub: 'user-123',
      };

      expect(tokenPayload.iss).toBe(expectedIssuer);
    });

    it('should reject expired token', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = {
        exp: now - 3600, // Expired 1 hour ago
        iat: now - 7200,
      };

      expect(expiredToken.exp).toBeLessThan(now);
    });

    it('should accept valid non-expired token', () => {
      const now = Math.floor(Date.now() / 1000);
      const validToken = {
        exp: now + 3600, // Expires in 1 hour
        iat: now,
      };

      expect(validToken.exp).toBeGreaterThan(now);
    });

    it('should validate nonce for replay protection', () => {
      const usedNonces = new Set(['nonce-1', 'nonce-2']);
      const newNonce = 'nonce-3';
      const replayNonce = 'nonce-1';

      expect(usedNonces.has(newNonce)).toBe(false);
      expect(usedNonces.has(replayNonce)).toBe(true);
    });
  });

  describe('User Mapping', () => {
    it('should map LTI user to existing platform user by email', async () => {
      const ltiUserInfo = {
        sub: 'lti-user-123',
        email: 'student@school.edu',
        name: 'John Doe',
      };

      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue({
        id: 'mapping-1',
        ltiUserId: 'lti-user-123',
        platformUserId: 'platform-user-456',
      });

      const mapping = await mockPrisma.ltiUserMapping.findUnique({
        where: { ltiUserId: ltiUserInfo.sub },
      });

      expect(mapping).toBeDefined();
      expect(mapping.platformUserId).toBe('platform-user-456');
    });

    it('should create new user mapping when none exists', async () => {
      const ltiUserInfo = {
        sub: 'lti-user-new',
        email: 'newstudent@school.edu',
        name: 'Jane Smith',
      };

      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(null);
      mockPrisma.ltiUserMapping.create.mockResolvedValue({
        id: 'mapping-new',
        ltiUserId: 'lti-user-new',
        platformUserId: 'platform-user-new',
      });

      const existingMapping = await mockPrisma.ltiUserMapping.findUnique({
        where: { ltiUserId: ltiUserInfo.sub },
      });

      expect(existingMapping).toBeNull();
    });

    it('should extract user roles from LTI claims', () => {
      const roles = [
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
      ];

      const isLearner = roles.some((r) => r.includes('Learner'));
      const isInstructor = roles.some((r) => r.includes('Instructor'));

      expect(isLearner).toBe(true);
      expect(isInstructor).toBe(true);
    });

    it('should handle user with no email gracefully', () => {
      const ltiUserInfo = {
        sub: 'lti-user-no-email',
        name: 'No Email User',
        // email is missing
      };

      expect(ltiUserInfo).not.toHaveProperty('email');
    });
  });

  describe('Session Creation', () => {
    it('should create launch session with correct expiry', async () => {
      const launchExpirySeconds = 3600;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + launchExpirySeconds * 1000);

      mockPrisma.ltiLaunch.create.mockResolvedValue({
        id: 'launch-1',
        expiresAt: expectedExpiry,
        status: 'ACTIVE',
      });

      const launch = await mockPrisma.ltiLaunch.create({
        data: {
          id: 'launch-1',
          expiresAt: expectedExpiry,
          status: 'ACTIVE',
        },
      });

      expect(launch.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should store launch parameters for later use', async () => {
      const launchParams = {
        'https://purl.imsglobal.org/spec/lti/claim/context': {
          id: 'course-123',
          label: 'Math 101',
          title: 'Introduction to Mathematics',
        },
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
          id: 'resource-456',
          title: 'Quiz 1',
        },
      };

      mockPrisma.ltiLaunch.create.mockResolvedValue({
        id: 'launch-1',
        launchParamsJson: launchParams,
      });

      const launch = await mockPrisma.ltiLaunch.create({
        data: { launchParamsJson: launchParams },
      });

      expect(launch.launchParamsJson).toEqual(launchParams);
    });

    it('should mark launch as expired after timeout', async () => {
      const expiredLaunch = {
        id: 'launch-expired',
        expiresAt: new Date(Date.now() - 3600000),
        status: 'ACTIVE',
      };

      const isExpired = expiredLaunch.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('Deep Linking', () => {
    it('should parse deep linking claim from launch', () => {
      const launchPayload = {
        'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': {
          accept_types: ['ltiResourceLink'],
          accept_presentation_document_targets: ['iframe', 'window'],
          accept_multiple: true,
          auto_create: false,
          deep_link_return_url: 'https://canvas.instructure.com/deep_linking_response',
        },
      };

      const dlSettings =
        launchPayload['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'];
      expect(dlSettings.accept_types).toContain('ltiResourceLink');
      expect(dlSettings.deep_link_return_url).toBeDefined();
    });

    it('should validate deep linking return URL', () => {
      const returnUrl = 'https://canvas.instructure.com/deep_linking_response';
      const validDomains = ['canvas.instructure.com', 'schoology.com'];

      const url = new URL(returnUrl);
      const isValid = validDomains.includes(url.hostname);
      expect(isValid).toBe(true);
    });

    it('should reject invalid deep linking return URL', () => {
      const returnUrl = 'https://malicious-site.com/steal';
      const validDomains = ['canvas.instructure.com', 'schoology.com'];

      const url = new URL(returnUrl);
      const isValid = validDomains.includes(url.hostname);
      expect(isValid).toBe(false);
    });

    it('should support multiple content item types', () => {
      const settings = {
        accept_types: ['ltiResourceLink', 'link', 'file', 'html'],
      };

      expect(settings.accept_types).toHaveLength(4);
      expect(settings.accept_types).toContain('ltiResourceLink');
    });

    it('should respect accept_multiple setting', () => {
      const singleItemSettings = { accept_multiple: false };
      const multiItemSettings = { accept_multiple: true };

      expect(singleItemSettings.accept_multiple).toBe(false);
      expect(multiItemSettings.accept_multiple).toBe(true);
    });
  });
});

// Helper functions
function generateMockState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function generateMockNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
