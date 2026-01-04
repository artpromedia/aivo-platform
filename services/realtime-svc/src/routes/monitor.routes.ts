/**
 * Monitor Routes
 *
 * REST API endpoints for classroom monitoring:
 * - GET /monitor/classroom/:classroomId - Current classroom state
 * - GET /monitor/classroom/:classroomId/students - Detailed student list
 * - GET /monitor/classroom/:classroomId/alerts - Active alerts
 * - POST /monitor/classroom/:classroomId/intervention - Log intervention
 * - GET /monitor/student/:studentId/live - Individual student detail
 * - GET /monitor/classroom/:classroomId/patterns - Engagement patterns
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type { ClassroomMonitorService } from '../services/classroom-monitor.service.js';

interface ClassroomParams {
  classroomId: string;
}

interface StudentParams {
  classroomId: string;
  studentId: string;
}

interface InterventionBody {
  studentId: string;
  teacherId: string;
  type: 'encouragement' | 'help' | 'break_suggestion' | 'redirect' | 'chat' | 'custom';
  message?: string;
  triggeredByAlert?: string;
}

interface PatternsQuery {
  since?: string; // ISO timestamp
}

/**
 * Register monitor routes
 */
export async function registerMonitorRoutes(
  app: FastifyInstance,
  monitorService: ClassroomMonitorService
): Promise<void> {
  /**
   * GET /monitor/classroom/:classroomId
   * Get current classroom state with metrics and students
   */
  app.get<{ Params: ClassroomParams }>(
    '/monitor/classroom/:classroomId',
    async (request: FastifyRequest<{ Params: ClassroomParams }>, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params;

        // TODO: Add authentication and authorization
        // Verify teacher has access to this classroom

        const state = await monitorService.getClassroomState(classroomId);

        return reply.status(200).send({
          success: true,
          data: state,
        });
      } catch (error) {
        request.log.error(error, 'Error getting classroom state');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get classroom state',
        });
      }
    }
  );

  /**
   * GET /monitor/classroom/:classroomId/students
   * Get detailed student list with status
   */
  app.get<{ Params: ClassroomParams }>(
    '/monitor/classroom/:classroomId/students',
    async (request: FastifyRequest<{ Params: ClassroomParams }>, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params;

        // TODO: Add authentication and authorization

        const students = await monitorService.getStudentList(classroomId);

        return reply.status(200).send({
          success: true,
          data: students,
        });
      } catch (error) {
        request.log.error(error, 'Error getting student list');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get student list',
        });
      }
    }
  );

  /**
   * GET /monitor/classroom/:classroomId/alerts
   * Get active alerts requiring attention
   */
  app.get<{ Params: ClassroomParams }>(
    '/monitor/classroom/:classroomId/alerts',
    async (request: FastifyRequest<{ Params: ClassroomParams }>, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params;

        // TODO: Add authentication and authorization

        const alerts = await monitorService.getActiveAlerts(classroomId);

        return reply.status(200).send({
          success: true,
          data: alerts,
        });
      } catch (error) {
        request.log.error(error, 'Error getting alerts');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get alerts',
        });
      }
    }
  );

  /**
   * POST /monitor/classroom/:classroomId/intervention
   * Log teacher intervention
   */
  app.post<{ Params: ClassroomParams; Body: InterventionBody }>(
    '/monitor/classroom/:classroomId/intervention',
    async (
      request: FastifyRequest<{ Params: ClassroomParams; Body: InterventionBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { classroomId } = request.params;
        const { studentId, teacherId, type, message, triggeredByAlert } = request.body;

        // TODO: Add authentication and authorization
        // Verify teacherId matches authenticated user

        const interventionId = await monitorService.logIntervention({
          id: '', // Will be generated
          classroomId,
          studentId,
          teacherId,
          type,
          message,
          timestamp: new Date(),
          triggeredByAlert,
        });

        return reply.status(201).send({
          success: true,
          data: {
            interventionId,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error logging intervention');
        return reply.status(500).send({
          success: false,
          error: 'Failed to log intervention',
        });
      }
    }
  );

  /**
   * GET /monitor/student/:studentId/live
   * Get individual student live detail
   */
  app.get<{ Params: StudentParams }>(
    '/monitor/student/:studentId/live',
    async (request: FastifyRequest<{ Params: StudentParams }>, reply: FastifyReply) => {
      try {
        const { classroomId, studentId } = request.params;

        // TODO: Add authentication and authorization

        const student = await monitorService.getStudentDetail(classroomId, studentId);

        if (!student) {
          return reply.status(404).send({
            success: false,
            error: 'Student not found or not currently active',
          });
        }

        return reply.status(200).send({
          success: true,
          data: student,
        });
      } catch (error) {
        request.log.error(error, 'Error getting student detail');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get student detail',
        });
      }
    }
  );

  /**
   * GET /monitor/classroom/:classroomId/patterns
   * Get engagement patterns for heatmap
   */
  app.get<{ Params: ClassroomParams; Querystring: PatternsQuery }>(
    '/monitor/classroom/:classroomId/patterns',
    async (
      request: FastifyRequest<{ Params: ClassroomParams; Querystring: PatternsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { classroomId } = request.params;
        const { since } = request.query;

        // TODO: Add authentication and authorization

        const sinceDate = since ? new Date(since) : undefined;
        const patterns = await monitorService.getEngagementPatterns(classroomId, sinceDate);

        return reply.status(200).send({
          success: true,
          data: patterns,
        });
      } catch (error) {
        request.log.error(error, 'Error getting engagement patterns');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get engagement patterns',
        });
      }
    }
  );

  console.log('[Monitor Routes] Registered');
}
