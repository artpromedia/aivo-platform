/**
 * Safety Middleware
 *
 * Fastify plugin that intercepts ALL AI-generated responses and pipes
 * them through ContentSafetyService before they reach the client.
 *
 * - Hooks into `onSend` for routes under /ai/* and /homework/*
 * - Blocked responses are replaced with a safe fallback message
 * - Sanitized responses have PII redacted
 * - Adds `X-Safety-Score` response header to every AI response
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { contentSafetyService } from '../safety/content-safety.service.js';
import { publishSafetyViolation } from '../safety/safety-event.publisher.js';
import type { SafetyContext } from '../safety/safety.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function isAiRoute(url: string): boolean {
  return (
    url.startsWith('/ai/') ||
    url.startsWith('/homework/') ||
    url.startsWith('/generation/') ||
    url.startsWith('/iep/') ||
    url.startsWith('/emotional-state/') ||
    url.startsWith('/social-story/')
  );
}

function inferContext(url: string): SafetyContext {
  if (url.startsWith('/homework/')) return 'homework';
  if (url.startsWith('/iep/') || url.startsWith('/generation/')) return 'curriculum';
  if (url.startsWith('/emotional-state/') || url.startsWith('/social-story/')) return 'tutoring';
  if (url.includes('assess')) return 'assessment';
  return 'chat';
}

interface ParsedBody {
  content?: string;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export const safetyMiddleware: FastifyPluginAsync = async (app: FastifyInstance) => {
  const enabled = process.env.SAFETY_ENABLED !== 'false';

  if (!enabled) {
    app.log.warn('[safety-middleware] Content safety is DISABLED via SAFETY_ENABLED=false');
    return;
  }

  app.addHook(
    'onSend',
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
    ): Promise<unknown> => {
      // Only intercept AI routes
      if (!isAiRoute(request.url)) return payload;

      // Only process JSON responses with content
      const contentType = reply.getHeader('content-type');
      if (
        typeof contentType === 'string' &&
        !contentType.includes('application/json')
      ) {
        return payload;
      }

      // Parse the payload
      let body: ParsedBody;
      try {
        if (typeof payload === 'string') {
          body = JSON.parse(payload) as ParsedBody;
        } else if (Buffer.isBuffer(payload)) {
          body = JSON.parse(payload.toString()) as ParsedBody;
        } else {
          return payload;
        }
      } catch {
        return payload;
      }

      // Extract content to validate
      const content =
        body.content ??
        (body as Record<string, unknown>).response ??
        (body as Record<string, unknown>).answer ??
        (body as Record<string, unknown>).text ??
        (body as Record<string, unknown>).explanation;

      if (typeof content !== 'string' || content.length === 0) {
        return payload;
      }

      // Extract user context from the request
      const tenantId =
        (request as unknown as Record<string, unknown>).tenantId as string || 'unknown';
      const userId =
        (request as unknown as Record<string, unknown>).userId as string || 'unknown';
      const studentAge =
        (request as unknown as Record<string, unknown>).studentAge as number | undefined;
      const context = inferContext(request.url);

      // Run safety pipeline
      const result = await contentSafetyService.validateOutput({
        content,
        studentAge,
        tenantId,
        userId,
        context,
      });

      // Always add safety score header
      reply.header('X-Safety-Score', result.score.toString());
      reply.header('X-Safety-Processing-Ms', result.processingMs.toString());

      // If blocked → replace response
      if (!result.safe) {
        // Publish event (fire and forget)
        publishSafetyViolation({
          tenantId,
          userId,
          context,
          flags: result.flags,
          score: result.score,
          timestamp: new Date().toISOString(),
        }).catch(() => { /* fire-and-forget */ });

        request.log.warn(
          {
            tenantId,
            userId,
            context,
            score: result.score,
            flags: result.flags.map((f) => f.type),
            processingMs: result.processingMs,
          },
          'AI content blocked by safety middleware',
        );

        const blockedResponse = JSON.stringify({
          blocked: true,
          message: 'This content was reviewed for safety.',
          supportContact: 'support@aivo.com',
        });

        reply.header('content-type', 'application/json; charset=utf-8');
        return blockedResponse;
      }

      // If PII was sanitized → replace content in body
      if (result.sanitizedContent && result.sanitizedContent !== content) {
        // Determine which key held the content
        const contentKey = body.content !== undefined
          ? 'content'
          : (body as Record<string, unknown>).response !== undefined
            ? 'response'
            : (body as Record<string, unknown>).answer !== undefined
              ? 'answer'
              : (body as Record<string, unknown>).text !== undefined
                ? 'text'
                : 'explanation';

        (body as Record<string, unknown>)[contentKey] = result.sanitizedContent;
        return JSON.stringify(body);
      }

      return payload;
    },
  );

  app.log.info('[safety-middleware] AI Content Safety Guardrails active');
};
