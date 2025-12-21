/**
 * Entitlements Service Tests
 *
 * Tests for entitlements and feature access control:
 * - Getting entitlements by tenant
 * - Feature access checks
 * - Usage limit validation
 * - Cache invalidation
 * - Plan-based entitlements
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { EntitlementsService } from '../src/services/entitlements.service.js';
import { prisma } from '../src/prisma.js';
import { Plan, PLAN_ENTITLEMENTS } from '../src/config/plans.config.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
    },
    billingAccount: {
      findFirst: vi.fn(),
    },
    moduleSubscription: {
      findMany: vi.fn(),
    },
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const mockBillingAccount = {
  id: 'ba-123',
  tenantId: 'tenant-123',
  providerCustomerId: 'cus_test123',
  displayName: 'Test Account',
};

const mockFreeSubscription = {
  id: 'sub-123',
  billingAccountId: 'ba-123',
  planId: 'plan-free',
  status: 'ACTIVE',
  plan: {
    id: 'plan-free',
    sku: 'FREE',
    name: 'Free Plan',
  },
  billingAccount: mockBillingAccount,
};

const mockProSubscription = {
  id: 'sub-456',
  billingAccountId: 'ba-456',
  planId: 'plan-pro',
  status: 'ACTIVE',
  plan: {
    id: 'plan-pro',
    sku: 'PRO',
    name: 'Pro Plan',
  },
  billingAccount: {
    id: 'ba-456',
    tenantId: 'tenant-456',
    providerCustomerId: 'cus_test456',
    displayName: 'Pro Account',
  },
};

const mockPremiumSubscription = {
  id: 'sub-789',
  billingAccountId: 'ba-789',
  planId: 'plan-premium',
  status: 'ACTIVE',
  plan: {
    id: 'plan-premium',
    sku: 'PREMIUM',
    name: 'Premium Plan',
  },
  billingAccount: {
    id: 'ba-789',
    tenantId: 'tenant-789',
    providerCustomerId: 'cus_test789',
    displayName: 'Premium Account',
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('EntitlementsService', () => {
  let service: EntitlementsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EntitlementsService();
    // Clear cache before each test
    service.invalidateCache('tenant-123');
    service.invalidateCache('tenant-456');
    service.invalidateCache('tenant-789');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getEntitlements
  // ──────────────────────────────────────────────────────────────────────────

  describe('getEntitlements', () => {
    it('should return entitlements for FREE plan', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const entitlements = await service.getEntitlements('tenant-123');

      expect(entitlements).toBeDefined();
      expect(entitlements?.plan).toBe('FREE');
      expect(entitlements?.features).toContain('basicContent');
      expect(entitlements?.features).not.toContain('aiTutor');
      expect(entitlements?.limits.learners).toBe(2);
    });

    it('should return entitlements for PRO plan', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockProSubscription.billingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockProSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const entitlements = await service.getEntitlements('tenant-456');

      expect(entitlements).toBeDefined();
      expect(entitlements?.plan).toBe('PRO');
      expect(entitlements?.features).toContain('aiTutor');
      expect(entitlements?.features).toContain('basicAnalytics');
      expect(entitlements?.limits.learners).toBe(5);
    });

    it('should return entitlements for PREMIUM plan', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockPremiumSubscription.billingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockPremiumSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const entitlements = await service.getEntitlements('tenant-789');

      expect(entitlements).toBeDefined();
      expect(entitlements?.plan).toBe('PREMIUM');
      expect(entitlements?.features).toContain('advancedAnalytics');
      expect(entitlements?.features).toContain('prioritySupport');
      expect(entitlements?.limits.learners).toBe(-1); // unlimited
    });

    it('should return null if no subscription found', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const entitlements = await service.getEntitlements('tenant-unknown');

      expect(entitlements).toBeNull();
    });

    it('should cache entitlements', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      // First call
      await service.getEntitlements('tenant-123');
      // Second call should use cache
      await service.getEntitlements('tenant-123');

      // Should only call DB once
      expect(prisma.billingAccount.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // checkFeatureAccess
  // ──────────────────────────────────────────────────────────────────────────

  describe('checkFeatureAccess', () => {
    it('should return true for features included in plan', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockProSubscription.billingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockProSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const hasAccess = await service.checkFeatureAccess('tenant-456', 'aiTutor');

      expect(hasAccess).toBe(true);
    });

    it('should return false for features not included in plan', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const hasAccess = await service.checkFeatureAccess('tenant-123', 'aiTutor');

      expect(hasAccess).toBe(false);
    });

    it('should return false for unknown tenant', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const hasAccess = await service.checkFeatureAccess('tenant-unknown', 'aiTutor');

      expect(hasAccess).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // checkLimitUsage
  // ──────────────────────────────────────────────────────────────────────────

  describe('checkLimitUsage', () => {
    it('should allow usage within limits', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const result = await service.checkLimitUsage('tenant-123', 'learners', 1);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should deny usage exceeding limits', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const result = await service.checkLimitUsage('tenant-123', 'learners', 5);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should always allow unlimited plans', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockPremiumSubscription.billingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockPremiumSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const result = await service.checkLimitUsage('tenant-789', 'learners', 100);

      expect(result.allowed).toBe(true);
      expect(result.isUnlimited).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // canAddLearner
  // ──────────────────────────────────────────────────────────────────────────

  describe('canAddLearner', () => {
    it('should return true when under limit', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const canAdd = await service.canAddLearner('tenant-123', 1);

      expect(canAdd).toBe(true);
    });

    it('should return false when at limit', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const canAdd = await service.canAddLearner('tenant-123', 2);

      expect(canAdd).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // canAddTeacher
  // ──────────────────────────────────────────────────────────────────────────

  describe('canAddTeacher', () => {
    it('should return true for plans with teachers', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockProSubscription.billingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockProSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const canAdd = await service.canAddTeacher('tenant-456', 0);

      expect(canAdd).toBe(true);
    });

    it('should return false for FREE plan', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      const canAdd = await service.canAddTeacher('tenant-123', 0);

      expect(canAdd).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // invalidateCache
  // ──────────────────────────────────────────────────────────────────────────

  describe('invalidateCache', () => {
    it('should clear cache for tenant', async () => {
      vi.mocked(prisma.billingAccount.findFirst).mockResolvedValue(mockBillingAccount as any);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockFreeSubscription as any);
      vi.mocked(prisma.moduleSubscription.findMany).mockResolvedValue([]);

      // First call - cache miss
      await service.getEntitlements('tenant-123');
      expect(prisma.billingAccount.findFirst).toHaveBeenCalledTimes(1);

      // Invalidate cache
      service.invalidateCache('tenant-123');

      // Second call - cache miss again
      await service.getEntitlements('tenant-123');
      expect(prisma.billingAccount.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
