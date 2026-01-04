/**
 * Professional Development Compliance Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { ProfessionalDevService } from '../services/pd.service.js';
import { prisma } from '../db.js';

const service = new ProfessionalDevService(prisma);

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const complianceRoutes: FastifyPluginAsync = async (app) => {
  // Get district-wide compliance summary
  app.get('/dashboard', async (request, reply) => {
    const user = getUser(request);

    const summary = await service.getDistrictComplianceSummary(user.tenantId);
    return reply.send(summary);
  });

  // Get teacher compliance report
  app.get<{ Params: { teacherId: string } }>(
    '/teachers/:teacherId',
    async (request, reply) => {
      const user = getUser(request);
      const { teacherId } = request.params;

      const report = await service.getTeacherComplianceReport(user.tenantId, teacherId);
      return reply.send(report);
    }
  );
};
