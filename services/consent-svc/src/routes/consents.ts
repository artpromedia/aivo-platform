import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { buildTransition, TransitionError } from '../fsm.js';
import {
  applyTransition,
  createConsent,
  getConsentById,
  listConsentsForLearner,
} from '../repository.js';
import type { ConsentStatus, ConsentType } from '../types.js';

const consentTypeSchema = z.enum(['BASELINE_ASSESSMENT', 'AI_TUTOR', 'RESEARCH_ANALYTICS']);

const createConsentBody = z.object({
  learnerId: z.string(),
  consentType: consentTypeSchema,
  status: z.enum(['PENDING']).optional(),
  expiresAt: z.string().datetime().optional(),
});

const transitionBodyBase = {
  reason: z.string().min(1),
  metadata: z.record(z.any()).optional(),
};

const grantBody = z.object({
  ...transitionBodyBase,
  grantedByParentId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const revokeBody = z.object({
  ...transitionBodyBase,
});

const expireBody = z.object({
  ...transitionBodyBase,
  expiresAt: z.string().datetime().optional(),
});

const listQuery = z.object({
  learnerId: z.string(),
  consentType: consentTypeSchema.optional(),
});

export const registerConsentRoutes: FastifyPluginAsync<{ pool: Pool }> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

  fastify.get(
    '/',
    {
      preHandler: requireRole([
        Role.PARENT,
        Role.TEACHER,
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
        Role.SUPPORT,
      ]),
    },
    async (request, reply) => {
      const parsed = listQuery.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid query' });
        return;
      }
      const auth = (request as any).auth as AuthContext;
      const consents = await listConsentsForLearner(
        pool,
        auth.tenantId,
        parsed.data.learnerId,
        parsed.data.consentType
      );
      reply.code(200).send({ consents });
    }
  );

  fastify.post(
    '/',
    {
      preHandler: requireRole([
        Role.TEACHER,
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
        Role.SUPPORT,
      ]),
    },
    async (request, reply) => {
      const parsed = createConsentBody.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid payload' });
        return;
      }
      const auth = (request as any).auth as AuthContext;
      const status = parsed.data.status ?? 'PENDING';
      if (status !== 'PENDING') {
        reply.code(400).send({ error: 'Only PENDING consents can be created' });
        return;
      }

      const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
      const consent = await createConsent(pool, {
        tenantId: auth.tenantId,
        learnerId: parsed.data.learnerId,
        consentType: parsed.data.consentType,
        status,
        expiresAt,
      });
      reply.code(201).send({ consent });
    }
  );

  async function handleTransition(
    request: any,
    reply: any,
    targetStatus: ConsentStatus,
    bodySchema: z.ZodObject<any>
  ) {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload' });
      return;
    }
    const auth = request.auth as AuthContext;
    const { id } = request.params as { id: string };

    const consent = await getConsentById(pool, id, auth.tenantId);
    if (!consent) {
      reply.code(404).send({ error: 'Consent not found' });
      return;
    }

    try {
      const transition = buildTransition(consent, targetStatus, {
        changedByUserId: auth.userId,
        reason: parsed.data.reason,
        metadata: parsed.data.metadata ?? null,
        grantedByParentId: parsed.data.grantedByParentId,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      });
      const updated = await applyTransition(pool, consent, transition);
      reply.code(200).send({ consent: updated });
    } catch (err) {
      if (err instanceof TransitionError) {
        reply.code(400).send({ error: err.message });
        return;
      }
      throw err;
    }
  }

  fastify.post(
    '/:id/grant',
    {
      preHandler: requireRole([
        Role.PARENT,
        Role.TEACHER,
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
      ]),
    },
    async (request, reply) => {
      return handleTransition(request, reply, 'GRANTED', grantBody);
    }
  );

  fastify.post(
    '/:id/revoke',
    {
      preHandler: requireRole([
        Role.PARENT,
        Role.TEACHER,
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
      ]),
    },
    async (request, reply) => {
      return handleTransition(request, reply, 'REVOKED', revokeBody);
    }
  );

  fastify.post(
    '/:id/expire',
    { preHandler: requireRole([Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => {
      return handleTransition(request, reply, 'EXPIRED', expireBody);
    }
  );
};
