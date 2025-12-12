/**
 * Catalog Routes - Marketplace Discovery & Search
 *
 * Public endpoints for browsing and searching the marketplace catalog.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { config } from '../config.js';
import {
  MarketplaceItemType,
  MarketplaceSubject,
  MarketplaceGradeBand,
  MarketplaceModality,
  PricingModel,
  SafetyCertification,
  MarketplaceVersionStatus,
} from '../types/index.js';

// ============================================================================
// Schema Validation
// ============================================================================

const CatalogSearchSchema = z.object({
  query: z.string().optional(),
  itemType: z.nativeEnum(MarketplaceItemType).optional(),
  subjects: z.array(z.nativeEnum(MarketplaceSubject)).optional(),
  gradeBands: z.array(z.nativeEnum(MarketplaceGradeBand)).optional(),
  modalities: z.array(z.nativeEnum(MarketplaceModality)).optional(),
  pricingModel: z.nativeEnum(PricingModel).optional(),
  safetyCert: z.nativeEnum(SafetyCertification).optional(),
  vendorId: z.string().uuid().optional(),
  isFeatured: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z.enum(['relevance', 'rating', 'installs', 'newest', 'title']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(config.defaultPageSize),
});

const ItemSlugSchema = z.object({
  slug: z.string(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /catalog
 * Browse/search marketplace items
 */
async function searchCatalog(
  request: FastifyRequest<{ Querystring: z.infer<typeof CatalogSearchSchema> }>,
  _reply: FastifyReply
) {
  const query = CatalogSearchSchema.parse(request.query);
  const skip = (query.page - 1) * query.pageSize;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isActive: true,
  };

  if (query.itemType) where.itemType = query.itemType;
  if (query.vendorId) where.vendorId = query.vendorId;
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  if (query.pricingModel) where.pricingModel = query.pricingModel;
  if (query.safetyCert) where.safetyCert = query.safetyCert;
  if (query.minRating) where.avgRating = { gte: query.minRating };
  
  // Array filters (has any of)
  if (query.subjects?.length) {
    where.subjects = { hasSome: query.subjects };
  }
  if (query.gradeBands?.length) {
    where.gradeBands = { hasSome: query.gradeBands };
  }
  if (query.modalities?.length) {
    where.modalities = { hasSome: query.modalities };
  }

  // Text search
  if (query.query) {
    where.OR = [
      { title: { contains: query.query, mode: 'insensitive' } },
      { shortDescription: { contains: query.query, mode: 'insensitive' } },
      { searchKeywords: { has: query.query.toLowerCase() } },
    ];
  }

  // Build orderBy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;
  switch (query.sortBy) {
    case 'rating':
      orderBy = { avgRating: query.sortOrder };
      break;
    case 'installs':
      orderBy = { totalInstalls: query.sortOrder };
      break;
    case 'newest':
      orderBy = { createdAt: query.sortOrder };
      break;
    case 'title':
      orderBy = { title: query.sortOrder };
      break;
    default:
      // relevance: featured first, then by installs
      orderBy = [{ isFeatured: 'desc' }, { totalInstalls: 'desc' }];
  }

  const [items, total] = await Promise.all([
    prisma.marketplaceItem.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
      },
      orderBy,
      skip,
      take: query.pageSize,
    }),
    prisma.marketplaceItem.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      itemType: item.itemType,
      title: item.title,
      shortDescription: item.shortDescription,
      subjects: item.subjects,
      gradeBands: item.gradeBands,
      iconUrl: item.iconUrl,
      pricingModel: item.pricingModel,
      priceCents: item.priceCents,
      safetyCert: item.safetyCert,
      avgRating: item.avgRating,
      totalInstalls: item.totalInstalls,
      isFeatured: item.isFeatured,
      vendor: item.vendor,
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
 * GET /catalog/:slug
 * Get detailed item information
 */
