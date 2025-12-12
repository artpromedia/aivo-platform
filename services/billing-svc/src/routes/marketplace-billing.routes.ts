/**
 * Marketplace Billing Routes for Billing Service
 *
 * API routes for marketplace entitlement management, vendor revenue reporting,
 * and integration with marketplace-svc.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const TenantIdParam = z.object({
  tenantId: z.string().uuid(),
});

const VendorIdParam = z.object({
  vendorId: z.string().uuid(),
});

const EntitlementIdParam = z.object({
  entitlementId: z.string().uuid(),
});

const CreateEntitlementSchema = z.object({
  tenantId: z.string().uuid(),
  contractId: z.string().uuid(),
  contractLineItemId: z.string().uuid().optional(),
  marketplaceItemId: z.string().uuid(),
  marketplaceInstallationId: z.string().uuid(),
  sku: z.string().min(1).max(50),
  entitlementType: z.enum(['UNLIMITED', 'SEAT_LIMITED', 'TIME_LIMITED']).default('UNLIMITED'),
  seatLimit: z.number().int().min(1).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  metadataJson: z.object({}).passthrough().optional(),
});

const UpdateEntitlementSchema = z.object({
  seatLimit: z.number().int().min(1).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED']).optional(),
  metadataJson: z.object({}).passthrough().optional(),
});

const ListEntitlementsQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  marketplaceItemId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const VendorRevenueQuerySchema = z.object({
  vendorId: z.string().uuid().optional(),
  sku: z.string().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const CreateVendorPayoutSchema = z.object({
  vendorId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  grossAmountCents: z.number().int().min(0),
  sharePercent: z.number().min(0).max(100),
  vendorAmountCents: z.number().int().min(0),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(1000).optional(),
});

const PayoutIdParam = z.object({
  payoutId: z.string().uuid(),
});

const UpdatePayoutStatusSchema = z.object({
  status: z.enum(['CALCULATED', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED']),
  paidAt: z.coerce.date().optional(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ENTITLEMENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /marketplace/entitlements
 * List marketplace entitlements with optional filters
 */
