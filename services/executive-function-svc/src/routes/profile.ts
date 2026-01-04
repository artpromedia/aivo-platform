/**
 * Executive Function Profile Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ExecutiveFunctionService } from '../services/ef.service.js';
import { prisma } from '../db.js';

const service = new ExecutiveFunctionService(prisma);

const efSkillEnum = z.enum([
  'WORKING_MEMORY', 'COGNITIVE_FLEXIBILITY', 'INHIBITORY_CONTROL',
  'PLANNING', 'ORGANIZATION', 'TIME_MANAGEMENT',
  'TASK_INITIATION', 'EMOTIONAL_REGULATION', 'METACOGNITION'
]);

const updateProfileSchema = z.object({
  skillLevels: z.record(efSkillEnum, z.number().min(0).max(100)).optional(),
  preferredChunkMin: z.number().int().min(5).max(60).optional(),
  preferredBreakMin: z.number().int().min(1).max(30).optional(),
  needsVisualSchedule: z.boolean().optional(),
  needsCountdown: z.boolean().optional(),
  needsTransitionWarn: z.boolean().optional(),
  transitionWarnMin: z.number().int().min(1).max(15).optional(),
  bestFocusTime: z.enum(['MORNING', 'MIDDAY', 'AFTERNOON', 'EVENING']).optional(),
  maxVisibleTasks: z.number().int().min(1).max(10).optional(),
  rewardStyle: z.enum(['VISUAL', 'AUDIO', 'POINTS', 'MINIMAL']).optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const profileRoutes: FastifyPluginAsync = async (app) => {
  // Get profile
  app.get<{ Params: { learnerId: string } }>(
    '/:learnerId',
    async (request, reply) => {
      const { learnerId } = request.params;

      const profile = await service.getProfile(learnerId);
      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return reply.send(profile);
    }
  );

  // Create or update profile
  app.put<{ Params: { learnerId: string }; Body: z.infer<typeof updateProfileSchema> }>(
    '/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;
      const body = updateProfileSchema.parse(request.body);

      const profile = await service.upsertProfile(user.tenantId, {
        learnerId,
        ...body,
      });

      return reply.send(profile);
    }
  );
};
