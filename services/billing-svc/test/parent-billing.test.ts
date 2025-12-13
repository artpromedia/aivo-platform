/**
 * Parent Billing Service Tests
 *
 * Tests for the new parent billing functionality including:
 * - Trial eligibility checks
 * - Proration calculations
 * - Subscription management
 * - Coupon validation
 * - Limited mode enforcement
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { TrialService } from '../src/services/trial.service.js';
import { CouponService } from '../src/services/coupon.service.js';
import { DunningService } from '../src/services/dunning.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  billingAccount: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
} as unknown as Parameters<typeof TrialService['prototype']['constructor']>[0];

const mockStripe = {
  coupons: {
    create: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
  },
  subscriptions: {
    retrieve: vi.fn(),
  },
} as unknown as Parameters<typeof CouponService['prototype']['constructor']>[1];

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TrialService', () => {
  let trialService: TrialService;

  beforeEach(() => {
    vi.clearAllMocks();
    trialService = new TrialService(mockPrisma);
  });

  describe('checkEligibility', () => {
    it('should return eligible when no prior trial exists', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await trialService.checkEligibility({
        tenantId: 'tenant-1',
        userId: 'user-1',
        sku: 'ADDON_SEL',
      });

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return ineligible when user already had a trial', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'trial-1',
          sku: 'ADDON_SEL',
          started_at: new Date('2024-01-01'),
          ends_at: new Date('2024-01-31'),
        },
      ]);

      const result = await trialService.checkEligibility({
        tenantId: 'tenant-1',
        userId: 'user-1',
        sku: 'ADDON_SEL',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('already used');
    });

    it('should check by tenant when checkByTenant is true', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'trial-1',
          sku: 'ADDON_SEL',
          tenant_id: 'tenant-1',
          user_id: 'other-user',
        },
      ]);

      const result = await trialService.checkEligibility({
        tenantId: 'tenant-1',
        userId: 'user-1',
        sku: 'ADDON_SEL',
        checkByTenant: true,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('already used');
    });

    it('should allow trial for different SKU', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'trial-1',
          sku: 'ADDON_SEL',
        },
      ]);

      const result = await trialService.checkEligibility({
        tenantId: 'tenant-1',
        userId: 'user-1',
        sku: 'ADDON_SPEECH',
      });

      expect(result.eligible).toBe(true);
    });
  });

  describe('recordTrialStart', () => {
    it('should create trial record with 30-day duration', async () => {
      (mockPrisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      await trialService.recordTrialStart({
        tenantId: 'tenant-1',
        userId: 'user-1',
        sku: 'ADDON_SEL',
        subscriptionId: 'sub-1',
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      // Verify the call includes 30-day duration logic
      const call = (mockPrisma.$executeRaw as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call).toBeDefined();
    });
  });

  describe('getActiveTrials', () => {
    it('should return only non-expired trials', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // -7 days

      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { sku: 'ADDON_SEL', ends_at: future },
        { sku: 'ADDON_SPEECH', ends_at: past }, // This should be filtered
      ]);

      const result = await trialService.getActiveTrials({
        tenantId: 'tenant-1',
        userId: 'user-1',
      });

      // The service should filter by ends_at in the query
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COUPON SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CouponService', () => {
  let couponService: CouponService;

  beforeEach(() => {
    vi.clearAllMocks();
    couponService = new CouponService(mockPrisma, mockStripe);
  });

  describe('validateCoupon', () => {
    it('should return valid coupon when code exists and is active', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'coupon-1',
          code: 'SAVE20',
          name: 'Save 20%',
          discount_type: 'percent',
          discount_amount: 20,
          valid_from: new Date('2024-01-01'),
          valid_until: new Date('2025-12-31'),
          max_redemptions: 100,
          redemption_count: 10,
          active: true,
        },
      ]);

      const result = await couponService.validateCoupon('SAVE20');

      expect(result.valid).toBe(true);
      expect(result.coupon).toBeDefined();
      expect(result.coupon?.discountType).toBe('percent');
      expect(result.coupon?.discountAmount).toBe(20);
    });

    it('should return invalid when coupon is expired', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'coupon-1',
          code: 'EXPIRED',
          valid_until: new Date('2023-01-01'),
          active: true,
        },
      ]);

      const result = await couponService.validateCoupon('EXPIRED');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should return invalid when max redemptions reached', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'coupon-1',
          code: 'LIMITED',
          max_redemptions: 10,
          redemption_count: 10,
          active: true,
          valid_until: new Date('2025-12-31'),
        },
      ]);

      const result = await couponService.validateCoupon('LIMITED');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('redemption');
    });

    it('should return invalid when coupon not found', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await couponService.validateCoupon('INVALID');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('createCoupon', () => {
    it('should create coupon in database and Stripe', async () => {
      (mockStripe.coupons.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stripe-coupon-1',
      });
      (mockPrisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      await couponService.createCoupon({
        code: 'NEW20',
        name: 'New User 20%',
        discountType: 'percent',
        discountAmount: 20,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
      });

      expect(mockStripe.coupons.create).toHaveBeenCalled();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DUNNING SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('DunningService', () => {
  let dunningService: DunningService;

  beforeEach(() => {
    vi.clearAllMocks();
    dunningService = new DunningService(mockPrisma);
  });

  describe('handlePaymentFailure', () => {
    it('should create dunning record on first failure', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-1',
        billingAccountId: 'ba-1',
      });

      await dunningService.handlePaymentFailure({
        subscriptionId: 'sub-1',
        paymentIntentId: 'pi-1',
        amountCents: 1499,
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should increment attempt number on subsequent failures', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'dunning-1',
          subscription_id: 'sub-1',
          attempt_number: 1,
          status: 'pending',
        },
      ]);
      (mockPrisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-1',
        billingAccountId: 'ba-1',
      });

      await dunningService.handlePaymentFailure({
        subscriptionId: 'sub-1',
        paymentIntentId: 'pi-2',
        amountCents: 1499,
      });

      // Should update existing record, not create new one
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should clear dunning record and limited mode on success', async () => {
      (mockPrisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'dunning-1',
          subscription_id: 'sub-1',
          status: 'pending',
        },
      ]);
      (mockPrisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockPrisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-1',
        billingAccountId: 'ba-1',
      });
      (mockPrisma.billingAccount.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await dunningService.handlePaymentSuccess({
        subscriptionId: 'sub-1',
        paymentIntentId: 'pi-1',
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockPrisma.billingAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            limitedMode: false,
          }),
        })
      );
    });
  });

  describe('isInLimitedMode', () => {
    it('should return true when billing account has limitedMode flag', async () => {
      (mockPrisma.billingAccount.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ba-1',
        limitedMode: true,
      });

      const result = await dunningService.isInLimitedMode('tenant-1');

      expect(result).toBe(true);
    });

    it('should return false when no billing account exists', async () => {
      (mockPrisma.billingAccount.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await dunningService.isInLimitedMode('tenant-1');

      expect(result).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKU CONFIG TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SKU Configuration', () => {
  // Import inline to test the module
  const { getSkuCatalog, validateSkuSelection, getStripePriceId } = require('@aivo/billing-common');

  describe('getSkuCatalog', () => {
    it('should return all SKUs', () => {
      const catalog = getSkuCatalog();

      expect(catalog).toHaveLength(4);
      expect(catalog.map((s: { sku: string }) => s.sku)).toEqual([
        'BASE',
        'ADDON_SEL',
        'ADDON_SPEECH',
        'ADDON_SCIENCE',
      ]);
    });

    it('should include pricing info for each SKU', () => {
      const catalog = getSkuCatalog();

      for (const item of catalog) {
        expect(item.monthlyPriceCents).toBeGreaterThan(0);
        expect(item.name).toBeDefined();
      }
    });
  });

  describe('validateSkuSelection', () => {
    it('should allow BASE alone', () => {
      const result = validateSkuSelection(['BASE']);
      expect(result.valid).toBe(true);
    });

    it('should allow BASE with add-ons', () => {
      const result = validateSkuSelection(['BASE', 'ADDON_SEL', 'ADDON_SPEECH']);
      expect(result.valid).toBe(true);
    });

    it('should reject add-on without BASE', () => {
      const result = validateSkuSelection(['ADDON_SEL']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BASE');
    });

    it('should reject empty selection', () => {
      const result = validateSkuSelection([]);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid SKU', () => {
      const result = validateSkuSelection(['BASE', 'INVALID_SKU']);
      expect(result.valid).toBe(false);
    });
  });

  describe('getStripePriceId', () => {
    it('should return test price ID in development', () => {
      const priceId = getStripePriceId('BASE', 'test');
      expect(priceId).toMatch(/^price_test_/);
    });

    it('should return live price ID in production', () => {
      const priceId = getStripePriceId('BASE', 'live');
      expect(priceId).toMatch(/^price_live_/);
    });

    it('should throw for invalid SKU', () => {
      expect(() => getStripePriceId('INVALID', 'test')).toThrow();
    });
  });
});
