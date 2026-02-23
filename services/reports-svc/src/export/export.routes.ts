/**
 * Export Routes — Bulk data export endpoints for district data warehouses.
 *
 * POST   /exports              — Create an export job (returns 202 Accepted)
 * GET    /exports              — List jobs for the authenticated tenant
 * GET    /exports/:id          — Get single job status
 * GET    /exports/:id/download — Redirect to presigned S3 URL
 * DELETE /exports/:id          — Delete job + S3 object
 * POST   /exports/:id/resend   — Re-send completed export via email
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  createExportJob,
  processExportJob,
  listExportJobs,
  getExportJob,
  refreshDownloadUrl,
  deleteExportJob,
} from './data-export.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ExportTypes = [
  'student_roster',
  'assessment_results',
  'session_activity',
  'skill_mastery',
  'engagement_metrics',
  'gradebook',
  'iep_progress',
] as const;

const CreateExportSchema = z.object({
  exportType: z.enum(ExportTypes),
  format: z.enum(['csv', 'excel', 'json']).default('csv'),
  filters: z.record(z.unknown()).optional(),
  dateRangeStart: z.coerce.date().optional(),
  dateRangeEnd: z.coerce.date().optional(),
  deliveryMethod: z.enum(['download', 'email', 'sftp']).default('download'),
  deliveryTarget: z.string().optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  status: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export async function exportRoutes(app: FastifyInstance) {
  /**
   * POST /exports — Create a new export job.
   * Returns 202 with the job record; processing happens asynchronously.
   */
  app.post('/exports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, sub: userId } = request.user as { tenantId: string; sub: string };
    const body = CreateExportSchema.parse(request.body);

    const job = await createExportJob({
      tenantId,
      requestedBy: userId,
      exportType: body.exportType,
      format: body.format,
      filters: body.filters,
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
      deliveryMethod: body.deliveryMethod,
      deliveryTarget: body.deliveryTarget,
    });

    // Fire-and-forget: process in background
    const token = (request.headers.authorization || '').replace('Bearer ', '');
    processExportJob(job.id, token).catch((err) =>
      request.log.error({ err, jobId: job.id }, 'Background export processing failed')
    );

    return reply.status(202).send(job);
  });

  /**
   * GET /exports — List export jobs for the tenant.
   */
  app.get('/exports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const query = ListQuerySchema.parse(request.query);
    const result = await listExportJobs(tenantId, query);
    return reply.send(result);
  });

  /**
   * GET /exports/:id — Get a single export job.
   */
  app.get('/exports/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const job = await getExportJob(tenantId, id);
    if (!job) return reply.status(404).send({ error: 'Export job not found' });
    return reply.send(job);
  });

  /**
   * GET /exports/:id/download — Redirect to the presigned download URL.
   * Refreshes the URL if it's expired.
   */
  app.get('/exports/:id/download', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };

    const job = await getExportJob(tenantId, id);
    if (!job) return reply.status(404).send({ error: 'Export job not found' });
    if (job.status !== 'completed') {
      return reply.status(409).send({ error: 'Export not yet completed', status: job.status });
    }

    // Refresh URL if expired
    let downloadUrl = job.downloadUrl;
    if (!downloadUrl || !job.expiresAt || new Date() > job.expiresAt) {
      const refreshed = await refreshDownloadUrl(tenantId, id);
      if (!refreshed) return reply.status(410).send({ error: 'Export file no longer available' });
      downloadUrl = refreshed.downloadUrl;
    }

    return reply.redirect(downloadUrl!, 302);
  });

  /**
   * DELETE /exports/:id — Delete the job and its S3 artifact.
   */
  app.delete('/exports/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const deleted = await deleteExportJob(tenantId, id);
    if (!deleted) return reply.status(404).send({ error: 'Export job not found' });
    return reply.status(204).send();
  });

  /**
   * POST /exports/:id/resend — Re-send a completed export via email.
   */
  app.post('/exports/:id/resend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const { email } = (request.body as { email?: string }) || {};

    const job = await getExportJob(tenantId, id);
    if (!job) return reply.status(404).send({ error: 'Export job not found' });
    if (job.status !== 'completed' || !job.downloadUrl) {
      return reply.status(409).send({ error: 'Export not available for resend' });
    }

    if (!email) return reply.status(400).send({ error: 'email is required' });

    // Refresh URL
    const refreshed = await refreshDownloadUrl(tenantId, id);
    if (!refreshed) return reply.status(410).send({ error: 'Export file no longer available' });

    // Use notify service — same as data-export.service
    const { config } = await import('../config.js');
    await fetch(`${config.services.notify}/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `Your ${job.exportType.replace(/_/g, ' ')} export is ready`,
        html: `
          <p>Your data export is ready for download.</p>
          <p><a href="${refreshed.downloadUrl}">Download Export</a></p>
          <p><em>This link expires on ${refreshed.expiresAt.toISOString()}.</em></p>
        `,
      }),
    });

    return reply.send({ message: 'Export resent', email });
  });
}
