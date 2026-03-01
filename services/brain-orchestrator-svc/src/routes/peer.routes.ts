/**
 * S13  Peer-Learning proxy routes
 *
 * Forward peer-learning requests to peer-learning-svc when
 * FEATURE_PEER_LEARNING is enabled, otherwise return stub responses.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../config.js';

const peerLearningEnabled = (): boolean => {
  const env =
    process.env.FEATURE_PEER_LEARNING ?? process.env.FEATURE_PEERLEARNING;
  return env === 'true' || env === '1';
};

async function peerRoutes(app: FastifyInstance) {
  // ------------------------------------------------------------------
  // POST /api/v1/brain/peer-learning/score-collaboration
  // ------------------------------------------------------------------
  app.post(
    '/peer-learning/score-collaboration',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!peerLearningEnabled()) {
        return {
          success: true,
          data: { scores: {}, message: 'Peer learning service disabled' },
        };
      }

      try {
        const plUrl = config.services.peerLearning;
        const res = await fetch(
          `${plUrl}/api/v1/peer-learning/score-collaboration`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(5_000),
          },
        );

        if (!res.ok) throw new Error(`peer-learning-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[peer-learning] score-collaboration unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Peer learning service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/peer-learning/facilitate
  // ------------------------------------------------------------------
  app.post(
    '/peer-learning/facilitate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!peerLearningEnabled()) {
        return {
          success: true,
          data: { actions: [], message: 'Peer learning service disabled' },
        };
      }

      try {
        const plUrl = config.services.peerLearning;
        const res = await fetch(`${plUrl}/api/v1/peer-learning/facilitate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body),
          signal: AbortSignal.timeout(5_000),
        });

        if (!res.ok) throw new Error(`peer-learning-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[peer-learning] facilitate unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Peer learning service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/peer-learning/match
  // ------------------------------------------------------------------
  app.post(
    '/peer-learning/match',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!peerLearningEnabled()) {
        return {
          success: true,
          data: { match: null, message: 'Peer learning service disabled' },
        };
      }

      try {
        const body = request.body as any;
        const plUrl = config.services.peerLearning;
        const qs = new URLSearchParams({
          learner_id: body.learner_id ?? '',
          match_type: body.match_type ?? 'study_partner',
          ...(body.topic ? { topic: body.topic } : {}),
        });

        const res = await fetch(
          `${plUrl}/api/v1/peer-learning/match?${qs.toString()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5_000),
          },
        );

        if (!res.ok) throw new Error(`peer-learning-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[peer-learning] match unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Peer learning service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/peer-learning/classrooms/:classId/form-groups
  // ------------------------------------------------------------------
  app.post(
    '/peer-learning/classrooms/:classId/form-groups',
    async (
      request: FastifyRequest<{ Params: { classId: string } }>,
      reply: FastifyReply,
    ) => {
      if (!peerLearningEnabled()) {
        return {
          success: true,
          data: { groups: [], message: 'Peer learning service disabled' },
        };
      }

      try {
        const { classId } = request.params;
        const plUrl = config.services.peerLearning;
        const res = await fetch(
          `${plUrl}/api/v1/peer-learning/classrooms/${classId}/form-groups`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!res.ok) throw new Error(`peer-learning-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[peer-learning] form-groups unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Peer learning service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/brain/peer-learning/classrooms/:classId/groups
  // ------------------------------------------------------------------
  app.get(
    '/peer-learning/classrooms/:classId/groups',
    async (
      request: FastifyRequest<{ Params: { classId: string } }>,
      reply: FastifyReply,
    ) => {
      if (!peerLearningEnabled()) {
        return {
          success: true,
          data: { groups: [], message: 'Peer learning service disabled' },
        };
      }

      try {
        const { classId } = request.params;
        const plUrl = config.services.peerLearning;
        const res = await fetch(
          `${plUrl}/api/v1/peer-learning/classrooms/${classId}/groups`,
          { signal: AbortSignal.timeout(5_000) },
        );

        if (!res.ok) throw new Error(`peer-learning-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[peer-learning] list-groups unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Peer learning service unavailable' };
      }
    },
  );
}

export { peerRoutes };
