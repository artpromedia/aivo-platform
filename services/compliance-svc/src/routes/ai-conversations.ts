/**
 * AIVO Compliance Service - Parent AI Conversation Viewer
 *
 * PRD: COPPA requires parents to be able to review their child's AI conversations.
 * This endpoint proxies to ai-orchestrator to fetch conversation transcripts.
 *
 * GET /ai-conversations/:learnerId           — List AI conversations for a learner
 * GET /ai-conversations/:learnerId/:sessionId — Get full transcript for a session
 */

import { Role, requireRole } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL ?? 'http://localhost:4092';

export const registerAiConversationRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  /**
   * GET /ai-conversations/:learnerId
   * List AI conversation sessions for a learner (parent view).
   */
  fastify.get(
    '/:learnerId',
    {
      preHandler: requireRole([Role.PARENT, Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]),
    },
    async (request, reply) => {
      const { learnerId } = request.params as { learnerId: string };
      const { page = '1', pageSize = '20' } = request.query as {
        page?: string;
        pageSize?: string;
      };
      const authContext = (request as any).authContext;

      try {
        const response = await fetch(
          `${AI_ORCHESTRATOR_URL}/internal/conversations/${learnerId}?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-service-name': 'compliance-svc',
              'x-tenant-id': authContext.tenantId,
            },
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            return reply.send({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
          }
          throw new Error(`ai-orchestrator returned ${response.status}`);
        }

        const data = await response.json();
        return reply.send(data);
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch AI conversations from ai-orchestrator');
        return reply.status(503).send({
          error: 'AI conversation history is temporarily unavailable.',
        });
      }
    },
  );

  /**
   * GET /ai-conversations/:learnerId/:sessionId
   * Get full transcript for a specific AI session.
   */
  fastify.get(
    '/:learnerId/:sessionId',
    {
      preHandler: requireRole([Role.PARENT, Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]),
    },
    async (request, reply) => {
      const { learnerId, sessionId } = request.params as {
        learnerId: string;
        sessionId: string;
      };
      const authContext = (request as any).authContext;

      try {
        const response = await fetch(
          `${AI_ORCHESTRATOR_URL}/internal/conversations/${learnerId}/${sessionId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-service-name': 'compliance-svc',
              'x-tenant-id': authContext.tenantId,
            },
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            return reply.status(404).send({ error: 'Conversation not found' });
          }
          throw new Error(`ai-orchestrator returned ${response.status}`);
        }

        const data = await response.json();
        return reply.send(data);
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch AI conversation transcript');
        return reply.status(503).send({
          error: 'AI conversation transcript is temporarily unavailable.',
        });
      }
    },
  );
};
