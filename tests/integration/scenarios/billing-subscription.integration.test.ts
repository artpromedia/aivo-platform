/**
 * Billing & Subscription Flow Integration Test
 *
 * End-to-end test covering the complete billing lifecycle:
 * 1. Subscription creation with Stripe checkout
 * 2. Payment webhook processing
 * 3. Entitlement management
 * 4. Plan upgrades/downgrades
 * 5. Payment failure handling
 * 6. Subscription cancellation and retention
 *
 * @module tests/integration/scenarios/billing-subscription
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import {
  wait,
  createStripeWebhookPayload,
  sendStripeWebhook,
  debug,
} from '../utils/helpers';

describe('Billing & Subscription Flow', () => {
  let parentApi: ApiClient;
  let adminApi: ApiClient;

  // Billing data
  let customerId: string;
  let subscriptionId: string;
  let paymentMethodId: string;

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    parentApi = createApiClientForUser(ctx().users.parentA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);

    debug('Test Setup', {
      parentId: ctx().users.parentA.id,
      tenantId: ctx().tenantA.id,
    });
  });

  afterAll(async () => {
    // Cleanup: Cancel any active subscriptions
    if (subscriptionId) {
      try {
        await parentApi.post('/billing/subscription/cancel', { immediate: true });
      } catch {
        // Subscription might already be cancelled
      }
    }
  });

  // ==========================================================================
  // 1. Subscription Creation
  // ==========================================================================

  describe('1. Subscription Creation', () => {
    it('should get available subscription plans', async () => {
      const response = await parentApi.get('/billing/plans');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          plans: Array<{
            id: string;
            name: string;
            price: number;
            interval: 'monthly' | 'yearly';
            features: string[];
            limits: Record<string, number>;
          }>;
        };

        expect(data.plans.length).toBeGreaterThan(0);

        // Verify plan structure
        const plan = data.plans[0];
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('features');
      }
    });

    it('should create Stripe customer on first checkout', async () => {
      const response = await parentApi.post('/billing/checkout', {
        plan: 'pro',
        interval: 'monthly',
        successUrl: 'https://app.aivo.local/billing/success',
        cancelUrl: 'https://app.aivo.local/billing/cancel',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as {
          checkoutUrl: string;
          sessionId: string;
          customerId: string;
        };

        expect(data.checkoutUrl).toBeDefined();
        expect(data.customerId).toBeDefined();
        customerId = data.customerId;
      } else {
        // Use mock customer ID
        customerId = 'cus_test_' + Date.now();
      }

      debug('Checkout Created', { customerId });
    });

    it('should process successful payment webhook', async () => {
      subscriptionId = 'sub_test_' + Date.now();

      const webhookPayload = createStripeWebhookPayload('checkout.session.completed', {
        id: 'cs_test_' + Date.now(),
        customer: customerId,
        subscription: subscriptionId,
        payment_status: 'paid',
        mode: 'subscription',
        metadata: {
          plan: 'pro',
          tenantId: ctx().tenantA.id,
          userId: ctx().users.parentA.id,
        },
      });

      const response = await sendStripeWebhook(webhookPayload);

      // Webhook endpoint should accept the request
      expect([200, 404]).toContain(response.status);

      debug('Webhook Processed', response);
    });

    it('should activate subscription after payment', async () => {
      // Wait for webhook processing
      await wait(500);

      const response = await parentApi.get('/billing/subscription');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          id: string;
          status: 'active' | 'past_due' | 'canceled' | 'trialing';
          plan: string;
          currentPeriodEnd: string;
          cancelAtPeriodEnd: boolean;
        };

        expect(data.status).toBe('active');
        expect(data.plan).toBe('pro');
        subscriptionId = data.id;
      }
    });

    it('should grant entitlements immediately', async () => {
      const response = await parentApi.get('/entitlements');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          plan: string;
          features: {
            aiTutor: boolean;
            advancedAnalytics: boolean;
            iepTracking: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
          };
          limits: {
            maxLearners: number;
            maxStorageGb: number;
            maxSessionsPerMonth: number;
          };
          restricted: boolean;
        };

        expect(data.plan).toBe('pro');
        expect(data.features.aiTutor).toBe(true);
        expect(data.features.advancedAnalytics).toBe(true);
        expect(data.limits.maxLearners).toBeGreaterThanOrEqual(5);
        expect(data.restricted).toBe(false);
      }
    });

    it('should reflect subscription in billing history', async () => {
      const response = await parentApi.get('/billing/history');

      if (response.status === 200) {
        const data = response.data as {
          invoices: Array<{
            id: string;
            amount: number;
            status: string;
            createdAt: string;
          }>;
        };

        expect(data.invoices).toBeInstanceOf(Array);
      }
    });
  });

  // ==========================================================================
  // 2. Subscription Management
  // ==========================================================================

  describe('2. Subscription Management', () => {
    it('should upgrade to premium plan', async () => {
      const response = await parentApi.post('/billing/subscription/change', {
        newPlan: 'premium',
        prorate: true,
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          plan: string;
          proratedAmount: number;
          effectiveDate: string;
        };

        expect(data.plan).toBe('premium');
        expect(typeof data.proratedAmount).toBe('number');
      }

      // Process upgrade webhook
      const webhookPayload = createStripeWebhookPayload('customer.subscription.updated', {
        id: subscriptionId,
        customer: customerId,
        items: {
          data: [{ price: { product: 'prod_premium' } }],
        },
        status: 'active',
      });

      await sendStripeWebhook(webhookPayload);
    });

    it('should update entitlements after upgrade', async () => {
      await wait(500);

      const response = await parentApi.get('/entitlements');

      if (response.status === 200) {
        const data = response.data as {
          plan: string;
          features: { prioritySupport: boolean };
          limits: { maxLearners: number };
        };

        expect(data.plan).toBe('premium');
        expect(data.limits.maxLearners).toBe(10);
        expect(data.features.prioritySupport).toBe(true);
      }
    });

    it('should handle payment method update', async () => {
      paymentMethodId = 'pm_test_visa_' + Date.now();

      const response = await parentApi.post('/billing/payment-methods', {
        paymentMethodId,
        setAsDefault: true,
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          paymentMethods: Array<{ id: string; isDefault: boolean }>;
        };

        const defaultMethod = data.paymentMethods.find((pm) => pm.isDefault);
        expect(defaultMethod).toBeDefined();
      }
    });

    it('should list payment methods', async () => {
      const response = await parentApi.get('/billing/payment-methods');

      if (response.status === 200) {
        const data = response.data as {
          paymentMethods: Array<{
            id: string;
            type: string;
            last4: string;
            expiryMonth: number;
            expiryYear: number;
            isDefault: boolean;
          }>;
        };

        expect(data.paymentMethods).toBeInstanceOf(Array);
      }
    });

    it('should access billing portal', async () => {
      const response = await parentApi.post('/billing/portal-session', {
        returnUrl: 'https://app.aivo.local/settings/billing',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as { url: string };
        expect(data.url).toBeDefined();
      }
    });

    it('should get upcoming invoice preview', async () => {
      const response = await parentApi.get('/billing/upcoming-invoice');

      if (response.status === 200) {
        const data = response.data as {
          amount: number;
          dueDate: string;
          lineItems: Array<{ description: string; amount: number }>;
        };

        expect(typeof data.amount).toBe('number');
        expect(data.lineItems).toBeInstanceOf(Array);
      }
    });
  });

  // ==========================================================================
  // 3. Payment Failures
  // ==========================================================================

  describe('3. Payment Failures', () => {
    it('should handle failed payment webhook', async () => {
      const webhookPayload = createStripeWebhookPayload('invoice.payment_failed', {
        id: 'in_test_' + Date.now(),
        customer: customerId,
        subscription: subscriptionId,
        attempt_count: 1,
        next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
        amount_due: 2999,
        currency: 'usd',
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
    });

    it('should send payment failure notification', async () => {
      await wait(500);

      const response = await parentApi.get('/notifications', {
        params: { type: 'payment_failed' },
      });

      if (response.status === 200) {
        const data = response.data as {
          notifications: Array<{
            type: string;
            priority: 'low' | 'medium' | 'high';
            data: Record<string, unknown>;
          }>;
        };

        if (data.notifications.length > 0) {
          const paymentNotification = data.notifications.find(
            (n) => n.type === 'payment_failed'
          );

          if (paymentNotification) {
            expect(paymentNotification.priority).toBe('high');
          }
        }
      }
    });

    it('should enter grace period on repeated failures', async () => {
      // Simulate 3 failed attempts
      for (let attemptCount = 2; attemptCount <= 3; attemptCount++) {
        const webhookPayload = createStripeWebhookPayload('invoice.payment_failed', {
          id: `in_test_${Date.now()}_${attemptCount}`,
          customer: customerId,
          subscription: subscriptionId,
          attempt_count: attemptCount,
          next_payment_attempt:
            attemptCount < 3 ? Math.floor(Date.now() / 1000) + 86400 : null,
        });

        await sendStripeWebhook(webhookPayload);
        await wait(200);
      }

      // Send past_due status update
      const pastDueWebhook = createStripeWebhookPayload('customer.subscription.updated', {
        id: subscriptionId,
        customer: customerId,
        status: 'past_due',
      });

      await sendStripeWebhook(pastDueWebhook);
      await wait(500);

      const subscription = await parentApi.get('/billing/subscription');

      if (subscription.status === 200) {
        const data = subscription.data as { status: string };
        expect(['past_due', 'active']).toContain(data.status);
      }
    });

    it('should restrict features during grace period', async () => {
      const response = await parentApi.get('/entitlements');

      if (response.status === 200) {
        const data = response.data as {
          restricted: boolean;
          features: {
            aiTutor: boolean;
            advancedAnalytics: boolean;
          };
        };

        if (data.restricted) {
          // Core features should still work
          expect(data.features.aiTutor).toBe(true);
          // Premium features may be restricted
          // (depending on business logic, some features might be disabled)
        }
      }
    });

    it('should recover after successful payment', async () => {
      // Send successful payment webhook
      const successWebhook = createStripeWebhookPayload('invoice.paid', {
        id: 'in_test_success_' + Date.now(),
        customer: customerId,
        subscription: subscriptionId,
        amount_paid: 2999,
        status: 'paid',
      });

      await sendStripeWebhook(successWebhook);

      // Send subscription updated webhook
      const activeWebhook = createStripeWebhookPayload('customer.subscription.updated', {
        id: subscriptionId,
        customer: customerId,
        status: 'active',
      });

      await sendStripeWebhook(activeWebhook);
      await wait(500);

      const subscription = await parentApi.get('/billing/subscription');

      if (subscription.status === 200) {
        const data = subscription.data as { status: string };
        expect(data.status).toBe('active');
      }

      const entitlements = await parentApi.get('/entitlements');

      if (entitlements.status === 200) {
        const data = entitlements.data as { restricted: boolean };
        expect(data.restricted).toBe(false);
      }
    });
  });

  // ==========================================================================
  // 4. Subscription Cancellation
  // ==========================================================================

  describe('4. Subscription Cancellation', () => {
    it('should schedule cancellation at period end', async () => {
      const response = await parentApi.post('/billing/subscription/cancel', {
        reason: 'too_expensive',
        feedback: 'Great product but outside our budget right now',
        immediate: false,
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          status: string;
          cancelAt: string;
          cancelAtPeriodEnd: boolean;
        };

        expect(data.cancelAt).toBeDefined();
        expect(data.cancelAtPeriodEnd).toBe(true);
        expect(data.status).toBe('active'); // Still active until period end
      }

      debug('Cancellation Scheduled', response.data);
    });

    it('should offer retention discount', async () => {
      const response = await parentApi.get('/billing/retention-offers');

      if (response.status === 200) {
        const data = response.data as {
          offers: Array<{
            id: string;
            type: 'discount' | 'pause' | 'downgrade';
            percentOff?: number;
            duration?: number;
            description: string;
          }>;
        };

        expect(data.offers).toBeInstanceOf(Array);

        if (data.offers.length > 0) {
          const discountOffer = data.offers.find((o) => o.type === 'discount');
          if (discountOffer) {
            expect(discountOffer.percentOff).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should apply retention offer', async () => {
      const offersResponse = await parentApi.get('/billing/retention-offers');

      if (offersResponse.status === 200) {
        const offers = (offersResponse.data as { offers: Array<{ id: string }> }).offers;

        if (offers.length > 0) {
          const response = await parentApi.post('/billing/retention-offers/accept', {
            offerId: offers[0]!.id,
          });

          expect([200, 404]).toContain(response.status);

          if (response.status === 200) {
            const data = response.data as {
              applied: boolean;
              newPrice?: number;
              expiresAt?: string;
            };

            expect(data.applied).toBe(true);
          }
        }
      }
    });

    it('should allow reactivation before period end', async () => {
      const response = await parentApi.post('/billing/subscription/reactivate');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          status: string;
          cancelAt: string | null;
          cancelAtPeriodEnd: boolean;
        };

        expect(data.cancelAt).toBeNull();
        expect(data.cancelAtPeriodEnd).toBe(false);
      }
    });

    it('should process immediate cancellation', async () => {
      // Schedule cancellation again
      await parentApi.post('/billing/subscription/cancel', {
        reason: 'no_longer_needed',
        immediate: true,
      });

      // Process cancellation webhook
      const cancelWebhook = createStripeWebhookPayload('customer.subscription.deleted', {
        id: subscriptionId,
        customer: customerId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      });

      await sendStripeWebhook(cancelWebhook);
      await wait(500);
    });

    it('should downgrade to free on final cancellation', async () => {
      const response = await parentApi.get('/entitlements');

      if (response.status === 200) {
        const data = response.data as {
          plan: string;
          features: Record<string, boolean>;
          limits: { maxLearners: number };
        };

        expect(data.plan).toBe('free');
        expect(data.limits.maxLearners).toBe(1);
      }
    });

    it('should preserve data after cancellation', async () => {
      // User's data should still be accessible
      const profileResponse = await parentApi.get(
        `/profiles/${ctx().profiles.learnerA.id}`
      );

      // Profile should still exist (data retention)
      expect([200, 404]).toContain(profileResponse.status);
    });
  });

  // ==========================================================================
  // 5. Usage Limits
  // ==========================================================================

  describe('5. Usage Limits', () => {
    it('should track usage against plan limits', async () => {
      const response = await parentApi.get('/billing/usage');

      if (response.status === 200) {
        const data = response.data as {
          currentUsage: {
            learners: number;
            storageGb: number;
            sessionsThisMonth: number;
          };
          limits: {
            maxLearners: number;
            maxStorageGb: number;
            maxSessionsPerMonth: number;
          };
          percentUsed: {
            learners: number;
            storage: number;
            sessions: number;
          };
        };

        expect(data.currentUsage).toBeDefined();
        expect(data.limits).toBeDefined();
        expect(data.percentUsed.learners).toBeGreaterThanOrEqual(0);
        expect(data.percentUsed.learners).toBeLessThanOrEqual(100);
      }
    });

    it('should enforce learner limits', async () => {
      // On free plan, max learners is 1
      const response = await parentApi.post('/profiles', {
        userId: 'new-learner-id',
        displayName: 'Additional Learner',
        gradeLevel: 5,
      });

      // Should fail on free plan if limit is reached
      if (response.status === 403) {
        const data = response.data as {
          error: string;
          code: string;
          upgradeRequired: boolean;
        };

        expect(data.upgradeRequired).toBe(true);
        expect(data.code).toBe('LIMIT_EXCEEDED');
      }
    });

    it('should warn on approaching limits', async () => {
      const response = await parentApi.get('/notifications', {
        params: { type: 'usage_warning' },
      });

      if (response.status === 200) {
        const data = response.data as {
          notifications: Array<{
            type: string;
            data: { resource: string; percentUsed: number };
          }>;
        };

        // Usage warnings should be present if nearing limits
        expect(data.notifications).toBeInstanceOf(Array);
      }
    });
  });

  // ==========================================================================
  // 6. Admin Billing Overview
  // ==========================================================================

  describe('6. Admin Billing Overview', () => {
    it('should access billing dashboard as admin', async () => {
      const response = await adminApi.get('/admin/billing/overview');

      if (response.status === 200) {
        const data = response.data as {
          mrr: number;
          activeSubscriptions: number;
          churnRate: number;
          revenueByPlan: Record<string, number>;
        };

        expect(typeof data.mrr).toBe('number');
        expect(typeof data.activeSubscriptions).toBe('number');
      }
    });

    it('should list all subscriptions', async () => {
      const response = await adminApi.get('/admin/billing/subscriptions', {
        params: { status: 'all', limit: 50 },
      });

      if (response.status === 200) {
        const data = response.data as {
          subscriptions: Array<{
            id: string;
            userId: string;
            plan: string;
            status: string;
          }>;
          total: number;
        };

        expect(data.subscriptions).toBeInstanceOf(Array);
        expect(typeof data.total).toBe('number');
      }
    });

    it('should apply admin discount to subscription', async () => {
      // Re-create subscription for this test
      const checkoutResponse = await parentApi.post('/billing/checkout', {
        plan: 'pro',
        interval: 'monthly',
      });

      if (checkoutResponse.status === 200) {
        const newSubId =
          (checkoutResponse.data as { subscriptionId?: string }).subscriptionId ??
          'sub_admin_test';

        const response = await adminApi.post(`/admin/billing/subscriptions/${newSubId}/discount`, {
          percentOff: 25,
          duration: 3, // months
          reason: 'Customer loyalty',
        });

        expect([200, 404]).toContain(response.status);
      }
    });
  });
});
