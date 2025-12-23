/**
 * Learner Notification Settings Routes
 *
 * REST endpoints for managing COPPA-compliant learner notification settings.
 * These settings are parent-controlled and only allow educational notifications.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const LearnerSettingsSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  achievementsEnabled: z.boolean().optional(),
  streakRemindersEnabled: z.boolean().optional(),
  encouragementEnabled: z.boolean().optional(),
  soundsEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerLearnerSettingsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /learner-settings/:learnerId
   * Get learner notification settings (parent only)
   */
  fastify.get(
    '/learner-settings/:learnerId',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;

      const settings = await prisma.learnerNotificationSettings.findUnique({
        where: { learnerId },
      });

      if (!settings) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Learner settings not found',
        });
      }

      // Verify parent owns these settings
      if (settings.parentId !== ctx.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to view these settings',
        });
      }

      return reply.send({
        data: {
          learnerId: settings.learnerId,
          remindersEnabled: settings.remindersEnabled,
          achievementsEnabled: settings.achievementsEnabled,
          streakRemindersEnabled: settings.streakRemindersEnabled,
          encouragementEnabled: settings.encouragementEnabled,
          soundsEnabled: settings.soundsEnabled,
          vibrationEnabled: settings.vibrationEnabled,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          updatedAt: settings.updatedAt,
        },
      });
    }
  );

  /**
   * PUT /learner-settings/:learnerId
   * Update learner notification settings (parent only)
   */
  fastify.put(
    '/learner-settings/:learnerId',
    async (
      request: FastifyRequest<{ Params: { learnerId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;
      const body = LearnerSettingsSchema.parse(request.body);

      // Check if settings exist
      const existing = await prisma.learnerNotificationSettings.findUnique({
        where: { learnerId },
      });

      if (existing && existing.parentId !== ctx.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to update these settings',
        });
      }

      // Build create and update objects with explicit property assignment
      const createData = {
        tenantId: ctx.tenantId,
        learnerId,
        parentId: ctx.userId,
        remindersEnabled: body.remindersEnabled ?? true,
        achievementsEnabled: body.achievementsEnabled ?? true,
        streakRemindersEnabled: body.streakRemindersEnabled ?? true,
        encouragementEnabled: body.encouragementEnabled ?? true,
        soundsEnabled: body.soundsEnabled ?? true,
        vibrationEnabled: body.vibrationEnabled ?? true,
        quietHoursEnabled: body.quietHoursEnabled ?? true,
        quietHoursStart: body.quietHoursStart ?? '20:00',
        quietHoursEnd: body.quietHoursEnd ?? '08:00',
      };

      const updateData: Record<string, boolean | string> = {};
      if (body.remindersEnabled !== undefined) updateData.remindersEnabled = body.remindersEnabled;
      if (body.achievementsEnabled !== undefined)
        updateData.achievementsEnabled = body.achievementsEnabled;
      if (body.streakRemindersEnabled !== undefined)
        updateData.streakRemindersEnabled = body.streakRemindersEnabled;
      if (body.encouragementEnabled !== undefined)
        updateData.encouragementEnabled = body.encouragementEnabled;
      if (body.soundsEnabled !== undefined) updateData.soundsEnabled = body.soundsEnabled;
      if (body.vibrationEnabled !== undefined) updateData.vibrationEnabled = body.vibrationEnabled;
      if (body.quietHoursEnabled !== undefined)
        updateData.quietHoursEnabled = body.quietHoursEnabled;
      if (body.quietHoursStart !== undefined) updateData.quietHoursStart = body.quietHoursStart;
      if (body.quietHoursEnd !== undefined) updateData.quietHoursEnd = body.quietHoursEnd;

      // Upsert settings
      const settings = await prisma.learnerNotificationSettings.upsert({
        where: { learnerId },
        create: createData,
        update: updateData,
      });

      fastify.log.info(
        { learnerId, parentId: ctx.userId },
        'Learner notification settings updated'
      );

      return reply.send({
        data: {
          learnerId: settings.learnerId,
          remindersEnabled: settings.remindersEnabled,
          achievementsEnabled: settings.achievementsEnabled,
          streakRemindersEnabled: settings.streakRemindersEnabled,
          encouragementEnabled: settings.encouragementEnabled,
          soundsEnabled: settings.soundsEnabled,
          vibrationEnabled: settings.vibrationEnabled,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          updatedAt: settings.updatedAt,
        },
      });
    }
  );

  /**
   * POST /learner-settings/:learnerId/initialize
   * Initialize default settings for a learner (parent only)
   */
  fastify.post(
    '/learner-settings/:learnerId/initialize',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;

      // Check if already exists
      const existing = await prisma.learnerNotificationSettings.findUnique({
        where: { learnerId },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Settings already exist for this learner',
        });
      }

      // Create with COPPA-recommended defaults
      const settings = await prisma.learnerNotificationSettings.create({
        data: {
          tenantId: ctx.tenantId,
          learnerId,
          parentId: ctx.userId,
          // Default to educational notifications only
          remindersEnabled: true,
          achievementsEnabled: true,
          streakRemindersEnabled: true,
          encouragementEnabled: true,
          soundsEnabled: true,
          vibrationEnabled: true,
          // Quiet hours during typical bedtime
          quietHoursEnabled: true,
          quietHoursStart: '20:00',
          quietHoursEnd: '08:00',
        },
      });

      fastify.log.info(
        { learnerId, parentId: ctx.userId },
        'Learner notification settings initialized'
      );

      return reply.status(201).send({
        data: {
          learnerId: settings.learnerId,
          remindersEnabled: settings.remindersEnabled,
          achievementsEnabled: settings.achievementsEnabled,
          streakRemindersEnabled: settings.streakRemindersEnabled,
          encouragementEnabled: settings.encouragementEnabled,
          soundsEnabled: settings.soundsEnabled,
          vibrationEnabled: settings.vibrationEnabled,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          createdAt: settings.createdAt,
        },
      });
    }
  );
}
