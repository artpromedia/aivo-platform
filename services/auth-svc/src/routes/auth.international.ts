/**
 * Enhanced Auth Routes with Internationalization Support
 *
 * These routes extend the base auth functionality with:
 * - User locale preferences during registration
 * - Automatic geolocation detection integration
 * - Locale/currency/curriculum preferences in JWT
 */

import { Role } from '@aivo/ts-rbac';
import bcrypt from 'bcryptjs';
import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { signAccessToken, signRefreshToken } from '../lib/jwt.js';
import { registerRateLimiter } from '../lib/rate-limit.js';
import { prisma } from '../prisma.js';

// Extended registration schema with locale preferences
const registerWithPreferencesBody = z.object({
  // Core user data
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['learner', 'parent', 'teacher', 'admin']).default('learner'),

  // Locale preferences
  preferences: z
    .object({
      language: z.string().min(2).max(10).default('en'),
      country: z.string().length(2).optional(),
      timezone: z.string().optional(),
      currency: z.string().length(3).default('USD'),
      curriculumFramework: z.string().optional(),
      dateFormat: z
        .enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'])
        .default('MM/DD/YYYY'),
      timeFormat: z.enum(['12h', '24h']).default('12h'),

      // Detection metadata
      detectedCountry: z.string().length(2).optional(),
      detectedLanguage: z.string().optional(),
      detectedTimezone: z.string().optional(),
      detectionMethod: z.enum(['ip', 'browser', 'manual']).optional(),
      detectionConfidence: z.number().min(0).max(1).optional(),
    })
    .optional(),

  // Marketing consent
  acceptMarketing: z.boolean().default(false),
});

const updatePreferencesBody = z.object({
  language: z.string().min(2).max(10).optional(),
  country: z.string().length(2).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  curriculumFramework: z.string().optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  firstDayOfWeek: z.number().min(0).max(6).optional(),
  numberFormat: z.string().optional(),
});

// Map frontend role to RBAC role
function mapRole(role: string): Role {
  switch (role) {
    case 'learner':
      return Role.LEARNER;
    case 'parent':
      return Role.PARENT;
    case 'teacher':
      return Role.TEACHER;
    case 'admin':
      return Role.PLATFORM_ADMIN;
    default:
      return Role.PARENT;
  }
}

function userResponse(
  user: {
    id: string;
    email: string;
    tenantId: string;
    firstName?: string | null;
    lastName?: string | null;
  },
  roles: Role[],
  preferences?: {
    language: string;
    country: string | null;
    currency: string;
    timezone: string | null;
    curriculumFramework: string | null;
    dateFormat: string | null;
    timeFormat: string | null;
  } | null
) {
  return {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
    preferences: preferences
      ? {
          language: preferences.language,
          country: preferences.country,
          currency: preferences.currency,
          timezone: preferences.timezone,
          curriculumFramework: preferences.curriculumFramework,
          dateFormat: preferences.dateFormat,
          timeFormat: preferences.timeFormat,
        }
      : null,
  };
}

