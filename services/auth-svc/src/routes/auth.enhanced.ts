/**
 * Enhanced Authentication Routes
 * Provides complete auth flow with session management
 */

import { Role } from '@aivo/ts-rbac';
import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { AuthService, createAuthService } from '../services/auth.service.js';
import { verifyToken } from '../lib/jwt.js';

// ============================================================================
// Validation Schemas
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tenantId: z.string().optional(),
  role: z.enum(['LEARNER', 'PARENT', 'TEACHER', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  tenantId: z.string().optional(),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const revokeSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

// ============================================================================
// Helpers
// ============================================================================

function getDeviceInfo(request: FastifyRequest) {
  return {
    userAgent: request.headers['user-agent'] || 'unknown',
    ip: request.ip || request.headers['x-forwarded-for']?.toString() || 'unknown',
    deviceId: request.headers['x-device-id']?.toString(),
    platform: request.headers['x-platform']?.toString(),
  };
}

async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<{ userId: string; sessionId?: string }> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Authorization required' });
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyToken(token);
    return { userId: payload.sub, sessionId: payload.jti };
  } catch {
    reply.status(401).send({ error: 'Invalid token' });
    throw new Error('Invalid token');
  }
}

function formatResponse(result: { user: any; tokens: any; session: any }) {
  return {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.expiresIn,
    session: {
      id: result.session.id,
      expiresAt: result.session.expiresAt,
    },
  };
}

// ============================================================================
// Route Registration
// ============================================================================

