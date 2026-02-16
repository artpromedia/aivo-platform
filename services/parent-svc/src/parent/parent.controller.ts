/**
 * Parent Routes
 *
 * REST API endpoints for parent portal functionality.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type {
  CreateConsentInput,
  UpdatePrivacySettingsInput,
  RespondToRecommendationDto,
  SetDomainDifficultyDto,
  UpdateDifficultyPreferencesDto,
} from './parent.types.js';

export async function parentRoutes(app: FastifyInstance) {
  const parentService = app.services.parent;

  /**
   * Get parent profile with linked students
   */
  app.get('/profile', async (request: FastifyRequest) => {
    return parentService.getParentProfile(request.parent!.id);
  });

  /**
   * Update parent profile
   */
  app.put('/profile', async (request: FastifyRequest) => {
    const body = request.body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      language?: string;
    };
    return parentService.updateProfile(request.parent!.id, body);
  });

  /**
   * Get summary for a linked student
   */
  app.get('/students/:studentId/summary', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    return parentService.getStudentSummary(request.parent!.id, studentId);
  });

  /**
   * Get detailed progress report for a student
   */
  app.get('/students/:studentId/progress', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const { period, classId } = request.query as {
      period?: 'week' | 'month' | 'quarter' | 'year';
      classId?: string;
    };
    return parentService.getProgressReport(studentId, request.parent!.id, {
      period,
      classId,
    });
  });

  /**
   * Get weekly summary for a student
   */
  app.get('/students/:studentId/weekly-summary', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const { weekOf } = request.query as { weekOf?: string };
    return parentService.generateWeeklySummary(studentId, request.parent!.id);
  });

  /**
   * Get consent records for a student
   */
  app.get('/students/:studentId/consent', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    return parentService.getConsentRecords(request.parent!.id, studentId);
  });

  /**
   * Record consent for a student
   */
  app.post('/students/:studentId/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId } = request.params as { studentId: string };
    const body = request.body as CreateConsentInput;
    reply.status(201);
    return parentService.recordConsent(request.parent!.id, {
      studentId,
      ...body,
    });
  });

  /**
   * Update privacy settings
   */
  app.put('/privacy-settings', async (request: FastifyRequest) => {
    const body = request.body as UpdatePrivacySettingsInput;
    return parentService.updatePrivacySettings(request.parent!.id, body);
  });

  /**
   * Get notifications
   */
  app.get('/notifications', async (request: FastifyRequest) => {
    const { unreadOnly, limit } = request.query as { unreadOnly?: string; limit?: string };
    return parentService.getNotifications(request.parent!.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  });

  /**
   * Mark notifications as read
   */
  app.put('/notifications/read', async (request: FastifyRequest) => {
    const body = request.body as { notificationIds: string[] };
    return parentService.markNotificationsRead(request.parent!.id, body.notificationIds);
  });

  /**
   * Update notification preferences
   */
  app.put('/notification-preferences', async (request: FastifyRequest) => {
    const body = request.body as Record<string, boolean>;
    return parentService.updateNotificationPreferences(request.parent!.id, body);
  });

  /**
   * Register push subscription
   */
  app.post('/push-subscription', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      platform: string;
      token?: string;
      endpoint: string;
      keys?: Record<string, string>;
    };
    reply.status(201);
    return parentService.registerPushSubscription(request.parent!.id, body);
  });

  // ============================================================================
  // CHILD LINK MANAGEMENT (FERPA Compliance)
  // ============================================================================

  /**
   * Get all linked students for the parent
   */
  app.get('/students', async (request: FastifyRequest) => {
    const { includeRevoked } = request.query as { includeRevoked?: string };
    return parentService.getLinkedStudents(request.parent!.id, {
      includeRevoked: includeRevoked === 'true',
    });
  });

  /**
   * Remove (unlink) a child from the parent's account.
   * FERPA REQUIREMENT: Parents have the right to request removal of their child's data.
   */
  app.delete('/students/:studentId', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const body = (request.body || {}) as { reason?: string };
    const ipAddress = request.ip || (request.headers['x-forwarded-for'] as string)?.split(',')[0];
    const userAgent = request.headers['user-agent'];

    return parentService.removeChildLink(request.parent!.id, studentId, {
      reason: body.reason,
      ipAddress,
      userAgent,
    });
  });

  // ============================================================================
  // DIFFICULTY ADJUSTMENT MANAGEMENT
  // ============================================================================

  /**
   * Get pending difficulty recommendations for a child
   */
  app.get('/students/:studentId/difficulty/recommendations', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    return parentService.getDifficultyRecommendations(request.parent!.id, studentId);
  });

  /**
   * Respond to a difficulty recommendation (approve/modify/deny)
   */
  app.post('/difficulty/recommendations/respond', async (request: FastifyRequest) => {
    const body = request.body as RespondToRecommendationDto;
    return parentService.respondToRecommendation(request.parent!.id, body);
  });

  /**
   * Get current difficulty levels for a child by domain
   */
  app.get('/students/:studentId/difficulty/levels', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    return parentService.getDifficultyLevels(request.parent!.id, studentId);
  });

  /**
   * Directly set difficulty level for a domain (parent override)
   */
  app.post('/difficulty/domain/set', async (request: FastifyRequest) => {
    const body = request.body as SetDomainDifficultyDto;
    return parentService.setDomainDifficulty(request.parent!.id, body);
  });

  /**
   * Get difficulty preferences for a child
   */
  app.get('/students/:studentId/difficulty/preferences', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    return parentService.getDifficultyPreferences(request.parent!.id, studentId);
  });

  /**
   * Update difficulty preferences for a child
   */
  app.put('/difficulty/preferences', async (request: FastifyRequest) => {
    const body = request.body as UpdateDifficultyPreferencesDto;
    return parentService.updateDifficultyPreferences(request.parent!.id, body);
  });

  /**
   * Get difficulty change history for a child
   */
  app.get('/students/:studentId/difficulty/history', async (request: FastifyRequest) => {
    const { studentId } = request.params as { studentId: string };
    const { limit } = request.query as { limit?: string };
    return parentService.getDifficultyHistory(
      request.parent!.id,
      studentId,
      limit ? Number.parseInt(limit, 10) : undefined
    );
  });
}
