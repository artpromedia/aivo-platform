/**
 * Kudos Routes - Peer recognition / encouragement messages
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { KudosContext, KudosSource } from '../prisma.js';
import * as kudosService from '../services/kudosService.js';
import * as publisher from '../events/publisher.js';

// Schemas
const learnerIdParamSchema = z.object({
  learnerId: z.string().uuid(),
});

const createKudosSchema = z.object({
  tenantId: z.string().uuid(),
  message: z.string().min(1).max(500),
  context: z.nativeEnum(KudosContext).default(KudosContext.GENERAL),
  linkedSessionId: z.string().uuid().optional(),
  linkedActionPlanId: z.string().uuid().optional(),
  visibleToLearner: z.boolean().default(true),
});

const listKudosQuerySchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function kudosRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /learners/:learnerId/kudos
   * Send kudos to a learner
   */
  app.post(
    '/learners/:learnerId/kudos',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Body: z.infer<typeof createKudosSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const body = createKudosSchema.parse(request.body);

      // Authorization
      const user = (request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== body.tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden - wrong tenant' });
      }

      // Only parent, teacher, therapist, or admin can send kudos
      const allowedRoles = ['parent', 'teacher', 'therapist', 'tenant_admin', 'platform_admin', 'service'];
      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden - insufficient role' });
      }

      // Map role to KudosSource
      const roleToSource: Record<string, KudosSource> = {
        parent: KudosSource.PARENT,
        teacher: KudosSource.TEACHER,
        therapist: KudosSource.THERAPIST,
        tenant_admin: KudosSource.ADMIN,
        platform_admin: KudosSource.ADMIN,
        service: KudosSource.SYSTEM,
      };

      try {
        const kudos = await kudosService.sendKudos({
          tenantId: body.tenantId,
          learnerId,
          fromUserId: user.sub,
          fromRole: roleToSource[user.role] ?? KudosSource.PARENT,
          message: body.message,
          context: body.context,
          linkedSessionId: body.linkedSessionId,
          linkedActionPlanId: body.linkedActionPlanId,
          visibleToLearner: body.visibleToLearner,
        });

        // Publish event
        await publisher.publishKudosSent(body.tenantId, kudos);

        return reply.status(201).send(kudos);
      } catch (error) {
        if (error instanceof Error && error.message.includes('disabled')) {
          return reply.status(403).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  /**
   * GET /learners/:learnerId/kudos
   * List kudos for a learner (visible to learner)
   */
  app.get(
    '/learners/:learnerId/kudos',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Querystring: z.infer<typeof listKudosQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const { tenantId, limit } = listKudosQuerySchema.parse(request.query);

      // Authorization
      const user = (request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const kudos = await kudosService.getLearnerKudos(tenantId, learnerId, limit);
      const count = await kudosService.getKudosCount(tenantId, learnerId);

      return reply.status(200).send({ kudos, total: count });
    }
  );

  /**
   * GET /learners/:learnerId/kudos/all
   * List all kudos for a learner (including hidden - for care team)
   */
  app.get(
    '/learners/:learnerId/kudos/all',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Querystring: z.infer<typeof listKudosQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const { tenantId, limit } = listKudosQuerySchema.parse(request.query);

      // Authorization - must be parent, teacher, or admin
      const user = (request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const allowedRoles = ['parent', 'teacher', 'therapist', 'tenant_admin', 'platform_admin', 'service'];
      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden - insufficient role' });
      }

      const kudos = await kudosService.getAllKudosForLearner(tenantId, learnerId, limit);

      return reply.status(200).send({ kudos });
    }
  );

  /**
   * DELETE /kudos/:kudosId
   * Delete a kudos message (only sender or admin)
   */
  app.delete(
    '/kudos/:kudosId',
    async (
      request: FastifyRequest<{ Params: { kudosId: string } }>,
      reply: FastifyReply
    ) => {
      const { kudosId } = request.params;

      const user = (request as FastifyRequest & { user?: { sub: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const isAdmin = ['tenant_admin', 'platform_admin', 'service'].includes(user.role);
      const deleted = await kudosService.deleteKudos(kudosId, user.sub, isAdmin);

      if (!deleted) {
        return reply.status(404).send({ error: 'Kudos not found or not authorized to delete' });
      }

      return reply.status(204).send();
    }
  );
}
