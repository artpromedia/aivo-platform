/**
 * Internal Controller
 *
 * Internal API endpoints for service-to-service communication.
 * These endpoints are not exposed to external clients.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

interface CreateProfileInput {
  id: string;
  givenName: string;
  familyName: string;
  grade?: string;
  dateOfBirth?: string | null;
  pin: string;
  pinHash: string;
  baselineStatus?: string;
  status?: string;
}

@Controller('internal')
export class InternalController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a learner profile directly in the database.
   * Used by web-parent during onboarding when the full onboarding flow isn't available.
   */
  @Post('create-profile')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() input: CreateProfileInput) {
    if (!input.id || !input.givenName || !input.pin) {
      throw new BadRequestException('Missing required fields: id, givenName, pin');
    }

    // Hash the PIN if not provided
    const pinHash = input.pinHash || crypto.createHash('sha256').update(input.pin).digest('hex');

    try {
      // Check if profile already exists
      const existing = await this.prisma.profile.findFirst({
        where: {
          OR: [
            { id: input.id },
            { pin: input.pin },
          ],
        },
      });

      if (existing) {
        // Return existing profile
        return {
          success: true,
          profile: {
            id: existing.id,
            givenName: existing.givenName,
            familyName: existing.familyName,
            pin: input.pin, // Return the original PIN (not stored in DB)
            baselineStatus: existing.baselineStatus,
          },
          message: 'Profile already exists',
        };
      }

      // Create new profile
      const profile = await this.prisma.profile.create({
        data: {
          id: input.id,
          givenName: input.givenName,
          familyName: input.familyName || '',
          grade: input.grade || null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          pin: input.pin,
          pinHash,
          baselineStatus: input.baselineStatus || 'not_started',
          status: input.status || 'active',
        },
      });

      console.log(`[Internal] Created profile: ${profile.id} for ${profile.givenName}`);

      return {
        success: true,
        profile: {
          id: profile.id,
          givenName: profile.givenName,
          familyName: profile.familyName,
          pin: input.pin,
          baselineStatus: profile.baselineStatus,
        },
        message: 'Profile created successfully',
      };
    } catch (error) {
      console.error('[Internal] Failed to create profile:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to create profile: ${message}`);
    }
  }
}
