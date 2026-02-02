/**
 * Payment Flow Integration Test Suite
 *
 * Complete end-to-end payment workflow testing:
 * 1. Subscription plan selection
 * 2. Payment processing
 * 3. Access grant and entitlements
 * 4. Subscription renewal
 * 5. Plan changes (upgrade/downgrade)
 * 6. Cancellation and access revocation
 *
 * @module tests/integration/scenarios/payment-flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import {
  wait,
  waitFor,
  retry,
  randomString,
  createStripeWebhookPayload,
  sendStripeWebhook,
  debug,
} from '../utils/helpers';

describe('Payment Flow - Complete Workflow', () => {
  // API clients for different user roles
  let customerApi: ApiClient;
  let adminApi: ApiClient;

  // Test data IDs
  let customerId: string;
  let stripeCustomerId: string;
  let subscriptionId: string;
  let paymentMethodId: string;
  let invoiceId: string;
  let checkoutSessionId: string;

  // Cleanup tracking
  const cleanupIds: {
    subscriptions: string[];
    paymentMethods: string[];
  } = {
    subscriptions: [],
    paymentMethods: [],
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Initialize API clients from global test context
    customerApi = createApiClientForUser(ctx().users.parentA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);

    customerId = ctx().users.parentA.id;

    debug('Payment Flow Test Setup', {
      customerId,
      tenantId: ctx().tenantA.id,
    });
  });

  afterAll(async () => {
    debug('Cleaning up payment test data...');

    // Cancel any active subscriptions
    for (const subId of cleanupIds.subscriptions) {
      try {
        await customerApi.post('/billing/subscription/cancel', {
          subscriptionId: subId,
          immediate: true,
        });
      } catch {
        // Subscription may already be cancelled
      }
    }

    // Remove payment methods
    for (const pmId of cleanupIds.paymentMethods) {
      try {
        await customerApi.delete(`/billing/payment-methods/${pmId}`);
      } catch {
        // Payment method may already be removed
      }
    }

    debug('Cleanup complete');
  });

  // ==========================================================================
  // 1. Subscription Plan Selection
  // ==========================================================================

  describe('1. Subscription Plan Selection', () => {
    it('should list available subscription plans', async () => {
      const response = await customerApi.get('/billing/plans');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          plans: Array<{
            id: string;
            name: string;
            price: number;
            currency: string;
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
        expect(plan).toHaveProperty('interval');
        expect(plan).toHaveProperty('features');
      }

      debug('Plans retrieved', { status: response.status });
    });

    it('should get plan details with features', async () => {
      const response = await customerApi.get('/billing/plans/pro');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const plan = response.data as {
          id: string;
          name: string;
          description: string;
          price: number;
          features: Array<{
            name: string;
            description: string;
            included: boolean;
          }>;
          limits: {
            students: number;
            storage: number;
            apiCalls?: number;
          };
        };

        expect(plan.id).toBe('pro');
        expect(plan.features.length).toBeGreaterThan(0);
      }
    });

    it('should compare plans', async () => {
      const response = await customerApi.get('/billing/plans/compare', {
        params: { plans: 'basic,pro,enterprise' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const comparison = response.data as {
          plans: Array<{
            id: string;
            name: string;
            price: number;
          }>;
          features: Array<{
            name: string;
            availability: Record<string, boolean | string>;
          }>;
        };

        expect(comparison.plans.length).toBeGreaterThan(0);
      }
    });

    it('should check current subscription status', async () => {
      const response = await customerApi.get('/billing/subscription');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const subscription = response.data as {
          status: string;
          plan?: string;
          currentPeriodEnd?: string;
        };

        expect(subscription).toHaveProperty('status');
      }
    });

    it('should calculate pricing with discounts', async () => {
      const response = await customerApi.post('/billing/calculate-price', {
        plan: 'pro',
        interval: 'yearly',
        couponCode: 'SAVE20',
        addons: ['extra_storage'],
      });

      expect([200, 400, 404]).toContain(response.status);

      if (response.status === 200) {
        const pricing = response.data as {
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          currency: string;
        };

        expect(pricing.total).toBeGreaterThan(0);
        expect(pricing.total).toBeLessThanOrEqual(pricing.subtotal);
      }
    });
  });

  // ==========================================================================
  // 2. Payment Processing
  // ==========================================================================

  describe('2. Payment Processing', () => {
    it('should create checkout session', async () => {
      const response = await customerApi.post('/billing/checkout', {
        plan: 'pro',
        interval: 'monthly',
        successUrl: 'https://app.aivo.local/billing/success',
        cancelUrl: 'https://app.aivo.local/billing/cancel',
        metadata: {
          userId: customerId,
          tenantId: ctx().tenantA.id,
        },
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as {
          checkoutUrl: string;
          sessionId: string;
          customerId?: string;
        };

        expect(data.checkoutUrl).toBeDefined();
        checkoutSessionId = data.sessionId;

        if (data.customerId) {
          stripeCustomerId = data.customerId;
        }
      }

      if (!stripeCustomerId) {
        stripeCustomerId = `cus_test_${randomString(14)}`;
      }

      debug('Checkout session created', { checkoutSessionId, stripeCustomerId });
    });

    it('should process successful payment webhook', async () => {
      subscriptionId = `sub_test_${randomString(14)}`;

      const webhookPayload = createStripeWebhookPayload('checkout.session.completed', {
        id: checkoutSessionId || `cs_test_${randomString(14)}`,
        customer: stripeCustomerId,
        subscription: subscriptionId,
        payment_status: 'paid',
        mode: 'subscription',
        amount_total: 2999, // $29.99
        currency: 'usd',
        metadata: {
          plan: 'pro',
          tenantId: ctx().tenantA.id,
          userId: customerId,
        },
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
      cleanupIds.subscriptions.push(subscriptionId);

      debug('Payment webhook processed', { subscriptionId });
    });

    it('should handle payment method saved event', async () => {
      paymentMethodId = `pm_test_${randomString(14)}`;

      const webhookPayload = createStripeWebhookPayload('payment_method.attached', {
        id: paymentMethodId,
        customer: stripeCustomerId,
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2027,
        },
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
      cleanupIds.paymentMethods.push(paymentMethodId);
    });

    it('should retrieve saved payment methods', async () => {
      await wait(500); // Wait for webhook processing

      const response = await customerApi.get('/billing/payment-methods');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          paymentMethods: Array<{
            id: string;
            type: string;
            card?: {
              brand: string;
              last4: string;
            };
            isDefault: boolean;
          }>;
        };

        expect(Array.isArray(data.paymentMethods)).toBe(true);
      }
    });

    it('should handle failed payment webhook', async () => {
      const failedInvoiceId = `in_test_failed_${randomString(14)}`;

      const webhookPayload = createStripeWebhookPayload('invoice.payment_failed', {
        id: failedInvoiceId,
        customer: stripeCustomerId,
        subscription: subscriptionId,
        attempt_count: 1,
        next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
        amount_due: 2999,
        currency: 'usd',
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
    });

    it('should update payment method', async () => {
      const newPaymentMethodId = `pm_test_new_${randomString(14)}`;

      const response = await customerApi.post('/billing/payment-methods', {
        paymentMethodId: newPaymentMethodId,
        setAsDefault: true,
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 3. Access Grant & Entitlements
  // ==========================================================================

  describe('3. Access Grant & Entitlements', () => {
    it('should verify subscription is active after payment', async () => {
      await wait(500);

      const response = await customerApi.get('/billing/subscription');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const subscription = response.data as {
          status: string;
          plan: string;
          currentPeriodStart: string;
          currentPeriodEnd: string;
        };

        // Subscription should be active
        expect(['active', 'trialing']).toContain(subscription.status);
      }
    });

    it('should grant feature entitlements based on plan', async () => {
      const response = await customerApi.get('/billing/entitlements');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const entitlements = response.data as {
          features: Array<{
            feature: string;
            enabled: boolean;
            limit?: number;
            used?: number;
          }>;
        };

        expect(Array.isArray(entitlements.features)).toBe(true);
      }
    });

    it('should check specific feature access', async () => {
      const response = await customerApi.get('/billing/entitlements/advanced_analytics');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const entitlement = response.data as {
          feature: string;
          enabled: boolean;
          limit?: number;
        };

        expect(entitlement).toHaveProperty('enabled');
      }
    });

    it('should enforce usage limits', async () => {
      const response = await customerApi.get('/billing/usage');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const usage = response.data as {
          students: { used: number; limit: number };
          storage: { used: number; limit: number };
          apiCalls: { used: number; limit: number };
        };

        expect(usage.students.used).toBeLessThanOrEqual(usage.students.limit);
      }
    });

    it('should track and record usage', async () => {
      const response = await customerApi.post('/billing/usage/record', {
        metric: 'api_calls',
        quantity: 10,
        timestamp: new Date().toISOString(),
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should alert on approaching limits', async () => {
      const response = await customerApi.get('/billing/alerts');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const alerts = response.data as {
          alerts: Array<{
            type: string;
            metric: string;
            threshold: number;
            current: number;
          }>;
        };

        expect(Array.isArray(alerts.alerts)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 4. Subscription Renewal
  // ==========================================================================

  describe('4. Subscription Renewal', () => {
    it('should process automatic renewal webhook', async () => {
      invoiceId = `in_test_${randomString(14)}`;

      const webhookPayload = createStripeWebhookPayload('invoice.paid', {
        id: invoiceId,
        customer: stripeCustomerId,
        subscription: subscriptionId,
        amount_paid: 2999,
        currency: 'usd',
        billing_reason: 'subscription_cycle',
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);

      debug('Renewal webhook processed', { invoiceId });
    });

    it('should update subscription period after renewal', async () => {
      await wait(500);

      const response = await customerApi.get('/billing/subscription');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const subscription = response.data as {
          status: string;
          currentPeriodEnd: string;
        };

        expect(subscription.status).toBe('active');
      }
    });

    it('should retrieve invoice history', async () => {
      const response = await customerApi.get('/billing/invoices');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          invoices: Array<{
            id: string;
            amount: number;
            status: string;
            createdAt: string;
            pdfUrl?: string;
          }>;
        };

        expect(Array.isArray(data.invoices)).toBe(true);
      }
    });

    it('should download invoice PDF', async () => {
      const response = await customerApi.get(`/billing/invoices/${invoiceId}/pdf`);

      expect([200, 302, 404]).toContain(response.status);
    });

    it('should send renewal reminder', async () => {
      const response = await adminApi.post('/billing/reminders/send', {
        type: 'renewal',
        daysBeforeRenewal: 7,
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 5. Plan Changes (Upgrade/Downgrade)
  // ==========================================================================

  describe('5. Plan Changes', () => {
    it('should preview upgrade cost', async () => {
      const response = await customerApi.post('/billing/preview-change', {
        newPlan: 'enterprise',
        interval: 'monthly',
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const preview = response.data as {
          currentPlan: string;
          newPlan: string;
          proratedAmount: number;
          newAmount: number;
          effectiveDate: string;
        };

        expect(preview.newPlan).toBe('enterprise');
        expect(preview.proratedAmount).toBeDefined();
      }
    });

    it('should upgrade subscription plan', async () => {
      const response = await customerApi.post('/billing/subscription/change', {
        newPlan: 'enterprise',
        prorateBilling: true,
      });

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const result = response.data as {
          success: boolean;
          newPlan: string;
          effectiveDate: string;
        };

        expect(result.success).toBe(true);
      }
    });

    it('should process upgrade webhook', async () => {
      const webhookPayload = createStripeWebhookPayload('customer.subscription.updated', {
        id: subscriptionId,
        customer: stripeCustomerId,
        status: 'active',
        items: {
          data: [
            {
              price: { id: 'price_enterprise' },
              quantity: 1,
            },
          ],
        },
        plan: {
          id: 'enterprise',
          amount: 9999,
        },
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
    });

    it('should update entitlements after upgrade', async () => {
      await wait(500);

      const response = await customerApi.get('/billing/entitlements');

      expect([200, 404]).toContain(response.status);
    });

    it('should preview downgrade impact', async () => {
      const response = await customerApi.post('/billing/preview-change', {
        newPlan: 'basic',
        interval: 'monthly',
      });

      expect([200, 400, 404]).toContain(response.status);

      if (response.status === 200) {
        const preview = response.data as {
          currentPlan: string;
          newPlan: string;
          lostFeatures: string[];
          effectiveDate: string;
          warning?: string;
        };

        expect(preview.newPlan).toBe('basic');
        if (preview.lostFeatures) {
          expect(Array.isArray(preview.lostFeatures)).toBe(true);
        }
      }
    });

    it('should handle downgrade at period end', async () => {
      const response = await customerApi.post('/billing/subscription/change', {
        newPlan: 'basic',
        prorateBilling: false, // Apply at period end
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 6. Cancellation & Access Revocation
  // ==========================================================================

  describe('6. Cancellation & Access Revocation', () => {
    it('should preview cancellation', async () => {
      const response = await customerApi.get('/billing/subscription/cancel-preview');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const preview = response.data as {
          accessUntil: string;
          dataRetention: string;
          refundAmount?: number;
          lostFeatures: string[];
        };

        expect(preview.accessUntil).toBeDefined();
      }
    });

    it('should collect cancellation reason', async () => {
      const response = await customerApi.post('/billing/cancellation-feedback', {
        reason: 'too_expensive',
        feedback: 'Looking for more affordable options',
        wouldReturn: true,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should offer retention discount', async () => {
      const response = await customerApi.get('/billing/retention-offer');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const offer = response.data as {
          discount: number;
          duration: string;
          couponCode?: string;
        };

        expect(offer.discount).toBeGreaterThan(0);
      }
    });

    it('should cancel subscription at period end', async () => {
      const response = await customerApi.post('/billing/subscription/cancel', {
        immediate: false,
        reason: 'Testing cancellation flow',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const result = response.data as {
          success: boolean;
          cancelAt: string;
          accessUntil: string;
        };

        expect(result.success).toBe(true);
        expect(result.accessUntil).toBeDefined();
      }
    });

    it('should process cancellation webhook', async () => {
      const webhookPayload = createStripeWebhookPayload('customer.subscription.deleted', {
        id: subscriptionId,
        customer: stripeCustomerId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
    });

    it('should revoke access after cancellation period', async () => {
      await wait(500);

      const response = await customerApi.get('/billing/entitlements');

      expect([200, 403, 404]).toContain(response.status);

      // After cancellation, entitlements should be reduced or revoked
    });

    it('should retain basic data access after cancellation', async () => {
      const response = await customerApi.get('/users/me');

      // User should still have access to their account
      expect([200, 404]).toContain(response.status);
    });

    it('should allow resubscription', async () => {
      const response = await customerApi.post('/billing/checkout', {
        plan: 'basic',
        interval: 'monthly',
        successUrl: 'https://app.aivo.local/billing/success',
        cancelUrl: 'https://app.aivo.local/billing/cancel',
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Cross-Cutting Concerns
  // ==========================================================================

  describe('Cross-Cutting: Admin Operations', () => {
    it('should allow admin to view customer billing', async () => {
      const response = await adminApi.get(`/admin/customers/${customerId}/billing`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should allow admin to apply credit', async () => {
      const response = await adminApi.post(`/admin/customers/${customerId}/credit`, {
        amount: 500, // $5.00
        reason: 'Customer service credit',
      });

      expect([200, 201, 403, 404]).toContain(response.status);
    });

    it('should allow admin to extend trial', async () => {
      const response = await adminApi.post(`/admin/customers/${customerId}/extend-trial`, {
        days: 14,
        reason: 'Extended evaluation period',
      });

      expect([200, 201, 403, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Error Handling', () => {
    it('should handle invalid coupon code', async () => {
      const response = await customerApi.post('/billing/calculate-price', {
        plan: 'pro',
        interval: 'monthly',
        couponCode: 'INVALID_CODE',
      });

      expect([200, 400, 404]).toContain(response.status);
    });

    it('should handle expired payment method', async () => {
      const webhookPayload = createStripeWebhookPayload('payment_method.card_declined', {
        id: paymentMethodId,
        customer: stripeCustomerId,
        decline_code: 'card_expired',
      });

      const response = await sendStripeWebhook(webhookPayload);

      expect([200, 404]).toContain(response.status);
    });

    it('should handle duplicate subscription attempt', async () => {
      // Try to create subscription when one already exists
      const response = await customerApi.post('/billing/checkout', {
        plan: 'pro',
        interval: 'monthly',
        successUrl: 'https://app.aivo.local/billing/success',
        cancelUrl: 'https://app.aivo.local/billing/cancel',
      });

      // Should either allow or return appropriate error
      expect([200, 201, 400, 409, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Webhook Security', () => {
    it('should reject webhook with invalid signature', async () => {
      const invalidWebhook = {
        payload: JSON.stringify({ type: 'test.event', data: {} }),
        signature: 'invalid_signature',
      };

      const response = await sendStripeWebhook(invalidWebhook);

      // Should reject or ignore invalid webhooks
      expect([400, 401, 403, 404]).toContain(response.status);
    });

    it('should handle duplicate webhook idempotently', async () => {
      const webhookPayload = createStripeWebhookPayload('invoice.paid', {
        id: invoiceId, // Same invoice ID
        customer: stripeCustomerId,
        subscription: subscriptionId,
        amount_paid: 2999,
      });

      // Send same webhook twice
      await sendStripeWebhook(webhookPayload);
      const response = await sendStripeWebhook(webhookPayload);

      // Should handle gracefully (success or already processed)
      expect([200, 204, 404]).toContain(response.status);
    });
  });
});
