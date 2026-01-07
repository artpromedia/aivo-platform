/**
 * Payment Routes Tests
 *
 * Tests for customer creation, payment method attachment,
 * subscription creation, and cancellation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

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

describe('Payment Routes', () => {
  let app: FastifyInstance;
  let db: InMemoryDbClient;

  const testBillingAccount: BillingAccount = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
    accountType: BillingAccountType.PARENT_CONSUMER,
    ownerUserId: 'user-123',
    displayName: 'Test Family',
    provider: PaymentProvider.STRIPE,
    providerCustomerId: null,
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
    name: 'Parent Base Plan (Monthly)',
    description: 'Monthly subscription for parents',
    unitPriceCents: 1499,
    billingPeriod: BillingPeriod.MONTHLY,
    isActive: true,
    trialDays: 30,
    metadataJson: { stripePriceId: 'price_test123' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create in-memory DB with test data
    db = new InMemoryDbClient();
    db.seedBillingAccount(testBillingAccount);
    db.seedPlan(testPlan);
    setDbClient(db);

    // Build app
    app = await buildApp();
  });

  describe('POST /payments/accounts/:billingAccountId/customer', () => {
    it('should create a new Stripe customer when none exists', async () => {
      const mockCustomer = { id: 'cus_test123' };
      vi.mocked(stripeClient.createCustomer).mockResolvedValue(mockCustomer as any);

      const response = await app.inject({
        method: 'POST',
        url: `/payments/accounts/${testBillingAccount.id}/customer`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        customerId: 'cus_test123',
        isNew: true,
      });

      expect(stripeClient.createCustomer).toHaveBeenCalledWith({
        email: testBillingAccount.billingEmail,
        name: testBillingAccount.displayName,
        metadata: {
          billingAccountId: testBillingAccount.id,
          tenantId: testBillingAccount.tenantId,
          accountType: testBillingAccount.accountType,
        },
      });
    });

    it('should return existing customer if already exists', async () => {
      // Update account to have existing customer
      const accountWithCustomer = {
        ...testBillingAccount,
        providerCustomerId: 'cus_existing',
      };
      db.seedBillingAccount(accountWithCustomer);

      const mockCustomer = { id: 'cus_existing', deleted: false };
      vi.mocked(stripeClient.getCustomer).mockResolvedValue(mockCustomer as any);

      const response = await app.inject({
        method: 'POST',
        url: `/payments/accounts/${testBillingAccount.id}/customer`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        customerId: 'cus_existing',
        isNew: false,
      });

      expect(stripeClient.createCustomer).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent billing account', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payments/accounts/123e4567-e89b-12d3-a456-426614174999/customer',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Billing account not found');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payments/accounts/invalid-uuid/customer',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /payments/accounts/:billingAccountId/payment-method/attach', () => {
    beforeEach(() => {
      // Account needs a customer first
      const accountWithCustomer = {
        ...testBillingAccount,
        providerCustomerId: 'cus_test123',
      };
      db.seedBillingAccount(accountWithCustomer);
    });

    it('should attach a payment method and set as default', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
      };
      vi.mocked(stripeClient.attachPaymentMethod).mockResolvedValue(mockPaymentMethod as any);
      vi.mocked(stripeClient.setDefaultPaymentMethod).mockResolvedValue({} as any);
      vi.mocked(stripeClient.extractCardDetails).mockReturnValue({
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/payments/accounts/${testBillingAccount.id}/payment-method/attach`,
        payload: {
          paymentMethodId: 'pm_test123',
          setAsDefault: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.brand).toBe('visa');
      expect(body.last4).toBe('4242');
      expect(body.isDefault).toBe(true);
      expect(body.instrumentId).toBeDefined();
    });

    it('should return 400 if no customer exists', async () => {
      // Create a fresh billing account without providerCustomerId
      const accountWithoutCustomer: BillingAccount = {
        ...testBillingAccount,
        id: '123e4567-e89b-12d3-a456-426614174099', // Different ID to avoid conflicts
        providerCustomerId: null, // No Stripe customer
      };

      // Rebuild app with fresh DB without customer
      const freshDb = new InMemoryDbClient();
      freshDb.seedBillingAccount(accountWithoutCustomer);
      freshDb.seedPlan(testPlan);
      setDbClient(freshDb);
      const freshApp = await buildApp();

      const response = await freshApp.inject({
        method: 'POST',
        url: `/payments/accounts/${accountWithoutCustomer.id}/payment-method/attach`,
        payload: {
          paymentMethodId: 'pm_test123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('no Stripe customer');

      // Restore the original db client for subsequent tests
      setDbClient(db);
    });
  });

  describe('POST /payments/subscriptions', () => {
    beforeEach(() => {
      // Account needs a customer first
      const accountWithCustomer = {
        ...testBillingAccount,
        providerCustomerId: 'cus_test123',
      };
      db.seedBillingAccount(accountWithCustomer);
    });

    it('should create a subscription with trial', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockStripeSubscription = {
        id: 'sub_test123',
        status: 'trialing',
        trial_end: now + 30 * 24 * 60 * 60,
        current_period_start: now,
        current_period_end: now + 30 * 24 * 60 * 60,
      };
      vi.mocked(stripeClient.createSubscription).mockResolvedValue(mockStripeSubscription as any);

      const response = await app.inject({
        method: 'POST',
        url: '/payments/subscriptions',
        payload: {
          billingAccountId: testBillingAccount.id,
          planSku: 'parent-base-monthly',
          quantity: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.subscriptionId).toBeDefined();
      expect(body.providerSubscriptionId).toBe('sub_test123');
      expect(body.status).toBe(SubscriptionStatus.IN_TRIAL);
      expect(body.trialStartAt).toBeDefined();
      expect(body.trialEndAt).toBeDefined();
    });

    it('should return 404 for non-existent plan', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payments/subscriptions',
        payload: {
          billingAccountId: testBillingAccount.id,
          planSku: 'non-existent-plan',
          quantity: 1,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Plan not found');
    });
  });

  describe('POST /payments/subscriptions/:subscriptionId/cancel', () => {
    it('should cancel subscription at period end by default', async () => {
      // First create a subscription
      const now = Math.floor(Date.now() / 1000);
      const mockStripeSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_start: now,
        current_period_end: now + 30 * 24 * 60 * 60,
      };
      vi.mocked(stripeClient.createSubscription).mockResolvedValue(mockStripeSubscription as any);

      const accountWithCustomer = {
        ...testBillingAccount,
        providerCustomerId: 'cus_test123',
      };
      db.seedBillingAccount(accountWithCustomer);

      // Create subscription first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/payments/subscriptions',
        payload: {
          billingAccountId: testBillingAccount.id,
          planSku: 'parent-base-monthly',
          trialDays: 0, // No trial for this test
        },
      });
      const { subscriptionId } = JSON.parse(createResponse.body);

      // Now cancel it
      vi.mocked(stripeClient.cancelSubscription).mockResolvedValue({
        ...mockStripeSubscription,
        cancel_at_period_end: true,
      } as any);

      const cancelResponse = await app.inject({
        method: 'POST',
        url: `/payments/subscriptions/${subscriptionId}/cancel`,
        payload: {},
      });

      expect(cancelResponse.statusCode).toBe(200);
      const body = JSON.parse(cancelResponse.body);
      expect(body.cancelAtPeriodEnd).toBe(true);
      expect(body.canceledAt).toBeDefined();
    });
  });
});
