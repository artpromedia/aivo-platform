/**
 * Tenant Deprovisioning API Routes (Sprint 11 — Task 6)
 *
 * POST /deprovisioning/:tenantId/initiate — Start soft deletion
 * POST /deprovisioning/:tenantId/cancel   — Cancel pending deletion
 * GET  /deprovisioning/:tenantId/status   — Get deletion status
 * POST /deprovisioning/:tenantId/export   — Request data export (GDPR)
 * GET  /deprovisioning/exports/:exportId  — Get export status
 * POST /deprovisioning/process-deletions  — Process permanent deletions (cron)
 *
 * @module routes/deprovisioning
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { DeprovisioningService } from '../services/deprovisioning.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const initiateDeletionSchema = z.object({
  reason: z.string().max(500).optional(),
  exportData: z.boolean().default(false),
});

const requestExportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function registerDeprovisioningRoutes(
  fastify: FastifyInstance,
  opts: { service: DeprovisioningService },
) {
  const { service } = opts;

  // ──────────────────────────────────────────────────────────────────────────
  // POST /deprovisioning/:tenantId/initiate — Initiate soft deletion
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:tenantId/initiate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = initiateDeletionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const userId = (user?.sub ?? user?.userId ?? '') as string;
    const userEmail = (user?.email ?? '') as string;

    try {
      const status = await service.initiateDeletion({
        tenantId,
        requestedBy: userId,
        requestedByEmail: userEmail,
        reason: parsed.data.reason,
        exportData: parsed.data.exportData,
      });

      return reply.send({
        message: 'Tenant deletion initiated',
        deletion: status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      if (message.includes('already been permanently')) {
        return reply.status(400).send({ error: message });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /deprovisioning/:tenantId/cancel — Cancel pending deletion
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:tenantId/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const userId = (user?.sub ?? user?.userId ?? '') as string;
    const userEmail = (user?.email ?? '') as string;

    try {
      const status = await service.cancelDeletion(tenantId, userId, userEmail);

      return reply.send({
        message: 'Tenant deletion cancelled, tenant reactivated',
        deletion: status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      if (message.includes('Cannot cancel')) {
        return reply.status(400).send({ error: message });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /deprovisioning/:tenantId/status — Get deletion status
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/:tenantId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const status = await service.getDeletionStatus(tenantId);
      return reply.send({ deletion: status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /deprovisioning/:tenantId/export — Request data export (GDPR)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:tenantId/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = requestExportSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const userId = (user?.sub ?? user?.userId ?? '') as string;
    const userEmail = (user?.email ?? '') as string;

    try {
      const result = await service.requestDataExport(
        tenantId,
        userId,
        userEmail,
        parsed.data.format,
      );

      return reply.status(202).send({
        message: 'Data export requested',
        export: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /deprovisioning/exports/:exportId — Get export status
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/exports/:exportId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { exportId } = request.params as { exportId: string };

    try {
      const result = await service.getDataExportStatus(exportId);
      return reply.send({ export: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Data export not found' });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /deprovisioning/process-deletions — Process permanent deletions (cron)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/process-deletions', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-internal-api-key'] as string;
    const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const role = (user?.role ?? '') as string;

    if (!apiKey && !['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    try {
      const results = await service.processPermanentDeletions();

      return reply.send({
        message: 'Permanent deletion processing complete',
        results,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error({ err: error }, '[Deprovisioning] Failed to process deletions');
      return reply.status(500).send({ error: message });
    }
  });
}
