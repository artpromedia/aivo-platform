/**
 * Auth Routes
 *
 * Authentication endpoints for parent portal.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { parentAuthHook } from './parent-auth.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  const authService = app.services.parentAuth;

  /**
   * Login with email and password
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    try {
      return await authService.login(email, password);
    } catch (error: any) {
      if (error.message === 'EMAIL_NOT_VERIFIED') {
        const { email } = request.body as { email: string };
        return reply.status(403).send({
          error: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in.',
          email: email?.toLowerCase(),
          canResend: true,
        });
      }
      throw error;
    }
  });

  /**
   * Register a new parent account
   */
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      email: string;
      password: string;
      givenName: string;
      familyName: string;
      inviteCode: string;
      language?: string;
    };
    reply.status(201);
    return authService.register(body);
  });

  /**
   * Refresh access token
   */
  app.post('/refresh', async (request: FastifyRequest) => {
    const { refreshToken } = request.body as { refreshToken: string };
    return authService.refreshToken(refreshToken);
  });

  /**
   * Logout and invalidate refresh token
   */
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    await authService.logout(refreshToken);
    return reply.status(204).send();
  });

  /**
   * Verify email with token
   */
  app.get('/verify-email', async (request: FastifyRequest) => {
    const { token } = request.query as { token: string };
    await authService.verifyEmail(token);
    return { success: true, message: 'Email verified successfully' };
  });

  /**
   * Resend verification email
   */
  app.post('/resend-verification', async (request: FastifyRequest) => {
    const body = request.body as { userId?: string; email?: string };
    const email = body.email || body.userId; // mobile app may send userId which is actually email
    if (!email) {
      return { success: false, message: 'Email is required' };
    }
    await authService.resendVerificationEmail(email);
    return { success: true, message: 'Verification email sent' };
  });

  /**
   * Request password reset
   */
  app.post('/forgot-password', async (request: FastifyRequest) => {
    const { email } = request.body as { email: string };
    await authService.requestPasswordReset(email);
    return { success: true, message: 'If the email exists, a reset link has been sent' };
  });

  /**
   * Reset password with token
   */
  app.post('/reset-password', async (request: FastifyRequest) => {
    const { token, password } = request.body as { token: string; password: string };
    await authService.resetPassword(token, password);
    return { success: true, message: 'Password reset successfully' };
  });

  /**
   * Get current user info (requires auth)
   */
  app.get('/me', { preHandler: [parentAuthHook] }, async (request: FastifyRequest) => {
    return {
      id: request.parent!.id,
      email: request.parent!.email,
      firstName: request.parent!.firstName,
      lastName: request.parent!.lastName,
      language: request.parent!.language,
      verified: request.parent!.verified,
    };
  });
}
