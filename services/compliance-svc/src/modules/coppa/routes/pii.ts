/**
 * COPPA/Compliance PII Scanning Routes
 *
 * PRD: Endpoint for AI orchestrator and chat services to validate
 * messages from minors before processing.
 */

import type { FastifyInstance } from 'fastify';

import { detectPii, shouldBlockMessage, sanitizeMessage } from '../pii-detection.js';

export async function registerPiiRoutes(app: FastifyInstance) {
  /**
   * POST /pii/scan
   * Scan text for PII. Returns detection results.
   */
  app.post('/scan', async (request, reply) => {
    const { text } = request.body as { text: string };

    if (!text || typeof text !== 'string') {
      return reply.status(400).send({ error: 'text field is required' });
    }

    const result = detectPii(text);
    return reply.send(result);
  });

  /**
   * POST /pii/check
   * Check if a message should be blocked for a minor.
   * Used by AI Orchestrator before processing chat messages.
   */
  app.post('/check', async (request, reply) => {
    const { text, isMinor = true } = request.body as {
      text: string;
      isMinor?: boolean;
    };

    if (!text || typeof text !== 'string') {
      return reply.status(400).send({ error: 'text field is required' });
    }

    const result = shouldBlockMessage(text, isMinor);
    return reply.send(result);
  });

  /**
   * POST /pii/sanitize
   * Redact PII from text and return sanitized version.
   */
  app.post('/sanitize', async (request, reply) => {
    const { text } = request.body as { text: string };

    if (!text || typeof text !== 'string') {
      return reply.status(400).send({ error: 'text field is required' });
    }

    const sanitized = sanitizeMessage(text);
    return reply.send({ original: text, sanitized });
  });
}
