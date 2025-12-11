/**
 * Integration Service API Routes
 * 
 * Public APIs for partners and admin APIs for managing webhooks/keys.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, ApiScope, WebhookEventType } from '@prisma/client';
import { z } from 'zod';
import { ApiKeyService, ApiKeyValidationResult } from './api-key-service.js';
import { WebhookDispatcher, WebhookEventProducer } from './webhook-dispatcher.js';
import { generateWebhookSecret } from './webhook-signing.js';
import {
  CreateWebhookEndpointSchema,
  UpdateWebhookEndpointSchema,
  CreateApiKeySchema,
  ExternalLearningEventSchema,
  API_KEY_HEADER,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY AUGMENTATION
// ══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyAuth?: ApiKeyValidationResult;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export interface RouteConfig {
  prisma: PrismaClient;
  apiKeyService: ApiKeyService;
  webhookDispatcher: WebhookDispatcher;
}

export async function registerRoutes(
  app: FastifyInstance,
  config: RouteConfig
): Promise<void> {
  const { prisma, apiKeyService, webhookDispatcher } = config;

  // ════════════════════════════════════════════════════════════════════════════
  // API KEY AUTHENTICATION HOOK
  // ════════════════════════════════════════════════════════════════════════════

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only apply to /public/* routes
    if (!request.url.startsWith('/public/')) {
      return;
    }

    const apiKey = request.headers[API_KEY_HEADER.toLowerCase()] as string;

    if (!apiKey) {
      return reply.status(401).send({
        error: 'Missing API key',
        message: `Include your API key in the ${API_KEY_HEADER} header`,
      });
    }

    const clientIp = request.ip;
    const result = await apiKeyService.validateApiKey(apiKey, clientIp);

    if (!result.valid) {
      const statusCode = result.errorCode === 'RATE_LIMITED' ? 429 : 401;
      return reply.status(statusCode).send({
        error: result.errorCode,
        message: result.error,
      });
    }

    request.apiKeyAuth = result;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC APIS - LEARNER PROGRESS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get learner progress summary
   * Requires: READ_LEARNER_PROGRESS scope
   */
  app.get('/public/learners/:learnerId/progress', {
    schema: {
      params: z.object({
        learnerId: z.string().uuid(),
      }),
    },
  }, async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
    const { apiKeyAuth } = request;
    if (!apiKeyAuth?.scopes?.includes('READ_LEARNER_PROGRESS')) {
      return reply.status(403).send({
        error: 'INSUFFICIENT_SCOPE',
        message: 'API key does not have READ_LEARNER_PROGRESS scope',
      });
    }

    // Check if tenant allows this data access
    const settings = await prisma.integrationSettings.findUnique({
      where: { tenantId: apiKeyAuth.tenantId },
    });

    if (!settings?.allowLearnerProgress) {
      return reply.status(403).send({
        error: 'DATA_ACCESS_DISABLED',
        message: 'Tenant has not enabled learner progress data sharing',
      });
    }

    // TODO: Fetch actual progress from learner-model-svc
    // This is a mock response structure
    const progress = {
      learnerId: request.params.learnerId,
      subjects: [
        {
          subject: 'MATH',
          overallMastery: 0.72,
          skillsCount: 45,
          masteredSkills: 18,
          lastActivityAt: new Date().toISOString(),
        },
        {
          subject: 'READING',
          overallMastery: 0.65,
          skillsCount: 38,
          masteredSkills: 12,
          lastActivityAt: new Date().toISOString(),
        },
      ],
      engagement: {
        totalSessions: 47,
        totalTimeMinutes: 892,
        currentStreak: 5,
        longestStreak: 12,
        averageSessionLength: 19,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Log usage
    await apiKeyService.logUsage({
      apiKeyId: apiKeyAuth.apiKeyId!,
      endpoint: `/public/learners/${request.params.learnerId}/progress`,
      method: 'GET',
      statusCode: 200,
      responseTimeMs: 0, // Would be calculated with actual timing
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return progress;
  });

  /**
   * Get learner sessions
   * Requires: READ_SESSION_DATA scope
   */
  app.get('/public/learners/:learnerId/sessions', {
    schema: {
      params: z.object({
        learnerId: z.string().uuid(),
      }),
      querystring: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      }),
    },
  }, async (request: FastifyRequest<{
    Params: { learnerId: string };
    Querystring: { from?: string; to?: string; page: number; pageSize: number };
  }>, reply: FastifyReply) => {
    const { apiKeyAuth } = request;
    if (!apiKeyAuth?.scopes?.includes('READ_SESSION_DATA')) {
      return reply.status(403).send({
        error: 'INSUFFICIENT_SCOPE',
        message: 'API key does not have READ_SESSION_DATA scope',
      });
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { tenantId: apiKeyAuth.tenantId },
    });

    if (!settings?.allowSessionData) {
      return reply.status(403).send({
        error: 'DATA_ACCESS_DISABLED',
        message: 'Tenant has not enabled session data sharing',
      });
    }

    // TODO: Fetch actual sessions from session-svc
    // Mock response
    const sessions = {
      sessions: [
        {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          sessionType: 'LEARNING',
          subject: 'MATH',
          startedAt: new Date(Date.now() - 86400000).toISOString(),
          endedAt: new Date(Date.now() - 86400000 + 1200000).toISOString(),
          durationMinutes: 20,
          activitiesCompleted: 5,
          status: 'COMPLETED',
        },
      ],
      pagination: {
        total: 47,
        page: request.query.page,
        pageSize: request.query.pageSize,
        hasMore: true,
      },
    };

    await apiKeyService.logUsage({
      apiKeyId: apiKeyAuth.apiKeyId!,
      endpoint: `/public/learners/${request.params.learnerId}/sessions`,
      method: 'GET',
      statusCode: 200,
      responseTimeMs: 0,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return sessions;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC APIS - EXTERNAL EVENTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Submit external learning event
   * Requires: WRITE_EXTERNAL_EVENTS scope
   */
  app.post('/public/events/external-learning', {
    schema: {
      body: ExternalLearningEventSchema,
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof ExternalLearningEventSchema> }>, reply: FastifyReply) => {
    const { apiKeyAuth } = request;
    if (!apiKeyAuth?.scopes?.includes('WRITE_EXTERNAL_EVENTS')) {
      return reply.status(403).send({
        error: 'INSUFFICIENT_SCOPE',
        message: 'API key does not have WRITE_EXTERNAL_EVENTS scope',
      });
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { tenantId: apiKeyAuth.tenantId },
    });

    if (!settings?.allowExternalEvents) {
      return reply.status(403).send({
        error: 'DATA_ACCESS_DISABLED',
        message: 'Tenant has not enabled external event submission',
      });
    }

    const body = request.body;

    // Create external learning event
    const event = await prisma.externalLearningEvent.create({
      data: {
        tenantId: apiKeyAuth.tenantId!,
        learnerId: body.learnerId,
        source: body.source,
        activityType: body.activityType,
        subject: body.subject,
        topic: body.topic,
        durationMinutes: body.durationMinutes,
        score: body.score,
        completed: body.completed,
        metadataJson: body.metadata,
        apiKeyId: apiKeyAuth.apiKeyId!,
      },
    });

    await apiKeyService.logUsage({
      apiKeyId: apiKeyAuth.apiKeyId!,
      endpoint: '/public/events/external-learning',
      method: 'POST',
      statusCode: 201,
      responseTimeMs: 0,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(201).send({
      eventId: event.id,
      message: 'External learning event recorded successfully',
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN APIS - WEBHOOK MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * List webhook endpoints for tenant
   */
  app.get('/admin/webhooks', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Add proper admin auth (JWT from auth-svc)
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    return webhooks.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      url: w.url,
      enabled: w.enabled,
      eventTypes: w.eventTypes,
      filterJson: w.filterJson,
      lastDeliveryAt: w.lastDeliveryAt,
      failureCount: w.failureCount,
      disabledAt: w.disabledAt,
      disabledReason: w.disabledReason,
      deliveryCount: w._count.deliveries,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  });

  /**
   * Create webhook endpoint
   */
  app.post('/admin/webhooks', {
    schema: {
      body: CreateWebhookEndpointSchema,
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof CreateWebhookEndpointSchema> }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId || !userId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id or X-User-Id header' });
    }

    // Check webhook limit
    const settings = await prisma.integrationSettings.findUnique({
      where: { tenantId },
    });
    const maxEndpoints = settings?.maxWebhookEndpoints ?? 10;

    const currentCount = await prisma.webhookEndpoint.count({
      where: { tenantId },
    });

    if (currentCount >= maxEndpoints) {
      return reply.status(400).send({
        error: 'LIMIT_REACHED',
        message: `Maximum of ${maxEndpoints} webhook endpoints allowed`,
      });
    }

    const body = request.body;
    const secret = generateWebhookSecret();

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        url: body.url,
        secretKeyRef: secret, // In production, store in KMS and save reference
        enabled: body.enabled,
        eventTypes: body.eventTypes as WebhookEventType[],
        filterJson: body.filterJson,
        createdBy: userId,
      },
    });

    return reply.status(201).send({
      ...webhook,
      secret, // Only returned on creation
    });
  });

  /**
   * Update webhook endpoint
   */
  app.patch('/admin/webhooks/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: UpdateWebhookEndpointSchema,
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateWebhookEndpointSchema>;
  }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: request.params.id, tenantId },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    const body = request.body;
    const updated = await prisma.webhookEndpoint.update({
      where: { id: request.params.id },
      data: {
        name: body.name,
        description: body.description,
        url: body.url,
        enabled: body.enabled,
        eventTypes: body.eventTypes as WebhookEventType[] | undefined,
        filterJson: body.filterJson,
        // Clear disabled state if re-enabling
        ...(body.enabled === true ? { disabledAt: null, disabledReason: null, failureCount: 0 } : {}),
      },
    });

    return updated;
  });

  /**
   * Delete webhook endpoint
   */
  app.delete('/admin/webhooks/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: request.params.id, tenantId },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    await prisma.webhookEndpoint.delete({
      where: { id: request.params.id },
    });

    return reply.status(204).send();
  });

  /**
   * Get webhook delivery logs
   */
  app.get('/admin/webhooks/:id/deliveries', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'PERMANENT_FAILURE']).optional(),
      }),
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { page: number; pageSize: number; status?: string };
  }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: request.params.id, tenantId },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    const { page, pageSize, status } = request.query;
    const skip = (page - 1) * pageSize;

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: {
          webhookId: request.params.id,
          ...(status ? { status: status as never } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          attempts: {
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          webhookId: request.params.id,
          ...(status ? { status: status as never } : {}),
        },
      }),
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        eventType: d.eventType,
        eventId: d.eventId,
        status: d.status,
        attemptCount: d.attemptCount,
        maxAttempts: d.maxAttempts,
        lastStatusCode: d.lastStatusCode,
        lastErrorMessage: d.lastErrorMessage,
        responseTimeMs: d.responseTimeMs,
        createdAt: d.createdAt,
        scheduledAt: d.scheduledAt,
        lastAttemptAt: d.lastAttemptAt,
        completedAt: d.completedAt,
        lastAttempt: d.attempts[0] || null,
      })),
      pagination: {
        total,
        page,
        pageSize,
        hasMore: skip + deliveries.length < total,
      },
    };
  });

  /**
   * Rotate webhook secret
   */
  app.post('/admin/webhooks/:id/rotate-secret', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: request.params.id, tenantId },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    const newSecret = generateWebhookSecret();

    await prisma.webhookEndpoint.update({
      where: { id: request.params.id },
      data: { secretKeyRef: newSecret },
    });

    return { secret: newSecret };
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN APIS - API KEY MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * List API keys for tenant
   */
  app.get('/admin/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const keys = await apiKeyService.listApiKeys(tenantId);
    return keys;
  });

  /**
   * Create API key
   */
  app.post('/admin/api-keys', {
    schema: {
      body: CreateApiKeySchema,
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof CreateApiKeySchema> }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId || !userId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id or X-User-Id header' });
    }

    // Check API key limit
    const settings = await prisma.integrationSettings.findUnique({
      where: { tenantId },
    });
    const maxKeys = settings?.maxApiKeys ?? 5;

    const currentCount = await prisma.apiKey.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    if (currentCount >= maxKeys) {
      return reply.status(400).send({
        error: 'LIMIT_REACHED',
        message: `Maximum of ${maxKeys} active API keys allowed`,
      });
    }

    const body = request.body;

    const { apiKey, rawKey } = await apiKeyService.createApiKey({
      tenantId,
      name: body.name,
      description: body.description,
      scopes: body.scopes as ApiScope[],
      createdBy: userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      rateLimitPerMinute: body.rateLimitPerMinute,
      rateLimitPerDay: body.rateLimitPerDay,
      allowedIps: body.allowedIps,
    });

    return reply.status(201).send({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      // The raw key is only shown once on creation
      key: rawKey,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    });
  });

  /**
   * Revoke API key
   */
  app.delete('/admin/api-keys/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        reason: z.string().optional(),
      }).optional(),
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body?: { reason?: string };
  }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId || !userId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id or X-User-Id header' });
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: request.params.id, tenantId },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    await apiKeyService.revokeApiKey(
      request.params.id,
      userId,
      request.body?.reason
    );

    return reply.status(204).send();
  });

  /**
   * Get API key usage stats
   */
  app.get('/admin/api-keys/:id/usage', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: z.object({
        days: z.coerce.number().int().min(1).max(30).default(7),
      }),
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { days: number };
  }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: request.params.id, tenantId },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    const since = new Date();
    since.setDate(since.getDate() - request.query.days);

    const logs = await prisma.apiKeyUsageLog.findMany({
      where: {
        apiKeyId: request.params.id,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Aggregate stats
    const totalRequests = logs.length;
    const successfulRequests = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
    const avgResponseTime = logs.length > 0
      ? logs.reduce((sum, l) => sum + l.responseTimeMs, 0) / logs.length
      : 0;

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    for (const log of logs) {
      byEndpoint[log.endpoint] = (byEndpoint[log.endpoint] || 0) + 1;
    }

    return {
      apiKeyId: request.params.id,
      period: {
        from: since.toISOString(),
        to: new Date().toISOString(),
        days: request.query.days,
      },
      stats: {
        totalRequests,
        successfulRequests,
        errorRequests: totalRequests - successfulRequests,
        avgResponseTimeMs: Math.round(avgResponseTime),
      },
      byEndpoint: Object.entries(byEndpoint).map(([endpoint, count]) => ({
        endpoint,
        count,
      })),
      recentLogs: logs.slice(0, 50),
    };
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN APIS - INTEGRATION SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get integration settings for tenant
   */
  app.get('/admin/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    let settings = await prisma.integrationSettings.findUnique({
      where: { tenantId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.integrationSettings.create({
        data: { tenantId },
      });
    }

    return settings;
  });

  /**
   * Update integration settings
   */
  app.patch('/admin/settings', {
    schema: {
      body: z.object({
        allowLearnerProgress: z.boolean().optional(),
        allowSessionData: z.boolean().optional(),
        allowAnalytics: z.boolean().optional(),
        allowExternalEvents: z.boolean().optional(),
        excludePiiFromWebhooks: z.boolean().optional(),
        anonymizeLearnerId: z.boolean().optional(),
        maxWebhookEndpoints: z.number().int().min(1).max(50).optional(),
        webhookRetryEnabled: z.boolean().optional(),
        maxApiKeys: z.number().int().min(1).max(20).optional(),
        defaultKeyExpireDays: z.number().int().min(1).max(365).nullable().optional(),
      }),
    },
  }, async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing X-Tenant-Id header' });
    }

    const settings = await prisma.integrationSettings.upsert({
      where: { tenantId },
      update: request.body,
      create: {
        tenantId,
        ...request.body,
      },
    });

    return settings;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => {
    return { status: 'ok', service: 'integration-svc' };
  });
}
