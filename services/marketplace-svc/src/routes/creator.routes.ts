/**
 * Creator Routes - Item Submission & Version Management
 *
 * Endpoints for content creators and partners to manage their marketplace items.
 * Supports the Draft → Submit → Review → Approve/Reject workflow.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { Prisma } from '../../generated/prisma-client/index.js';
import { prisma } from '../prisma.js';
import {
  ALLOWED_TOOL_SCOPES,
  validateSubmission,
  validateContentPackConsistency,
} from '../services/validation.service.js';
import {
  MarketplaceItemType,
  MarketplaceSubject,
  MarketplaceGradeBand,
  MarketplaceModality,
  PricingModel,
  EmbeddedToolLaunchType,
} from '../types/index.js';
import { extractUserId } from '../middleware/auth.js';

// ============================================================================
// Schema Validation
// ============================================================================

const VendorIdParam = z.object({
  vendorId: z.string().uuid(),
});

const ItemIdParam = z.object({
  vendorId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const VersionIdParam = z.object({
  vendorId: z.string().uuid(),
  itemId: z.string().uuid(),
  versionId: z.string().uuid(),
});

const CreateItemSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(3).max(200),
  shortDescription: z.string().min(10).max(500),
  longDescription: z.string().min(50).max(10000),
  itemType: z.nativeEnum(MarketplaceItemType),
  subjects: z.array(z.nativeEnum(MarketplaceSubject)).min(1),
  gradeBands: z.array(z.nativeEnum(MarketplaceGradeBand)).min(1),
  modalities: z.array(z.nativeEnum(MarketplaceModality)).optional(),
  iconUrl: z.string().url().optional(),
  screenshotsJson: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().max(200).optional(),
        order: z.number().int().min(0),
      })
    )
    .optional(),
  pricingModel: z.nativeEnum(PricingModel).optional(),
  priceCents: z.number().int().min(0).optional(),
  metadataJson: z
    .object({
      standards: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
      accessibility: z.array(z.string()).optional(),
      minAge: z.number().int().min(0).max(21).optional(),
      maxAge: z.number().int().min(0).max(21).optional(),
      estimatedDuration: z.number().int().min(1).optional(),
    })
    .passthrough()
    .optional(),
  searchKeywords: z.array(z.string()).optional(),
});

const UpdateItemSchema = CreateItemSchema.partial().omit({
  slug: true,
  itemType: true,
});

const CreateVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (e.g., 1.0.0)'),
  changelog: z.string().max(5000).optional(),
});

// Content Pack specific
const AddContentPackItemsSchema = z.object({
  items: z.array(
    z.object({
      loVersionId: z.string().uuid(),
      loId: z.string().uuid().optional(),
      position: z.number().int().min(0),
      isHighlight: z.boolean().optional(),
      metadataJson: z
        .object({
          titleOverride: z.string().max(200).optional(),
          description: z.string().max(1000).optional(),
          tags: z.array(z.string()).optional(),
        })
        .optional(),
    })
  ),
});

// Embedded Tool specific
const SetToolConfigSchema = z.object({
  launchUrl: z.string().url(),
  launchType: z.nativeEnum(EmbeddedToolLaunchType),
  requiredScopes: z.array(z.string()),
  optionalScopes: z.array(z.string()).optional(),
  configSchemaJson: z
    .object({
      type: z.literal('object'),
      properties: z.record(z.unknown()).optional(),
      required: z.array(z.string()).optional(),
    })
    .optional(),
  defaultConfigJson: z.record(z.unknown()).optional(),
  webhookUrl: z.string().url().optional(),
  cspDirectives: z.string().max(2000).optional(),
  sandboxAttributes: z.array(z.string()).optional(),
});

const SubmitForReviewSchema = z.object({
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify that the requesting user has access to the vendor
 * In a real implementation, this would check JWT claims
 */
async function verifyVendorAccess(
  vendorId: string,
  _userId: string
): Promise<{ vendor: { id: string; slug: string; type: string } } | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, isActive: true },
    select: { id: true, slug: true, type: true },
  });
  // TODO: Check user is associated with this vendor via auth claims
  return vendor ? { vendor } : null;
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /creators/:vendorId/items
 * List all items for a vendor (creator's view)
 */
async function listCreatorItems(
  request: FastifyRequest<{ Params: z.infer<typeof VendorIdParam> }>,
  reply: FastifyReply
) {
  const { vendorId } = VendorIdParam.parse(request.params);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  const items = await prisma.marketplaceItem.findMany({
    where: { vendorId },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          version: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          publishedAt: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    data: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      itemType: item.itemType,
      subjects: item.subjects,
      gradeBands: item.gradeBands,
      iconUrl: item.iconUrl,
      isActive: item.isActive,
      latestVersion: item.versions[0] ?? null,
      updatedAt: item.updatedAt,
    })),
  };
}

