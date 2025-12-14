/**
 * SIS Sync Service - API Routes
 * 
 * Provides REST API for managing SIS integrations.
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient, SisProviderType } from '@prisma/client';
import { z } from 'zod';
import { SyncScheduler, getSchedulePreset, isValidCronExpression } from '../scheduler';
import { validateProviderConfig } from '../providers';

// Request/Response Schemas
const CreateProviderSchema = z.object({
  tenantId: z.string().min(1),
  providerType: z.enum(['CLEVER', 'CLASSLINK', 'ONEROSTER_API', 'ONEROSTER_CSV', 'GOOGLE_WORKSPACE', 'MICROSOFT_ENTRA', 'CUSTOM']),
  name: z.string().min(1).max(255),
  config: z.record(z.unknown()),
  enabled: z.boolean().default(true),
  syncSchedule: z.string().nullable().optional(),
});

const UpdateProviderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
  syncSchedule: z.string().nullable().optional(),
});

const UpdateScheduleSchema = z.object({
  schedule: z.string().nullable(),
});

const TriggerSyncSchema = z.object({
  triggeredBy: z.string().optional(),
});

export function registerRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  scheduler: SyncScheduler
): void {
  // ==========================================================================
  // Provider Management
  // ==========================================================================

  /**
   * List all providers for a tenant
   */
  app.get('/api/v1/tenants/:tenantId/providers', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };

    const providers = await prisma.sisProvider.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        providerType: true,
        name: true,
        enabled: true,
        lastSyncAt: true,
        syncSchedule: true,
        createdAt: true,
        updatedAt: true,
        // Don't include configJson for security
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ providers });
  });

  /**
   * Get a specific provider
   */
  app.get('/api/v1/providers/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };

    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        tenantId: true,
        providerType: true,
        name: true,
        enabled: true,
        lastSyncAt: true,
        syncSchedule: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // Get sync status
    const status = await scheduler.getSyncStatus(providerId);

    return reply.send({ provider, status });
  });

  /**
   * Create a new provider
   */
  app.post('/api/v1/providers', async (request, reply) => {
    const body = CreateProviderSchema.parse(request.body);

    // Validate provider config
    const validation = validateProviderConfig(
      body.providerType as SisProviderType,
      body.config
    );

    if (!validation.valid) {
      return reply.status(400).send({
        error: 'Invalid provider configuration',
        details: validation.errors,
      });
    }

    // Validate cron expression if provided
    if (body.syncSchedule && !isValidCronExpression(body.syncSchedule)) {
      return reply.status(400).send({
        error: 'Invalid cron expression for syncSchedule',
      });
    }

    // Check for existing provider of same type
    const existing = await prisma.sisProvider.findUnique({
      where: {
        tenantId_providerType: {
          tenantId: body.tenantId,
          providerType: body.providerType as SisProviderType,
        },
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: `A ${body.providerType} provider already exists for this tenant`,
      });
    }

    const provider = await prisma.sisProvider.create({
      data: {
        tenantId: body.tenantId,
        providerType: body.providerType as SisProviderType,
        name: body.name,
        configJson: JSON.stringify(body.config),
        enabled: body.enabled,
        syncSchedule: body.syncSchedule,
      },
    });

    // Schedule if enabled
    if (provider.enabled && provider.syncSchedule) {
      scheduler.scheduleProvider(provider);
    }

    return reply.status(201).send({
      provider: {
        id: provider.id,
        tenantId: provider.tenantId,
        providerType: provider.providerType,
        name: provider.name,
        enabled: provider.enabled,
        syncSchedule: provider.syncSchedule,
        createdAt: provider.createdAt,
      },
    });
  });

  /**
   * Update a provider
   */
  app.patch('/api/v1/providers/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = UpdateProviderSchema.parse(request.body);

    const existing = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // Validate config if updating
    if (body.config) {
      const validation = validateProviderConfig(existing.providerType, body.config);
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid provider configuration',
          details: validation.errors,
        });
      }
    }

    // Validate cron if updating
    if (body.syncSchedule !== undefined && body.syncSchedule !== null) {
      if (!isValidCronExpression(body.syncSchedule)) {
        return reply.status(400).send({
          error: 'Invalid cron expression for syncSchedule',
        });
      }
    }

    const provider = await prisma.sisProvider.update({
      where: { id: providerId },
      data: {
        name: body.name,
        configJson: body.config ? JSON.stringify(body.config) : undefined,
        enabled: body.enabled,
        syncSchedule: body.syncSchedule,
      },
    });

    // Update scheduler
    if (provider.enabled && provider.syncSchedule) {
      scheduler.scheduleProvider(provider);
    } else {
      scheduler.unscheduleProvider(providerId);
    }

    return reply.send({
      provider: {
        id: provider.id,
        tenantId: provider.tenantId,
        providerType: provider.providerType,
        name: provider.name,
        enabled: provider.enabled,
        syncSchedule: provider.syncSchedule,
        updatedAt: provider.updatedAt,
      },
    });
  });

  /**
   * Delete a provider
   */
  app.delete('/api/v1/providers/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };

    const existing = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // Unschedule
    scheduler.unscheduleProvider(providerId);

    // Delete (cascades to sync runs and raw data)
    await prisma.sisProvider.delete({
      where: { id: providerId },
    });

    return reply.status(204).send();
  });

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  /**
   * Trigger a sync manually
   */
  app.post('/api/v1/providers/:providerId/sync', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = TriggerSyncSchema.parse(request.body || {});

    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    if (!provider.enabled) {
      return reply.status(400).send({ error: 'Provider is disabled' });
    }

    const result = await scheduler.runSync(
      provider.tenantId,
      providerId,
      body.triggeredBy,
      true
    );

    if (!result.success) {
      return reply.status(409).send({ error: result.error });
    }

    return reply.status(202).send({
      message: 'Sync started',
      syncRunId: result.syncRunId,
    });
  });

  /**
   * Cancel a running sync
   */
  app.post('/api/v1/providers/:providerId/sync/cancel', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };

    const cancelled = await scheduler.cancelSync(providerId);

    if (!cancelled) {
      return reply.status(400).send({ error: 'No sync running for this provider' });
    }

    return reply.send({ message: 'Sync cancelled' });
  });

  /**
   * Get sync status
   */
  app.get('/api/v1/providers/:providerId/sync/status', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };

    const status = await scheduler.getSyncStatus(providerId);

    return reply.send({ status });
  });

  /**
   * Update sync schedule
   */
  app.put('/api/v1/providers/:providerId/schedule', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = UpdateScheduleSchema.parse(request.body);

    // Validate cron if not null
    if (body.schedule && !isValidCronExpression(body.schedule)) {
      // Check for presets
      const preset = getSchedulePreset(body.schedule);
      if (!preset) {
        return reply.status(400).send({
          error: 'Invalid schedule. Use a cron expression or preset: daily, twice-daily, every-6-hours, weekdays, hourly, weekly',
        });
      }
      body.schedule = preset;
    }

    await scheduler.updateSchedule(providerId, body.schedule);

    return reply.send({ message: 'Schedule updated', schedule: body.schedule });
  });

  // ==========================================================================
  // Sync History
  // ==========================================================================

  /**
   * List sync runs for a provider
   */
  app.get('/api/v1/providers/:providerId/runs', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const runs = await prisma.sisSyncRun.findMany({
      where: { providerId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        statsJson: true,
        errorMessage: true,
        triggeredBy: true,
        isManual: true,
      },
      orderBy: { startedAt: 'desc' },
      take: Number.parseInt(limit, 10),
      skip: Number.parseInt(offset, 10),
    });

    const total = await prisma.sisSyncRun.count({
      where: { providerId },
    });

    return reply.send({
      runs: runs.map((run) => ({
        ...run,
        stats: run.statsJson ? JSON.parse(run.statsJson) : null,
        statsJson: undefined,
      })),
      total,
      limit: Number.parseInt(limit, 10),
      offset: Number.parseInt(offset, 10),
    });
  });

  /**
   * Get a specific sync run
   */
  app.get('/api/v1/runs/:runId', async (request, reply) => {
    const { runId } = request.params as { runId: string };

    const run = await prisma.sisSyncRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return reply.status(404).send({ error: 'Sync run not found' });
    }

    return reply.send({
      run: {
        ...run,
        stats: run.statsJson ? JSON.parse(run.statsJson) : null,
        statsJson: undefined,
      },
    });
  });

  // ==========================================================================
  // Test Connection
  // ==========================================================================

  /**
   * Test provider connection
   */
  app.post('/api/v1/providers/:providerId/test', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };

    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    try {
      const { createAndInitializeProvider } = await import('../providers');
      const providerInstance = await createAndInitializeProvider(
        provider.providerType,
        provider.configJson
      );

      const result = await providerInstance.testConnection();
      await providerInstance.cleanup();

      return reply.send(result);
    } catch (error) {
      return reply.send({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==========================================================================
  // Health Check
  // ==========================================================================

  app.get('/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'healthy' });
    } catch {
      return reply.status(503).send({ status: 'unhealthy' });
    }
  });

  app.get('/ready', async (request, reply) => {
    return reply.send({ status: 'ready' });
  });
}
