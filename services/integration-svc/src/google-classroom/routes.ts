/**
 * Google Classroom Routes
 *
 * Fastify routes for Google Classroom integration including:
 * - OAuth authentication flow
 * - Course and roster management
 * - Assignment posting and management
 * - Grade passback
 * - Webhook handling
 *
 * @module google-classroom/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type { AssignmentSyncService } from './assignment-sync.service.js';
import {
  ConnectGoogleClassroomSchema,
  OAuthCallbackSchema,
  SyncCourseSchema,
  ListCoursesSchema,
  PostAssignmentSchema,
  UpdateAssignmentSchema,
  ListAssignmentsSchema,
  UpdateGradeSchema,
  BatchGradePassbackSchema,
  AutoSyncGradesSchema,
  WebhookNotificationSchema,
  RegisterWebhookSchema,
  CreateCourseMappingSchema,
  UpdateCourseMappingSchema,
  SyncHistoryQuerySchema,
} from './dto.js';
import type { GoogleClassroomService } from './google-classroom.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface RouteOptions {
  googleClassroomService: GoogleClassroomService;
  assignmentSyncService: AssignmentSyncService;
  frontendUrl: string;
}

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerGoogleClassroomRoutes(
  app: FastifyInstance,
  options: RouteOptions
): Promise<void> {
  const { googleClassroomService, assignmentSyncService, frontendUrl } = options;

  // ============================================================================
  // OAUTH ENDPOINTS
  // ============================================================================

  /**
   * Initiate OAuth flow
   * GET /google-classroom/auth/connect
   */
  app.get(
    '/google-classroom/auth/connect',
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { redirectUrl, loginHint } = ConnectGoogleClassroomSchema.parse(request.query);

      const state = Buffer.from(
        JSON.stringify({
          userId: request.user.id,
          tenantId: request.user.tenantId,
          redirectUrl: redirectUrl || `${frontendUrl}/settings/integrations`,
          timestamp: Date.now(),
        })
      ).toString('base64');

      const authUrl = googleClassroomService.getAuthorizationUrl(state, loginHint);

      return reply.redirect(authUrl);
    }
  );

  /**
   * OAuth callback
   * GET /google-classroom/auth/callback
   */
  app.get(
    '/google-classroom/auth/callback',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = OAuthCallbackSchema.safeParse(request.query);

      if (!params.success) {
        return reply.redirect(`${frontendUrl}/settings/integrations?error=invalid_callback`);
      }

      const { code, state, error } = params.data;

      if (error) {
        return reply.redirect(
          `${frontendUrl}/settings/integrations?error=${encodeURIComponent(error)}`
        );
      }

      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const { userId, tenantId, redirectUrl } = stateData;

        // Verify timestamp (prevent replay attacks)
        const maxAge = 10 * 60 * 1000; // 10 minutes
        if (Date.now() - stateData.timestamp > maxAge) {
          return reply.redirect(`${frontendUrl}/settings/integrations?error=state_expired`);
        }

        const tokens = await googleClassroomService.exchangeCodeForTokens(code);
        await googleClassroomService.storeTokens(userId, tenantId, tokens);

        return reply.redirect(`${redirectUrl}?connected=google_classroom`);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        return reply.redirect(
          `${frontendUrl}/settings/integrations?error=connection_failed&message=${encodeURIComponent(err.message)}`
        );
      }
    }
  );

  /**
   * Check connection status
   * GET /google-classroom/status
   */
  app.get('/google-classroom/status', async (request: AuthenticatedRequest) => {
    try {
      const isConnected = await googleClassroomService.isConnected(request.user.id);

      if (!isConnected) {
        return { connected: false };
      }

      // Get credential details
      // @ts-expect-error - accessing prisma through service
      const credential = await googleClassroomService.prisma.googleClassroomCredential.findUnique({
        where: { userId: request.user.id },
      });

      return {
        connected: true,
        email: credential?.googleEmail,
        scopes: credential?.scope?.split(' '),
        expiresAt: credential?.expiresAt,
      };
    } catch {
      return { connected: false };
    }
  });

  /**
   * Disconnect Google Classroom
   * DELETE /google-classroom/auth/disconnect
   */
  app.delete('/google-classroom/auth/disconnect', async (request: AuthenticatedRequest) => {
    await googleClassroomService.revokeAccess(request.user.id);
    return { success: true };
  });

  // ============================================================================
  // COURSE ENDPOINTS
  // ============================================================================

  /**
   * List available courses
   * GET /google-classroom/courses
   */
  app.get('/google-classroom/courses', async (request: AuthenticatedRequest) => {
    const params = ListCoursesSchema.parse(request.query);

    if (params.state) {
      const result = await googleClassroomService.listCourses(request.user.id, {
        teacherId: 'me',
        courseStates: [params.state],
        pageSize: params.pageSize,
        pageToken: params.pageToken,
      });

      // Enhance with sync status
      const coursesWithStatus = await Promise.all(
        result.courses.map(async (course) => {
          // @ts-expect-error - accessing prisma through service
          const syncRecord = await googleClassroomService.prisma.googleClassroomSync.findUnique({
            where: { googleCourseId: course.id },
          });

          return {
            ...course,
            syncStatus: syncRecord
              ? {
                  synced: true,
                  lastSyncAt: syncRecord.lastSyncAt,
                  inProgress: syncRecord.syncInProgress,
                }
              : {
                  synced: false,
                },
          };
        })
      );

      return {
        courses: coursesWithStatus,
        nextPageToken: result.nextPageToken,
      };
    }

    const courses = await googleClassroomService.listTeacherCourses(request.user.id);
    return courses;
  });

  /**
   * Get course details
   * GET /google-classroom/courses/:courseId
   */
  app.get('/google-classroom/courses/:courseId', async (request: AuthenticatedRequest) => {
    const { courseId } = request.params as { courseId: string };
    return googleClassroomService.getCourse(request.user.id, courseId);
  });

  /**
   * Get course roster
   * GET /google-classroom/courses/:courseId/roster
   */
  app.get('/google-classroom/courses/:courseId/roster', async (request: AuthenticatedRequest) => {
    const { courseId } = request.params as { courseId: string };

    const [students, teachers] = await Promise.all([
      googleClassroomService.listAllStudents(request.user.id, courseId),
      googleClassroomService.listAllTeachers(request.user.id, courseId),
    ]);

    return { students, teachers };
  });

  // ============================================================================
  // SYNC ENDPOINTS
  // ============================================================================

  /**
   * Sync a specific course
   * POST /google-classroom/courses/:courseId/sync
   */
  app.post('/google-classroom/courses/:courseId/sync', async (request: AuthenticatedRequest) => {
    const { courseId } = request.params as { courseId: string };
    const body = SyncCourseSchema.parse(request.body);

    const result = await googleClassroomService.syncCourseRoster(
      request.user.id,
      request.user.tenantId,
      courseId,
      {
        syncGuardians: body.syncGuardians,
        forceFullSync: body.forceFullSync,
        courseStates: body.courseStates,
      }
    );

    return result;
  });

  /**
   * Sync all courses
   * POST /google-classroom/sync/all
   */
  app.post('/google-classroom/sync/all', async (request: AuthenticatedRequest) => {
    const results = await googleClassroomService.syncAllCourses(
      request.user.id,
      request.user.tenantId
    );

    return {
      totalCourses: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  });

  /**
   * Get sync status for a course
   * GET /google-classroom/courses/:courseId/sync/status
   */
  app.get(
    '/google-classroom/courses/:courseId/sync/status',
    async (request: AuthenticatedRequest) => {
      const { courseId } = request.params as { courseId: string };

      // @ts-expect-error - accessing prisma through service
      const syncRecord = await googleClassroomService.prisma.googleClassroomSync.findUnique({
        where: { googleCourseId: courseId },
      });

      if (!syncRecord) {
        return { synced: false };
      }

      return {
        synced: true,
        lastSyncAt: syncRecord.lastSyncAt,
        classId: syncRecord.classId,
        inProgress: syncRecord.syncInProgress,
        lastError: syncRecord.lastError,
        consecutiveFailures: syncRecord.consecutiveFailures,
      };
    }
  );

  /**
   * Get sync history
   * GET /google-classroom/sync/history
   */
  app.get('/google-classroom/sync/history', async (request: AuthenticatedRequest) => {
    const params = SyncHistoryQuerySchema.parse(request.query);

    const where: any = {};

    if (params.courseId) {
      where.googleCourseId = params.courseId;
    }

    if (params.status) {
      if (params.status === 'in_progress') {
        where.syncInProgress = true;
      } else {
        where.lastError = params.status === 'failed' ? { not: null } : null;
        where.syncInProgress = false;
      }
    }

    if (params.startDate || params.endDate) {
      where.lastSyncAt = {};
      if (params.startDate) {
        where.lastSyncAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.lastSyncAt.lte = new Date(params.endDate);
      }
    }

    // @ts-expect-error - accessing prisma through service
    const [entries, total] = await Promise.all([
      googleClassroomService.prisma.googleClassroomSyncLog.findMany({
        where,
        orderBy: { syncedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      googleClassroomService.prisma.googleClassroomSyncLog.count({ where }),
    ]);

    return {
      entries,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  });

  // ============================================================================
  // ASSIGNMENT ENDPOINTS
  // ============================================================================

  /**
   * Post a lesson as a Classroom assignment
   * POST /google-classroom/assignments
   */
  app.post('/google-classroom/assignments', async (request: AuthenticatedRequest) => {
    const body = PostAssignmentSchema.parse(request.body);

    const assignment = await assignmentSyncService.postLessonAsAssignment(
      request.user.id,
      body.lessonId,
      body.courseId,
      {
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        dueTime: body.dueTime,
        maxPoints: body.maxPoints,
        scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : undefined,
        topicId: body.topicId,
      }
    );

    return assignment;
  });

  /**
   * Get linked assignments
   * GET /google-classroom/assignments
   */
  app.get('/google-classroom/assignments', async (request: AuthenticatedRequest) => {
    const params = ListAssignmentsSchema.parse(request.query);

    return assignmentSyncService.getLinkedAssignments({
      userId: request.user.id,
      courseId: params.courseId,
      lessonId: params.lessonId,
      status: params.status,
    });
  });

  /**
   * Get assignment link details
   * GET /google-classroom/assignments/:assignmentId
   */
  app.get('/google-classroom/assignments/:assignmentId', async (request: AuthenticatedRequest) => {
    const { assignmentId } = request.params as { assignmentId: string };

    const link = await assignmentSyncService.getAssignmentLink(assignmentId);

    if (!link) {
      return { error: 'Assignment link not found' };
    }

    return link;
  });

  /**
   * Update a linked assignment
   * PUT /google-classroom/assignments/:assignmentId
   */
  app.put('/google-classroom/assignments/:assignmentId', async (request: AuthenticatedRequest) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const body = UpdateAssignmentSchema.parse(request.body);

    return assignmentSyncService.updateLinkedAssignment(request.user.id, assignmentId, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      maxPoints: body.maxPoints,
      state: body.state,
    });
  });

  /**
   * Delete a linked assignment
   * DELETE /google-classroom/assignments/:assignmentId
   */
  app.delete(
    '/google-classroom/assignments/:assignmentId',
    async (request: AuthenticatedRequest) => {
      const { assignmentId } = request.params as { assignmentId: string };

      await assignmentSyncService.deleteLinkedAssignment(request.user.id, assignmentId);
      return { success: true };
    }
  );

  // ============================================================================
  // GRADE PASSBACK ENDPOINTS
  // ============================================================================

  /**
   * Pass back a single grade
   * POST /google-classroom/grades
   */
  app.post('/google-classroom/grades', async (request: AuthenticatedRequest) => {
    const body = UpdateGradeSchema.parse(request.body);

    await assignmentSyncService.passbackGrade(request.user.id, {
      lessonId: body.lessonId,
      courseId: body.courseId,
      studentId: body.studentId,
      grade: body.grade!,
      draftGrade: body.draftGrade,
      returnToStudent: body.returnToStudent,
    });

    return { success: true };
  });

  /**
   * Batch pass back grades
   * POST /google-classroom/grades/batch
   */
  app.post('/google-classroom/grades/batch', async (request: AuthenticatedRequest) => {
    const body = BatchGradePassbackSchema.parse(request.body);

    return assignmentSyncService.batchPassbackGrades(request.user.id, {
      lessonId: body.lessonId,
      courseId: body.courseId,
      grades: body.grades,
      returnToStudents: body.returnToStudents,
    });
  });

  /**
   * Auto-sync grades for completed lessons
   * POST /google-classroom/grades/auto-sync
   */
  app.post('/google-classroom/grades/auto-sync', async (request: AuthenticatedRequest) => {
    const body = AutoSyncGradesSchema.parse(request.query);

    return assignmentSyncService.syncPendingGrades(request.user.id, body.courseId);
  });

  // ============================================================================
  // WEBHOOK ENDPOINTS
  // ============================================================================

  /**
   * Register push notifications for a course
   * POST /google-classroom/webhooks/register
   */
  app.post('/google-classroom/webhooks/register', async (request: AuthenticatedRequest) => {
    const body = RegisterWebhookSchema.parse(request.body);

    return googleClassroomService.registerPushNotifications(
      request.user.id,
      body.courseId,
      body.feedType
    );
  });

  /**
   * Handle Google Classroom push notifications
   * POST /google-classroom/webhook
   */
  app.post('/google-classroom/webhook', async (request: FastifyRequest) => {
    // Verify the notification is from Google
    // In production, verify the JWT token in the Authorization header

    const body = WebhookNotificationSchema.safeParse(request.body);

    if (!body.success) {
      console.warn('Invalid webhook payload:', body.error);
      return { received: false };
    }

    if (body.data.message?.data) {
      try {
        const notification = JSON.parse(Buffer.from(body.data.message.data, 'base64').toString());

        await googleClassroomService.processWebhookNotification(notification);
      } catch (error) {
        console.error('Error processing webhook:', error);
      }
    }

    return { received: true };
  });

  // ============================================================================
  // COURSE MAPPING ENDPOINTS
  // ============================================================================

  /**
   * Create course mapping
   * POST /google-classroom/mappings
   */
  app.post('/google-classroom/mappings', async (request: AuthenticatedRequest) => {
    const body = CreateCourseMappingSchema.parse(request.body);

    // @ts-expect-error - accessing prisma through service
    const mapping = await googleClassroomService.prisma.googleClassroomCourseMapping.create({
      data: {
        tenantId: request.user.tenantId,
        aivoClassId: body.aivoClassId,
        googleCourseId: body.googleCourseId,
        autoSync: body.autoSync,
        syncDirection: body.syncDirection,
      },
    });

    return mapping;
  });

  /**
   * List course mappings
   * GET /google-classroom/mappings
   */
  app.get('/google-classroom/mappings', async (request: AuthenticatedRequest) => {
    // @ts-expect-error - accessing prisma through service
    return googleClassroomService.prisma.googleClassroomCourseMapping.findMany({
      where: { tenantId: request.user.tenantId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
      },
    });
  });

  /**
   * Update course mapping
   * PUT /google-classroom/mappings/:mappingId
   */
  app.put('/google-classroom/mappings/:mappingId', async (request: AuthenticatedRequest) => {
    const { mappingId } = request.params as { mappingId: string };
    const body = UpdateCourseMappingSchema.parse(request.body);

    // @ts-expect-error - accessing prisma through service
    return googleClassroomService.prisma.googleClassroomCourseMapping.update({
      where: { id: mappingId },
      data: {
        autoSync: body.autoSync,
        syncDirection: body.syncDirection,
      },
    });
  });

  /**
   * Delete course mapping
   * DELETE /google-classroom/mappings/:mappingId
   */
  app.delete('/google-classroom/mappings/:mappingId', async (request: AuthenticatedRequest) => {
    const { mappingId } = request.params as { mappingId: string };

    // @ts-expect-error - accessing prisma through service
    await googleClassroomService.prisma.googleClassroomCourseMapping.delete({
      where: { id: mappingId },
    });

    return { success: true };
  });
}
