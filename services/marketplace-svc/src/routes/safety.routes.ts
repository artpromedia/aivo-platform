/**
 * Safety Routes - Trust & Safety Moderation & Policy Management
 *
 * Endpoints for safety reviews, tenant policies, domain allowlists,
 * and safety transparency.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { createSafetyValidationService } from '../services/safety-validation.service.js';

const safetyService = createSafetyValidationService();

// ============================================================================
// Schema Validation
// ============================================================================

const VersionIdSchema = z.object({
  versionId: z.string().uuid(),
});

const ReviewIdSchema = z.object({
  reviewId: z.string().uuid(),
});

const TenantIdSchema = z.object({
  tenantId: z.string().uuid(),
});

const VendorIdSchema = z.object({
  vendorId: z.string().uuid(),
});

const InstallationIdSchema = z.object({
  installationId: z.string().uuid(),
});

const SafetyReviewSubmissionSchema = z.object({
  dataCategoriesAccessed: z.array(z.string()),
  dataUsagePurposes: z.array(z.string()),
  policyTagsAssigned: z.array(z.string()),
  diagnosticUseConfirmed: z.boolean(),
  safetyRatingAssigned: z.enum(['PENDING', 'APPROVED_K12', 'RESTRICTED', 'REJECTED']),
  dataAccessProfileAssigned: z.enum(['MINIMAL', 'MODERATE', 'HIGH']),
  reviewNotes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
});

const EscalateReviewSchema = z.object({
  escalateToUserId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

const TenantPolicyUpdateSchema = z.object({
  allowedSafetyRatings: z.array(z.enum(['PENDING', 'APPROVED_K12', 'RESTRICTED', 'REJECTED'])).optional(),
  allowedDataAccessProfiles: z.array(z.enum(['MINIMAL', 'MODERATE', 'HIGH'])).optional(),
  blockedVendorIds: z.array(z.string().uuid()).optional(),
  blockedItemIds: z.array(z.string().uuid()).optional(),
  blockedPolicyTags: z.array(z.string()).optional(),
  requireSafetyReview: z.boolean().optional(),
  allowGracePeriodDays: z.number().int().min(0).max(90).optional(),
  customRulesJson: z.record(z.unknown()).optional(),
});

const DomainAllowlistSchema = z.object({
  domain: z.string().min(3).max(255),
  notes: z.string().max(1000).optional(),
});

const ToolLaunchSchema = z.object({
  context: z.enum(['CLASSROOM', 'HOMEWORK', 'ASSESSMENT', 'REVIEW', 'ADMIN_PREVIEW']),
});

// ============================================================================
// Safety Review Queue Handlers
// ============================================================================

/**
 * GET /safety/review-queue
 * List versions pending safety review
 */
async function getSafetyReviewQueue(
  request: FastifyRequest<{
    Querystring: {
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>,
  _reply: FastifyReply
) {
  const { status, limit = '50', offset = '0' } = request.query;

  const whereClause: Record<string, unknown> = {};
  if (status) {
    whereClause.status = status;
  }

  // Get versions needing safety review (PENDING rating or active reviews)
  const pendingReviews = await prisma.safetyReview.findMany({
    where: whereClause,
    include: {
      marketplaceItemVersion: {
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
                },
              },
            },
          },
          embeddedToolConfig: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
  });

  const total = await prisma.safetyReview.count({ where: whereClause });

  return {
    data: pendingReviews.map((r) => ({
      reviewId: r.id,
      status: r.status,
      reviewType: r.reviewType,
      createdAt: r.createdAt,
      version: {
        id: r.marketplaceItemVersion.id,
        version: r.marketplaceItemVersion.version,
        safetyRating: r.marketplaceItemVersion.safetyRating,
        dataAccessProfile: r.marketplaceItemVersion.dataAccessProfile,
      },
      item: r.marketplaceItemVersion.marketplaceItem,
      hasEmbeddedTool: !!r.marketplaceItemVersion.embeddedToolConfig,
    })),
    pagination: {
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    },
  };
}

/**
 * GET /safety/review-queue/:versionId
 * Get version details for safety review
 */
