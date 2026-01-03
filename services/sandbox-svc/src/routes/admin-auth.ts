/**
 * Admin Authentication Routes
 *
 * Endpoints for admin login, logout, MFA setup, and password management.
 *
 * @module @aivo/sandbox-svc/routes/admin-auth
 */

import { Type, type Static } from '@sinclair/typebox';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  protectedRoute,
  getAdminSession,
  getRequestContext,
} from '../middleware/admin-auth.middleware.js';
import {
  getAdminAuthService,
  UnauthorizedException,
  MfaRequiredException,
  TooManyAttemptsException,
  PasswordExpiredException,
  WeakPasswordException,
  IpNotAllowedException,
} from '../services/admin-auth.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Request/Response Schemas
// ═══════════════════════════════════════════════════════════════════════════════

const LoginRequest = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
  mfaCode: Type.Optional(Type.String({ minLength: 6, maxLength: 6 })),
});

const LoginResponse = Type.Object({
  token: Type.String(),
  expiresAt: Type.String({ format: 'date-time' }),
  admin: Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    role: Type.String(),
    permissions: Type.Array(Type.String()),
  }),
});

const MfaRequiredResponse = Type.Object({
  error: Type.Literal('mfa_required'),
  message: Type.String(),
  temporaryToken: Type.String(),
});

const VerifyMfaRequest = Type.Object({
  temporaryToken: Type.String(),
  mfaCode: Type.String({ minLength: 6, maxLength: 6 }),
});

const SetupMfaResponse = Type.Object({
  secret: Type.String(),
  otpAuthUrl: Type.String(),
  qrCode: Type.String(),
});

const VerifyMfaSetupRequest = Type.Object({
  code: Type.String({ minLength: 6, maxLength: 6 }),
});

const ChangePasswordRequest = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 12 }),
});

const ResetPasswordRequest = Type.Object({
  email: Type.String({ format: 'email' }),
});

const CompletePasswordResetRequest = Type.Object({
  token: Type.String(),
  newPassword: Type.String({ minLength: 12 }),
});

const ErrorResponse = Type.Object({
  error: Type.String(),
  message: Type.String(),
  code: Type.Optional(Type.String()),
});

type LoginRequestType = Static<typeof LoginRequest>;
type VerifyMfaRequestType = Static<typeof VerifyMfaRequest>;
type VerifyMfaSetupRequestType = Static<typeof VerifyMfaSetupRequest>;
type ChangePasswordRequestType = Static<typeof ChangePasswordRequest>;
type ResetPasswordRequestType = Static<typeof ResetPasswordRequest>;
type CompletePasswordResetRequestType = Static<typeof CompletePasswordResetRequest>;

// ═══════════════════════════════════════════════════════════════════════════════
// Error Handler
// ═══════════════════════════════════════════════════════════════════════════════

function handleAuthError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof MfaRequiredException) {
    return reply.status(403).send({
      error: 'mfa_required',
      message: 'Multi-factor authentication required',
      temporaryToken: (error as any).temporaryToken ?? '',
    });
  }

  if (error instanceof TooManyAttemptsException) {
    return reply.status(429).send({
      error: 'too_many_attempts',
      message: error.message,
      code: 'RATE_LIMIT',
    });
  }

  if (error instanceof PasswordExpiredException) {
    return reply.status(403).send({
      error: 'password_expired',
      message: error.message,
      code: 'PASSWORD_EXPIRED',
    });
  }

  if (error instanceof WeakPasswordException) {
    return reply.status(400).send({
      error: 'weak_password',
      message: error.message,
      code: 'WEAK_PASSWORD',
    });
  }

  if (error instanceof IpNotAllowedException) {
    return reply.status(403).send({
      error: 'ip_not_allowed',
      message: error.message,
      code: 'IP_BLOCKED',
    });
  }

  if (error instanceof UnauthorizedException) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: error.message,
      code: 'AUTH_FAILED',
    });
  }

  throw error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

