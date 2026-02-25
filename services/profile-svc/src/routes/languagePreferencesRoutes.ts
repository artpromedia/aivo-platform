/**
 * Language Preferences Routes
 *
 * API endpoints for user language/locale preference management.
 *
 * Endpoints:
 *   GET  /api/v1/preferences/language    — Get current language preference
 *   PATCH /api/v1/preferences/language   — Update language preference
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Supported UI locale codes — must match packages/i18n/src/config.ts UI_LOCALES
 */
const SUPPORTED_LOCALES = [
  'en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi',
] as const;

type UILocale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is UILocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

// ── Schemas ──────────────────────────────────────────────────
const UpdateLanguageSchema = {
  body: {
    type: 'object',
    required: ['locale'],
    properties: {
      locale: {
        type: 'string',
        enum: SUPPORTED_LOCALES as unknown as string[],
        description: 'BCP 47 locale code',
      },
      timezone: {
        type: 'string',
        description: 'IANA timezone identifier (e.g. America/New_York)',
      },
    },
    additionalProperties: false,
  },
} as const;

const LanguageResponseSchema = {
  type: 'object',
  properties: {
    locale: { type: 'string' },
    timezone: { type: ['string', 'null'] },
    updatedAt: { type: 'string' },
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────

function extractUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'] as string | undefined;
  if (!userId) {
    throw new Error('Missing x-user-id header');
  }
  return userId;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerLanguagePreferencesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/preferences/language
   *
   * Returns the authenticated user's language preference.
   * Falls back to 'en' if not set.
   */
  app.get(
    '/api/v1/preferences/language',
    {
      schema: {
        response: {
          200: LanguageResponseSchema,
        },
        tags: ['preferences'],
        summary: 'Get language preference',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = extractUserId(request);

      // Try to find existing preference
      const pref = await prisma.userPreference.findUnique({
        where: { userId },
        select: { locale: true, timezone: true, updatedAt: true },
      });

      if (!pref) {
        return reply.send({
          locale: 'en',
          timezone: null,
          updatedAt: new Date().toISOString(),
        });
      }

      return reply.send({
        locale: pref.locale ?? 'en',
        timezone: pref.timezone ?? null,
        updatedAt: pref.updatedAt?.toISOString() ?? new Date().toISOString(),
      });
    },
  );

  /**
   * PATCH /api/v1/preferences/language
   *
   * Updates the authenticated user's language preference.
   * Creates the record if it doesn't exist (upsert).
   */
  app.patch(
    '/api/v1/preferences/language',
    {
      schema: {
        body: UpdateLanguageSchema.body,
        response: {
          200: LanguageResponseSchema,
        },
        tags: ['preferences'],
        summary: 'Update language preference',
      },
    },
    async (
      request: FastifyRequest<{ Body: { locale: string; timezone?: string } }>,
      reply: FastifyReply,
    ) => {
      const userId = extractUserId(request);
      const { locale, timezone } = request.body;

      if (!isValidLocale(locale)) {
        return reply.status(400).send({
          error: 'Invalid locale',
          message: `Locale must be one of: ${SUPPORTED_LOCALES.join(', ')}`,
        });
      }

      const pref = await prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          locale,
          timezone: timezone ?? null,
        },
        update: {
          locale,
          ...(timezone !== undefined ? { timezone } : {}),
          updatedAt: new Date(),
        },
        select: { locale: true, timezone: true, updatedAt: true },
      });

      request.log.info({ userId, locale, timezone }, 'Language preference updated');

      return reply.send({
        locale: pref.locale,
        timezone: pref.timezone,
        updatedAt: pref.updatedAt.toISOString(),
      });
    },
  );
}
