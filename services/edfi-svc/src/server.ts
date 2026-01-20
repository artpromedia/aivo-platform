/**
 * Ed-Fi Service Server
 *
 * Fastify server setup for Ed-Fi data export service.
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { registerRoutes } from './api/routes.js';
import type { LearnerDataSource } from './exports/export-service.js';
import { PrismaClient } from './generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ServerConfig {
  port: number;
  host?: string;
  learnerDataSource: LearnerDataSource;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVER
// ══════════════════════════════════════════════════════════════════════════════

export async function createServer(config: ServerConfig) {
  const prisma = new PrismaClient();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Rate limiting
  await app.register(rateLimit, FastifyRateLimitPresets.internalApi('edfi-svc'));

  // Register routes
  await registerRoutes(app, prisma, config.learnerDataSource);

  const start = async () => {
    await prisma.$connect();
    app.log.info('Connected to database');

    await app.listen({ port: config.port, host: config.host || '0.0.0.0' });
    app.log.info({ port: config.port }, 'Ed-Fi service listening');
  };

  const stop = async () => {
    await app.close();
    await prisma.$disconnect();
  };

  return { app, prisma, start, stop };
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mockLearnerDataSource: LearnerDataSource = {
    getLearners: async () => [],
    getEnrollments: async () => [],
    getGrades: async () => [],
  };

  createServer({
    port: Number.parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    learnerDataSource: mockLearnerDataSource,
  })
    .then(({ start }) => start())
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
