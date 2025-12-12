/**
 * Vendor Routes - Publisher Management
 *
 * Endpoints for vendor profile management and item publishing.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { VendorType } from '../types/index.js';

// ============================================================================
// Schema Validation
// ============================================================================

const VendorSlugSchema = z.object({
  slug: z.string(),
});

const CreateVendorSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(200),
  type: z.nativeEnum(VendorType),
  contactEmail: z.string().email(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().max(1000).optional(),
});

const UpdateVendorSchema = CreateVendorSchema.partial().omit({ slug: true, type: true });

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /vendors
 * List all active vendors
 */
async function listVendors(
  request: FastifyRequest<{ Querystring: { type?: VendorType } }>,
  _reply: FastifyReply
) {
  const { type } = request.query;

  const vendors = await prisma.vendor.findMany({
    where: {
      isActive: true,
      ...(type && { type }),
    },
    orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
  });

  return {
    data: vendors.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      type: v.type,
      logoUrl: v.logoUrl,
      description: v.description,
      websiteUrl: v.websiteUrl,
      isVerified: v.isVerified,
    })),
  };
}

/**
 * GET /vendors/:slug
 * Get vendor details and their published items
 */
async function getVendorBySlug(
  request: FastifyRequest<{ Params: z.infer<typeof VendorSlugSchema> }>,
  reply: FastifyReply
) {
  const { slug } = VendorSlugSchema.parse(request.params);

  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      marketplaceItems: {
        where: { isActive: true },
        orderBy: { totalInstalls: 'desc' },
        select: {
          id: true,
          slug: true,
          itemType: true,
          title: true,
          shortDescription: true,
          subjects: true,
          gradeBands: true,
          iconUrl: true,
          pricingModel: true,
          avgRating: true,
          totalInstalls: true,
        },
      },
    },
  });

  if (!vendor || !vendor.isActive) {
    return reply.status(404).send({ error: 'Vendor not found' });
  }

  return {
    id: vendor.id,
    slug: vendor.slug,
    name: vendor.name,
    type: vendor.type,
    contactEmail: vendor.contactEmail,
    websiteUrl: vendor.websiteUrl,
    logoUrl: vendor.logoUrl,
    description: vendor.description,
    isVerified: vendor.isVerified,
    items: vendor.marketplaceItems,
  };
}

/**
 * POST /vendors
 * Register a new vendor (admin only)
 */
async function createVendor(
  request: FastifyRequest<{ Body: z.infer<typeof CreateVendorSchema> }>,
  reply: FastifyReply
) {
  // TODO: Check admin authorization
  const data = CreateVendorSchema.parse(request.body);

  const existing = await prisma.vendor.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    return reply.status(409).send({ error: 'Vendor slug already exists' });
  }

  const vendor = await prisma.vendor.create({
    data: {
      slug: data.slug,
      name: data.name,
      type: data.type,
      contactEmail: data.contactEmail,
      websiteUrl: data.websiteUrl ?? null,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      isVerified: data.type === VendorType.AIVO, // Auto-verify Aivo vendors
    },
  });

  request.log.info({ vendorId: vendor.id, slug: vendor.slug }, 'Vendor created');

  return reply.status(201).send(vendor);
}

/**
 * PATCH /vendors/:slug
 * Update vendor profile
 */
async function updateVendor(
  request: FastifyRequest<{
    Params: z.infer<typeof VendorSlugSchema>;
    Body: z.infer<typeof UpdateVendorSchema>;
  }>,
  reply: FastifyReply
) {
  // TODO: Check authorization (vendor owner or admin)
  const { slug } = VendorSlugSchema.parse(request.params);
  const data = UpdateVendorSchema.parse(request.body);

  const vendor = await prisma.vendor.findUnique({
    where: { slug },
  });

  if (!vendor) {
    return reply.status(404).send({ error: 'Vendor not found' });
  }

  const updated = await prisma.vendor.update({
    where: { slug },
    data: {
      name: data.name,
      contactEmail: data.contactEmail,
      websiteUrl: data.websiteUrl,
      logoUrl: data.logoUrl,
      description: data.description,
    },
  });

  return updated;
}

// ============================================================================
// Plugin Registration
// ============================================================================

export async function vendorRoutes(fastify: FastifyInstance) {
  fastify.get('/', listVendors);
  fastify.get('/:slug', getVendorBySlug);
  fastify.post('/', createVendor);
  fastify.patch('/:slug', updateVendor);
}
