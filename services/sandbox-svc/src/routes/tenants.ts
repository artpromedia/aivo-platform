/**
 * Sandbox Tenant Management Routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `aivo_sk_test_${randomBytes(32).toString('base64url')}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 20) + '...';
  return { key, hash, prefix };
}

/**
 * Generate webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum([
    'read:learner_progress',
    'read:session_data',
    'write:external_events',
    'manage:webhooks',
    'read:analytics',
  ])).min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  eventTypes: z.array(z.enum([
    'SESSION_COMPLETED',
    'BASELINE_COMPLETED',
    'SKILL_MASTERED',
    'RECOMMENDATION_CREATED',
    'GOAL_ACHIEVED',
    'ASSIGNMENT_COMPLETED',
  ])).min(1),
});

export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // Get tenant details
  fastify.get('/:tenantCode', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
      include: {
        partner: {
          select: { name: true, tier: true },
        },
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
        _count: {
          select: {
            syntheticLearners: true,
            syntheticTeachers: true,
            syntheticClasses: true,
          },
        },
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    return {
      id: tenant.id,
      tenantCode: tenant.tenantCode,
      name: tenant.name,
      partner: tenant.partner,
      isActive: tenant.isActive,
      lastResetAt: tenant.lastResetAt,
      apiKeys: tenant.apiKeys,
      webhookEndpoints: tenant.webhookEndpoints.map((ep: { id: string; name: string; url: string; eventTypes: string[]; isEnabled: boolean }) => ({
        id: ep.id,
        name: ep.name,
        url: ep.url,
        eventTypes: ep.eventTypes,
        isEnabled: ep.isEnabled,
      })),
      syntheticData: {
        learners: tenant._count.syntheticLearners,
        teachers: tenant._count.syntheticTeachers,
        classes: tenant._count.syntheticClasses,
      },
    };
  });

  // Create API key for tenant
  fastify.post('/:tenantCode/api-keys', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };
    const body = createApiKeySchema.parse(request.body);

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    const { key, hash, prefix } = generateApiKey();

    const apiKey = await prisma.sandboxApiKey.create({
      data: {
        tenantId: tenant.id,
        name: body.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: body.scopes,
        expiresAt: body.expiresInDays 
          ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    fastify.log.info({ tenantId: tenant.id, keyId: apiKey.id }, 'API key created');

    // Return the full key only once - it won't be retrievable later
    return reply.status(201).send({
      id: apiKey.id,
      name: apiKey.name,
      key, // Full key - store securely!
      prefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      message: 'Store this key securely - it will not be shown again.',
    });
  });

  // List API keys
  fastify.get('/:tenantCode/api-keys', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            scopes: true,
            status: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    return { apiKeys: tenant.apiKeys };
  });

  // Revoke API key
  fastify.delete('/:tenantCode/api-keys/:keyId', async (request, reply) => {
    const { tenantCode, keyId } = request.params as { tenantCode: string; keyId: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    await prisma.sandboxApiKey.update({
      where: { id: keyId, tenantId: tenant.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    fastify.log.info({ tenantId: tenant.id, keyId }, 'API key revoked');

    return { success: true };
  });

  // Create webhook endpoint
  fastify.post('/:tenantCode/webhooks', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };
    const body = createWebhookSchema.parse(request.body);

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    const webhook = await prisma.sandboxWebhookEndpoint.create({
      data: {
        tenantId: tenant.id,
        name: body.name,
        url: body.url,
        eventTypes: body.eventTypes,
      },
    });

    fastify.log.info({ tenantId: tenant.id, webhookId: webhook.id }, 'Webhook endpoint created');

    return reply.status(201).send({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      isEnabled: webhook.isEnabled,
      webhookSecret: tenant.webhookSecret, // Return secret for verification
    });
  });

  // List webhooks
  fastify.get('/:tenantCode/webhooks', async (request, reply) => {
    const { tenantCode } = request.params as { tenantCode: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
      include: {
        webhookEndpoints: {
          include: {
            deliveries: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    type WebhookEndpoint = typeof tenant.webhookEndpoints[number];
    type Delivery = WebhookEndpoint['deliveries'][number];

    return {
      webhookSecret: tenant.webhookSecret,
      endpoints: tenant.webhookEndpoints.map((ep: WebhookEndpoint) => ({
        id: ep.id,
        name: ep.name,
        url: ep.url,
        eventTypes: ep.eventTypes,
        isEnabled: ep.isEnabled,
        recentDeliveries: ep.deliveries.map((d: Delivery) => ({
          id: d.id,
          eventType: d.eventType,
          status: d.status,
          responseStatus: d.responseStatus,
          createdAt: d.createdAt,
        })),
      })),
    };
  });

  // Update webhook
  fastify.patch('/:tenantCode/webhooks/:webhookId', async (request, reply) => {
    const { tenantCode, webhookId } = request.params as { tenantCode: string; webhookId: string };
    const body = request.body as Partial<{
      name: string;
      url: string;
      eventTypes: string[];
      isEnabled: boolean;
    }>;

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    const webhook = await prisma.sandboxWebhookEndpoint.update({
      where: { id: webhookId, tenantId: tenant.id },
      data: body,
    });

    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      isEnabled: webhook.isEnabled,
    };
  });

  // Delete webhook
  fastify.delete('/:tenantCode/webhooks/:webhookId', async (request, reply) => {
    const { tenantCode, webhookId } = request.params as { tenantCode: string; webhookId: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    await prisma.sandboxWebhookEndpoint.delete({
      where: { id: webhookId, tenantId: tenant.id },
    });

    return { success: true };
  });

  // Get webhook deliveries
  fastify.get('/:tenantCode/webhooks/:webhookId/deliveries', async (request, reply) => {
    const { tenantCode, webhookId } = request.params as { tenantCode: string; webhookId: string };
    const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    const deliveries = await prisma.sandboxWebhookDelivery.findMany({
      where: { endpointId: webhookId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    });

    const total = await prisma.sandboxWebhookDelivery.count({
      where: { endpointId: webhookId },
    });

    return {
      deliveries: deliveries.map((d: typeof deliveries[number]) => ({
        id: d.id,
        eventType: d.eventType,
        payload: d.payloadJson,
        status: d.status,
        attempts: d.attempts,
        responseStatus: d.responseStatus,
        responseBody: d.responseBody,
        deliveredAt: d.deliveredAt,
        createdAt: d.createdAt,
      })),
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    };
  });
};
