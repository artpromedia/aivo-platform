import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma, TutorMessageRole } from '../prisma.js';
import {
  sessionService,
  callAiOrchestrator,
  detectEmotion,
  mapEmotionToAvatarState,
} from '../services/session.service.js';
import {
  synthesizeSpeech,
  uploadAudio,
} from '../services/tts.service.js';
import { getVoiceConfig } from '../services/voice-config.service.js';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  voiceEnabled: z.boolean().optional().default(false),
});

const ListMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export async function messageRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/tutor/sessions/:sessionId/messages
   * Send a message and get AI response with emotion detection.
   */
  fastify.post(
    '/:sessionId/messages',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: z.infer<typeof SendMessageSchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = request.params;
      const { content, voiceEnabled } = SendMessageSchema.parse(request.body);
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

      if (session.status !== 'ACTIVE') {
        return reply.status(400).send({ error: 'Session is not active' });
      }

      // Save user message
      const userMessage = await prisma.tutorMessage.create({
        data: {
          sessionId,
          role: TutorMessageRole.USER,
          content,
        },
      });

      // Get recent message history for context
      const recentMessages = await prisma.tutorMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const conversationHistory = recentMessages
        .reverse()
        .map((m) => ({
          role: m.role === 'USER' ? 'user' : m.role === 'ASSISTANT' ? 'assistant' : 'system',
          content: m.content,
        }));

      // Call AI orchestrator for response
      const startTime = Date.now();
      let aiContent: string;
      let tokensUsed = 0;

      try {
        const aiResponse = await callAiOrchestrator({
          agentType: `TUTOR_${session.subject}_PREMIUM`,
          subject: session.subject,
          personaSlug: session.persona.slug,
          systemPrompt: session.persona.systemPromptTemplate,
          messages: conversationHistory,
          context: {
            sessionId,
            subject: session.subject,
            topic: session.topic ?? undefined,
            locale: session.locale,
          },
        });

        aiContent = aiResponse.content;
        tokensUsed = aiResponse.metadata?.tokens ?? 0;
      } catch {
        aiContent =
          "I'm having trouble connecting right now. Let me try again - could you repeat your question?";
      }

      const latencyMs = Date.now() - startTime;

      // Detect emotion and map to avatar state
      const emotionTag = detectEmotion(aiContent);
      const avatarState = mapEmotionToAvatarState(emotionTag);

      // ── TTS synthesis (when voice is enabled) ──────────────────────────
      let audioUrl: string | undefined;
      let visemeData: unknown[] | undefined;

      if (voiceEnabled) {
        try {
          const voiceConfig = await getVoiceConfig(
            session.personaId,
            session.locale,
          );

          if (voiceConfig) {
            const ttsResult = await synthesizeSpeech(
              aiContent,
              voiceConfig,
              session.locale,
            );

            // Upload audio to S3/R2 if we have real audio data
            if (ttsResult.audioBase64) {
              // Generate a temporary message ID for the upload path
              const tempId = crypto.randomUUID();
              audioUrl = await uploadAudio(
                ttsResult.audioBase64,
                sessionId,
                tempId,
              );
            }

            visemeData = ttsResult.visemes;
          }
        } catch (error) {
          // TTS failure should not block the message response
          console.warn('TTS synthesis failed, sending message without audio:', error);
        }
      }

      // Save AI response
      const aiMessage = await prisma.tutorMessage.create({
        data: {
          sessionId,
          role: TutorMessageRole.ASSISTANT,
          content: aiContent,
          emotionTag,
          avatarState: voiceEnabled && visemeData ? 'talking' : avatarState,
          audioUrl: audioUrl ?? null,
          visemeData: (visemeData as Parameters<typeof prisma.tutorMessage.create>[0]['data']['visemeData']) ?? undefined,
          tokensUsed,
          latencyMs,
        },
      });

      // Update session message count and token usage
      await prisma.tutorSession.update({
        where: { id: sessionId },
        data: {
          totalMessages: { increment: 2 },
          totalTokensUsed: { increment: tokensUsed },
        },
      });

      // Update analytics
      await prisma.tutorSessionAnalytics.update({
        where: { sessionId },
        data: {
          messageCount: { increment: 2 },
          userMessageCount: { increment: 1 },
          assistantMessageCount: { increment: 1 },
        },
      });

      return {
        userMessage: {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt.toISOString(),
        },
        aiMessage: {
          id: aiMessage.id,
          role: aiMessage.role,
          content: aiMessage.content,
          emotionTag: aiMessage.emotionTag,
          avatarState: aiMessage.avatarState,
          audioUrl: aiMessage.audioUrl ?? undefined,
          visemes: visemeData ?? [],
          tokensUsed,
          createdAt: aiMessage.createdAt.toISOString(),
          latencyMs,
        },
      };
    },
  );

  /**
   * GET /api/v1/tutor/sessions/:sessionId/messages
   * List messages in a session with tenant ownership verification.
   */
  fastify.get(
    '/:sessionId/messages',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Querystring: z.infer<typeof ListMessagesSchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = request.params;
      const query = ListMessagesSchema.parse(request.query);
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

      const messages = await prisma.tutorMessage.findMany({
        where: {
          sessionId,
          ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: query.limit,
      });

      return {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          emotionTag: m.emotionTag,
          avatarState: m.avatarState,
          audioUrl: m.audioUrl ?? undefined,
          visemes: (m.visemeData as unknown[]) ?? [],
          createdAt: m.createdAt.toISOString(),
        })),
      };
    },
  );
}