async function getItemBySlug(
  request: FastifyRequest<{ Params: z.infer<typeof ItemSlugSchema> }>,
  reply: FastifyReply
) {
  const { slug } = ItemSlugSchema.parse(request.params);

  const item = await prisma.marketplaceItem.findUnique({
    where: { slug },
    include: {
      vendor: true,
      versions: {
        where: { status: MarketplaceVersionStatus.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        take: 1,
      },
      reviews: {
        where: { isApproved: true },
        select: { rating: true },
      },
    },
  });

  if (!item || !item.isActive) {
    return reply.status(404).send({ error: 'Item not found' });
  }

  // Calculate rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of item.reviews) {
    const rating = review.rating as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[rating]++;
  }

  const latestVersion = item.versions[0] ?? null;

  return {
    id: item.id,
    slug: item.slug,
    itemType: item.itemType,
    title: item.title,
    shortDescription: item.shortDescription,
    longDescription: item.longDescription,
    subjects: item.subjects,
    gradeBands: item.gradeBands,
    modalities: item.modalities,
    iconUrl: item.iconUrl,
    screenshotsJson: item.screenshotsJson,
    pricingModel: item.pricingModel,
    priceCents: item.priceCents,
    safetyCert: item.safetyCert,
    metadataJson: item.metadataJson,
    searchKeywords: item.searchKeywords,
    avgRating: item.avgRating,
    totalInstalls: item.totalInstalls,
    isFeatured: item.isFeatured,
    vendor: {
      id: item.vendor.id,
      slug: item.vendor.slug,
      name: item.vendor.name,
      type: item.vendor.type,
      logoUrl: item.vendor.logoUrl,
      description: item.vendor.description,
      websiteUrl: item.vendor.websiteUrl,
    },
    latestVersion: latestVersion
      ? {
          id: latestVersion.id,
          version: latestVersion.version,
          changelog: latestVersion.changelog,
          publishedAt: latestVersion.publishedAt,
        }
      : null,
    reviewStats: {
      totalReviews: item.reviews.length,
      avgRating: item.avgRating,
      ratingDistribution,
    },
  };
}

/**
 * GET /catalog/:slug/versions
 * Get version history for an item
 */
async function getItemVersions(
  request: FastifyRequest<{ Params: z.infer<typeof ItemSlugSchema> }>,
  reply: FastifyReply
) {
  const { slug } = ItemSlugSchema.parse(request.params);

  const item = await prisma.marketplaceItem.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!item || !item.isActive) {
    return reply.status(404).send({ error: 'Item not found' });
  }

  const versions = await prisma.marketplaceItemVersion.findMany({
    where: {
      marketplaceItemId: item.id,
      status: { in: [MarketplaceVersionStatus.PUBLISHED, MarketplaceVersionStatus.DEPRECATED] },
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      version: true,
      status: true,
      changelog: true,
      publishedAt: true,
      deprecatedAt: true,
    },
  });

  return { data: versions };
}

/**
 * GET /catalog/:slug/reviews
 * Get reviews for an item
 */
async function getItemReviews(
  request: FastifyRequest<{
    Params: z.infer<typeof ItemSlugSchema>;
    Querystring: { page?: number; pageSize?: number };
  }>,
  reply: FastifyReply
) {
  const { slug } = ItemSlugSchema.parse(request.params);
  const page = request.query.page ?? 1;
  const pageSize = Math.min(request.query.pageSize ?? 10, 50);
  const skip = (page - 1) * pageSize;

  const item = await prisma.marketplaceItem.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!item || !item.isActive) {
    return reply.status(404).send({ error: 'Item not found' });
  }

  const [reviews, total] = await Promise.all([
    prisma.marketplaceReview.findMany({
      where: {
        marketplaceItemId: item.id,
        isApproved: true,
      },
      orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.marketplaceReview.count({
      where: {
        marketplaceItemId: item.id,
        isApproved: true,
      },
    }),
  ]);

  return {
    data: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isVerifiedInstall: r.isVerifiedInstall,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * GET /catalog/featured
 * Get featured items
 */
async function getFeaturedItems(_request: FastifyRequest, _reply: FastifyReply) {
  const items = await prisma.marketplaceItem.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    include: {
      vendor: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { totalInstalls: 'desc' },
    take: 12,
  });

  return {
    data: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      itemType: item.itemType,
      title: item.title,
      shortDescription: item.shortDescription,
      subjects: item.subjects,
      gradeBands: item.gradeBands,
      iconUrl: item.iconUrl,
      pricingModel: item.pricingModel,
      avgRating: item.avgRating,
      totalInstalls: item.totalInstalls,
      vendor: item.vendor,
    })),
  };
}

/**
 * GET /catalog/collections
 * Get curated collections
 */
async function getCollections(_request: FastifyRequest, _reply: FastifyReply) {
  const collections = await prisma.marketplaceCollection.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      items: {
        orderBy: { position: 'asc' },
        take: 6,
      },
    },
  });

  return {
    data: collections.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      targetAudience: c.targetAudience,
      itemCount: c.items.length,
    })),
  };
}

// ============================================================================
// Plugin Registration
// ============================================================================

export async function catalogRoutes(fastify: FastifyInstance) {
  // Search & browse
  fastify.get('/', searchCatalog);
  fastify.get('/featured', getFeaturedItems);
  fastify.get('/collections', getCollections);
  
  // Item details
  fastify.get('/:slug', getItemBySlug);
  fastify.get('/:slug/versions', getItemVersions);
  fastify.get('/:slug/reviews', getItemReviews);
}
