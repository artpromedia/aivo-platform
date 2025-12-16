/**
 * Settings Routes - Tenant and learner gamification preferences
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as settingsService from '../services/settingsService.js';

// Schemas
const tenantIdParamSchema = z.object({
  tenantId: z.string().uuid(),
});

const learnerIdParamSchema = z.object({
  learnerId: z.string().uuid(),
});

const updateTenantSettingsSchema = z.object({
  xpEnabled: z.boolean().optional(),
  streaksEnabled: z.boolean().optional(),
  badgesEnabled: z.boolean().optional(),
  kudosEnabled: z.boolean().optional(),
  celebrationsEnabled: z.boolean().optional(),
  levelsEnabled: z.boolean().optional(),
  maxDailyXp: z.number().int().min(0).max(1000).optional(),
  maxDailyCelebrations: z.number().int().min(0).max(10).optional(),
  streakGracePeriodHours: z.number().int().min(0).max(72).optional(),
  showComparisons: z.boolean().optional(),
  xpMultiplier: z.number().min(0.1).max(5).optional(),
  xpRulesOverride: z.record(z.number().int().min(0).max(100)).optional(),
});

const updateLearnerPreferencesSchema = z.object({
  preferredRewardStyle: z
    .enum(['VISUAL_BADGES', 'PRAISE_MESSAGES', 'POINTS_AND_LEVELS', 'MINIMAL'])
    .optional(),
  muteCelebrations: z.boolean().optional(),
  reducedVisuals: z.boolean().optional(),
  showBadges: z.boolean().optional(),
  showStreaks: z.boolean().optional(),
  showXp: z.boolean().optional(),
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /tenants/:tenantId/gamification-settings
   * Get tenant-level gamification settings
   */
  app.get(
    '/tenants/:tenantId/gamification-settings',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof tenantIdParamSchema> }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = tenantIdParamSchema.parse(request.params);

      // Authorization: must be tenant admin or service
      const user = (request as FastifyRequest & { user?: { tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service' && user.role !== 'platform_admin') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const settings = await settingsService.getTenantSettings(tenantId);
      return reply.status(200).send(settings);
    }
  );

  /**
   * PATCH /tenants/:tenantId/gamification-settings
   * Update tenant-level gamification settings
   */
  app.patch(
    '/tenants/:tenantId/gamification-settings',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof tenantIdParamSchema>;
        Body: z.infer<typeof updateTenantSettingsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = tenantIdParamSchema.parse(request.params);
      const updates = updateTenantSettingsSchema.parse(request.body);

      // Authorization: must be tenant admin
      const user = (request as FastifyRequest & { user?: { tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (
        user.role !== 'tenant_admin' &&
        user.role !== 'platform_admin' &&
        user.role !== 'service'
      ) {
        return reply.status(403).send({ error: 'Forbidden - requires tenant admin' });
      }

      if (user.tenantId !== tenantId && user.role !== 'platform_admin' && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden - wrong tenant' });
      }

      const settings = await settingsService.upsertTenantSettings({ tenantId, ...updates });
      return reply.status(200).send(settings);
    }
  );

  /**
   * GET /learners/:learnerId/engagement-preferences
   * Get learner engagement preferences
   */
  app.get(
    '/learners/:learnerId/engagement-preferences',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const tenantId = request.query.tenantId;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter required' });
      }

      // Authorization: learner, parent, teacher, or admin
      const user = (
        request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }
      ).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const preferences = await settingsService.getLearnerPreferences(tenantId, learnerId);
      return reply.status(200).send(preferences);
    }
  );

  /**
   * PATCH /learners/:learnerId/engagement-preferences
   * Update learner engagement preferences (parent or admin)
   */
  app.patch(
    '/learners/:learnerId/engagement-preferences',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof learnerIdParamSchema>;
        Body: z.infer<typeof updateLearnerPreferencesSchema> & { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const { tenantId, ...updates } = request.body;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId required in body' });
      }

      // Authorization: parent of learner or admin
      const user = (
        request as FastifyRequest & { user?: { sub: string; tenantId: string; role: string } }
      ).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Check tenant
      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden - wrong tenant' });
      }

      // Only parent, teacher, or admin can update learner preferences
      const allowedRoles = ['parent', 'teacher', 'tenant_admin', 'platform_admin', 'service'];
      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden - insufficient role' });
      }

      const validatedUpdates = updateLearnerPreferencesSchema.parse(updates);
      const preferences = await settingsService.upsertLearnerPreferences({
        tenantId,
        learnerId,
        ...validatedUpdates,
      });

      return reply.status(200).send(preferences);
    }
  );

  /**
   * GET /gamification/effective-settings
   * Get effective gamification settings for a learner (merged tenant + learner prefs)
   */
  app.get(
    '/gamification/effective-settings',
    async (
      request: FastifyRequest<{
        Querystring: { tenantId: string; learnerId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, learnerId } = request.query;

      if (!tenantId || !learnerId) {
        return reply.status(400).send({ error: 'tenantId and learnerId required' });
      }

      const user = (request as FastifyRequest & { user?: { tenantId: string; role: string } }).user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.tenantId !== tenantId && user.role !== 'service') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const settings = await settingsService.getEffectiveSettings(tenantId, learnerId);
      return reply.status(200).send(settings);
    }
  );
}
