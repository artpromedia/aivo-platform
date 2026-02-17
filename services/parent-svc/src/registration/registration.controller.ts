/**
 * Caregiver Self-Registration Routes
 *
 * REST API endpoints for the self-service registration flow.
 * NOTE: These routes are registered under /api/v1/caregiver prefix in app.ts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { captchaHook } from './guards/captcha.guard.js';
import {
  registrationRateLimitHook,
  fraudDetectionHook,
} from './guards/registration-rate-limit.guard.js';
import type {
  RegisterCaregiverDto,
  VerifyEmailDto,
  AddLearnerLinkDto,
  VerifyLearnerCodeDto,
  RegistrationResponse,
  VerifyEmailResponse,
  LearnerLinkResponse,
  VerifyLearnerCodeResponse,
  RegistrationStatusResponse,
} from './registration.types.js';

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

export async function registrationRoutes(app: FastifyInstance) {
  const registrationService = app.services.registration;

  /**
   * Step 1: Initial Registration
   * POST /api/v1/caregiver/register
   */
  app.post<{ Body: RegisterCaregiverDto }>(
    '/register',
    { preHandler: [registrationRateLimitHook, captchaHook] },
    async (request, reply): Promise<RegistrationResponse> => {
      const dto = request.body;
      reply.status(201);
      return registrationService.registerCaregiver(dto, {
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });
    }
  );

  /**
   * Step 2: Email Verification
   * POST /api/v1/caregiver/verify-email
   */
  app.post<{ Body: VerifyEmailDto }>(
    '/verify-email',
    { preHandler: [registrationRateLimitHook] },
    async (request): Promise<VerifyEmailResponse> => {
      const dto = request.body;
      return registrationService.verifyEmail(dto, {
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });
    }
  );

  /**
   * Step 3: Add Learner Link Request
   * POST /api/v1/caregiver/:registrationId/learners
   */
  app.post(
    '/:registrationId/learners',
    async (request: FastifyRequest, reply: FastifyReply): Promise<LearnerLinkResponse> => {
      const { registrationId } = request.params as { registrationId: string };
      const dto = request.body as AddLearnerLinkDto;
      reply.status(201);
      return registrationService.addLearnerLink(registrationId, dto, {
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });
    }
  );

  /**
   * Step 4: Submit Verification Code (if applicable)
   * POST /api/v1/caregiver/learners/:linkRequestId/verify
   */
  app.post(
    '/learners/:linkRequestId/verify',
    async (request: FastifyRequest): Promise<VerifyLearnerCodeResponse> => {
      const { linkRequestId } = request.params as { linkRequestId: string };
      const dto = request.body as VerifyLearnerCodeDto;
      return registrationService.verifyLearnerCode(linkRequestId, dto, {
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });
    }
  );

  /**
   * Check Registration Status
   * GET /api/v1/caregiver/:registrationId/status
   */
  app.get(
    '/:registrationId/status',
    async (request: FastifyRequest): Promise<RegistrationStatusResponse> => {
      const { registrationId } = request.params as { registrationId: string };
      return registrationService.getRegistrationStatus(registrationId);
    }
  );

  /**
   * Resend Verification Email
   * POST /api/v1/caregiver/:registrationId/resend-verification
   */
  app.post(
    '/:registrationId/resend-verification',
    { preHandler: [registrationRateLimitHook] },
    async (request: FastifyRequest): Promise<{ success: boolean; message: string }> => {
      const { registrationId } = request.params as { registrationId: string };
      return registrationService.resendVerificationEmail(registrationId, {
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });
    }
  );
}
