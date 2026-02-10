import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParentSkuValues,
  ParentSkuSchema,
  buildSkuCatalog,
  getSkuCatalog,
  resetSkuCatalog,
  getSkuConfig,
  isBaseSku,
  isAddonSku,
  isTrialEligible,
  getAddonSkus,
  getBaseSku,
  calculateTotalPrice,
  validateSkuSelection,
  getIncludedFeatures,
} from '../src/skuConfig';
import {
  SubscriptionStatusSchema,
  BillingPeriodSchema,
  CheckoutSessionRequestSchema,
  UpdateModulesRequestSchema,
} from '../src/types';

describe('billing-common', () => {
  beforeEach(() => {
    resetSkuCatalog();
  });

  describe('SKU Config', () => {
    it('ParentSkuValues contains expected SKUs', () => {
      expect(ParentSkuValues).toContain('BASE');
      expect(ParentSkuValues).toContain('ADDON_SEL');
      expect(ParentSkuValues).toContain('ADDON_SPEECH');
      expect(ParentSkuValues).toContain('ADDON_SCIENCE');
    });

    it('ParentSkuSchema validates valid SKUs', () => {
      expect(ParentSkuSchema.parse('BASE')).toBe('BASE');
      expect(ParentSkuSchema.parse('ADDON_SEL')).toBe('ADDON_SEL');
    });

    it('ParentSkuSchema rejects invalid SKUs', () => {
      expect(() => ParentSkuSchema.parse('INVALID')).toThrow();
    });

    it('buildSkuCatalog returns a complete catalog', () => {
      const catalog = buildSkuCatalog();
      expect(catalog.defaultCurrency).toBe('usd');
      expect(catalog.version).toBeDefined();
      expect(Object.keys(catalog.skus)).toHaveLength(ParentSkuValues.length);
    });

    it('getSkuConfig returns config for each SKU', () => {
      for (const sku of ParentSkuValues) {
        const config = getSkuConfig(sku);
        expect(config.sku).toBe(sku);
        expect(config.monthlyPriceCents).toBeGreaterThan(0);
        expect(config.yearlyPriceCents).toBeGreaterThan(0);
        expect(config.displayName).toBeDefined();
        expect(config.features).toBeInstanceOf(Array);
      }
    });

    it('isBaseSku correctly identifies BASE', () => {
      expect(isBaseSku('BASE')).toBe(true);
      expect(isBaseSku('ADDON_SEL')).toBe(false);
      expect(isBaseSku('ADDON_SPEECH')).toBe(false);
    });

    it('isAddonSku correctly identifies add-ons', () => {
      expect(isAddonSku('ADDON_SEL')).toBe(true);
      expect(isAddonSku('ADDON_SPEECH')).toBe(true);
      expect(isAddonSku('BASE')).toBe(false);
    });

    it('isTrialEligible returns correct values', () => {
      expect(isTrialEligible('BASE')).toBe(false);
      expect(isTrialEligible('ADDON_SEL')).toBe(true);
    });

    it('getAddonSkus returns only add-on SKUs', () => {
      const addons = getAddonSkus();
      expect(addons).not.toContain('BASE');
      expect(addons.length).toBeGreaterThan(0);
      for (const sku of addons) {
        expect(isAddonSku(sku)).toBe(true);
      }
    });

    it('getBaseSku returns BASE', () => {
      expect(getBaseSku()).toBe('BASE');
    });
  });

  describe('calculateTotalPrice', () => {
    it('calculates monthly total for single SKU', () => {
      const result = calculateTotalPrice(['BASE'], 'monthly');
      expect(result.totalCents).toBeGreaterThan(0);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].sku).toBe('BASE');
    });

    it('calculates total for multiple SKUs', () => {
      const result = calculateTotalPrice(['BASE', 'ADDON_SEL'], 'monthly');
      const baseOnly = calculateTotalPrice(['BASE'], 'monthly');
      expect(result.totalCents).toBeGreaterThan(baseOnly.totalCents);
    });

    it('yearly prices are different from monthly', () => {
      const monthly = calculateTotalPrice(['BASE'], 'monthly');
      const yearly = calculateTotalPrice(['BASE'], 'yearly');
      expect(yearly.totalCents).not.toBe(monthly.totalCents);
    });
  });

  describe('validateSkuSelection', () => {
    it('valid: BASE only', () => {
      expect(validateSkuSelection(['BASE'])).toEqual({ valid: true });
    });

    it('valid: BASE with add-ons', () => {
      expect(validateSkuSelection(['BASE', 'ADDON_SEL'])).toEqual({ valid: true });
    });

    it('invalid: empty array', () => {
      const result = validateSkuSelection([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one');
    });

    it('invalid: add-on without BASE', () => {
      const result = validateSkuSelection(['ADDON_SEL']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BASE');
    });

    it('invalid: duplicate SKUs', () => {
      const result = validateSkuSelection(['BASE', 'BASE']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Duplicate');
    });
  });

  describe('getIncludedFeatures', () => {
    it('returns features for BASE', () => {
      const features = getIncludedFeatures(['BASE']);
      expect(features).toContain('ELA');
      expect(features).toContain('MATH');
    });

    it('returns combined features for multiple SKUs', () => {
      const baseFeatures = getIncludedFeatures(['BASE']);
      const combinedFeatures = getIncludedFeatures(['BASE', 'ADDON_SEL']);
      expect(combinedFeatures.length).toBeGreaterThan(baseFeatures.length);
    });

    it('deduplicates features', () => {
      const features = getIncludedFeatures(['BASE', 'ADDON_SEL']);
      const uniqueFeatures = [...new Set(features)];
      expect(features.length).toBe(uniqueFeatures.length);
    });
  });

  describe('Zod Schemas', () => {
    it('SubscriptionStatusSchema validates valid statuses', () => {
      expect(SubscriptionStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
      expect(SubscriptionStatusSchema.parse('TRIALING')).toBe('TRIALING');
      expect(SubscriptionStatusSchema.parse('CANCELED')).toBe('CANCELED');
    });

    it('SubscriptionStatusSchema rejects invalid values', () => {
      expect(() => SubscriptionStatusSchema.parse('INVALID')).toThrow();
    });

    it('BillingPeriodSchema validates monthly and yearly', () => {
      expect(BillingPeriodSchema.parse('monthly')).toBe('monthly');
      expect(BillingPeriodSchema.parse('yearly')).toBe('yearly');
      expect(() => BillingPeriodSchema.parse('weekly')).toThrow();
    });

    it('CheckoutSessionRequestSchema validates correct request', () => {
      const result = CheckoutSessionRequestSchema.safeParse({
        learnerIds: ['550e8400-e29b-41d4-a716-446655440000'],
        selectedSkus: ['BASE'],
        billingPeriod: 'monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });
      expect(result.success).toBe(true);
    });

    it('CheckoutSessionRequestSchema rejects empty learnerIds', () => {
      const result = CheckoutSessionRequestSchema.safeParse({
        learnerIds: [],
        selectedSkus: ['BASE'],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });
      expect(result.success).toBe(false);
    });

    it('UpdateModulesRequestSchema validates correct request', () => {
      const result = UpdateModulesRequestSchema.safeParse({
        items: [
          {
            learnerId: '550e8400-e29b-41d4-a716-446655440000',
            sku: 'ADDON_SEL',
            action: 'ADD',
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Catalog singleton', () => {
    it('getSkuCatalog returns same instance', () => {
      const catalog1 = getSkuCatalog();
      const catalog2 = getSkuCatalog();
      expect(catalog1).toBe(catalog2);
    });

    it('resetSkuCatalog clears the singleton', () => {
      const catalog1 = getSkuCatalog();
      resetSkuCatalog();
      const catalog2 = getSkuCatalog();
      // Different object after reset (but same structure)
      expect(catalog2).not.toBe(catalog1);
    });
  });
});
