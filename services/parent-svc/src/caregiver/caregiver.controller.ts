/**
 * Caregiver Routes
 *
 * REST API endpoints for caregiver delegation functionality.
 * Supports both parent (delegator) and caregiver (delegatee) operations.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { parentAuthHook } from '../auth/parent-auth.middleware.js';
import { caregiverAuthHook } from '../registration/guards/caregiver-auth.guard.js';

import type {
  CreateCaregiverInviteDto,
  AcceptCaregiverInviteDto,
  UpdateCaregiverProfileDto,
  UpdateCaregiverPermissionsDto,
  RevokeCaregiverAccessDto,
  ResendCaregiverInviteDto,
  CancelCaregiverInviteDto,
} from './caregiver.types.js';

export async function caregiverRoutes(app: FastifyInstance) {
  const caregiverService = app.services.caregiver;

  // ============================================================================
  // PARENT ENDPOINTS (Managing caregivers for their children)
  // These require parent auth
  // ============================================================================

  /**
   * Create a caregiver invitation (parent action)
   */
  app.post(
    '/invite',
    { preHandler: [parentAuthHook] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as CreateCaregiverInviteDto;
      reply.status(201);
      return caregiverService.createCaregiverInvite(request.parent!.id, body);
    }
  );

  /**
   * Resend a caregiver invitation (parent action)
   */
  app.post('/invite/resend', { preHandler: [parentAuthHook] }, async (request: FastifyRequest) => {
    const body = request.body as ResendCaregiverInviteDto;
    await caregiverService.resendCaregiverInvite(request.parent!.id, body);
    return { success: true, message: 'Invitation resent successfully' };
  });

  /**
   * Cancel a pending caregiver invitation (parent action)
   */
  app.delete(
    '/invite/:inviteId',
    { preHandler: [parentAuthHook] },
    async (request: FastifyRequest) => {
      const { inviteId } = request.params as { inviteId: string };
      await caregiverService.cancelCaregiverInvite(request.parent!.id, { inviteId });
      return { success: true, message: 'Invitation cancelled successfully' };
    }
  );

  /**
   * Get caregivers for a student (parent action)
   */
  app.get(
    '/students/:studentId',
    { preHandler: [parentAuthHook] },
    async (request: FastifyRequest) => {
      const { studentId } = request.params as { studentId: string };
      return caregiverService.getStudentCaregivers(request.parent!.id, studentId);
    }
  );

  /**
   * Get caregiver limit info for a student (parent action)
   */
  app.get(
    '/students/:studentId/limit',
    { preHandler: [parentAuthHook] },
    async (request: FastifyRequest) => {
      const { studentId } = request.params as { studentId: string };
      return caregiverService.getCaregiverLimitInfo(studentId);
    }
  );

  /**
   * Update caregiver permissions (parent action)
   */
  app.put('/permissions', { preHandler: [parentAuthHook] }, async (request: FastifyRequest) => {
    const body = request.body as UpdateCaregiverPermissionsDto;
    return caregiverService.updateCaregiverPermissions(request.parent!.id, body);
  });

  /**
   * Revoke caregiver access (parent action)
   */
  app.delete('/access', { preHandler: [parentAuthHook] }, async (request: FastifyRequest) => {
    const body = request.body as RevokeCaregiverAccessDto;
    await caregiverService.revokeCaregiverAccess(request.parent!.id, body);
    return { success: true, message: 'Caregiver access revoked successfully' };
  });

  // ============================================================================
  // PUBLIC ENDPOINTS (Invite acceptance)
  // ============================================================================

  /**
   * Accept a caregiver invitation (public - no auth required)
   */
  app.post('/accept-invite', async (request: FastifyRequest) => {
    const body = request.body as AcceptCaregiverInviteDto;
    return caregiverService.acceptCaregiverInvite(body);
  });

  /**
   * Get invite details (public - for displaying invite info before accepting)
   */
  app.get('/invite/:code', async (request: FastifyRequest) => {
    const { code } = request.params as { code: string };
    return caregiverService.getInviteDetails(code);
  });

  // ============================================================================
  // CAREGIVER ENDPOINTS (Caregiver managing their own account)
  // These require caregiver auth
  // ============================================================================

  /**
   * Get caregiver profile with linked students
   */
  app.get('/profile', { preHandler: [caregiverAuthHook] }, async (request: FastifyRequest) => {
    return caregiverService.getCaregiverProfile(request.caregiver!.id);
  });

  /**
   * Update caregiver profile
   */
  app.put('/profile', { preHandler: [caregiverAuthHook] }, async (request: FastifyRequest) => {
    const body = request.body as UpdateCaregiverProfileDto;
    return caregiverService.updateCaregiverProfile(request.caregiver!.id, body);
  });

  /**
   * Get student summary (for caregiver dashboard)
   */
  app.get(
    '/students/:studentId/summary',
    { preHandler: [caregiverAuthHook] },
    async (request: FastifyRequest) => {
      const { studentId } = request.params as { studentId: string };
      return caregiverService.getStudentSummaryForCaregiver(request.caregiver!.id, studentId);
    }
  );

  /**
   * Get student progress (for caregiver dashboard)
   */
  app.get(
    '/students/:studentId/progress',
    { preHandler: [caregiverAuthHook] },
    async (request: FastifyRequest) => {
      const { studentId } = request.params as { studentId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      return caregiverService.getStudentProgressForCaregiver(request.caregiver!.id, studentId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    }
  );

  /**
   * Get student achievements (for caregiver dashboard)
   */
  app.get(
    '/students/:studentId/achievements',
    { preHandler: [caregiverAuthHook] },
    async (request: FastifyRequest) => {
      const { studentId } = request.params as { studentId: string };
      return caregiverService.getStudentAchievementsForCaregiver(request.caregiver!.id, studentId);
    }
  );
}
