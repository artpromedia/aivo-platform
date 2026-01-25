/**
 * LTI Service Server
 */

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';

import { PrismaClient } from '../generated/prisma-client/index.js';

import { registerLtiRoutes } from './routes.js';

export interface ServerConfig {
  port?: number;
  host?: string;
  baseUrl: string;
  getPrivateKey: (keyRef: string) => Promise<string>;
}

export async function createServer(config: ServerConfig) {
  const prisma = new PrismaClient();
  const app = Fastify({ logger: true });

  // Security middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(helmet as any, {
    contentSecurityPolicy: false, // LTI requires embedding in iframes
    frameguard: false, // LTI content is embedded in LMS iframes
  });

  // Rate limiting - protect LTI endpoints from abuse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, {
    global: true,
    max: 200, // 200 requests per minute (LTI launches can be frequent)
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use client_id from LTI payload or IP for rate limiting
      const clientId = (request.body as { client_id?: string })?.client_id;
      if (clientId) return `lti:${clientId}`;
      return (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        request.ip ||
        'unknown';
    },
    errorResponseBuilder: (request, context) => ({
      error: 'Too Many Requests',
      message: 'LTI request rate limit exceeded.',
      retryAfter: context.after,
    }),
    // Skip rate limiting for health checks and JWKS endpoint
    allowList: (request) =>
      request.url === '/health' ||
      request.url.includes('/.well-known/jwks'),
  });

  // Register form body parser for LTI POST requests
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body as string));
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Register routes
  registerLtiRoutes(app, prisma, {
    baseUrl: config.baseUrl,
    getPrivateKey: config.getPrivateKey,
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, prisma };
}

export async function startServer(config: ServerConfig) {
  const { app } = await createServer(config);

  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`LTI service listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
