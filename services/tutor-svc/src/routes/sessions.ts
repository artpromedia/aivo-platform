import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { sessionService } from '../services/session.service.js';
import { entitlementService } from '../services/entitlement.service.js';
import type { JwtUser } from '../types/index.js';

const CreateSessionSchema = z.object({
  personaId: z.string().uuid(),
  subject: z.enum(['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING']),
  topic: z.string().max(255).optional(),
});

const ListSessionsSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * POST /tutor/sessions
   * Create a new tutor session
   */
  fastify.post(
    '/tutor/sessions',
    async (request: FastifyRequest<{ Body: z.infer<typeof CreateSessionSchema> }>, reply: FastifyReply) => {
      const body = CreateSessionSchema.parse(request.body);
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      // Check entitlement
      const entitlement = await entitlementService.checkTutorAccess(tenantId);
      if (!entitlement.allowed) {
        return reply.status(403).send({
          error: 'Tutor add-on required',
          reason: entitlement.reason,
        });
      }

      const session = await sessionService.create({
        tenantId,
        learnerId: user.sub,
        personaId: body.personaId,
        subject: body.subject,
        topic: body.topic,
      });

      return reply.status(201).send({
        id: session.id,
        learnerId: session.learnerId,
        personaId: session.personaId,
        status: session.status,
        subject: session.subject,
        topic: session.topic,
        startedAt: session.startedAt.toISOString(),
        persona: {
          id: session.persona.id,
          slug: session.persona.slug,
          name: session.persona.name,
          subject: session.persona.subject,
          avatarAssetKey: session.persona.avatarAssetKey,
        },
      });
    },
  );

  /**
   * GET /tutor/sessions
   * List sessions for the current learner
   */
  fastify.get(
    '/tutor/sessions',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof ListSessionsSchema> }>, reply: FastifyReply) => {
      const query = ListSessionsSchema.parse(request.query);
      const user = request.user as JwtUser;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const { sessions, total } = await sessionService.listByLearner({
        tenantId,
        learnerId: user.sub,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      });

      return {
        sessions: sessions.map((s) => ({
          id: s.id,
          learnerId: s.learnerId,
          personaId: s.personaId,
          status: s.status,
          subject: s.subject,
          topic: s.topic,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? null,
          persona: {
            id: s.persona.id,
            slug: s.persona.slug,
            name: s.persona.name,
            subject: s.persona.subject,
            avatarAssetKey: s.persona.avatarAssetKey,
          },
        })),
        total,
      };
    },
  );

  /**
   * GET /tutor/sessions/:sessionId
   * Get a specific session
   */
  fastify.get(
    '/tutor/sessions/:sessionId',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const session = await sessionService.getById(sessionId);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      return {
        id: session.id,
        learnerId: session.learnerId,
        personaId: session.personaId,
        status: session.status,
        subject: session.subject,
        topic: session.topic,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        persona: {
          id: session.persona.id,
          slug: session.persona.slug,
          name: session.persona.name,
          subject: session.persona.subject,
          avatarAssetKey: session.persona.avatarAssetKey,
        },
      };
    },
  );

  /**
   * POST /tutor/sessions/:sessionId/end
   * End a tutor session
   */
  fastify.post(
    '/tutor/sessions/:sessionId/end',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const session = await sessionService.end(sessionId);

      return {
        id: session.id,
        status: session.status,
        endedAt: session.endedAt?.toISOString() ?? null,
      };
    },
  );
}
