/**
 * Ed-Fi Service API Routes
 *
 * REST API for managing Ed-Fi configurations and exports.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { EdfiClient, type EdfiApiVersion } from '../connectors/edfi-client';
import { ExportService, type LearnerDataSource } from '../exports/export-service';
import type { PrismaClient } from '../generated/prisma-client';

// Request/Response types
interface CreateConfigBody {
  tenantId: string;
  name: string;
  stateCode: string;
  apiVersion: 'V5_3' | 'V6_1' | 'V7_0';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  schoolYear: number;
  exportSchedule?: string;
  enabledResources?: string[];
}

interface UpdateConfigBody {
  name?: string;
  enabled?: boolean;
  exportSchedule?: string;
  enabledResources?: string[];
}

interface TriggerExportBody {
  resourceTypes?: string[];
  fullSync?: boolean;
}

interface ConfigParams {
  configId: string;
}

interface TenantParams {
  tenantId: string;
}

interface ExportParams {
  exportId: string;
}

export async function registerRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  learnerDataSource: LearnerDataSource
): Promise<void> {
  const exportService = new ExportService(prisma, learnerDataSource);

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  // List configurations for a tenant
  app.get<{ Params: TenantParams }>(
    '/api/v1/tenants/:tenantId/edfi/configs',
    async (request, reply) => {
      const { tenantId } = request.params;

      const configs = await prisma.edfiConfig.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          stateCode: true,
          apiVersion: true,
          baseUrl: true,
          schoolYear: true,
          enabled: true,
          exportSchedule: true,
          enabledResources: true,
          lastExportAt: true,
          lastSuccessAt: true,
          createdAt: true,
        },
      });

      return reply.send({ configs });
    }
  );

  // Get single configuration
  app.get<{ Params: ConfigParams }>('/api/v1/edfi/configs/:configId', async (request, reply) => {
    const { configId } = request.params;

    const config = await prisma.edfiConfig.findUnique({
      where: { id: configId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        stateCode: true,
        apiVersion: true,
        baseUrl: true,
        clientId: true,
        schoolYear: true,
        enabled: true,
        exportSchedule: true,
        enabledResources: true,
        extensionsJson: true,
        lastExportAt: true,
        lastSuccessAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!config) {
      return reply.code(404).send({ error: 'Configuration not found' });
    }

    return reply.send({ config });
  });

  // Create configuration
  app.post<{ Body: CreateConfigBody }>('/api/v1/edfi/configs', async (request, reply) => {
    const body = request.body;

    // Validate API version
    if (!['V5_3', 'V6_1', 'V7_0'].includes(body.apiVersion)) {
      return reply.code(400).send({ error: 'Invalid API version' });
    }

    // Encrypt client secret (in production, use proper encryption)
    const clientSecretEnc = Buffer.from(body.clientSecret).toString('base64');

    const config = await prisma.edfiConfig.create({
      data: {
        tenantId: body.tenantId,
        name: body.name,
        stateCode: body.stateCode.toUpperCase(),
        apiVersion: body.apiVersion as EdfiApiVersion,
        baseUrl: body.baseUrl,
        clientId: body.clientId,
        clientSecretEnc,
        schoolYear: body.schoolYear,
        exportSchedule: body.exportSchedule,
        enabledResources: (body.enabledResources as any[]) || [],
        enabled: true,
      },
    });

    // Log audit
    await prisma.edfiAuditLog.create({
      data: {
        tenantId: body.tenantId,
        configId: config.id,
        action: 'CONFIG_CREATED',
        actorType: 'USER',
        details: { name: body.name, stateCode: body.stateCode },
      },
    });

    return reply.code(201).send({
      config: {
        id: config.id,
        name: config.name,
        stateCode: config.stateCode,
        apiVersion: config.apiVersion,
        baseUrl: config.baseUrl,
        schoolYear: config.schoolYear,
        enabled: config.enabled,
      },
    });
  });

  // Update configuration
  app.patch<{ Params: ConfigParams; Body: UpdateConfigBody }>(
    '/api/v1/edfi/configs/:configId',
    async (request, reply) => {
      const { configId } = request.params;
      const body = request.body;

      const config = await prisma.edfiConfig.update({
        where: { id: configId },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.enabled !== undefined && { enabled: body.enabled }),
          ...(body.exportSchedule !== undefined && { exportSchedule: body.exportSchedule }),
          ...(body.enabledResources && { enabledResources: body.enabledResources as any[] }),
        },
      });

      return reply.send({ config });
    }
  );

  // Delete configuration
  app.delete<{ Params: ConfigParams }>('/api/v1/edfi/configs/:configId', async (request, reply) => {
    const { configId } = request.params;

    await prisma.edfiConfig.delete({
      where: { id: configId },
    });

    return reply.code(204).send();
  });

  // Test connection
  app.post<{ Params: ConfigParams }>(
    '/api/v1/edfi/configs/:configId/test',
    async (request, reply) => {
      const { configId } = request.params;

      const config = await prisma.edfiConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        return reply.code(404).send({ error: 'Configuration not found' });
      }

      // Decrypt client secret
      const clientSecret = Buffer.from(config.clientSecretEnc, 'base64').toString();

      const client = new EdfiClient({
        baseUrl: config.baseUrl,
        clientId: config.clientId,
        clientSecret,
        apiVersion: config.apiVersion as EdfiApiVersion,
        schoolYear: config.schoolYear,
      });

      const result = await client.testConnection();

      return reply.send(result);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  // Trigger manual export
  app.post<{ Params: ConfigParams; Body: TriggerExportBody }>(
    '/api/v1/edfi/configs/:configId/export',
    async (request, reply) => {
      const { configId } = request.params;
      const body = request.body;

      const config = await prisma.edfiConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        return reply.code(404).send({ error: 'Configuration not found' });
      }

      if (!config.enabled) {
        return reply.code(400).send({ error: 'Configuration is disabled' });
      }

      // Decrypt client secret
      const clientSecret = Buffer.from(config.clientSecretEnc, 'base64').toString();

      const exportId = await exportService.startExport(
        {
          id: config.id,
          tenantId: config.tenantId,
          name: config.name,
          stateCode: config.stateCode,
          apiVersion: config.apiVersion as EdfiApiVersion,
          baseUrl: config.baseUrl,
          clientId: config.clientId,
          clientSecret,
          schoolYear: config.schoolYear,
          enabledResources: config.enabledResources as any[],
        },
        {
          resourceTypes: body.resourceTypes as any[],
          fullSync: body.fullSync,
          isManual: true,
        }
      );

      return reply.code(202).send({
        exportId,
        message: 'Export started',
      });
    }
  );

  // Get export status
  app.get<{ Params: ExportParams }>('/api/v1/edfi/exports/:exportId', async (request, reply) => {
    const { exportId } = request.params;

    const progress = await exportService.getExportProgress(exportId);

    if (!progress) {
      return reply.code(404).send({ error: 'Export not found' });
    }

    return reply.send({ export: progress });
  });

  // Cancel export
  app.post<{ Params: ExportParams }>(
    '/api/v1/edfi/exports/:exportId/cancel',
    async (request, reply) => {
      const { exportId } = request.params;

      await exportService.cancelExport(exportId);

      return reply.send({ message: 'Export cancelled' });
    }
  );

  // List export history
  app.get<{ Params: ConfigParams; Querystring: { limit?: string; offset?: string } }>(
    '/api/v1/edfi/configs/:configId/exports',
    async (request, reply) => {
      const { configId } = request.params;
      const limit = parseInt(request.query.limit || '20', 10);
      const offset = parseInt(request.query.offset || '0', 10);

      const { runs, total } = await exportService.getExportHistory(configId, { limit, offset });

      return reply.send({ exports: runs, total, limit, offset });
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  // Validate data before export
  app.post<{ Params: ConfigParams; Body: { resourceTypes: string[] } }>(
    '/api/v1/edfi/configs/:configId/validate',
    async (request, reply) => {
      const { configId } = request.params;
      const { resourceTypes } = request.body;

      const config = await prisma.edfiConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        return reply.code(404).send({ error: 'Configuration not found' });
      }

      // Get validation errors
      const errors = await prisma.edfiValidationError.findMany({
        where: {
          configId,
          resourceType: { in: resourceTypes as any[] },
          resolved: false,
        },
        take: 100,
      });

      const errorsByType = errors.reduce(
        (acc, err) => {
          const rt = err.resourceType;
          if (!acc[rt]) {
            acc[rt] = { count: 0, samples: [] };
          }
          acc[rt].count++;
          if (acc[rt].samples.length < 5) {
            acc[rt].samples.push({
              recordId: err.aivoRecordId,
              field: err.field,
              error: err.errorMessage,
            });
          }
          return acc;
        },
        {} as Record<string, { count: number; samples: any[] }>
      );

      return reply.send({
        valid: errors.length === 0,
        errors: Object.entries(errorsByType).map(([type, data]) => ({
          resourceType: type,
          ...data,
        })),
      });
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'edfi-svc' });
  });
}

export default registerRoutes;
