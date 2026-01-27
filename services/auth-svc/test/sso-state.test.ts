/**
 * SSO State Management Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { generateSsoState, validateSsoState, SsoStateError } from '../src/lib/sso/state.js';

// Mock Redis client
vi.mock('../src/lib/redis/client.js', () => ({
  getRedisClient: vi.fn().mockReturnValue(null), // Use memory store for tests
  RedisKeys: {
    ssoState: (id: string) => `sso:state:${id}`,
  },
}));

// Set up test environment
process.env.NODE_ENV = 'development';
process.env.SSO_DEV_INSECURE_MODE = 'true';
process.env.SSO_STATE_ENCRYPTION_KEY = 'test-encryption-key-must-be-at-least-32-characters-long';

describe('SSO State Management', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateSsoState', () => {
    it('should generate a unique state token', async () => {
      const state1 = await generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://app.example.com/callback',
        clientType: 'web',
      });

      const state2 = await generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://app.example.com/callback',
        clientType: 'web',
      });

      expect(state1).not.toBe(state2);
      expect(typeof state1).toBe('string');
      expect(state1.length).toBeGreaterThan(0);
    });

    it('should store state with correct properties', async () => {
      const params = {
        tenantId: 'tenant-123',
        idpConfigId: 'idp-456',
        protocol: 'SAML' as const,
        redirectUri: 'https://app.example.com/dashboard',
        clientType: 'mobile' as const,
        loginHint: 'user@example.com',
      };

      const stateId = await generateSsoState(params);
      const validated = await validateSsoState(stateId);

      expect(validated.tenantId).toBe(params.tenantId);
      expect(validated.idpConfigId).toBe(params.idpConfigId);
      expect(validated.protocol).toBe(params.protocol);
      expect(validated.redirectUri).toBe(params.redirectUri);
      expect(validated.clientType).toBe(params.clientType);
      expect(validated.loginHint).toBe(params.loginHint);
      expect(validated.nonce).toBeDefined();
      expect(validated.initiatedAt).toBeDefined();
    });
  });

  describe('validateSsoState', () => {
    it('should validate and return state for valid token', async () => {
      const stateId = await generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://example.com',
        clientType: 'web',
      });

      const state = await validateSsoState(stateId);

      expect(state).toBeDefined();
      expect(state.tenantId).toBe('tenant-1');
    });

    it('should consume state (single-use)', async () => {
      const stateId = await generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://example.com',
        clientType: 'web',
      });

      // First validation should succeed
      await validateSsoState(stateId);

      // Second validation should fail (state consumed)
      await expect(validateSsoState(stateId)).rejects.toThrow(SsoStateError);
    });

    it('should throw for non-existent state', async () => {
      await expect(validateSsoState('non-existent-state')).rejects.toThrow(SsoStateError);
    });

    it('should throw for expired state', async () => {
      const stateId = await generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://example.com',
        clientType: 'web',
      });

      // Advance time past TTL (10 minutes)
      vi.advanceTimersByTime(11 * 60 * 1000);

      await expect(validateSsoState(stateId)).rejects.toThrow(SsoStateError);
    });
  });
});
