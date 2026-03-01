/**
 * S14  Accessibility-AI proxy routes
 *
 * Forward accessibility requests to accessibility-ai-svc when
 * FEATURE_ACCESSIBILITY_AI is enabled, otherwise return stub responses.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../config.js';

const accessibilityEnabled = (): boolean => {
  const env =
    process.env.FEATURE_ACCESSIBILITY_AI ?? process.env.FEATURE_ACCESSIBILITYAI;
  return env === 'true' || env === '1';
};

async function accessibilityRoutes(app: FastifyInstance) {
  // ------------------------------------------------------------------
  // POST /api/v1/brain/accessibility/adapt-reading-level
  // ------------------------------------------------------------------
  app.post(
    '/accessibility/adapt-reading-level',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { text: '', message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/adapt-reading-level`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] adapt-reading-level unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/accessibility/estimate-lexile
  // ------------------------------------------------------------------
  app.post(
    '/accessibility/estimate-lexile',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { lexile: 0, message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/estimate-lexile`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(5_000),
          },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] estimate-lexile unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/brain/accessibility/grade-bands
  // ------------------------------------------------------------------
  app.get(
    '/accessibility/grade-bands',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { grade_bands: [], message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/grade-bands`,
          { signal: AbortSignal.timeout(5_000) },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] grade-bands unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/accessibility/apply-sensory
  // ------------------------------------------------------------------
  app.post(
    '/accessibility/apply-sensory',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { accommodations_applied: [], message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/apply-sensory`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] apply-sensory unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/brain/accessibility/accommodations
  // ------------------------------------------------------------------
  app.get(
    '/accessibility/accommodations',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { accommodations: {}, message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/accommodations`,
          { signal: AbortSignal.timeout(5_000) },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] accommodations unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/accessibility/alt-text/batch
  // ------------------------------------------------------------------
  app.post(
    '/accessibility/alt-text/batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { results: [], message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/alt-text/batch`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(30_000),
          },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] alt-text/batch unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/accessibility/simplify
  // ------------------------------------------------------------------
  app.post(
    '/accessibility/simplify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { text: '', message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/simplify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] simplify unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/brain/accessibility/reading/assist
  // ------------------------------------------------------------------
  app.post(
    '/accessibility/reading/assist',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!accessibilityEnabled()) {
        return {
          success: true,
          data: { html: '', message: 'Accessibility AI service disabled' },
        };
      }

      try {
        const svcUrl = config.services.accessibilityAi;
        const res = await fetch(
          `${svcUrl}/api/v1/reading/assist`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!res.ok) throw new Error(`accessibility-ai-svc responded ${res.status}`);
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        console.warn('[accessibility-ai] reading/assist unavailable', {
          error: (err as Error).message,
        });
        reply.status(502);
        return { success: false, error: 'Accessibility AI service unavailable' };
      }
    },
  );
}

export { accessibilityRoutes };
