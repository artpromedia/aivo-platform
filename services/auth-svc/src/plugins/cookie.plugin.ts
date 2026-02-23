/**
 * Cookie Plugin — @fastify/cookie Registration
 *
 * Registers the @fastify/cookie plugin with a signing secret so that
 * other plugins (CSRF, session management) can read and write cookies.
 *
 * The COOKIE_SECRET should be a cryptographically random string of at
 * least 32 characters.  In production it is injected via K8s Secrets;
 * in local dev it falls back to a generated random value.
 */

import crypto from 'node:crypto';

import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

export const cookiePlugin = fp(
  async (fastify: FastifyInstance) => {
    const secret =
      process.env.COOKIE_SECRET || crypto.randomBytes(32).toString('hex');

    await fastify.register(cookie as any, {
      secret,
      hook: 'onRequest',
      parseOptions: {},
    });
  },
  {
    name: 'cookie-plugin',
    fastify: '4.x',
  },
);
