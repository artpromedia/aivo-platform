/**
 * FinOps Routes - Billing Status & Reconciliation
 *
 * REST endpoints for the FinOps dashboard in web-platform-admin.
 * Provides billing status, reconciliation views, and invoice management.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// Inline enum values (generated Prisma client may not exist yet)
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

const _PaymentProvider = {
  STRIPE: 'STRIPE',
  MANUAL: 'MANUAL',
  FREE: 'FREE',
} as const;

// ============================================================================
// Schema Validation
// ============================================================================

const BillingStatusQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  healthStatus: z.enum(['HEALTHY', 'AT_RISK', 'OVERDUE', 'TRIAL', 'INACTIVE']).optional(),
  accountType: z.nativeEnum(BillingAccountType).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['displayName', 'createdAt', 'mrrCents', 'outstandingBalance'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const InvoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  status: z.nativeEnum(InvoiceStatus).optional(),
  billingAccountId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

const PaymentEventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
  eventType: z.string().optional(),
  billingAccountId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  hasError: z.coerce.boolean().optional(),
});

const InvoiceIdParamSchema = z.object({
  invoiceId: z.string().uuid(),
});

// ============================================================================
// Types
// ============================================================================

type BillingAccountTypeEnum = (typeof BillingAccountType)[keyof typeof BillingAccountType];
type PaymentProviderEnum = (typeof _PaymentProvider)[keyof typeof _PaymentProvider];

interface BillingStatusRow {
  billing_account_id: string;
  tenant_id: string;
  account_type: BillingAccountTypeEnum;
  display_name: string;
  billing_email: string | null;
  payment_provider: PaymentProviderEnum;
  stripe_customer_id: string | null;
  account_created_at: Date;
  total_subscriptions: bigint;
  active_subscriptions: bigint;
  trial_subscriptions: bigint;
  past_due_subscriptions: bigint;
  canceled_subscriptions: bigint;
  latest_period_end: Date | null;
  past_due_since: Date | null;
  total_invoices: bigint;
  open_invoices: bigint;
  paid_invoices: bigint;
  uncollectible_invoices: bigint;
  total_invoiced_cents: bigint;
  total_collected_cents: bigint;
  outstanding_balance_cents: bigint;
  health_status: string;
  last_payment_event_at: Date | null;
  last_payment_at: Date | null;
  mrr_cents: bigint;
}

interface BillingSummaryStats {
  total_accounts: bigint;
  healthy_accounts: bigint;
  at_risk_accounts: bigint;
  overdue_accounts: bigint;
  trial_accounts: bigint;
  inactive_accounts: bigint;
  total_subscriptions: bigint;
  active_subscriptions: bigint;
  past_due_subscriptions: bigint;
  total_invoiced_cents: bigint;
  total_collected_cents: bigint;
  outstanding_balance_cents: bigint;
  total_mrr_cents: bigint;
}

interface SubscriptionItem {
  id: string;
  status: string;
  currentPeriodEnd: Date | null;
}

interface InvoiceItem {
  id: string;
  status: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueAt: Date | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate health status for a billing account
 */
function calculateHealthStatus(account: {
  pastDueSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  overdueInvoices: number;
}): string {
  if (account.pastDueSubscriptions > 0) return 'AT_RISK';
  if (account.overdueInvoices > 0) return 'OVERDUE';
  if (account.activeSubscriptions > 0) return 'HEALTHY';
  if (account.trialSubscriptions > 0) return 'TRIAL';
  return 'INACTIVE';
}

/**
 * Convert bigint to number safely
 */
function bigIntToNumber(value: bigint | null): number {
  if (value === null) return 0;
  return Number(value);
}

/**
 * Format cents to currency display
 */
function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /finops/summary
 *
 * Get summary statistics for the FinOps dashboard.
 */
