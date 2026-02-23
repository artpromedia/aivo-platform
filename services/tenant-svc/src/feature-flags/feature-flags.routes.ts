/**
 * Feature Flags Routes
 *
 * Admin endpoints for managing per-tenant feature flags.
 *
 * Routes:
 *   GET  /admin/feature-flags/:tenantId            – Get all flags
 *   PUT  /admin/feature-flags/:tenantId             – Set a flag
 *   GET  /admin/feature-flags/available              – List available flags
 *
 * @module feature-flags/feature-flags.routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  TenantFeatureFlagsService,
  DISTRICT_TOGGLEABLE_FLAGS,
} from './tenant-feature-flags.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const TenantIdParams = z.object({
  tenantId: z.string().uuid(),
});

const SetFlagBody = z.object({
  flag: z.string().min(1, 'Flag name is required'),
  enabled: z.boolean(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ══════════════════════════════════════════════════════════════════════════════

export interface FeatureFlagsRoutesOpts {
  service: TenantFeatureFlagsService;
}

export const featureFlagsRoutes: FastifyPluginAsync<FeatureFlagsRoutesOpts> = async (
  fastify,
  opts,
) => {
  const { service } = opts;

  // ──────── GET /admin/feature-flags/available ─────────
  fastify.get('/available', async (_request, reply) => {
    return reply.send({
      flags: DISTRICT_TOGGLEABLE_FLAGS.map((flag) => ({
        flag,
        description: flag.replace(/_/g, ' '),
      })),
    });
  });

  // ────── GET /admin/feature-flags/:tenantId ───────────
  fastify.get<{ Params: z.infer<typeof TenantIdParams> }>(
    '/:tenantId',
    async (request, reply) => {
      const { tenantId } = TenantIdParams.parse(request.params);
      const flags = await service.getFlags(tenantId);
      return reply.send({ tenantId, flags });
    },
  );

  // ────── PUT /admin/feature-flags/:tenantId ───────────
  fastify.put<{
    Params: z.infer<typeof TenantIdParams>;
    Body: z.infer<typeof SetFlagBody>;
  }>('/:tenantId', async (request, reply) => {
    const { tenantId } = TenantIdParams.parse(request.params);
    const body = SetFlagBody.parse(request.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (request as any).user as { sub?: string } | undefined;

    try {
      const entry = await service.setFlag({
        tenantId,
        flag: body.flag,
        enabled: body.enabled,
        setBy: user?.sub,
      });
      return reply.send(entry);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not a valid toggleable flag')) {
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
      throw err;
    }
  });
};
