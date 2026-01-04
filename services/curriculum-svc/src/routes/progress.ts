/**
 * Teacher progress tracking routes for Curriculum Service
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurriculumService } from '../services/curriculum.service.js';
import { prisma } from '../db.js';

const curriculumService = new CurriculumService(prisma);

const UpdateProgressSchema = z.object({
  lessonId: z.string(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
  completedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  studentPerformance: z.object({
    averageScore: z.number().min(0).max(100).optional(),
    masteryRate: z.number().min(0).max(100).optional(),
    needsReteaching: z.boolean().optional(),
  }).optional(),
});

const BulkUpdateProgressSchema = z.object({
  updates: z.array(UpdateProgressSchema),
});

export async function progressRoutes(app: FastifyInstance) {
  // Get teacher progress for a curriculum
  app.get('/teacher/:teacherId/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { teacherId: string; curriculumId: string };
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId, curriculumId } = request.params;
    const { tenantId, classId } = request.query;
    return curriculumService.getTeacherProgress(teacherId, curriculumId, tenantId, classId);
  });

  // Get progress summary for all teachers (admin view)
  app.get('/curriculum/:curriculumId/summary', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Querystring: { tenantId: string; schoolId?: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId, schoolId } = request.query;
    return curriculumService.getCurriculumProgressSummary(curriculumId, tenantId, schoolId);
  });

  // Update teacher progress for a lesson
  app.post('/teacher/:teacherId', async (request: FastifyRequest<{
    Params: { teacherId: string };
    Body: z.infer<typeof UpdateProgressSchema>;
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId } = request.params;
    const { tenantId, classId } = request.query;
    const data = UpdateProgressSchema.parse(request.body);
    return curriculumService.updateTeacherProgress(teacherId, tenantId, {
      ...data,
      classId,
    });
  });

  // Bulk update progress
  app.post('/teacher/:teacherId/bulk', async (request: FastifyRequest<{
    Params: { teacherId: string };
    Body: z.infer<typeof BulkUpdateProgressSchema>;
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId } = request.params;
    const { tenantId, classId } = request.query;
    const { updates } = BulkUpdateProgressSchema.parse(request.body);
    return curriculumService.bulkUpdateProgress(teacherId, tenantId, classId, updates);
  });

  // Mark lesson as completed
  app.post('/teacher/:teacherId/lesson/:lessonId/complete', async (request: FastifyRequest<{
    Params: { teacherId: string; lessonId: string };
    Body: { notes?: string; studentPerformance?: { averageScore?: number; masteryRate?: number } };
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId, lessonId } = request.params;
    const { tenantId, classId } = request.query;
    const { notes, studentPerformance } = request.body || {};
    return curriculumService.markLessonCompleted(teacherId, lessonId, tenantId, {
      classId,
      notes,
      studentPerformance,
    });
  });

  // Mark lesson as skipped
  app.post('/teacher/:teacherId/lesson/:lessonId/skip', async (request: FastifyRequest<{
    Params: { teacherId: string; lessonId: string };
    Body: { reason: string };
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId, lessonId } = request.params;
    const { tenantId, classId } = request.query;
    const { reason } = request.body;
    return curriculumService.markLessonSkipped(teacherId, lessonId, tenantId, {
      classId,
      reason,
    });
  });

  // Get progress analytics
  app.get('/analytics/teacher/:teacherId', async (request: FastifyRequest<{
    Params: { teacherId: string };
    Querystring: { tenantId: string; curriculumId?: string; startDate?: string; endDate?: string }
  }>) => {
    const { teacherId } = request.params;
    const { tenantId, curriculumId, startDate, endDate } = request.query;
    return curriculumService.getProgressAnalytics(teacherId, tenantId, {
      curriculumId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  });

  // Get pacing comparison (behind/on track/ahead)
  app.get('/pacing-comparison/teacher/:teacherId/pacing/:pacingGuideId', async (request: FastifyRequest<{
    Params: { teacherId: string; pacingGuideId: string };
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId, pacingGuideId } = request.params;
    const { tenantId, classId } = request.query;
    return curriculumService.getPacingComparison(teacherId, pacingGuideId, tenantId, classId);
  });

  // Get reteaching recommendations
  app.get('/reteaching/teacher/:teacherId/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { teacherId: string; curriculumId: string };
    Querystring: { tenantId: string; classId?: string }
  }>) => {
    const { teacherId, curriculumId } = request.params;
    const { tenantId, classId } = request.query;
    return curriculumService.getReteachingRecommendations(teacherId, curriculumId, tenantId, classId);
  });
}
