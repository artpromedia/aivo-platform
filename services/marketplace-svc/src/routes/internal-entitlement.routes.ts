/**
 * Internal Entitlements Routes
 *
 * Hot-path internal API for cross-service entitlement checks.
 * Called by:
 * - AI Orchestrator (filtering partner content in recommendations)
 * - Content Service (verifying LO access)
 * - Session Service (validating learner access at session start)
 * - Teacher Planning (content picker filtering)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { EntitlementService } from '../services/entitlement.service.js';
import type {
  EntitlementCheckRequest,
  BatchEntitlementCheckRequest,
  MarketplaceGradeBand,
} from '../types/index.js';
import { MarketplaceGradeBand as GradeBandEnum } from '../types/index.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build an entitlement check request, filtering out undefined values.
 * This is needed because Zod's optional fields produce `string | undefined`
 * but the service types expect `string?` (property not present).
 */
function buildCheckRequest(data: {
  tenantId: string;
  loId: string;
  learnerId: string | undefined;
  schoolId: string | undefined;
  classroomId: string | undefined;
  gradeBand: MarketplaceGradeBand | undefined;
}): EntitlementCheckRequest {
  const req: EntitlementCheckRequest = {
    tenantId: data.tenantId,
    loId: data.loId,
  };
  if (data.learnerId) req.learnerId = data.learnerId;
  if (data.schoolId) req.schoolId = data.schoolId;
  if (data.classroomId) req.classroomId = data.classroomId;
  if (data.gradeBand) req.gradeBand = data.gradeBand;
  return req;
}

function buildBatchCheckRequest(data: {
  tenantId: string;
  loIds: string[];
  learnerId: string | undefined;
  schoolId: string | undefined;
  classroomId: string | undefined;
  gradeBand: MarketplaceGradeBand | undefined;
}): BatchEntitlementCheckRequest {
  const req: BatchEntitlementCheckRequest = {
    tenantId: data.tenantId,
    loIds: data.loIds,
  };
  if (data.learnerId) req.learnerId = data.learnerId;
  if (data.schoolId) req.schoolId = data.schoolId;
  if (data.classroomId) req.classroomId = data.classroomId;
  if (data.gradeBand) req.gradeBand = data.gradeBand;
  return req;
}

function buildMarketplaceItemCheckRequest(data: {
  tenantId: string;
  marketplaceItemId: string;
  learnerId: string | undefined;
  schoolId: string | undefined;
  classroomId: string | undefined;
  gradeBand: MarketplaceGradeBand | undefined;
}): {
  tenantId: string;
  marketplaceItemId: string;
  learnerId?: string;
  schoolId?: string;
  classroomId?: string;
  gradeBand?: MarketplaceGradeBand;
} {
  const req: {
    tenantId: string;
    marketplaceItemId: string;
    learnerId?: string;
    schoolId?: string;
    classroomId?: string;
    gradeBand?: MarketplaceGradeBand;
  } = {
    tenantId: data.tenantId,
    marketplaceItemId: data.marketplaceItemId,
  };
  if (data.learnerId) req.learnerId = data.learnerId;
  if (data.schoolId) req.schoolId = data.schoolId;
  if (data.classroomId) req.classroomId = data.classroomId;
  if (data.gradeBand) req.gradeBand = data.gradeBand;
  return req;
}

function buildEntitledItemsQuery(query: {
  tenantId: string;
  schoolId: string | undefined;
  classroomId: string | undefined;
  gradeBand: MarketplaceGradeBand | undefined;
  subject: string | undefined;
  itemType: 'CONTENT_PACK' | 'EMBEDDED_TOOL' | undefined;
  limit: number;
  offset: number;
}): {
  tenantId: string;
  schoolId?: string;
  classroomId?: string;
  gradeBand?: MarketplaceGradeBand;
  subject?: string;
  itemType?: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  limit: number;
  offset: number;
} {
  const req: {
    tenantId: string;
    schoolId?: string;
    classroomId?: string;
    gradeBand?: MarketplaceGradeBand;
    subject?: string;
    itemType?: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
    limit: number;
    offset: number;
  } = {
    tenantId: query.tenantId,
    limit: query.limit,
    offset: query.offset,
  };
  if (query.schoolId) req.schoolId = query.schoolId;
  if (query.classroomId) req.classroomId = query.classroomId;
  if (query.gradeBand) req.gradeBand = query.gradeBand;
  if (query.subject) req.subject = query.subject;
  if (query.itemType) req.itemType = query.itemType;
  return req;
}

