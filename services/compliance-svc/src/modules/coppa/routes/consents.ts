/**
 * COPPA/Consent Module — Consent Routes
 * Migrated from consent-svc
 */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { buildTransition, TransitionError } from '../fsm.js';
import { applyTransition, createConsent, getConsentById, listConsentsForLearner } from '../repository.js';
import type { ConsentStatusType, ConsentTypeValue } from '../types.js';

const consentTypeSchema = z.enum([
  'BASELINE_ASSESSMENT',
  'AI_TUTOR',
  'RESEARCH',
  'DATA_PROCESSING',
  'AI_PERSONALIZATION',
  'MARKETING',
  'THIRD_PARTY_SHARING',
  'BIOMETRIC_DATA',
  'VOICE_RECORDING',
]);

const createConsentBody = z.object({
  learnerId: z.string(),
  consentType: consentTypeSchema,
  status: z.enum(['PENDING']).optional(),
  expiresAt: z.string().datetime().optional(),
});

const grantBody = z.object({
  reason: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  grantedByParentId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const revokeBody = z.object({
  reason: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const expireBody = z.object({
  reason: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const listQuery = z.object({
  learnerId: z.string(),
  consentType: consentTypeSchema.optional(),
});

export const registerConsentRoutes: FastifyPluginAsync<{ pool: Pool }> = async (
  fastify: FastifyInstance,
  opts,
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
      const auth = (request as unknown as { auth: AuthContext }).auth;
      const consents = await listConsentsForLearner(
        pool,
        auth.tenantId,
        parsed.data.learnerId,
        parsed.data.consentType as ConsentTypeValue | undefined,
      );
      reply.code(200).send({ consents });
    },
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
      const auth = (request as unknown as { auth: AuthContext }).auth;
      const status = parsed.data.status ?? 'PENDING';
      if (status !== 'PENDING') {
        reply.code(400).send({ error: 'Only PENDING consents can be created' });
        return;
      }

      const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
      const consent = await createConsent(pool, {
        tenantId: auth.tenantId,
        learnerId: parsed.data.learnerId,
        consentType: parsed.data.consentType as ConsentTypeValue,
        status,
        expiresAt,
      });
      reply.code(201).send({ consent });
    },
  );

  async function handleTransition(
    request: unknown,
    reply: unknown,
    targetStatus: ConsentStatusType,
    bodySchema: z.ZodObject<z.ZodRawShape>,
  ) {
    const req = request as { auth: AuthContext; body: unknown; params: { id: string } };
    const rep = reply as { code: (c: number) => { send: (d: unknown) => void } };

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      rep.code(400).send({ error: 'Invalid payload' });
      return;
    }
    const auth = req.auth;
    const { id } = req.params;

    const consent = await getConsentById(pool, id, auth.tenantId);
    if (!consent) {
      rep.code(404).send({ error: 'Consent not found' });
      return;
    }

    try {
      const transition = buildTransition(consent, targetStatus, {
        changedByUserId: auth.userId,
        reason: (parsed.data as Record<string, unknown>).reason as string,
        metadata: ((parsed.data as Record<string, unknown>).metadata as Record<string, unknown>) ?? null,
        grantedByParentId: (parsed.data as Record<string, unknown>).grantedByParentId as string | undefined,
        expiresAt: (parsed.data as Record<string, unknown>).expiresAt
          ? new Date((parsed.data as Record<string, unknown>).expiresAt as string)
          : undefined,
      });
      const updated = await applyTransition(pool, consent, transition);
      rep.code(200).send({ consent: updated });
    } catch (err) {
      if (err instanceof TransitionError) {
        rep.code(400).send({ error: err.message });
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
    async (request, reply) => handleTransition(request, reply, 'GRANTED', grantBody),
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
    async (request, reply) => handleTransition(request, reply, 'REVOKED', revokeBody),
  );

  fastify.post(
    '/:id/expire',
    { preHandler: requireRole([Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => handleTransition(request, reply, 'EXPIRED', expireBody),
  );
};
