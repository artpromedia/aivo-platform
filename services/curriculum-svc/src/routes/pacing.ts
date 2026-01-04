/**
 * Pacing guide routes for Curriculum Service
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurriculumService } from '../services/curriculum.service.js';
import { prisma } from '../db.js';

const curriculumService = new CurriculumService(prisma);

const CreatePacingGuideSchema = z.object({
  name: z.string().min(1),
  schoolYear: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  schedule: z.array(z.object({
    unitId: z.string(),
    startWeek: z.number().int().min(1),
    endWeek: z.number().int().min(1),
    notes: z.string().optional(),
  })),
  holidays: z.array(z.object({
    date: z.string().datetime(),
    name: z.string(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdatePacingGuideSchema = CreatePacingGuideSchema.partial();

const AdjustPacingSchema = z.object({
  unitId: z.string(),
  newStartWeek: z.number().int().min(1),
  newEndWeek: z.number().int().min(1),
  reason: z.string().optional(),
});

export async function pacingRoutes(app: FastifyInstance) {
  // List pacing guides for a curriculum
  app.get('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Querystring: { tenantId: string; schoolYear?: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId, schoolYear } = request.query;
    return curriculumService.listPacingGuides(curriculumId, tenantId, schoolYear);
  });

  // Get pacing guide by ID
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    return curriculumService.getPacingGuideById(id, tenantId);
  });

  // Create pacing guide
  app.post('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof CreatePacingGuideSchema>;
    Querystring: { tenantId: string; createdBy: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId, createdBy } = request.query;
    const data = CreatePacingGuideSchema.parse(request.body);
    return curriculumService.createPacingGuide({
      ...data,
      curriculumId,
      tenantId,
      createdBy,
    });
  });

  // Update pacing guide
  app.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdatePacingGuideSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const data = UpdatePacingGuideSchema.parse(request.body);
    return curriculumService.updatePacingGuide(id, tenantId, data);
  });

  // Delete pacing guide
  app.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    await curriculumService.deletePacingGuide(id, tenantId);
    return { success: true };
  });

  // Adjust unit pacing
  app.post('/:id/adjust', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof AdjustPacingSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const data = AdjustPacingSchema.parse(request.body);
    return curriculumService.adjustUnitPacing(id, tenantId, data);
  });

  // Get current week's content
  app.get('/:id/current-week', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string; date?: string }
  }>) => {
    const { id } = request.params;
    const { tenantId, date } = request.query;
    const targetDate = date ? new Date(date) : new Date();
    return curriculumService.getCurrentWeekContent(id, tenantId, targetDate);
  });

  // Get pacing status/health
  app.get('/:id/status', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string; teacherId?: string }
  }>) => {
    const { id } = request.params;
    const { tenantId, teacherId } = request.query;
    return curriculumService.getPacingStatus(id, tenantId, teacherId);
  });

  // Clone pacing guide for new school year
  app.post('/:id/clone', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { newSchoolYear: string; startDate: string; endDate: string };
    Querystring: { tenantId: string; createdBy: string }
  }>) => {
    const { id } = request.params;
    const { tenantId, createdBy } = request.query;
    const { newSchoolYear, startDate, endDate } = request.body;
    return curriculumService.clonePacingGuide(id, tenantId, createdBy, {
      schoolYear: newSchoolYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  });

  // Generate suggested pacing
  app.post('/curriculum/:curriculumId/generate', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: { schoolYear: string; startDate: string; endDate: string; instructionalDaysPerWeek?: number };
    Querystring: { tenantId: string; createdBy: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId, createdBy } = request.query;
    const { schoolYear, startDate, endDate, instructionalDaysPerWeek } = request.body;
    return curriculumService.generateSuggestedPacing(curriculumId, tenantId, createdBy, {
      schoolYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      instructionalDaysPerWeek: instructionalDaysPerWeek || 5,
    });
  });
}
