/**
 * Marketplace Billing Routes
 *
 * API routes for managing marketplace item billing configuration,
 * vendor revenue shares, and installation billing linkage.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import type { MarketplaceBillingModel } from '../types/marketplace.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const MarketplaceItemIdParam = z.object({
  itemId: z.string().uuid(),
});

const VendorIdParam = z.object({
  vendorId: z.string().uuid(),
});

const RevenueShareIdParam = z.object({
  shareId: z.string().uuid(),
});

const UpdateBillingConfigSchema = z.object({
  isFree: z.boolean().optional(),
  billingModel: z.enum(['FREE', 'TENANT_FLAT', 'PER_SEAT']).optional(),
  billingSku: z.string().max(50).optional().nullable(),
  billingMetadataJson: z
    .object({
      trialDays: z.number().int().min(0).max(365).optional(),
      minSeats: z.number().int().min(1).optional(),
      pricePerSeatCents: z.number().int().min(0).optional(),
      flatPriceCents: z.number().int().min(0).optional(),
      billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

const CreateRevenueShareSchema = z.object({
  vendorId: z.string().uuid(),
  sku: z.string().min(1).max(50),
  sharePercent: z.number().min(0).max(100),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const UpdateRevenueShareSchema = z.object({
  sharePercent: z.number().min(0).max(100).optional(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const ListRevenueSharesQuerySchema = z.object({
  vendorId: z.string().uuid().optional(),
  sku: z.string().optional(),
  activeOnly: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /billing/items/:itemId
 * Get billing configuration for a marketplace item
 */
async function getBillingConfig(
  request: FastifyRequest<{ Params: z.infer<typeof MarketplaceItemIdParam> }>,
  reply: FastifyReply
) {
  const { itemId } = MarketplaceItemIdParam.parse(request.params);

  const item = await prisma.marketplaceItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      title: true,
      vendorId: true,
      pricingModel: true,
      priceCents: true,
      isFree: true,
      billingModel: true,
      billingSku: true,
      billingMetadataJson: true,
      vendor: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  if (!item) {
    return reply.status(404).send({ error: 'Marketplace item not found' });
  }

  return reply.send({
    itemId: item.id,
    title: item.title,
    vendorId: item.vendorId,
    vendorName: item.vendor.name,
    vendorType: item.vendor.type,
    pricingModel: item.pricingModel,
    priceCents: item.priceCents,
    isFree: item.isFree,
    billingModel: item.billingModel,
    billingSku: item.billingSku,
    billingMetadata: item.billingMetadataJson,
  });
}

/**
 * PATCH /billing/items/:itemId
 * Update billing configuration for a marketplace item
 */
async function updateBillingConfig(
  request: FastifyRequest<{
    Params: z.infer<typeof MarketplaceItemIdParam>;
    Body: z.infer<typeof UpdateBillingConfigSchema>;
  }>,
  reply: FastifyReply
) {
  const { itemId } = MarketplaceItemIdParam.parse(request.params);
  const body = UpdateBillingConfigSchema.parse(request.body);

  // Verify item exists
  const existing = await prisma.marketplaceItem.findUnique({
    where: { id: itemId },
    select: { id: true },
  });

  if (!existing) {
    return reply.status(404).send({ error: 'Marketplace item not found' });
  }

  // Validate billing model + SKU consistency
  if (body.billingModel && body.billingModel !== 'FREE' && !body.billingSku) {
    // Check if item already has a SKU
    const current = await prisma.marketplaceItem.findUnique({
      where: { id: itemId },
      select: { billingSku: true },
    });
    if (!current?.billingSku) {
      return reply.status(400).send({
        error: 'billingSku is required for paid billing models',
      });
    }
  }

  // Update isFree based on billing model if not explicitly set
  let isFree = body.isFree;
  if (isFree === undefined && body.billingModel) {
    isFree = body.billingModel === 'FREE';
  }

  // Build update data conditionally to handle exactOptionalPropertyTypes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};
  if (isFree !== undefined) {
    updateData.isFree = isFree;
  }
  if (body.billingModel) {
    updateData.billingModel = body.billingModel as MarketplaceBillingModel;
  }
  if (body.billingSku !== undefined) {
    updateData.billingSku = body.billingSku;
  }
  if (body.billingMetadataJson !== undefined) {
    updateData.billingMetadataJson = body.billingMetadataJson;
  }

  const updated = await prisma.marketplaceItem.update({
    where: { id: itemId },
    data: updateData,
    select: {
      id: true,
      title: true,
      isFree: true,
      billingModel: true,
      billingSku: true,
      billingMetadataJson: true,
    },
  });

  return reply.send({
    itemId: updated.id,
    title: updated.title,
    isFree: updated.isFree,
    billingModel: updated.billingModel,
    billingSku: updated.billingSku,
    billingMetadata: updated.billingMetadataJson,
  });
}

