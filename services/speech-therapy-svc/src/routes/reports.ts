/**
 * Speech Therapy Reports Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { SpeechTherapyService } from '../services/speech.service.js';
import { prisma } from '../db.js';

const service = new SpeechTherapyService(prisma);

const reportQuerySchema = z.object({
  learnerId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  // Generate progress report
  app.get<{ Querystring: z.infer<typeof reportQuerySchema> }>(
    '/progress',
    async (request, reply) => {
      const user = getUser(request);
      const query = reportQuerySchema.parse(request.query);

      const report = await service.generateProgressReport(
        user.tenantId,
        query.learnerId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return reply.send(report);
    }
  );
};
