/**
 * Learner PIN Management Routes
 *
 * Endpoints for parents to change their child's 6-digit login PIN.
 * All routes require parent authentication.
 */

import * as crypto from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { parentAuthHook } from '../auth/parent-auth.middleware.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '../errors.js';
import { prisma } from '../prisma/prisma.service.js';

const WEAK_PINS = [
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123456',
  '654321',
  '012345',
  '123123',
  '112233',
];

/**
 * Verify that the authenticated parent owns the given learner.
 * Returns the learner profile or throws.
 */
async function verifyParentOwnership(parentId: string, learnerId: string) {
  const link = await prisma.parentStudentLink.findFirst({
    where: {
      parentId,
      studentId: learnerId,
      status: 'active',
    },
  });

  if (!link) {
    throw new ForbiddenException('You do not have access to this learner');
  }

  const learner = await prisma.profile.findUnique({
    where: { id: learnerId },
    select: { id: true, givenName: true, pin: true, pinHash: true, status: true },
  });

  if (!learner || learner.status !== 'active') {
    throw new NotFoundException('Learner not found');
  }

  return learner;
}

export async function learnerPinRoutes(app: FastifyInstance) {
  // All routes in this scope require parent auth
  app.addHook('preHandler', parentAuthHook);

  /**
   * PATCH /:learnerId/pin — Change learner login PIN
   */
  app.patch(
    '/:learnerId/pin',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const parentId = (request as unknown as { parentId: string }).parentId;
      const { newPin, confirmPin } = request.body as {
        newPin: string;
        confirmPin: string;
      };

      // Validate input
      if (!newPin || !confirmPin) {
        throw new BadRequestException('Both newPin and confirmPin are required');
      }

      if (newPin !== confirmPin) {
        throw new BadRequestException('PINs do not match');
      }

      if (!/^\d{6}$/.test(newPin)) {
        throw new BadRequestException('PIN must be exactly 6 digits');
      }

      if (WEAK_PINS.includes(newPin)) {
        throw new BadRequestException('PIN is too easy to guess — please choose a stronger one');
      }

      // Verify parent owns this learner
      await verifyParentOwnership(parentId, learnerId);

      // Hash the new PIN
      const pinHash = crypto.createHash('sha256').update(newPin).digest('hex');

      // Check PIN uniqueness among active profiles (excluding this learner)
      const existingPin = await prisma.profile.findFirst({
        where: {
          OR: [{ pin: newPin }, { pinHash }],
          status: 'active',
          id: { not: learnerId },
        },
      });

      if (existingPin) {
        throw new BadRequestException('This PIN is already in use — please choose a different one');
      }

      // Update the learner's PIN
      await prisma.profile.update({
        where: { id: learnerId },
        data: { pin: newPin, pinHash },
      });

      return { success: true, message: 'Learner PIN updated successfully' };
    }
  );

  /**
   * GET /:learnerId/pin-status — Check whether a learner has a PIN set
   */
  app.get(
    '/:learnerId/pin-status',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const parentId = (request as unknown as { parentId: string }).parentId;

      // Verify parent owns this learner
      const learner = await verifyParentOwnership(parentId, learnerId);

      return {
        hasPin: !!(learner.pin || learner.pinHash),
      };
    }
  );
}
