/**
 * Executive Function Analytics Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { ExecutiveFunctionService } from '../services/ef.service.js';
import { prisma } from '../db.js';

const service = new ExecutiveFunctionService(prisma);

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // Get performance summary
  app.get<{ Params: { learnerId: string }; Querystring: { days?: string } }>(
    '/performance/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;
      const { days } = request.query;

      const summary = await service.getPerformanceSummary(
        user.tenantId,
        learnerId,
        days ? parseInt(days, 10) : 30
      );

      return reply.send(summary);
    }
  );
};
