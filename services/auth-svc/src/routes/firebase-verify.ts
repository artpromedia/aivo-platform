/**
 * Firebase Email Verification Callback Route
 *
 * POST /auth/firebase-verify-callback
 *
 * Called by the frontend after the user clicks the Firebase email
 * verification link and is redirected back to the app. The handler
 * checks Firebase Auth to confirm the email is verified, then updates
 * the local database.
 */

import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { resendVerificationRateLimiter } from '../lib/rate-limit.js';
import { prisma } from '../prisma.js';
import { createAuthService } from '../services/auth.service.js';

// ============================================================================
// Schema
// ============================================================================

const verifyCallbackBody = z.object({
  /** The email address that was verified */
  email: z.string().email(),
});

const resendVerificationBody = z.object({
  /** User ID to resend verification for */
  userId: z.string().uuid().optional(),
  /** Email address to resend verification for (alternative to userId) */
  email: z.string().email().optional(),
  /** Preferred locale for the email */
  locale: z.string().max(10).optional(),
}).refine(data => data.userId || data.email, {
  message: 'Either userId or email is required',
});

// ============================================================================
// Route Registration
// ============================================================================

export async function registerFirebaseVerifyRoutes(
  fastify: FastifyInstance
) {
  const redis = (fastify as any).redis;
  const authService = createAuthService(prisma, redis);

  // --------------------------------------------------------------------------
  // POST /auth/firebase-verify-callback
  // --------------------------------------------------------------------------
  fastify.post(
    '/firebase-verify-callback',
    async (request, reply) => {
      const parsed = verifyCallbackBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      try {
        await authService.verifyEmailViaFirebase(parsed.data.email);
        return reply
          .status(200)
          .send({ message: 'Email verified successfully' });
      } catch (error: any) {
        const msg = error.message || 'Verification failed';

        if (msg === 'User not found') {
          return reply.status(404).send({ error: msg });
        }
        if (msg === 'Email has not been verified in Firebase') {
          return reply.status(409).send({ error: msg });
        }

        return reply.status(400).send({ error: msg });
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /auth/resend-verification
  // --------------------------------------------------------------------------
  fastify.post(
    '/resend-verification',
    { preHandler: resendVerificationRateLimiter },
    async (request, reply) => {
      const parsed = resendVerificationBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      try {
        let userId = parsed.data.userId;

        // If email provided instead of userId, look up the user
        if (!userId && parsed.data.email) {
          const user = await prisma.user.findFirst({
            where: { email: parsed.data.email },
            select: { id: true },
          });
          if (!user) {
            // Don't reveal whether the email exists
            return reply
              .status(200)
              .send({ message: 'If the email is registered, a verification email has been sent.' });
          }
          userId = user.id;
        }

        await authService.resendEmailVerification(
          userId!,
          parsed.data.locale
        );
        return reply
          .status(200)
          .send({ message: 'Verification email sent' });
      } catch (error: any) {
        const msg = error.message || 'Failed to send verification';

        if (msg === 'User not found') {
          // Don't reveal whether the user exists
          return reply
            .status(200)
            .send({ message: 'If the email is registered, a verification email has been sent.' });
        }
        if (msg === 'Email already verified') {
          return reply.status(409).send({ error: msg });
        }

        return reply.status(400).send({ error: msg });
      }
    }
  );
}
