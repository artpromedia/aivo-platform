/**
 * Stripe Service Tests
 *
 * Tests for Stripe integration:
 * - Customer management
 * - Subscription lifecycle
 * - Checkout sessions
 * - Payment methods
 * - Billing portal
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { StripeService } from '../src/services/stripe.service.js';

// Mock Stripe
const mockStripe = {
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
    list: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      expire: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  paymentMethods: {
    list: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
  },
  invoices: {
    list: vi.fn(),
    retrieve: vi.fn(),
    pay: vi.fn(),
    voidInvoice: vi.fn(),
  },
  prices: {
    retrieve: vi.fn(),
  },
};

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => mockStripe),
  };
});

// ============================================================================
// Test Fixtures
// ============================================================================

const mockCustomer = {
  id: 'cus_test123',
  email: 'test@example.com',
  name: 'Test User',
  metadata: {
    tenantId: 'tenant-123',
    userId: 'user-123',
  },
};

const mockSubscription = {
  id: 'sub_test123',
  customer: 'cus_test123',
  status: 'active',
  current_period_start: 1640000000,
  current_period_end: 1642678400,
  cancel_at_period_end: false,
  items: {
    data: [
      {
        id: 'si_test123',
        price: {
          id: 'price_pro_monthly',
          product: 'prod_test123',
        },
      },
    ],
  },
};

const mockCheckoutSession = {
  id: 'cs_test123',
  url: 'https://checkout.stripe.com/pay/cs_test123',
  customer: 'cus_test123',
  mode: 'subscription',
  status: 'open',
  payment_status: 'unpaid',
};

const mockPortalSession = {
  id: 'bps_test123',
  url: 'https://billing.stripe.com/session/bps_test123',
  customer: 'cus_test123',
};

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

// ============================================================================
// Tests
// ============================================================================

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StripeService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Customer Management
  // ──────────────────────────────────────────────────────────────────────────

  describe('createCustomer', () => {
    it('should create a customer with correct parameters', async () => {
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-123',
        userId: 'user-123',
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          tenantId: 'tenant-123',
          userId: 'user-123',
        },
      });
      expect(result.id).toBe('cus_test123');
    });

    it('should handle creation errors', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Customer exists'));

      await expect(
        service.createCustomer({
          email: 'test@example.com',
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow('Customer exists');
    });
  });

  describe('getCustomer', () => {
    it('should retrieve customer by ID', async () => {
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await service.getCustomer('cus_test123');

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_test123');
      expect(result.email).toBe('test@example.com');
    });

    it('should return null for deleted customer', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({ ...mockCustomer, deleted: true });

      const result = await service.getCustomer('cus_deleted');

      expect(result).toBeNull();
    });
  });

  describe('updateCustomer', () => {
    it('should update customer metadata', async () => {
      mockStripe.customers.update.mockResolvedValue({
        ...mockCustomer,
        metadata: { ...mockCustomer.metadata, organizationId: 'org-123' },
      });

      const result = await service.updateCustomer('cus_test123', {
        metadata: { organizationId: 'org-123' },
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        metadata: { organizationId: 'org-123' },
      });
      expect(result.metadata.organizationId).toBe('org-123');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Subscription Management
  // ──────────────────────────────────────────────────────────────────────────

  describe('createSubscription', () => {
    it('should create a subscription', async () => {
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await service.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_pro_monthly',
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        items: [{ price: 'price_pro_monthly' }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      expect(result.id).toBe('sub_test123');
    });

    it('should create subscription with trial period', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        ...mockSubscription,
        status: 'trialing',
      });

      const result = await service.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_pro_monthly',
        trialDays: 14,
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_period_days: 14,
        })
      );
      expect(result.status).toBe('trialing');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel at period end by default', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        ...mockSubscription,
        cancel_at_period_end: true,
      });

      const result = await service.cancelSubscription('sub_test123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
      expect(result.cancel_at_period_end).toBe(true);
    });

    it('should cancel immediately when specified', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
      });

      const result = await service.cancelSubscription('sub_test123', { immediate: true });

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
      expect(result.status).toBe('canceled');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription with proration', async () => {
      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      await service.updateSubscription('sub_test123', {
        priceId: 'price_premium_monthly',
        prorationBehavior: 'create_prorations',
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        expect.objectContaining({
          proration_behavior: 'create_prorations',
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Checkout Sessions
  // ──────────────────────────────────────────────────────────────────────────

  describe('createCheckoutSession', () => {
    it('should create checkout session for subscription', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue(mockCheckoutSession);

      const result = await service.createCheckoutSession({
        customerId: 'cus_test123',
        priceId: 'price_pro_monthly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        mode: 'subscription',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test123',
          mode: 'subscription',
          success_url: 'https://app.example.com/success',
          cancel_url: 'https://app.example.com/cancel',
        })
      );
      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test123');
    });

    it('should include tax collection when enabled', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue(mockCheckoutSession);

      await service.createCheckoutSession({
        customerId: 'cus_test123',
        priceId: 'price_pro_monthly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        mode: 'subscription',
        collectTax: true,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          automatic_tax: { enabled: true },
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Billing Portal
  // ──────────────────────────────────────────────────────────────────────────

  describe('createBillingPortalSession', () => {
    it('should create billing portal session', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockPortalSession);

      const result = await service.createBillingPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'https://app.example.com/billing',
      });

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        return_url: 'https://app.example.com/billing',
      });
      expect(result.url).toBe('https://billing.stripe.com/session/bps_test123');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Payment Methods
  // ──────────────────────────────────────────────────────────────────────────

  describe('listPaymentMethods', () => {
    it('should list customer payment methods', async () => {
      mockStripe.paymentMethods.list.mockResolvedValue({
        data: [mockPaymentMethod],
        has_more: false,
      });

      const result = await service.listPaymentMethods('cus_test123');

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        type: 'card',
      });
      expect(result).toHaveLength(1);
      expect(result[0].card.last4).toBe('4242');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Invoices
  // ──────────────────────────────────────────────────────────────────────────

  describe('listInvoices', () => {
    it('should list customer invoices', async () => {
      mockStripe.invoices.list.mockResolvedValue({
        data: [
          {
            id: 'in_test123',
            customer: 'cus_test123',
            amount_due: 2999,
            status: 'paid',
          },
        ],
        has_more: false,
      });

      const result = await service.listInvoices('cus_test123');

      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });

    it('should respect pagination limit', async () => {
      mockStripe.invoices.list.mockResolvedValue({
        data: [],
        has_more: false,
      });

      await service.listInvoices('cus_test123', { limit: 25 });

      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 25,
      });
    });
  });
});
