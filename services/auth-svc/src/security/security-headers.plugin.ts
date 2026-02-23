/**
 * Security Headers Plugin
 *
 * Adds defence-in-depth HTTP response headers to every response from
 * auth-svc, supplementing @fastify/helmet where helmet is not registered
 * or when finer-grained control is needed.
 *
 * Headers set:
 *   - Strict-Transport-Security (HSTS)
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: DENY
 *   - X-XSS-Protection: 1; mode=block  (legacy browsers)
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - Permissions-Policy  (disable camera, microphone, geolocation)
 *   - Content-Security-Policy  (default-src 'self')
 *   - Cache-Control: no-store  (auth responses must never be cached)
 */

import crypto from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export const securityHeadersPlugin = fp(
  async (fastify: FastifyInstance) => {
    fastify.addHook(
      'onSend',
      async (_request: FastifyRequest, reply: FastifyReply, _payload: unknown) => {
        // Generate a unique nonce for CSP per request
        const nonce = crypto.randomBytes(16).toString('base64');

        // HSTS — 1 year, include subdomains
        reply.header(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains',
        );

        // Prevent MIME-type sniffing
        reply.header('X-Content-Type-Options', 'nosniff');

        // Deny framing (clickjacking protection)
        reply.header('X-Frame-Options', 'DENY');

        // Legacy XSS filter (mainly for older IE)
        reply.header('X-XSS-Protection', '1; mode=block');

        // Referrer policy — send origin on cross-origin, full URL on same-origin
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Disable dangerous browser features
        reply.header(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), payment=()',
        );

        // Content Security Policy
        reply.header(
          'Content-Security-Policy',
          [
            "default-src 'self'",
            `script-src 'self' 'nonce-${nonce}'`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        );

        // Auth responses should never be cached
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
        reply.header('Pragma', 'no-cache');

        return _payload;
      },
    );
  },
  {
    name: 'security-headers-plugin',
    fastify: '4.x',
  },
);