export async function registerInternationalizedAuthRoutes(fastify: FastifyInstance) {
  /**
   * POST /v2/register
   * Enhanced registration with locale preferences
   */
  fastify.post('/v2/register', { preHandler: registerRateLimiter }, async (request, reply) => {
    const parsed = registerWithPreferencesBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, firstName, lastName, phone, role, preferences, acceptMarketing } =
      parsed.data;

    const tenantId = config.consumerTenantId;

    // Check for existing user
    const existing = await prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rbacRole = mapRole(role);

    // Create user with preferences in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone: phone ?? null,
          passwordHash,
          tenantId,
          status: 'ACTIVE',
          acceptedMarketing: acceptMarketing,
          roles: {
            create: [{ role: rbacRole as any }],
          },
        },
        include: { roles: true },
      });

      // Create user preferences if provided
      if (preferences) {
        await tx.userPreferences.create({
          data: {
            userId: newUser.id,
            tenantId,
            language: preferences.language,
            country: preferences.country,
            timezone: preferences.timezone,
            currency: preferences.currency,
            curriculumFramework: preferences.curriculumFramework,
            dateFormat: preferences.dateFormat,
            timeFormat: preferences.timeFormat,

            // Detection metadata
            detectedCountry: preferences.detectedCountry,
            detectedLanguage: preferences.detectedLanguage,
            detectedTimezone: preferences.detectedTimezone,
            detectionMethod: preferences.detectionMethod,
            detectedAt: preferences.detectionMethod ? new Date() : null,

            // Track if user overrode detected values
            languageOverridden: preferences.detectedLanguage
              ? preferences.language !== preferences.detectedLanguage
              : false,
            countryOverridden: preferences.detectedCountry
              ? preferences.country !== preferences.detectedCountry
              : false,
            currencyOverridden: false,
            timezoneOverridden: preferences.detectedTimezone
              ? preferences.timezone !== preferences.detectedTimezone
              : false,
          },
        });
      }

      // Fetch user with preferences
      return tx.user.findUniqueOrThrow({
        where: { id: newUser.id },
        include: {
          roles: true,
          preferences: true,
        },
      });
    });

    const roles = user.roles.map((r) => r.role as Role);

    // Include locale info in JWT for frontend use
    const tokenPayload = {
      sub: user.id,
      tenant_id: user.tenantId,
      roles,
      locale: user.preferences?.language || 'en',
      currency: user.preferences?.currency || 'USD',
      country: user.preferences?.country || null,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    return reply.status(201).send({
      user: userResponse(user, roles, user.preferences),
      accessToken,
      refreshToken,
    });
  });

  /**
   * GET /v2/me/preferences
   * Get current user's locale preferences
   */
  fastify.get('/v2/me/preferences', async (request, reply) => {
    const userId = (request as any).userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      return reply.status(200).send({
        language: 'en',
        country: null,
        timezone: null,
        currency: 'USD',
        curriculumFramework: null,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        firstDayOfWeek: 0,
        numberFormat: 'en-US',
      });
    }

    return reply.status(200).send({
      language: preferences.language,
      country: preferences.country,
      timezone: preferences.timezone,
      currency: preferences.currency,
      curriculumFramework: preferences.curriculumFramework,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      firstDayOfWeek: preferences.firstDayOfWeek,
      numberFormat: preferences.numberFormat,
    });
  });

  /**
   * PUT /v2/me/preferences
   * Update current user's locale preferences
   */
  fastify.put('/v2/me/preferences', async (request, reply) => {
    const userId = (request as any).userId;
    const tenantId = (request as any).tenantId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = updatePreferencesBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
        // Track overrides
        ...(data.language && { languageOverridden: true }),
        ...(data.country && { countryOverridden: true }),
        ...(data.currency && { currencyOverridden: true }),
        ...(data.timezone && { timezoneOverridden: true }),
        ...(data.curriculumFramework && { curriculumOverridden: true }),
      },
      create: {
        userId,
        tenantId,
        language: data.language || 'en',
        country: data.country || null,
        timezone: data.timezone || null,
        currency: data.currency || 'USD',
        curriculumFramework: data.curriculumFramework || null,
        dateFormat: data.dateFormat || 'MM/DD/YYYY',
        timeFormat: data.timeFormat || '12h',
        firstDayOfWeek: data.firstDayOfWeek || 0,
        numberFormat: data.numberFormat || 'en-US',
      },
    });

    return reply.status(200).send({
      language: preferences.language,
      country: preferences.country,
      timezone: preferences.timezone,
      currency: preferences.currency,
      curriculumFramework: preferences.curriculumFramework,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      firstDayOfWeek: preferences.firstDayOfWeek,
      numberFormat: preferences.numberFormat,
    });
  });

  /**
   * GET /v2/supported-locales
   * Get list of supported languages, countries, currencies
   * (public endpoint for registration form)
   */
  fastify.get('/v2/supported-locales', async (_request, reply) => {
    // This could be fetched from geolocation-svc or cached
    return reply.status(200).send({
      languages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
        { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
        { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
      ],
      currencies: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
        { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
        { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
        { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
        { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      ],
      curriculumFrameworks: [
        { code: 'COMMON_CORE', name: 'Common Core (US)', countries: ['US'] },
        {
          code: 'UK_NATIONAL_CURRICULUM',
          name: 'UK National Curriculum',
          countries: ['GB', 'NG', 'KE'],
        },
        { code: 'CBSE', name: 'CBSE (India)', countries: ['IN', 'AE'] },
        { code: 'CAPS', name: 'CAPS (South Africa)', countries: ['ZA'] },
        { code: 'IB_PYP', name: 'IB Primary Years Programme', countries: [] },
        { code: 'IB_MYP', name: 'IB Middle Years Programme', countries: [] },
        { code: 'CAMBRIDGE_IGCSE', name: 'Cambridge IGCSE', countries: [] },
      ],
    });
  });
}
