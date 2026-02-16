/**
 * Internal Routes
 *
 * Internal API endpoints for service-to-service communication.
 * These endpoints are not exposed to external clients.
 */

import * as crypto from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { BadRequestException } from '../errors.js';
import { prisma } from '../prisma/prisma.service.js';

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

export async function internalRoutes(app: FastifyInstance) {
  /**
   * Create a learner profile directly in the database.
   * Used by web-parent during onboarding when the full onboarding flow isn't available.
   */
  app.post('/create-profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = request.body as CreateProfileInput;

    if (!input.id || !input.givenName || !input.pin) {
      throw new BadRequestException('Missing required fields: id, givenName, pin');
    }

    const pinHash = input.pinHash || crypto.createHash('sha256').update(input.pin).digest('hex');

    try {
      const existing = await prisma.profile.findFirst({
        where: {
          OR: [{ id: input.id }, { pin: input.pin }],
        },
      });

      if (existing) {
        return {
          success: true,
          profile: {
            id: existing.id,
            givenName: existing.givenName,
            familyName: existing.familyName,
            pin: input.pin,
            baselineStatus: existing.baselineStatus,
          },
          message: 'Profile already exists',
        };
      }

      const profile = await prisma.profile.create({
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

      reply.status(201);
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
  });
}
