/**
 * Executive Function Strategies Routes
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

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const strategiesRoutes: FastifyPluginAsync = async (app) => {
  // Get all strategies
  app.get<{ Querystring: { skill?: string; minGrade?: string; maxGrade?: string } }>(
    '/',
    async (request, reply) => {
      const { skill, minGrade, maxGrade } = request.query;

      const strategies = await service.getStrategies({
        skill: skill as any,
        minGrade: minGrade ? parseInt(minGrade, 10) : undefined,
        maxGrade: maxGrade ? parseInt(maxGrade, 10) : undefined,
      });

      return reply.send({ strategies });
    }
  );

  // Get recommended strategies for a learner
  app.get<{ Params: { learnerId: string }; Querystring: { skills?: string } }>(
    '/recommended/:learnerId',
    async (request, reply) => {
      const { learnerId } = request.params;
      const { skills } = request.query;

      const focusSkills = skills
        ? (skills.split(',') as any[])
        : undefined;

      const strategies = await service.getRecommendedStrategies(learnerId, focusSkills);
      return reply.send({ strategies });
    }
  );

  // Get favorite strategies
  app.get<{ Params: { learnerId: string } }>(
    '/favorites/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;

      const strategies = await service.getFavoriteStrategies(user.tenantId, learnerId);
      return reply.send({ strategies });
    }
  );

  // Record strategy usage
  app.post<{ Params: { strategyId: string }; Body: { learnerId: string; rating?: number } }>(
    '/:strategyId/use',
    async (request, reply) => {
      const user = getUser(request);
      const { strategyId } = request.params;
      const { learnerId, rating } = request.body;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const usage = await service.recordStrategyUsage(user.tenantId, learnerId, strategyId, rating);
      return reply.send(usage);
    }
  );

  // Rate a strategy
  app.post<{ Params: { strategyId: string }; Body: { learnerId: string; rating: number } }>(
    '/:strategyId/rate',
    async (request, reply) => {
      const user = getUser(request);
      const { strategyId } = request.params;
      const { learnerId, rating } = request.body;

      if (!learnerId || rating === undefined) {
        return reply.code(400).send({ error: 'learnerId and rating are required' });
      }

      const usage = await service.recordStrategyUsage(user.tenantId, learnerId, strategyId, rating);
      return reply.send(usage);
    }
  );

  // Toggle favorite
  app.post<{ Params: { strategyId: string }; Body: { learnerId: string; isFavorite: boolean } }>(
    '/:strategyId/favorite',
    async (request, reply) => {
      const user = getUser(request);
      const { strategyId } = request.params;
      const { learnerId, isFavorite } = request.body;

      if (!learnerId || isFavorite === undefined) {
        return reply.code(400).send({ error: 'learnerId and isFavorite are required' });
      }

      const usage = await service.favoriteStrategy(user.tenantId, learnerId, strategyId, isFavorite);
      return reply.send(usage);
    }
  );
};
