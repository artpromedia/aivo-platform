/**
 * SSO Service Tests
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { SsoService } from '../src/lib/sso/service.js';
import type { SsoUserInfo, IdpConfigRecord } from '../src/lib/sso/types.js';

// Mock Prisma client
const mockPrismaClient = {
  idpConfig: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  idpRoleMapping: {
    findMany: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ssoAuditLog: {
    create: vi.fn(),
  },
};

// Mock SAML service
const mockSamlService = {
  generateAuthnRequest: vi.fn(),
  validateResponse: vi.fn(),
  generateSpMetadata: vi.fn(),
};

// Mock OIDC service
const mockOidcService = {
  generateAuthorizationUrl: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  getUserInfo: vi.fn(),
};

describe('SsoService', () => {
  let service: SsoService;

  beforeEach(() => {
    vi.clearAllMocks();

    // @ts-expect-error - Mocking partial implementation
    service = new SsoService({
      prisma: mockPrismaClient as any,
      saml: mockSamlService as any,
      oidc: mockOidcService as any,
      baseUrl: 'https://auth.aivo.education',
      stateSecret: 'test-secret-key-at-least-32-characters',
    });
  });

  describe('initiateSSO', () => {
    const mockOidcConfig: IdpConfigRecord = {
      id: 'idp-1',
      tenantId: 'tenant-1',
      protocol: 'OIDC',
      name: 'Test OIDC IdP',
      issuer: 'https://idp.example.com',
      enabled: true,
      clientId: 'client-123',
      clientSecret: 'secret-456',
      jwksUri: 'https://idp.example.com/.well-known/jwks.json',
      authorizationEndpoint: 'https://idp.example.com/authorize',
      tokenEndpoint: 'https://idp.example.com/token',
      userInfoEndpoint: 'https://idp.example.com/userinfo',
      emailClaim: 'email',
      nameClaim: 'name',
      firstNameClaim: 'given_name',
      lastNameClaim: 'family_name',
      roleClaim: 'groups',
      externalIdClaim: 'sub',
      autoProvisionUsers: true,
      defaultRole: 'TEACHER',
      allowedUserTypes: ['TEACHER', 'DISTRICT_ADMIN'],
      ssoUrl: null,
      sloUrl: null,
      x509Certificate: null,
      metadataXml: null,
      roleMapping: {},
      loginHintTemplate: null,
    };

    const mockSamlConfig: IdpConfigRecord = {
      id: 'idp-2',
      tenantId: 'tenant-1',
      protocol: 'SAML',
      name: 'Test SAML IdP',
      issuer: 'https://idp.example.com/saml',
      enabled: true,
      ssoUrl: 'https://idp.example.com/saml/sso',
      sloUrl: null,
      x509Certificate: 'MIID...',
      metadataXml: null,
      emailClaim: 'email',
      nameClaim: 'name',
      firstNameClaim: 'firstName',
      lastNameClaim: 'lastName',
      roleClaim: 'role',
      externalIdClaim: 'nameID',
      autoProvisionUsers: true,
      defaultRole: 'TEACHER',
      allowedUserTypes: ['TEACHER'],
      clientId: null,
      clientSecret: null,
      jwksUri: null,
      authorizationEndpoint: null,
      tokenEndpoint: null,
      userInfoEndpoint: null,
      roleMapping: {},
      loginHintTemplate: null,
    };

    it('should return error when IdP config not found', async () => {
      mockPrismaClient.idpConfig.findFirst.mockResolvedValue(null);

      const result = await service.initiateSSO('nonexistent-tenant', {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('IDP_NOT_FOUND');
      }
    });

    it('should return error when IdP is disabled', async () => {
      mockPrismaClient.idpConfig.findFirst.mockResolvedValue({
        ...mockOidcConfig,
        enabled: false,
      });

      const result = await service.initiateSSO('test-tenant', {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('IDP_DISABLED');
      }
    });

    it('should generate OIDC authorization URL for OIDC IdP', async () => {
      mockPrismaClient.idpConfig.findFirst.mockResolvedValue(mockOidcConfig);
      mockOidcService.generateAuthorizationUrl.mockReturnValue({
        url: 'https://idp.example.com/authorize?client_id=client-123&state=xyz',
        state: 'xyz',
        codeVerifier: 'verifier-123',
      });

      const result = await service.initiateSSO('test-tenant', {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.redirectUrl).toContain('https://idp.example.com/authorize');
      }
      expect(mockOidcService.generateAuthorizationUrl).toHaveBeenCalled();
    });

    it('should generate SAML AuthnRequest for SAML IdP', async () => {
      mockPrismaClient.idpConfig.findFirst.mockResolvedValue(mockSamlConfig);
      mockSamlService.generateAuthnRequest.mockResolvedValue({
        url: 'https://idp.example.com/saml/sso?SAMLRequest=...',
        requestId: '_abc123',
      });

      const result = await service.initiateSSO('test-tenant', {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.redirectUrl).toContain('https://idp.example.com/saml');
      }
      expect(mockSamlService.generateAuthnRequest).toHaveBeenCalled();
    });

    it('should include login hint when email is provided', async () => {
      mockPrismaClient.idpConfig.findFirst.mockResolvedValue(mockOidcConfig);
      mockOidcService.generateAuthorizationUrl.mockReturnValue({
        url: 'https://idp.example.com/authorize?login_hint=user@example.com',
        state: 'xyz',
        codeVerifier: 'verifier-123',
      });

      const result = await service.initiateSSO('test-tenant', {
        loginHint: 'user@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockOidcService.generateAuthorizationUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          loginHint: 'user@example.com',
        })
      );
    });
  });

  describe('mapRoles', () => {
    const mockUserInfo: SsoUserInfo = {
      email: 'teacher@school.edu',
      externalId: 'ext-123',
      name: 'Test Teacher',
      firstName: 'Test',
      lastName: 'Teacher',
      roles: ['Teachers', 'Staff'],
    };

    it('should map roles based on IdP role mapping', async () => {
      mockPrismaClient.idpRoleMapping.findMany.mockResolvedValue([
        { idpRole: 'Teachers', aivoRole: 'TEACHER' },
        { idpRole: 'Administrators', aivoRole: 'DISTRICT_ADMIN' },
      ]);

      const roles = await service.mapRoles('idp-1', mockUserInfo.roles || []);

      expect(roles).toContain('TEACHER');
      expect(roles).not.toContain('DISTRICT_ADMIN');
    });

    it('should return default role when no mappings match', async () => {
      mockPrismaClient.idpRoleMapping.findMany.mockResolvedValue([
        { idpRole: 'Administrators', aivoRole: 'DISTRICT_ADMIN' },
      ]);

      const roles = await service.mapRoles('idp-1', ['UnknownRole'], 'TEACHER');

      expect(roles).toContain('TEACHER');
    });

    it('should deduplicate roles', async () => {
      mockPrismaClient.idpRoleMapping.findMany.mockResolvedValue([
        { idpRole: 'Teachers', aivoRole: 'TEACHER' },
        { idpRole: 'Staff', aivoRole: 'TEACHER' },
      ]);

      const roles = await service.mapRoles('idp-1', ['Teachers', 'Staff']);

      expect(roles).toHaveLength(1);
      expect(roles).toContain('TEACHER');
    });
  });

  describe('findOrCreateUser', () => {
    const mockUserInfo: SsoUserInfo = {
      email: 'teacher@school.edu',
      externalId: 'ext-123',
      name: 'Test Teacher',
      firstName: 'Test',
      lastName: 'Teacher',
      roles: ['Teachers'],
    };

    it('should return existing user when found by email', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'teacher@school.edu',
        tenantId: 'tenant-1',
        externalId: null,
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(existingUser);
      mockPrismaClient.user.update.mockResolvedValue({
        ...existingUser,
        externalId: 'ext-123',
      });

      const result = await service.findOrCreateUser(
        'tenant-1',
        'idp-1',
        mockUserInfo,
        true,
        'TEACHER'
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
      // Should update external ID
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });

    it('should return existing user when found by external ID', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'teacher@school.edu',
        tenantId: 'tenant-1',
        externalId: 'ext-123',
      };

      // First call (by email) returns null
      mockPrismaClient.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      const result = await service.findOrCreateUser(
        'tenant-1',
        'idp-1',
        mockUserInfo,
        true,
        'TEACHER'
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
    });

    it('should create new user when auto-provisioning is enabled', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.idpRoleMapping.findMany.mockResolvedValue([
        { idpRole: 'Teachers', aivoRole: 'TEACHER' },
      ]);

      const newUser = {
        id: 'user-new',
        email: 'teacher@school.edu',
        tenantId: 'tenant-1',
        externalId: 'ext-123',
        firstName: 'Test',
        lastName: 'Teacher',
        role: 'TEACHER',
      };
      mockPrismaClient.user.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateUser(
        'tenant-1',
        'idp-1',
        mockUserInfo,
        true,
        'TEACHER'
      );

      expect(result).not.toBeNull();
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
    });

    it('should return null when user not found and auto-provisioning is disabled', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const result = await service.findOrCreateUser(
        'tenant-1',
        'idp-1',
        mockUserInfo,
        false,
        'TEACHER'
      );

      expect(result).toBeNull();
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      await service.createAuditLog({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        action: 'SSO_LOGIN',
        userId: 'user-1',
        success: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPrismaClient.ssoAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          idpConfigId: 'idp-1',
          action: 'SSO_LOGIN',
          userId: 'user-1',
          success: true,
        }),
      });
    });

    it('should include error details on failure', async () => {
      await service.createAuditLog({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        action: 'SSO_LOGIN',
        userId: null,
        success: false,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Token signature verification failed',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaClient.ssoAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorCode: 'INVALID_TOKEN',
          errorMessage: 'Token signature verification failed',
        }),
      });
    });
  });
});
