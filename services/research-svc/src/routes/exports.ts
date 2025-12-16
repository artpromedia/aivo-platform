/**
 * Research Export Routes
 *
 * Export job creation, listing, and download management.
 */

import type { ExportJobStatus } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { AuditContext } from '../services/auditService.js';
import {
  createExportJob,
  getExportJob,
  getUserExportJobs,
  getProjectExportJobs,
  recordDownload,
} from '../services/exportService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════════════════════════

const createExportSchema = z.object({
  projectId: z.string().uuid(),
  datasetDefinitionId: z.string().uuid(),
  cohortId: z.string().uuid().optional(),
  format: z.enum(['CSV', 'JSON', 'PARQUET']).default('CSV'),
  dateRangeStart: z.string().datetime().optional(),
  dateRangeEnd: z.string().datetime().optional(),
  sampling: z
    .object({
      enabled: z.boolean(),
      rate: z.number().min(0.01).max(1),
    })
    .optional(),
});

const listExportsSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(), // comma-separated
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ═══════════════════════════════════════════════════════════════════════════════

export const exportRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /research/exports
   * Request a new data export
   */
  app.post('/exports', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const body = createExportSchema.parse(request.body);

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    };

    const job = await createExportJob(
      {
        tenantId: user.tenantId,
        researchProjectId: body.projectId,
        datasetDefinitionId: body.datasetDefinitionId,
        cohortId: body.cohortId ?? '', // cohortId is optional in schema but required in service
        format: body.format,
        dateRangeFrom: body.dateRangeStart ? new Date(body.dateRangeStart) : new Date(),
        dateRangeTo: body.dateRangeEnd ? new Date(body.dateRangeEnd) : new Date(),
        requestedByUserId: user.sub,
      },
      auditContext
    );

    return reply.status(202).send({
      id: job.id,
      status: job.status,
      message: 'Export job queued. You will be notified when ready.',
    });
  });

  /**
   * GET /research/exports
   * List export jobs
   */
  app.get('/exports', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string; roles?: string[] };
    const query = listExportsSchema.parse(request.query);

    const isAdmin =
      user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');

    let result;
    if (query.projectId) {
      // List exports for specific project
      result = await getProjectExportJobs(query.projectId, user.tenantId, {
        status: query.status?.split(',') as ExportJobStatus[] | undefined,
        limit: query.limit,
        offset: query.offset,
      });
    } else {
      // List user's exports (admins see all)
      result = await getUserExportJobs(isAdmin ? undefined : user.sub, user.tenantId, {
        status: query.status?.split(',') as ExportJobStatus[] | undefined,
        limit: query.limit,
        offset: query.offset,
      });
    }

    return reply.send(result);
  });

  /**
   * GET /research/exports/:id
   * Get export job details
   */
  app.get('/exports/:id', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { id } = request.params as { id: string };

    const job = await getExportJob(id, user.tenantId);

    if (!job) {
      return reply.status(404).send({ error: 'Export job not found' });
    }

    return reply.send(job);
  });

  /**
   * GET /research/exports/:id/download
   * Get download URL (signed) for completed export
   */
  app.get('/exports/:id/download', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const { id } = request.params as { id: string };

    const job = await getExportJob(id, user.tenantId);

    if (!job) {
      return reply.status(404).send({ error: 'Export job not found' });
    }

    if (job.status !== 'SUCCEEDED') {
      return reply.status(400).send({ error: 'Export not ready for download', status: job.status });
    }

    if (!job.storagePath) {
      return reply.status(500).send({ error: 'Export file path missing' });
    }

    // Check expiry
    if (job.storageExpiresAt && new Date(job.storageExpiresAt) < new Date()) {
      return reply.status(410).send({ error: 'Export has expired' });
    }

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    };

    // Record download access
    await recordDownload(id, user.sub, auditContext);

    // In production, generate signed URL from S3
    // For now, return the path
    const signedUrl = await generateSignedDownloadUrl(job.storagePath);

    return reply.send({
      url: signedUrl,
      expiresIn: 3600, // 1 hour
      filename: `export-${job.id}.${job.format.toLowerCase()}`,
      // checksum field not available in schema
    });
  });

  /**
   * GET /research/exports/:id/preview
   * Get a preview of export data (first 100 rows)
   */
  app.get('/exports/:id/preview', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { id } = request.params as { id: string };

    const job = await getExportJob(id, user.tenantId);

    if (!job) {
      return reply.status(404).send({ error: 'Export job not found' });
    }

    if (job.status !== 'SUCCEEDED') {
      return reply.status(400).send({ error: 'Export not ready for preview', status: job.status });
    }

    // In production, read first 100 rows from S3
    // For now, return placeholder
    return reply.send({
      columns: ['learner_id_pseudo', 'date_key', 'session_count', 'total_minutes'],
      rows: [],
      totalRows: job.rowCount,
      previewRows: 0,
    });
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a signed download URL for S3.
 * In production, use @aws-sdk/s3-request-presigner.
 *
 * @param path - The S3 object path to generate a signed URL for
 * @returns A presigned URL valid for 1 hour
 */
async function generateSignedDownloadUrl(path: string): Promise<string> {
  // FIXME: Replace with actual S3 presigned URL generation using @aws-sdk/s3-request-presigner
  // Current implementation returns a placeholder URL for development
  return `https://research-exports.aivo.com/download?path=${encodeURIComponent(path)}&expires=3600`;
}