function buildLoIdsQuery(data: {
  schoolId: string | undefined;
  gradeBand: MarketplaceGradeBand | undefined;
  activeOnly?: boolean;
}): { schoolId?: string; gradeBand?: MarketplaceGradeBand; activeOnly?: boolean } {
  const req: { schoolId?: string; gradeBand?: MarketplaceGradeBand; activeOnly?: boolean } = {};
  if (data.schoolId) req.schoolId = data.schoolId;
  if (data.gradeBand) req.gradeBand = data.gradeBand;
  if (data.activeOnly !== undefined) req.activeOnly = data.activeOnly;
  return req;
}
// ============================================================================
// Schema Validation
// ============================================================================

const EntitlementCheckSchema = z.object({
  tenantId: z.string().uuid(),
  loId: z.string().uuid().optional(),
  loIds: z.array(z.string().uuid()).optional(),
  marketplaceItemId: z.string().uuid().optional(),
  learnerId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  gradeBand: z.nativeEnum(GradeBandEnum).optional(),
  subject: z.string().optional(),
});

const BatchEntitlementCheckSchema = z.object({
  tenantId: z.string().uuid(),
  loIds: z.array(z.string().uuid()).min(1).max(500),
  learnerId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  gradeBand: z.nativeEnum(GradeBandEnum).optional(),
});

const EntitledContentQuerySchema = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  gradeBand: z.nativeEnum(GradeBandEnum).optional(),
  subject: z.string().optional(),
  itemType: z.enum(['CONTENT_PACK', 'EMBEDDED_TOOL']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const EntitledLosQuerySchema = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  gradeBand: z.nativeEnum(GradeBandEnum).optional(),
});

const FilterLosQuerySchema = z.object({
  tenantId: z.string().uuid(),
  loIds: z.array(z.string().uuid()).min(1).max(1000),
  learnerId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  gradeBand: z.nativeEnum(GradeBandEnum).optional(),
  includeNativeContent: z.boolean().optional().default(true),
});

// ============================================================================
// Service Instance
// ============================================================================

const entitlementService = new EntitlementService();

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /internal/entitlements/check
 *
 * Single entitlement check for a specific LO or marketplace item.
 * Returns whether the tenant is entitled to access the content.
 *
 * Primary hot-path endpoint for other services.
 */
async function checkEntitlement(
  request: FastifyRequest<{ Body: z.infer<typeof EntitlementCheckSchema> }>,
  reply: FastifyReply
) {
  const data = EntitlementCheckSchema.parse(request.body);

  // Validate that at least one content identifier is provided
  if (!data.loId && !data.loIds?.length && !data.marketplaceItemId) {
    return reply.status(400).send({
      error: 'Must provide loId, loIds, or marketplaceItemId',
    });
  }

  // Single LO check
  if (data.loId) {
    const result = await entitlementService.checkEntitlement(
      buildCheckRequest({
        tenantId: data.tenantId,
        loId: data.loId,
        learnerId: data.learnerId,
        schoolId: data.schoolId,
        classroomId: data.classroomId,
        gradeBand: data.gradeBand,
      })
    );

    return {
      isAllowed: result.entitled,
      reason: result.reason ?? 'ALLOWED',
      license: result.license,
      seatRequired: result.seatRequired,
      seatAvailable: result.seatAvailable,
    };
  }

  // Batch LO check (if loIds provided)
  if (data.loIds?.length) {
    const result = await entitlementService.batchCheckEntitlements(
      buildBatchCheckRequest({
        tenantId: data.tenantId,
        loIds: data.loIds,
        learnerId: data.learnerId,
        schoolId: data.schoolId,
        classroomId: data.classroomId,
        gradeBand: data.gradeBand,
      })
    );

    // Transform to simpler response format
    const entitledLoIds: string[] = [];
    const deniedLoIds: Record<string, string> = {};

    for (const [loId, check] of Object.entries(result.results)) {
      if (check.entitled) {
        entitledLoIds.push(loId);
      } else {
        deniedLoIds[loId] = check.reason ?? 'UNKNOWN';
      }
    }

    return {
      isAllowed: entitledLoIds.length > 0,
      entitledLoIds,
      deniedLoIds,
      totalRequested: data.loIds.length,
      totalEntitled: entitledLoIds.length,
    };
  }

  // Marketplace item check (not tied to specific LO)
  if (data.marketplaceItemId) {
    const result = await entitlementService.checkMarketplaceItemEntitlement(
      buildMarketplaceItemCheckRequest({
        tenantId: data.tenantId,
        marketplaceItemId: data.marketplaceItemId,
        learnerId: data.learnerId,
        schoolId: data.schoolId,
        classroomId: data.classroomId,
        gradeBand: data.gradeBand,
      })
    );

    return {
      isAllowed: result.entitled,
      reason: result.reason ?? 'ALLOWED',
      license: result.license,
      seatRequired: result.seatRequired,
      seatAvailable: result.seatAvailable,
      packs: result.entitledPacks,
    };
  }

  return reply.status(400).send({ error: 'Invalid request' });
}

