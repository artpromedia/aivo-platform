/**
 * S15  Specialized-Support proxy routes
 *
 * Forward IEP analysis, differentiation, and accommodation requests
 * to specialized-support-svc when FEATURE_SPECIALIZED_SUPPORT is
 * enabled, otherwise return stub responses.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../config.js';

const specializedSupportEnabled = (): boolean => {
  const env =
    process.env.FEATURE_SPECIALIZED_SUPPORT ??
    process.env.FEATURE_SPECIALIZEDSUPPORT;
  return env === 'true' || env === '1';
};

/**
 * Helper: proxy a POST to specialized-support-svc.
 */
async function proxyPost(
  path: string,
  body: unknown,
  reply: FastifyReply,
  timeoutMs = 15_000,
) {
  const svcUrl = config.services.specializedSupport;
  const res = await fetch(`${svcUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`specialized-support-svc responded ${res.status}`);
  return res.json();
}

async function specializedSupportRoutes(app: FastifyInstance) {
  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/analyze-iep
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/analyze-iep',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { quality_score: 0, message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/analyze-iep',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] analyze-iep unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/iep-implications
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/iep-implications',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { feature_toggles: [], message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/iep-implications',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] iep-implications unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/iep-progress
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/iep-progress',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { overall_progress_pct: 0, message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/iep-progress',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] iep-progress unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/differentiate
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/differentiate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { strategy_type: 'none', message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/differentiate',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] differentiate unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/suggest-differentiation
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/suggest-differentiation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { suggestions: [], message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/suggest-differentiation',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] suggest-differentiation unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/recommend-accommodations
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/recommend-accommodations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { new_suggestions: [], message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/recommend-accommodations',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] recommend-accommodations unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/specialized-support/evaluate-effectiveness
  // ------------------------------------------------------------------
  app.post(
    '/specialized-support/evaluate-effectiveness',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!specializedSupportEnabled()) {
        return {
          success: true,
          data: { rating: 'insufficient_data', message: 'Specialized support service disabled' },
        };
      }

      try {
        const data = await proxyPost(
          '/api/v1/specialized-support/evaluate-effectiveness',
          request.body,
          reply,
        );
        return { success: true, data };
      } catch (err) {
        console.warn('[specialized-support] evaluate-effectiveness unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Specialized support service unavailable' };
      }
    },
  );
}

export { specializedSupportRoutes };
