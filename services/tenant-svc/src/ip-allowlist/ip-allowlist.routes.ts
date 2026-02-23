/**
 * IP Allowlist Routes
 *
 * Admin endpoints for managing per-tenant CIDR allow-list entries.
 *
 * Routes:
 *   GET    /admin/ip-allowlist/:tenantId       – List ranges
 *   POST   /admin/ip-allowlist/:tenantId       – Add a CIDR range
 *   DELETE /admin/ip-allowlist/:tenantId/:id   – Remove a range
 *   POST   /admin/ip-allowlist/:tenantId/test  – Test an IP against the list
 *
 * @module ip-allowlist/ip-allowlist.routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { IpAllowlistService, ipMatchesCidr } from './ip-allowlist.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const TenantIdParams = z.object({
  tenantId: z.string().uuid(),
});

const RangeIdParams = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
});

const AddRangeBody = z.object({
  cidr: z.string().min(1, 'CIDR is required'),
  label: z.string().max(120).optional(),
});

const TestIpBody = z.object({
  ip: z.string().min(1, 'IP address is required'),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ══════════════════════════════════════════════════════════════════════════════

export interface IpAllowlistRoutesOpts {
  service: IpAllowlistService;
}

export const ipAllowlistRoutes: FastifyPluginAsync<IpAllowlistRoutesOpts> = async (
  fastify,
  opts,
) => {
  const { service } = opts;

  // ───────────────── GET /admin/ip-allowlist/:tenantId ─────────────────
  fastify.get<{ Params: z.infer<typeof TenantIdParams> }>(
    '/:tenantId',
    async (request, reply) => {
      const { tenantId } = TenantIdParams.parse(request.params);
      const entries = await service.listRanges(tenantId);
      return reply.send({ tenantId, entries });
    },
  );

  // ───────────────── POST /admin/ip-allowlist/:tenantId ────────────────
  fastify.post<{
    Params: z.infer<typeof TenantIdParams>;
    Body: z.infer<typeof AddRangeBody>;
  }>('/:tenantId', async (request, reply) => {
    const { tenantId } = TenantIdParams.parse(request.params);
    const body = AddRangeBody.parse(request.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (request as any).user as { sub?: string } | undefined;

    const entry = await service.addRange({
      tenantId,
      cidr: body.cidr,
      label: body.label,
      createdBy: user?.sub,
    });
    return reply.status(201).send(entry);
  });

  // ──────────── DELETE /admin/ip-allowlist/:tenantId/:id ───────────────
  fastify.delete<{ Params: z.infer<typeof RangeIdParams> }>(
    '/:tenantId/:id',
    async (request, reply) => {
      const { tenantId, id } = RangeIdParams.parse(request.params);
      const removed = await service.removeRange(tenantId, id);
      if (!removed) {
        return reply.status(404).send({ error: 'Not Found', message: 'Range not found' });
      }
      return reply.status(204).send();
    },
  );

  // ──────── POST /admin/ip-allowlist/:tenantId/test ────────────────────
  fastify.post<{
    Params: z.infer<typeof TenantIdParams>;
    Body: z.infer<typeof TestIpBody>;
  }>('/:tenantId/test', async (request, reply) => {
    const { tenantId } = TenantIdParams.parse(request.params);
    const { ip } = TestIpBody.parse(request.body);
    const allowed = await service.isAllowed(tenantId, ip);

    // Also show which entry matched (if any)
    let matchedCidr: string | null = null;
    if (allowed) {
      const entries = await service.listRanges(tenantId);
      const match = entries.find((e) => {
        try {
          return ipMatchesCidr(ip, e.cidr);
        } catch {
          return false;
        }
      });
      matchedCidr = match?.cidr ?? null;
    }

    return reply.send({ tenantId, ip, allowed, matchedCidr });
  });
};
