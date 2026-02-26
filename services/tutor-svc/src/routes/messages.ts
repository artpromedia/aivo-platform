import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma, TutorMessageRole } from '../prisma.js';
import { sessionService } from '../services/session.service.js';
import { config } from '../config.js';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const ListMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export async function messageRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/tutor/sessions/:sessionId/messages
   * Send a message and get AI response
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
      const { content } = SendMessageSchema.parse(request.body);

      const session = await sessionService.getById(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
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

      try {
        const aiResponse = await fetch(`${config.aiOrchestratorUrl}/api/v1/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType: 'SUBJECT_TUTOR',
            subject: session.subject,
            personaSlug: session.persona.slug,
            systemPrompt: session.persona.systemPromptTemplate,
            messages: conversationHistory,
            context: {
              sessionId,
              subject: session.subject,
              topic: session.topic,
            },
          }),
        });

        if (aiResponse.ok) {
          const data = (await aiResponse.json()) as { content: string };
          aiContent = data.content;
        } else {
          aiContent = "I'm having a moment - could you try asking that again?";
        }
      } catch {
        aiContent =
          "I'm having trouble connecting right now. Let me try again - could you repeat your question?";
      }

      const latencyMs = Date.now() - startTime;

      // Save AI response
      const aiMessage = await prisma.tutorMessage.create({
        data: {
          sessionId,
          role: TutorMessageRole.ASSISTANT,
          content: aiContent,
          emotionTag: 'neutral',
          avatarState: 'talking',
          latencyMs,
        },
      });

      // Update session message count
      await prisma.tutorSession.update({
        where: { id: sessionId },
        data: { totalMessages: { increment: 2 } },
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
          createdAt: aiMessage.createdAt.toISOString(),
          latencyMs,
        },
      };
    },
  );

  /**
   * GET /api/v1/tutor/sessions/:sessionId/messages
   * List messages in a session
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

      const session = await sessionService.getById(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
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
          createdAt: m.createdAt.toISOString(),
        })),
      };
    },
  );
}