/**
 * POST /internal/entitlements/batch-check
 *
 * Optimized batch check for multiple LOs.
 * Used by content picker to filter large lists efficiently.
 */
async function batchCheckEntitlements(
  request: FastifyRequest<{ Body: z.infer<typeof BatchEntitlementCheckSchema> }>,
  _reply: FastifyReply
) {
  const data = BatchEntitlementCheckSchema.parse(request.body);

  const result = await entitlementService.batchCheckEntitlements(
    buildBatchCheckRequest({
      tenantId: data.tenantId,
      loIds: data.loIds,
      learnerId: data.learnerId,
      schoolId: data.schoolId,
      classroomId: data.classroomId,
      gradeBand: data.gradeBand,
    })
  );

  // Transform to optimized response
  const entitled: string[] = [];
  const denied: { loId: string; reason: string }[] = [];

  for (const [loId, check] of Object.entries(result.results)) {
    if (check.entitled) {
      entitled.push(loId);
    } else {
      denied.push({ loId, reason: check.reason ?? 'UNKNOWN' });
    }
  }

  return {
    entitled,
    denied,
    summary: {
      totalRequested: data.loIds.length,
      totalEntitled: entitled.length,
      totalDenied: denied.length,
    },
  };
}

/**
 * POST /internal/entitlements/entitled-content
 *
 * Get all entitled partner content for a tenant context.
 * Returns marketplace items the tenant has active licenses for.
 * Used by content picker's partner content tab.
 */
async function getEntitledContent(
  request: FastifyRequest<{ Body: z.infer<typeof EntitledContentQuerySchema> }>,
  _reply: FastifyReply
) {
  const query = EntitledContentQuerySchema.parse(request.body);

  const result = await entitlementService.getEntitledMarketplaceItems(
    buildEntitledItemsQuery({
      tenantId: query.tenantId,
      schoolId: query.schoolId,
      classroomId: query.classroomId,
      gradeBand: query.gradeBand,
      subject: query.subject,
      itemType: query.itemType,
      limit: query.limit,
      offset: query.offset,
    })
  );

  return {
    data: result.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      shortDescription: item.shortDescription,
      itemType: item.itemType,
      subjects: item.subjects,
      gradeBands: item.gradeBands,
      iconUrl: item.iconUrl,
      vendor: {
        id: item.vendor.id,
        slug: item.vendor.slug,
        name: item.vendor.name,
        logoUrl: item.vendor.logoUrl,
      },
      license: {
        id: item.license.id,
        status: item.license.status,
        seatLimit: item.license.seatLimit,
        seatsUsed: item.license.seatsUsed,
        validUntil: item.license.validUntil,
      },
      // Content pack specific
      loCount: item.loCount,
      // Accessibility & safety
      accessibilityTags: item.accessibilityTags,
      safetyTags: item.safetyTags,
    })),
    pagination: {
      total: result.total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + result.items.length < result.total,
    },
  };
}

