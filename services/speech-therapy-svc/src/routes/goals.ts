/**
 * Speech Therapy Goals Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { SpeechTherapyService } from '../services/speech.service.js';
import { prisma } from '../db.js';

const service = new SpeechTherapyService(prisma);

// Schemas
const createGoalSchema = z.object({
  learnerId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  description: z.string().min(1),
  sessionType: z.enum(['ARTICULATION', 'FLUENCY', 'LANGUAGE', 'VOICE', 'PRAGMATICS', 'PHONOLOGY']),
  targetSounds: z.array(z.string()),
  masteryThreshold: z.number().min(0).max(1).optional(),
  iepGoalId: z.string().optional(),
  targetDate: z.string().datetime().optional(),
});

const updateGoalSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'DISCONTINUED']).optional(),
  currentAccuracy: z.number().min(0).max(1).optional(),
});

const recordProgressSchema = z.object({
  accuracy: z.number().min(0).max(1),
  trials: z.number().int().min(1),
  notes: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const goalsRoutes: FastifyPluginAsync = async (app) => {
  // Create a new goal
  app.post<{ Body: z.infer<typeof createGoalSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createGoalSchema.parse(request.body);

    const goal = await service.createGoal(user.tenantId, {
      ...body,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
    });

    return reply.code(201).send(goal);
  });

  // Get all goals for a learner
  app.get<{ Querystring: { learnerId: string } }>('/', async (request, reply) => {
    const user = getUser(request);
    const { learnerId } = request.query;

    if (!learnerId) {
      return reply.code(400).send({ error: 'learnerId is required' });
    }

    const goals = await service.getGoals(user.tenantId, learnerId);
    return reply.send({ goals });
  });

  // Get a single goal
  app.get<{ Params: { goalId: string } }>('/:goalId', async (request, reply) => {
    const user = getUser(request);
    const { goalId } = request.params;

    const goal = await service.getGoal(user.tenantId, goalId);
    if (!goal) {
      return reply.code(404).send({ error: 'Goal not found' });
    }

    return reply.send(goal);
  });

  // Update a goal
  app.patch<{ Params: { goalId: string }; Body: z.infer<typeof updateGoalSchema> }>(
    '/:goalId',
    async (request, reply) => {
      const user = getUser(request);
      const { goalId } = request.params;
      const body = updateGoalSchema.parse(request.body);

      try {
        const goal = await service.updateGoal(user.tenantId, goalId, body);
        return reply.send(goal);
      } catch (error) {
        return reply.code(404).send({ error: 'Goal not found' });
      }
    }
  );

  // Record progress on a goal
  app.post<{ Params: { goalId: string }; Body: z.infer<typeof recordProgressSchema> }>(
    '/:goalId/progress',
    async (request, reply) => {
      const user = getUser(request);
      const { goalId } = request.params;
      const body = recordProgressSchema.parse(request.body);

      try {
        const progress = await service.recordProgress(user.tenantId, goalId, {
          ...body,
          recordedBy: user.sub,
        });
        return reply.code(201).send(progress);
      } catch (error) {
        return reply.code(404).send({ error: 'Goal not found' });
      }
    }
  );
};
