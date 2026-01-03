/**
 * Partner Registration & Management Routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { ExtendedPrismaClient } from '../prisma-types.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: ExtendedPrismaClient;
  }
}

// Type aliases for prisma models (to work around missing generated types)
type SandboxApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
};

type SandboxWebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  isEnabled: boolean;
};

type SandboxTenant = {
  id: string;
  tenantCode: string;
  name: string;
  isActive: boolean;
  apiKeys: SandboxApiKey[];
  webhookEndpoints: SandboxWebhookEndpoint[];
};

const registerSchema = z.object({
  companyName: z.string().min(2).max(200),
  website: z.string().url().optional(),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactRole: z.string().max(100).optional(),
  integrationType: z.array(z.enum(['api', 'webhooks', 'lti', 'sis', 'sso'])).min(1),
  useCase: z.string().min(20).max(2000),
  expectedVolume: z.enum(['low', 'medium', 'high', 'enterprise']).optional(),
  timeline: z.enum(['exploring', '1month', '3months', '6months', 'later']).optional(),
});

export const partnerRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // Register new partner
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if email already exists
    const existing = await prisma.partner.findUnique({
      where: { contactEmail: body.contactEmail },
    });

    if (existing) {
      return reply.status(409).send({
        error: 'conflict',
        message: 'A partner with this email already exists',
      });
    }

    // Create partner and application
    const partner = await prisma.partner.create({
      data: {
        name: body.companyName,
        website: body.website,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactRole: body.contactRole,
        applications: {
          create: {
            integrationType: body.integrationType,
            useCase: body.useCase,
            expectedVolume: body.expectedVolume,
            timeline: body.timeline,
          },
        },
      },
      include: {
        applications: true,
      },
    });

    fastify.log.info({ partnerId: partner.id }, 'New partner registration');

    return reply.status(201).send({
      id: partner.id,
      status: partner.status,
      message: 'Registration submitted. You will receive an email when your application is reviewed.',
    });
  });

  // Get partner status (for authenticated partners)
  fastify.get('/me', async (request, reply) => {
    const partnerId = (request.headers['x-partner-id'] as string);
    
    if (!partnerId) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        sandboxTenants: {
          include: {
            apiKeys: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                keyPrefix: true,
                scopes: true,
                lastUsedAt: true,
                createdAt: true,
              },
            },
            webhookEndpoints: true,
          },
        },
      },
    });

    if (!partner) {
      return reply.status(404).send({ error: 'not_found' });
    }

    return {
      id: partner.id,
      name: partner.name,
      status: partner.status,
      tier: partner.tier,
      sandboxTenants: partner.sandboxTenants.map((tenant: SandboxTenant & { apiKeys: SandboxApiKey[]; webhookEndpoints: SandboxWebhookEndpoint[] }) => ({
        id: tenant.id,
        tenantCode: tenant.tenantCode,
        name: tenant.name,
        isActive: tenant.isActive,
        apiKeys: tenant.apiKeys,
        webhookEndpoints: tenant.webhookEndpoints.map((ep: SandboxWebhookEndpoint) => ({
          id: ep.id,
          name: ep.name,
          url: ep.url,
          eventTypes: ep.eventTypes,
          isEnabled: ep.isEnabled,
        })),
      })),
    };
  });

  // Check application status
  fastify.get('/status/:email', async (request, reply) => {
    const { email } = request.params as { email: string };

    const partner = await prisma.partner.findUnique({
      where: { contactEmail: email },
      select: {
        id: true,
        status: true,
        approvedAt: true,
      },
    });

    if (!partner) {
      return reply.status(404).send({ error: 'not_found' });
    }

    return {
      status: partner.status,
      approvedAt: partner.approvedAt,
    };
  });
};
