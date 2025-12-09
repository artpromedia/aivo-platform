/**
 * Webhook Handler Tests
 *
 * Tests for Stripe webhook event processing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type Stripe from 'stripe';

import { buildApp } from '../src/app.js';
import { InMemoryDbClient, setDbClient } from '../src/db.js';
import * as stripeClient from '../src/stripe.js';
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
  };
});

describe('Webhook Routes', () => {
  let app: FastifyInstance;
  let db: InMemoryDbClient;

  const testBillingAccount: BillingAccount = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
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

    db = new InMemoryDbClient();
    db.seedBillingAccount(testBillingAccount);
    db.seedPlan(testPlan);
    setDbClient(db);

    app = await buildApp();
  });

  describe('POST /payments/webhook/stripe', () => {
    it('should return 400 if signature header is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        payload: { data: {} },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('stripe-signature');
    });

    it('should return 400 if signature is invalid', async () => {
      vi.mocked(stripeClient.constructWebhookEvent).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/payments/webhook/stripe',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        payload: { data: {} },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid signature');
    });

    it('should handle invoice.paid event', async () => {
      // Create a subscription in the DB first
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.IN_TRIAL,
        quantity: 1,
        trialStartAt: new Date(),
        trialEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_test123',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test123',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test123',
            subscription: 'sub_test123',
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
      const body = JSON.parse(response.body);
      expect(body.received).toBe(true);

      // Verify subscription was updated
      const updatedSubscription = await db.getSubscription(subscription.id);
      expect(updatedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should handle invoice.payment_failed event', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.ACTIVE,
        quantity: 1,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_test456',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test456',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test456',
            subscription: 'sub_test456',
            amount_due: 1499,
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
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

      // Verify subscription was marked past_due
      const updatedSubscription = await db.getSubscription(subscription.id);
      expect(updatedSubscription?.status).toBe(SubscriptionStatus.PAST_DUE);
    });

    it('should handle customer.subscription.deleted event', async () => {
      const subscription = await db.createSubscription({
        billingAccountId: testBillingAccount.id,
        planId: testPlan.id,
        status: SubscriptionStatus.ACTIVE,
        quantity: 1,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_test789',
      });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test789',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test789',
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

    it('should return 200 for unknown event types (graceful handling)', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_unknown',
        type: 'unknown.event',
        data: {
          object: {},
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
      const body = JSON.parse(response.body);
      expect(body.received).toBe(true);
    });
  });
});
