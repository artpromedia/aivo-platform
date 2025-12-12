/**
 * Token Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

import {
  generateToolLaunchToken,
  validateToolLaunchToken,
  generatePseudonymousLearnerId,
  initializeSigningKey,
} from '../src/services/token.service.js';
import { ToolScope } from '../src/types/index.js';

// Mock config
vi.mock('../src/config.js', () => ({
  config: {
    toolTokenSigningKey: 'test-secret-key-for-testing-only-32chars!',
    tenantPseudonymSecret: 'tenant-pseudonym-secret-for-testing-32c!',
    toolTokenTtlMinutes: 15,
  },
}));

describe('Token Service', () => {
  beforeAll(async () => {
    // Initialize signing key before tests
    await initializeSigningKey();
  });

  describe('generatePseudonymousLearnerId', () => {
    it('should generate a prefixed pseudonymous ID', () => {
      const result = generatePseudonymousLearnerId('learner-123', 'tenant-456');
      expect(result).toMatch(/^pln_[A-Za-z0-9_-]{22}$/);
    });

    it('should be deterministic - same inputs produce same output', () => {
      const result1 = generatePseudonymousLearnerId('learner-123', 'tenant-456');
      const result2 = generatePseudonymousLearnerId('learner-123', 'tenant-456');
      expect(result1).toBe(result2);
    });

    it('should produce different IDs for different learners', () => {
      const result1 = generatePseudonymousLearnerId('learner-123', 'tenant-456');
      const result2 = generatePseudonymousLearnerId('learner-456', 'tenant-456');
      expect(result1).not.toBe(result2);
    });

    it('should produce different IDs for different tenants', () => {
      const result1 = generatePseudonymousLearnerId('learner-123', 'tenant-456');
      const result2 = generatePseudonymousLearnerId('learner-123', 'tenant-789');
      expect(result1).not.toBe(result2);
    });
  });

  describe('generateToolLaunchToken', () => {
    it('should generate a valid JWT token', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'test-vendor',
        scopes: [ToolScope.LEARNER_PROFILE_MIN, ToolScope.SESSION_EVENTS_WRITE],
      };

      const result = await generateToolLaunchToken(params);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3); // JWT format
      expect(result.jti).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include pseudonymous learner ID when learner provided', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'test-vendor',
        learnerId: 'learner-uuid-789',
        scopes: [ToolScope.LEARNER_PROFILE_MIN],
      };

      const result = await generateToolLaunchToken(params);

      expect(result.pseudonymousLearnerId).toBeDefined();
      expect(result.pseudonymousLearnerId).toMatch(/^pln_/);
    });

    it('should not include learner ID when not provided', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'test-vendor',
        scopes: [],
      };

      const result = await generateToolLaunchToken(params);

      expect(result.pseudonymousLearnerId).toBeUndefined();
    });

    it('should respect custom expiry', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'test-vendor',
        scopes: [],
        expirySeconds: 30 * 60, // 30 minutes
      };

      const beforeTime = Math.floor(Date.now() / 1000) + 30 * 60;
      const result = await generateToolLaunchToken(params);
      const afterTime = Math.floor(Date.now() / 1000) + 30 * 60;

      expect(result.expiresAt).toBeGreaterThanOrEqual(beforeTime - 1);
      expect(result.expiresAt).toBeLessThanOrEqual(afterTime + 1);
    });
  });

  describe('validateToolLaunchToken', () => {
    it('should validate a valid token', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'test-vendor',
        scopes: [ToolScope.LEARNER_PROFILE_MIN],
      };

      const { token } = await generateToolLaunchToken(params);
      const result = await validateToolLaunchToken(token, 'test-vendor');

      expect(result.valid).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.claims?.sub).toBe(params.sessionId);
      expect(result.claims?.aivo_tenant_id).toBe(params.tenantId);
      expect(result.claims?.aivo_scopes).toEqual(params.scopes);
    });

    it('should reject invalid token', async () => {
      const result = await validateToolLaunchToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject token with wrong audience', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'correct-vendor',
        scopes: [],
      };

      const { token } = await generateToolLaunchToken(params);
      const result = await validateToolLaunchToken(token, 'wrong-vendor');

      expect(result.valid).toBe(false);
    });

    it('should accept token without audience validation when not specified', async () => {
      const params = {
        sessionId: 'session-uuid-123',
        tenantId: 'tenant-uuid-456',
        marketplaceItemId: 'item-uuid',
        marketplaceItemVersionId: 'version-uuid',
        installationId: 'installation-uuid',
        audience: 'any-vendor',
        scopes: [],
      };

      const { token } = await generateToolLaunchToken(params);
      const result = await validateToolLaunchToken(token); // No audience check

      expect(result.valid).toBe(true);
    });
  });
});
