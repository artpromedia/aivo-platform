/**
 * Streaming Tutor Message Endpoint
 *
 * POST /api/v1/tutor/sessions/:sessionId/messages/stream
 *
 * Returns Server-Sent Events (SSE) with:
 *   - type: "chunk"        → LLM text chunk (streamed in real-time)
 *   - type: "avatar_state" → emotion/avatar state change
 *   - type: "complete"     → final message with audio URL + visemes
 *   - type: "error"        → processing error
 *
 * The stream-then-synthesize pattern:
 *   1. Stream LLM text chunks as they arrive (client shows text immediately)
 *   2. After full text assembled, call Piper TTS (non-streaming synthesis)
 *   3. Upload audio to MinIO/S3
 *   4. Send "complete" event with audioUrl + visemes
 *   5. Client plays audio with lip-sync AFTER text is fully displayed
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma, TutorMessageRole } from '../prisma.js';
import { config } from '../config.js';
import {
  detectEmotion,
  mapEmotionToAvatarState,
} from '../services/session.service.js';
import { synthesizeSpeech, uploadAudio } from '../services/tts.service.js';
import { getVoiceConfig } from '../services/voice-config.service.js';
import { resolveLocaleConfig } from '../services/locale.service.js';

const StreamMessageBody = z.object({
  content: z.string().min(1).max(5000),
});

export async function streamRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/:sessionId/messages/stream',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: z.infer<typeof StreamMessageBody>;
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = request.params;
      const bodyResult = StreamMessageBody.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: bodyResult.error.message,
        });
      }

      const { content } = bodyResult.data;

      // Extract tenant and user from headers (set by realtime-svc)
      // or from the auth middleware
      const user = request.user;
      const tenantId =
        (request.headers['x-tenant-id'] as string) ??
        user?.tenantId ??
        user?.tenant_id;
      const userId =
        (request.headers['x-user-id'] as string) ?? user?.sub;

      if (!tenantId) {
        return reply.status(401).send({ error: 'Tenant ID required' });
      }

      // Validate session
      const session = await prisma.tutorSession.findUnique({
        where: { id: sessionId },
        include: { persona: true },
      });

      if (!session || session.tenantId !== tenantId) {
        return reply.status(404).send({ error: 'SESSION_NOT_FOUND' });
      }

      if (session.status !== 'ACTIVE') {
        return reply.status(400).send({ error: 'SESSION_NOT_ACTIVE' });
      }

      // Save user message
      await prisma.tutorMessage.create({
        data: {
          sessionId,
          role: TutorMessageRole.USER,
          content,
        },
      });

      // Set up SSE response
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const sendEvent = (type: string, data: Record<string, unknown>) => {
        reply.raw.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      };

      try {
        // ── Load conversation history ───────────────────────────────
        const history = await prisma.tutorMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 20,
          select: { role: true, content: true },
        });

        const messages = history.map((m) => ({
          role: m.role === 'USER' ? 'user' : 'assistant',
          content: m.content,
        }));

        // ── Stream LLM response via ai-orchestrator SSE ─────────────
        const aiStreamUrl = `${config.aiOrchestratorUrl}/api/v1/ai/chat/stream`;

        const aiResponse = await fetch(aiStreamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            options: {
              stream: true,
              systemPrompt: session.persona.systemPromptTemplate,
              agentType: `TUTOR_${session.subject}_PREMIUM`,
            },
            tenantId,
            metadata: {
              learnerId: session.learnerId,
              sessionId,
              subject: session.subject,
            },
          }),
          signal: AbortSignal.timeout(config.aiStreamTimeoutMs),
        });

        if (!aiResponse.ok || !aiResponse.body) {
          throw new Error(`AI orchestrator returned ${aiResponse.status}`);
        }

        // Read and forward LLM chunks
        const aiReader = aiResponse.body.getReader();
        const aiDecoder = new TextDecoder();
        let fullResponseText = '';
        let totalTokens = 0;
        let aiBuffer = '';

        while (true) {
          const { done, value } = await aiReader.read();
          if (done) break;

          aiBuffer += aiDecoder.decode(value, { stream: true });
          const lines = aiBuffer.split('\n');
          aiBuffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.content) {
                fullResponseText += parsed.content;
                sendEvent('chunk', { text: parsed.content });
              }

              if (parsed.usage?.totalTokens) {
                totalTokens = parsed.usage.totalTokens;
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }

        if (!fullResponseText) {
          sendEvent('error', {
            code: 'EMPTY_RESPONSE',
            message: 'AI tutor could not generate a response. Please try again.',
            recoverable: true,
          });
          reply.raw.write('data: [DONE]\n\n');
          reply.raw.end();
          return;
        }

        // ── Detect emotion from complete response ───────────────────
        const emotionTag = detectEmotion(fullResponseText);
        const avatarState = mapEmotionToAvatarState(emotionTag);

        sendEvent('avatar_state', {
          avatarState: emotionTag === 'celebrating' ? 'celebrating' : 'encouraging',
          emotionTag,
          durationMs: 800,
        });

        // ── Synthesize audio via Piper TTS (only if voice available) ─
        let audioUrl: string | null = null;
        let visemeData: Array<{
          offsetMs: number;
          visemeId: number;
          mouthOpen: number;
          durationMs: number;
        }> = [];
        let voiceInfo: {
          voiceUsed: string;
          locale: string;
          fallbackUsed: boolean;
        } | null = null;

        const sessionLocaleConfig = resolveLocaleConfig(session.locale);
        const voiceAvailable = sessionLocaleConfig.piperVoiceAvailable;

        if (config.ttsEnabled && voiceAvailable) {
          // Locale has a Piper voice — proceed with synthesis
          try {
            const voiceConfig = await getVoiceConfig(
              session.personaId,
              session.locale,
            );

            if (voiceConfig) {
              const requestedLocale = session.locale;
              voiceInfo = {
                voiceUsed: voiceConfig.ttsVoiceId,
                locale: voiceConfig.locale ?? requestedLocale,
                fallbackUsed: voiceConfig.locale !== requestedLocale,
              };

              const speechResult = await synthesizeSpeech(
                fullResponseText,
                voiceConfig,
                voiceConfig.locale ?? requestedLocale,
              );

              if (speechResult.audioBase64) {
                const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                audioUrl =
                  (await uploadAudio(speechResult.audioBase64, sessionId, tempId)) ??
                  null;
                visemeData = speechResult.visemes;
              }
            }
          } catch (ttsError) {
            // TTS failure is non-fatal — message is delivered as text-only
            request.log.warn({ err: ttsError, sessionId }, 'TTS synthesis failed');
          }
        } else if (config.ttsEnabled && !voiceAvailable) {
          // Locale has no Piper voice — log but don't error
          request.log.info(
            { sessionId, locale: session.locale },
            'TTS skipped: no Piper voice available for locale',
          );
        }

        // ── Save assistant message to DB ────────────────────────────
        const assistantMessage = await prisma.tutorMessage.create({
          data: {
            sessionId,
            role: TutorMessageRole.ASSISTANT,
            content: fullResponseText,
            audioUrl: audioUrl ?? null,
            visemeData: visemeData.length > 0 ? visemeData : undefined,
            emotionTag,
            avatarState: audioUrl ? 'talking' : avatarState,
            tokensUsed: totalTokens,
          },
        });

        // Update session counters
        await prisma.tutorSession.update({
          where: { id: sessionId },
          data: {
            totalMessages: { increment: 2 },
            totalTokensUsed: { increment: totalTokens },
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

        // ── Send final "complete" event ─────────────────────────────
        sendEvent('complete', {
          messageId: assistantMessage.id,
          content: fullResponseText,
          audioUrl,
          visemes: visemeData,
          emotionTag,
          avatarState: audioUrl ? 'talking' : avatarState,
          voiceInfo,
          localeInfo: {
            voiceAvailable,
            isRTL: sessionLocaleConfig.isRTL,
          },
        });
      } catch (error) {
        request.log.error({ err: error, sessionId }, 'Stream processing error');
        sendEvent('error', {
          code: 'PROCESSING_ERROR',
          message: 'Something went wrong. Please try again.',
          recoverable: true,
        });
      } finally {
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
      }
    },
  );
}
