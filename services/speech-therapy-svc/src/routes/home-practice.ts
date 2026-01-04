/**
 * Speech Therapy Home Practice Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { SpeechTherapyService } from '../services/speech.service.js';
import { prisma } from '../db.js';

const service = new SpeechTherapyService(prisma);

const createPracticeSchema = z.object({
  learnerId: z.string().uuid(),
  title: z.string().min(1),
  instructions: z.string().min(1),
  targetSounds: z.array(z.string()),
  practiceItems: z.array(z.string()),
  dailyMinutes: z.number().int().min(1).optional(),
  dueDate: z.string().datetime(),
});

const logPracticeSchema = z.object({
  date: z.string(),
  minutesPracticed: z.number().int().min(1),
  itemsCompleted: z.array(z.string()),
  parentNotes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const homePracticeRoutes: FastifyPluginAsync = async (app) => {
  // Create a home practice assignment
  app.post<{ Body: z.infer<typeof createPracticeSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createPracticeSchema.parse(request.body);

    const practice = await service.createHomePractice(user.tenantId, {
      ...body,
      therapistId: user.sub,
      dueDate: new Date(body.dueDate),
    });

    return reply.code(201).send(practice);
  });

  // Get home practice for a learner
  app.get<{ Querystring: { learnerId: string; includeCompleted?: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId, includeCompleted } = request.query;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const practices = await service.getHomePractice(
        user.tenantId,
        learnerId,
        includeCompleted === 'true'
      );

      return reply.send({ practices });
    }
  );

  // Log practice session
  app.post<{ Params: { practiceId: string }; Body: z.infer<typeof logPracticeSchema> }>(
    '/:practiceId/log',
    async (request, reply) => {
      const { practiceId } = request.params;
      const body = logPracticeSchema.parse(request.body);

      try {
        const practice = await service.logPractice(practiceId, body);
        return reply.send(practice);
      } catch (error) {
        return reply.code(404).send({ error: 'Home practice not found' });
      }
    }
  );

  // Mark practice as completed
  app.post<{ Params: { practiceId: string } }>(
    '/:practiceId/complete',
    async (request, reply) => {
      const { practiceId } = request.params;

      try {
        const practice = await service.completeHomePractice(practiceId);
        return reply.send(practice);
      } catch (error) {
        return reply.code(404).send({ error: 'Home practice not found' });
      }
    }
  );
};