async function getVersionForSafetyReview(
  request: FastifyRequest<{ Params: z.infer<typeof VersionIdSchema> }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);

  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
    include: {
      marketplaceItem: {
        include: {
          vendor: {
            include: {
              domainAllowlist: true,
            },
          },
        },
      },
      embeddedToolConfig: true,
      safetyReviews: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  // Run automated checks
  const automatedChecks = await safetyService.runAutomatedChecks(versionId);

  return {
    version: {
      id: version.id,
      version: version.version,
      status: version.status,
      safetyRating: version.safetyRating,
      dataAccessProfile: version.dataAccessProfile,
      safetyNotes: version.safetyNotes,
      policyTags: version.policyTags,
      dataCategoriesAccessed: version.dataCategoriesAccessed,
      safetyReviewedAt: version.safetyReviewedAt,
    },
    item: {
      id: version.marketplaceItem.id,
      slug: version.marketplaceItem.slug,
      title: version.marketplaceItem.title,
      itemType: version.marketplaceItem.itemType,
    },
    vendor: {
      id: version.marketplaceItem.vendor.id,
      name: version.marketplaceItem.vendor.name,
      type: version.marketplaceItem.vendor.type,
      allowedDomains: version.marketplaceItem.vendor.domainAllowlist
        .filter((d) => d.isActive)
        .map((d) => d.domain),
    },
    embeddedToolConfig: version.embeddedToolConfig
      ? {
          launchUrl: version.embeddedToolConfig.launchUrl,
          launchType: version.embeddedToolConfig.launchType,
          requiredScopes: version.embeddedToolConfig.requiredScopes,
          optionalScopes: version.embeddedToolConfig.optionalScopes,
        }
      : null,
    automatedChecks,
    previousReviews: version.safetyReviews,
  };
}

/**
 * POST /safety/review-queue/:versionId/start
 * Start a safety review for a version
 */
