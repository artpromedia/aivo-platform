/**
 * Sensory Profile Routes
 *
 * API endpoints for managing sensory profiles with visual, auditory,
 * motor, and cognitive accommodations.
 *
 * @author AIVO Platform Team
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type { TenantContext } from '../types/index.js';
import {
  CreateSensoryProfileSchema,
  UpdateSensoryProfileSchema,
  PresetNameSchema,
  type PresetName,
} from '../dto/sensory-profile.dto.js';
import * as sensoryProfileService from '../services/sensoryProfileService.js';
import {
  emitSensoryProfileCreated,
  emitSensoryProfileUpdated,
  emitSensoryProfileReset,
} from '../events/nats.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerParams {
  learnerId: string;
}

function extractTenantContext(request: FastifyRequest): TenantContext {
  const tenantId = request.headers['x-tenant-id'] as string | undefined;
  const userId = request.headers['x-user-id'] as string | undefined;
  const userRole = request.headers['x-user-role'] as string | undefined;

  if (!tenantId || !userId || !userRole) {
    throw new Error('Missing tenant context');
  }

  return {
    tenantId,
    userId,
    userRole: userRole as TenantContext['userRole'],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerSensoryProfileRoutes(app: FastifyInstance): Promise<void> {
  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/learners/:learnerId/sensory-profile
  // Get a learner's sensory profile
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams }>(
    '/api/v1/learners/:learnerId/sensory-profile',
    async (request, reply: FastifyReply) => {
      let context: TenantContext;
      try {
        context = extractTenantContext(request);
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context headers',
        });
      }

      const { learnerId } = request.params;

      try {
        const profile = await sensoryProfileService.getSensoryProfile(context.tenantId, learnerId);

        if (!profile) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Sensory profile not found for this learner',
          });
        }

        return reply.status(200).send({ profile });
      } catch (error) {
        console.error('[sensory-profile-routes] get_sensory_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get sensory profile',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // PUT /api/v1/learners/:learnerId/sensory-profile
  // Create or update a learner's sensory profile
  // ────────────────────────────────────────────────────────────────────────────
  app.put<{ Params: LearnerParams }>(
    '/api/v1/learners/:learnerId/sensory-profile',
    async (request, reply: FastifyReply) => {
      let context: TenantContext;
      try {
        context = extractTenantContext(request);
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context headers',
        });
      }

      const { learnerId } = request.params;

      // Validate request body
      const parseResult = UpdateSensoryProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: parseResult.error.issues,
        });
      }

      try {
        // Check if profile exists
        const existing = await sensoryProfileService.getSensoryProfile(context.tenantId, learnerId);
        let result: sensoryProfileService.SensoryProfileResult;
        let isCreate = false;

        if (existing) {
          // Get changed fields before update
          const changedFields = sensoryProfileService.getChangedFields(existing, parseResult.data);

          // Update existing profile
          result = await sensoryProfileService.updateSensoryProfile(
            context.tenantId,
            learnerId,
            parseResult.data,
            context
          );

          // Emit update event (fire-and-forget)
          void emitSensoryProfileUpdated(
            context.tenantId,
            learnerId,
            result.profile.id,
            context.userId,
            changedFields
          );
        } else {
          // Create new profile
          result = await sensoryProfileService.createSensoryProfile(
            context.tenantId,
            learnerId,
            parseResult.data,
            context
          );
          isCreate = true;

          // Emit create event (fire-and-forget)
          void emitSensoryProfileCreated(
            context.tenantId,
            learnerId,
            result.profile.id,
            context.userId
          );
        }

        console.log('[sensory-profile-routes] sensory_profile_upserted', {
          learnerId,
          profileId: result.profile.id,
          isCreate,
          warnings: result.warnings,
        });

        return reply.status(isCreate ? 201 : 200).send({
          profile: result.profile,
          warnings: result.warnings.length > 0 ? result.warnings : undefined,
        });
      } catch (error) {
        console.error('[sensory-profile-routes] upsert_sensory_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: error.message,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update sensory profile',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/learners/:learnerId/sensory-profile/reset
  // Reset a learner's sensory profile to defaults
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams }>(
    '/api/v1/learners/:learnerId/sensory-profile/reset',
    async (request, reply: FastifyReply) => {
      let context: TenantContext;
      try {
        context = extractTenantContext(request);
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context headers',
        });
      }

      const { learnerId } = request.params;

      try {
        const profile = await sensoryProfileService.resetSensoryProfile(
          context.tenantId,
          learnerId,
          context
        );

        // Emit reset event (fire-and-forget)
        void emitSensoryProfileReset(context.tenantId, learnerId, profile.id, context.userId);

        console.log('[sensory-profile-routes] sensory_profile_reset', {
          learnerId,
          profileId: profile.id,
        });

        return reply.status(200).send({
          profile,
          message: 'Sensory profile reset to defaults',
        });
      } catch (error) {
        console.error('[sensory-profile-routes] reset_sensory_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (error instanceof Error && error.message.includes('not found')) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Sensory profile not found for this learner',
          });
        }

        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: error.message,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to reset sensory profile',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/learners/:learnerId/sensory-profile/apply-preset
  // Apply a preset to a learner's sensory profile
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams; Body: { preset: string } }>(
    '/api/v1/learners/:learnerId/sensory-profile/apply-preset',
    async (request, reply: FastifyReply) => {
      let context: TenantContext;
      try {
        context = extractTenantContext(request);
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context headers',
        });
      }

      const { learnerId } = request.params;
      const body = request.body as { preset?: string };

      // Validate preset name
      const presetParseResult = PresetNameSchema.safeParse(body?.preset);
      if (!presetParseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid preset name',
          validPresets: [
            'dyslexia-friendly',
            'low-vision',
            'motor-impaired',
            'cognitive-support',
            'hearing-impaired',
            'photosensitive',
          ],
        });
      }

      try {
        const result = await sensoryProfileService.applyPreset(
          context.tenantId,
          learnerId,
          presetParseResult.data as PresetName,
          context
        );

        // Emit update event (fire-and-forget)
        void emitSensoryProfileUpdated(
          context.tenantId,
          learnerId,
          result.profile.id,
          context.userId,
          ['preset_applied']
        );

        console.log('[sensory-profile-routes] preset_applied', {
          learnerId,
          profileId: result.profile.id,
          preset: presetParseResult.data,
        });

        return reply.status(200).send({
          profile: result.profile,
          appliedPreset: presetParseResult.data,
          warnings: result.warnings.length > 0 ? result.warnings : undefined,
        });
      } catch (error) {
        console.error('[sensory-profile-routes] apply_preset_failed', {
          learnerId,
          preset: presetParseResult.data,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (error instanceof Error && error.message.includes('Unknown preset')) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }

        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: error.message,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to apply preset',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/sensory-profile/presets
  // Get all available sensory profile presets
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/api/v1/sensory-profile/presets', async (_request, reply: FastifyReply) => {
    try {
      const presets = sensoryProfileService.getPresets();

      return reply.status(200).send({
        presets: presets.map((p) => ({
          name: p.name,
          displayName: p.displayName,
          description: p.description,
          settings: p.settings,
        })),
      });
    } catch (error) {
      console.error('[sensory-profile-routes] get_presets_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get presets',
      });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/sensory-profile/presets/:presetName
  // Get a specific preset by name
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { presetName: string } }>(
    '/api/v1/sensory-profile/presets/:presetName',
    async (request, reply: FastifyReply) => {
      const { presetName } = request.params;

      // Validate preset name
      const presetParseResult = PresetNameSchema.safeParse(presetName);
      if (!presetParseResult.success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Preset '${presetName}' not found`,
          validPresets: [
            'dyslexia-friendly',
            'low-vision',
            'motor-impaired',
            'cognitive-support',
            'hearing-impaired',
            'photosensitive',
          ],
        });
      }

      try {
        const preset = sensoryProfileService.getPreset(presetParseResult.data as PresetName);

        if (!preset) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `Preset '${presetName}' not found`,
          });
        }

        return reply.status(200).send({ preset });
      } catch (error) {
        console.error('[sensory-profile-routes] get_preset_failed', {
          presetName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get preset',
        });
      }
    }
  );
}
