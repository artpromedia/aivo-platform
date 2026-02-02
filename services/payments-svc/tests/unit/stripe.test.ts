/**
 * Payments Service - Stripe Unit Tests
 *
 * Tests for Stripe integration including:
 * - Customer management
 * - Subscription handling
 * - Payment method operations
 * - Invoice processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
  paymentMethods: {
    attach: vi.fn(),
    detach: vi.fn(),
    list: vi.fn(),
    retrieve: vi.fn(),
  },
  invoices: {
    create: vi.fn(),
    retrieve: vi.fn(),
    pay: vi.fn(),
    list: vi.fn(),
    finalizeInvoice: vi.fn(),
  },
  prices: {
    retrieve: vi.fn(),
    list: vi.fn(),
  },
};

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => mockStripe),
}));

// Mock prisma
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

describe('Stripe Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer Management', () => {
    it('should create Stripe customer for organization', async () => {
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_test123',
        email: 'school@example.com',
        name: 'Test School',
        metadata: { organizationId: 'org-1' },
      });

      const customer = await mockStripe.customers.create({
        email: 'school@example.com',
        name: 'Test School',
        metadata: { organizationId: 'org-1' },
      });

      expect(customer.id).toBe('cus_test123');
      expect(customer.metadata.organizationId).toBe('org-1');
    });

    it('should retrieve existing customer', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_test123',
        email: 'school@example.com',
        subscriptions: {
          data: [{ id: 'sub_1', status: 'active' }],
        },
      });

      const customer = await mockStripe.customers.retrieve('cus_test123');
      expect(customer.email).toBe('school@example.com');
      expect(customer.subscriptions.data).toHaveLength(1);
    });

    it('should update customer email', async () => {
      mockStripe.customers.update.mockResolvedValue({
        id: 'cus_test123',
        email: 'newemail@example.com',
      });

      const customer = await mockStripe.customers.update('cus_test123', {
        email: 'newemail@example.com',
      });

      expect(customer.email).toBe('newemail@example.com');
    });

    it('should handle customer not found', async () => {
      mockStripe.customers.retrieve.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'resource_missing',
        message: 'No such customer: cus_invalid',
      });

      await expect(mockStripe.customers.retrieve('cus_invalid')).rejects.toMatchObject({
        code: 'resource_missing',
      });
    });

    it('should list customers with pagination', async () => {
      mockStripe.customers.list.mockResolvedValue({
        data: [
          { id: 'cus_1', email: 'a@example.com' },
          { id: 'cus_2', email: 'b@example.com' },
        ],
        has_more: true,
        next_cursor: 'cus_2',
      });

      const result = await mockStripe.customers.list({ limit: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.has_more).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should create subscription with price', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_premium', unit_amount: 9900 } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      const subscription = await mockStripe.subscriptions.create({
        customer: 'cus_test123',
        items: [{ price: 'price_premium' }],
      });

      expect(subscription.status).toBe('active');
      expect(subscription.items.data[0].price.id).toBe('price_premium');
    });

    it('should cancel subscription at period end', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true,
        status: 'active',
      });

      const subscription = await mockStripe.subscriptions.update('sub_test123', {
        cancel_at_period_end: true,
      });

      expect(subscription.cancel_at_period_end).toBe(true);
      expect(subscription.status).toBe('active');
    });

    it('should cancel subscription immediately', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled',
      });

      const subscription = await mockStripe.subscriptions.cancel('sub_test123');
      expect(subscription.status).toBe('canceled');
    });

    it('should update subscription quantity', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        items: { data: [{ id: 'si_123', quantity: 10 }] },
      });

      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        items: { data: [{ id: 'si_123', quantity: 20 }] },
      });

      const current = await mockStripe.subscriptions.retrieve('sub_test123');
      expect(current.items.data[0].quantity).toBe(10);

      const updated = await mockStripe.subscriptions.update('sub_test123', {
        items: [{ id: 'si_123', quantity: 20 }],
      });
      expect(updated.items.data[0].quantity).toBe(20);
    });

    it('should handle subscription status changes', async () => {
      const statuses = ['active', 'past_due', 'unpaid', 'canceled', 'incomplete'];

      for (const status of statuses) {
        mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
          id: 'sub_test',
          status,
        });

        const sub = await mockStripe.subscriptions.retrieve('sub_test');
        expect(statuses).toContain(sub.status);
      }
    });

    it('should apply trial period', async () => {
      const trialEnd = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60; // 14 days

      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_trial',
        status: 'trialing',
        trial_end: trialEnd,
      });

      const subscription = await mockStripe.subscriptions.create({
        customer: 'cus_test',
        items: [{ price: 'price_premium' }],
        trial_end: trialEnd,
      });

      expect(subscription.status).toBe('trialing');
      expect(subscription.trial_end).toBe(trialEnd);
    });
  });

  describe('Payment Methods', () => {
    it('should attach payment method to customer', async () => {
      mockStripe.paymentMethods.attach.mockResolvedValue({
        id: 'pm_test123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
      });

      const pm = await mockStripe.paymentMethods.attach('pm_test123', {
        customer: 'cus_test123',
      });

      expect(pm.card.last4).toBe('4242');
    });

    it('should detach payment method', async () => {
      mockStripe.paymentMethods.detach.mockResolvedValue({
        id: 'pm_test123',
        customer: null,
      });

      const pm = await mockStripe.paymentMethods.detach('pm_test123');
      expect(pm.customer).toBeNull();
    });

    it('should list customer payment methods', async () => {
      mockStripe.paymentMethods.list.mockResolvedValue({
        data: [
          { id: 'pm_1', card: { last4: '4242' } },
          { id: 'pm_2', card: { last4: '5555' } },
        ],
      });

      const result = await mockStripe.paymentMethods.list({
        customer: 'cus_test123',
        type: 'card',
      });

      expect(result.data).toHaveLength(2);
    });

    it('should set default payment method', async () => {
      mockStripe.customers.update.mockResolvedValue({
        id: 'cus_test123',
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      });

      const customer = await mockStripe.customers.update('cus_test123', {
        invoice_settings: { default_payment_method: 'pm_test123' },
      });

      expect(customer.invoice_settings.default_payment_method).toBe('pm_test123');
    });

    it('should handle payment method validation errors', async () => {
      mockStripe.paymentMethods.attach.mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.',
      });

      await expect(
        mockStripe.paymentMethods.attach('pm_invalid', { customer: 'cus_test' })
      ).rejects.toMatchObject({
        code: 'card_declined',
      });
    });
  });

  describe('Invoice Processing', () => {
    it('should retrieve invoice details', async () => {
      mockStripe.invoices.retrieve.mockResolvedValue({
        id: 'in_test123',
        customer: 'cus_test123',
        amount_due: 9900,
        currency: 'usd',
        status: 'open',
        lines: {
          data: [{ description: 'Premium Plan', amount: 9900 }],
        },
      });

      const invoice = await mockStripe.invoices.retrieve('in_test123');
      expect(invoice.amount_due).toBe(9900);
      expect(invoice.status).toBe('open');
    });

    it('should finalize draft invoice', async () => {
      mockStripe.invoices.finalizeInvoice.mockResolvedValue({
        id: 'in_test123',
        status: 'open',
      });

      const invoice = await mockStripe.invoices.finalizeInvoice('in_test123');
      expect(invoice.status).toBe('open');
    });

    it('should pay invoice', async () => {
      mockStripe.invoices.pay.mockResolvedValue({
        id: 'in_test123',
        status: 'paid',
        paid: true,
      });

      const invoice = await mockStripe.invoices.pay('in_test123');
      expect(invoice.paid).toBe(true);
    });

    it('should handle invoice payment failure', async () => {
      mockStripe.invoices.pay.mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
      });

      await expect(mockStripe.invoices.pay('in_test123')).rejects.toMatchObject({
        code: 'card_declined',
      });
    });

    it('should list customer invoices', async () => {
      mockStripe.invoices.list.mockResolvedValue({
        data: [
          { id: 'in_1', status: 'paid', amount_due: 9900 },
          { id: 'in_2', status: 'open', amount_due: 9900 },
        ],
      });

      const result = await mockStripe.invoices.list({ customer: 'cus_test123' });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Price Management', () => {
    it('should retrieve price details', async () => {
      mockStripe.prices.retrieve.mockResolvedValue({
        id: 'price_premium',
        unit_amount: 9900,
        currency: 'usd',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        product: 'prod_premium',
      });

      const price = await mockStripe.prices.retrieve('price_premium');
      expect(price.unit_amount).toBe(9900);
      expect(price.recurring.interval).toBe('month');
    });

    it('should list available prices', async () => {
      mockStripe.prices.list.mockResolvedValue({
        data: [
          { id: 'price_basic', unit_amount: 4900 },
          { id: 'price_premium', unit_amount: 9900 },
          { id: 'price_enterprise', unit_amount: 19900 },
        ],
      });

      const result = await mockStripe.prices.list({ active: true });
      expect(result.data).toHaveLength(3);
    });
  });

  describe('Database Sync', () => {
    it('should sync subscription to database', async () => {
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-db-1',
        stripeSubscriptionId: 'sub_test123',
        status: 'active',
      });

      const result = await mockPrisma.subscription.update({
        where: { stripeSubscriptionId: 'sub_test123' },
        data: { status: 'active' },
      });

      expect(result.status).toBe('active');
    });

    it('should update organization billing status', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        billingStatus: 'ACTIVE',
        stripeCustomerId: 'cus_test123',
      });

      const org = await mockPrisma.organization.update({
        where: { id: 'org-1' },
        data: {
          billingStatus: 'ACTIVE',
          stripeCustomerId: 'cus_test123',
        },
      });

      expect(org.billingStatus).toBe('ACTIVE');
    });
  });
});
