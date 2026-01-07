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
 *
 * SECURITY: All endpoints require JWT authentication and proper authorization.
 * Teachers can only access their own classrooms. Admins can access all classrooms in their tenant.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type { ClassroomMonitorService } from '../services/classroom-monitor.service.js';
import { httpAuthMiddleware, type AuthenticatedRequest } from '../middleware/http-auth.middleware.js';

interface ClassroomParams {
  classroomId: string;
}

interface StudentParams {
  classroomId: string;
  studentId: string;
}

interface InterventionBody {
  studentId: string;
  type: 'encouragement' | 'help' | 'break_suggestion' | 'redirect' | 'chat' | 'custom';
  message?: string;
  triggeredByAlert?: string;
}

interface PatternsQuery {
  since?: string; // ISO timestamp
}

// Roles that can access classroom monitoring
const ALLOWED_MONITOR_ROLES = [
  'teacher',
  'TEACHER',
  'school_admin',
  'SCHOOL_ADMIN',
  'district_admin',
  'DISTRICT_ADMIN',
  'platform_admin',
  'PLATFORM_ADMIN',
  'admin',
  'ADMIN',
];

// Roles that can access any classroom (not just their own)
const ADMIN_ROLES = [
  'school_admin',
  'SCHOOL_ADMIN',
  'district_admin',
  'DISTRICT_ADMIN',
  'platform_admin',
  'PLATFORM_ADMIN',
  'admin',
  'ADMIN',
];

/**
 * Check if user has permission to access the classroom
 * Returns error message if not authorized, null if authorized
 */
async function checkClassroomAccess(
  request: AuthenticatedRequest,
  classroomId: string,
  monitorService: ClassroomMonitorService
): Promise<string | null> {
  const user = request.user;

  if (!user) {
    return 'Authentication required';
  }

  // Check if user has an allowed role
  if (!ALLOWED_MONITOR_ROLES.includes(user.role)) {
    return 'Insufficient permissions to access classroom monitoring';
  }

  // Admins can access any classroom in their tenant
  if (ADMIN_ROLES.includes(user.role)) {
    // Still need to verify classroom belongs to their tenant
    const classroom = await monitorService.getClassroomState(classroomId);
    if (classroom && classroom.tenantId !== user.tenantId) {
      return 'Cannot access classrooms from other tenants';
    }
    return null; // Authorized
  }

  // Teachers can only access their own classrooms
  const hasAccess = await monitorService.isTeacherOfClassroom(user.sub, classroomId, user.tenantId);
  if (!hasAccess) {
    return 'You do not have access to this classroom';
  }

  return null; // Authorized
}

/**
 * Register monitor routes
 *
 * SECURITY: All routes require authentication via JWT.
 * Authorization is checked per-request based on user role and classroom ownership.
 */
export async function registerMonitorRoutes(
  app: FastifyInstance,
  monitorService: ClassroomMonitorService
): Promise<void> {
  // Initialize auth middleware
  await httpAuthMiddleware.initialize();

  /**
   * GET /monitor/classroom/:classroomId
   * Get current classroom state with metrics and students
   *
   * Requires: TEACHER role (own classrooms) or ADMIN role (all tenant classrooms)
   */
  app.get<{ Params: ClassroomParams }>(
    '/monitor/classroom/:classroomId',
    { preHandler: httpAuthMiddleware.requireAuth },
    async (request: FastifyRequest<{ Params: ClassroomParams }>, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params;
        const authRequest = request as AuthenticatedRequest;

        // Authorization check
        const authError = await checkClassroomAccess(authRequest, classroomId, monitorService);
        if (authError) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: authError,
          });
        }

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
   *
   * Requires: TEACHER role (own classrooms) or ADMIN role (all tenant classrooms)
   */
  app.get<{ Params: ClassroomParams }>(
    '/monitor/classroom/:classroomId/students',
    { preHandler: httpAuthMiddleware.requireAuth },
    async (request: FastifyRequest<{ Params: ClassroomParams }>, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params;
        const authRequest = request as AuthenticatedRequest;

        // Authorization check
        const authError = await checkClassroomAccess(authRequest, classroomId, monitorService);
        if (authError) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: authError,
          });
        }

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
   *
   * Requires: TEACHER role (own classrooms) or ADMIN role (all tenant classrooms)
   */
  app.get<{ Params: ClassroomParams }>(
    '/monitor/classroom/:classroomId/alerts',
    { preHandler: httpAuthMiddleware.requireAuth },
    async (request: FastifyRequest<{ Params: ClassroomParams }>, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params;
        const authRequest = request as AuthenticatedRequest;

        // Authorization check
        const authError = await checkClassroomAccess(authRequest, classroomId, monitorService);
        if (authError) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: authError,
          });
        }

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
   *
   * Requires: TEACHER role (own classrooms) or ADMIN role (all tenant classrooms)
   * Note: teacherId is derived from the authenticated user, not from request body
   */
  app.post<{ Params: ClassroomParams; Body: InterventionBody }>(
    '/monitor/classroom/:classroomId/intervention',
    { preHandler: httpAuthMiddleware.requireAuth },
    async (
      request: FastifyRequest<{ Params: ClassroomParams; Body: InterventionBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { classroomId } = request.params;
        const { studentId, type, message, triggeredByAlert } = request.body;
        const authRequest = request as AuthenticatedRequest;
        const user = authRequest.user!;

        // Authorization check
        const authError = await checkClassroomAccess(authRequest, classroomId, monitorService);
        if (authError) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: authError,
          });
        }

        // SECURITY: Use authenticated user ID as teacherId, not from request body
        // This prevents users from impersonating other teachers
        const teacherId = user.sub;

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
   * GET /monitor/classroom/:classroomId/student/:studentId/live
   * Get individual student live detail
   *
   * Requires: TEACHER role (own classrooms) or ADMIN role (all tenant classrooms)
   */
  app.get<{ Params: StudentParams }>(
    '/monitor/classroom/:classroomId/student/:studentId/live',
    { preHandler: httpAuthMiddleware.requireAuth },
    async (request: FastifyRequest<{ Params: StudentParams }>, reply: FastifyReply) => {
      try {
        const { classroomId, studentId } = request.params;
        const authRequest = request as AuthenticatedRequest;

        // Authorization check
        const authError = await checkClassroomAccess(authRequest, classroomId, monitorService);
        if (authError) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: authError,
          });
        }

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
   *
   * Requires: TEACHER role (own classrooms) or ADMIN role (all tenant classrooms)
   */
  app.get<{ Params: ClassroomParams; Querystring: PatternsQuery }>(
    '/monitor/classroom/:classroomId/patterns',
    { preHandler: httpAuthMiddleware.requireAuth },
    async (
      request: FastifyRequest<{ Params: ClassroomParams; Querystring: PatternsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { classroomId } = request.params;
        const { since } = request.query;
        const authRequest = request as AuthenticatedRequest;

        // Authorization check
        const authError = await checkClassroomAccess(authRequest, classroomId, monitorService);
        if (authError) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: authError,
          });
        }

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

  app.log.info('[Monitor Routes] Registered with authentication');
}