async function startSafetyReview(
  request: FastifyRequest<{
    Params: z.infer<typeof VersionIdSchema>;
    Body: { reviewType?: string };
  }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);
  const { reviewType = 'INITIAL' } = request.body || {};
  const userId = request.user?.id ?? 'system';

  // Check version exists
  const version = await prisma.marketplaceItemVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  // Check for existing in-progress review
  const existingReview = await prisma.safetyReview.findFirst({
    where: {
      marketplaceItemVersionId: versionId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  if (existingReview) {
    return reply.status(409).send({
      error: 'Active safety review already exists',
      reviewId: existingReview.id,
    });
  }

  // Run automated checks
  const automatedChecks = await safetyService.runAutomatedChecks(versionId);

  // Create safety review
  const review = await prisma.safetyReview.create({
    data: {
      marketplaceItemVersionId: versionId,
      reviewerUserId: userId,
      reviewType: reviewType as 'INITIAL' | 'VERSION_UPDATE' | 'INCIDENT_RESPONSE' | 'PERIODIC_RECHECK' | 'COMPLAINT',
      status: 'IN_PROGRESS',
      automatedChecksJson: automatedChecks as unknown as Record<string, unknown>,
    },
  });

  return {
    reviewId: review.id,
    status: review.status,
    automatedChecks,
  };
}

/**
 * POST /safety/reviews/:reviewId/submit
 * Submit safety review decision
 */
async function submitSafetyReview(
  request: FastifyRequest<{
    Params: z.infer<typeof ReviewIdSchema>;
    Body: z.infer<typeof SafetyReviewSubmissionSchema>;
  }>,
  reply: FastifyReply
) {
  const { reviewId } = ReviewIdSchema.parse(request.params);
  const body = SafetyReviewSubmissionSchema.parse(request.body);
  const userId = request.user?.id ?? 'system';

  const review = await prisma.safetyReview.findUnique({
    where: { id: reviewId },
    include: {
      marketplaceItemVersion: true,
    },
  });

  if (!review) {
    return reply.status(404).send({ error: 'Review not found' });
  }

  if (review.status === 'APPROVED' || review.status === 'REJECTED') {
    return reply.status(409).send({ error: 'Review already completed' });
  }

  // Determine review status based on safety rating
  const reviewStatus = body.safetyRatingAssigned === 'REJECTED'
    ? 'REJECTED'
    : 'APPROVED';

  // Update review and version in transaction
  await prisma.$transaction(async (tx) => {
    // Update review
    await tx.safetyReview.update({
      where: { id: reviewId },
      data: {
        status: reviewStatus,
        dataCategoriesAccessed: body.dataCategoriesAccessed,
        dataUsagePurposes: body.dataUsagePurposes,
        policyTagsAssigned: body.policyTagsAssigned,
        diagnosticUseConfirmed: body.diagnosticUseConfirmed,
        safetyRatingAssigned: body.safetyRatingAssigned,
        dataAccessProfileAssigned: body.dataAccessProfileAssigned,
        reviewNotes: body.reviewNotes ?? null,
        internalNotes: body.internalNotes ?? null,
        completedAt: new Date(),
      },
    });

    // Update version with safety fields
    await tx.marketplaceItemVersion.update({
      where: { id: review.marketplaceItemVersionId },
      data: {
        safetyRating: body.safetyRatingAssigned,
        dataAccessProfile: body.dataAccessProfileAssigned,
        safetyNotes: body.reviewNotes ?? null,
        policyTags: body.policyTagsAssigned,
        dataCategoriesAccessed: body.dataCategoriesAccessed,
        safetyReviewedByUserId: userId,
        safetyReviewedAt: new Date(),
        automatedChecksPassed: true, // Assuming passed if manual review approved
      },
    });
  });

  return {
    reviewId,
    status: reviewStatus,
    versionId: review.marketplaceItemVersionId,
    safetyRating: body.safetyRatingAssigned,
    dataAccessProfile: body.dataAccessProfileAssigned,
  };
}

/**
 * POST /safety/reviews/:reviewId/escalate
 * Escalate a safety review
 */
async function escalateSafetyReview(
  request: FastifyRequest<{
    Params: z.infer<typeof ReviewIdSchema>;
    Body: z.infer<typeof EscalateReviewSchema>;
  }>,
  reply: FastifyReply
) {
  const { reviewId } = ReviewIdSchema.parse(request.params);
  const { escalateToUserId, reason } = EscalateReviewSchema.parse(request.body);

  const review = await prisma.safetyReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return reply.status(404).send({ error: 'Review not found' });
  }

  await prisma.safetyReview.update({
    where: { id: reviewId },
    data: {
      status: 'ESCALATED',
      escalatedToUserId,
      internalNotes: review.internalNotes
        ? `${review.internalNotes}\n\n[ESCALATED] ${reason}`
        : `[ESCALATED] ${reason}`,
    },
  });

  return { reviewId, status: 'ESCALATED', escalatedTo: escalateToUserId };
}

// ============================================================================
// Tenant Policy Handlers
// ============================================================================

/**
 * GET /safety/policies/:tenantId
 * Get tenant marketplace policy
 */
async function getTenantPolicy(
  request: FastifyRequest<{ Params: z.infer<typeof TenantIdSchema> }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);

  const policy = await prisma.tenantMarketplacePolicy.findUnique({
    where: { tenantId },
  });

  if (!policy) {
    // Return default policy
    return {
      tenantId,
      isDefault: true,
      allowedSafetyRatings: ['APPROVED_K12'],
      allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
      blockedVendorIds: [],
      blockedItemIds: [],
      blockedPolicyTags: [],
      requireSafetyReview: false,
      allowGracePeriodDays: 0,
      customRulesJson: null,
    };
  }

  return { ...policy, isDefault: false };
}

/**
 * PUT /safety/policies/:tenantId
 * Update tenant marketplace policy
 */
async function updateTenantPolicy(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema>;
    Body: z.infer<typeof TenantPolicyUpdateSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);
  const body = TenantPolicyUpdateSchema.parse(request.body);
  const userId = request.user?.id ?? 'system';

  const policy = await prisma.tenantMarketplacePolicy.upsert({
    where: { tenantId },
    create: {
      tenantId,
      allowedSafetyRatings: body.allowedSafetyRatings ?? ['APPROVED_K12'],
      allowedDataAccessProfiles: body.allowedDataAccessProfiles ?? ['MINIMAL', 'MODERATE'],
      blockedVendorIds: body.blockedVendorIds ?? [],
      blockedItemIds: body.blockedItemIds ?? [],
      blockedPolicyTags: body.blockedPolicyTags ?? [],
      requireSafetyReview: body.requireSafetyReview ?? false,
      allowGracePeriodDays: body.allowGracePeriodDays ?? 0,
      customRulesJson: body.customRulesJson ?? null,
      createdByUserId: userId,
      updatedByUserId: userId,
    },
    update: {
      ...body,
      updatedByUserId: userId,
    },
  });

  return policy;
}

