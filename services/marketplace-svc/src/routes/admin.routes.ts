/**
 * Admin Routes - Review Workflow & Platform Administration
 *
 * Endpoints for marketplace item review, approval, and administration.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { InstallationStatus, MarketplaceVersionStatus } from '../types/index.js';

// ============================================================================
// Schema Validation
// ============================================================================

const VersionIdSchema = z.object({
  versionId: z.string().uuid(),
});

const InstallationIdSchema = z.object({
  installationId: z.string().uuid(),
});

const ReviewDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(2000).optional(),
});

const InstallationApprovalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(2000).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /admin/review-queue
 * List items pending review
 */
async function getReviewQueue(
  request: FastifyRequest<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>,
  _reply: FastifyReply
) {
  const { limit = '50', offset = '0' } = request.query;

  const pendingVersions = await prisma.marketplaceItemVersion.findMany({
    where: {
      status: MarketplaceVersionStatus.PENDING_REVIEW,
    },
    include: {
      marketplaceItem: {
        select: {
          slug: true,
          title: true,
          itemType: true,
          vendor: {
            select: {
              name: true,
              slug: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: { submittedAt: 'asc' }, // FIFO queue
    take: Number.parseInt(limit, 10),
    skip: Number.parseInt(offset, 10),
  });

  const total = await prisma.marketplaceItemVersion.count({
    where: {
      status: MarketplaceVersionStatus.PENDING_REVIEW,
    },
  });

  return {
    data: pendingVersions.map((v) => ({
      versionId: v.id,
      version: v.version,
      displayName: v.displayName,
      submittedAt: v.submittedAt,
      item: v.marketplaceItem,
    })),
    pagination: {
      total,
      limit: Number.parseInt(limit, 10),
      offset: Number.parseInt(offset, 10),
    },
  };
}

/**
 * GET /admin/review-queue/:versionId
 * Get version details for review
 */
async function getVersionForReview(
  request: FastifyRequest<{ Params: z.infer<typeof VersionIdSchema> }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
    include: {
      marketplaceItem: {
        include: {
          vendor: true,
          versions: {
            where: {
              status: MarketplaceVersionStatus.PUBLISHED,
            },
            orderBy: { publishedAt: 'desc' },
            take: 1,
          },
        },
      },
      contentPackItems: true,
      embeddedToolConfig: true,
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  return {
    version,
    previousPublishedVersion: version.marketplaceItem.versions[0] ?? null,
  };
}

/**
 * POST /admin/review-queue/:versionId/review
 * Submit review decision (approve/reject)
 */
async function reviewVersion(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdSchema>;
    Body: z.infer<typeof ReviewDecisionSchema>;
  }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);
  const { decision, notes } = ReviewDecisionSchema.parse(request.body);

  const reviewerId = request.user?.id ?? '00000000-0000-0000-0000-000000000000';

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.status !== MarketplaceVersionStatus.PENDING_REVIEW) {
    return reply.status(400).send({
      error: 'Version is not pending review',
      currentStatus: version.status,
    });
  }

  const newStatus =
    decision === 'APPROVE' ? MarketplaceVersionStatus.APPROVED : MarketplaceVersionStatus.REJECTED;

  const updated = await prisma.marketplaceItemVersion.update({
    where: { id: versionId },
    data: {
      status: newStatus,
      reviewedAt: new Date(),
      reviewedByUserId: reviewerId,
      reviewNotes: notes ?? null,
    },
  });

  request.log.info({ versionId, decision, reviewerId }, 'Version reviewed');

  return {
    versionId: updated.id,
    status: updated.status,
    reviewedAt: updated.reviewedAt,
  };
}

/**
 * POST /admin/versions/:versionId/publish
 * Publish an approved version
 */
async function publishVersion(
  request: FastifyRequest<{ Params: z.infer<typeof VersionIdSchema> }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
    include: {
      marketplaceItem: true,
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.status !== MarketplaceVersionStatus.APPROVED) {
    return reply.status(400).send({
      error: 'Version must be approved before publishing',
      currentStatus: version.status,
    });
  }

  const updated = await prisma.marketplaceItemVersion.update({
    where: { id: versionId },
    data: {
      status: MarketplaceVersionStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  request.log.info({ versionId, itemSlug: version.marketplaceItem.slug }, 'Version published');

  return {
    versionId: updated.id,
    status: updated.status,
    publishedAt: updated.publishedAt,
  };
}

/**
 * POST /admin/versions/:versionId/deprecate
 * Deprecate a published version
 */
async function deprecateVersion(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdSchema>;
    Body: { reason?: string };
  }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);
  const { reason } = request.body;

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  if (version.status !== MarketplaceVersionStatus.PUBLISHED) {
    return reply.status(400).send({
      error: 'Can only deprecate published versions',
      currentStatus: version.status,
    });
  }

  const updated = await prisma.marketplaceItemVersion.update({
    where: { id: versionId },
    data: {
      status: MarketplaceVersionStatus.DEPRECATED,
      deprecatedAt: new Date(),
      deprecationReason: reason ?? null,
    },
  });

  request.log.info({ versionId, reason }, 'Version deprecated');

  return {
    versionId: updated.id,
    status: updated.status,
    deprecatedAt: updated.deprecatedAt,
  };
}

/**
 * GET /admin/installation-approvals
 * List installations pending approval
 */
async function getInstallationApprovals(
  request: FastifyRequest<{
    Querystring: {
      tenantId?: string;
      limit?: string;
      offset?: string;
    };
  }>,
  _reply: FastifyReply
) {
  const { tenantId, limit = '50', offset = '0' } = request.query;

  const pendingInstallations = await prisma.marketplaceInstallation.findMany({
    where: {
      status: InstallationStatus.PENDING_APPROVAL,
      ...(tenantId && { tenantId }),
    },
    include: {
      marketplaceItem: {
        select: {
          slug: true,
          title: true,
          itemType: true,
          vendor: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      },
      version: {
        select: {
          version: true,
          displayName: true,
        },
      },
    },
    orderBy: { installedAt: 'asc' },
    take: Number.parseInt(limit, 10),
    skip: Number.parseInt(offset, 10),
  });

  const total = await prisma.marketplaceInstallation.count({
    where: {
      status: InstallationStatus.PENDING_APPROVAL,
      ...(tenantId && { tenantId }),
    },
  });

  return {
    data: pendingInstallations,
    pagination: {
      total,
      limit: Number.parseInt(limit, 10),
      offset: Number.parseInt(offset, 10),
    },
  };
}

/**
 * POST /admin/installation-approvals/:installationId
 * Approve or reject an installation
 */
async function reviewInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof InstallationIdSchema>;
    Body: z.infer<typeof InstallationApprovalSchema>;
  }>,
  reply: FastifyReply
) {
  const { installationId } = InstallationIdSchema.parse(request.params);
  const { decision, reason } = InstallationApprovalSchema.parse(request.body);

  const approverUserId = request.user?.id ?? '00000000-0000-0000-0000-000000000000';

  const installation = await prisma.marketplaceInstallation.findUnique({
    where: { id: installationId },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  if (installation.status !== InstallationStatus.PENDING_APPROVAL) {
    return reply.status(400).send({
      error: 'Installation is not pending approval',
      currentStatus: installation.status,
    });
  }

  const newStatus = decision === 'APPROVE' ? InstallationStatus.ACTIVE : InstallationStatus.REVOKED;

  const updated = await prisma.marketplaceInstallation.update({
    where: { id: installationId },
    data: {
      status: newStatus,
      approvedByUserId: decision === 'APPROVE' ? approverUserId : null,
      approvedAt: decision === 'APPROVE' ? new Date() : null,
      statusTransitions: {
        create: {
          fromStatus: InstallationStatus.PENDING_APPROVAL,
          toStatus: newStatus,
          transitionedByUserId: approverUserId,
          ...(reason && { reason }),
        },
      },
    },
  });

  request.log.info({ installationId, decision, approverUserId }, 'Installation reviewed');

  return {
    installationId: updated.id,
    status: updated.status,
  };
}

/**
 * GET /admin/stats
 * Get marketplace statistics
 */
async function getStats(_request: FastifyRequest, _reply: FastifyReply) {
  const [
    totalItems,
    totalVendors,
    totalInstallations,
    pendingReviews,
    pendingInstallationApprovals,
    itemsByType,
    topInstalled,
  ] = await Promise.all([
    prisma.marketplaceItem.count({ where: { isActive: true } }),
    prisma.vendor.count({ where: { isActive: true } }),
    prisma.marketplaceInstallation.count({
      where: { status: InstallationStatus.ACTIVE },
    }),
    prisma.marketplaceItemVersion.count({
      where: { status: MarketplaceVersionStatus.PENDING_REVIEW },
    }),
    prisma.marketplaceInstallation.count({
      where: { status: InstallationStatus.PENDING_APPROVAL },
    }),
    prisma.marketplaceItem.groupBy({
      by: ['itemType'],
      _count: true,
      where: { isActive: true },
    }),
    prisma.marketplaceItem.findMany({
      where: { isActive: true },
      orderBy: { totalInstalls: 'desc' },
      take: 10,
      select: {
        slug: true,
        title: true,
        itemType: true,
        totalInstalls: true,
      },
    }),
  ]);

  return {
    summary: {
      totalItems,
      totalVendors,
      totalInstallations,
      pendingReviews,
      pendingInstallationApprovals,
    },
    itemsByType: itemsByType.map((g) => ({
      type: g.itemType,
      count: g._count,
    })),
    topInstalled,
  };
}

// ============================================================================
// Plugin Registration
// ============================================================================

export async function adminRoutes(fastify: FastifyInstance) {
  // Review workflow
  fastify.get('/admin/review-queue', getReviewQueue);
  fastify.get('/admin/review-queue/:versionId', getVersionForReview);
  fastify.post('/admin/review-queue/:versionId/review', reviewVersion);

  // Version management
  fastify.post('/admin/versions/:versionId/publish', publishVersion);
  fastify.post('/admin/versions/:versionId/deprecate', deprecateVersion);

  // Installation approvals
  fastify.get('/admin/installation-approvals', getInstallationApprovals);
  fastify.post('/admin/installation-approvals/:installationId', reviewInstallation);

  // Stats
  fastify.get('/admin/stats', getStats);
}
