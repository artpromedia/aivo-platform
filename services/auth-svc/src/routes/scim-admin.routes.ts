/**
 * SCIM Admin Routes
 *
 * Admin endpoints for managing SCIM tokens.
 * Requires DISTRICT_ADMIN or PLATFORM_ADMIN role.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { ScimTokenService } from '../scim/scim-token.service.js';

const GenerateTokenSchema = z.object({
  label: z.string().min(1).max(255),
});

interface TokenIdParams {
  id: string;
}

export async function registerScimAdminRoutes(app: FastifyInstance): Promise<void> {
  const tokenService = new ScimTokenService(prisma);

  // Authorization hook: require DISTRICT_ADMIN or PLATFORM_ADMIN
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) {
      reply.code(401).send({ error: 'Authentication required' });
      return;
    }

    const roles: string[] = user.roles || [];
    const allowed = roles.some(
      (r: string) => r === 'DISTRICT_ADMIN' || r === 'PLATFORM_ADMIN'
    );

    if (!allowed) {
      reply.code(403).send({ error: 'Insufficient permissions. Requires DISTRICT_ADMIN or PLATFORM_ADMIN role.' });
      return;
    }
  });

  // Helper to extract tenantId from JWT claims
  function getTenantId(request: FastifyRequest): string {
    const user = (request as any).user;
    return user?.tenantId;
  }

  /**
   * POST /admin/scim/tokens — Generate a new SCIM token
   */
  app.post('/tokens', async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = GenerateTokenSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.issues });
    }

    const result = await tokenService.generateToken(tenantId, parsed.data.label);

    return reply.code(201).send({
      id: result.id,
      token: result.token,
      label: parsed.data.label,
      message: 'Store this token securely. It will not be shown again.',
    });
  });

  /**
   * GET /admin/scim/tokens — List SCIM tokens for tenant
   */
  app.get('/tokens', async (request, reply) => {
    const tenantId = getTenantId(request);
    const tokens = await tokenService.listTokens(tenantId);

    return reply.send({ tokens });
  });

  /**
   * DELETE /admin/scim/tokens/:id — Revoke a SCIM token
   */
  app.delete<{ Params: TokenIdParams }>('/tokens/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      await tokenService.revokeToken(tenantId, id);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(404).send({ error: 'Token not found' });
    }
  });
}
