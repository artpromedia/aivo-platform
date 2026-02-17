/**
 * Curricula routes for Curriculum Service
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../db.js';
import { CurriculumService } from '../services/curriculum.service.js';

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
  // Supports filtering by standard (single) or standards (comma-separated list)
  // e.g. GET /curricula?tenantId=...&standard=COMMON_CORE
  // e.g. GET /curricula?tenantId=...&standards=COMMON_CORE,NGSS
  app.get('/', async (request: FastifyRequest<{
    Querystring: {
      tenantId: string;
      subjectArea?: string;
      gradeLevel?: string;
      status?: string;
      standard?: string;
      standards?: string;
    }
  }>) => {
    const { tenantId, subjectArea, gradeLevel, status, standard, standards: standardsCsv } = request.query;
    const standardsList = standardsCsv ? standardsCsv.split(',').map(s => s.trim()) : undefined;
    return curriculumService.listCurricula(tenantId, {
      subjectArea,
      gradeLevel,
      status,
      standard,
      standards: standardsList,
    });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return curriculumService.createCurriculum(tenantId, data as any, createdBy);
  });

  // Update curriculum
  app.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateCurriculumSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const data = UpdateCurriculumSchema.parse(request.body);
    return curriculumService.updateCurriculum(id, data);
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
    return curriculumService.archiveCurriculum(id);
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
