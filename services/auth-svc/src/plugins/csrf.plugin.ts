/**
 * CSRF Plugin — Double-Submit Cookie Pattern
 *
 * Protects all state-mutating endpoints (POST, PUT, PATCH, DELETE) against
 * Cross-Site Request Forgery by requiring:
 *   1. A `__csrf` cookie (set by GET /auth/csrf-token)
 *   2. An `X-CSRF-Token` header with the same value
 *
 * Both values are compared using constant-time comparison to prevent timing
 * attacks. The cookie is `SameSite=Strict` and NOT `HttpOnly` so the browser
 * JS can read it and attach it as a header.
 *
 * Skipped paths:
 *   - /scim/v2/*    — uses Bearer token (machine-to-machine)
 *   - /webhook/*    — uses HMAC signature verification
 *   - /internal/*   — service-mesh only, no browser access
 *   - /health, /ready, /live — infrastructure probes
 */

import crypto from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

export const csrfPlugin = fp(
  async (fastify: FastifyInstance) => {
    // ── Token generation endpoint ──────────────────────────────────────────
    fastify.get('/auth/csrf-token', async (_request: FastifyRequest, reply: FastifyReply) => {
      const token = crypto.randomBytes(32).toString('hex');

      void reply.setCookie('__csrf', token, {
        httpOnly: false, // Must be readable by JS to put in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600, // 1 hour
      });

      return { csrfToken: token };
    });

    // ── Validation hook — runs on every state-mutating request ─────────────
    fastify.addHook(
      'preHandler',
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Only validate state-mutating methods
        const method = request.method.toUpperCase();
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

        // Allow disabling via env (tests, local dev)
        if (process.env.CSRF_ENABLED === 'false') return;

        // Skip paths that use alternative authentication mechanisms
        const skipPaths = [
          '/scim/v2',
          '/webhook/',
          '/internal/',
          '/health',
          '/ready',
          '/live',
          '/auth/sso/',    // SSO callbacks come from IdP, not browser forms
          '/auth/saml/',   // SAML POST binding from IdP
        ];
        if (skipPaths.some((p) => request.url.startsWith(p))) return;

        // eslint-disable-next-line @typescript-eslint/dot-notation
        const cookieToken = request.cookies?.['__csrf'];
        const headerToken = request.headers['x-csrf-token'] as string | undefined;

        if (!cookieToken || !headerToken) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING',
          });
        }

        // Constant-time comparison to prevent timing side-channel attacks
        try {
          const cookieBuf = Buffer.from(cookieToken, 'utf-8');
          const headerBuf = Buffer.from(headerToken, 'utf-8');

          if (
            cookieBuf.length !== headerBuf.length ||
            !crypto.timingSafeEqual(cookieBuf, headerBuf)
          ) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'CSRF token invalid',
              code: 'CSRF_TOKEN_INVALID',
            });
          }
        } catch {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'CSRF token invalid',
            code: 'CSRF_TOKEN_INVALID',
          });
        }
      },
    );
  },
  {
    name: 'csrf-plugin',
    fastify: '4.x',
    dependencies: ['cookie-plugin'], // Requires @fastify/cookie to be registered first
  },
);