/**
 * POST /internal/entitlements/entitled-los
 *
 * Get all entitled LO IDs from partner content for a tenant.
 * Returns just the LO IDs for efficient filtering.
 */
async function getEntitledLoIds(
  request: FastifyRequest<{ Body: z.infer<typeof EntitledLosQuerySchema> }>,
  _reply: FastifyReply
) {
  const data = EntitledLosQuerySchema.parse(request.body);
  const { tenantId, schoolId, gradeBand } = data;

  const loIds = await entitlementService.getEntitledLoIds(
    tenantId,
    buildLoIdsQuery({
      schoolId,
      gradeBand,
      activeOnly: true,
    })
  );

  return {
    loIds,
    count: loIds.length,
  };
}

/**
 * POST /internal/entitlements/filter-los
 *
 * Filter a list of LO IDs to only those the tenant is entitled to.
 * Optimized for AI orchestrator's content filtering pipeline.
 */
async function filterLosByEntitlement(
  request: FastifyRequest<{ Body: z.infer<typeof FilterLosQuerySchema> }>,
  _reply: FastifyReply
) {
  const data = FilterLosQuerySchema.parse(request.body);
  const {
    tenantId,
    loIds,
    learnerId,
    schoolId,
    classroomId,
    gradeBand,
    includeNativeContent = true,
  } = data;

  // Get batch entitlement results
  const result = await entitlementService.batchCheckEntitlements(
    buildBatchCheckRequest({
      tenantId,
      loIds,
      learnerId,
      schoolId,
      classroomId,
      gradeBand,
    })
  );

  // Filter to only entitled LOs
  const entitledLoIds: string[] = [];
  const partnerLoIds: string[] = [];
  const nativeLoIds: string[] = [];

  for (const [loId, check] of Object.entries(result.results)) {
    if (check.entitled) {
      entitledLoIds.push(loId);
      if (check.license) {
        partnerLoIds.push(loId);
      } else {
        nativeLoIds.push(loId);
      }
    }
  }

  // If including native content, we return the full entitled list
  // Otherwise just partner content
  const filteredLoIds = includeNativeContent ? entitledLoIds : partnerLoIds;

  return {
    filteredLoIds,
    partnerLoIds,
    nativeLoIds,
    summary: {
      inputCount: loIds.length,
      outputCount: filteredLoIds.length,
      partnerCount: partnerLoIds.length,
      nativeCount: nativeLoIds.length,
      filteredOutCount: loIds.length - entitledLoIds.length,
    },
  };
}

// ============================================================================
// Route Registration
// ============================================================================

export async function internalEntitlementRoutes(app: FastifyInstance) {
  // Primary entitlement check endpoint
  app.post(
    '/internal/entitlements/check',
    {
      schema: {
        description: 'Check entitlement for content access',
        tags: ['internal', 'entitlements'],
      },
    },
    checkEntitlement
  );

  // Batch entitlement check
  app.post(
    '/internal/entitlements/batch-check',
    {
      schema: {
        description: 'Batch check entitlements for multiple LOs',
        tags: ['internal', 'entitlements'],
      },
    },
    batchCheckEntitlements
  );

  // Get entitled marketplace items
  app.post(
    '/internal/entitlements/entitled-content',
    {
      schema: {
        description: 'Get entitled marketplace items for a tenant',
        tags: ['internal', 'entitlements'],
      },
    },
    getEntitledContent
  );

  // Get entitled LO IDs
  app.post(
    '/internal/entitlements/entitled-los',
    {
      schema: {
        description: 'Get all entitled LO IDs from partner content',
        tags: ['internal', 'entitlements'],
      },
    },
    getEntitledLoIds
  );

  // Filter LOs by entitlement
  app.post(
    '/internal/entitlements/filter-los',
    {
      schema: {
        description: 'Filter LO IDs by entitlement status',
        tags: ['internal', 'entitlements'],
      },
    },
    filterLosByEntitlement
  );
}