/**
 * GET /billing/revenue-shares
 * List vendor revenue share agreements
 */
async function listRevenueShares(
  request: FastifyRequest<{ Querystring: z.infer<typeof ListRevenueSharesQuerySchema> }>,
  reply: FastifyReply
) {
  const query = ListRevenueSharesQuerySchema.parse(request.query);
  const { vendorId, sku, activeOnly, page, limit } = query;

  const where: Record<string, unknown> = {};
  if (vendorId) where.vendorId = vendorId;
  if (sku) where.sku = sku;
  if (activeOnly) {
    const now = new Date();
    where.effectiveStartDate = { lte: now };
    where.OR = [{ effectiveEndDate: null }, { effectiveEndDate: { gt: now } }];
  }

  const [shares, total] = await Promise.all([
    prisma.vendorRevenueShare.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ vendor: { name: 'asc' } }, { sku: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorRevenueShare.count({ where }),
  ]);

  return reply.send({
    data: shares.map((s) => ({
      id: s.id,
      vendorId: s.vendorId,
      vendorName: s.vendor.name,
      vendorType: s.vendor.type,
      sku: s.sku,
      sharePercent: Number(s.sharePercent),
      effectiveStartDate: s.effectiveStartDate,
      effectiveEndDate: s.effectiveEndDate,
      notes: s.notes,
      createdAt: s.createdAt,
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
 * POST /billing/revenue-shares
 * Create a new vendor revenue share agreement
 */
async function createRevenueShare(
  request: FastifyRequest<{ Body: z.infer<typeof CreateRevenueShareSchema> }>,
  reply: FastifyReply
) {
  const body = CreateRevenueShareSchema.parse(request.body);
  const userId = (request as unknown as { userId?: string }).userId;

  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: body.vendorId },
    select: { id: true, name: true, type: true },
  });

  if (!vendor) {
    return reply.status(404).send({ error: 'Vendor not found' });
  }

  // Check for overlapping agreements
  const existingActive = await prisma.vendorRevenueShare.findFirst({
    where: {
      vendorId: body.vendorId,
      sku: body.sku,
      effectiveStartDate: { lte: body.effectiveStartDate ?? new Date() },
      OR: [
        { effectiveEndDate: null },
        { effectiveEndDate: { gt: body.effectiveStartDate ?? new Date() } },
      ],
    },
  });

  if (existingActive) {
    return reply.status(409).send({
      error: 'An active revenue share agreement already exists for this vendor/SKU',
      existingId: existingActive.id,
    });
  }

  const share = await prisma.vendorRevenueShare.create({
    data: {
      vendorId: body.vendorId,
      sku: body.sku,
      sharePercent: body.sharePercent,
      effectiveStartDate: body.effectiveStartDate ?? new Date(),
      effectiveEndDate: body.effectiveEndDate ?? null,
      createdByUserId: userId ?? null,
      notes: body.notes ?? null,
    },
    include: {
      vendor: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return reply.status(201).send({
    id: share.id,
    vendorId: share.vendorId,
    vendorName: share.vendor.name,
    sku: share.sku,
    sharePercent: Number(share.sharePercent),
    effectiveStartDate: share.effectiveStartDate,
    effectiveEndDate: share.effectiveEndDate,
    notes: share.notes,
    createdAt: share.createdAt,
  });
}

/**
 * PATCH /billing/revenue-shares/:shareId
 * Update a vendor revenue share agreement
 */
async function updateRevenueShare(
  request: FastifyRequest<{
    Params: z.infer<typeof RevenueShareIdParam>;
    Body: z.infer<typeof UpdateRevenueShareSchema>;
  }>,
  reply: FastifyReply
) {
  const { shareId } = RevenueShareIdParam.parse(request.params);
  const body = UpdateRevenueShareSchema.parse(request.body);

  const existing = await prisma.vendorRevenueShare.findUnique({
    where: { id: shareId },
  });

  if (!existing) {
    return reply.status(404).send({ error: 'Revenue share agreement not found' });
  }

  const updated = await prisma.vendorRevenueShare.update({
    where: { id: shareId },
    data: {
      ...(body.sharePercent !== undefined && { sharePercent: body.sharePercent }),
      ...(body.effectiveEndDate !== undefined && { effectiveEndDate: body.effectiveEndDate }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: {
      vendor: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return reply.send({
    id: updated.id,
    vendorId: updated.vendorId,
    vendorName: updated.vendor.name,
    sku: updated.sku,
    sharePercent: Number(updated.sharePercent),
    effectiveStartDate: updated.effectiveStartDate,
    effectiveEndDate: updated.effectiveEndDate,
    notes: updated.notes,
    updatedAt: updated.updatedAt,
  });
}

/**
 * GET /billing/vendors/:vendorId/revenue-summary
 * Get revenue summary for a vendor
 */
async function getVendorRevenueSummary(
  request: FastifyRequest<{ Params: z.infer<typeof VendorIdParam> }>,
  reply: FastifyReply
) {
  const { vendorId } = VendorIdParam.parse(request.params);

  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  if (!vendor) {
    return reply.status(404).send({ error: 'Vendor not found' });
  }

  // Get all active revenue share agreements
  const revenueShares = await prisma.vendorRevenueShare.findMany({
    where: {
      vendorId,
      effectiveStartDate: { lte: new Date() },
      OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gt: new Date() } }],
    },
  });

  // Get items with these SKUs and their install counts
  const skus = revenueShares.map((rs) => rs.sku);
  const items = await prisma.marketplaceItem.findMany({
    where: {
      vendorId,
      billingSku: { in: skus },
    },
    select: {
      id: true,
      title: true,
      billingSku: true,
      billingModel: true,
      totalInstalls: true,
      _count: {
        select: {
          installations: {
            where: { billingStatus: 'ACTIVE' },
          },
        },
      },
    },
  });

  return reply.send({
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorType: vendor.type,
    activeShareAgreements: revenueShares.map((rs) => ({
      sku: rs.sku,
      sharePercent: Number(rs.sharePercent),
      effectiveStartDate: rs.effectiveStartDate,
      effectiveEndDate: rs.effectiveEndDate,
    })),
    items: items.map((item) => ({
      itemId: item.id,
      title: item.title,
      sku: item.billingSku,
      billingModel: item.billingModel,
      totalInstalls: item.totalInstalls,
      activeInstallations: item._count.installations,
    })),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerBillingRoutes(server: FastifyInstance): Promise<void> {
  // Item billing configuration
  server.get('/billing/items/:itemId', {
    schema: {
      description: 'Get billing configuration for a marketplace item',
      tags: ['billing'],
      params: MarketplaceItemIdParam,
    },
    handler: getBillingConfig,
  });

  server.patch('/billing/items/:itemId', {
    schema: {
      description: 'Update billing configuration for a marketplace item',
      tags: ['billing'],
      params: MarketplaceItemIdParam,
      body: UpdateBillingConfigSchema,
    },
    handler: updateBillingConfig,
  });

  // Revenue shares
  server.get('/billing/revenue-shares', {
    schema: {
      description: 'List vendor revenue share agreements',
      tags: ['billing'],
      querystring: ListRevenueSharesQuerySchema,
    },
    handler: listRevenueShares,
  });

  server.post('/billing/revenue-shares', {
    schema: {
      description: 'Create a new vendor revenue share agreement',
      tags: ['billing'],
      body: CreateRevenueShareSchema,
    },
    handler: createRevenueShare,
  });

  server.patch('/billing/revenue-shares/:shareId', {
    schema: {
      description: 'Update a vendor revenue share agreement',
      tags: ['billing'],
      params: RevenueShareIdParam,
      body: UpdateRevenueShareSchema,
    },
    handler: updateRevenueShare,
  });

  // Vendor revenue summary
  server.get('/billing/vendors/:vendorId/revenue-summary', {
    schema: {
      description: 'Get revenue summary for a vendor',
      tags: ['billing'],
      params: VendorIdParam,
    },
    handler: getVendorRevenueSummary,
  });
}
