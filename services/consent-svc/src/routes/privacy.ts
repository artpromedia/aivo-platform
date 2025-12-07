import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { config } from '../config.js';
import { consentDefinitions } from '../privacyConfig.js';
import { createConsent, listConsentsForLearner } from '../repository.js';
import type { ConsentStatus } from '../types.js';

const consentConfigQuery = z.object({
  learnerId: z.string(),
});

export const registerPrivacyRoutes: FastifyPluginAsync<{ pool: Pool }> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

  fastify.get(
    '/consent-config',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const parsed = consentConfigQuery.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid query' });
        return;
      }
      const auth = (request as any).auth as AuthContext;
      const learnerId = parsed.data.learnerId;

      const existing = await listConsentsForLearner(pool, auth.tenantId, learnerId);

      const enriched = await Promise.all(
        consentDefinitions.map(async (def) => {
          const existingConsent = existing.find((c) => c.consent_type === def.type);
          if (!existingConsent) {
            const created = await createConsent(pool, {
              tenantId: auth.tenantId,
              learnerId,
              consentType: def.type,
              status: 'PENDING',
            });
            return {
              type: def.type,
              consentId: created.id,
              status: created.status,
              required: def.required,
              description: def.description,
              privacyPolicyUrl: config.privacyPolicyUrl,
            };
          }
          return {
            type: def.type,
            consentId: existingConsent.id,
            status: existingConsent.status,
            required: def.required,
            description: def.description,
            privacyPolicyUrl: config.privacyPolicyUrl,
          };
        })
      );

      reply
        .code(200)
        .send({ learnerId, privacyPolicyUrl: config.privacyPolicyUrl, consents: enriched });
    }
  );

  fastify.get(
    '/consent-aggregates',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => {
      const auth = (request as any).auth as AuthContext;
      const { rows } = await pool.query<{
        consent_type: string;
        status: ConsentStatus;
        count: string;
      }>(
        `SELECT consent_type, status, COUNT(*)::text AS count
         FROM consents
         WHERE tenant_id = $1
         GROUP BY consent_type, status
         ORDER BY consent_type, status`,
        [auth.tenantId]
      );
      const aggregates = rows.map((row) => ({
        type: row.consent_type,
        status: row.status,
        count: Number(row.count),
      }));
      reply.code(200).send({ tenantId: auth.tenantId, aggregates });
    }
  );
};
