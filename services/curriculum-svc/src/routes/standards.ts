/**
 * Standards alignment routes for Curriculum Service
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurriculumService } from '../services/curriculum.service.js';
import { prisma } from '../db.js';

const curriculumService = new CurriculumService(prisma);

const AlignStandardSchema = z.object({
  standardCode: z.string().min(1),
  standardDescription: z.string(),
  framework: z.string(),
  alignmentLevel: z.enum(['primary', 'secondary', 'supporting']).optional(),
  notes: z.string().optional(),
});

const BulkAlignSchema = z.object({
  standards: z.array(AlignStandardSchema),
});

export async function standardsRoutes(app: FastifyInstance) {
  // Get standards alignment for a curriculum
  app.get('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Querystring: { tenantId: string; framework?: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId, framework } = request.query;
    return curriculumService.getStandardsAlignment(curriculumId, tenantId, framework);
  });

  // Get standards alignment for a unit
  app.get('/unit/:unitId', async (request: FastifyRequest<{
    Params: { unitId: string };
    Querystring: { tenantId: string }
  }>) => {
    const { unitId } = request.params;
    const { tenantId } = request.query;
    return curriculumService.getUnitStandardsAlignment(unitId, tenantId);
  });

  // Get standards alignment for a lesson
  app.get('/lesson/:lessonId', async (request: FastifyRequest<{
    Params: { lessonId: string };
    Querystring: { tenantId: string }
  }>) => {
    const { lessonId } = request.params;
    const { tenantId } = request.query;
    return curriculumService.getLessonStandardsAlignment(lessonId, tenantId);
  });

  // Align standard to curriculum
  app.post('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof AlignStandardSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId } = request.query;
    const data = AlignStandardSchema.parse(request.body);
    return curriculumService.alignStandardToCurriculum(curriculumId, tenantId, data);
  });

  // Bulk align standards to curriculum
  app.post('/curriculum/:curriculumId/bulk', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof BulkAlignSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId } = request.query;
    const { standards } = BulkAlignSchema.parse(request.body);
    return curriculumService.bulkAlignStandards(curriculumId, tenantId, standards);
  });

  // Align standard to unit
  app.post('/unit/:unitId', async (request: FastifyRequest<{
    Params: { unitId: string };
    Body: z.infer<typeof AlignStandardSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { unitId } = request.params;
    const { tenantId } = request.query;
    const data = AlignStandardSchema.parse(request.body);
    return curriculumService.alignStandardToUnit(unitId, tenantId, data);
  });

  // Align standard to lesson
  app.post('/lesson/:lessonId', async (request: FastifyRequest<{
    Params: { lessonId: string };
    Body: z.infer<typeof AlignStandardSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { lessonId } = request.params;
    const { tenantId } = request.query;
    const data = AlignStandardSchema.parse(request.body);
    return curriculumService.alignStandardToLesson(lessonId, tenantId, data);
  });

  // Remove standard alignment
  app.delete('/:alignmentId', async (request: FastifyRequest<{
    Params: { alignmentId: string };
    Querystring: { tenantId: string }
  }>) => {
    const { alignmentId } = request.params;
    const { tenantId } = request.query;
    await curriculumService.removeStandardAlignment(alignmentId, tenantId);
    return { success: true };
  });

  // Get standards coverage report
  app.get('/coverage/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Querystring: { tenantId: string; framework?: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId, framework } = request.query;
    return curriculumService.getStandardsCoverageReport(curriculumId, tenantId, framework);
  });

  // Search available standards
  app.get('/search', async (request: FastifyRequest<{
    Querystring: { query: string; framework?: string; gradeLevel?: string }
  }>) => {
    const { query, framework, gradeLevel } = request.query;
    return curriculumService.searchStandards(query, { framework, gradeLevel });
  });
}
