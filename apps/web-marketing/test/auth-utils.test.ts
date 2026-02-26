import { describe, it, expect } from 'vitest';

import {
  buildRegistrationUrl,
  buildLoginUrl,
  buildCheckoutUrl,
  buildDashboardUrl,
  getPlanInfo,
  parseRegistrationParams,
} from '../src/lib/auth/utils';

// ── buildRegistrationUrl ─────────────────────────────────────────

describe('buildRegistrationUrl', () => {
  it('returns base URL without context', () => {
    const url = buildRegistrationUrl();
    expect(url).toContain('/register');
  });

  it('appends plan param', () => {
    const url = buildRegistrationUrl({ plan: 'pro' });
    expect(url).toContain('plan=pro');
  });

  it('appends billing interval param', () => {
    const url = buildRegistrationUrl({ billingInterval: 'annual' });
    expect(url).toContain('interval=annual');
  });

  it('appends referral code', () => {
    const url = buildRegistrationUrl({ referralCode: 'REF123' });
    expect(url).toContain('ref=REF123');
  });

  it('combines multiple params', () => {
    const url = buildRegistrationUrl({
      plan: 'premium',
      billingInterval: 'monthly',
      source: 'landing',
    });
    expect(url).toContain('plan=premium');
    expect(url).toContain('interval=monthly');
    expect(url).toContain('source=landing');
  });
});

// ── buildLoginUrl ────────────────────────────────────────────────

describe('buildLoginUrl', () => {
  it('returns base URL without returnUrl', () => {
    const url = buildLoginUrl();
    expect(url).toContain('/join');
    expect(url).not.toContain('returnUrl');
  });

  it('appends returnUrl param', () => {
    const url = buildLoginUrl('/dashboard');
    expect(url).toContain('returnUrl=%2Fdashboard');
  });
});

// ── buildCheckoutUrl ─────────────────────────────────────────────

describe('buildCheckoutUrl', () => {
  it('includes plan and interval', () => {
    const url = buildCheckoutUrl('pro', 'monthly');
    expect(url).toContain('plan=pro');
    expect(url).toContain('interval=monthly');
    expect(url).toContain('source=marketing');
  });

  it('includes email when provided', () => {
    const url = buildCheckoutUrl('premium', 'annual', 'user@test.com');
    expect(url).toContain('email=user%40test.com');
  });
});

// ── buildDashboardUrl ────────────────────────────────────────────

describe('buildDashboardUrl', () => {
  it('returns dashboard root by default', () => {
    const url = buildDashboardUrl();
    expect(url).toMatch(/\/dashboard$/);
  });

  it('appends subpath', () => {
    const url = buildDashboardUrl('/settings');
    expect(url).toContain('/dashboard/settings');
  });
});

// ── getPlanInfo ──────────────────────────────────────────────────

describe('getPlanInfo', () => {
  it('returns free plan info', () => {
    const info = getPlanInfo('free', 'monthly');
    expect(info.name).toBe('Free');
    expect(info.price).toBe(0);
    expect(info.priceDisplay).toBe('Free');
  });

  it('returns pro monthly price', () => {
    const info = getPlanInfo('pro', 'monthly');
    expect(info.name).toBe('Pro');
    expect(info.price).toBe(29.99);
    expect(info.priceDisplay).toBe('$29.99/mo');
  });

  it('returns pro annual price', () => {
    const info = getPlanInfo('pro', 'annual');
    expect(info.price).toBe(24.99);
    expect(info.priceDisplay).toBe('$24.99/mo');
  });

  it('returns premium plan features', () => {
    const info = getPlanInfo('premium', 'monthly');
    expect(info.features).toContain('Everything in Pro');
  });

  it('includes interval in result', () => {
    const info = getPlanInfo('pro', 'annual');
    expect(info.interval).toBe('annual');
  });
});

// ── parseRegistrationParams ──────────────────────────────────────

describe('parseRegistrationParams', () => {
  it('parses all params from URL', () => {
    const params = new URLSearchParams('plan=pro&interval=annual&ref=REF1&source=blog&returnUrl=/dash');
    const ctx = parseRegistrationParams(params);
    expect(ctx.plan).toBe('pro');
    expect(ctx.billingInterval).toBe('annual');
    expect(ctx.referralCode).toBe('REF1');
    expect(ctx.source).toBe('blog');
    expect(ctx.returnUrl).toBe('/dash');
  });

  it('defaults source to marketing when absent', () => {
    const params = new URLSearchParams();
    const ctx = parseRegistrationParams(params);
    expect(ctx.source).toBe('marketing');
  });

  it('returns undefined for missing optional params', () => {
    const params = new URLSearchParams();
    const ctx = parseRegistrationParams(params);
    expect(ctx.plan).toBeUndefined();
    expect(ctx.billingInterval).toBeUndefined();
    expect(ctx.referralCode).toBeUndefined();
  });
});
