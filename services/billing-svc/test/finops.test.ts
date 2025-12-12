/**
 * FinOps Routes Tests
 *
 * Tests for the FinOps dashboard API endpoints including:
 * - Summary statistics
 * - Billing accounts list with filtering
 * - Invoice management
 * - Payment events
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { finopsRoutes } from '../src/routes/finops.routes.js';
import { prisma } from '../src/prisma.js';

// Inline enum values for tests (generated Prisma client may not exist yet)
const InvoiceStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  PAID: 'PAID',
  VOID: 'VOID',
  UNCOLLECTIBLE: 'UNCOLLECTIBLE',
} as const;

const SubscriptionStatus = {
  IN_TRIAL: 'IN_TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;

const BillingAccountType = {
  SCHOOL: 'SCHOOL',
  PARENT_CONSUMER: 'PARENT_CONSUMER',
  DISTRICT: 'DISTRICT',
  PLATFORM_INTERNAL: 'PLATFORM_INTERNAL',
} as const;

const PaymentProvider = {
  STRIPE: 'STRIPE',
  MANUAL: 'MANUAL',
  FREE: 'FREE',
} as const;

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    billingAccount: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      groupBy: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    paymentEvent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const mockBillingAccount = {
  id: 'ba-123',
  tenantId: 'tenant-123',
  accountType: BillingAccountType.PARENT_CONSUMER,
  displayName: 'Test Family',
  billingEmail: 'test@example.com',
  provider: PaymentProvider.STRIPE,
  providerCustomerId: 'cus_test123',
  createdAt: new Date('2024-01-15'),
  subscriptions: [
    {
      id: 'sub-1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date('2025-01-15'),
    },
  ],
  invoices: [
    {
      id: 'inv-1',
      status: InvoiceStatus.PAID,
      amountDueCents: 2999,
      amountPaidCents: 2999,
      dueAt: new Date('2024-01-20'),
    },
  ],
};

const mockInvoice = {
  id: 'inv-123',
  invoiceNumber: 'INV-2024-00001',
  providerInvoiceId: 'in_test123',
  billingAccountId: 'ba-123',
  status: InvoiceStatus.OPEN,
  amountDueCents: 2999,
  amountPaidCents: 0,
  currency: 'USD',
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-31'),
  issuedAt: new Date('2024-01-01'),
  dueAt: new Date('2024-01-15'),
  paidAt: null,
  metadataJson: null,
  billingAccount: {
    id: 'ba-123',
    displayName: 'Test Family',
    accountType: BillingAccountType.PARENT_CONSUMER,
  },
  lineItems: [
    {
      id: 'li-1',
      description: 'Monthly Subscription',
      amountCents: 2999,
      quantity: 1,
    },
  ],
};

const mockPaymentEvent = {
  id: 'event-123',
  provider: PaymentProvider.STRIPE,
  eventType: 'invoice.paid',
  providerEventId: 'evt_test123',
  billingAccountId: 'ba-123',
  subscriptionId: null,
  invoiceId: 'inv-123',
  processedAt: new Date(),
  error: null,
  createdAt: new Date(),
  payload: { test: true },
};

// ============================================================================
// Tests
// ============================================================================

describe('FinOps Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(finopsRoutes);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /summary', () => {
    it('should return summary statistics from view when available', async () => {
      const mockViewStats = [
        {
          total_accounts: BigInt(100),
          healthy_accounts: BigInt(80),
          at_risk_accounts: BigInt(10),
          overdue_accounts: BigInt(5),
          trial_accounts: BigInt(3),
          inactive_accounts: BigInt(2),
          total_subscriptions: BigInt(150),
          active_subscriptions: BigInt(120),
          past_due_subscriptions: BigInt(10),
          total_invoiced_cents: BigInt(100000000),
          total_collected_cents: BigInt(95000000),
          outstanding_balance_cents: BigInt(5000000),
          total_mrr_cents: BigInt(7500000),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockViewStats);

      const response = await app.inject({
        method: 'GET',
        url: '/summary',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.totalAccounts).toBe(100);
      expect(data.healthyAccounts).toBe(80);
      expect(data.atRiskAccounts).toBe(10);
      expect(data.formatted.totalMrr).toBe('$75,000.00');
    });

    it('should fall back to manual calculation if view does not exist', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('relation does not exist'));
      vi.mocked(prisma.billingAccount.count).mockResolvedValue(50);
      vi.mocked(prisma.subscription.groupBy).mockResolvedValue([
        { status: SubscriptionStatus.ACTIVE, _count: { id: 40 } },
        { status: SubscriptionStatus.PAST_DUE, _count: { id: 5 } },
      ] as any);
      vi.mocked(prisma.invoice.aggregate).mockResolvedValue({
        _sum: { amountDueCents: 50000, amountPaidCents: 45000 },
        _count: { id: 100 },
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/summary',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.totalAccounts).toBe(50);
      expect(data.activeSubscriptions).toBe(40);
      expect(data.pastDueSubscriptions).toBe(5);
    });
  });

  describe('GET /accounts', () => {
    it('should return paginated billing accounts', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('view not found'));
      vi.mocked(prisma.billingAccount.findMany).mockResolvedValue([mockBillingAccount] as any);
      vi.mocked(prisma.billingAccount.count).mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/accounts?page=1&pageSize=10',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].displayName).toBe('Test Family');
      expect(data.pagination.page).toBe(1);
    });

    it('should filter by health status', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('view not found'));
      vi.mocked(prisma.billingAccount.findMany).mockResolvedValue([]);
      vi.mocked(prisma.billingAccount.count).mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/accounts?healthStatus=AT_RISK',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should calculate health status correctly', async () => {
      const accountWithPastDue = {
        ...mockBillingAccount,
        subscriptions: [
          { id: 'sub-1', status: SubscriptionStatus.PAST_DUE, currentPeriodEnd: new Date() },
        ],
      };

      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('view not found'));
      vi.mocked(prisma.billingAccount.findMany).mockResolvedValue([accountWithPastDue] as any);
      vi.mocked(prisma.billingAccount.count).mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/accounts',
      });

      const data = response.json();
      expect(data.data[0].healthStatus).toBe('AT_RISK');
    });
  });

  describe('GET /invoices', () => {
    it('should return paginated invoices', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as any);
      vi.mocked(prisma.invoice.count).mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/invoices?page=1&pageSize=10',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].invoiceNumber).toBe('INV-2024-00001');
      expect(data.data[0].formatted.amountDue).toBe('$29.99');
    });

    it('should filter by status', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.invoice.count).mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/invoices?status=PAID',
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalled();
    });

    it('should filter by billing account', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as any);
      vi.mocked(prisma.invoice.count).mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/invoices?billingAccountId=ba-123',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /invoices/:invoiceId', () => {
    it('should return invoice details', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as any);

      const response = await app.inject({
        method: 'GET',
        url: '/invoices/inv-123',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.invoiceNumber).toBe('INV-2024-00001');
    });

    it('should return 404 for non-existent invoice', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/invoices/inv-nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /invoices/:invoiceId/void', () => {
    it('should void an open invoice', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as any);
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.VOID,
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/invoices/inv-123/void',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('VOID');
    });

    it('should not void a paid invoice', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/invoices/inv-123/void',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Cannot void a paid invoice');
    });

    it('should return 404 for non-existent invoice', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/invoices/inv-nonexistent/void',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /payment-events', () => {
    it('should return paginated payment events', async () => {
      vi.mocked(prisma.paymentEvent.findMany).mockResolvedValue([mockPaymentEvent] as any);
      vi.mocked(prisma.paymentEvent.count).mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-events?page=1&pageSize=50',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].eventType).toBe('invoice.paid');
    });

    it('should filter by event type', async () => {
      vi.mocked(prisma.paymentEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentEvent.count).mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-events?eventType=invoice.paid',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by errors', async () => {
      vi.mocked(prisma.paymentEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentEvent.count).mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-events?hasError=true',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /payment-events/:eventId', () => {
    it('should return payment event details including payload', async () => {
      vi.mocked(prisma.paymentEvent.findUnique).mockResolvedValue(mockPaymentEvent as any);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-events/event-123',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.eventType).toBe('invoice.paid');
      expect(data.payload).toEqual({ test: true });
    });

    it('should return 404 for non-existent event', async () => {
      vi.mocked(prisma.paymentEvent.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-events/event-nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

describe('Currency Formatting', () => {
  const formatCurrency = (cents: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  it('should format cents correctly', () => {
    expect(formatCurrency(2999)).toBe('$29.99');
    expect(formatCurrency(100000)).toBe('$1,000.00');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle different currencies', () => {
    expect(formatCurrency(2999, 'EUR')).toBe('€29.99');
    expect(formatCurrency(2999, 'GBP')).toBe('£29.99');
  });
});

describe('Health Status Calculation', () => {
  const calculateHealthStatus = (account: {
    pastDueSubscriptions: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    overdueInvoices: number;
  }): string => {
    if (account.pastDueSubscriptions > 0) return 'AT_RISK';
    if (account.overdueInvoices > 0) return 'OVERDUE';
    if (account.activeSubscriptions > 0) return 'HEALTHY';
    if (account.trialSubscriptions > 0) return 'TRIAL';
    return 'INACTIVE';
  };

  it('should return AT_RISK when there are past due subscriptions', () => {
    expect(
      calculateHealthStatus({
        pastDueSubscriptions: 1,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        overdueInvoices: 0,
      })
    ).toBe('AT_RISK');
  });

  it('should return OVERDUE when there are overdue invoices', () => {
    expect(
      calculateHealthStatus({
        pastDueSubscriptions: 0,
        activeSubscriptions: 1,
        trialSubscriptions: 0,
        overdueInvoices: 1,
      })
    ).toBe('OVERDUE');
  });

  it('should return HEALTHY when there are active subscriptions', () => {
    expect(
      calculateHealthStatus({
        pastDueSubscriptions: 0,
        activeSubscriptions: 1,
        trialSubscriptions: 0,
        overdueInvoices: 0,
      })
    ).toBe('HEALTHY');
  });

  it('should return TRIAL when there are only trial subscriptions', () => {
    expect(
      calculateHealthStatus({
        pastDueSubscriptions: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 1,
        overdueInvoices: 0,
      })
    ).toBe('TRIAL');
  });

  it('should return INACTIVE when there are no subscriptions', () => {
    expect(
      calculateHealthStatus({
        pastDueSubscriptions: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        overdueInvoices: 0,
      })
    ).toBe('INACTIVE');
  });
});
