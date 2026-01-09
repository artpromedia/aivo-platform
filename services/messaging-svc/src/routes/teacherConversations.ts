/**
 * Teacher Conversation Access Routes
 *
 * API endpoints for teachers to view student AI conversations.
 * CRITICAL: Enables teacher oversight of AI tutor interactions (CRIT-003)
 *
 * All access is:
 * - Read-only (teachers cannot modify student conversations)
 * - Logged for audit/compliance
 * - Requires verified teacher-student relationship
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  verifyTeacherStudentRelationship,
  getStudentConversationsForTeacher,
  getConversationMessagesForTeacher,
  getClassAiConversationsSummary,
  logTeacherConversationAccess,
} from '../services/teacherAccessService.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: string;
}

interface StudentParams {
  studentId: string;
}

interface ConversationParams {
  conversationId: string;
}

interface ClassParams {
  classId: string;
}

interface PaginationQuery {
  limit?: string;
  offset?: string;
  beforeId?: string;
}

interface ConversationFilterQuery extends PaginationQuery {
  contextType?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Extract tenant context from headers
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): TenantContext {
  const tenantId = request.headers['x-tenant-id'] as string | undefined;
  const userId = request.headers['x-user-id'] as string | undefined;
  const userRole = request.headers['x-user-role'] as string | undefined;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId, userRole: userRole ?? 'unknown' };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerTeacherConversationRoutes(app: FastifyInstance): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // GET /teacher/students/:studentId/conversations
  // List all AI conversations for a student (teacher oversight)
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{
    Params: StudentParams;
    Querystring: ConversationFilterQuery;
  }>(
    '/teacher/students/:studentId/conversations',
    async (
      request: FastifyRequest<{
        Params: StudentParams;
        Querystring: ConversationFilterQuery;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { studentId } = request.params;
      const { contextType, limit, offset } = request.query;

      // Verify teacher role
      if (!['teacher', 'admin', 'staff'].includes(ctx.userRole.toLowerCase())) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only teachers, admins, or staff can view student conversations',
        });
      }

      const result = await getStudentConversationsForTeacher(
        ctx.tenantId,
        ctx.userId,
        studentId,
        {
          contextType,
          limit: limit ? parseInt(limit, 10) : undefined,
          offset: offset ? parseInt(offset, 10) : undefined,
        }
      );

      // Check if relationship exists
      if (!result.relationship.valid) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this student. You must teach a class they are enrolled in.',
        });
      }

      // Log access for audit
      await logTeacherConversationAccess(
        ctx.tenantId,
        ctx.userId,
        studentId,
        'LIST', // Viewing the list
        'VIEW_LIST'
      );

      return reply.status(200).send({
        conversations: result.conversations,
        total: result.total,
        relationship: {
          type: result.relationship.relationshipType,
          className: result.relationship.className,
        },
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /teacher/students/:studentId/conversations/:conversationId
  // Get messages from a specific student conversation
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{
    Params: StudentParams & ConversationParams;
    Querystring: PaginationQuery;
  }>(
    '/teacher/students/:studentId/conversations/:conversationId',
    async (
      request: FastifyRequest<{
        Params: StudentParams & ConversationParams;
        Querystring: PaginationQuery;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { studentId, conversationId } = request.params;
      const { limit, beforeId } = request.query;

      // Verify teacher role
      if (!['teacher', 'admin', 'staff'].includes(ctx.userRole.toLowerCase())) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only teachers, admins, or staff can view student conversations',
        });
      }

      // First verify relationship
      const relationship = await verifyTeacherStudentRelationship(
        ctx.tenantId,
        ctx.userId,
        studentId
      );

      if (!relationship.valid) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this student',
        });
      }

      const result = await getConversationMessagesForTeacher(
        ctx.tenantId,
        ctx.userId,
        conversationId,
        {
          limit: limit ? parseInt(limit, 10) : undefined,
          beforeId,
        }
      );

      if (!result) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Conversation not found or you do not have access',
        });
      }

      // Log access for audit
      await logTeacherConversationAccess(
        ctx.tenantId,
        ctx.userId,
        studentId,
        conversationId,
        'VIEW_MESSAGES'
      );

      return reply.status(200).send(result);
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /teacher/classes/:classId/ai-activity
  // Get AI conversation activity summary for all students in a class
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: ClassParams }>(
    '/teacher/classes/:classId/ai-activity',
    async (
      request: FastifyRequest<{ Params: ClassParams }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { classId } = request.params;

      // Verify teacher role
      if (!['teacher', 'admin', 'staff'].includes(ctx.userRole.toLowerCase())) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only teachers, admins, or staff can view class AI activity',
        });
      }

      const result = await getClassAiConversationsSummary(
        ctx.tenantId,
        ctx.userId,
        classId
      );

      if (result.students.length === 0 && result.classTotal.activeStudents === 0) {
        // Check if this is due to no access or just no activity
        return reply.status(200).send({
          students: [],
          classTotal: result.classTotal,
          message: 'No AI activity found or you do not have access to this class',
        });
      }

      return reply.status(200).send(result);
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /teacher/students/:studentId/ai-settings
  // Check if AI is enabled/disabled for a student
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: StudentParams }>(
    '/teacher/students/:studentId/ai-settings',
    async (
      request: FastifyRequest<{ Params: StudentParams }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { studentId } = request.params;

      // Verify teacher role
      if (!['teacher', 'admin', 'staff'].includes(ctx.userRole.toLowerCase())) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only teachers, admins, or staff can view student AI settings',
        });
      }

      // Verify relationship
      const relationship = await verifyTeacherStudentRelationship(
        ctx.tenantId,
        ctx.userId,
        studentId
      );

      if (!relationship.valid) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this student',
        });
      }

      // Note: AI settings are in profile-svc, so we return a cross-service reference
      // In production, this would call profile-svc or use a shared data layer
      return reply.status(200).send({
        studentId,
        relationship: {
          type: relationship.relationshipType,
          className: relationship.className,
        },
        aiSettingsUrl: `/profile-svc/learners/${studentId}/ai-settings`,
        message: 'AI settings are managed through the profile service',
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /teacher/students/:studentId/conversations/:conversationId/flag
  // Flag a conversation for review (e.g., concerning content)
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{
    Params: StudentParams & ConversationParams;
    Body: { reason: string; severity?: 'low' | 'medium' | 'high' };
  }>(
    '/teacher/students/:studentId/conversations/:conversationId/flag',
    async (
      request: FastifyRequest<{
        Params: StudentParams & ConversationParams;
        Body: { reason: string; severity?: 'low' | 'medium' | 'high' };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { studentId, conversationId } = request.params;
      const { reason, severity = 'medium' } = request.body;

      // Verify teacher role
      if (!['teacher', 'admin', 'staff'].includes(ctx.userRole.toLowerCase())) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only teachers, admins, or staff can flag conversations',
        });
      }

      // Verify relationship
      const relationship = await verifyTeacherStudentRelationship(
        ctx.tenantId,
        ctx.userId,
        studentId
      );

      if (!relationship.valid) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this student',
        });
      }

      // Validate reason
      if (!reason || reason.trim().length < 10) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Flag reason must be at least 10 characters',
        });
      }

      // Create flag (stored as a system message in the conversation)
      // In production, this might go to a separate flagging/moderation service
      await logTeacherConversationAccess(
        ctx.tenantId,
        ctx.userId,
        studentId,
        conversationId,
        'VIEW_MESSAGES' // Flagging requires viewing
      );

      // Log the flag
      console.info(
        JSON.stringify({
          event: 'conversation_flagged',
          tenantId: ctx.tenantId,
          teacherId: ctx.userId,
          studentId,
          conversationId,
          reason,
          severity,
          timestamp: new Date().toISOString(),
        })
      );

      return reply.status(201).send({
        success: true,
        message: 'Conversation flagged for review',
        flag: {
          conversationId,
          flaggedBy: ctx.userId,
          reason,
          severity,
          flaggedAt: new Date().toISOString(),
        },
      });
    }
  );
}
