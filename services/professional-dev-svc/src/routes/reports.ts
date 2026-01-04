/**
 * Professional Development Reports Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ProfessionalDevService } from '../services/pd.service.js';
import { prisma } from '../db.js';

const service = new ProfessionalDevService(prisma);

const dateRangeSchema = z.object({
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
  // Generate hours report
  app.get<{ Querystring: z.infer<typeof dateRangeSchema> }>(
    '/hours',
    async (request, reply) => {
      const user = getUser(request);
      const query = dateRangeSchema.parse(request.query);

      const report = await service.generateHoursReport(
        user.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return reply.send(report);
    }
  );

  // Generate completion report
  app.get<{ Querystring: z.infer<typeof dateRangeSchema> }>(
    '/completion',
    async (request, reply) => {
      const user = getUser(request);
      const query = dateRangeSchema.parse(request.query);

      const report = await service.generateCompletionReport(
        user.tenantId,
        new Date(query.startDate),
        new Date(query.endDate)
      );

      return reply.send(report);
    }
  );
};
