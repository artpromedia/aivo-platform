/**
 * Translation Routes
 *
 * REST API for managing Learning Object translations.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, getUserTenantId, requireRoles } from '../auth.js';
import { prisma } from '../prisma.js';
import { AUTHOR_ROLES, canAccessTenant } from '../rbac.js';
import {
  listTranslations,
  getTranslation,
  upsertTranslation,
  updateTranslationStatus,
  deleteTranslation,
  getTranslationCoverage,
  isValidLocale,
  SUPPORTED_LOCALES,
  type AccessibilityMetadata,
  type LocaleMetadata,
} from '../translations.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const VersionParamsSchema = z.object({
  loId: z.string().uuid(),
  versionNumber: z.coerce.number().int().min(1),
});

const TranslationParamsSchema = z.object({
  loId: z.string().uuid(),
  versionNumber: z.coerce.number().int().min(1),
  locale: z.string().min(2).max(10),
});

const AccessibilityJsonSchema = z
  .object({
    altTexts: z.record(z.string()).optional(),
    transcripts: z.record(z.string()).optional(),
    audioDescriptions: z.record(z.string()).optional(),
    readingLevel: z.string().optional(),
    flesch_kincaid_grade: z.number().optional(),
    estimatedCognitiveLoad: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    supportsDyslexiaFriendlyFont: z.boolean().optional(),
    supportsReducedStimuli: z.boolean().optional(),
    hasScreenReaderOptimizedStructure: z.boolean().optional(),
    hasHighContrastMode: z.boolean().optional(),
    supportsTextToSpeech: z.boolean().optional(),
    teacherNotes: z.string().optional(),
    simplifiedInstructions: z.string().optional(),
    keyVocabulary: z.array(z.string()).optional(),
  })
  .optional();

const MetadataJsonSchema = z
  .object({
    readingLevel: z.string().optional(),
    culturalNotes: z.string().optional(),
    localStandards: z.array(z.string()).optional(),
    translationNotes: z.string().optional(),
    lastSyncedWithSource: z.string().optional(),
  })
  .optional();

const UpsertTranslationSchema = z.object({
  contentJson: z.record(z.unknown()),
  accessibilityJson: AccessibilityJsonSchema,
  metadataJson: MetadataJsonSchema,
  status: z.enum(['DRAFT', 'READY', 'NEEDS_UPDATE']).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'READY', 'NEEDS_UPDATE']),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function getVersionWithLO(loId: string, versionNumber: number) {
  return prisma.learningObjectVersion.findFirst({
    where: { learningObjectId: loId, versionNumber },
    include: {
      learningObject: { select: { tenantId: true, title: true } },
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function translationRoutes(fastify: FastifyInstance) {
  /**
   * GET /learning-objects/:loId/versions/:versionNumber/translations
   * List all translations for a version.
   */
  fastify.get(
    '/learning-objects/:loId/versions/:versionNumber/translations',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const translations = await listTranslations(version.id);
      const coverage = await getTranslationCoverage(version.id);

      return reply.send({
        versionId: version.id,
        learningObjectId: loId,
        versionNumber,
        title: version.learningObject.title,
        supportedLocales: SUPPORTED_LOCALES,
        translations,
        coverage,
      });
    }
  );

  /**
   * GET /learning-objects/:loId/versions/:versionNumber/translations/:locale
   * Get a specific translation.
   */
  fastify.get(
    '/learning-objects/:loId/versions/:versionNumber/translations/:locale',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TranslationParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber, locale } = paramsResult.data;

      if (!isValidLocale(locale)) {
        return reply.status(400).send({
          error: 'Invalid locale',
          message: 'Locale must be in format: "en" or "en-US"',
        });
      }

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const translation = await getTranslation(version.id, locale);

      if (!translation) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Translation for locale "${locale}" not found`,
        });
      }

      return reply.send({
        versionId: version.id,
        learningObjectId: loId,
        versionNumber,
        translation,
      });
    }
  );

  /**
   * PUT /learning-objects/:loId/versions/:versionNumber/translations/:locale
   * Upsert a translation (create or update).
   */
  fastify.put(
    '/learning-objects/:loId/versions/:versionNumber/translations/:locale',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TranslationParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = UpsertTranslationSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId, versionNumber, locale } = paramsResult.data;
      const { contentJson, accessibilityJson, metadataJson, status } = bodyResult.data;

      if (!isValidLocale(locale)) {
        return reply.status(400).send({
          error: 'Invalid locale',
          message: 'Locale must be in format: "en" or "en-US"',
        });
      }

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const translation = await upsertTranslation({
        learningObjectVersionId: version.id,
        locale,
        contentJson,
        accessibilityJson: accessibilityJson as AccessibilityMetadata | undefined,
        metadataJson: metadataJson as LocaleMetadata | undefined,
        translatedByUserId: user.sub,
        status,
      });

      return reply.send({
        versionId: version.id,
        learningObjectId: loId,
        versionNumber,
        translation,
      });
    }
  );

  /**
   * PATCH /learning-objects/:loId/versions/:versionNumber/translations/:locale/status
   * Update translation status.
   */
  fastify.patch(
    '/learning-objects/:loId/versions/:versionNumber/translations/:locale/status',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TranslationParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = UpdateStatusSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId, versionNumber, locale } = paramsResult.data;
      const { status } = bodyResult.data;

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const translation = await updateTranslationStatus(
        version.id,
        locale,
        status,
        status === 'READY' ? user.sub : undefined
      );

      if (!translation) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Translation for locale "${locale}" not found`,
        });
      }

      return reply.send({
        versionId: version.id,
        learningObjectId: loId,
        versionNumber,
        translation,
      });
    }
  );

  /**
   * DELETE /learning-objects/:loId/versions/:versionNumber/translations/:locale
   * Delete a translation.
   */
  fastify.delete(
    '/learning-objects/:loId/versions/:versionNumber/translations/:locale',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TranslationParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber, locale } = paramsResult.data;

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const deleted = await deleteTranslation(version.id, locale);

      if (!deleted) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Translation for locale "${locale}" not found`,
        });
      }

      return reply.status(204).send();
    }
  );
}
