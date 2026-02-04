/**
 * Learner Controller
 *
 * Endpoints for learner authentication and profile management.
 * These endpoints are used by the web-learner and mobile-learner apps.
 */

import * as crypto from 'node:crypto';

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Patch,
  Req,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { PrismaClient } from '../../generated/prisma-client/index.js';
import { config } from '../config.js';
import type { LearnerAuthRequest } from '../auth/learner-auth.middleware.js';

const prisma = new PrismaClient();

// In-memory store for dev mode baseline status (maps learner ID to status)
const devModeBaselineStatus = new Map<string, string>();

@Controller('learner')
export class LearnerController {
  /**
   * Login with 6-digit PIN (for consumer/home learners)
   */
  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  async pinLogin(@Body() body: { pin: string }) {
    const { pin } = body;

    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new BadRequestException('Invalid PIN format. Please enter 6 digits.');
    }

    // Dev mode: Allow any 6-digit PIN for demo purposes
    const isDev = process.env.NODE_ENV !== 'production';

    // Hash the PIN for lookup
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    let learner: {
      id: string;
      givenName: string;
      familyName: string;
      photoUrl: string | null;
      baselineStatus: string | null;
      status: string;
    } | undefined;

    try {
      // Find learner by PIN hash - using raw query since schema may not be migrated yet
      const learners = await prisma.$queryRaw<{
        id: string;
        givenName: string;
        familyName: string;
        photoUrl: string | null;
        baselineStatus: string | null;
        status: string;
      }[]>`
        SELECT id, "givenName", "familyName", "photoUrl", "baselineStatus", status 
        FROM profiles 
        WHERE (pin = ${pin} OR "pinHash" = ${pinHash}) AND status = 'active'
        LIMIT 1
      `;
      learner = learners[0];
    } catch {
      // Schema not migrated yet - columns don't exist
      // In dev mode, we'll use mock data below
      if (!isDev) {
        throw new UnauthorizedException('Invalid PIN. Please check and try again.');
      }
    }
    
    if (!learner && !isDev) {
      throw new UnauthorizedException('Invalid PIN. Please check and try again.');
    }

    // Development-only: Create mock learner if no real learner found
    // This allows testing PIN authentication without a full database setup
    // Production behavior: Will throw UnauthorizedException if learner not found
    const mockLearnerId = `demo_learner_${pin}`;
    const learnerData = learner || {
      id: mockLearnerId,
      givenName: 'Demo',
      familyName: 'Learner',
      photoUrl: null,
      baselineStatus: devModeBaselineStatus.get(mockLearnerId) || 'not_started',
      status: 'active',
    };

    // Generate tokens for the learner
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
  }

  /**
   * Update learner's baseline status
   */
  @Patch('baseline-status')
  @HttpCode(HttpStatus.OK)
  async updateBaselineStatus(
    @Req() req: LearnerAuthRequest,
    @Body() body: { status: string; learningProfile?: Record<string, unknown> }
  ) {
    // In production, extract learner ID from auth token
    // For now, get it from the request body as fallback
    const learnerId = req.learner?.id;

    if (!learnerId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const { status, learningProfile: _learningProfile } = body;

    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      throw new BadRequestException('Invalid baseline status');
    }

    // Dev mode: store in memory
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      devModeBaselineStatus.set(learnerId, status);
      console.log(`[Dev Mode] Updated baseline status for ${learnerId} to ${status}`);
      return { success: true };
    }

    // Use raw query since schema may not be migrated
    try {
      await prisma.$executeRaw`
        UPDATE profiles SET "baselineStatus" = ${status} WHERE id = ${learnerId}
      `;
    } catch (error) {
      console.error('Failed to update baseline status in DB:', error);
      // Still return success for dev/demo scenarios
    }

    return { success: true };
  }
}