async function getSummaryStats(_request: FastifyRequest, _reply: FastifyReply) {
  // Try to use the view if it exists, otherwise calculate manually
  try {
    const results = await prisma.$queryRaw<BillingSummaryStats[]>`
      SELECT * FROM vw_billing_summary_stats LIMIT 1
    `;

    if (results.length > 0) {
      const stats = results[0];
      return {
        totalAccounts: bigIntToNumber(stats.total_accounts),
        healthyAccounts: bigIntToNumber(stats.healthy_accounts),
        atRiskAccounts: bigIntToNumber(stats.at_risk_accounts),
        overdueAccounts: bigIntToNumber(stats.overdue_accounts),
        trialAccounts: bigIntToNumber(stats.trial_accounts),
        inactiveAccounts: bigIntToNumber(stats.inactive_accounts),
        totalSubscriptions: bigIntToNumber(stats.total_subscriptions),
        activeSubscriptions: bigIntToNumber(stats.active_subscriptions),
        pastDueSubscriptions: bigIntToNumber(stats.past_due_subscriptions),
        totalInvoicedCents: bigIntToNumber(stats.total_invoiced_cents),
        totalCollectedCents: bigIntToNumber(stats.total_collected_cents),
        outstandingBalanceCents: bigIntToNumber(stats.outstanding_balance_cents),
        totalMrrCents: bigIntToNumber(stats.total_mrr_cents),
        formatted: {
          totalInvoiced: formatCurrency(bigIntToNumber(stats.total_invoiced_cents)),
          totalCollected: formatCurrency(bigIntToNumber(stats.total_collected_cents)),
          outstandingBalance: formatCurrency(bigIntToNumber(stats.outstanding_balance_cents)),
          totalMrr: formatCurrency(bigIntToNumber(stats.total_mrr_cents)),
        },
      };
    }
  } catch {
    // View might not exist yet, calculate manually
  }

  // Fallback: Calculate stats manually
  const [accountStats, subscriptionStats, invoiceStats] = await Promise.all([
    prisma.billingAccount.count(),
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.invoice.aggregate({
      _sum: {
        amountDueCents: true,
        amountPaidCents: true,
      },
      _count: { id: true },
    }),
  ]);

  const subscriptionsByStatus = subscriptionStats.reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s.status]: s._count.id }),
    {}
  );

  return {
    totalAccounts: accountStats,
    healthyAccounts: 0, // Would need complex query
    atRiskAccounts: 0,
    overdueAccounts: 0,
    trialAccounts: 0,
    inactiveAccounts: 0,
    totalSubscriptions: Object.values(subscriptionsByStatus).reduce((a, b) => a + b, 0),
    activeSubscriptions: subscriptionsByStatus[SubscriptionStatus.ACTIVE] || 0,
    pastDueSubscriptions: subscriptionsByStatus[SubscriptionStatus.PAST_DUE] || 0,
    totalInvoicedCents: invoiceStats._sum.amountDueCents || 0,
    totalCollectedCents: invoiceStats._sum.amountPaidCents || 0,
    outstandingBalanceCents:
      (invoiceStats._sum.amountDueCents || 0) - (invoiceStats._sum.amountPaidCents || 0),
    totalMrrCents: 0, // Would need complex query
    formatted: {
      totalInvoiced: formatCurrency(invoiceStats._sum.amountDueCents || 0),
      totalCollected: formatCurrency(invoiceStats._sum.amountPaidCents || 0),
      outstandingBalance: formatCurrency(
        (invoiceStats._sum.amountDueCents || 0) - (invoiceStats._sum.amountPaidCents || 0)
      ),
      totalMrr: formatCurrency(0),
    },
  };
}

/**
 * GET /finops/accounts
 *
 * Get paginated billing accounts with status information.
 */
