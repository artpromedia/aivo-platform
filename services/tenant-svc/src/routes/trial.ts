/**
 * Trial Management API Routes (Sprint 11 — Task 5)
 *
 * GET  /trial/:tenantId          — Get trial status for a tenant
 * POST /trial/:tenantId/convert  — Convert trial to paid plan
 * POST /trial/:tenantId/confirm  — Confirm Stripe checkout
 * POST /trial/:tenantId/extend   — Extend trial (platform admin only)
 * POST /trial/process-expirations — Process all trial expirations (cron)
 *
 * @module routes/trial
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { TrialManagementService } from '../services/trial-management.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const convertTrialSchema = z.object({
  planType: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  billingEmail: z.string().email().optional(),
});

const confirmConversionSchema = z.object({
  stripeSessionId: z.string().min(1),
});

const extendTrialSchema = z.object({
  additionalDays: z.number().int().min(1).max(365),
  reason: z.string().max(500).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function registerTrialRoutes(
  fastify: FastifyInstance,
  opts: { service: TrialManagementService },
) {
  const { service } = opts;

  // ──────────────────────────────────────────────────────────────────────────
  // GET /trial/:tenantId — Get trial status
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const info = await service.getTrialInfo(tenantId);
      return reply.send({ trial: info });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /trial/:tenantId/convert — Convert trial to paid plan
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:tenantId/convert', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = convertTrialSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await service.convertToPaid(tenantId, parsed.data.planType, parsed.data.billingEmail);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({ conversion: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /trial/:tenantId/confirm — Confirm Stripe checkout
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:tenantId/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = confirmConversionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await service.confirmConversion(tenantId, parsed.data.stripeSessionId);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({ conversion: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /trial/:tenantId/extend — Extend trial (platform admin)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/:tenantId/extend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = extendTrialSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    // Check for platform admin role
    const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const role = user?.role as string;
    if (!['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return reply.status(403).send({ error: 'Only platform admins can extend trials' });
    }

    try {
      const info = await service.extendTrial(tenantId, parsed.data.additionalDays, parsed.data.reason);
      return reply.send({ message: `Trial extended by ${parsed.data.additionalDays} days`, trial: info });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /trial/process-expirations — Cron job endpoint
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/process-expirations', async (request: FastifyRequest, reply: FastifyReply) => {
    // Verify internal API key for cron jobs
    const apiKey = request.headers['x-internal-api-key'] as string;
    const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const role = user?.role as string;

    if (!apiKey && !['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    try {
      const results = await service.processTrialExpirations();

      return reply.send({
        message: 'Trial expiration processing complete',
        results,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error({ err: error }, '[Trial] Failed to process expirations');
      return reply.status(500).send({ error: message });
    }
  });
}
