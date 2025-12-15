/**
 * Collaboration Service Entry Point
 * Epic 15: Caregiver Collaboration, Shared Action Plans & Messaging 2.0
 *
 * This service manages care teams, action plans, care notes, and meetings
 * for supporting learners with their families and educators.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from 'dotenv';

import { careTeamRoutes } from './routes/care-team.js';
import { actionPlanRoutes } from './routes/action-plans.js';
import { actionPlanTaskRoutes } from './routes/action-plan-tasks.js';
import { careNoteRoutes } from './routes/care-notes.js';
import { careMeetingRoutes } from './routes/meetings.js';
import { prisma } from './db/prisma.js';

// Load environment variables
config();

const PORT = Number(process.env.PORT) || 3020;
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', service: 'collaboration-svc' };
});

// Readiness check (includes DB connection)
fastify.get('/ready', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', service: 'collaboration-svc' };
  } catch {
    throw new Error('Database not ready');
  }
});

// API version prefix
fastify.register(
  async (app) => {
    // Register all routes
    await app.register(careTeamRoutes);
    await app.register(actionPlanRoutes);
    await app.register(actionPlanTaskRoutes);
    await app.register(careNoteRoutes);
    await app.register(careMeetingRoutes);
  },
  { prefix: '/api/v1' }
);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  // Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.issues,
    });
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return reply.status(409).send({ error: 'Resource already exists' });
    }
    if (prismaError.code === 'P2025') {
      return reply.status(404).send({ error: 'Resource not found' });
    }
  }

  // Default error response
  return reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal server error',
  });
});

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Collaboration service listening on ${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

export default fastify;
