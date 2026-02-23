/**
 * Curriculum Generation Routes
 *
 * REST endpoints for AI-powered curriculum generation from templates.
 *
 * Routes:
 *   GET  /generation/templates             — list available templates
 *   GET  /generation/templates/:id         — get template details
 *   POST /generation/trigger               — start curriculum generation for a tenant
 *   GET  /generation/jobs                  — list generation jobs for a tenant
 *   GET  /generation/jobs/:id              — get job status/progress
 *   POST /generation/jobs/:id/retry        — retry failed lessons in a job
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../db.js';
import { CurriculumGenerationService } from '../services/curriculum-generation.service.js';

const generationService = new CurriculumGenerationService(prisma);

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const TriggerGenerationSchema = z.object({
  templateId: z.string().uuid(),
  targetStandards: z.array(z.string()).min(1, 'At least one standard is required'),
  stateCode: z.string().length(2).optional(),
  academicYear: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function generationRoutes(app: FastifyInstance) {

  // ────────────────────────────────────────────────────────────────────────
  // TEMPLATES
  // ────────────────────────────────────────────────────────────────────────

  /**
   * List all active curriculum templates.
   * Optionally filter by subject and/or gradeBand.
   */
  app.get('/templates', async (request: FastifyRequest<{
    Querystring: {
      subject?: string;
      gradeBand?: string;
      isActive?: string;
    }
  }>) => {
    const { subject, gradeBand, isActive } = request.query;

    return generationService.listTemplates({
      ...(subject && { subject: subject as any }),
      ...(gradeBand && { gradeBand: gradeBand as any }),
      ...(isActive !== undefined && { isActive: isActive !== 'false' }),
    });
  });

  /**
   * Get a single template with full details (including unit blueprints).
   */
  app.get('/templates/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const template = await generationService.getTemplate(request.params.id);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return template;
  });

  // ────────────────────────────────────────────────────────────────────────
  // GENERATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Trigger curriculum generation from a template.
   *
   * Requires `x-tenant-id` header (set by the API gateway / reverse proxy)
   * and optionally `x-user-id` (who triggered it).
   *
   * Body:
   *   - templateId: UUID of the CurriculumTemplate
   *   - targetStandards: e.g. ["TEKS", "TX_MATH"]
   *   - stateCode: e.g. "TX" (optional)
   *   - academicYear: e.g. "2025-2026" (optional, defaults to template)
   */
  app.post('/trigger', async (request: FastifyRequest<{
    Body: z.infer<typeof TriggerGenerationSchema>;
    Headers: { 'x-tenant-id'?: string; 'x-user-id'?: string }
  }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'];
    if (!tenantId) {
      return reply.status(400).send({ error: 'x-tenant-id header is required' });
    }

    const body = TriggerGenerationSchema.parse(request.body);
    const userId = request.headers['x-user-id'] ?? 'system';

    try {
      const result = await generationService.generateFromTemplate({
        tenantId,
        templateId: body.templateId,
        targetStandards: body.targetStandards,
        stateCode: body.stateCode,
        academicYear: body.academicYear,
        triggeredBy: userId,
      });

      const statusCode = result.status === 'ALREADY_COMPLETED' ? 200 : 201;
      return reply.status(statusCode).send(result);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('already in progress')) {
        return reply.status(409).send({ error: message });
      }
      if (message.includes('not found')) {
        return reply.status(404).send({ error: message });
      }

      request.log.error({ error }, 'Curriculum generation failed');
      return reply.status(500).send({ error: 'Curriculum generation failed', details: message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // JOBS
  // ────────────────────────────────────────────────────────────────────────

  /**
   * List generation jobs for a tenant.
   * Optionally filter by status.
   */
  app.get('/jobs', async (request: FastifyRequest<{
    Querystring: {
      tenantId?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
    Headers: { 'x-tenant-id'?: string }
  }>, reply: FastifyReply) => {
    const tenantId = request.query.tenantId ?? request.headers['x-tenant-id'];
    if (!tenantId) {
      return reply.status(400).send({ error: 'x-tenant-id header or tenantId query param required' });
    }

    return generationService.listJobs(tenantId, {
      status: request.query.status,
      limit: request.query.limit ? parseInt(request.query.limit, 10) : undefined,
      offset: request.query.offset ? parseInt(request.query.offset, 10) : undefined,
    });
  });

  /**
   * Get a single generation job by ID, including progress details.
   */
  app.get('/jobs/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const job = await generationService.getJob(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    // Add computed progress percentage
    const progress = job.lessonsTotal > 0
      ? Math.round((job.lessonsGenerated / job.lessonsTotal) * 100)
      : 0;

    return { ...job, progress };
  });

  /**
   * Retry failed lessons in a partially-completed generation job.
   */
  app.post('/jobs/:id/retry', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const result = await generationService.retryFailedLessons(request.params.id);
      return reply.status(200).send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.status(404).send({ error: message });
      }
      if (message.includes('not in a retryable state')) {
        return reply.status(400).send({ error: message });
      }

      request.log.error({ error }, 'Retry failed');
      return reply.status(500).send({ error: 'Retry failed', details: message });
    }
  });
}
