/**
 * LTI Service Server
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import Fastify from 'fastify';

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
