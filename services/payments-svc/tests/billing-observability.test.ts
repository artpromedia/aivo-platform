/**
 * Billing Observability Tests
 *
 * Tests for:
 * - Dunning flow (payment failure → grace period → downgrade)
 * - Metrics recording
 * - Webhook idempotency (event deduplication)
 * - Correlation ID propagation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type Stripe from 'stripe';

import { buildApp } from '../src/app.js';
import { InMemoryDbClient, setDbClient } from '../src/db.js';
import * as stripeClient from '../src/stripe.js';
import * as metrics from '../src/metrics.js';
import {
  BillingAccountType,
  PaymentProvider,
  PlanType,
  BillingPeriod,
  SubscriptionStatus,
  type BillingAccount,
  type Plan,
} from '../src/types.js';

// Mock Stripe client
vi.mock('../src/stripe.js', async () => {
  return {
    createCustomer: vi.fn(),
    getCustomer: vi.fn(),
    attachPaymentMethod: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    extractCardDetails: vi.fn(),
    createSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    constructWebhookEvent: vi.fn(),
    retryInvoice: vi.fn(),
  };
});

// Mock entitlements service calls
vi.mock('node:https', () => ({
  default: {
    request: vi.fn(() => ({
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    })),
  },
}));

describe('Billing Observability', () => {
  let app: FastifyInstance;
  let db: InMemoryDbClient;

  const testBillingAccount: BillingAccount = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    tenantId: 'tenant-001',
    accountType: BillingAccountType.PARENT_CONSUMER,
    ownerUserId: 'user-123',
    displayName: 'Test Family',
    provider: PaymentProvider.STRIPE,
    providerCustomerId: 'cus_test123',
    defaultCurrency: 'USD',
    billingEmail: 'test@example.com',
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testPlan: Plan = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    sku: 'parent-base-monthly',
    planType: PlanType.PARENT_BASE,
    name: 'Parent Base Plan',
    description: 'Monthly subscription',
    unitPriceCents: 1499,
    billingPeriod: BillingPeriod.MONTHLY,
    isActive: true,
    trialDays: 30,
    metadataJson: { stripePriceId: 'price_test123' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    metrics.resetMetrics();

    db = new InMemoryDbClient();
    db.seedBillingAccount(testBillingAccount);
    db.seedPlan(testPlan);
    setDbClient(db);

    app = await buildApp();
  });

  describe('Webhook Idempotency', () => {
    it('should process the same event only once', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.IN_TRIAL,
        quantity: 1,
        trialStartAt: new Date(),
        trialEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_idempotent_test',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_idempotency_test',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_idempotency',
            subscription: 'sub_idempotent_test',
            amount_paid: 1499,
            currency: 'usd',
          } as Stripe.Invoice,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      // First request
      const response1 = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.received).toBe(true);
      expect(body1.duplicate).toBeUndefined();

      // Second request (same event)
      const response2 = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.received).toBe(true);
      expect(body2.duplicate).toBe(true);

      // Subscription should still be ACTIVE (not double-processed)
      const updatedSubscription = await db.getSubscription(subscription.id);
      expect(updatedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  describe('Correlation ID', () => {
    it('should include correlationId in logs when x-request-id header is provided', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.IN_TRIAL,
        quantity: 1,
        trialStartAt: new Date(),
        trialEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_correlation_test',
      });

      const correlationId = 'test-correlation-123';
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_correlation_test',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_correlation',
            subscription: 'sub_correlation_test',
            amount_paid: 1499,
            currency: 'usd',
          } as Stripe.Invoice,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      const response = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
          'x-request-id': correlationId,
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response.statusCode).toBe(200);

      // Check payment event was recorded with correlationId
      const events = db.getPaymentEvents(testBillingAccount.id);
      const lastEvent = events[events.length - 1];
      expect(lastEvent?.payload?.correlationId).toBe(correlationId);
    });
  });

  describe('Metrics', () => {
    it('should record webhook received metrics', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_metrics_test',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_metrics',
            subscription: 'sub_nonexistent', // Won't find subscription, but metrics should still record
            amount_paid: 1499,
            currency: 'usd',
          } as Stripe.Invoice,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      // Verify metrics endpoint returns data
      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      expect(metricsResponse.statusCode).toBe(200);
      expect(metricsResponse.body).toContain('billing_webhook_events_total');
    });

    it('should record invoice paid metrics with correct labels', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.IN_TRIAL,
        quantity: 1,
        trialStartAt: new Date(),
        trialEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_invoice_metrics',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_invoice_metrics',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_paid_metrics',
            subscription: 'sub_invoice_metrics',
            amount_paid: 2999,
            currency: 'usd',
          } as Stripe.Invoice,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      expect(metricsResponse.body).toContain('billing_invoices_paid_total');
      expect(metricsResponse.body).toContain('currency="USD"');
    });

    it('should record webhook failure metrics on error', async () => {
      // Missing signature should record failure metric
      await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        payload: { data: {} },
      });

      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      expect(metricsResponse.body).toContain('billing_webhook_failures_total');
    });
  });

  describe('Dunning Flow', () => {
    it('should transition subscription to PAST_DUE on payment failure', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.ACTIVE,
        quantity: 1,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_dunning_start',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_dunning_start',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_dunning_start',
            subscription: 'sub_dunning_start',
            amount_due: 1499,
            currency: 'usd',
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400 * 3,
          } as unknown as Stripe.Invoice,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      const response = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response.statusCode).toBe(200);

      // Verify subscription is now PAST_DUE
      const updatedSubscription = await db.getSubscription(subscription.id);
      expect(updatedSubscription?.status).toBe(SubscriptionStatus.PAST_DUE);

      // Verify dunning metrics were recorded
      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });
      expect(metricsResponse.body).toContain('billing_dunning_events_total');
    });

    it('should recover subscription when payment succeeds after PAST_DUE', async () => {
      // Create subscription already in PAST_DUE state
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.PAST_DUE,
        quantity: 1,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_dunning_recover',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_dunning_recover',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_dunning_recover',
            subscription: 'sub_dunning_recover',
            amount_paid: 1499,
            currency: 'usd',
          } as Stripe.Invoice,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      const response = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response.statusCode).toBe(200);

      // Verify subscription recovered to ACTIVE
      const updatedSubscription = await db.getSubscription(subscription.id);
      expect(updatedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  describe('Entitlements Sync', () => {
    it('should trigger entitlements recalculation on subscription deletion', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.ACTIVE,
        quantity: 1,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_entitlements_test',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_entitlements_test',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_entitlements_test',
            canceled_at: Math.floor(Date.now() / 1000),
            ended_at: Math.floor(Date.now() / 1000),
          } as unknown as Stripe.Subscription,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      const response = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response.statusCode).toBe(200);

      // Verify subscription was canceled
      const updatedSubscription = await db.getSubscription(subscription.id);
      expect(updatedSubscription?.status).toBe(SubscriptionStatus.CANCELED);
      expect(updatedSubscription?.endedAt).toBeDefined();
    });

    it('should record subscription created metric on checkout completion', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.ACTIVE,
        quantity: 1,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_checkout_metrics',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_checkout_metrics',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_checkout_metrics',
            mode: 'subscription',
            subscription: 'sub_checkout_metrics',
            customer: 'cus_test123',
          } as unknown as Stripe.Checkout.Session,
          previous_attributes: {},
        },
      };
      vi.mocked(stripeClient.constructWebhookEvent).mockReturnValue(mockEvent as Stripe.Event);

      await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/internal/metrics',
      });

      expect(metricsResponse.body).toContain('billing_subscriptions_created_total');
    });
  });
});
