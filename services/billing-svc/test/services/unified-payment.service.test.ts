import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma
vi.mock('../../src/prisma.js', () => ({
  prisma: {
    billingTransaction: {
      create: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      update: vi.fn().mockResolvedValue({ id: 'tx-1', status: 'completed' }),
    },
    billingAccount: {
      findFirst: vi.fn().mockResolvedValue({ id: 'ba-1' }),
    },
  },
  PaymentProvider: { STRIPE: 'STRIPE', PAYSTACK: 'PAYSTACK', FLUTTERWAVE: 'FLUTTERWAVE' },
}));

// Mock gateways
const mockGateway = {
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  createPayment: vi.fn(),
  verifyPayment: vi.fn(),
  createSubscription: vi.fn(),
  getSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  createRefund: vi.fn(),
  createCheckoutSession: vi.fn(),
};

vi.mock('../../src/gateways/index.js', () => ({
  getPaymentGateway: vi.fn(() => mockGateway),
  PaymentStatus: { SUCCESS: 'success', FAILED: 'failed', PENDING: 'pending' },
}));

describe('UnifiedPaymentService', () => {
  let service: any;
  const baseContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    country: 'US',
    currency: 'USD',
    correlationId: 'corr-1',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGateway.createCustomer.mockResolvedValue({ id: 'cust-1', email: 'test@example.com' });
    mockGateway.updateCustomer.mockResolvedValue({ id: 'cust-1', email: 'updated@example.com' });
    mockGateway.createPayment.mockResolvedValue({ id: 'pay-1', status: 'success', amount: 1000 });
    mockGateway.verifyPayment.mockResolvedValue({ verified: true, status: 'success' });
    mockGateway.createSubscription.mockResolvedValue({ id: 'sub-1', status: 'active' });
    mockGateway.getSubscription.mockResolvedValue({ id: 'sub-1', status: 'active' });
    mockGateway.updateSubscription.mockResolvedValue({ id: 'sub-1', status: 'active' });
    mockGateway.cancelSubscription.mockResolvedValue({ id: 'sub-1', status: 'canceled' });
    mockGateway.createRefund.mockResolvedValue({ id: 'ref-1', status: 'refunded' });
    mockGateway.createCheckoutSession.mockResolvedValue({ id: 'cs-1', url: 'https://checkout.test' });

    const mod = await import('../../src/services/unified-payment.service.js');
    service = mod.unifiedPaymentService ?? new (mod as any).UnifiedPaymentService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrCreateCustomer', () => {
    it('should create customer via gateway and return success', async () => {
      const result = await service.getOrCreateCustomer(baseContext, {
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle gateway error gracefully', async () => {
      mockGateway.createCustomer.mockRejectedValue(new Error('Gateway timeout'));
      const result = await service.getOrCreateCustomer(baseContext, {
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateCustomer', () => {
    it('should update customer via gateway', async () => {
      const result = await service.updateCustomer(baseContext, 'cust-1', {
        email: 'updated@example.com',
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('createPayment', () => {
    it('should create a payment and log transaction', async () => {
      const result = await service.createPayment(baseContext, {
        amount: 1000,
        currency: 'USD',
        description: 'Test payment',
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle payment creation failure', async () => {
      mockGateway.createPayment.mockRejectedValue(new Error('Insufficient funds'));
      const result = await service.createPayment(baseContext, {
        amount: 1000,
        currency: 'USD',
        description: 'Test payment',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment reference', async () => {
      const result = await service.verifyPayment(baseContext, 'ref-123');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle verification failure', async () => {
      mockGateway.verifyPayment.mockRejectedValue(new Error('Not found'));
      const result = await service.verifyPayment(baseContext, 'ref-invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription via gateway', async () => {
      const result = await service.createSubscription(baseContext, {
        customerId: 'cust-1',
        planId: 'plan-1',
        quantity: 1,
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle subscription creation error', async () => {
      mockGateway.createSubscription.mockRejectedValue(new Error('Invalid plan'));
      const result = await service.createSubscription(baseContext, {
        customerId: 'cust-1',
        planId: 'invalid-plan',
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription details', async () => {
      const result = await service.getSubscription(baseContext, 'sub-1');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription', async () => {
      const result = await service.updateSubscription(baseContext, 'sub-1', {
        quantity: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const result = await service.cancelSubscription(baseContext, 'sub-1');
      expect(result.success).toBe(true);
    });

    it('should cancel subscription immediately when specified', async () => {
      const result = await service.cancelSubscription(baseContext, 'sub-1', { immediate: true });
      expect(result.success).toBe(true);
    });
  });

  describe('createRefund', () => {
    it('should create refund via gateway', async () => {
      const result = await service.createRefund(baseContext, {
        paymentId: 'pay-1',
        amount: 500,
        reason: 'Customer request',
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle refund failure', async () => {
      mockGateway.createRefund.mockRejectedValue(new Error('Already refunded'));
      const result = await service.createRefund(baseContext, {
        paymentId: 'pay-1',
        amount: 500,
        reason: 'Duplicate',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      const result = await service.createCheckoutSession(baseContext, {
        lineItems: [{ priceId: 'price-1', quantity: 1 }],
        successUrl: 'https://test.com/success',
        cancelUrl: 'https://test.com/cancel',
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should include gateway type in result on error', async () => {
      mockGateway.createPayment.mockRejectedValue(new Error('Network error'));
      const result = await service.createPayment(baseContext, {
        amount: 1000,
        currency: 'USD',
        description: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.gatewayType).toBeDefined();
    });
  });

  describe('context handling', () => {
    it('should handle context with different countries', async () => {
      const ngContext = { ...baseContext, country: 'NG', currency: 'NGN' };
      const result = await service.createPayment(ngContext, {
        amount: 50000,
        currency: 'NGN',
        description: 'Nigeria payment',
      });
      expect(result).toBeDefined();
    });

    it('should handle context without correlationId', async () => {
      const { correlationId, ...ctxNoCorr } = baseContext;
      const result = await service.createPayment(ctxNoCorr as any, {
        amount: 1000,
        currency: 'USD',
        description: 'No correlation',
      });
      expect(result).toBeDefined();
    });
  });
});