export default async function adminAuthRoutes(fastify: FastifyInstance): Promise<void> {
  const prisma = fastify.prisma;

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/login - Admin login
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginRequestType }>(
    '/auth/login',
    {
      schema: {
        body: LoginRequest,
        response: {
          200: LoginResponse,
          401: ErrorResponse,
          403: Type.Union([MfaRequiredResponse, ErrorResponse]),
          429: ErrorResponse,
        },
        // summary: 'Admin login',
        // description: 'Authenticate an admin user with email and password',
      },
    },
    async (request, reply) => {
      const { email, password, mfaCode } = request.body;
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      try {
        const session = await authService.authenticate({ email, password, ...(mfaCode && { mfaCode }) }, context);

        // Set secure cookie
        reply.header('Set-Cookie', buildSessionCookie(session.token, session.expiresAt));

        return {
          token: session.token,
          expiresAt: session.expiresAt.toISOString(),
          admin: {
            id: session.adminId,
            email: session.adminEmail,
            name: session.adminName,
            role: session.role,
            permissions: session.permissions,
          },
        };
      } catch (error) {
        return handleAuthError(error, reply);
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/verify-mfa - Complete MFA verification
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: VerifyMfaRequestType }>(
    '/auth/verify-mfa',
    {
      schema: {
        body: VerifyMfaRequest,
        response: {
          200: LoginResponse,
          401: ErrorResponse,
        },
        // summary: 'Verify MFA code',
        // description: 'Complete login with MFA code after receiving mfa_required response',
      },
    },
    async (request, reply) => {
      const { temporaryToken, mfaCode } = request.body;
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      try {
        const session = await authService.verifyMfaLogin(temporaryToken, mfaCode, context);

        reply.header('Set-Cookie', buildSessionCookie(session.token, session.expiresAt));

        return {
          token: session.token,
          expiresAt: session.expiresAt.toISOString(),
          admin: {
            id: session.adminId,
            email: session.adminEmail,
            name: session.adminName,
            role: session.role,
            permissions: session.permissions,
          },
        };
      } catch (error) {
        return handleAuthError(error, reply);
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/logout - Logout current session
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/auth/logout',
    {
      ...protectedRoute(),
      schema: {
        response: {
          200: Type.Object({ success: Type.Boolean() }),
          401: ErrorResponse,
        },
        // summary: 'Logout',
        // description: 'Invalidate the current admin session',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      await authService.logout(session.adminId, session.token, context);

      // Clear cookie
      reply.header('Set-Cookie', clearSessionCookie());

      return { success: true };
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/logout-all - Logout all sessions
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/auth/logout-all',
    {
      ...protectedRoute(),
      schema: {
        response: {
          200: Type.Object({ success: Type.Boolean(), sessionsRevoked: Type.Number() }),
          401: ErrorResponse,
        },
        // summary: 'Logout all sessions',
        // description: 'Invalidate all sessions for the current admin',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      const count = await authService.revokeAllSessions(session.adminId, context);

      reply.header('Set-Cookie', clearSessionCookie());

      return { success: true, sessionsRevoked: count };
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /auth/me - Get current admin info
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/auth/me',
    {
      ...protectedRoute(),
      schema: {
        response: {
          200: Type.Object({
            id: Type.String(),
            email: Type.String(),
            name: Type.String(),
            role: Type.String(),
            permissions: Type.Array(Type.String()),
            mfaEnabled: Type.Boolean(),
            lastLogin: Type.Optional(Type.String({ format: 'date-time' })),
          }),
          401: ErrorResponse,
        },
        // summary: 'Get current admin',
        // description: 'Get information about the currently authenticated admin',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const authService = getAdminAuthService(prisma);

      const admin = await prisma.sandboxAdmin.findUnique({
        where: { id: session.adminId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mfaEnabled: true,
          lastLoginAt: true,
        },
      });

      if (!admin) {
        return reply.status(401).send({
          error: 'unauthorized',
          message: 'Admin not found',
        });
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: session.permissions,
        mfaEnabled: admin.mfaEnabled,
        lastLogin: admin.lastLoginAt?.toISOString(),
      };
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/mfa/setup - Start MFA setup
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/auth/mfa/setup',
    {
      ...protectedRoute(),
      schema: {
        response: {
          200: SetupMfaResponse,
          401: ErrorResponse,
          400: ErrorResponse,
        },
        // summary: 'Setup MFA',
        // description: 'Generate MFA secret and QR code for authenticator app',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      const admin = await prisma.sandboxAdmin.findUnique({
        where: { id: session.adminId },
      });

      if (admin?.mfaEnabled) {
        return reply.status(400).send({
          error: 'bad_request',
          message: 'MFA is already enabled',
        });
      }

      const mfaSetup = await authService.setupMfa(session.adminId);

      return {
        secret: mfaSetup.secret,
        otpAuthUrl: mfaSetup.qrCodeUrl,
        qrCode: mfaSetup.qrCodeUrl,
      };
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/mfa/verify - Verify and enable MFA
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: VerifyMfaSetupRequestType }>(
    '/auth/mfa/verify',
    {
      ...protectedRoute(),
      schema: {
        body: VerifyMfaSetupRequest,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            backupCodes: Type.Array(Type.String()),
          }),
          401: ErrorResponse,
          400: ErrorResponse,
        },
        // summary: 'Verify MFA setup',
        // description: 'Verify the MFA code from authenticator and enable MFA',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);
      const { code } = request.body;

      try {
        const backupCodes = await authService.verifyMfaSetup(session.adminId, code, context);
        return {
          success: true,
          backupCodes,
        };
      } catch (error) {
        return reply.status(400).send({
          error: 'invalid_code',
          message: 'Invalid MFA code',
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /auth/mfa - Disable MFA
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.delete(
    '/auth/mfa',
    {
      ...protectedRoute(),
      schema: {
        response: {
          200: Type.Object({ success: Type.Boolean() }),
          401: ErrorResponse,
          400: ErrorResponse,
        },
        // summary: 'Disable MFA',
        // description: 'Disable MFA for the current admin (SUPER_ADMIN only)',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      // Only SUPER_ADMIN can disable MFA
      if (session.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({
          error: 'forbidden',
          message: 'Only SUPER_ADMIN can disable MFA',
        });
      }

      await authService.disableMfa(session.adminId, context);

      return { success: true };
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/change-password - Change password
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: ChangePasswordRequestType }>(
    '/auth/change-password',
    {
      ...protectedRoute(),
      schema: {
        body: ChangePasswordRequest,
        response: {
          200: Type.Object({ success: Type.Boolean() }),
          401: ErrorResponse,
          400: ErrorResponse,
        },
        // summary: 'Change password',
        // description: 'Change the current admin password',
      },
    },
    async (request, reply) => {
      const session = getAdminSession(request);
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);
      const { currentPassword, newPassword } = request.body;

      try {
        await authService.changePassword(session.adminId, currentPassword, newPassword, context);
        return { success: true };
      } catch (error) {
        return handleAuthError(error, reply);
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/forgot-password - Request password reset
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: ResetPasswordRequestType }>(
    '/auth/forgot-password',
    {
      schema: {
        body: ResetPasswordRequest,
        response: {
          200: Type.Object({ success: Type.Boolean(), message: Type.String() }),
        },
        // summary: 'Request password reset',
        // description: 'Request a password reset email',
      },
    },
    async (request, reply) => {
      const { email } = request.body;
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      // Always return success to prevent email enumeration

      await authService.requestPasswordReset(email, context).catch(() => {
        /* intentionally empty */
      });

      return {
        success: true,
        message: 'If the email exists, a password reset link will be sent',
      };
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/reset-password - Complete password reset
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post<{ Body: CompletePasswordResetRequestType }>(
    '/auth/reset-password',
    {
      schema: {
        body: CompletePasswordResetRequest,
        response: {
          200: Type.Object({ success: Type.Boolean() }),
          400: ErrorResponse,
          401: ErrorResponse,
        },
        // summary: 'Reset password',
        // description: 'Complete password reset with token from email',
      },
    },
    async (request, reply) => {
      const { token, newPassword } = request.body;
      const context = getRequestContext(request);
      const authService = getAdminAuthService(prisma);

      try {
        await authService.resetPasswordWithToken(token, newPassword, context);
        return { success: true };
      } catch (error) {
        return handleAuthError(error, reply);
      }
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cookie Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function buildSessionCookie(token: string, expiresAt: Date): string {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'Strict' : 'Lax';

  return [
    `admin_session=${token}`,
    `Expires=${expiresAt.toUTCString()}`,
    'Path=/admin',
    'HttpOnly',
    secure ? 'Secure' : '',
    `SameSite=${sameSite}`,
  ]
    .filter(Boolean)
    .join('; ');
}

function clearSessionCookie(): string {
  return [
    'admin_session=',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Path=/admin',
    'HttpOnly',
  ].join('; ');
}
