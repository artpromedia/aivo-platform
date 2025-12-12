/**
 * Admin Routes - Tenant Policy Management
 *
 * Endpoints for managing tenant tool policies, scope grants,
 * and tool installations.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { ToolScope, ToolSessionStatus } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schema Validation
// ══════════════════════════════════════════════════════════════════════════════

const TenantIdSchema = z.object({
  tenantId: z.string().uuid(),
});

const ToolIdSchema = z.object({
  toolId: z.string().max(100),
});

const PolicyUpdateSchema = z.object({
  isEnabled: z.boolean().optional(),
  maxSessionDurationMinutes: z.number().int().min(1).max(480).optional(),
  requireParentalConsent: z.boolean().optional(),
  allowedGradeBands: z.array(z.string()).optional(),
  allowedSubjects: z.array(z.string()).optional(),
  customSettings: z.record(z.unknown()).optional(),
});

const ScopeGrantSchema = z.object({
  scope: z.nativeEnum(ToolScope),
  isGranted: z.boolean(),
  grantedBy: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  conditions: z.record(z.unknown()).optional(),
});

const InstallationSchema = z.object({
  toolId: z.string().max(100),
  displayName: z.string().max(200).optional(),
  launchUrl: z.string().url().optional(),
  isEnabled: z.boolean().default(true),
  settings: z.record(z.unknown()).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Tenant Policy Routes
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/tenants/:tenantId/policies
 * List all tool policies for a tenant
 */
