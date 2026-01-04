import Fastify from 'fastify';
import cors from '@fastify/cors';

import { config } from './config.js';
import { PrismaClient } from './generated/prisma-client/index.js';
import { registerGameRoutes } from './routes/games.js';
import { GameService } from './services/game.service.js';

const prisma = new PrismaClient();

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Global error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: error.message || 'Internal Server Error',
    });
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', service: 'game-library-svc' }));
  app.get('/ready', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new Error('Database not ready');
    }
  });

  // Auth middleware placeholder
  // In production, this would validate JWT tokens
  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Mock auth for development
      (request as any).user = {
        sub: 'test-user-id',
        tenantId: 'test-tenant-id',
        learnerId: 'test-learner-id',
        role: 'LEARNER',
      };
    }
  });

  // Game routes
  await app.register(registerGameRoutes, { prefix: '/games', prisma });

  return { app, prisma };
}

export async function startApp() {
  const { app, prisma } = await buildApp();

  // Seed game catalog on startup
  const gameService = new GameService(prisma);
  try {
    await gameService.seedGameCatalog();
    app.log.info('Game catalog seeded successfully');
  } catch (err) {
    app.log.warn({ err }, 'Failed to seed game catalog (may already exist)');
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down...`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Game Library Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}