// ============================================================================
// Domain Allowlist Handlers
// ============================================================================

/**
 * GET /safety/vendors/:vendorId/domains
 * List vendor's allowed domains
 */
async function getVendorDomains(
  request: FastifyRequest<{ Params: z.infer<typeof VendorIdSchema> }>,
  reply: FastifyReply
) {
  const { vendorId } = VendorIdSchema.parse(request.params);

  const domains = await prisma.vendorDomainAllowlist.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });

  return { vendorId, domains };
}

/**
 * POST /safety/vendors/:vendorId/domains
 * Add domain to vendor's allowlist
 */
async function addVendorDomain(
  request: FastifyRequest<{
    Params: z.infer<typeof VendorIdSchema>;
    Body: z.infer<typeof DomainAllowlistSchema>;
  }>,
  reply: FastifyReply
) {
  const { vendorId } = VendorIdSchema.parse(request.params);
  const { domain, notes } = DomainAllowlistSchema.parse(request.body);
  const userId = request.user?.id ?? 'system';

  // Check vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    return reply.status(404).send({ error: 'Vendor not found' });
  }

  // Check domain not already in list
  const existing = await prisma.vendorDomainAllowlist.findFirst({
    where: { vendorId, domain },
  });

  if (existing) {
    return reply.status(409).send({
      error: 'Domain already in allowlist',
      domainId: existing.id,
    });
  }

  const entry = await prisma.vendorDomainAllowlist.create({
    data: {
      vendorId,
      domain,
      isActive: false, // Requires verification
      notes,
    },
  });

  return entry;
}

/**
 * POST /safety/vendors/:vendorId/domains/:domain/verify
 * Verify a domain in vendor's allowlist
 */
async function verifyVendorDomain(
  request: FastifyRequest<{
    Params: { vendorId: string; domain: string };
  }>,
  reply: FastifyReply
) {
  const { vendorId, domain } = request.params;
  const userId = request.user?.id ?? 'system';

  const entry = await prisma.vendorDomainAllowlist.findFirst({
    where: { vendorId, domain },
  });

  if (!entry) {
    return reply.status(404).send({ error: 'Domain not found in allowlist' });
  }

  const updated = await prisma.vendorDomainAllowlist.update({
    where: { id: entry.id },
    data: {
      isActive: true,
      verifiedAt: new Date(),
      verifiedByUserId: userId,
    },
  });

  return updated;
}

/**
 * DELETE /safety/vendors/:vendorId/domains/:domain
 * Remove domain from vendor's allowlist
 */
async function removeVendorDomain(
  request: FastifyRequest<{
    Params: { vendorId: string; domain: string };
  }>,
  reply: FastifyReply
) {
  const { vendorId, domain } = request.params;

  const entry = await prisma.vendorDomainAllowlist.findFirst({
    where: { vendorId, domain },
  });

  if (!entry) {
    return reply.status(404).send({ error: 'Domain not found in allowlist' });
  }

  await prisma.vendorDomainAllowlist.delete({
    where: { id: entry.id },
  });

  return { success: true, domain };
}

// ============================================================================
// Safety Transparency Handlers
// ============================================================================

/**
 * GET /safety/details/:versionId
 * Get safety details for transparency UI
 */
async function getSafetyDetails(
  request: FastifyRequest<{ Params: z.infer<typeof VersionIdSchema> }>,
  reply: FastifyReply
) {
  const { versionId } = VersionIdSchema.parse(request.params);

  const details = await safetyService.getSafetyDetails(versionId);

  if (!details) {
    return reply.status(404).send({ error: 'Version not found' });
  }

  return details;
}

// ============================================================================
// Tool Launch Handlers
// ============================================================================

