/**
 * Professional Development Requirements Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ProfessionalDevService } from '../services/pd.service.js';
import { prisma } from '../db.js';

const service = new ProfessionalDevService(prisma);

const createRequirementSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['INSTRUCTION', 'TECHNOLOGY', 'SEL', 'SPECIAL_ED', 'CONTENT_AREA', 'LEADERSHIP', 'EQUITY', 'SAFETY', 'NEURODIVERSE', 'ASSESSMENT']),
  hoursRequired: z.number().positive(),
  deadline: z.string().datetime(),
  isRecurring: z.boolean().optional(),
  recurrenceMonths: z.number().int().positive().optional(),
  applicableRoles: z.array(z.string()).optional(),
  applicableSchools: z.array(z.string().uuid()).optional(),
  programIds: z.array(z.string().uuid()).optional(),
});

const waiveRequirementSchema = z.object({
  teacherId: z.string().uuid(),
  reason: z.string().min(1),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const requirementsRoutes: FastifyPluginAsync = async (app) => {
  // Create a requirement
  app.post<{ Body: z.infer<typeof createRequirementSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createRequirementSchema.parse(request.body);

    const requirement = await service.createRequirement(user.tenantId, {
      ...body,
      deadline: new Date(body.deadline),
    });

    return reply.code(201).send(requirement);
  });

  // Get all requirements
  app.get<{ Querystring: { category?: string; isActive?: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { category, isActive } = request.query;

      const requirements = await service.getRequirements(user.tenantId, {
        category: category as any,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      return reply.send({ requirements });
    }
  );

  // Get teacher's requirement progress
  app.get<{ Params: { teacherId: string } }>(
    '/teachers/:teacherId/progress',
    async (request, reply) => {
      const user = getUser(request);
      const { teacherId } = request.params;

      const progress = await service.getTeacherRequirementProgress(user.tenantId, teacherId);
      return reply.send({ progress });
    }
  );

  // Waive a requirement for a teacher
  app.post<{ Params: { requirementId: string }; Body: z.infer<typeof waiveRequirementSchema> }>(
    '/:requirementId/waive',
    async (request, reply) => {
      const user = getUser(request);
      const { requirementId } = request.params;
      const body = waiveRequirementSchema.parse(request.body);

      const progress = await service.waiveRequirement(
        user.tenantId,
        body.teacherId,
        requirementId,
        user.sub,
        body.reason
      );

      return reply.send(progress);
    }
  );
};
