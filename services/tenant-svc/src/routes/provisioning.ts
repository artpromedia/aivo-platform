/**
 * Tenant Provisioning API Routes (Sprint 11 — Task 3)
 *
 * POST /provisioning/start   — Start a new provisioning job
 * GET  /provisioning/:id     — Get provisioning job status
 * POST /provisioning/:id/retry — Retry a failed provisioning job
 *
 * @module routes/provisioning
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { ProvisioningService } from '../services/provisioning.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const startProvisioningSchema = z.object({
  organizationName: z.string().min(2).max(200),
  adminEmail: z.string().email().max(255),
  adminName: z.string().min(1).max(100).optional(),
  organizationType: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']).default('DISTRICT'),
  planId: z.string().max(100).optional(),
  districtSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  stateCode: z.string().length(2).optional(),
  zipCode: z.string().min(5).max(10).optional(),
  idempotencyKey: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function registerProvisioningRoutes(
  fastify: FastifyInstance,
  opts: { service: ProvisioningService },
) {
  const { service } = opts;

  // ──────────────────────────────────────────────────────────────────────────
  // POST /provisioning/start — Start provisioning pipeline
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = startProvisioningSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      // Create the job record
      const job = await service.startProvisioningJob(parsed.data);

      // Execute the pipeline asynchronously (fire-and-forget for long-running)
      // The client can poll GET /provisioning/:id for status
      service.executeJob(job.jobId).catch((err) => {
        fastify.log.error(
          { err, jobId: job.jobId },
          '[Provisioning] Pipeline execution failed',
        );
      });

      return reply.status(202).send({
        message: 'Provisioning started',
        job: {
          id: job.jobId,
          status: job.status,
          organizationName: job.organizationName,
          adminEmail: job.adminEmail,
          currentStep: job.currentStep,
          totalSteps: job.totalSteps,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error({ err: error }, '[Provisioning] Failed to start job');

      // Return 409 for duplicate organization errors
      if (message.includes('already exists') || message.includes('already has')) {
        return reply.status(409).send({ error: message });
      }

      return reply.status(500).send({ error: 'Failed to start provisioning', details: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /provisioning/:id — Get provisioning job status
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const job = await service.getJobStatus(id);

      return reply.send({
        job: {
          id: job.jobId,
          tenantId: job.tenantId,
          status: job.status,
          organizationName: job.organizationName,
          adminEmail: job.adminEmail,
          currentStep: job.currentStep,
          totalSteps: job.totalSteps,
          stepLog: job.stepLog,
          completedAt: job.completedAt,
          progress: Math.round((job.currentStep / job.totalSteps) * 100),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Provisioning job not found' });
      }

      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /provisioning/:id/retry — Retry a failed provisioning job
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:id/retry', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const job = await service.retryJob(id);

      return reply.status(202).send({
        message: 'Provisioning retry started',
        job: {
          id: job.jobId,
          tenantId: job.tenantId,
          status: job.status,
          currentStep: job.currentStep,
          totalSteps: job.totalSteps,
          completedAt: job.completedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Provisioning job not found' });
      }
      if (message.includes('not in FAILED') || message.includes('exceeded maximum')) {
        return reply.status(400).send({ error: message });
      }

      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /provisioning/:id/rollback — Roll back a failed provisioning job
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:id/rollback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await service.rollbackJob(id);

      return reply.send({
        message: 'Provisioning job rolled back successfully',
        jobId: id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Provisioning job not found' });
      }
      if (message.includes('Only failed jobs')) {
        return reply.status(400).send({ error: message });
      }

      return reply.status(500).send({ error: message });
    }
  });
}