async function listEntitlements(
  request: FastifyRequest<{ Querystring: z.infer<typeof ListEntitlementsQuerySchema> }>,
  reply: FastifyReply
) {
  const query = ListEntitlementsQuerySchema.parse(request.query);
  const { tenantId, marketplaceItemId, status, page, limit } = query;

  const where: Record<string, unknown> = {};
  if (tenantId) where.tenantId = tenantId;
  if (marketplaceItemId) where.marketplaceItemId = marketplaceItemId;
  if (status) where.status = status;

  const [entitlements, total] = await Promise.all([
    prisma.marketplaceEntitlement.findMany({
      where,
      include: {
        contract: {
          select: { id: true, tenantId: true, status: true },
        },
        contractLineItem: {
          select: { id: true, sku: true, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.marketplaceEntitlement.count({ where }),
  ]);

  return reply.send({
    data: entitlements.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      contractId: e.contractId,
      contractLineItemId: e.contractLineItemId,
      marketplaceItemId: e.marketplaceItemId,
      marketplaceInstallationId: e.marketplaceInstallationId,
      sku: e.sku,
      entitlementType: e.entitlementType,
      seatLimit: e.seatLimit,
      status: e.status,
      expiresAt: e.expiresAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * GET /marketplace/entitlements/:tenantId/check
 * Check if a tenant has active entitlement for a marketplace item
 */
async function checkEntitlement(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdParam>;
    Querystring: { marketplaceItemId?: string; sku?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdParam.parse(request.params);
  const { marketplaceItemId, sku } = request.query;

  if (!marketplaceItemId && !sku) {
    return reply.status(400).send({
      error: 'Either marketplaceItemId or sku is required',
    });
  }

  const where: Record<string, unknown> = {
    tenantId,
    status: 'ACTIVE',
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  };

  if (marketplaceItemId) where.marketplaceItemId = marketplaceItemId;
  if (sku) where.sku = sku;

  const entitlement = await prisma.marketplaceEntitlement.findFirst({
    where,
    select: {
      id: true,
      entitlementType: true,
      seatLimit: true,
      expiresAt: true,
    },
  });

  if (!entitlement) {
    return reply.send({
      entitled: false,
      reason: 'No active entitlement found',
    });
  }

  return reply.send({
    entitled: true,
    entitlementId: entitlement.id,
    entitlementType: entitlement.entitlementType,
    seatLimit: entitlement.seatLimit,
    expiresAt: entitlement.expiresAt,
  });
}

/**
 * POST /marketplace/entitlements
 * Create a new marketplace entitlement
 */
async function createEntitlement(
  request: FastifyRequest<{ Body: z.infer<typeof CreateEntitlementSchema> }>,
  reply: FastifyReply
) {
  const body = CreateEntitlementSchema.parse(request.body);

  // Check for existing active entitlement
  const existing = await prisma.marketplaceEntitlement.findFirst({
    where: {
      tenantId: body.tenantId,
      marketplaceItemId: body.marketplaceItemId,
      status: 'ACTIVE',
    },
  });

  if (existing) {
    return reply.status(409).send({
      error: 'Active entitlement already exists for this tenant and item',
      existingEntitlementId: existing.id,
    });
  }

  // Verify contract exists and is active
  const contract = await prisma.contract.findUnique({
    where: { id: body.contractId },
    select: { id: true, tenantId: true, status: true },
  });

  if (!contract) {
    return reply.status(404).send({ error: 'Contract not found' });
  }

  if (contract.tenantId !== body.tenantId) {
    return reply.status(400).send({ error: 'Contract does not belong to specified tenant' });
  }

  if (contract.status !== 'ACTIVE') {
    return reply.status(400).send({ error: 'Contract is not active' });
  }

  const entitlement = await prisma.marketplaceEntitlement.create({
    data: {
      tenantId: body.tenantId,
      contractId: body.contractId,
      contractLineItemId: body.contractLineItemId ?? null,
      marketplaceItemId: body.marketplaceItemId,
      marketplaceInstallationId: body.marketplaceInstallationId,
      sku: body.sku,
      entitlementType: body.entitlementType,
      seatLimit: body.seatLimit ?? null,
      expiresAt: body.expiresAt ?? null,
      status: 'ACTIVE',
      metadataJson: body.metadataJson ?? null,
    },
  });

  return reply.status(201).send({
    id: entitlement.id,
    tenantId: entitlement.tenantId,
    contractId: entitlement.contractId,
    marketplaceItemId: entitlement.marketplaceItemId,
    sku: entitlement.sku,
    entitlementType: entitlement.entitlementType,
    status: entitlement.status,
    createdAt: entitlement.createdAt,
  });
}

/**
 * PATCH /marketplace/entitlements/:entitlementId
 * Update a marketplace entitlement
 */
async function updateEntitlement(
  request: FastifyRequest<{
    Params: z.infer<typeof EntitlementIdParam>;
    Body: z.infer<typeof UpdateEntitlementSchema>;
  }>,
  reply: FastifyReply
) {
  const { entitlementId } = EntitlementIdParam.parse(request.params);
  const body = UpdateEntitlementSchema.parse(request.body);

  const existing = await prisma.marketplaceEntitlement.findUnique({
    where: { id: entitlementId },
  });

  if (!existing) {
    return reply.status(404).send({ error: 'Entitlement not found' });
  }

  const updated = await prisma.marketplaceEntitlement.update({
    where: { id: entitlementId },
    data: {
      ...(body.seatLimit !== undefined && { seatLimit: body.seatLimit }),
      ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt }),
      ...(body.status && { status: body.status }),
      ...(body.metadataJson && { metadataJson: body.metadataJson }),
    },
  });

  return reply.send({
    id: updated.id,
    status: updated.status,
    seatLimit: updated.seatLimit,
    expiresAt: updated.expiresAt,
    updatedAt: updated.updatedAt,
  });
}

/**
 * POST /marketplace/entitlements/:entitlementId/revoke
 * Revoke a marketplace entitlement
 */
async function revokeEntitlement(
  request: FastifyRequest<{
    Params: z.infer<typeof EntitlementIdParam>;
    Body: { reason?: string };
  }>,
  reply: FastifyReply
) {
  const { entitlementId } = EntitlementIdParam.parse(request.params);
  const { reason } = request.body ?? {};

  const existing = await prisma.marketplaceEntitlement.findUnique({
    where: { id: entitlementId },
  });

  if (!existing) {
    return reply.status(404).send({ error: 'Entitlement not found' });
  }

  if (existing.status === 'REVOKED') {
    return reply.status(400).send({ error: 'Entitlement already revoked' });
  }

  const existingMetadata = (existing.metadataJson ?? {}) as Record<string, unknown>;

  const updated = await prisma.marketplaceEntitlement.update({
    where: { id: entitlementId },
    data: {
      status: 'REVOKED',
      metadataJson: {
        ...existingMetadata,
        revokedAt: new Date().toISOString(),
        revokeReason: reason,
      },
    },
  });

  return reply.send({
    id: updated.id,
    status: updated.status,
    revokedAt: new Date(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR REVENUE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /marketplace/vendor-revenue
 * Query the vendor revenue view
 */
async function getVendorRevenue(
  request: FastifyRequest<{ Querystring: z.infer<typeof VendorRevenueQuerySchema> }>,
  reply: FastifyReply
) {
  const query = VendorRevenueQuerySchema.parse(request.query);
  const { vendorId, sku, periodStart, periodEnd, page, limit } = query;

  // Build the raw SQL query for the view
  const conditions: string[] = [];
  const params: (string | Date)[] = [];
  let paramIndex = 1;

  if (vendorId) {
    conditions.push(`vendor_id = $${paramIndex++}`);
    params.push(vendorId);
  }
  if (sku) {
    conditions.push(`sku = $${paramIndex++}`);
    params.push(sku);
  }
  if (periodStart) {
    conditions.push(`period >= $${paramIndex++}`);
    params.push(periodStart);
  }
  if (periodEnd) {
    conditions.push(`period <= $${paramIndex++}`);
    params.push(periodEnd);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Query the view
  const data = await prisma.$queryRawUnsafe<Array<{
    vendor_id: string;
    vendor_name: string;
    sku: string;
    period: Date;
    gross_amount_cents: bigint;
    share_percent: number;
    vendor_amount_cents: bigint;
  }>>(
    `SELECT * FROM vw_vendor_revenue ${whereClause} ORDER BY period DESC, vendor_name ASC LIMIT ${limit} OFFSET ${offset}`,
    ...params
  );

  // Get total count
  const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM vw_vendor_revenue ${whereClause}`,
    ...params
  );
  const total = Number(countResult[0]?.count ?? 0);

  return reply.send({
    data: data.map((row) => ({
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      sku: row.sku,
      period: row.period,
      grossAmountCents: Number(row.gross_amount_cents),
      sharePercent: Number(row.share_percent),
      vendorAmountCents: Number(row.vendor_amount_cents),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * GET /marketplace/vendor-revenue/:vendorId/summary
 * Get revenue summary for a specific vendor
 */
async function getVendorRevenueSummary(
  request: FastifyRequest<{ Params: z.infer<typeof VendorIdParam> }>,
  reply: FastifyReply
) {
  const { vendorId } = VendorIdParam.parse(request.params);

  // Verify vendor exists in cache
  const vendorCache = await prisma.vendorRevenueShareCache.findFirst({
    where: { vendorId },
  });

  if (!vendorCache) {
    return reply.status(404).send({ error: 'Vendor not found in revenue share cache' });
  }

  // Get revenue summary from view
  const summary = await prisma.$queryRaw<Array<{
    total_gross: bigint;
    total_vendor: bigint;
    period_count: bigint;
    distinct_skus: bigint;
  }>>`
    SELECT 
      COALESCE(SUM(gross_amount_cents), 0) as total_gross,
      COALESCE(SUM(vendor_amount_cents), 0) as total_vendor,
      COUNT(DISTINCT period) as period_count,
      COUNT(DISTINCT sku) as distinct_skus
    FROM vw_vendor_revenue
    WHERE vendor_id = ${vendorId}
  `;

  // Get pending payouts
  const pendingPayouts = await prisma.vendorPayout.findMany({
    where: {
      vendorId,
      status: { in: ['CALCULATED', 'APPROVED', 'PROCESSING'] },
    },
    orderBy: { periodEnd: 'desc' },
    take: 5,
  });

  // Get recent paid payouts
  const recentPaidPayouts = await prisma.vendorPayout.findMany({
    where: {
      vendorId,
      status: 'PAID',
    },
    orderBy: { paidAt: 'desc' },
    take: 5,
  });

  const summaryData = summary[0];

  return reply.send({
    vendorId,
    vendorName: vendorCache.vendorName,
    revenue: {
      totalGrossAmountCents: Number(summaryData?.total_gross ?? 0),
      totalVendorAmountCents: Number(summaryData?.total_vendor ?? 0),
      periodCount: Number(summaryData?.period_count ?? 0),
      distinctSkus: Number(summaryData?.distinct_skus ?? 0),
    },
    pendingPayouts: pendingPayouts.map((p) => ({
      id: p.id,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      vendorAmountCents: p.vendorAmountCents,
      status: p.status,
    })),
    recentPaidPayouts: recentPaidPayouts.map((p) => ({
      id: p.id,
      periodEnd: p.periodEnd,
      vendorAmountCents: p.vendorAmountCents,
      paidAt: p.paidAt,
    })),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR PAYOUT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /marketplace/vendor-payouts
 * Create a new vendor payout record
 */
async function createVendorPayout(
  request: FastifyRequest<{ Body: z.infer<typeof CreateVendorPayoutSchema> }>,
  reply: FastifyReply
) {
  const body = CreateVendorPayoutSchema.parse(request.body);

  // Check for existing payout for this period
  const existing = await prisma.vendorPayout.findFirst({
    where: {
      vendorId: body.vendorId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    },
  });

  if (existing) {
    return reply.status(409).send({
      error: 'Payout already exists for this vendor and period',
      existingPayoutId: existing.id,
    });
  }

  const payout = await prisma.vendorPayout.create({
    data: {
      vendorId: body.vendorId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      grossAmountCents: body.grossAmountCents,
      sharePercent: body.sharePercent,
      vendorAmountCents: body.vendorAmountCents,
      currency: body.currency,
      status: 'CALCULATED',
      notes: body.notes ?? null,
    },
  });

  return reply.status(201).send({
    id: payout.id,
    vendorId: payout.vendorId,
    periodStart: payout.periodStart,
    periodEnd: payout.periodEnd,
    grossAmountCents: payout.grossAmountCents,
    vendorAmountCents: payout.vendorAmountCents,
    status: payout.status,
    createdAt: payout.createdAt,
  });
}

/**
 * PATCH /marketplace/vendor-payouts/:payoutId/status
 * Update payout status (approve, process, mark paid)
 */
async function updatePayoutStatus(
  request: FastifyRequest<{
    Params: z.infer<typeof PayoutIdParam>;
    Body: z.infer<typeof UpdatePayoutStatusSchema>;
  }>,
  reply: FastifyReply
) {
  const { payoutId } = PayoutIdParam.parse(request.params);
  const body = UpdatePayoutStatusSchema.parse(request.body);

  const existing = await prisma.vendorPayout.findUnique({
    where: { id: payoutId },
  });

  if (!existing) {
    return reply.status(404).send({ error: 'Payout not found' });
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    CALCULATED: ['APPROVED', 'FAILED'],
    APPROVED: ['PROCESSING', 'FAILED'],
    PROCESSING: ['PAID', 'FAILED'],
    PAID: [],
    FAILED: ['CALCULATED'],
  };

  if (!validTransitions[existing.status]?.includes(body.status)) {
    return reply.status(400).send({
      error: `Invalid status transition from ${existing.status} to ${body.status}`,
    });
  }

  const existingNotes = existing.notes ? `${existing.notes}\n` : '';
  const newNotes = body.notes ? `${existingNotes}[${new Date().toISOString()}] ${body.notes}` : existing.notes;

  const updated = await prisma.vendorPayout.update({
    where: { id: payoutId },
    data: {
      status: body.status as 'CALCULATED' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED',
      ...(body.status === 'PAID' && { paidAt: body.paidAt ?? new Date() }),
      ...(body.paymentReference && { paymentReference: body.paymentReference }),
      ...(newNotes && { notes: newNotes }),
    },
  });

  return reply.send({
    id: updated.id,
    status: updated.status,
    paidAt: updated.paidAt,
    paymentReference: updated.paymentReference,
    updatedAt: updated.updatedAt,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerMarketplaceBillingRoutes(server: FastifyInstance): Promise<void> {
  // Entitlements
  server.get('/marketplace/entitlements', {
    schema: {
      description: 'List marketplace entitlements',
      tags: ['marketplace-billing'],
      querystring: ListEntitlementsQuerySchema,
    },
    handler: listEntitlements,
  });

  server.get('/marketplace/entitlements/:tenantId/check', {
    schema: {
      description: 'Check if tenant has active entitlement',
      tags: ['marketplace-billing'],
      params: TenantIdParam,
    },
    handler: checkEntitlement,
  });

  server.post('/marketplace/entitlements', {
    schema: {
      description: 'Create a marketplace entitlement',
      tags: ['marketplace-billing'],
      body: CreateEntitlementSchema,
    },
    handler: createEntitlement,
  });

  server.patch('/marketplace/entitlements/:entitlementId', {
    schema: {
      description: 'Update a marketplace entitlement',
      tags: ['marketplace-billing'],
      params: EntitlementIdParam,
      body: UpdateEntitlementSchema,
    },
    handler: updateEntitlement,
  });

  server.post('/marketplace/entitlements/:entitlementId/revoke', {
    schema: {
      description: 'Revoke a marketplace entitlement',
      tags: ['marketplace-billing'],
      params: EntitlementIdParam,
    },
    handler: revokeEntitlement,
  });

  // Vendor Revenue
  server.get('/marketplace/vendor-revenue', {
    schema: {
      description: 'Query vendor revenue from the revenue view',
      tags: ['marketplace-billing'],
      querystring: VendorRevenueQuerySchema,
    },
    handler: getVendorRevenue,
  });

  server.get('/marketplace/vendor-revenue/:vendorId/summary', {
    schema: {
      description: 'Get revenue summary for a vendor',
      tags: ['marketplace-billing'],
      params: VendorIdParam,
    },
    handler: getVendorRevenueSummary,
  });

  // Vendor Payouts
  server.post('/marketplace/vendor-payouts', {
    schema: {
      description: 'Create a vendor payout record',
      tags: ['marketplace-billing'],
      body: CreateVendorPayoutSchema,
    },
    handler: createVendorPayout,
  });

  server.patch('/marketplace/vendor-payouts/:payoutId/status', {
    schema: {
      description: 'Update vendor payout status',
      tags: ['marketplace-billing'],
      params: PayoutIdParam,
      body: UpdatePayoutStatusSchema,
    },
    handler: updatePayoutStatus,
  });
}
