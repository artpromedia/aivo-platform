/**
 * Lessons routes for Curriculum Service
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurriculumService } from '../services/curriculum.service.js';
import { prisma } from '../db.js';

const curriculumService = new CurriculumService(prisma);

const CreateLessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0),
  lessonType: z.enum(['instruction', 'practice', 'assessment', 'review', 'enrichment']),
  duration: z.number().int().optional(),
  objectives: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  activities: z.array(z.object({
    name: z.string(),
    type: z.string(),
    duration: z.number().int().optional(),
    instructions: z.string().optional(),
  })).optional(),
  assessmentCriteria: z.record(z.any()).optional(),
  differentiationStrategies: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateLessonSchema = CreateLessonSchema.partial();

export async function lessonsRoutes(app: FastifyInstance) {
  // List lessons for a unit
  app.get('/unit/:unitId', async (request: FastifyRequest<{
    Params: { unitId: string };
    Querystring: { tenantId: string }
  }>) => {
    const { unitId } = request.params;
    const { tenantId } = request.query;
    return curriculumService.listLessons(unitId, tenantId);
  });

  // Get lesson by ID
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    return curriculumService.getLessonById(id, tenantId);
  });

  // Create lesson
  app.post('/unit/:unitId', async (request: FastifyRequest<{
    Params: { unitId: string };
    Body: z.infer<typeof CreateLessonSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { unitId } = request.params;
    const { tenantId } = request.query;
    const data = CreateLessonSchema.parse(request.body);
    return curriculumService.createLesson({
      ...data,
      unitId,
      tenantId,
    });
  });

  // Update lesson
  app.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateLessonSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const data = UpdateLessonSchema.parse(request.body);
    return curriculumService.updateLesson(id, tenantId, data);
  });

  // Delete lesson
  app.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    await curriculumService.deleteLesson(id, tenantId);
    return { success: true };
  });

  // Reorder lessons within a unit
  app.post('/unit/:unitId/reorder', async (request: FastifyRequest<{
    Params: { unitId: string };
    Body: { lessonOrder: Array<{ lessonId: string; orderIndex: number }> };
    Querystring: { tenantId: string }
  }>) => {
    const { unitId } = request.params;
    const { tenantId } = request.query;
    const { lessonOrder } = request.body;
    return curriculumService.reorderLessons(unitId, tenantId, lessonOrder);
  });

  // Add resource to lesson
  app.post('/:id/resources', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { resourceId: string; resourceType: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const { resourceId, resourceType } = request.body;
    return curriculumService.addResourceToLesson(id, tenantId, resourceId, resourceType);
  });

  // Remove resource from lesson
  app.delete('/:id/resources/:resourceId', async (request: FastifyRequest<{
    Params: { id: string; resourceId: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id, resourceId } = request.params;
    const { tenantId } = request.query;
    await curriculumService.removeResourceFromLesson(id, tenantId, resourceId);
    return { success: true };
  });
}
