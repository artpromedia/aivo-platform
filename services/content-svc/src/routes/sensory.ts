/**
 * Sensory Content Routes - ND-2.1
 *
 * REST API endpoints for sensory profile matching and content filtering.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as sensoryMetadataService from '../sensory/sensory-metadata.service.js';
import * as sensoryIncidentService from '../sensory/sensory-incident.service.js';
import {
  calculateSensoryMatch,
  batchCalculateSensoryMatch,
  filterSuitableContent,
  rankContentBySensoryMatch,
} from '../sensory/sensory-matcher.service.js';
import {
  buildSensoryContentFilter,
  sensoryFilterToPrisma,
  getPhotosensitiveFilter,
  getAudioSensitiveFilter,
  getMotionSensitiveFilter,
  getCalmContentFilter,
} from '../sensory/content-filters.js';
import { prisma } from '../prisma.js';
import type { SensoryProfile, ContentSensoryMetadata } from '@aivo/ts-shared';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const VisualComplexityEnum = z.enum(['simple', 'moderate', 'complex']);
const AnimationIntensityEnum = z.enum(['none', 'mild', 'moderate', 'intense']);
const CognitiveLoadEnum = z.enum(['low', 'medium', 'high']);
const SeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const TriggerCategoryEnum = z.enum(['audio', 'visual', 'motion', 'tactile', 'cognitive']);
const IncidentStatusEnum = z.enum([
  'reported',
  'acknowledged',
  'investigating',
  'resolved',
  'dismissed',
]);

// Sensory metadata schemas
const CreateSensoryMetadataSchema = z.object({
  learningObjectVersionId: z.string().uuid(),
  hasAudio: z.boolean().optional(),
  hasSuddenSounds: z.boolean().optional(),
  hasBackgroundMusic: z.boolean().optional(),
  audioLevel: z.number().min(1).max(10).optional(),
  peakVolume: z.number().min(0).max(100).optional(),
  canMuteAudio: z.boolean().optional(),
  hasFlashing: z.boolean().optional(),
  flashFrequency: z.number().optional(),
  visualComplexity: VisualComplexityEnum.optional(),
  hasVibrantColors: z.boolean().optional(),
  contrastLevel: z.number().min(1).max(10).optional(),
  hasAnimation: z.boolean().optional(),
  animationIntensity: AnimationIntensityEnum.optional(),
  animationReducible: z.boolean().optional(),
  hasQuickMotion: z.boolean().optional(),
  requiresFineTouchInput: z.boolean().optional(),
  hasHapticFeedback: z.boolean().optional(),
  canDisableHaptic: z.boolean().optional(),
  cognitiveLoad: CognitiveLoadEnum.optional(),
  hasTimeLimits: z.boolean().optional(),
  timeLimitsAdjustable: z.boolean().optional(),
  requiresQuickReactions: z.boolean().optional(),
  hasScrolling: z.boolean().optional(),
  hasParallax: z.boolean().optional(),
  overallIntensityScore: z.number().min(1).max(10).optional(),
});

const UpdateSensoryMetadataSchema = CreateSensoryMetadataSchema.partial().extend({
  manuallyReviewed: z.boolean().optional(),
  reviewedByUserId: z.string().uuid().optional(),
});

// Sensory profile schema (for matching)
const SensoryProfileSchema = z.object({
  learnerId: z.string().uuid(),
  audioSensitivity: z.number().min(1).max(10).optional(),
  visualSensitivity: z.number().min(1).max(10).optional(),
  motionSensitivity: z.number().min(1).max(10).optional(),
  tactileSensitivity: z.number().min(1).max(10).optional(),
  prefersNoSuddenSounds: z.boolean().optional(),
  maxVolume: z.number().min(0).max(100).optional(),
  prefersQuietEnvironment: z.boolean().optional(),
  avoidsFlashing: z.boolean().optional(),
  prefersSimpleVisuals: z.boolean().optional(),
  preferredBrightness: z.number().min(0).max(100).optional(),
  preferredContrast: z.enum(['low', 'normal', 'high']).optional(),
  prefersReducedMotion: z.boolean().optional(),
  preferredAnimationSpeed: z.enum(['slow', 'normal', 'fast']).optional(),
  avoidsParallax: z.boolean().optional(),
  prefersNoHaptic: z.boolean().optional(),
  processingSpeed: z.enum(['slow', 'normal', 'fast']).optional(),
  needsExtendedTime: z.boolean().optional(),
  timeExtensionFactor: z.number().min(1).max(3).optional(),
  isPhotosensitive: z.boolean().optional(),
  needsFrequentBreaks: z.boolean().optional(),
  preferredBreakFrequency: z.enum(['low', 'normal', 'high', 'very_high']).optional(),
  preferredTextSize: z.enum(['small', 'normal', 'large', 'very_large']).optional(),
  prefersDyslexiaFont: z.boolean().optional(),
});

// Incident schemas
const CreateIncidentSchema = z.object({
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  contentId: z.string().uuid().optional(),
  contentType: z.string().optional(),
  contentTitle: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  incidentType: z.string(),
  severity: SeverityEnum.optional(),
  triggerCategory: TriggerCategoryEnum,
  triggerDescription: z.string().optional(),
  triggerTimestamp: z.string().datetime().optional(),
  reportedByUserId: z.string().uuid().optional(),
  reportedByRole: z.enum(['learner', 'parent', 'teacher']).optional(),
  userDescription: z.string().optional(),
});

const ResolveIncidentSchema = z.object({
  resolvedByUserId: z.string().uuid(),
  resolutionNotes: z.string().optional(),
  actionsTaken: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        performedAt: z.string().datetime(),
        performedByUserId: z.string().uuid().optional(),
      })
    )
    .optional(),
  profileUpdated: z.boolean().optional(),
  contentFlagged: z.boolean().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function sensoryRoutes(fastify: FastifyInstance): Promise<void> {
  // ────────────────────────────────────────────────────────────────────────────
  // METADATA ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Create sensory metadata for a content version
   */
  fastify.post(
    '/sensory-metadata',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateSensoryMetadataSchema.parse(request.body);
      const metadata = await sensoryMetadataService.createSensoryMetadata(body);
      return reply.status(201).send(metadata);
    }
  );

  /**
   * Get sensory metadata by ID
   */
  fastify.get(
    '/sensory-metadata/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const metadata = await sensoryMetadataService.getSensoryMetadataById(
        request.params.id
      );
      if (!metadata) {
        return reply.status(404).send({ error: 'Sensory metadata not found' });
      }
      return metadata;
    }
  );

  /**
   * Get sensory metadata by content version ID
   */
  fastify.get(
    '/sensory-metadata/version/:versionId',
    async (
      request: FastifyRequest<{ Params: { versionId: string } }>,
      reply: FastifyReply
    ) => {
      const metadata = await sensoryMetadataService.getSensoryMetadataByVersionId(
        request.params.versionId
      );
      if (!metadata) {
        return reply.status(404).send({ error: 'Sensory metadata not found for this version' });
      }
      return metadata;
    }
  );

  /**
   * Update sensory metadata
   */
  fastify.patch(
    '/sensory-metadata/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const body = UpdateSensoryMetadataSchema.parse(request.body);
      const metadata = await sensoryMetadataService.updateSensoryMetadata(
        request.params.id,
        body
      );
      return metadata;
    }
  );

  /**
   * Mark metadata as reviewed
   */
  fastify.post(
    '/sensory-metadata/:id/review',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { reviewedByUserId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { reviewedByUserId } = request.body as { reviewedByUserId: string };
      const metadata = await sensoryMetadataService.markAsReviewed(
        request.params.id,
        reviewedByUserId
      );
      return metadata;
    }
  );

  /**
   * List sensory metadata
   */
  fastify.get(
    '/sensory-metadata',
    async (
      request: FastifyRequest<{
        Querystring: {
          suitableForPhotosensitive?: string;
          suitableForAudioSensitive?: string;
          suitableForMotionSensitive?: string;
          maxIntensityScore?: string;
          analyzedBySystem?: string;
          manuallyReviewed?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const query = request.query;
      const result = await sensoryMetadataService.listSensoryMetadata({
        suitableForPhotosensitive: query.suitableForPhotosensitive === 'true' ? true : query.suitableForPhotosensitive === 'false' ? false : undefined,
        suitableForAudioSensitive: query.suitableForAudioSensitive === 'true' ? true : query.suitableForAudioSensitive === 'false' ? false : undefined,
        suitableForMotionSensitive: query.suitableForMotionSensitive === 'true' ? true : query.suitableForMotionSensitive === 'false' ? false : undefined,
        maxIntensityScore: query.maxIntensityScore ? parseInt(query.maxIntensityScore) : undefined,
        analyzedBySystem: query.analyzedBySystem === 'true' ? true : query.analyzedBySystem === 'false' ? false : undefined,
        manuallyReviewed: query.manuallyReviewed === 'true' ? true : query.manuallyReviewed === 'false' ? false : undefined,
        page: query.page ? parseInt(query.page) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
      });
      return result;
    }
  );

  /**
   * Get analysis coverage stats
   */
  fastify.get('/sensory-metadata/stats/coverage', async () => {
    return sensoryMetadataService.getSensoryAnalysisCoverage();
  });

  /**
   * Delete sensory metadata
   */
  fastify.delete(
    '/sensory-metadata/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      await sensoryMetadataService.deleteSensoryMetadata(request.params.id);
      return reply.status(204).send();
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // MATCHING ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Calculate sensory match for a single content item
   */
  fastify.post(
    '/sensory-match',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          profile: SensoryProfileSchema,
          contentVersionId: z.string().uuid(),
          options: z
            .object({
              includeExplanations: z.boolean().optional(),
              generateAdaptations: z.boolean().optional(),
              minimumScore: z.number().optional(),
            })
            .optional(),
        })
        .parse(request.body);

      // Get content metadata
      const metadata = await sensoryMetadataService.getSensoryMetadataByVersionId(
        body.contentVersionId
      );
      if (!metadata) {
        return reply.status(404).send({ error: 'Sensory metadata not found for content' });
      }

      // Convert Prisma model to ContentSensoryMetadata
      const contentMetadata = prismaToContentMetadata(metadata);
      const matchResult = calculateSensoryMatch(body.profile as SensoryProfile, contentMetadata, body.options);

      return {
        contentVersionId: body.contentVersionId,
        matchResult,
      };
    }
  );

  /**
   * Batch calculate sensory match for multiple content items
   */
  fastify.post(
    '/sensory-match/batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          profile: SensoryProfileSchema,
          contentVersionIds: z.array(z.string().uuid()),
          options: z
            .object({
              includeExplanations: z.boolean().optional(),
              generateAdaptations: z.boolean().optional(),
              minimumScore: z.number().optional(),
            })
            .optional(),
        })
        .parse(request.body);

      // Get all metadata
      const metadataList = await prisma.contentSensoryMetadata.findMany({
        where: {
          learningObjectVersionId: { in: body.contentVersionIds },
        },
      });

      const contentItems = metadataList.map((m) => ({
        id: m.learningObjectVersionId,
        metadata: prismaToContentMetadata(m),
      }));

      const results = batchCalculateSensoryMatch(body.profile as SensoryProfile, contentItems, body.options);

      return { results };
    }
  );

  /**
   * Filter content based on sensory profile
   */
  fastify.post(
    '/sensory-filter',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          profile: SensoryProfileSchema,
          options: z
            .object({
              strictness: z.enum(['relaxed', 'normal', 'strict']).optional(),
              includeUnanalyzed: z.boolean().optional(),
              maxIntensityScore: z.number().optional(),
            })
            .optional(),
        })
        .parse(request.body);

      const filterResult = buildSensoryContentFilter(body.profile as SensoryProfile, body.options);

      return {
        prismaFilter: filterResult.where,
        appliedFilters: filterResult.appliedFilters,
        postFilters: filterResult.postFilters,
      };
    }
  );

  /**
   * Get preset filters
   */
  fastify.get('/sensory-filter/presets', async () => {
    return {
      photosensitive: getPhotosensitiveFilter(),
      audioSensitive: getAudioSensitiveFilter(),
      motionSensitive: getMotionSensitiveFilter(),
      calm: getCalmContentFilter(),
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // INCIDENT ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Report a sensory incident
   */
  fastify.post(
    '/sensory-incidents',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateIncidentSchema.parse(request.body);
      const incident = await sensoryIncidentService.createSensoryIncident({
        ...body,
        triggerTimestamp: body.triggerTimestamp ? new Date(body.triggerTimestamp) : undefined,
      });
      return reply.status(201).send(incident);
    }
  );

  /**
   * Get incident by ID
   */
  fastify.get(
    '/sensory-incidents/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const incident = await sensoryIncidentService.getIncidentById(request.params.id);
      if (!incident) {
        return reply.status(404).send({ error: 'Incident not found' });
      }
      return incident;
    }
  );

  /**
   * List incidents
   */
  fastify.get(
    '/sensory-incidents',
    async (
      request: FastifyRequest<{
        Querystring: {
          learnerId?: string;
          tenantId?: string;
          contentId?: string;
          incidentType?: string;
          severity?: string;
          status?: string;
          triggerCategory?: string;
          systemDetected?: string;
          startDate?: string;
          endDate?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const query = request.query;
      const result = await sensoryIncidentService.listIncidents({
        learnerId: query.learnerId,
        tenantId: query.tenantId,
        contentId: query.contentId,
        incidentType: query.incidentType,
        severity: query.severity as any,
        status: query.status as any,
        triggerCategory: query.triggerCategory,
        systemDetected: query.systemDetected === 'true' ? true : query.systemDetected === 'false' ? false : undefined,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        page: query.page ? parseInt(query.page) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
      });
      return result;
    }
  );

  /**
   * Acknowledge an incident
   */
  fastify.post(
    '/sensory-incidents/:id/acknowledge',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const incident = await sensoryIncidentService.acknowledgeIncident(request.params.id);
      return incident;
    }
  );

  /**
   * Resolve an incident
   */
  fastify.post(
    '/sensory-incidents/:id/resolve',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const body = ResolveIncidentSchema.parse(request.body);
      const incident = await sensoryIncidentService.resolveIncident(request.params.id, {
        ...body,
        actionsTaken: body.actionsTaken?.map((a) => ({
          ...a,
          performedAt: new Date(a.performedAt),
        })),
      });
      return incident;
    }
  );

  /**
   * Dismiss an incident
   */
  fastify.post(
    '/sensory-incidents/:id/dismiss',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { resolvedByUserId: string; notes?: string };
      }>,
      reply: FastifyReply
    ) => {
      const body = request.body as { resolvedByUserId: string; notes?: string };
      const incident = await sensoryIncidentService.dismissIncident(
        request.params.id,
        body.resolvedByUserId,
        body.notes
      );
      return incident;
    }
  );

  /**
   * Get incident stats for a tenant
   */
  fastify.get(
    '/sensory-incidents/stats/:tenantId',
    async (
      request: FastifyRequest<{ Params: { tenantId: string } }>,
      reply: FastifyReply
    ) => {
      const stats = await sensoryIncidentService.getIncidentStats(request.params.tenantId);
      return stats;
    }
  );

  /**
   * Get learner incident stats
   */
  fastify.get(
    '/sensory-incidents/learner/:learnerId/stats',
    async (
      request: FastifyRequest<{ Params: { learnerId: string } }>,
      reply: FastifyReply
    ) => {
      const stats = await sensoryIncidentService.getLearnerIncidentStats(request.params.learnerId);
      return stats;
    }
  );

  /**
   * Check if content is flagged
   */
  fastify.get(
    '/sensory-incidents/content/:contentId/flagged',
    async (
      request: FastifyRequest<{ Params: { contentId: string } }>,
      reply: FastifyReply
    ) => {
      const isFlagged = await sensoryIncidentService.isContentFlagged(request.params.contentId);
      return { contentId: request.params.contentId, isFlagged };
    }
  );

  /**
   * Get content with high incident rate
   */
  fastify.get(
    '/sensory-incidents/tenant/:tenantId/high-incident-content',
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Querystring: { threshold?: string };
      }>,
      reply: FastifyReply
    ) => {
      const threshold = request.query.threshold ? parseInt(request.query.threshold) : undefined;
      const content = await sensoryIncidentService.getContentWithHighIncidentRate(
        request.params.tenantId,
        threshold
      );
      return { content };
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert Prisma ContentSensoryMetadata to shared type.
 */
function prismaToContentMetadata(prismaMetadata: any): ContentSensoryMetadata {
  return {
    contentId: prismaMetadata.learningObjectVersionId,
    hasAudio: prismaMetadata.hasAudio,
    hasSuddenSounds: prismaMetadata.hasSuddenSounds,
    hasBackgroundMusic: prismaMetadata.hasBackgroundMusic,
    audioLevel: prismaMetadata.audioLevel,
    peakVolume: prismaMetadata.peakVolume ?? undefined,
    canMuteAudio: prismaMetadata.canMuteAudio,
    hasFlashing: prismaMetadata.hasFlashing,
    flashFrequency: prismaMetadata.flashFrequency ?? undefined,
    visualComplexity: prismaMetadata.visualComplexity.toLowerCase(),
    hasVibrantColors: prismaMetadata.hasVibrantColors,
    contrastLevel: prismaMetadata.contrastLevel,
    hasAnimation: prismaMetadata.hasAnimation,
    animationIntensity: prismaMetadata.animationIntensity.toLowerCase(),
    animationReducible: prismaMetadata.animationReducible,
    hasQuickMotion: prismaMetadata.hasQuickMotion,
    requiresFineTouchInput: prismaMetadata.requiresFineTouchInput,
    hasHapticFeedback: prismaMetadata.hasHapticFeedback,
    canDisableHaptic: prismaMetadata.canDisableHaptic,
    cognitiveLoad: prismaMetadata.cognitiveLoad.toLowerCase(),
    hasTimeLimits: prismaMetadata.hasTimeLimits,
    timeLimitsAdjustable: prismaMetadata.timeLimitsAdjustable,
    requiresQuickReactions: prismaMetadata.requiresQuickReactions,
    hasScrolling: prismaMetadata.hasScrolling,
    hasParallax: prismaMetadata.hasParallax,
    overallIntensityScore: prismaMetadata.overallIntensityScore,
    suitableForPhotosensitive: prismaMetadata.suitableForPhotosensitive,
    suitableForAudioSensitive: prismaMetadata.suitableForAudioSensitive,
    suitableForMotionSensitive: prismaMetadata.suitableForMotionSensitive,
  };
}

export default sensoryRoutes;
