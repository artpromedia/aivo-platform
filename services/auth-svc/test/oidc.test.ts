/**
 * OIDC Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OidcService, OidcError } from '../src/lib/sso/oidc.js';
import type { OidcIdpConfig } from '../src/lib/sso/types.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OidcService', () => {
  let service: OidcService;
  let mockConfig: OidcIdpConfig;

  beforeEach(() => {
    service = new OidcService();
    mockFetch.mockReset();

    mockConfig = {
      id: 'idp-1',
      tenantId: 'tenant-1',
      protocol: 'OIDC',
      name: 'Test IdP',
      issuer: 'https://idp.example.com',
      enabled: true,
      clientId: 'client-123',
      clientSecretRef: 'env:TEST_SECRET',
      authorizationEndpoint: 'https://idp.example.com/authorize',
      tokenEndpoint: 'https://idp.example.com/token',
      userinfoEndpoint: 'https://idp.example.com/userinfo',
      jwksUri: 'https://idp.example.com/.well-known/jwks.json',
      scopes: ['openid', 'profile', 'email'],
      emailClaim: 'email',
      nameClaim: 'name',
      firstNameClaim: 'given_name',
      lastNameClaim: 'family_name',
      roleClaim: 'role',
      externalIdClaim: 'sub',
      roleMapping: {
        Teacher: 'TEACHER',
        Admin: 'DISTRICT_ADMIN',
      },
      autoProvisionUsers: true,
      defaultRole: 'TEACHER',
      loginHintTemplate: null,
      allowedUserTypes: ['TEACHER', 'DISTRICT_ADMIN'],
    };
  });

  describe('generateAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = service.generateAuthorizationUrl(mockConfig, {
        redirectUri: 'https://app.example.com/callback',
        state: 'test-state',
        nonce: 'test-nonce',
      });

      const parsed = new URL(url);

      expect(parsed.origin).toBe('https://idp.example.com');
      expect(parsed.pathname).toBe('/authorize');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('client_id')).toBe('client-123');
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback');
      expect(parsed.searchParams.get('scope')).toBe('openid profile email');
      expect(parsed.searchParams.get('state')).toBe('test-state');
      expect(parsed.searchParams.get('nonce')).toBe('test-nonce');
    });

    it('should include login_hint when provided', () => {
      const url = service.generateAuthorizationUrl(mockConfig, {
        redirectUri: 'https://app.example.com/callback',
        state: 'test-state',
        nonce: 'test-nonce',
        loginHint: 'user@example.com',
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get('login_hint')).toBe('user@example.com');
    });
  });

  describe('exchangeCode', () => {
    it('should exchange code for tokens', async () => {
      process.env.TEST_SECRET = 'test-secret';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token-123',
          token_type: 'Bearer',
          id_token: 'id-token-123',
          expires_in: 3600,
        }),
      });

      const tokens = await service.exchangeCode(mockConfig, {
        code: 'auth-code-123',
        redirectUri: 'https://app.example.com/callback',
      });

      expect(tokens.access_token).toBe('access-token-123');
      expect(tokens.id_token).toBe('id-token-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://idp.example.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should throw on token exchange failure', async () => {
      process.env.TEST_SECRET = 'test-secret';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'invalid_grant',
      });

      await expect(
        service.exchangeCode(mockConfig, {
          code: 'invalid-code',
          redirectUri: 'https://app.example.com/callback',
        })
      ).rejects.toThrow(OidcError);
    });

    it('should throw when id_token is missing', async () => {
      process.env.TEST_SECRET = 'test-secret';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token-123',
          token_type: 'Bearer',
          // id_token missing
        }),
      });

      await expect(
        service.exchangeCode(mockConfig, {
          code: 'auth-code',
          redirectUri: 'https://app.example.com/callback',
        })
      ).rejects.toThrow('No ID token');
    });
  });

  describe('discover', () => {
    it('should discover OIDC configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://idp.example.com',
          authorization_endpoint: 'https://idp.example.com/authorize',
          token_endpoint: 'https://idp.example.com/token',
          userinfo_endpoint: 'https://idp.example.com/userinfo',
          jwks_uri: 'https://idp.example.com/.well-known/jwks.json',
          scopes_supported: ['openid', 'profile', 'email'],
        }),
      });

      const discovery = await OidcService.discover('https://idp.example.com');

      expect(discovery).not.toBeNull();
      expect(discovery?.issuer).toBe('https://idp.example.com');
      expect(discovery?.authorization_endpoint).toBe('https://idp.example.com/authorize');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://idp.example.com/.well-known/openid-configuration',
        expect.any(Object)
      );
    });

    it('should return null for invalid issuer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const discovery = await OidcService.discover('https://invalid.example.com');

      expect(discovery).toBeNull();
    });

    it('should handle trailing slash in issuer URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issuer: 'https://idp.example.com' }),
      });

      await OidcService.discover('https://idp.example.com/');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://idp.example.com/.well-known/openid-configuration',
        expect.any(Object)
      );
    });
  });
});
