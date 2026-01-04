/**
 * Professional Development Enrollments Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ProfessionalDevService } from '../services/pd.service.js';
import { prisma } from '../db.js';

const service = new ProfessionalDevService(prisma);

const enrollSchema = z.object({
  teacherId: z.string().uuid(),
  programId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
});

const moduleProgressSchema = z.object({
  moduleId: z.string(),
  progress: z.number().min(0).max(100),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const enrollmentsRoutes: FastifyPluginAsync = async (app) => {
  // Enroll in a program
  app.post<{ Body: z.infer<typeof enrollSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = enrollSchema.parse(request.body);

    try {
      const enrollment = await service.enrollTeacher(user.tenantId, {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });
      return reply.code(201).send(enrollment);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Get teacher's enrollments
  app.get<{ Querystring: { teacherId: string; status?: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { teacherId, status } = request.query;

      if (!teacherId) {
        return reply.code(400).send({ error: 'teacherId is required' });
      }

      const enrollments = await service.getTeacherEnrollments(user.tenantId, teacherId, {
        status: status as any,
      });

      return reply.send({ enrollments });
    }
  );

  // Start a program
  app.post<{ Params: { enrollmentId: string } }>(
    '/:enrollmentId/start',
    async (request, reply) => {
      const { enrollmentId } = request.params;

      try {
        const enrollment = await service.startProgram(enrollmentId);
        return reply.send(enrollment);
      } catch (error) {
        return reply.code(404).send({ error: 'Enrollment not found' });
      }
    }
  );

  // Update module progress
  app.post<{ Params: { enrollmentId: string }; Body: z.infer<typeof moduleProgressSchema> }>(
    '/:enrollmentId/progress',
    async (request, reply) => {
      const { enrollmentId } = request.params;
      const body = moduleProgressSchema.parse(request.body);

      try {
        const enrollment = await service.updateModuleProgress(enrollmentId, body.moduleId, body.progress);
        return reply.send(enrollment);
      } catch (error) {
        return reply.code(404).send({ error: 'Enrollment not found' });
      }
    }
  );

  // Complete enrollment
  app.post<{ Params: { enrollmentId: string }; Body: { certificateUrl?: string } }>(
    '/:enrollmentId/complete',
    async (request, reply) => {
      const { enrollmentId } = request.params;
      const { certificateUrl } = request.body || {};

      try {
        const enrollment = await service.completeEnrollment(enrollmentId, certificateUrl);
        return reply.send(enrollment);
      } catch (error) {
        return reply.code(404).send({ error: 'Enrollment not found' });
      }
    }
  );

  // Withdraw from program
  app.post<{ Params: { enrollmentId: string }; Body: { notes?: string } }>(
    '/:enrollmentId/withdraw',
    async (request, reply) => {
      const { enrollmentId } = request.params;
      const { notes } = request.body || {};

      try {
        const enrollment = await service.withdrawEnrollment(enrollmentId, notes);
        return reply.send(enrollment);
      } catch (error) {
        return reply.code(404).send({ error: 'Enrollment not found' });
      }
    }
  );
};