export async function registerEnhancedAuthRoutes(fastify: FastifyInstance) {
  // Get Redis from Fastify if available
  const redis = (fastify as any).redis;
  const authService = createAuthService(prisma, redis);

  // --------------------------------------------------------------------------
  // POST /auth/register - User Registration
  // --------------------------------------------------------------------------
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const deviceInfo = getDeviceInfo(request);

    try {
      const result = await authService.register({
        ...parsed.data,
        tenantId: parsed.data.tenantId || config.consumerTenantId,
        deviceInfo,
      });

      return reply.status(201).send(formatResponse(result));
    } catch (error: any) {
      if (error.message === 'User with this email already exists') {
        return reply.status(409).send({ error: error.message });
      }
      if (error.message.includes('Password must')) {
        return reply.status(400).send({ error: error.message });
      }
      fastify.log.error(error, 'Registration failed');
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/login - User Login
  // --------------------------------------------------------------------------
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const deviceInfo = getDeviceInfo(request);

    try {
      const result = await authService.login({
        email: parsed.data.email,
        password: parsed.data.password,
        tenantId: parsed.data.tenantId,
        deviceInfo,
      });

      return reply.status(200).send(formatResponse(result));
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      if (error.message.includes('disabled') || error.message.includes('locked')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message.includes('complete your account setup')) {
        return reply.status(403).send({ error: error.message });
      }
      fastify.log.error(error, 'Login failed');
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/refresh - Token Refresh
  // --------------------------------------------------------------------------
  fastify.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const tokens = await authService.refreshToken(parsed.data.refreshToken);
      return reply.status(200).send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (error: any) {
      if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('revoked')) {
        return reply.status(401).send({ error: error.message });
      }
      fastify.log.error(error, 'Token refresh failed');
      return reply.status(500).send({ error: 'Token refresh failed' });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/logout - Logout Current Session
  // --------------------------------------------------------------------------
  fastify.post('/logout', async (request, reply) => {
    try {
      const { sessionId } = await authenticate(request, reply);
      if (sessionId) {
        await authService.logout(sessionId);
      }
      return reply.status(204).send();
    } catch {
      // Even if auth fails, return 204 (logout is idempotent)
      return reply.status(204).send();
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/logout-all - Logout All Sessions
  // --------------------------------------------------------------------------
  fastify.post('/logout-all', async (request, reply) => {
    try {
      const { userId, sessionId } = await authenticate(request, reply);
      const keepCurrent = (request.query as any).keepCurrent === 'true';
      const count = await authService.logoutAllSessions(userId, keepCurrent ? sessionId : undefined);
      return reply.status(200).send({
        message: `Logged out from ${count} session(s)`,
        count,
      });
    } catch {
      return reply.status(401).send({ error: 'Authorization required' });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/verify-email - Email Verification
  // --------------------------------------------------------------------------
  fastify.post('/verify-email', async (request, reply) => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      await authService.verifyEmail(parsed.data.token);
      return reply.status(200).send({ message: 'Email verified successfully' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || 'Verification failed' });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/request-password-reset - Request Password Reset
  // --------------------------------------------------------------------------
  fastify.post('/request-password-reset', async (request, reply) => {
    const parsed = passwordResetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      await authService.requestPasswordReset(parsed.data.email, parsed.data.tenantId);
      // Always return success to prevent email enumeration
      return reply.status(200).send({
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      fastify.log.error(error, 'Password reset request failed');
      // Still return success to prevent enumeration
      return reply.status(200).send({
        message: 'If the email exists, a password reset link has been sent',
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/reset-password - Reset Password with Token
  // --------------------------------------------------------------------------
  fastify.post('/reset-password', async (request, reply) => {
    const parsed = passwordResetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
      return reply.status(200).send({
        message: 'Password reset successfully. Please log in with your new password.',
      });
    } catch (error: any) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return reply.status(400).send({ error: error.message });
      }
      if (error.message.includes('Password must')) {
        return reply.status(400).send({ error: error.message });
      }
      fastify.log.error(error, 'Password reset failed');
      return reply.status(500).send({ error: 'Password reset failed' });
    }
  });

  // --------------------------------------------------------------------------
  // POST /auth/change-password - Change Password (Authenticated)
  // --------------------------------------------------------------------------
  fastify.post('/change-password', async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const { userId } = await authenticate(request, reply);
      await authService.changePassword(
        userId,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );
      return reply.status(200).send({ message: 'Password changed successfully' });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        return reply.status(400).send({ error: error.message });
      }
      if (error.message.includes('Password must')) {
        return reply.status(400).send({ error: error.message });
      }
      fastify.log.error(error, 'Password change failed');
      return reply.status(500).send({ error: 'Password change failed' });
    }
  });

  // --------------------------------------------------------------------------
  // GET /auth/sessions - List Active Sessions
  // --------------------------------------------------------------------------
  fastify.get('/sessions', async (request, reply) => {
    try {
      const { userId, sessionId } = await authenticate(request, reply);
      const sessions = await authService.getSessions(userId);

      // Mark current session
      const sessionsWithCurrent = sessions.map((s) => ({
        ...s,
        isCurrent: s.id === sessionId,
      }));

      return reply.status(200).send({ sessions: sessionsWithCurrent });
    } catch {
      return reply.status(401).send({ error: 'Authorization required' });
    }
  });

  // --------------------------------------------------------------------------
  // DELETE /auth/sessions/:sessionId - Revoke Specific Session
  // --------------------------------------------------------------------------
  fastify.delete('/sessions/:sessionId', async (request, reply) => {
    const parsed = revokeSessionSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid session ID',
      });
    }

    try {
      const { userId } = await authenticate(request, reply);

      // Verify session belongs to user
      const session = await prisma.session.findFirst({
        where: {
          id: parsed.data.sessionId,
          userId,
        },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      await authService.revokeSession(parsed.data.sessionId, 'manual_revoke');
      return reply.status(200).send({ message: 'Session revoked' });
    } catch {
      return reply.status(401).send({ error: 'Authorization required' });
    }
  });

  // --------------------------------------------------------------------------
  // GET /auth/me - Get Current User
  // --------------------------------------------------------------------------
  fastify.get('/me', async (request, reply) => {
    try {
      const { userId } = await authenticate(request, reply);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.status(200).send({
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          phone: user.phone,
          status: user.status,
          emailVerified: user.emailVerified,
          roles: user.roles.map((r) => r.role),
          createdAt: user.createdAt,
        },
      });
    } catch {
      return reply.status(401).send({ error: 'Authorization required' });
    }
  });

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok', service: 'auth' });
  });
}
