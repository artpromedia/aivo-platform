/**
 * Homework Routes
 *
 * REST API endpoints for parent homework monitoring.
 * Provides visibility into student homework helper sessions.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';

export async function homeworkRoutes(app: FastifyInstance) {
  const homeworkService = app.services.homework;

  /**
   * Get homework overview for all linked children
   */
  app.get('/overview', async (request: FastifyRequest) => {
    return homeworkService.getHomeworkOverview(request.parent!.id);
  });

  /**
   * Get homework submissions for a specific student
   */
  app.get('/students/:studentId', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const { limit, offset, subject, status, startDate, endDate } = request.query as {
      limit?: string;
      offset?: string;
      subject?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
    return homeworkService.getStudentHomework(request.parent!.id, studentId, {
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
      subject,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  });

  /**
   * Get detailed view of a specific homework session
   */
  app.get('/students/:studentId/sessions/:homeworkId', async (request: FastifyRequest) => {
    const { studentId, homeworkId } = request.params as { studentId: string; homeworkId: string };
    return homeworkService.getHomeworkDetail(request.parent!.id, studentId, homeworkId);
  });

  /**
   * Get homework summary for a student over a time period
   */
  app.get('/students/:studentId/summary', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const { days, startDate, endDate } = request.query as {
      days?: string;
      startDate?: string;
      endDate?: string;
    };
    return homeworkService.getHomeworkSummary(request.parent!.id, studentId, {
      days: days ? Number.parseInt(days, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  });

  /**
   * Get homework trends over time for a student
   */
  app.get('/students/:studentId/trends', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const { days, granularity } = request.query as { days?: string; granularity?: 'day' | 'week' };
    return homeworkService.getHomeworkTrends(request.parent!.id, studentId, {
      days: days ? Number.parseInt(days, 10) : undefined,
      granularity,
    });
  });
}