/**
 * POST /creators/:vendorId/items
 * Create a new marketplace item
 */
async function createItem(
  request: FastifyRequest<{
    Params: z.infer<typeof VendorIdParam>;
    Body: z.infer<typeof CreateItemSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId } = VendorIdParam.parse(request.params);
  const body = CreateItemSchema.parse(request.body);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  // Check slug uniqueness
  const existingSlug = await prisma.marketplaceItem.findUnique({
    where: { slug: body.slug },
  });
  if (existingSlug) {
    return reply.status(400).send({ error: 'Slug already exists' });
  }

  // Build create data, handling optional fields carefully
  const createData: Parameters<typeof prisma.marketplaceItem.create>[0]['data'] = {
    vendorId,
    slug: body.slug,
    title: body.title,
    shortDescription: body.shortDescription,
    longDescription: body.longDescription,
    itemType: body.itemType,
    subjects: body.subjects,
    gradeBands: body.gradeBands,
    modalities: body.modalities ?? [],
    screenshotsJson: body.screenshotsJson ?? [],
    pricingModel: body.pricingModel ?? 'FREE',
    searchKeywords: body.searchKeywords ?? [],
    isActive: false, // Not active until published
    versions: {
      create: {
        version: '1.0.0',
        status: 'DRAFT',
        submittedByUserId: userId,
      },
    },
  };

  // Add optional fields only if defined
  if (body.iconUrl !== undefined) createData.iconUrl = body.iconUrl;
  if (body.priceCents !== undefined) createData.priceCents = body.priceCents;
  if (body.metadataJson !== undefined) {
    createData.metadataJson = structuredClone(body.metadataJson) as Prisma.InputJsonValue;
  }

  // Create item with initial version
  const item = await prisma.marketplaceItem.create({
    data: createData,
    include: {
      versions: true,
    },
  });

  return reply.status(201).send({
    data: {
      id: item.id,
      slug: item.slug,
      title: item.title,
      itemType: item.itemType,
      latestVersion: item.versions[0],
    },
  });
}

/**
 * GET /creators/:vendorId/items/:itemId
 * Get item details for editing
 */
