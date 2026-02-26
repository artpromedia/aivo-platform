import { describe, it, expect } from 'vitest';

import {
  PLAN_CONFIGS,
  getPlanPrice,
  formatPrice,
  calculateAnnualSavings,
} from '../src/lib/types';
import type { PlanType, BillingInterval, PlanConfig, SubscriptionStatus } from '../src/lib/types';

// ── PLAN_CONFIGS ─────────────────────────────────────────────────

describe('PLAN_CONFIGS', () => {
  it('has all three plan types', () => {
    expect(Object.keys(PLAN_CONFIGS)).toEqual(['free', 'pro', 'premium']);
  });

  it('free plan has zero pricing', () => {
    expect(PLAN_CONFIGS.free.monthlyPrice).toBe(0);
    expect(PLAN_CONFIGS.free.annualPrice).toBe(0);
    expect(PLAN_CONFIGS.free.trialDays).toBe(0);
  });

  it('pro plan has expected defaults', () => {
    expect(PLAN_CONFIGS.pro.monthlyPrice).toBe(29.99);
    expect(PLAN_CONFIGS.pro.annualPrice).toBe(24.99);
    expect(PLAN_CONFIGS.pro.popular).toBe(true);
  });

  it('premium plan has expected defaults', () => {
    expect(PLAN_CONFIGS.premium.monthlyPrice).toBe(49.99);
    expect(PLAN_CONFIGS.premium.annualPrice).toBe(41.99);
  });

  it('each plan config has required fields', () => {
    for (const [key, config] of Object.entries(PLAN_CONFIGS)) {
      expect(config.id).toBe(key);
      expect(config.name).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.features.length).toBeGreaterThan(0);
      expect(typeof config.trialDays).toBe('number');
    }
  });
});

// ── getPlanPrice ─────────────────────────────────────────────────

describe('getPlanPrice', () => {
  it('returns monthly price for monthly interval', () => {
    expect(getPlanPrice('pro', 'monthly')).toBe(29.99);
  });

  it('returns annual price for annual interval', () => {
    expect(getPlanPrice('pro', 'annual')).toBe(24.99);
  });

  it('returns 0 for free plan regardless of interval', () => {
    expect(getPlanPrice('free', 'monthly')).toBe(0);
    expect(getPlanPrice('free', 'annual')).toBe(0);
  });
});

// ── formatPrice ──────────────────────────────────────────────────

describe('formatPrice', () => {
  it('returns "Free" for zero price', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('formats dollar amount with two decimals', () => {
    expect(formatPrice(29.99)).toBe('$29.99');
  });

  it('formats whole dollar with two decimals', () => {
    expect(formatPrice(100)).toBe('$100.00');
  });
});

// ── calculateAnnualSavings ───────────────────────────────────────

describe('calculateAnnualSavings', () => {
  it('returns 0 savings for free plan', () => {
    expect(calculateAnnualSavings('free')).toBe(0);
  });

  it('calculates pro savings', () => {
    // (29.99 - 24.99) * 12 = 60.00
    const savings = calculateAnnualSavings('pro');
    expect(savings).toBeCloseTo(60, 0);
  });

  it('calculates premium savings', () => {
    // (49.99 - 41.99) * 12 = 96.00
    const savings = calculateAnnualSavings('premium');
    expect(savings).toBeCloseTo(96, 0);
  });
});

// ── Type shape tests ─────────────────────────────────────────────

describe('SubscriptionStatus type', () => {
  it('supports all status values', () => {
    const statuses: SubscriptionStatus[] = [
      'active', 'trialing', 'past_due', 'canceled',
      'incomplete', 'incomplete_expired', 'unpaid',
    ];
    expect(statuses).toHaveLength(7);
  });
});

describe('PlanType type', () => {
  it('supports three plan levels', () => {
    const plans: PlanType[] = ['free', 'pro', 'premium'];
    expect(plans).toHaveLength(3);
  });
});

describe('BillingInterval type', () => {
  it('supports monthly and annual', () => {
    const intervals: BillingInterval[] = ['monthly', 'annual'];
    expect(intervals).toHaveLength(2);
  });
});
