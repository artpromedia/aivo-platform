/**
 * MFA Routes
 *
 * API endpoints for Multi-Factor Authentication management.
 * SOC 2 Type II compliant implementation.
 *
 * Endpoints:
 * - POST /mfa/setup - Initialize MFA setup
 * - POST /mfa/verify - Verify and enable MFA
 * - POST /mfa/disable - Disable MFA
 * - GET /mfa/status - Get MFA status
 * - POST /mfa/challenge/verify - Verify MFA challenge during login
 * - POST /mfa/backup-codes/regenerate - Generate new backup codes
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '../generated/prisma-client/index.js';
import { MfaService } from '../services/mfa.service.js';

// ============================================================================
// Types
// ============================================================================

interface MfaSetupBody {
  // No body required for setup initialization
}

interface MfaVerifyBody {
  code: string;
}

interface MfaDisableBody {
  code: string;
}

interface MfaChallengeVerifyBody {
  challengeId: string;
  code: string;
}

interface MfaBackupCodesBody {
  code: string;
}

interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
}

// ============================================================================
// Route Registration
// ============================================================================

export async function registerMfaRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient
): Promise<void> {
  const mfaService = new MfaService(prisma);

  // --------------------------------------------------------------------------
  // POST /mfa/setup - Initialize MFA setup
  // --------------------------------------------------------------------------
  fastify.post<{ Body: MfaSetupBody }>(
    '/mfa/setup',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Initialize MFA setup for the authenticated user',
        tags: ['MFA'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              secret: { type: 'string', description: 'TOTP secret (base32)' },
              qrCodeUri: { type: 'string', description: 'otpauth:// URI for QR code' },
              backupCodes: {
                type: 'array',
                items: { type: 'string' },
                description: 'One-time backup codes (store securely)',
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;

      try {
        const result = await mfaService.initializeSetup(user.id, user.tenantId);

        // Log MFA setup initiation for audit
        request.log.info({ userId: user.id, event: 'mfa_setup_initiated' });

        return reply.send({
          secret: result.secret,
          qrCodeUri: result.qrCodeUri,
          backupCodes: result.backupCodes,
          message:
            'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then verify with a code to enable MFA. Store your backup codes securely - they will only be shown once.',
        });
      } catch (error: any) {
        request.log.error({ userId: user.id, error: error.message }, 'MFA setup failed');
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /mfa/verify - Verify and enable MFA
  // --------------------------------------------------------------------------
  fastify.post<{ Body: MfaVerifyBody }>(
    '/mfa/verify',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Verify TOTP code and enable MFA',
        tags: ['MFA'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: MfaVerifyBody }>, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { code } = request.body;

      try {
        await mfaService.verifyAndEnable(user.id, user.tenantId, code);

        // Log MFA enablement for audit
        request.log.info({ userId: user.id, event: 'mfa_enabled' });

        return reply.send({
          enabled: true,
          message: 'MFA has been successfully enabled for your account.',
        });
      } catch (error: any) {
        request.log.warn({ userId: user.id, error: error.message }, 'MFA verification failed');
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /mfa/disable - Disable MFA
  // --------------------------------------------------------------------------
  fastify.post<{ Body: MfaDisableBody }>(
    '/mfa/disable',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Disable MFA (requires current TOTP code)',
        tags: ['MFA'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: MfaDisableBody }>, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { code } = request.body;

      try {
        await mfaService.disable(user.id, user.tenantId, code);

        // Log MFA disablement for audit (security event)
        request.log.warn({ userId: user.id, event: 'mfa_disabled' });

        return reply.send({
          enabled: false,
          message: 'MFA has been disabled for your account.',
        });
      } catch (error: any) {
        request.log.warn({ userId: user.id, error: error.message }, 'MFA disable failed');
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // --------------------------------------------------------------------------
  // GET /mfa/status - Get MFA status
  // --------------------------------------------------------------------------
  fastify.get(
    '/mfa/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get MFA status for the authenticated user',
        tags: ['MFA'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              method: { type: 'string' },
              verifiedAt: { type: 'string', format: 'date-time', nullable: true },
              backupCodesRemaining: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;

      try {
        const status = await mfaService.getStatus(user.id, user.tenantId);
        return reply.send(status);
      } catch (error: any) {
        return reply.status(500).send({ error: 'Failed to get MFA status' });
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /mfa/challenge/verify - Verify MFA challenge during login
  // --------------------------------------------------------------------------
  fastify.post<{ Body: MfaChallengeVerifyBody }>(
    '/mfa/challenge/verify',
    {
      schema: {
        description: 'Verify MFA challenge during login flow',
        tags: ['MFA'],
        body: {
          type: 'object',
          required: ['challengeId', 'code'],
          properties: {
            challengeId: { type: 'string', format: 'uuid' },
            code: {
              type: 'string',
              minLength: 6,
              maxLength: 9, // Allow backup codes (XXXX-XXXX format)
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              tokens: {
                type: 'object',
                nullable: true,
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: MfaChallengeVerifyBody }>, reply: FastifyReply) => {
      const { challengeId, code } = request.body;

      try {
        // Get the challenge to find the user
        const challenge = await prisma.mfaChallenge.findFirst({
          where: { id: challengeId },
        });

        if (!challenge) {
          return reply.status(404).send({ error: 'Challenge not found' });
        }

        const result = await mfaService.verifyChallenge(challengeId, challenge.userId, code);

        if (!result.success) {
          request.log.warn(
            { challengeId, remainingAttempts: result.remainingAttempts },
            'MFA challenge verification failed'
          );
          return reply.status(401).send({
            success: false,
            error: 'Invalid code',
            remainingAttempts: result.remainingAttempts,
          });
        }

        // Log successful MFA verification
        request.log.info({ userId: challenge.userId, event: 'mfa_challenge_verified' });

        // Note: The actual token generation happens in auth.service after MFA verification
        // This endpoint just verifies the MFA challenge
        return reply.send({
          success: true,
          message: 'MFA verification successful',
        });
      } catch (error: any) {
        request.log.error({ challengeId, error: error.message }, 'MFA challenge error');
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /mfa/backup-codes/regenerate - Generate new backup codes
  // --------------------------------------------------------------------------
  fastify.post<{ Body: MfaBackupCodesBody }>(
    '/mfa/backup-codes/regenerate',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Regenerate backup codes (requires current TOTP code)',
        tags: ['MFA'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              backupCodes: {
                type: 'array',
                items: { type: 'string' },
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: MfaBackupCodesBody }>, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { code } = request.body;

      try {
        const backupCodes = await mfaService.regenerateBackupCodes(user.id, user.tenantId, code);

        // Log backup code regeneration for audit
        request.log.info({ userId: user.id, event: 'backup_codes_regenerated' });

        return reply.send({
          backupCodes,
          message:
            'New backup codes have been generated. Your previous codes are now invalid. Store these codes securely - they will only be shown once.',
        });
      } catch (error: any) {
        request.log.warn({ userId: user.id, error: error.message }, 'Backup code regeneration failed');
        return reply.status(400).send({ error: error.message });
      }
    }
  );
}
