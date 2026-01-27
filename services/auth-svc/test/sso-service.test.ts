/**
 * SSO Service Tests
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { SsoService, SsoError } from '../src/lib/sso/service.js';
import type { SsoUserInfo, IdpConfigRecord } from '../src/lib/sso/types.js';
import { prisma } from '../src/prisma.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    idpConfig: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ssoAttempt: {
      create: vi.fn(),
    },
  },
}));

// Mock state management
vi.mock('../src/lib/sso/state.js', () => ({
  generateSsoState: vi.fn().mockResolvedValue('mock-state-token'),
  validateSsoState: vi.fn().mockResolvedValue({
    tenantId: 'tenant-1',
    idpConfigId: 'idp-1',
    protocol: 'OIDC',
    redirectUri: 'https://app.example.com/callback',
    clientType: 'web',
    nonce: 'mock-nonce',
    initiatedAt: Date.now(),
  }),
  peekSsoState: vi.fn().mockResolvedValue({
    tenantId: 'tenant-1',
    idpConfigId: 'idp-1',
    protocol: 'OIDC',
    redirectUri: 'https://app.example.com/callback',
    clientType: 'web',
    nonce: 'mock-nonce',
    initiatedAt: Date.now(),
  }),
  SsoStateError: class SsoStateError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'SsoStateError';
    }
  },
}));

// Mock redirect validator
vi.mock('../src/lib/sso/redirect-validator.js', () => ({
  validateRedirectUri: vi.fn().mockResolvedValue({ valid: true }),
}));

// Mock PKCE
vi.mock('../src/lib/sso/pkce.js', () => ({
  generatePKCE: vi.fn().mockReturnValue({
    codeVerifier: 'mock-verifier',
    codeChallenge: 'mock-challenge',
    codeChallengeMethod: 'S256',
  }),
}));

describe('SsoService', () => {
  let service: SsoService;
  const mockPrisma = prisma as unknown as {
    tenant: { findUnique: Mock };
    idpConfig: { findFirst: Mock; findUnique: Mock; findMany: Mock };
    user: { findFirst: Mock; create: Mock; update: Mock };
    ssoAttempt: { create: Mock };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new SsoService({
      baseUrl: 'https://auth.aivo.education',
      spEntityId: 'https://aivo.education/sp',
    });
  });

  describe('initiateSso', () => {
    const mockTenant = {
      id: 'tenant-1',
      slug: 'test-tenant',
      name: 'Test Tenant',
      ssoEnabled: true,
    };

    const mockOidcConfig = {
      id: 'idp-1',
      tenantId: 'tenant-1',
      protocol: 'OIDC',
      name: 'Test OIDC IdP',
      issuer: 'https://idp.example.com',
      enabled: true,
      clientId: 'client-123',
      clientSecretRef: 'secret-ref',
      jwksUri: 'https://idp.example.com/.well-known/jwks.json',
      authorizationEndpoint: 'https://idp.example.com/authorize',
      tokenEndpoint: 'https://idp.example.com/token',
      userinfoEndpoint: 'https://idp.example.com/userinfo',
      scopes: ['openid', 'profile', 'email'],
      emailClaim: 'email',
      nameClaim: 'name',
      firstNameClaim: 'given_name',
      lastNameClaim: 'family_name',
      roleClaim: 'groups',
      externalIdClaim: 'sub',
      autoProvisionUsers: true,
      defaultRole: 'TEACHER',
      allowedUserTypes: ['TEACHER', 'DISTRICT_ADMIN'],
      roleMapping: {},
      loginHintTemplate: null,
    };

    const mockSamlConfig = {
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
      roleMapping: {},
      loginHintTemplate: null,
    };

    it('should throw error when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateSso({
          tenantSlug: 'nonexistent-tenant',
          redirectUri: 'https://app.example.com/callback',
          clientType: 'web',
        })
      ).rejects.toThrow(SsoError);
    });

    it('should throw error when SSO is not enabled for tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        ssoEnabled: false,
      });

      await expect(
        service.initiateSso({
          tenantSlug: 'test-tenant',
          redirectUri: 'https://app.example.com/callback',
          clientType: 'web',
        })
      ).rejects.toThrow(SsoError);
    });

    it('should throw error when IdP config not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.idpConfig.findFirst.mockResolvedValue(null);
      mockPrisma.idpConfig.findMany.mockResolvedValue([]);

      await expect(
        service.initiateSso({
          tenantSlug: 'test-tenant',
          redirectUri: 'https://app.example.com/callback',
          clientType: 'web',
        })
      ).rejects.toThrow(SsoError);
    });

    it('should throw error when IdP is disabled', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.idpConfig.findFirst.mockResolvedValue({
        ...mockOidcConfig,
        enabled: false,
      });
      mockPrisma.idpConfig.findMany.mockResolvedValue([{
        ...mockOidcConfig,
        enabled: false,
      }]);

      await expect(
        service.initiateSso({
          tenantSlug: 'test-tenant',
          redirectUri: 'https://app.example.com/callback',
          clientType: 'web',
        })
      ).rejects.toThrow(SsoError);
    });

    it('should return redirect URL for OIDC IdP', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.idpConfig.findFirst.mockResolvedValue(mockOidcConfig);
      mockPrisma.idpConfig.findMany.mockResolvedValue([mockOidcConfig]);

      const result = await service.initiateSso({
        tenantSlug: 'test-tenant',
        redirectUri: 'https://app.example.com/callback',
        clientType: 'web',
      });

      expect(result.redirectUrl).toBeDefined();
      expect(result.state).toBe('mock-state-token');
    });

    it('should return redirect URL for SAML IdP', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.idpConfig.findFirst.mockResolvedValue(mockSamlConfig);
      mockPrisma.idpConfig.findMany.mockResolvedValue([mockSamlConfig]);

      const result = await service.initiateSso({
        tenantSlug: 'test-tenant',
        protocol: 'SAML',
        redirectUri: 'https://app.example.com/callback',
        clientType: 'web',
      });

      expect(result.redirectUrl).toBeDefined();
      expect(result.state).toBe('mock-state-token');
    });

    it('should pass login hint to the SSO flow', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.idpConfig.findFirst.mockResolvedValue(mockOidcConfig);
      mockPrisma.idpConfig.findMany.mockResolvedValue([mockOidcConfig]);

      const result = await service.initiateSso({
        tenantSlug: 'test-tenant',
        loginHint: 'user@example.com',
        redirectUri: 'https://app.example.com/callback',
        clientType: 'web',
      });

      expect(result.redirectUrl).toBeDefined();
    });
  });

  describe('getSpMetadata', () => {
    it('should return SAML SP metadata', () => {
      const metadata = service.getSpMetadata('test-tenant');

      expect(metadata).toContain('EntityDescriptor');
      expect(metadata).toContain('SPSSODescriptor');
    });
  });
});
