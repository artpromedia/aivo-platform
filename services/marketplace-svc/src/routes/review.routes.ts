/**
 * Review Routes - Marketplace Item Review Workflow
 *
 * Endpoints for Aivo internal reviewers to approve/reject marketplace submissions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Prisma } from '../../generated/prisma-client/index.js';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { MarketplaceVersionStatus } from '../types/index.js';
import { isValidTransition, getAllowedTransitions } from '../services/validation.service.js';

// ============================================================================
// Schema Validation
// ============================================================================

const VersionIdParam = z.object({
  versionId: z.string().uuid(),
});

const ListReviewsQuery = z.object({
  status: z.nativeEnum(MarketplaceVersionStatus).optional(),
  itemType: z.enum(['CONTENT_PACK', 'EMBEDDED_TOOL']).optional(),
  vendorType: z.enum(['AIVO', 'THIRD_PARTY']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const ReviewActionSchema = z.object({
  action: z.enum(['start_review', 'approve', 'reject', 'publish', 'deprecate']),
  notes: z.string().max(5000).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /review/pending
 * List versions pending review
 */
async function listPendingReviews(
  request: FastifyRequest<{ Querystring: z.infer<typeof ListReviewsQuery> }>,
  _reply: FastifyReply
) {
  const { status, itemType, vendorType, page, limit } = ListReviewsQuery.parse(request.query);

  // Build where clause conditionally to avoid exactOptionalPropertyTypes issues
  const where: Prisma.MarketplaceItemVersionWhereInput = {
    status: status ?? { in: ['PENDING_REVIEW', 'IN_REVIEW'] },
  };
  
  if (itemType) {
    where.marketplaceItem = {
      itemType,
      ...(vendorType && { vendor: { type: vendorType } }),
    };
  } else if (vendorType) {
    where.marketplaceItem = { vendor: { type: vendorType } };
  }

  const [versions, total] = await Promise.all([
    prisma.marketplaceItemVersion.findMany({
      where,
      include: {
        marketplaceItem: {
          include: {
            vendor: {
              select: { id: true, slug: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: [{ submittedAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.marketplaceItemVersion.count({ where }),
  ]);

  return {
    data: versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      submittedAt: v.submittedAt,
      reviewedAt: v.reviewedAt,
      item: {
        id: v.marketplaceItem.id,
        slug: v.marketplaceItem.slug,
        title: v.marketplaceItem.title,
        itemType: v.marketplaceItem.itemType,
        subjects: v.marketplaceItem.subjects,
        gradeBands: v.marketplaceItem.gradeBands,
        iconUrl: v.marketplaceItem.iconUrl,
      },
      vendor: v.marketplaceItem.vendor,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * GET /review/:versionId
 * Get version details for review
 */
async function getReviewDetails(
  request: FastifyRequest<{ Params: z.infer<typeof VersionIdParam> }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdParam.parse(request.params);

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
    include: {
      marketplaceItem: {
        include: {
          vendor: true,
          versions: {
            where: { status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
            take: 1,
          },
        },
      },
      contentPackItems: {
        orderBy: { position: 'asc' },
      },
      embeddedToolConfig: true,
      statusTransitions: {
        orderBy: { transitionedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  // Get allowed actions based on current status
  const allowedActions = getActionsForStatus(version.status);

  return {
    data: {
      ...version,
      allowedActions,
      allowedTransitions: getAllowedTransitions(version.status),
    },
  };
}

/**
 * POST /review/:versionId/action
 * Perform a review action (start_review, approve, reject, publish)
 */
async function performReviewAction(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdParam>;
    Body: z.infer<typeof ReviewActionSchema>;
  }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdParam.parse(request.params);
  const { action, notes } = ReviewActionSchema.parse(request.body);

  // TODO: Extract user ID from JWT
  const userId = 'reviewer-user-id';

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
    include: { marketplaceItem: true },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  // Map action to target status
  const targetStatus = getTargetStatus(action);
  if (!targetStatus) {
    return reply.status(400).send({ error: 'Invalid action' });
  }

  // Validate transition
  if (!isValidTransition(version.status, targetStatus)) {
    return reply.status(400).send({
      error: `Cannot ${action} from status ${version.status}`,
      allowedTransitions: getAllowedTransitions(version.status),
    });
  }

  // Build update data based on action
  const updateData = buildUpdateData(action, targetStatus, userId, notes);

  // Build transition data conditionally
  const transitionData: Parameters<typeof prisma.versionStatusTransition.create>[0]['data'] = {
    versionId,
    fromStatus: version.status,
    toStatus: targetStatus,
    transitionedByUserId: userId,
  };
  if (notes !== undefined) {
    transitionData.reason = notes;
  }

  // Perform the update
  const [updated] = await prisma.$transaction([
    prisma.marketplaceItemVersion.update({
      where: { id: versionId },
      data: updateData,
    }),
    prisma.versionStatusTransition.create({
      data: transitionData,
    }),
    // If publishing, also activate the item
    ...(action === 'publish'
      ? [
          prisma.marketplaceItem.update({
            where: { id: version.marketplaceItemId },
            data: { isActive: true },
          }),
        ]
      : []),
  ]);

  return {
    data: updated,
    message: `Version ${action} successfully`,
  };
}

/**
 * GET /review/stats
 * Get review queue statistics
 */
async function getReviewStats(_request: FastifyRequest, _reply: FastifyReply) {
  const [pending, inReview, approvedToday, rejectedToday] = await Promise.all([
    prisma.marketplaceItemVersion.count({
      where: { status: 'PENDING_REVIEW' },
    }),
    prisma.marketplaceItemVersion.count({
      where: { status: 'IN_REVIEW' },
    }),
    prisma.marketplaceItemVersion.count({
      where: {
        status: 'APPROVED',
        reviewedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.marketplaceItemVersion.count({
      where: {
        status: 'REJECTED',
        reviewedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  // Get breakdown by vendor type
  const byVendorType = await prisma.marketplaceItemVersion.groupBy({
    by: ['status'],
    where: {
      status: { in: ['PENDING_REVIEW', 'IN_REVIEW'] },
    },
    _count: true,
  });

  return {
    data: {
      pending,
      inReview,
      total: pending + inReview,
      approvedToday,
      rejectedToday,
      byStatus: byVendorType,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActionsForStatus(status: string): string[] {
  switch (status) {
    case 'PENDING_REVIEW':
      return ['start_review', 'reject'];
    case 'IN_REVIEW':
      return ['approve', 'reject'];
    case 'APPROVED':
      return ['publish'];
    case 'PUBLISHED':
      return ['deprecate'];
    default:
      return [];
  }
}

function getTargetStatus(action: string): MarketplaceVersionStatus | null {
  switch (action) {
    case 'start_review':
      return MarketplaceVersionStatus.IN_REVIEW;
    case 'approve':
      return MarketplaceVersionStatus.APPROVED;
    case 'reject':
      return MarketplaceVersionStatus.REJECTED;
    case 'publish':
      return MarketplaceVersionStatus.PUBLISHED;
    case 'deprecate':
      return MarketplaceVersionStatus.DEPRECATED;
    default:
      return null;
  }
}

function buildUpdateData(
  action: string,
  targetStatus: MarketplaceVersionStatus,
  userId: string,
  notes?: string
): Record<string, unknown> {
  const base = {
    status: targetStatus,
  };

  switch (action) {
    case 'start_review':
      return {
        ...base,
        reviewedByUserId: userId,
      };
    case 'approve':
      return {
        ...base,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        approvedByUserId: userId,
        reviewNotes: notes,
      };
    case 'reject':
      return {
        ...base,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewNotes: notes,
      };
    case 'publish':
      return {
        ...base,
        publishedAt: new Date(),
      };
    case 'deprecate':
      return {
        ...base,
        deprecatedAt: new Date(),
      };
    default:
      return base;
  }
}

// ============================================================================
// Route Registration
// ============================================================================

export async function reviewRoutes(fastify: FastifyInstance) {
  // List pending reviews
  fastify.get('/review/pending', listPendingReviews);

  // Get review stats
  fastify.get('/review/stats', getReviewStats);

  // Get version details for review
  fastify.get('/review/:versionId', getReviewDetails);

  // Perform review action
  fastify.post('/review/:versionId/action', performReviewAction);
}
