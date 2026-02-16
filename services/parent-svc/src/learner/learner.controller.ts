/**
 * Learner Routes
 *
 * Endpoints for learner authentication and profile management.
 * These endpoints are used by the web-learner and mobile-learner apps.
 */

import * as crypto from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

import { learnerAuthHook } from '../auth/learner-auth.middleware.js';
import { config } from '../config.js';
import { BadRequestException, UnauthorizedException } from '../errors.js';
import { prisma } from '../prisma/prisma.service.js';

// In-memory store for dev mode baseline status (maps learner ID to status)
const devModeBaselineStatus = new Map<string, string>();

export async function learnerRoutes(app: FastifyInstance) {
  /**
   * Login with 6-digit PIN (for consumer/home learners)
   */
  app.post('/pin-login', async (request: FastifyRequest) => {
    const { pin } = request.body as { pin: string };

    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new BadRequestException('Invalid PIN format. Please enter 6 digits.');
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    let learner:
      | {
          id: string;
          givenName: string;
          familyName: string;
          photoUrl: string | null;
          baselineStatus: string | null;
          status: string;
        }
      | undefined;

    try {
      const learners = await prisma.$queryRaw<
        {
          id: string;
          givenName: string;
          familyName: string;
          photoUrl: string | null;
          baselineStatus: string | null;
          status: string;
        }[]
      >`
        SELECT id, "givenName", "familyName", "photoUrl", "baselineStatus", status 
        FROM profiles 
        WHERE (pin = ${pin} OR "pinHash" = ${pinHash}) AND status = 'active'
        LIMIT 1
      `;
      learner = learners[0];
    } catch {
      if (!isDev) {
        throw new UnauthorizedException('Invalid PIN. Please check and try again.');
      }
    }

    if (!learner && !isDev) {
      throw new UnauthorizedException('Invalid PIN. Please check and try again.');
    }

    const mockLearnerId = `demo_learner_${pin}`;
    const learnerData = learner || {
      id: mockLearnerId,
      givenName: 'Demo',
      familyName: 'Learner',
      photoUrl: null,
      baselineStatus: devModeBaselineStatus.get(mockLearnerId) || 'not_started',
      status: 'active',
    };

    const accessToken = jwt.sign(
      {
        sub: learnerData.id,
        type: 'learner',
        firstName: learnerData.givenName,
      },
      config.jwtSecret,
      { expiresIn: config.accessTokenExpiresIn }
    );

    const refreshToken = jwt.sign(
      {
        sub: learnerData.id,
        type: 'learner-refresh',
      },
      config.jwtSecret,
      { expiresIn: config.refreshTokenExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      learner: {
        id: learnerData.id,
        firstName: learnerData.givenName,
        lastName: learnerData.familyName,
        avatarUrl: learnerData.photoUrl,
        baselineStatus: learnerData.baselineStatus || 'not_started',
      },
    };
  });

  /**
   * Update learner's baseline status
   */
  app.patch(
    '/baseline-status',
    { preHandler: [learnerAuthHook] },
    async (request: FastifyRequest) => {
      const learnerId = request.learner?.id;

      if (!learnerId) {
        throw new UnauthorizedException('Not authenticated');
      }

      const { status, learningProfile: _learningProfile } = request.body as {
        status: string;
        learningProfile?: Record<string, unknown>;
      };

      if (!['not_started', 'in_progress', 'completed'].includes(status)) {
        throw new BadRequestException('Invalid baseline status');
      }

      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        devModeBaselineStatus.set(learnerId, status);
        console.log(`[Dev Mode] Updated baseline status for ${learnerId} to ${status}`);
        return { success: true };
      }

      try {
        await prisma.$executeRaw`
        UPDATE profiles SET "baselineStatus" = ${status} WHERE id = ${learnerId}
      `;
      } catch (error) {
        console.error('Failed to update baseline status in DB:', error);
      }

      return { success: true };
    }
  );
}