async function listTenantPolicies(
  request: FastifyRequest<{ Params: z.infer<typeof TenantIdSchema> }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);

  const policies = await prisma.tenantToolPolicy.findMany({
    where: { tenantId },
    include: {
      scopeGrants: true,
      tool: {
        select: {
          id: true,
          name: true,
          vendor: true,
          requiredScopes: true,
        },
      },
    },
  });

  return {
    data: policies.map((p) => ({
      id: p.id,
      toolId: p.toolId,
      tool: p.tool,
      isEnabled: p.isEnabled,
      maxSessionDurationMinutes: p.maxSessionDurationMinutes,
      requireParentalConsent: p.requireParentalConsent,
      allowedGradeBands: p.allowedGradeBands,
      allowedSubjects: p.allowedSubjects,
      scopeGrants: p.scopeGrants.map((g) => ({
        scope: g.scope,
        isGranted: g.isGranted,
        grantedAt: g.grantedAt,
        grantedBy: g.grantedBy,
        expiresAt: g.expiresAt,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
}

/**
 * GET /admin/tenants/:tenantId/policies/:toolId
 * Get specific tool policy for a tenant
 */
async function getTenantPolicy(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof ToolIdSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, toolId } = request.params;

  const policy = await prisma.tenantToolPolicy.findUnique({
    where: {
      tenantId_toolId: { tenantId, toolId },
    },
    include: {
      scopeGrants: true,
      tool: true,
    },
  });

  if (!policy) {
    return reply.status(404).send({ error: 'Policy not found' });
  }

  return {
    id: policy.id,
    toolId: policy.toolId,
    tool: policy.tool,
    isEnabled: policy.isEnabled,
    maxSessionDurationMinutes: policy.maxSessionDurationMinutes,
    requireParentalConsent: policy.requireParentalConsent,
    allowedGradeBands: policy.allowedGradeBands,
    allowedSubjects: policy.allowedSubjects,
    scopeGrants: policy.scopeGrants,
    customSettings: policy.customSettings,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

/**
 * PUT /admin/tenants/:tenantId/policies/:toolId
 * Create or update a tenant tool policy
 */
async function upsertTenantPolicy(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof ToolIdSchema>;
    Body: z.infer<typeof PolicyUpdateSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, toolId } = request.params;
  const data = PolicyUpdateSchema.parse(request.body);

  // Verify tool exists
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
  });

  if (!tool) {
    return reply.status(404).send({ error: 'Tool not found' });
  }

  const policy = await prisma.tenantToolPolicy.upsert({
    where: {
      tenantId_toolId: { tenantId, toolId },
    },
    create: {
      tenantId,
      toolId,
      isEnabled: data.isEnabled ?? false,
      maxSessionDurationMinutes: data.maxSessionDurationMinutes ?? 60,
      requireParentalConsent: data.requireParentalConsent ?? false,
      allowedGradeBands: data.allowedGradeBands ?? [],
      allowedSubjects: data.allowedSubjects ?? [],
      customSettings: data.customSettings ?? {},
    },
    update: {
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.maxSessionDurationMinutes !== undefined && {
        maxSessionDurationMinutes: data.maxSessionDurationMinutes,
      }),
      ...(data.requireParentalConsent !== undefined && {
        requireParentalConsent: data.requireParentalConsent,
      }),
      ...(data.allowedGradeBands !== undefined && {
        allowedGradeBands: data.allowedGradeBands,
      }),
      ...(data.allowedSubjects !== undefined && {
        allowedSubjects: data.allowedSubjects,
      }),
      ...(data.customSettings !== undefined && {
        customSettings: data.customSettings,
      }),
    },
  });

  request.log.info({ tenantId, toolId, policyId: policy.id }, 'Tenant policy updated');

  return policy;
}

/**
 * DELETE /admin/tenants/:tenantId/policies/:toolId
 * Delete a tenant tool policy
 */
async function deleteTenantPolicy(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof ToolIdSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, toolId } = request.params;

  // Check for active sessions
  const activeSessions = await prisma.toolSession.count({
    where: {
      tenantId,
      toolId,
      status: ToolSessionStatus.ACTIVE,
    },
  });

  if (activeSessions > 0) {
    return reply.status(400).send({
      error: 'Cannot delete policy with active sessions',
      activeSessions,
    });
  }

  await prisma.tenantToolPolicy.delete({
    where: {
      tenantId_toolId: { tenantId, toolId },
    },
  });

  request.log.info({ tenantId, toolId }, 'Tenant policy deleted');

  return { success: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// Scope Grant Routes
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PUT /admin/tenants/:tenantId/policies/:toolId/scopes
 * Update scope grants for a tool policy
 */
async function updateScopeGrants(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof ToolIdSchema>;
    Body: z.infer<typeof ScopeGrantSchema>[];
  }>,
  reply: FastifyReply
) {
  const { tenantId, toolId } = request.params;
  const grants = z.array(ScopeGrantSchema).parse(request.body);

  // Get or create policy
  const policy = await prisma.tenantToolPolicy.upsert({
    where: {
      tenantId_toolId: { tenantId, toolId },
    },
    create: {
      tenantId,
      toolId,
      isEnabled: false,
    },
    update: {},
  });

  // Update scope grants
  const results = await Promise.all(
    grants.map(async (grant) => {
      return prisma.toolScopeGrant.upsert({
        where: {
          policyId_scope: {
            policyId: policy.id,
            scope: grant.scope,
          },
        },
        create: {
          policyId: policy.id,
          scope: grant.scope,
          isGranted: grant.isGranted,
          grantedBy: grant.grantedBy,
          expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : null,
          conditions: grant.conditions ?? {},
        },
        update: {
          isGranted: grant.isGranted,
          grantedBy: grant.grantedBy,
          grantedAt: new Date(),
          expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : null,
          conditions: grant.conditions ?? {},
        },
      });
    })
  );

  request.log.info(
    { tenantId, toolId, scopeCount: results.length },
    'Scope grants updated'
  );

  return { scopeGrants: results };
}

/**
 * GET /admin/tenants/:tenantId/policies/:toolId/scopes
 * Get scope grants for a tool policy
 */
async function getScopeGrants(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & z.infer<typeof ToolIdSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, toolId } = request.params;

  const policy = await prisma.tenantToolPolicy.findUnique({
    where: {
      tenantId_toolId: { tenantId, toolId },
    },
    include: {
      scopeGrants: true,
      tool: {
        select: { requiredScopes: true, optionalScopes: true },
      },
    },
  });

  if (!policy) {
    return reply.status(404).send({ error: 'Policy not found' });
  }

  const requiredScopes = (policy.tool.requiredScopes as ToolScope[]) || [];
  const optionalScopes = (policy.tool.optionalScopes as ToolScope[]) || [];

  return {
    requiredScopes,
    optionalScopes,
    grants: policy.scopeGrants.map((g) => ({
      scope: g.scope,
      isGranted: g.isGranted,
      grantedAt: g.grantedAt,
      grantedBy: g.grantedBy,
      expiresAt: g.expiresAt,
      conditions: g.conditions,
    })),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Tool Installation Routes
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/tenants/:tenantId/installations
 * List tool installations for a tenant
 */
async function listInstallations(
  request: FastifyRequest<{ Params: z.infer<typeof TenantIdSchema> }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);

  const installations = await prisma.toolInstallation.findMany({
    where: { tenantId },
    include: {
      tool: {
        select: {
          id: true,
          name: true,
          vendor: true,
          category: true,
          iconUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get session counts
  const sessionCounts = await prisma.toolSession.groupBy({
    by: ['installationId'],
    where: {
      tenantId,
      installationId: { in: installations.map((i) => i.id) },
    },
    _count: true,
  });

  const countMap = new Map(sessionCounts.map((c) => [c.installationId, c._count]));

  return {
    data: installations.map((i) => ({
      id: i.id,
      tool: i.tool,
      displayName: i.displayName,
      launchUrl: i.launchUrl,
      isEnabled: i.isEnabled,
      totalSessions: countMap.get(i.id) ?? 0,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
  };
}

/**
 * POST /admin/tenants/:tenantId/installations
 * Create a new tool installation
 */
async function createInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema>;
    Body: z.infer<typeof InstallationSchema>;
  }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);
  const data = InstallationSchema.parse(request.body);

  // Verify tool exists
  const tool = await prisma.tool.findUnique({
    where: { id: data.toolId },
  });

  if (!tool) {
    return reply.status(404).send({ error: 'Tool not found' });
  }

  const installation = await prisma.toolInstallation.create({
    data: {
      tenantId,
      toolId: data.toolId,
      displayName: data.displayName ?? tool.name,
      launchUrl: data.launchUrl ?? tool.defaultLaunchUrl,
      isEnabled: data.isEnabled,
      settings: data.settings ?? {},
    },
    include: { tool: true },
  });

  request.log.info(
    { tenantId, toolId: data.toolId, installationId: installation.id },
    'Tool installed'
  );

  return reply.status(201).send(installation);
}

/**
 * PATCH /admin/tenants/:tenantId/installations/:installationId
 * Update a tool installation
 */
async function updateInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & { installationId: string };
    Body: Partial<z.infer<typeof InstallationSchema>>;
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;

  const installation = await prisma.toolInstallation.findFirst({
    where: { id: installationId, tenantId },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  const updated = await prisma.toolInstallation.update({
    where: { id: installationId },
    data: request.body,
  });

  request.log.info({ installationId }, 'Installation updated');

  return updated;
}

/**
 * DELETE /admin/tenants/:tenantId/installations/:installationId
 * Remove a tool installation
 */
async function deleteInstallation(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema> & { installationId: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId, installationId } = request.params;

  const installation = await prisma.toolInstallation.findFirst({
    where: { id: installationId, tenantId },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  // Check for active sessions
  const activeSessions = await prisma.toolSession.count({
    where: {
      installationId,
      status: ToolSessionStatus.ACTIVE,
    },
  });

  if (activeSessions > 0) {
    return reply.status(400).send({
      error: 'Cannot delete installation with active sessions',
      activeSessions,
    });
  }

  await prisma.toolInstallation.delete({
    where: { id: installationId },
  });

  request.log.info({ installationId }, 'Installation deleted');

  return { success: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// Analytics Routes
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/tenants/:tenantId/analytics
 * Get tool usage analytics for a tenant
 */
async function getTenantAnalytics(
  request: FastifyRequest<{
    Params: z.infer<typeof TenantIdSchema>;
    Querystring: { startDate?: string; endDate?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = TenantIdSchema.parse(request.params);
  const { startDate, endDate } = request.query;

  const dateFilter = {
    ...(startDate && { gte: new Date(startDate) }),
    ...(endDate && { lte: new Date(endDate) }),
  };

  const [sessionStats, eventStats, topTools] = await Promise.all([
    // Session statistics
    prisma.toolSession.groupBy({
      by: ['status'],
      where: {
        tenantId,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _count: true,
    }),

    // Event statistics
    prisma.sessionEvent.groupBy({
      by: ['eventType'],
      where: {
        toolSession: {
          tenantId,
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
        },
      },
      _count: true,
    }),

    // Top tools by usage
    prisma.toolSession.groupBy({
      by: ['toolId'],
      where: {
        tenantId,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _count: true,
      orderBy: { _count: { toolId: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    sessions: {
      byStatus: Object.fromEntries(sessionStats.map((s) => [s.status, s._count])),
      total: sessionStats.reduce((sum, s) => sum + s._count, 0),
    },
    events: {
      byType: Object.fromEntries(eventStats.map((e) => [e.eventType, e._count])),
      total: eventStats.reduce((sum, e) => sum + e._count, 0),
    },
    topTools: topTools.map((t) => ({
      toolId: t.toolId,
      sessionCount: t._count,
    })),
    period: {
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function adminRoutes(fastify: FastifyInstance) {
  // Tenant policies
  fastify.get('/tenants/:tenantId/policies', listTenantPolicies);
  fastify.get('/tenants/:tenantId/policies/:toolId', getTenantPolicy);
  fastify.put('/tenants/:tenantId/policies/:toolId', upsertTenantPolicy);
  fastify.delete('/tenants/:tenantId/policies/:toolId', deleteTenantPolicy);

  // Scope grants
  fastify.get('/tenants/:tenantId/policies/:toolId/scopes', getScopeGrants);
  fastify.put('/tenants/:tenantId/policies/:toolId/scopes', updateScopeGrants);

  // Installations
  fastify.get('/tenants/:tenantId/installations', listInstallations);
  fastify.post('/tenants/:tenantId/installations', createInstallation);
  fastify.patch('/tenants/:tenantId/installations/:installationId', updateInstallation);
  fastify.delete('/tenants/:tenantId/installations/:installationId', deleteInstallation);

  // Analytics
  fastify.get('/tenants/:tenantId/analytics', getTenantAnalytics);
}