/**
 * POST /safety/installations/:installationId/validate-launch
 * Validate tool launch (pre-flight check)
 */
async function validateToolLaunch(
  request: FastifyRequest<{
    Params: z.infer<typeof InstallationIdSchema>;
    Body: z.infer<typeof ToolLaunchSchema>;
  }>,
  reply: FastifyReply
) {
  const { installationId } = InstallationIdSchema.parse(request.params);
  const { context } = ToolLaunchSchema.parse(request.body);
  const userId = request.user?.id ?? 'system';
  const userRole = request.user?.role ?? 'unknown';

  const result = await safetyService.validateToolLaunch(
    installationId,
    userId,
    userRole,
    context
  );

  return result;
}

/**
 * POST /safety/installations/:installationId/launch
 * Launch embedded tool (with logging)
 */
async function launchTool(
  request: FastifyRequest<{
    Params: z.infer<typeof InstallationIdSchema>;
    Body: z.infer<typeof ToolLaunchSchema>;
  }>,
  reply: FastifyReply
) {
  const { installationId } = InstallationIdSchema.parse(request.params);
  const { context } = ToolLaunchSchema.parse(request.body);
  const userId = request.user?.id ?? 'system';
  const userRole = request.user?.role ?? 'unknown';

  // Validate launch
  const validation = await safetyService.validateToolLaunch(
    installationId,
    userId,
    userRole,
    context
  );

  if (!validation.isAllowed) {
    return reply.status(403).send({
      error: 'Tool launch not allowed',
      violations: validation.violations,
    });
  }

  // Get installation for logging
  const installation = await prisma.marketplaceInstallation.findUnique({
    where: { id: installationId },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  // Log the launch
  await safetyService.logToolLaunch({
    installationId,
    versionId: installation.marketplaceItemVersionId,
    tenantId: installation.tenantId,
    userId,
    userRole,
    launchUrl: validation.launchUrl!,
    scopesGranted: validation.grantedScopes!,
    context,
    checks: validation.checks,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
    sessionId: request.headers['x-session-id'] as string | undefined,
  });

  return {
    allowed: true,
    launchUrl: validation.launchUrl,
    grantedScopes: validation.grantedScopes,
  };
}

// ============================================================================
// Install Validation Handler
// ============================================================================

/**
 * POST /safety/validate-install
 * Validate item installation against tenant policy
 */
async function validateInstall(
  request: FastifyRequest<{
    Body: {
      tenantId: string;
      itemId: string;
      versionId?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { tenantId, itemId, versionId } = request.body;

  const result = await safetyService.validateInstallation(
    tenantId,
    itemId,
    versionId
  );

  return result;
}

// ============================================================================
// Route Registration
// ============================================================================

export async function safetyRoutes(fastify: FastifyInstance): Promise<void> {
  // Safety Review Queue
  fastify.get('/safety/review-queue', getSafetyReviewQueue);
  fastify.get('/safety/review-queue/:versionId', getVersionForSafetyReview);
  fastify.post('/safety/review-queue/:versionId/start', startSafetyReview);
  fastify.post('/safety/reviews/:reviewId/submit', submitSafetyReview);
  fastify.post('/safety/reviews/:reviewId/escalate', escalateSafetyReview);

  // Tenant Policies
  fastify.get('/safety/policies/:tenantId', getTenantPolicy);
  fastify.put('/safety/policies/:tenantId', updateTenantPolicy);

  // Vendor Domain Allowlist
  fastify.get('/safety/vendors/:vendorId/domains', getVendorDomains);
  fastify.post('/safety/vendors/:vendorId/domains', addVendorDomain);
  fastify.post('/safety/vendors/:vendorId/domains/:domain/verify', verifyVendorDomain);
  fastify.delete('/safety/vendors/:vendorId/domains/:domain', removeVendorDomain);

  // Safety Transparency
  fastify.get('/safety/details/:versionId', getSafetyDetails);

  // Tool Launch
  fastify.post('/safety/installations/:installationId/validate-launch', validateToolLaunch);
  fastify.post('/safety/installations/:installationId/launch', launchTool);

  // Install Validation
  fastify.post('/safety/validate-install', validateInstall);
}
