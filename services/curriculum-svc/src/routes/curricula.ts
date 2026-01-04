/**
 * Curricula routes for Curriculum Service
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurriculumService } from '../services/curriculum.service.js';
import { prisma } from '../db.js';

const curriculumService = new CurriculumService(prisma);

const CreateCurriculumSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subjectArea: z.string(),
  gradeLevel: z.string(),
  standards: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateCurriculumSchema = CreateCurriculumSchema.partial();

export async function curriculaRoutes(app: FastifyInstance) {
  // List curricula
  app.get('/', async (request: FastifyRequest<{
    Querystring: { tenantId: string; subjectArea?: string; gradeLevel?: string; status?: string }
  }>) => {
    const { tenantId, subjectArea, gradeLevel, status } = request.query;
    return curriculumService.listCurricula(tenantId, { subjectArea, gradeLevel, status });
  });

  // Get curriculum by ID
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    return curriculumService.getCurriculumById(id, tenantId);
  });

  // Create curriculum
  app.post('/', async (request: FastifyRequest<{
    Body: z.infer<typeof CreateCurriculumSchema>;
    Querystring: { tenantId: string; createdBy: string }
  }>) => {
    const data = CreateCurriculumSchema.parse(request.body);
    const { tenantId, createdBy } = request.query;
    return curriculumService.createCurriculum({
      ...data,
      tenantId,
      createdBy,
    });
  });

  // Update curriculum
  app.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateCurriculumSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const data = UpdateCurriculumSchema.parse(request.body);
    return curriculumService.updateCurriculum(id, tenantId, data);
  });

  // Delete curriculum
  app.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    await curriculumService.deleteCurriculum(id, tenantId);
    return { success: true };
  });

  // Publish curriculum
  app.post('/:id/publish', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    return curriculumService.publishCurriculum(id, tenantId);
  });

  // Archive curriculum
  app.post('/:id/archive', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    return curriculumService.archiveCurriculum(id, tenantId);
  });

  // Clone curriculum
  app.post('/:id/clone', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string; createdBy: string };
    Body: { newName: string }
  }>) => {
    const { id } = request.params;
    const { tenantId, createdBy } = request.query;
    const { newName } = request.body;
    return curriculumService.cloneCurriculum(id, tenantId, createdBy, newName);
  });
}