async function getBillingAccounts(
  request: FastifyRequest<{ Querystring: z.infer<typeof BillingStatusQuerySchema> }>,
  _reply: FastifyReply
) {
  const query = BillingStatusQuerySchema.parse(request.query);
  const skip = (query.page - 1) * query.pageSize;

  // Try to use the view if it exists
  try {
    const rows = await prisma.$queryRaw<BillingStatusRow[]>`
      SELECT * FROM vw_billing_status
      ${query.healthStatus ? prisma.$queryRaw`WHERE health_status = ${query.healthStatus}` : prisma.$queryRaw``}
      ${query.accountType ? prisma.$queryRaw`AND account_type = ${query.accountType}` : prisma.$queryRaw``}
      ORDER BY account_created_at DESC
      LIMIT ${query.pageSize}
      OFFSET ${skip}
    `;

    const accounts = rows.map((row) => ({
      id: row.billing_account_id,
      tenantId: row.tenant_id,
      accountType: row.account_type,
      displayName: row.display_name,
      billingEmail: row.billing_email,
      paymentProvider: row.payment_provider,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: row.account_created_at,
      subscriptions: {
        total: bigIntToNumber(row.total_subscriptions),
        active: bigIntToNumber(row.active_subscriptions),
        trial: bigIntToNumber(row.trial_subscriptions),
        pastDue: bigIntToNumber(row.past_due_subscriptions),
        canceled: bigIntToNumber(row.canceled_subscriptions),
      },
      invoices: {
        total: bigIntToNumber(row.total_invoices),
        open: bigIntToNumber(row.open_invoices),
        paid: bigIntToNumber(row.paid_invoices),
        uncollectible: bigIntToNumber(row.uncollectible_invoices),
      },
      financials: {
        totalInvoicedCents: bigIntToNumber(row.total_invoiced_cents),
        totalCollectedCents: bigIntToNumber(row.total_collected_cents),
        outstandingBalanceCents: bigIntToNumber(row.outstanding_balance_cents),
        mrrCents: bigIntToNumber(row.mrr_cents),
      },
      healthStatus: row.health_status,
      lastPaymentAt: row.last_payment_at,
      lastPaymentEventAt: row.last_payment_event_at,
    }));

    return {
      data: accounts,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: accounts.length, // Would need count query for accurate total
      },
    };
  } catch {
    // View doesn't exist, use direct queries
  }

  // Fallback: Query directly
  const [accounts, total] = await Promise.all([
    prisma.billingAccount.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: query.accountType ? ({ accountType: query.accountType } as any) : undefined,
      include: {
        subscriptions: {
          select: {
            id: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
        invoices: {
          select: {
            id: true,
            status: true,
            amountDueCents: true,
            amountPaidCents: true,
            dueAt: true,
          },
        },
      },
      skip,
      take: query.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.billingAccount.count({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: query.accountType ? ({ accountType: query.accountType } as any) : undefined,
    }),
  ]);

  const accountsWithStatus = accounts.map((account) => {
    const subscriptions = (account as unknown as { subscriptions: SubscriptionItem[] })
      .subscriptions;
    const invoices = (account as unknown as { invoices: InvoiceItem[] }).invoices;
    const now = new Date();

    const activeCount = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE).length;
    const trialCount = subscriptions.filter((s) => s.status === SubscriptionStatus.IN_TRIAL).length;
    const pastDueCount = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.PAST_DUE
    ).length;
    const canceledCount = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.CANCELED
    ).length;

    const openInvoices = invoices.filter((i) => i.status === InvoiceStatus.OPEN);
    const overdueCount = openInvoices.filter((i) => i.dueAt && i.dueAt < now).length;

    const totalInvoiced = invoices.reduce((sum: number, i) => sum + i.amountDueCents, 0);
    const totalCollected = invoices.reduce((sum: number, i) => sum + i.amountPaidCents, 0);

    return {
      id: account.id,
      tenantId: account.tenantId,
      accountType: account.accountType,
      displayName: account.displayName,
      billingEmail: account.billingEmail,
      paymentProvider: account.provider,
      stripeCustomerId: account.providerCustomerId,
      createdAt: account.createdAt,
      subscriptions: {
        total: subscriptions.length,
        active: activeCount,
        trial: trialCount,
        pastDue: pastDueCount,
        canceled: canceledCount,
      },
      invoices: {
        total: invoices.length,
        open: openInvoices.length,
        paid: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
        uncollectible: invoices.filter((i) => i.status === InvoiceStatus.UNCOLLECTIBLE).length,
      },
      financials: {
        totalInvoicedCents: totalInvoiced,
        totalCollectedCents: totalCollected,
        outstandingBalanceCents: totalInvoiced - totalCollected,
        mrrCents: 0, // Would need plan data
      },
      healthStatus: calculateHealthStatus({
        pastDueSubscriptions: pastDueCount,
        activeSubscriptions: activeCount,
        trialSubscriptions: trialCount,
        overdueInvoices: overdueCount,
      }),
    };
  });

  return {
    data: accountsWithStatus,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * GET /finops/invoices
 *
 * Get paginated invoices with filtering.
 */
async function getInvoices(
  request: FastifyRequest<{ Querystring: z.infer<typeof InvoiceQuerySchema> }>,
  _reply: FastifyReply
) {
  const query = InvoiceQuerySchema.parse(request.query);
  const skip = (query.page - 1) * query.pageSize;

  // Build where clause dynamically
  const where: Record<string, unknown> = {};

  if (query.status) where.status = query.status;
  if (query.billingAccountId) where.billingAccountId = query.billingAccountId;
  if (query.fromDate || query.toDate) {
    where.issuedAt = {
      ...(query.fromDate && { gte: new Date(query.fromDate) }),
      ...(query.toDate && { lte: new Date(query.toDate) }),
    };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        billingAccount: {
          select: {
            id: true,
            displayName: true,
            accountType: true,
          },
        },
        lineItems: {
          select: {
            id: true,
            description: true,
            amountCents: true,
            quantity: true,
          },
        },
      },
      skip,
      take: query.pageSize,
      orderBy: { issuedAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      providerInvoiceId: inv.providerInvoiceId,
      billingAccount: inv.billingAccount,
      status: inv.status,
      amountDueCents: inv.amountDueCents,
      amountPaidCents: inv.amountPaidCents,
      outstandingCents: inv.amountDueCents - inv.amountPaidCents,
      currency: inv.currency,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      paidAt: inv.paidAt,
      lineItemCount: inv.lineItems.length,
      formatted: {
        amountDue: formatCurrency(inv.amountDueCents, inv.currency),
        amountPaid: formatCurrency(inv.amountPaidCents, inv.currency),
        outstanding: formatCurrency(inv.amountDueCents - inv.amountPaidCents, inv.currency),
      },
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * GET /finops/invoices/:invoiceId
 *
 * Get detailed invoice information.
 */
async function getInvoiceDetail(
  request: FastifyRequest<{ Params: z.infer<typeof InvoiceIdParamSchema> }>,
  reply: FastifyReply
) {
  const { invoiceId } = InvoiceIdParamSchema.parse(request.params);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      billingAccount: true,
      lineItems: {
        include: {
          subscription: {
            select: {
              id: true,
              status: true,
              providerSubscriptionId: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return reply.status(404).send({ error: 'Invoice not found' });
  }

  return {
    ...invoice,
    formatted: {
      amountDue: formatCurrency(invoice.amountDueCents, invoice.currency),
      amountPaid: formatCurrency(invoice.amountPaidCents, invoice.currency),
      outstanding: formatCurrency(
        invoice.amountDueCents - invoice.amountPaidCents,
        invoice.currency
      ),
    },
  };
}

/**
 * GET /finops/payment-events
 *
 * Get paginated payment events (webhook history).
 */
async function getPaymentEvents(
  request: FastifyRequest<{ Querystring: z.infer<typeof PaymentEventQuerySchema> }>,
  _reply: FastifyReply
) {
  const query = PaymentEventQuerySchema.parse(request.query);
  const skip = (query.page - 1) * query.pageSize;

  // Build where clause dynamically
  const where: Record<string, unknown> = {};

  if (query.eventType) where.eventType = query.eventType;
  if (query.billingAccountId) where.billingAccountId = query.billingAccountId;
  if (query.hasError !== undefined) {
    where.error = query.hasError ? { not: null } : null;
  }
  if (query.fromDate || query.toDate) {
    where.createdAt = {
      ...(query.fromDate && { gte: new Date(query.fromDate) }),
      ...(query.toDate && { lte: new Date(query.toDate) }),
    };
  }

  const [events, total] = await Promise.all([
    prisma.paymentEvent.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentEvent.count({ where }),
  ]);

  return {
    data: events.map((event) => ({
      id: event.id,
      provider: event.provider,
      eventType: event.eventType,
      providerEventId: event.providerEventId,
      billingAccountId: event.billingAccountId,
      subscriptionId: event.subscriptionId,
      invoiceId: event.invoiceId,
      processedAt: event.processedAt,
      error: event.error,
      createdAt: event.createdAt,
      // Don't expose full payload by default for security
      hasPayload: event.payload !== null,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * GET /finops/payment-events/:eventId
 *
 * Get detailed payment event including payload (for debugging).
 */
async function getPaymentEventDetail(
  request: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply
) {
  const { eventId } = request.params;

  const event = await prisma.paymentEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return reply.status(404).send({ error: 'Payment event not found' });
  }

  return event;
}

/**
 * POST /finops/invoices/:invoiceId/void
 *
 * Void an invoice (mark as uncollectible).
 */
async function voidInvoice(
  request: FastifyRequest<{ Params: z.infer<typeof InvoiceIdParamSchema> }>,
  reply: FastifyReply
) {
  const { invoiceId } = InvoiceIdParamSchema.parse(request.params);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return reply.status(404).send({ error: 'Invoice not found' });
  }

  if (invoice.status === InvoiceStatus.PAID) {
    return reply.status(400).send({ error: 'Cannot void a paid invoice' });
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.VOID,
      metadataJson: {
        ...((invoice.metadataJson ?? {}) as object),
        voidedAt: new Date().toISOString(),
        voidedBy: 'finops-admin', // TODO: Get from auth context
      },
    },
  });

  request.log.info({ invoiceId }, 'Invoice voided');

  return updated;
}

// ============================================================================
// Plugin Registration
// ============================================================================

export async function finopsRoutes(fastify: FastifyInstance) {
  // Summary stats
  fastify.get('/summary', getSummaryStats);

  // Billing accounts
  fastify.get('/accounts', getBillingAccounts);

  // Invoices
  fastify.get('/invoices', getInvoices);
  fastify.get<{ Params: z.infer<typeof InvoiceIdParamSchema> }>(
    '/invoices/:invoiceId',
    getInvoiceDetail
  );
  fastify.post<{ Params: z.infer<typeof InvoiceIdParamSchema> }>(
    '/invoices/:invoiceId/void',
    voidInvoice
  );

  // Payment events
  fastify.get('/payment-events', getPaymentEvents);
  fastify.get<{ Params: { eventId: string } }>('/payment-events/:eventId', getPaymentEventDetail);
}
