/**
 * Content Safety Middleware for Homework Helper Service
 *
 * Lightweight onSend hook that intercepts AI-generated responses on homework
 * routes, running critical pattern checks (PII, crisis keywords, profanity)
 * and optionally delegating full scoring to the AI Orchestrator safety API.
 *
 * Because this service targets minors, ANY response that leaks PII or contains
 * crisis / harmful content is blocked before it reaches the student.
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

// ── Critical pattern lists (mirror ai-orchestrator content-safety.service) ──

const PII_PATTERNS = [
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'credit_card', regex: /\b(?:\d[ -]*?){13,19}\b/g },
  { name: 'phone', regex: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g },
  { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
];

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'want to die', 'self-harm', 'cut myself',
  'end my life', 'not worth living', 'overdose', 'hang myself',
  'jump off', 'no reason to live', 'better off dead', 'hurting myself',
];

const CRISIS_RE = new RegExp(
  CRISIS_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
);

const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'bastard', 'dick',
  'cock', 'pussy', 'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore',
];

const PROFANITY_RE = new RegExp(
  `\\b(?:${PROFANITY_LIST.join('|')})\\b`,
  'gi',
);

// ── Helpers ─────────────────────────────────────────────────────────────────

interface SafetyCheckResult {
  safe: boolean;
  blocked: boolean;
  reason?: string;
  sanitized?: string;
}

function checkContent(text: string): SafetyCheckResult {
  // Layer 1 – PII detection
  for (const pat of PII_PATTERNS) {
    if (pat.regex.test(text)) {
      pat.regex.lastIndex = 0; // reset stateful regex
      return {
        safe: false,
        blocked: pat.name === 'ssn' || pat.name === 'credit_card',
        reason: `PII detected: ${pat.name}`,
        sanitized: text.replace(pat.regex, '[REDACTED]'),
      };
    }
    pat.regex.lastIndex = 0;
  }

  // Layer 2 – Crisis / self-harm
  if (CRISIS_RE.test(text)) {
    return {
      safe: false,
      blocked: true,
      reason: 'Crisis / self-harm content detected',
    };
  }

  // Layer 3 – Profanity
  if (PROFANITY_RE.test(text)) {
    PROFANITY_RE.lastIndex = 0;
    return {
      safe: false,
      blocked: false,
      reason: 'Profanity detected',
      sanitized: text.replace(PROFANITY_RE, '[REMOVED]'),
    };
  }

  return { safe: true, blocked: false };
}

function extractContent(body: Record<string, unknown>): string | null {
  // Walk common response shapes
  for (const key of ['content', 'response', 'answer', 'text', 'explanation', 'hint', 'feedback']) {
    const val = body[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }

  // Nested data.content
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    for (const key of ['content', 'response', 'answer', 'text', 'explanation', 'hint', 'feedback']) {
      const val = data[key];
      if (typeof val === 'string' && val.length > 0) return val;
    }
  }

  return null;
}

// ── Fastify plugin ──────────────────────────────────────────────────────────

const INTERCEPTED_PREFIXES = ['/homework'];

const safetyPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.SAFETY_ENABLED === 'false') {
    fastify.log.info('Content safety middleware disabled via SAFETY_ENABLED=false');
    return;
  }

  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    // Only intercept JSON responses on homework routes
    if (!INTERCEPTED_PREFIXES.some((p) => request.url.startsWith(p))) return payload;

    const contentType = reply.getHeader('content-type');
    if (typeof contentType !== 'string' || !contentType.includes('application/json')) return payload;
    if (typeof payload !== 'string') return payload;

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return payload;
    }

    const text = extractContent(body);
    if (!text) return payload;

    const start = performance.now();
    const result = checkContent(text);
    const processingMs = Math.round(performance.now() - start);

    reply.header('X-Safety-Processing-Ms', String(processingMs));

    if (result.blocked) {
      request.log.warn(
        { reason: result.reason, url: request.url },
        'Safety: blocked homework response',
      );

      reply.header('X-Safety-Blocked', 'true');
      return JSON.stringify({
        blocked: true,
        message:
          'This response was blocked by our content safety system. If you need help, please reach out to a trusted adult or contact the Crisis Text Line by texting HOME to 741741.',
        supportContact: 'support@aivo.ai',
      });
    }

    if (result.sanitized) {
      request.log.info(
        { reason: result.reason, url: request.url },
        'Safety: sanitized homework response',
      );

      // Replace the content field in the body
      const contentKey = Object.keys(body).find(
        (k) => typeof body[k] === 'string' && body[k] === text,
      );
      if (contentKey) {
        body[contentKey] = result.sanitized;
        return JSON.stringify(body);
      }
    }

    return payload;
  });

  fastify.log.info('Content safety middleware registered for homework routes');
};

export const safetyMiddleware = fp(safetyPlugin, {
  name: 'homework-safety-middleware',
  fastify: '4.x',
});
