/**
 * Admin Routes - Partner and tenant management
 */

import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { generateSyntheticData } from '../data/generator.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Generate webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}

/**
 * Generate tenant code
 */
function generateTenantCode(): string {
  return `SB_${randomBytes(4).toString('hex').toUpperCase()}`;
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // TODO: Add proper admin authentication

  // List all partners
  fastify.get('/partners', async (request, reply) => {
    const { status, limit = '50', offset = '0' } = request.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const partners = await prisma.partner.findMany({
      where,
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        sandboxTenants: {
          select: { id: true, tenantCode: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.partner.count({ where });

    return {
      data: partners.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        tier: p.tier,
        contactEmail: p.contactEmail,
        createdAt: p.createdAt,
        approvedAt: p.approvedAt,
        latestApplication: p.applications[0] ?? null,
        sandboxTenants: p.sandboxTenants,
      })),
      pagination: { total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) },
    };
  });

  // Get partner details
  fastify.get('/partners/:partnerId', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
        },
        sandboxTenants: {
          include: {
            apiKeys: {
              select: {
                id: true,
                name: true,
                keyPrefix: true,
                scopes: true,
                status: true,
                lastUsedAt: true,
                createdAt: true,
              },
            },
            webhookEndpoints: true,
            _count: {
              select: {
                syntheticLearners: true,
                syntheticTeachers: true,
                syntheticClasses: true,
              },
            },
          },
        },
      },
    });

    if (!partner) {
      return reply.status(404).send({ error: 'partner_not_found' });
    }

    return partner;
  });

  // Approve partner
  fastify.post('/partners/:partnerId/approve', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const { tier = 'free', notes } = request.body as { tier?: string; notes?: string };

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return reply.status(404).send({ error: 'partner_not_found' });
    }

    if (partner.status !== 'PENDING') {
      return reply.status(400).send({
        error: 'invalid_status',
        message: `Partner is already ${partner.status.toLowerCase()}`,
      });
    }

    // Update partner status
    const updatedPartner = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        status: 'APPROVED',
        tier: tier as 'free' | 'standard' | 'enterprise',
        approvedAt: new Date(),
        approvalNotes: notes,
      },
    });

    // Create sandbox tenant
    const tenant = await prisma.sandboxTenant.create({
      data: {
        partnerId: partner.id,
        tenantCode: generateTenantCode(),
        name: `${partner.name} Sandbox`,
        webhookSecret: generateWebhookSecret(),
      },
    });

    fastify.log.info({ partnerId, tenantId: tenant.id }, 'Partner approved and sandbox created');

    return {
      partner: {
        id: updatedPartner.id,
        status: updatedPartner.status,
        tier: updatedPartner.tier,
        approvedAt: updatedPartner.approvedAt,
      },
      sandboxTenant: {
        id: tenant.id,
        tenantCode: tenant.tenantCode,
        webhookSecret: tenant.webhookSecret,
      },
    };
  });

  // Reject partner
  fastify.post('/partners/:partnerId/reject', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const { reason } = request.body as { reason: string };

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return reply.status(404).send({ error: 'partner_not_found' });
    }

    if (partner.status !== 'PENDING') {
      return reply.status(400).send({
        error: 'invalid_status',
        message: `Partner is already ${partner.status.toLowerCase()}`,
      });
    }

    const updatedPartner = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    fastify.log.info({ partnerId }, 'Partner rejected');

    return {
      id: updatedPartner.id,
      status: updatedPartner.status,
      rejectionReason: updatedPartner.rejectionReason,
    };
  });

  // Suspend partner
  fastify.post('/partners/:partnerId/suspend', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const { reason } = request.body as { reason: string };

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return reply.status(404).send({ error: 'partner_not_found' });
    }

    // Suspend partner and deactivate all tenants
    const [updatedPartner] = await prisma.$transaction([
      prisma.partner.update({
        where: { id: partnerId },
        data: {
          status: 'SUSPENDED',
          rejectionReason: reason,
        },
      }),
      prisma.sandboxTenant.updateMany({
        where: { partnerId },
        data: { isActive: false },
      }),
    ]);

    fastify.log.info({ partnerId }, 'Partner suspended');

    return {
      id: updatedPartner.id,
      status: updatedPartner.status,
    };
  });

  // Generate synthetic data for tenant
  fastify.post('/tenants/:tenantCode/generate-data', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };
    const { 
      learnerCount = 50, 
      teacherCount = 5, 
      classCount = 10 
    } = request.body as {
      learnerCount?: number;
      teacherCount?: number;
      classCount?: number;
    };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    // Generate synthetic data
    const result = await generateSyntheticData(prisma, tenant.id, {
      learnerCount,
      teacherCount,
      classCount,
    });

    fastify.log.info({ tenantId: tenant.id, ...result }, 'Synthetic data generated');

    return {
      tenantCode,
      generated: result,
    };
  });

  // Reset tenant data
  fastify.post('/tenants/:tenantCode/reset', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    // Delete all synthetic data
    await prisma.$transaction([
      prisma.sandboxSyntheticSession.deleteMany({ where: { learner: { tenantId: tenant.id } } }),
      prisma.sandboxSyntheticLearnerProgress.deleteMany({ where: { learner: { tenantId: tenant.id } } }),
      prisma.sandboxSyntheticEnrollment.deleteMany({ where: { class: { tenantId: tenant.id } } }),
      prisma.sandboxSyntheticClass.deleteMany({ where: { tenantId: tenant.id } }),
      prisma.sandboxSyntheticTeacher.deleteMany({ where: { tenantId: tenant.id } }),
      prisma.sandboxSyntheticLearner.deleteMany({ where: { tenantId: tenant.id } }),
      prisma.sandboxWebhookDelivery.deleteMany({ where: { endpoint: { tenantId: tenant.id } } }),
      prisma.sandboxApiUsageLog.deleteMany({ where: { tenantId: tenant.id } }),
      prisma.sandboxTenant.update({
        where: { id: tenant.id },
        data: { lastResetAt: new Date() },
      }),
    ]);

    fastify.log.info({ tenantId: tenant.id }, 'Tenant data reset');

    return {
      tenantCode,
      resetAt: new Date().toISOString(),
    };
  });

  // Get usage analytics
  fastify.get('/tenants/:tenantCode/usage', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get API usage
    const apiUsage = await prisma.sandboxApiUsageLog.groupBy({
      by: ['endpoint', 'method'],
      where: { tenantId: tenant.id, ...dateFilter },
      _count: { id: true },
    });

    // Get daily totals
    const dailyUsage = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM sandbox_api_usage_logs
      WHERE tenant_id = ${tenant.id}
        ${startDate && endDate ? `AND created_at BETWEEN ${startDate} AND ${endDate}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Get webhook delivery stats
    const webhookStats = await prisma.sandboxWebhookDelivery.groupBy({
      by: ['status'],
      where: { endpoint: { tenantId: tenant.id }, ...dateFilter },
      _count: { id: true },
    });

    return {
      tenantCode,
      period: { startDate, endDate },
      apiUsage: apiUsage.map(u => ({
        endpoint: u.endpoint,
        method: u.method,
        count: u._count.id,
      })),
      dailyApiCalls: dailyUsage,
      webhookDeliveries: webhookStats.reduce((acc, s) => {
        acc[s.status.toLowerCase()] = s._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  });
};
