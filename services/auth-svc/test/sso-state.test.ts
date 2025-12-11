/**
 * SSO State Management Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { generateSsoState, validateSsoState, SsoStateError } from '../src/lib/sso/state.js';

describe('SSO State Management', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('generateSsoState', () => {
    it('should generate a unique state token', () => {
      const state1 = generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://app.example.com/callback',
        clientType: 'web',
      });

      const state2 = generateSsoState({
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

    it('should store state with correct properties', () => {
      const params = {
        tenantId: 'tenant-123',
        idpConfigId: 'idp-456',
        protocol: 'SAML' as const,
        redirectUri: 'https://app.example.com/dashboard',
        clientType: 'mobile' as const,
        loginHint: 'user@example.com',
      };

      const stateId = generateSsoState(params);
      const validated = validateSsoState(stateId);

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
    it('should validate and return state for valid token', () => {
      const stateId = generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://example.com',
        clientType: 'web',
      });

      const state = validateSsoState(stateId);

      expect(state).toBeDefined();
      expect(state.tenantId).toBe('tenant-1');
    });

    it('should consume state (single-use)', () => {
      const stateId = generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://example.com',
        clientType: 'web',
      });

      // First validation should succeed
      validateSsoState(stateId);

      // Second validation should fail (state consumed)
      expect(() => validateSsoState(stateId)).toThrow(SsoStateError);
    });

    it('should throw for non-existent state', () => {
      expect(() => validateSsoState('non-existent-state')).toThrow(SsoStateError);
      expect(() => validateSsoState('non-existent-state')).toThrow('SSO state not found');
    });

    it('should throw for expired state', () => {
      const stateId = generateSsoState({
        tenantId: 'tenant-1',
        idpConfigId: 'idp-1',
        protocol: 'OIDC',
        redirectUri: 'https://example.com',
        clientType: 'web',
      });

      // Advance time past TTL (10 minutes)
      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(() => validateSsoState(stateId)).toThrow(SsoStateError);
      expect(() => validateSsoState(stateId)).toThrow('expired');
    });
  });
});
