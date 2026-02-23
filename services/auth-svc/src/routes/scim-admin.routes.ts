/**
 * SCIM Admin Routes
 *
 * Manage SCIM bearer tokens. Accessible only by DISTRICT_ADMIN / PLATFORM_ADMIN.
 * These routes live under /admin/scim/tokens and are protected by the standard
 * JWT auth middleware (not SCIM bearer token auth).
 */

import type { FastifyInstance } from 'fastify';

import { generateToken, revokeToken, listTokens } from '../scim/scim-token.service.js';

interface TokenBody {
  label: string;
}

interface TokenParams {
  tokenId: string;
}

export async function registerScimAdminRoutes(app: FastifyInstance): Promise<void> {
  // Bail out if SCIM is explicitly disabled
  if (process.env.SCIM_ENABLED === 'false') return;

  const requireAdmin = app.authorize(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  // ── List tokens ──────────────────────────────────────────────────────────
  app.get(
    '/admin/scim/tokens',
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const tenantId = (request as any).user?.tenantId;
      if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });

      const tokens = await listTokens(tenantId);
      return reply.send({ tokens });
    }
  );

  // ── Create token ─────────────────────────────────────────────────────────
  app.post<{ Body: TokenBody }>(
    '/admin/scim/tokens',
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const tenantId = (request as any).user?.tenantId;
      if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });

      const { label } = request.body;
      if (!label || typeof label !== 'string') {
        return reply.code(400).send({ error: 'label is required' });
      }

      const { id, rawToken } = await generateToken(tenantId, label);

      // Raw token is only shown once — the caller must store it securely
      return reply.code(201).send({ id, token: rawToken, label });
    }
  );

  // ── Revoke token ─────────────────────────────────────────────────────────
  app.delete<{ Params: TokenParams }>(
    '/admin/scim/tokens/:tokenId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const tenantId = (request as any).user?.tenantId;
      if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });

      const revoked = await revokeToken(tenantId, request.params.tokenId);

      if (!revoked) {
        return reply.code(404).send({ error: 'Token not found or already revoked' });
      }

      return reply.code(204).send();
    }
  );
}

export default registerScimAdminRoutes;
