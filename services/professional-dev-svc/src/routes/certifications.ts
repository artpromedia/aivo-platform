/**
 * Professional Development Certifications Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ProfessionalDevService } from '../services/pd.service.js';
import { prisma } from '../db.js';

const service = new ProfessionalDevService(prisma);

const createCertificationSchema = z.object({
  teacherId: z.string().uuid(),
  name: z.string().min(1),
  issuingOrg: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  credentialId: z.string().optional(),
  verificationUrl: z.string().url().optional(),
  certificateUrl: z.string().url().optional(),
  category: z.enum(['INSTRUCTION', 'TECHNOLOGY', 'SEL', 'SPECIAL_ED', 'CONTENT_AREA', 'LEADERSHIP', 'EQUITY', 'SAFETY', 'NEURODIVERSE', 'ASSESSMENT']).optional(),
  creditHours: z.number().positive().optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const certificationsRoutes: FastifyPluginAsync = async (app) => {
  // Add a certification
  app.post<{ Body: z.infer<typeof createCertificationSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createCertificationSchema.parse(request.body);

    const certification = await service.addCertification(user.tenantId, {
      ...body,
      issuedAt: new Date(body.issuedAt),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    return reply.code(201).send(certification);
  });

  // Get teacher's certifications
  app.get<{ Querystring: { teacherId: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { teacherId } = request.query;

      if (!teacherId) {
        return reply.code(400).send({ error: 'teacherId is required' });
      }

      const certifications = await service.getTeacherCertifications(user.tenantId, teacherId);
      return reply.send({ certifications });
    }
  );

  // Verify a certification
  app.post<{ Params: { certificationId: string } }>(
    '/:certificationId/verify',
    async (request, reply) => {
      const { certificationId } = request.params;

      try {
        const certification = await service.verifyCertification(certificationId);
        return reply.send(certification);
      } catch (error) {
        return reply.code(404).send({ error: 'Certification not found' });
      }
    }
  );
};
