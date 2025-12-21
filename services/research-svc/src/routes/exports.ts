/**
 * Research Export Routes
 *
 * Export job creation, listing, and download management.
 * Implements secure S3 presigned URLs for FERPA/COPPA compliant data exports.
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
import { getS3Service, S3ServiceError } from '../services/s3.service.js';

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

    // Generate presigned S3 download URL
    try {
      const { url, expiresIn, expiresAt } = await generateSignedDownloadUrl(
        job.storagePath,
        job.format
      );

      return reply.send({
        url,
        expiresIn,
        expiresAt: expiresAt.toISOString(),
        filename: `export-${job.id}.${job.format.toLowerCase()}`,
      });
    } catch (error) {
      // Handle S3 errors gracefully
      if (error instanceof S3ServiceError) {
        if (error.code === 'NOT_FOUND' || error.statusCode === 404) {
          return reply.status(404).send({ error: 'Export file not found in storage' });
        }
        return reply.status(500).send({
          error: 'Failed to generate download URL',
          code: error.code,
        });
      }
      throw error;
    }
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

/** Default expiry for download URLs in seconds (1 hour) */
const DOWNLOAD_URL_EXPIRY_SECONDS = 3600;

/**
 * Generate a presigned download URL for S3.
 * Uses AWS SDK v3 S3 request presigner for secure, time-limited access.
 *
 * @param storagePath - The S3 storage path (s3://bucket/key format or just key)
 * @param format - The export format for proper content-type
 * @returns A presigned URL valid for 1 hour
 * @throws S3ServiceError if the file doesn't exist or S3 access fails
 */
async function generateSignedDownloadUrl(
  storagePath: string,
  format: 'CSV' | 'JSON' | 'PARQUET' = 'CSV'
): Promise<{ url: string; expiresIn: number; expiresAt: Date }> {
  const s3Service = getS3Service();

  // Extract the key from the storage path
  // Format can be: s3://bucket/key or just key
  let key = storagePath;
  if (storagePath.startsWith('s3://')) {
    // Parse s3://bucket/key format
    const withoutProtocol = storagePath.slice(5);
    const slashIndex = withoutProtocol.indexOf('/');
    key = slashIndex >= 0 ? withoutProtocol.slice(slashIndex + 1) : withoutProtocol;
  }

  // Map format to content type
  const contentTypes: Record<string, string> = {
    CSV: 'text/csv',
    JSON: 'application/json',
    PARQUET: 'application/vnd.apache.parquet',
  };

  const { url, expiresAt } = await s3Service.getPresignedDownloadUrl(key, {
    expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
    contentType: contentTypes[format] ?? 'application/octet-stream',
  });

  return {
    url,
    expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
    expiresAt,
  };
}
