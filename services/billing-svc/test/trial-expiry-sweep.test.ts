/**
 * Trial Expiry Sweep Job — Tests
 *
 * Validates the trial-expiry-sweep job that catches subscriptions whose
 * trialEndAt has elapsed but whose local status still says IN_TRIAL.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── Mocks (must be declared before importing the module under test) ──────────

vi.mock('../src/prisma.js', () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/services/stripe.service.js', () => ({
  stripeService: {
    getSubscription: vi.fn(),
  },
}));

vi.mock('../src/services/entitlements.service.js', () => ({
  entitlementsService: {
    invalidateCache: vi.fn(),
    handleSubscriptionEvent: vi.fn(),
  },
}));

vi.mock('../src/events/billing.publisher.js', () => ({
  billingEventPublisher: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  BillingEventType: {
    SUBSCRIPTION_TRIAL_ENDED: 'billing.subscription.trial_ended',
    ENTITLEMENTS_UPDATED: 'billing.entitlements.updated',
  },
}));

import { runTrialExpirySweep } from '../src/jobs/trial-expiry-sweep.js';
import { prisma } from '../src/prisma.js';
import { stripeService } from '../src/services/stripe.service.js';
import { entitlementsService } from '../src/services/entitlements.service.js';
import { billingEventPublisher, BillingEventType } from '../src/events/billing.publisher.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-001',
    status: 'IN_TRIAL',
    trialEndAt: new Date(Date.now() - 3_600_000), // 1 hour ago
    providerSubscriptionId: 'sub_stripe_001',
    billingAccountId: 'ba-001',
    billingAccount: { id: 'ba-001', tenantId: 'tenant-001' },
    plan: { sku: 'PRO', name: 'Pro Plan' },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('runTrialExpirySweep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return zeros when there are no stale trials', async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

    const result = await runTrialExpirySweep();

    expect(result).toEqual({
      inspected: 0,
      expired: 0,
      alreadyConverted: 0,
      errors: 0,
    });
  });

  it('should expire a subscription when Stripe confirms it is canceled', async () => {
    const staleSub = mockSubscription();
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([staleSub] as any);
    vi.mocked(stripeService.getSubscription).mockResolvedValue({
      id: 'sub_stripe_001',
      status: 'canceled',
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue(staleSub as any);

    const result = await runTrialExpirySweep();

    expect(result.inspected).toBe(1);
    expect(result.expired).toBe(1);
    expect(result.alreadyConverted).toBe(0);

    // Should update local DB to EXPIRED
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-001' },
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );

    // Should invalidate cache
    expect(entitlementsService.invalidateCache).toHaveBeenCalledWith('tenant-001');

    // Should publish SUBSCRIPTION_TRIAL_ENDED and ENTITLEMENTS_UPDATED
    expect(billingEventPublisher.publish).toHaveBeenCalledTimes(2);
    expect(billingEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: BillingEventType.SUBSCRIPTION_TRIAL_ENDED,
        tenantId: 'tenant-001',
      }),
    );
    expect(billingEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: BillingEventType.ENTITLEMENTS_UPDATED,
        plan: 'FREE',
      }),
    );
  });

  it('should skip a subscription when Stripe reports it as active (user converted)', async () => {
    const staleSub = mockSubscription();
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([staleSub] as any);
    vi.mocked(stripeService.getSubscription).mockResolvedValue({
      id: 'sub_stripe_001',
      status: 'active', // user added payment method
    } as any);

    const result = await runTrialExpirySweep();

    expect(result.inspected).toBe(1);
    expect(result.expired).toBe(0);
    expect(result.alreadyConverted).toBe(1);

    // Should NOT update local DB or publish events
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(billingEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('should skip a subscription when Stripe reports it as trialing (extended trial)', async () => {
    const staleSub = mockSubscription();
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([staleSub] as any);
    vi.mocked(stripeService.getSubscription).mockResolvedValue({
      id: 'sub_stripe_001',
      status: 'trialing', // trial extended in Stripe
    } as any);

    const result = await runTrialExpirySweep();

    expect(result.alreadyConverted).toBe(1);
    expect(result.expired).toBe(0);
  });

  it('should expire a subscription when there is no Stripe subscription ID', async () => {
    const staleSub = mockSubscription({ providerSubscriptionId: null });
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([staleSub] as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue(staleSub as any);

    const result = await runTrialExpirySweep();

    expect(result.expired).toBe(1);
    expect(stripeService.getSubscription).not.toHaveBeenCalled();
  });

  it('should expire a subscription when Stripe subscription is not found', async () => {
    const staleSub = mockSubscription();
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([staleSub] as any);
    vi.mocked(stripeService.getSubscription).mockResolvedValue(null);
    vi.mocked(prisma.subscription.update).mockResolvedValue(staleSub as any);

    const result = await runTrialExpirySweep();

    expect(result.expired).toBe(1);
  });

  it('should count errors and continue processing remaining subscriptions', async () => {
    const sub1 = mockSubscription({ id: 'sub-001' });
    const sub2 = mockSubscription({ id: 'sub-002', billingAccount: { id: 'ba-002', tenantId: 'tenant-002' } });

    vi.mocked(prisma.subscription.findMany).mockResolvedValue([sub1, sub2] as any);
    // First sub errors, second succeeds
    vi.mocked(stripeService.getSubscription)
      .mockRejectedValueOnce(new Error('Stripe API down'))
      .mockResolvedValueOnce({ id: 'sub_stripe_002', status: 'canceled' } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue(sub2 as any);

    const result = await runTrialExpirySweep();

    expect(result.inspected).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.expired).toBe(1);
  });

  it('should handle multiple stale trials in one sweep', async () => {
    const subs = [
      mockSubscription({ id: 'sub-001', providerSubscriptionId: 'sub_stripe_001' }),
      mockSubscription({
        id: 'sub-002',
        providerSubscriptionId: 'sub_stripe_002',
        billingAccount: { id: 'ba-002', tenantId: 'tenant-002' },
      }),
      mockSubscription({
        id: 'sub-003',
        providerSubscriptionId: 'sub_stripe_003',
        billingAccount: { id: 'ba-003', tenantId: 'tenant-003' },
      }),
    ];

    vi.mocked(prisma.subscription.findMany).mockResolvedValue(subs as any);
    // Sub 1: active in Stripe (converted)
    // Sub 2: canceled in Stripe (expire)
    // Sub 3: not found in Stripe (expire)
    vi.mocked(stripeService.getSubscription)
      .mockResolvedValueOnce({ id: 'sub_stripe_001', status: 'active' } as any)
      .mockResolvedValueOnce({ id: 'sub_stripe_002', status: 'canceled' } as any)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);

    const result = await runTrialExpirySweep();

    expect(result.inspected).toBe(3);
    expect(result.alreadyConverted).toBe(1);
    expect(result.expired).toBe(2);
    expect(result.errors).toBe(0);
  });
});
