/**
 * Custom Domain Routes
 *
 * Admin endpoints for managing tenant custom domains.
 *
 * Routes:
 *   GET    /admin/custom-domains/:tenantId           – List domains
 *   POST   /admin/custom-domains/:tenantId           – Add a custom domain
 *   DELETE /admin/custom-domains/:tenantId/:id        – Remove a domain
 *   POST   /admin/custom-domains/:tenantId/:id/verify – Verify DNS ownership
 *
 * @module custom-domains/custom-domain.routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { CustomDomainService } from './custom-domain.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const TenantIdParams = z.object({
  tenantId: z.string().uuid(),
});

const DomainIdParams = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
});

const AddDomainBody = z.object({
  domain: z
    .string()
    .min(4, 'Domain must be at least 4 characters')
    .max(253, 'Domain must be at most 253 characters')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      'Invalid domain format',
    ),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ══════════════════════════════════════════════════════════════════════════════

export interface CustomDomainRoutesOpts {
  service: CustomDomainService;
}

export const customDomainRoutes: FastifyPluginAsync<CustomDomainRoutesOpts> = async (
  fastify,
  opts,
) => {
  const { service } = opts;

  // ────────── GET /admin/custom-domains/:tenantId ──────────
  fastify.get<{ Params: z.infer<typeof TenantIdParams> }>(
    '/:tenantId',
    async (request, reply) => {
      const { tenantId } = TenantIdParams.parse(request.params);
      const domains = await service.listDomains(tenantId);
      return reply.send({ tenantId, domains });
    },
  );

  // ────────── POST /admin/custom-domains/:tenantId ─────────
  fastify.post<{
    Params: z.infer<typeof TenantIdParams>;
    Body: z.infer<typeof AddDomainBody>;
  }>('/:tenantId', async (request, reply) => {
    const { tenantId } = TenantIdParams.parse(request.params);
    const { domain } = AddDomainBody.parse(request.body);

    const entry = await service.addDomain({ tenantId, domain });

    return reply.status(201).send({
      ...entry,
      instructions: [
        `Create a DNS TXT record at _aivo-verification.${domain}`,
        `Set the value to: ${entry.verificationToken}`,
        `Then call POST /admin/custom-domains/${tenantId}/${entry.id}/verify`,
      ],
    });
  });

  // ─────── DELETE /admin/custom-domains/:tenantId/:id ──────
  fastify.delete<{ Params: z.infer<typeof DomainIdParams> }>(
    '/:tenantId/:id',
    async (request, reply) => {
      const { tenantId, id } = DomainIdParams.parse(request.params);
      const removed = await service.removeDomain(tenantId, id);
      if (!removed) {
        return reply.status(404).send({ error: 'Not Found', message: 'Domain not found' });
      }
      return reply.status(204).send();
    },
  );

  // ──── POST /admin/custom-domains/:tenantId/:id/verify ────
  fastify.post<{ Params: z.infer<typeof DomainIdParams> }>(
    '/:tenantId/:id/verify',
    async (request, reply) => {
      const { tenantId, id } = DomainIdParams.parse(request.params);
      const result = await service.verifyDomain(tenantId, id);
      const status = result.verified ? 200 : 422;
      return reply.status(status).send(result);
    },
  );
};
