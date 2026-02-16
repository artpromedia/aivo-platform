/**
 * Security Routes
 *
 * API endpoints for assessment security:
 * - Security token validation
 * - Violation reporting
 * - Session management
 * - Accommodations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, z } from 'zod';

import { securityService } from '../services/security.service.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ValidateTokenSchema = z.object({
  token: z.string(),
  fingerprint: z.string(),
});

const ReportViolationSchema = z.object({
  type: z.enum([
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'COPY_PASTE',
    'RIGHT_CLICK',
    'KEYBOARD_SHORTCUT',
    'SCREEN_CAPTURE',
    'BROWSER_RESIZE',
    'MULTIPLE_MONITORS',
    'OTHER',
  ]),
  details: z.record(z.any()).optional(),
  clientInfo: z
    .object({
      userAgent: z.string().optional(),
      screenSize: z.string().optional(),
      windowSize: z.string().optional(),
      focusLost: z.boolean().optional(),
    })
    .optional(),
});

const AddAccommodationSchema = z.object({
  type: z.enum([
    'TIME_EXTENSION',
    'EXTRA_BREAKS',
    'SCREEN_READER',
    'LARGE_TEXT',
    'HIGH_CONTRAST',
    'REDUCED_DISTRACTIONS',
    'OTHER',
  ]),
  value: z.union([z.number(), z.string(), z.boolean()]),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

function handleError(error: unknown, reply: FastifyReply): void {
  if (error instanceof ZodError) {
    reply.status(400).send({ error: 'Validation error', details: error.errors });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      reply.status(404).send({ error: error.message });
      return;
    }
  }

  console.error('Unhandled error:', error);
  reply.status(500).send({ error: 'Internal server error' });
}

function getContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user context');
  }

  return { tenantId, userId };
}

export default async function securityRoutes(app: FastifyInstance): Promise<void> {
  // ============================================================================
  // TOKEN ROUTES
  // ============================================================================

  app.post(
    '/security/attempts/:attemptId/token',
    async (
      request: FastifyRequest<{ Params: { attemptId: string }; Body: { fingerprint: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { attemptId } = request.params;
        const { fingerprint } = request.body as { fingerprint: string };
        const token = securityService.generateSecurityToken(attemptId, fingerprint);

        // Store token
        await securityService.storeSecurityToken(attemptId, token.token);

        return {
          token: token.token,
          expiresAt: token.expiresAt,
        };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/security/attempts/:attemptId/token/validate',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const body = ValidateTokenSchema.parse(request.body);
        const result = await securityService.validateSecurityToken(
          body.token,
          attemptId,
          body.fingerprint
        );
        return result;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // ============================================================================
  // VIOLATION ROUTES
  // ============================================================================

  app.post(
    '/security/attempts/:attemptId/violations',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const body = ReportViolationSchema.parse(request.body);
        const result = await securityService.recordViolation(attemptId, {
          type: body.type,
          timestamp: new Date(),
          details: body.details,
          clientInfo: body.clientInfo,
        });
        return result;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/security/attempts/:attemptId/violations',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const violations = await securityService.getViolationHistory(attemptId);
        return { violations };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // ============================================================================
  // SESSION ROUTES
  // ============================================================================

  app.post(
    '/security/attempts/:attemptId/sessions',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const ipAddress = request.ip ?? (request.headers['x-forwarded-for'] as string) ?? 'unknown';
        const userAgent = request.headers['user-agent'] ?? 'unknown';

        const session = await securityService.startSession(attemptId, ipAddress, userAgent);
        return session;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/security/sessions/:sessionId/end',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params;
        await securityService.endSession(sessionId);
        return { success: true };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/security/attempts/:attemptId/sessions',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const sessions = await securityService.getActiveSessions(attemptId);
        return { sessions };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // ============================================================================
  // ACCOMMODATION ROUTES
  // ============================================================================

  app.post(
    '/security/attempts/:attemptId/accommodations',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = getContext(request);
        const { attemptId } = request.params;
        const body = AddAccommodationSchema.parse(request.body);
        await securityService.addAccommodation(attemptId, {
          ...body,
          approvedBy: userId,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        });
        return { success: true };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get(
    '/security/attempts/:attemptId/accommodations',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const accommodations = await securityService.getAccommodations(attemptId);
        return { accommodations };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // ============================================================================
  // VALIDATION ROUTES
  // ============================================================================

  app.get(
    '/security/attempts/:attemptId/validate',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const result = await securityService.validateAttemptContinuation(attemptId);
        return result;
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.post(
    '/security/attempts/:attemptId/heartbeat',
    async (request: FastifyRequest<{ Params: { attemptId: string } }>, reply: FastifyReply) => {
      try {
        const { attemptId } = request.params;
        const result = await securityService.validateAttemptContinuation(attemptId);
        return {
          canContinue: result.canContinue,
          reason: result.reason,
          timestamp: new Date(),
        };
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  app.get('/security/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // In real app, fetch from assessment settings
      const config = securityService.getClientSecurityConfig({
        preventCopyPaste: true,
        detectTabSwitch: true,
      });
      return config;
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post('/security/detect-lockdown', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userAgent = request.headers['user-agent'] ?? '';
      const result = securityService.detectLockdownBrowser(userAgent);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });
}
