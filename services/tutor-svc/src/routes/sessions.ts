import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { sessionService, fetchLearnerProfile } from '../services/session.service.js';
import { entitlementService } from '../services/entitlement.service.js';
import { personaService } from '../services/persona.service.js';
import { prisma } from '../prisma.js';
import { resolveLocaleConfig } from '../services/locale.service.js';
import { getVoiceConfig } from '../services/voice-config.service.js';
import { trackSessionStarted, trackSessionEnded } from '../services/analytics.service.js';
import { emitSessionCompleted } from '../services/notification.service.js';
import { config } from '../config.js';

const CreateSessionSchema = z.object({
  learnerId: z.string().uuid(),
  personaSlug: z.string().min(1).max(100),
  subject: z.enum(['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING']),
  topic: z.string().max(255).optional(),
  locale: z.string().max(10).default('en-US'),
});

const ListSessionsSchema = z.object({
  learnerId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED', 'ERROR']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/tutor/sessions
   * Create a new tutor session with entitlement check, learner profile,
   * and AI-generated opening message.
   */
  fastify.post(
    '/',
    async (request: FastifyRequest<{ Body: z.infer<typeof CreateSessionSchema> }>, reply: FastifyReply) => {
      const body = CreateSessionSchema.parse(request.body);
      const user = request.user!;
      const tenantId = user?.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      // 0. Feature flag gates (server-side)
      if (!config.featureFlags.tutorEnabled) {
        return reply.status(503).send({
          error: 'AI tutoring is not yet available',
          code: 'TUTOR_NOT_ENABLED',
        });
      }

      if (!config.featureFlags.tutorSubjects[body.subject]) {
        return reply.status(503).send({
          error: `${body.subject} tutoring is not yet available`,
          code: 'TUTOR_SUBJECT_NOT_ENABLED',
        });
      }

      // 1. Check entitlement (base + subject-specific)
      const entitlement = await entitlementService.checkTutorAccess(tenantId, body.subject);
      if (!entitlement.allowed) {
        return reply.status(403).send({
          error: 'Tutor add-on required',
          reason: entitlement.reason,
        });
      }

      // 2. Look up persona by slug
      const persona = await personaService.getBySlug(body.personaSlug);
      if (!persona) {
        return reply.status(404).send({ error: `Persona not found: ${body.personaSlug}` });
      }

      if (persona.subject !== body.subject) {
        return reply.status(400).send({
          error: `Persona "${body.personaSlug}" is for ${persona.subject}, not ${body.subject}`,
        });
      }

      // 3. Fetch learner profile from learner-model-svc (non-blocking — null is OK)
      const learnerProfile = await fetchLearnerProfile(body.learnerId);

      // 4. Create session with AI-generated opening message
      const { session, openingMessage, emotionTag, avatarState } = await sessionService.create({
        tenantId,
        learnerId: body.learnerId,
        parentUserId: user.userId,
        personaId: persona.id,
        subject: body.subject,
        topic: body.topic,
        locale: body.locale,
        learnerProfile,
      });

      // Resolve locale config for voice availability info
      const localeConfig = resolveLocaleConfig(session.locale);
      const voiceConfig = config.featureFlags.tutorVoiceEnabled
        ? await getVoiceConfig(persona.id, session.locale)
        : null;
      const voiceFallbackUsed = voiceConfig
        ? voiceConfig.locale !== session.locale
        : false;

      // Fire analytics event (non-blocking)
      trackSessionStarted({
        sessionId: session.id,
        learnerId: session.learnerId,
        tenantId,
        subject: session.subject,
        personaSlug: persona.slug,
        locale: session.locale,
        startedAt: session.startedAt.toISOString(),
      }).catch(() => {});

      return reply.status(201).send({
        id: session.id,
        learnerId: session.learnerId,
        personaId: session.personaId,
        status: session.status,
        subject: session.subject,
        topic: session.topic,
        locale: session.locale,
        startedAt: session.startedAt.toISOString(),
        persona: {
          id: session.persona.id,
          slug: session.persona.slug,
          name: session.persona.name,
          subject: session.persona.subject,
          avatarRivAsset: session.persona.avatarRivAsset,
          avatarStaticImage: session.persona.avatarStaticImage,
        },
        localeInfo: {
          languageName: localeConfig.languageName,
          nativeLanguageName: localeConfig.nativeLanguageName,
          isRTL: localeConfig.isRTL,
          voiceAvailable: config.featureFlags.tutorVoiceEnabled && localeConfig.piperVoiceAvailable,
          voiceId: voiceConfig?.ttsVoiceId ?? null,
          voiceFallbackUsed,
          resolvedVoiceLocale: voiceConfig?.locale ?? null,
        },
        openingMessage: {
          content: openingMessage,
          emotionTag,
          avatarState,
        },
      });
    },
  );

  /**
   * GET /api/v1/tutor/sessions
   * List sessions for the current tenant, optionally filtered by learnerId.
   */
  fastify.get(
    '/',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof ListSessionsSchema> }>, reply: FastifyReply) => {
      const query = ListSessionsSchema.parse(request.query);
      const user = request.user!;
      const tenantId = user?.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const { sessions, total } = await sessionService.listByLearner({
        tenantId,
        learnerId: query.learnerId ?? user.userId,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      });

      return {
        sessions: sessions.map((s) => ({
          id: s.id,
          learnerId: s.learnerId,
          personaId: s.personaId,
          status: s.status,
          subject: s.subject,
          topic: s.topic,
          locale: s.locale,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? null,
          persona: {
            id: s.persona.id,
            slug: s.persona.slug,
            name: s.persona.name,
            subject: s.persona.subject,
            avatarRivAsset: s.persona.avatarRivAsset,
            avatarStaticImage: s.persona.avatarStaticImage,
          },
        })),
        total,
      };
    },
  );

  /**
   * GET /api/v1/tutor/sessions/:sessionId
   * Get a specific session with the last 50 messages.
   */
  fastify.get(
    '/:sessionId',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const user = request.user!;
      const tenantId = user?.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const session = await sessionService.getById(sessionId);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      // Verify tenant ownership
      if (session.tenantId !== tenantId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Fetch last 50 messages
      const messages = await prisma.tutorMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      return {
        id: session.id,
        learnerId: session.learnerId,
        personaId: session.personaId,
        status: session.status,
        subject: session.subject,
        topic: session.topic,
        locale: session.locale,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        totalMessages: session.totalMessages,
        totalDurationMs: session.totalDurationMs,
        totalTokensUsed: session.totalTokensUsed,
        persona: {
          id: session.persona.id,
          slug: session.persona.slug,
          name: session.persona.name,
          subject: session.persona.subject,
          avatarRivAsset: session.persona.avatarRivAsset,
          avatarStaticImage: session.persona.avatarStaticImage,
        },
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          emotionTag: m.emotionTag,
          avatarState: m.avatarState,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    },
  );

  /**
   * PATCH /api/v1/tutor/sessions/:sessionId
   * Update session locale mid-session. Re-resolves voice config and
   * inserts a SYSTEM message instructing the AI to switch languages.
   */
  fastify.patch(
    '/:sessionId',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: { locale: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = request.params;
      const body = z.object({ locale: z.string().min(2).max(10) }).parse(request.body);
      const user = request.user!;
      const tenantId = user?.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const existing = await sessionService.getById(sessionId);
      if (!existing) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      if (existing.tenantId !== tenantId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (existing.status !== 'ACTIVE') {
        return reply.status(400).send({ error: 'Can only change locale on an active session' });
      }

      const previousLocale = existing.locale;
      const newLocale = body.locale;

      // Update session locale in DB
      const updatedSession = await prisma.tutorSession.update({
        where: { id: sessionId },
        data: { locale: newLocale },
        include: { persona: true },
      });

      // Resolve new locale and voice config
      const localeConfig = resolveLocaleConfig(newLocale);
      const voiceConfig = await getVoiceConfig(updatedSession.personaId, newLocale);
      const voiceFallbackUsed = voiceConfig
        ? voiceConfig.locale !== newLocale
        : false;

      // Insert a SYSTEM message instructing the AI to switch languages
      await prisma.tutorMessage.create({
        data: {
          sessionId,
          role: 'SYSTEM',
          content: `[LANGUAGE SWITCH] The student has changed their preferred language from ${previousLocale} to ${newLocale} (${localeConfig.languageName}). From now on, respond exclusively in ${localeConfig.languageName}. Use culturally appropriate examples for ${localeConfig.culturalContext} context.`,
        },
      });

      request.log.info(
        { sessionId, previousLocale, newLocale, voiceAvailable: localeConfig.piperVoiceAvailable },
        'Session locale changed',
      );

      return {
        id: updatedSession.id,
        locale: updatedSession.locale,
        localeInfo: {
          languageName: localeConfig.languageName,
          nativeLanguageName: localeConfig.nativeLanguageName,
          isRTL: localeConfig.isRTL,
          voiceAvailable: localeConfig.piperVoiceAvailable,
          voiceId: voiceConfig?.ttsVoiceId ?? null,
          voiceFallbackUsed,
          resolvedVoiceLocale: voiceConfig?.locale ?? null,
        },
      };
    },
  );

  /**
   * POST /api/v1/tutor/sessions/:sessionId/end
   * End a tutor session.
   */
  fastify.post(
    '/:sessionId/end',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const user = request.user!;
      const tenantId = user?.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      const existing = await sessionService.getById(sessionId);
      if (!existing) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      if (existing.tenantId !== tenantId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (existing.status !== 'ACTIVE' && existing.status !== 'PAUSED') {
        return reply.status(400).send({ error: `Cannot end session in ${existing.status} state` });
      }

      const session = await sessionService.end(sessionId);

      // Fire analytics + notification events (non-blocking)
      const durationMs = session.endedAt && session.startedAt
        ? session.endedAt.getTime() - session.startedAt.getTime()
        : session.totalDurationMs ?? 0;

      trackSessionEnded({
        sessionId: session.id,
        learnerId: session.learnerId,
        tenantId,
        subject: session.subject,
        personaSlug: existing.persona?.slug ?? '',
        locale: session.locale,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? new Date().toISOString(),
        durationMs,
        messageCount: session.totalMessages ?? 0,
        status: session.status,
        topic: session.topic ?? undefined,
      }).catch(() => {});

      emitSessionCompleted({
        sessionId: session.id,
        learnerId: session.learnerId,
        tenantId,
        subject: session.subject,
        personaName: existing.persona?.name ?? '',
        durationMinutes: Math.round(durationMs / 60000),
        messageCount: session.totalMessages ?? 0,
        topic: session.topic ?? undefined,
      }).catch(() => {});

      return {
        id: session.id,
        status: session.status,
        endedAt: session.endedAt?.toISOString() ?? null,
      };
    },
  );
}
