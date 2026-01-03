/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
/**
 * SIS Sync Routes
 *
 * Fastify routes for SIS sync operations including:
 * - Delta sync triggering
 * - Webhook handling
 * - Sync status monitoring
 * - Provider management
 *
 * @author AIVO Platform Team
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { ExtendedPrismaClient as PrismaClient } from '../prisma-types.js';
import { DeltaSyncEngine, SyncEntityType } from '../sync/delta-sync-engine.js';
import { WebhookHandlerService, WebhookProviderType } from '../webhooks/webhook-handler.service.js';
import { ProviderFactory, EnvSecretsResolver } from '../providers/factory.js';
import type { ISisProvider, FieldMapping } from '../providers/types.js';

/**
 * Register SIS sync routes
 */
export async function registerSyncRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient
): Promise<void> {
  // Initialize services
  const secretsResolver = new EnvSecretsResolver();
  const providerFactory = new ProviderFactory(prisma, secretsResolver);
  const deltaSyncEngine = new DeltaSyncEngine(prisma);
  const webhookHandler = new WebhookHandlerService(
    prisma,
    deltaSyncEngine,
    providerFactory
  );

  // Load webhook configurations
  await webhookHandler.loadConfigs();

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Trigger a delta sync for a provider
   */
  fastify.post<{
    Params: { tenantId: string; providerId: string };
    Body: { entityTypes?: SyncEntityType[]; force?: boolean };
  }>(
    '/tenants/:tenantId/providers/:providerId/sync',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            providerId: { type: 'string' },
          },
          required: ['tenantId', 'providerId'],
        },
        body: {
          type: 'object',
          properties: {
            entityTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['org', 'student', 'teacher', 'parent', 'class', 'enrollment', 'relationship', 'term', 'demographic'],
              },
            },
            force: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId, providerId } = request.params;
      const { entityTypes, force } = request.body || {};

      try {
        // Get provider
        const provider = await providerFactory.getProvider(tenantId, providerId);

        if (!provider) {
          return reply.code(404).send({
            error: 'Provider not found or disabled',
          });
        }

        // Get provider config
        const providerConfig = await prisma.sisProvider.findUnique({
          where: { id: providerId },
        });

        if (!providerConfig) {
          return reply.code(404).send({ error: 'Provider configuration not found' });
        }

        // Determine entity types to sync
        const enabledEntityTypes: SyncEntityType[] = entityTypes || [
          'org',
          'teacher',
          'student',
          'parent',
          'class',
          'enrollment',
          'relationship',
          'term',
          'demographic',
        ];

        // Start sync (async - return immediately)
        const syncRunId = await startSyncRun(prisma, tenantId, providerId);

        // Run sync in background
        runDeltaSync(
          prisma,
          deltaSyncEngine,
          provider,
          tenantId,
          providerId,
          syncRunId,
          enabledEntityTypes,
          force ?? false
        ).catch((error: unknown) => {
          console.error('[SyncRoutes] Background sync failed', error);
        });

        return reply.code(202).send({
          syncRunId,
          status: 'started',
          message: 'Delta sync started',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SyncRoutes] Failed to start sync', error);
        return reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Get sync status
   */
  fastify.get<{
    Params: { tenantId: string; providerId: string };
  }>(
    '/tenants/:tenantId/providers/:providerId/sync/status',
    async (request, reply) => {
      const { tenantId, providerId } = request.params;

      const syncState = await prisma.deltaSyncState.findFirst({
        where: { tenantId, providerId },
      });

      const lastSyncRun = await prisma.sisSyncRun.findFirst({
        where: { tenantId, providerId },
        orderBy: { startedAt: 'desc' },
      });

      return reply.send({
        syncState: syncState || null,
        lastSyncRun: lastSyncRun || null,
      });
    }
  );

  /**
   * Get sync history
   */
  fastify.get<{
    Params: { tenantId: string; providerId: string };
    Querystring: { limit?: number; offset?: number };
  }>(
    '/tenants/:tenantId/providers/:providerId/sync/history',
    async (request, reply) => {
      const { tenantId, providerId } = request.params;
      const { limit = 20, offset = 0 } = request.query;

      const syncRuns = await prisma.sisSyncRun.findMany({
        where: { tenantId, providerId },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.sisSyncRun.count({
        where: { tenantId, providerId },
      });

      return reply.send({
        syncRuns,
        pagination: { total, limit, offset },
      });
    }
  );

  /**
   * Get sync conflicts
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { status?: string; limit?: number; offset?: number };
  }>(
    '/tenants/:tenantId/sync/conflicts',
    async (request, reply) => {
      const { tenantId } = request.params;
      const { status = 'pending', limit = 50, offset = 0 } = request.query;

      const conflicts = await prisma.syncConflict.findMany({
        where: { tenantId, status },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.syncConflict.count({
        where: { tenantId, status },
      });

      return reply.send({
        conflicts,
        pagination: { total, limit, offset },
      });
    }
  );

  /**
   * Resolve a sync conflict
   */
  fastify.post<{
    Params: { tenantId: string; conflictId: string };
    Body: { resolution: 'source' | 'target' | 'manual'; manualValue?: any; resolvedBy: string };
  }>(
    '/tenants/:tenantId/sync/conflicts/:conflictId/resolve',
    async (request, reply) => {
      const { tenantId, conflictId } = request.params;
      const { resolution, manualValue, resolvedBy } = request.body;

      const conflict = await prisma.syncConflict.findFirst({
        where: { id: conflictId, tenantId },
      });

      if (!conflict) {
        return reply.code(404).send({ error: 'Conflict not found' });
      }

      const resolvedValue =
        resolution === 'source' ? conflict.sourceValue :
        resolution === 'target' ? conflict.targetValue :
        manualValue;

      await prisma.syncConflict.update({
        where: { id: conflictId },
        data: {
          status: 'resolved',
          resolution,
          resolvedValue,
          resolvedBy,
          resolvedAt: new Date(),
        },
      });

      return reply.send({ success: true });
    }
  );

  // ============================================================================
  // Webhook Endpoints
  // ============================================================================

  /**
   * Handle incoming webhooks from SIS providers
   */
  fastify.post<{
    Params: { provider: string };
    Querystring: { tenantId?: string };
    Body: any;
  }>(
    '/webhooks/:provider',
    {
      config: {
        rawBody: true, // Need raw body for signature verification
      },
    },
    async (request, reply) => {
      const { provider } = request.params;
      const { tenantId } = request.query;

      // Convert headers to plain object
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value[0];
        }
      }

      try {
        const result = await webhookHandler.processWebhook(
          provider as WebhookProviderType,
          headers,
          request.body,
          tenantId
        );

        if (result.success) {
          return reply.send({
            success: true,
            eventId: result.eventId,
            processed: result.processed,
          });
        } else {
          return reply.code(result.retryable ? 503 : 400).send({
            success: false,
            error: result.error,
            retryable: result.retryable,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SyncRoutes] Webhook processing failed', error);
        return reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Microsoft Graph webhook validation
   */
  fastify.post<{
    Params: { provider: string };
    Querystring: { validationToken?: string };
  }>(
    '/webhooks/microsoft',
    async (request, reply) => {
      const { validationToken } = request.query;

      // Microsoft sends a validation token that we need to echo back
      if (validationToken) {
        reply.header('Content-Type', 'text/plain');
        return reply.send(validationToken);
      }

      // Process actual webhook (forward to generic handler)
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }

      const result = await webhookHandler.processWebhook(
        'microsoft',
        headers,
        request.body
      );

      return reply.send(result);
    }
  );

  // ============================================================================
  // Provider Management
  // ============================================================================

  /**
   * List providers for a tenant
   */
  fastify.get<{
    Params: { tenantId: string };
  }>(
    '/tenants/:tenantId/providers',
    async (request, reply) => {
      const { tenantId } = request.params;

      const providers = await prisma.sisProvider.findMany({
        where: { tenantId },
        select: {
          id: true,
          tenantId: true,
          providerType: true,
          name: true,
          enabled: true,
          integrationStatus: true,
          lastSyncAt: true,
          syncSchedule: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send({ providers });
    }
  );

  /**
   * Test provider connection
   */
  fastify.post<{
    Params: { tenantId: string; providerId: string };
  }>(
    '/tenants/:tenantId/providers/:providerId/test',
    async (request, reply) => {
      const { tenantId, providerId } = request.params;

      try {
        const provider = await providerFactory.getProvider(tenantId, providerId);

        if (!provider) {
          return reply.code(404).send({
            success: false,
            error: 'Provider not found or disabled',
          });
        }

        if (provider.testConnection) {
          const result = await provider.testConnection();
          return reply.send(result);
        }

        // If no test method, just check that we got a provider
        return reply.send({
          success: true,
          message: 'Provider initialized successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.send({
          success: false,
          message,
        });
      }
    }
  );

  // ============================================================================
  // Parent-Student Relationships
  // ============================================================================

  /**
   * Get parent-student relationships for a tenant
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { studentId?: string; parentId?: string };
  }>(
    '/tenants/:tenantId/relationships',
    async (request, reply) => {
      const { tenantId } = request.params;
      const { studentId, parentId } = request.query;

      const where: any = { tenantId };
      if (studentId) where.studentExternalId = studentId;
      if (parentId) where.parentExternalId = parentId;

      const relationships = await prisma.parentStudentRelationship.findMany({
        where,
      });

      return reply.send({ relationships });
    }
  );

  // ============================================================================
  // Academic Terms
  // ============================================================================

  /**
   * Get academic terms for a tenant
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { schoolYear?: number };
  }>(
    '/tenants/:tenantId/terms',
    async (request, reply) => {
      const { tenantId } = request.params;
      const { schoolYear } = request.query;

      const where: any = { tenantId };
      if (schoolYear) where.schoolYear = schoolYear;

      const terms = await prisma.academicTerm.findMany({
        where,
        orderBy: { beginDate: 'asc' },
      });

      return reply.send({ terms });
    }
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

async function startSyncRun(
  prisma: PrismaClient,
  tenantId: string,
  providerId: string
): Promise<string> {
  const syncRun = await prisma.sisSyncRun.create({
    data: {
      tenantId,
      providerId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });
  return syncRun.id;
}

async function runDeltaSync(
  prisma: PrismaClient,
  deltaSyncEngine: DeltaSyncEngine,
  provider: ISisProvider,
  tenantId: string,
  providerId: string,
  syncRunId: string,
  enabledEntityTypes: SyncEntityType[],
  _force: boolean
): Promise<void> {
  try {
    const stats = await deltaSyncEngine.executeDeltaSync({
      tenantId,
      providerId,
      provider,
      batchSize: 500,
      maxRetries: 3,
      conflictResolution: 'source_wins',
      enabledEntityTypes,
      fieldMappings: {} as Record<SyncEntityType, FieldMapping[]>,
      webhookEnabled: false,
    });

    // Update sync run with success
    await prisma.sisSyncRun.update({
      where: { id: syncRunId },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        statsJson: JSON.stringify(stats),
      },
    });

    // Update provider last sync time
    await prisma.sisProvider.update({
      where: { id: providerId },
      data: { lastSyncAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Update sync run with failure
    await prisma.sisSyncRun.update({
      where: { id: syncRunId },
      data: {
        status: 'FAILURE',
        completedAt: new Date(),
        errorMessage: message,
      },
    });

    throw error;
  }
}
