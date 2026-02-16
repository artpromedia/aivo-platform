/**
 * School Admin Verification Routes
 *
 * REST API endpoints for school administrators to verify
 * caregiver-learner link requests.
 * NOTE: These routes are registered under /api/v1/admin prefix in app.ts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { BadRequestException } from '../errors.js';

import { schoolAdminHook } from './guards/school-admin.guard.js';
import type { UpdateLinkRequestDto, VerificationStatus } from './registration.types.js';

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return request.ip || 'unknown';
}

export async function adminVerificationRoutes(app: FastifyInstance) {
  const registrationService = app.services.registration;

  // All routes require school admin auth
  app.addHook('preHandler', schoolAdminHook);

  /**
   * Get pending link requests for a school
   * GET /api/v1/admin/schools/:schoolId/learner-link-requests
   */
  app.get('/schools/:schoolId/learner-link-requests', async (request: FastifyRequest) => {
    const { schoolId } = request.params as { schoolId: string };
    const { status, page, limit } = request.query as {
      status?: VerificationStatus;
      page?: string;
      limit?: string;
    };
    return registrationService.getPendingLinkRequests(schoolId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  });

  /**
   * Approve or reject a link request
   * PUT /api/v1/admin/learner-link-requests/:requestId
   */
  app.put('/learner-link-requests/:requestId', async (request: FastifyRequest) => {
    const { requestId } = request.params as { requestId: string };
    const dto = request.body as UpdateLinkRequestDto;
    const adminUserId = request.user?.id || 'unknown';

    await registrationService.updateLinkRequestStatus(
      requestId,
      dto.status,
      adminUserId,
      dto.rejectionReason,
      {
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      }
    );

    return {
      success: true,
      message:
        dto.status === 'APPROVED'
          ? 'Link request approved successfully.'
          : 'Link request rejected.',
    };
  });

  /**
   * Generate verification code for parent pickup
   * POST /api/v1/admin/learners/:learnerId/generate-parent-code
   */
  app.post(
    '/learners/:learnerId/generate-parent-code',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { learnerId } = request.params as { learnerId: string };
      const schoolId = request.user?.schoolId;
      const issuedById = request.user?.id;

      if (!schoolId || !issuedById) {
        throw new BadRequestException('School context required');
      }

      reply.status(201);
      return registrationService.generateParentVerificationCode(schoolId, learnerId, issuedById);
    }
  );
}
