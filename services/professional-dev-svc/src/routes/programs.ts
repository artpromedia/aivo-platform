/**
 * Professional Development Programs Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ProfessionalDevService } from '../services/pd.service.js';
import { prisma } from '../db.js';

const service = new ProfessionalDevService(prisma);

const createProgramSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['COURSE', 'WORKSHOP', 'CERTIFICATION', 'SELF_PACED', 'CONFERENCE', 'COACHING', 'COMMUNITY']),
  category: z.enum(['INSTRUCTION', 'TECHNOLOGY', 'SEL', 'SPECIAL_ED', 'CONTENT_AREA', 'LEADERSHIP', 'EQUITY', 'SAFETY', 'NEURODIVERSE', 'ASSESSMENT']),
  creditHours: z.number().positive(),
  durationDays: z.number().int().positive().optional(),
  provider: z.string().optional(),
  externalUrl: z.string().url().optional(),
  cost: z.number().min(0).optional(),
  hasCertificate: z.boolean().optional(),
  modules: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    durationMinutes: z.number().int().positive(),
    order: z.number().int().min(0),
    contentUrl: z.string().optional(),
  })).optional(),
  prerequisites: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const programsRoutes: FastifyPluginAsync = async (app) => {
  // Create a new program
  app.post<{ Body: z.infer<typeof createProgramSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createProgramSchema.parse(request.body);

    const program = await service.createProgram(user.tenantId, body);
    return reply.code(201).send(program);
  });

  // Get all programs
  app.get<{ Querystring: { category?: string; type?: string; isActive?: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { category, type, isActive } = request.query;

      const programs = await service.getPrograms(user.tenantId, {
        category: category as any,
        type: type as any,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      return reply.send({ programs });
    }
  );

  // Get a single program
  app.get<{ Params: { programId: string } }>('/:programId', async (request, reply) => {
    const { programId } = request.params;

    const program = await service.getProgram(programId);
    if (!program) {
      return reply.code(404).send({ error: 'Program not found' });
    }

    return reply.send(program);
  });

  // Update a program
  app.patch<{ Params: { programId: string }; Body: Partial<z.infer<typeof createProgramSchema>> }>(
    '/:programId',
    async (request, reply) => {
      const { programId } = request.params;

      try {
        const program = await service.updateProgram(programId, request.body);
        return reply.send(program);
      } catch (error) {
        return reply.code(404).send({ error: 'Program not found' });
      }
    }
  );

  // Deactivate a program
  app.delete<{ Params: { programId: string } }>('/:programId', async (request, reply) => {
    const { programId } = request.params;

    try {
      await service.deactivateProgram(programId);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(404).send({ error: 'Program not found' });
    }
  });
};
