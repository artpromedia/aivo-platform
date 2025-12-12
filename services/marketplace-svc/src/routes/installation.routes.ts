/**
 * Installation Routes - Tenant/School/Classroom Install Management
 *
 * Endpoints for installing, configuring, and managing marketplace items.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { InstallationStatus, MarketplaceVersionStatus } from '../types/index.js';

// ============================================================================
// Schema Validation
// ============================================================================

const TenantIdSchema = z.object({
  tenantId: z.string().uuid(),
});

const InstallationIdSchema = z.object({
  installationId: z.string().uuid(),
});

const CreateInstallationSchema = z.object({
  marketplaceItemId: z.string().uuid(),
  versionId: z.string().uuid().optional(), // Uses latest published if not specified
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  installationConfig: z.record(z.unknown()).optional(),
});

const UpdateInstallationSchema = z.object({
  versionId: z.string().uuid().optional(),
  installationConfig: z.record(z.unknown()).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /tenants/:tenantId/installations
 * List all installations for a tenant
 */
async function listInstallations(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema>;
    Querystring: {
      status?: InstallationStatus;
      schoolId?: string;
      classroomId?: string;
      limit?: string;
      offset?: string;
    };
  }>,
  _reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);
  const { status, schoolId, classroomId, limit = '50', offset = '0' } = request.query;

  const installations = await prisma.marketplaceInstallation.findMany({
    where: {
      tenantId,
      ...(status && { status }),
      ...(schoolId && { schoolId }),
      ...(classroomId && { classroomId }),
    },
    include: {
      marketplaceItem: {
        select: {
          slug: true,
          title: true,
          itemType: true,
          iconUrl: true,
          vendor: {
            select: {
              name: true,
              slug: true,
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
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
    orderBy: { installedAt: 'desc' },
  });

  const total = await prisma.marketplaceInstallation.count({
    where: {
      tenantId,
      ...(status && { status }),
      ...(schoolId && { schoolId }),
      ...(classroomId && { classroomId }),
    },
  });

  return {
    data: installations,
    pagination: {
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    },
  };
}

/**
 * GET /tenants/:tenantId/installations/:installationId
 * Get installation details
 */
async function getInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof InstallationIdSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;

  const installation = await prisma.marketplaceInstallation.findFirst({
    where: {
      id: installationId,
      tenantId,
    },
    include: {
      marketplaceItem: {
        include: {
          vendor: true,
        },
      },
      version: {
        include: {
          contentPackItems: true,
          embeddedToolConfig: true,
        },
      },
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
    },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  return installation;
}

/**
 * POST /tenants/:tenantId/installations
 * Install a marketplace item
 */
async function createInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema>;
    Body: z.infer<typeof CreateInstallationSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);
  const data = CreateInstallationSchema.parse(request.body);

  // TODO: Extract from auth context
  const installedByUserId = '00000000-0000-0000-0000-000000000000';

  // Get the marketplace item
  const item = await prisma.marketplaceItem.findUnique({
    where: { id: data.marketplaceItemId },
    include: {
      vendor: true,
    },
  });

  if (!item || !item.isActive) {
    return reply.status(404).send({ error: 'Marketplace item not found' });
  }

  // Get version to install
  let versionId = data.versionId;
  if (!versionId) {
    // Use latest published version
    const latestVersion = await prisma.marketplaceItemVersion.findFirst({
      where: {
        marketplaceItemId: data.marketplaceItemId,
        status: MarketplaceVersionStatus.PUBLISHED,
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (!latestVersion) {
      return reply.status(400).send({ error: 'No published version available' });
    }

    versionId = latestVersion.id;
  }

  // Check for existing installation at the same scope
  const existingInstallation = await prisma.marketplaceInstallation.findFirst({
    where: {
      tenantId,
      marketplaceItemId: data.marketplaceItemId,
      schoolId: data.schoolId ?? null,
      classroomId: data.classroomId ?? null,
    },
  });

  if (existingInstallation) {
    return reply.status(409).send({
      error: 'Item already installed at this scope',
      existingInstallationId: existingInstallation.id,
    });
  }

  // Determine initial status based on approval requirements
  // TODO: Check tenant policies for auto-approval
  const requiresApproval = item.vendor.type === 'THIRD_PARTY';
  const status = requiresApproval ? InstallationStatus.PENDING_APPROVAL : InstallationStatus.ACTIVE;

  // Create installation
  const installation = await prisma.marketplaceInstallation.create({
    data: {
      tenantId,
      marketplaceItemId: data.marketplaceItemId,
      versionId,
      schoolId: data.schoolId ?? null,
      classroomId: data.classroomId ?? null,
      status,
      installedByUserId,
      installationConfig: data.installationConfig ?? {},
      auditLogs: {
        create: {
          eventType: 'INSTALLED',
          actorUserId: installedByUserId,
          eventData: {
            status,
            versionId,
          },
        },
      },
    },
    include: {
      marketplaceItem: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  });

  // Increment install count
  await prisma.marketplaceItem.update({
    where: { id: data.marketplaceItemId },
    data: { totalInstalls: { increment: 1 } },
  });

  request.log.info(
    { installationId: installation.id, itemSlug: installation.marketplaceItem.slug },
    'Marketplace item installed'
  );

  return reply.status(201).send(installation);
}

/**
 * PATCH /tenants/:tenantId/installations/:installationId
 * Update installation (version upgrade, config change)
 */
async function updateInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof InstallationIdSchema>;
    Body: z.infer<typeof UpdateInstallationSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;
  const data = UpdateInstallationSchema.parse(request.body);

  // TODO: Extract from auth context
  const actorUserId = '00000000-0000-0000-0000-000000000000';

  const installation = await prisma.marketplaceInstallation.findFirst({
    where: {
      id: installationId,
      tenantId,
    },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  const eventData: Record<string, unknown> = {};

  if (data.versionId) {
    // Verify version belongs to the same item and is published
    const version = await prisma.marketplaceItemVersion.findFirst({
      where: {
        id: data.versionId,
        marketplaceItemId: installation.marketplaceItemId,
        status: MarketplaceVersionStatus.PUBLISHED,
      },
    });

    if (!version) {
      return reply.status(400).send({ error: 'Invalid or unpublished version' });
    }

    updateData.versionId = data.versionId;
    eventData.previousVersionId = installation.versionId;
    eventData.newVersionId = data.versionId;
  }

  if (data.installationConfig) {
    updateData.installationConfig = data.installationConfig;
  }

  const updated = await prisma.marketplaceInstallation.update({
    where: { id: installationId },
    data: {
      ...updateData,
      auditLogs: {
        create: {
          eventType: data.versionId ? 'VERSION_CHANGED' : 'CONFIG_CHANGED',
          actorUserId,
          eventData,
        },
      },
    },
  });

  return updated;
}

/**
 * POST /tenants/:tenantId/installations/:installationId/disable
 * Disable an installation
 */
async function disableInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof InstallationIdSchema>;
    Body: { reason?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;
  const { reason } = request.body ?? {};

  // TODO: Extract from auth context
  const actorUserId = '00000000-0000-0000-0000-000000000000';

  const installation = await prisma.marketplaceInstallation.findFirst({
    where: {
      id: installationId,
      tenantId,
    },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  if (installation.status === InstallationStatus.DISABLED) {
    return reply.status(400).send({ error: 'Installation already disabled' });
  }

  const updated = await prisma.marketplaceInstallation.update({
    where: { id: installationId },
    data: {
      status: InstallationStatus.DISABLED,
      auditLogs: {
        create: {
          eventType: 'DISABLED',
          actorUserId,
          eventData: { reason, previousStatus: installation.status },
        },
      },
    },
  });

  request.log.info({ installationId }, 'Installation disabled');

  return updated;
}

/**
 * POST /tenants/:tenantId/installations/:installationId/enable
 * Re-enable a disabled installation
 */
async function enableInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof InstallationIdSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;

  // TODO: Extract from auth context
  const actorUserId = '00000000-0000-0000-0000-000000000000';

  const installation = await prisma.marketplaceInstallation.findFirst({
    where: {
      id: installationId,
      tenantId,
    },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  if (installation.status !== InstallationStatus.DISABLED) {
    return reply.status(400).send({ error: 'Installation is not disabled' });
  }

  const updated = await prisma.marketplaceInstallation.update({
    where: { id: installationId },
    data: {
      status: InstallationStatus.ACTIVE,
      auditLogs: {
        create: {
          eventType: 'ENABLED',
          actorUserId,
          eventData: {},
        },
      },
    },
  });

  request.log.info({ installationId }, 'Installation enabled');

  return updated;
}

/**
 * DELETE /tenants/:tenantId/installations/:installationId
 * Uninstall (soft delete)
 */
async function uninstall(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof InstallationIdSchema>;
    Body: { reason?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;
  const { reason } = request.body ?? {};

  // TODO: Extract from auth context
  const actorUserId = '00000000-0000-0000-0000-000000000000';

  const installation = await prisma.marketplaceInstallation.findFirst({
    where: {
      id: installationId,
      tenantId,
    },
    include: {
      marketplaceItem: true,
    },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  // Create final audit log before deletion
  await prisma.installationAuditLog.create({
    data: {
      installationId,
      eventType: 'UNINSTALLED',
      actorUserId,
      eventData: { reason },
    },
  });

  // Soft delete by setting status to REVOKED
  await prisma.marketplaceInstallation.update({
    where: { id: installationId },
    data: {
      status: InstallationStatus.REVOKED,
    },
  });

  // Decrement install count
  await prisma.marketplaceItem.update({
    where: { id: installation.marketplaceItemId },
    data: { totalInstalls: { decrement: 1 } },
  });

  request.log.info({ installationId }, 'Installation revoked');

  return reply.status(204).send();
}

// ============================================================================
// Plugin Registration
// ============================================================================

export async function installationRoutes(fastify: FastifyInstance) {
  fastify.get('/tenants/:tenantId/installations', listInstallations);
  fastify.get('/tenants/:tenantId/installations/:installationId', getInstallation);
  fastify.post('/tenants/:tenantId/installations', createInstallation);
  fastify.patch('/tenants/:tenantId/installations/:installationId', updateInstallation);
  fastify.post('/tenants/:tenantId/installations/:installationId/disable', disableInstallation);
  fastify.post('/tenants/:tenantId/installations/:installationId/enable', enableInstallation);
  fastify.delete('/tenants/:tenantId/installations/:installationId', uninstall);
}