async function getCreatorItem(
  request: FastifyRequest<{ Params: z.infer<typeof ItemIdParam> }>,
  reply: FastifyReply
) {
  const { vendorId, itemId } = ItemIdParam.parse(request.params);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  const item = await prisma.marketplaceItem.findFirst({
    where: { id: itemId, vendorId },
    include: {
      vendor: {
        select: { id: true, slug: true, name: true },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        include: {
          contentPackItems: {
            orderBy: { position: 'asc' },
          },
          embeddedToolConfig: true,
          statusTransitions: {
            orderBy: { transitionedAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  });

  if (!item) {
    return reply.status(404).send({ error: 'Item not found' });
  }

  return { data: item };
}

/**
 * PATCH /creators/:vendorId/items/:itemId
 * Update item metadata (only if latest version is DRAFT)
 */
async function updateItem(
  request: FastifyRequest<{
    Params: z.infer<typeof ItemIdParam>;
    Body: z.infer<typeof UpdateItemSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId, itemId } = ItemIdParam.parse(request.params);
  const body = UpdateItemSchema.parse(request.body);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  // Check item exists and latest version is DRAFT
  const item = await prisma.marketplaceItem.findFirst({
    where: { id: itemId, vendorId },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!item) {
    return reply.status(404).send({ error: 'Item not found' });
  }

  const latestVersion = item.versions[0];
  if (latestVersion?.status !== 'DRAFT') {
    return reply.status(400).send({
      error: 'Can only edit items with a DRAFT version. Create a new version first.',
    });
  }

  // Build update data conditionally to handle exactOptionalPropertyTypes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
  if (body.longDescription !== undefined) updateData.longDescription = body.longDescription;
  if (body.subjects !== undefined) updateData.subjects = body.subjects;
  if (body.gradeBands !== undefined) updateData.gradeBands = body.gradeBands;
  if (body.modalities !== undefined) updateData.modalities = body.modalities;
  if (body.iconUrl !== undefined) updateData.iconUrl = body.iconUrl;
  if (body.screenshotsJson !== undefined) updateData.screenshotsJson = body.screenshotsJson;
  if (body.pricingModel !== undefined) updateData.pricingModel = body.pricingModel;
  if (body.priceCents !== undefined) updateData.priceCents = body.priceCents;
  if (body.metadataJson !== undefined) updateData.metadataJson = body.metadataJson;
  if (body.searchKeywords !== undefined) updateData.searchKeywords = body.searchKeywords;

  const updated = await prisma.marketplaceItem.update({
    where: { id: itemId },
    data: updateData,
  });

  return { data: updated };
}

/**
 * POST /creators/:vendorId/items/:itemId/versions
 * Create a new version of an existing item
 */
async function createVersion(
  request: FastifyRequest<{
    Params: z.infer<typeof ItemIdParam>;
    Body: z.infer<typeof CreateVersionSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId, itemId } = ItemIdParam.parse(request.params);
  const body = CreateVersionSchema.parse(request.body);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  // Check item exists
  const item = await prisma.marketplaceItem.findFirst({
    where: { id: itemId, vendorId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          contentPackItems: true,
          embeddedToolConfig: true,
        },
      },
    },
  });

  if (!item) {
    return reply.status(404).send({ error: 'Item not found' });
  }

  // Check version doesn't already exist
  const existingVersion = await prisma.marketplaceItemVersion.findUnique({
    where: {
      marketplaceItemId_version: {
        marketplaceItemId: itemId,
        version: body.version,
      },
    },
  });

  if (existingVersion) {
    return reply.status(400).send({ error: 'Version already exists' });
  }

  // Check no existing DRAFT version
  const draftVersion = await prisma.marketplaceItemVersion.findFirst({
    where: {
      marketplaceItemId: itemId,
      status: 'DRAFT',
    },
  });

  if (draftVersion) {
    return reply.status(400).send({
      error: 'A DRAFT version already exists. Complete or discard it first.',
    });
  }

  // Create new version, optionally copying content from previous
  const previousVersion = item.versions[0];

  // Build base version data
  const versionCreateData: Parameters<typeof prisma.marketplaceItemVersion.create>[0]['data'] = {
    marketplaceItemId: itemId,
    version: body.version,
    status: 'DRAFT',
    submittedByUserId: userId,
  };

  // Add optional changelog
  if (body.changelog !== undefined) {
    versionCreateData.changelog = body.changelog;
  }

  // Copy content pack items if applicable
  if (
    previousVersion &&
    item.itemType === 'CONTENT_PACK' &&
    previousVersion.contentPackItems.length > 0
  ) {
    versionCreateData.contentPackItems = {
      create: previousVersion.contentPackItems.map((cp) => {
        type ContentPackItemCreate = Omit<
          Parameters<typeof prisma.contentPackItem.create>[0]['data'],
          'version' | 'versionId' | 'marketplaceItemVersionId'
        >;
        const cpItem: ContentPackItemCreate = {
          loVersionId: cp.loVersionId,
          loId: cp.loId ?? null,
          position: cp.position,
          isHighlight: cp.isHighlight,
          metadataJson:
            cp.metadataJson === null
              ? Prisma.JsonNull
              : (structuredClone(cp.metadataJson) as Prisma.InputJsonValue),
        };
        return cpItem;
      }),
    };
  }

  // Copy tool config if applicable
  if (previousVersion?.embeddedToolConfig && item.itemType === 'EMBEDDED_TOOL') {
    type ToolConfigCreate = Parameters<typeof prisma.embeddedToolConfig.create>[0]['data'];
    const toolConfig: Omit<ToolConfigCreate, 'version' | 'versionId'> = {
      launchUrl: previousVersion.embeddedToolConfig.launchUrl,
      launchType: previousVersion.embeddedToolConfig.launchType,
      requiredScopes: previousVersion.embeddedToolConfig.requiredScopes,
      optionalScopes: previousVersion.embeddedToolConfig.optionalScopes,
      webhookUrl: previousVersion.embeddedToolConfig.webhookUrl,
      cspDirectives: previousVersion.embeddedToolConfig.cspDirectives,
      sandboxAttributes: previousVersion.embeddedToolConfig.sandboxAttributes,
    };
    if (previousVersion.embeddedToolConfig.configSchemaJson !== null) {
      toolConfig.configSchemaJson = previousVersion.embeddedToolConfig.configSchemaJson;
    }
    if (previousVersion.embeddedToolConfig.defaultConfigJson !== null) {
      toolConfig.defaultConfigJson = previousVersion.embeddedToolConfig.defaultConfigJson;
    }
    versionCreateData.embeddedToolConfig = {
      create: toolConfig,
    };
  }

  const version = await prisma.marketplaceItemVersion.create({
    data: versionCreateData,
  });

  return reply.status(201).send({ data: version });
}

/**
 * POST /creators/:vendorId/items/:itemId/versions/:versionId/content-pack-items
 * Add/update content pack items
 */
async function setContentPackItems(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdParam>;
    Body: z.infer<typeof AddContentPackItemsSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId, itemId, versionId } = VersionIdParam.parse(request.params);
  const body = AddContentPackItemsSchema.parse(request.body);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  // Verify version is DRAFT and item is CONTENT_PACK
  const version = await prisma.marketplaceItemVersion.findFirst({
    where: {
      id: versionId,
      marketplaceItem: { id: itemId, vendorId },
    },
    include: {
      marketplaceItem: { select: { itemType: true } },
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.marketplaceItem.itemType !== 'CONTENT_PACK') {
    return reply.status(400).send({ error: 'This endpoint is only for CONTENT_PACK items' });
  }

  if (version.status !== 'DRAFT') {
    return reply.status(400).send({ error: 'Can only modify DRAFT versions' });
  }

  // Replace all content pack items
  await prisma.$transaction([
    prisma.contentPackItem.deleteMany({
      where: { marketplaceItemVersionId: versionId },
    }),
    prisma.contentPackItem.createMany({
      data: body.items.map((item) => ({
        marketplaceItemVersionId: versionId,
        loVersionId: item.loVersionId,
        loId: item.loId ?? null,
        position: item.position,
        isHighlight: item.isHighlight ?? false,
        metadataJson: item.metadataJson ?? {},
      })),
    }),
  ]);

  const updated = await prisma.contentPackItem.findMany({
    where: { marketplaceItemVersionId: versionId },
    orderBy: { position: 'asc' },
  });

  return { data: updated };
}

/**
 * PUT /creators/:vendorId/items/:itemId/versions/:versionId/tool-config
 * Set embedded tool configuration
 */
async function setToolConfig(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdParam>;
    Body: z.infer<typeof SetToolConfigSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId, itemId, versionId } = VersionIdParam.parse(request.params);
  const body = SetToolConfigSchema.parse(request.body);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  // Verify version is DRAFT and item is EMBEDDED_TOOL
  const version = await prisma.marketplaceItemVersion.findFirst({
    where: {
      id: versionId,
      marketplaceItem: { id: itemId, vendorId },
    },
    include: {
      marketplaceItem: { select: { itemType: true } },
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.marketplaceItem.itemType !== 'EMBEDDED_TOOL') {
    return reply.status(400).send({ error: 'This endpoint is only for EMBEDDED_TOOL items' });
  }

  if (version.status !== 'DRAFT') {
    return reply.status(400).send({ error: 'Can only modify DRAFT versions' });
  }

  // Validate scopes are allowed
  const invalidScopes = body.requiredScopes.filter(
    (s) => !ALLOWED_TOOL_SCOPES.includes(s as (typeof ALLOWED_TOOL_SCOPES)[number])
  );
  if (invalidScopes.length > 0) {
    return reply.status(400).send({
      error: `Invalid scopes: ${invalidScopes.join(', ')}`,
      allowedScopes: ALLOWED_TOOL_SCOPES,
    });
  }

  // Upsert tool config
  const config = await prisma.embeddedToolConfig.upsert({
    where: { marketplaceItemVersionId: versionId },
    create: {
      marketplaceItemVersionId: versionId,
      launchUrl: body.launchUrl,
      launchType: body.launchType,
      requiredScopes: body.requiredScopes,
      optionalScopes: body.optionalScopes ?? [],
      sandboxAttributes: body.sandboxAttributes ?? [],
      configSchemaJson: body.configSchemaJson
        ? (structuredClone(body.configSchemaJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      defaultConfigJson: body.defaultConfigJson
        ? (structuredClone(body.defaultConfigJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
      ...(body.cspDirectives !== undefined && { cspDirectives: body.cspDirectives }),
    },
    update: {
      launchUrl: body.launchUrl,
      launchType: body.launchType,
      requiredScopes: body.requiredScopes,
      optionalScopes: body.optionalScopes ?? [],
      sandboxAttributes: body.sandboxAttributes ?? [],
      configSchemaJson: body.configSchemaJson
        ? (structuredClone(body.configSchemaJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      defaultConfigJson: body.defaultConfigJson
        ? (structuredClone(body.defaultConfigJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
      ...(body.cspDirectives !== undefined && { cspDirectives: body.cspDirectives }),
    },
  });

  return { data: config };
}

/**
 * POST /creators/:vendorId/items/:itemId/versions/:versionId/submit
 * Submit version for review
 */
async function submitForReview(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdParam>;
    Body: z.infer<typeof SubmitForReviewSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId, itemId, versionId } = VersionIdParam.parse(request.params);
  const body = SubmitForReviewSchema.parse(request.body);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  // Get version with all related data
  const version = await prisma.marketplaceItemVersion.findFirst({
    where: {
      id: versionId,
      marketplaceItem: { id: itemId, vendorId },
    },
    include: {
      marketplaceItem: true,
      contentPackItems: true,
      embeddedToolConfig: true,
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.status !== 'DRAFT') {
    return reply.status(400).send({ error: 'Can only submit DRAFT versions' });
  }

  // Run validation
  const validation = validateSubmission(
    version as Parameters<typeof validateSubmission>[0],
    version.marketplaceItem as Parameters<typeof validateSubmission>[1]
  );
  if (!validation.valid) {
    return reply.status(400).send({
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  // Run consistency checks for Aivo content packs
  if (version.marketplaceItem.itemType === 'CONTENT_PACK' && access.vendor.type === 'AIVO') {
    const consistencyCheck = await validateContentPackConsistency(version.id);
    if (!consistencyCheck.valid) {
      return reply.status(400).send({
        error: 'Content pack consistency check failed',
        warnings: consistencyCheck.warnings,
      });
    }
  }

  // Update status
  const updated = await prisma.$transaction([
    prisma.marketplaceItemVersion.update({
      where: { id: versionId },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        submittedByUserId: userId,
      },
    }),
    prisma.versionStatusTransition.create({
      data: {
        versionId,
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_REVIEW',
        transitionedByUserId: userId,
        ...(body.notes !== undefined && { reason: body.notes }),
      },
    }),
  ]);

  return {
    data: updated[0],
    message: 'Version submitted for review',
  };
}

/**
 * DELETE /creators/:vendorId/items/:itemId/versions/:versionId
 * Discard a DRAFT version
 */
async function discardVersion(
  request: FastifyRequest<{ Params: z.infer<typeof VersionIdParam> }>,
  reply: FastifyReply
) {
  const { vendorId, itemId, versionId } = VersionIdParam.parse(request.params);

  // Extract user ID from JWT
  const userId = extractUserId(request);
  const access = await verifyVendorAccess(vendorId, userId);
  if (!access) {
    return reply.status(403).send({ error: 'Access denied to this vendor' });
  }

  const version = await prisma.marketplaceItemVersion.findFirst({
    where: {
      id: versionId,
      marketplaceItem: { id: itemId, vendorId },
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.status !== 'DRAFT' && version.status !== 'REJECTED') {
    return reply.status(400).send({
      error: 'Can only discard DRAFT or REJECTED versions',
    });
  }

  await prisma.marketplaceItemVersion.delete({
    where: { id: versionId },
  });

  return reply.status(204).send();
}

// ============================================================================
// Route Registration
// ============================================================================

export async function creatorRoutes(fastify: FastifyInstance) {
  // List creator's items
  fastify.get(
    '/creators/:vendorId/items',
    {
      schema: {
        description: 'List all items for a vendor (creator view)',
        tags: ['Creator'],
        params: { type: 'object', properties: { vendorId: { type: 'string', format: 'uuid' } } },
      },
    },
    listCreatorItems
  );

  // Create new item
  fastify.post('/creators/:vendorId/items', createItem);

  // Get item details
  fastify.get('/creators/:vendorId/items/:itemId', getCreatorItem);

  // Update item
  fastify.patch('/creators/:vendorId/items/:itemId', updateItem);

  // Create new version
  fastify.post('/creators/:vendorId/items/:itemId/versions', createVersion);

  // Set content pack items
  fastify.post(
    '/creators/:vendorId/items/:itemId/versions/:versionId/content-pack-items',
    setContentPackItems
  );

  // Set tool config
  fastify.put('/creators/:vendorId/items/:itemId/versions/:versionId/tool-config', setToolConfig);

  // Submit for review
  fastify.post('/creators/:vendorId/items/:itemId/versions/:versionId/submit', submitForReview);

  // Discard version
  fastify.delete('/creators/:vendorId/items/:itemId/versions/:versionId', discardVersion);
}
