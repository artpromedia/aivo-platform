/**
 * Embedded Tools Service - Entry Point
 *
 * Service for managing embedded third-party learning tools
 * with COPPA/FERPA-compliant sandboxing and session management.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { config } from './config.js';
import { prisma } from './prisma.js';
import {
  sessionRoutes,
  eventsRoutes,
  embedRoutes,
  adminRoutes,
} from './routes/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// Server Configuration
// ══════════════════════════════════════════════════════════════════════════════

const server = Fastify({
  logger: {
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// Plugins
// ══════════════════════════════════════════════════════════════════════════════

// CORS configuration
await server.register(cors, {
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
});

// Security headers
await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", '*'], // Allow embedding tools
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for embed frame
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", '*'], // Tools may need various APIs
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding
  crossOriginOpenerPolicy: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════════════════════════════════════

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'embedded-tools-svc', timestamp: new Date().toISOString() };
});

// Readiness check (includes DB connectivity)
server.get('/ready', async (request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', database: 'connected' };
  } catch (error) {
    return reply.status(503).send({
      status: 'not ready',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
await server.register(sessionRoutes, { prefix: '/api/sessions' });
await server.register(eventsRoutes, { prefix: '/api/events' });
await server.register(embedRoutes, { prefix: '/embed' });
await server.register(adminRoutes, { prefix: '/api/admin' });

// ══════════════════════════════════════════════════════════════════════════════
// Error Handling
// ══════════════════════════════════════════════════════════════════════════════

server.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  // Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      error: 'Validation Error',
      details: JSON.parse(error.message),
    });
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code: string };
    if (prismaError.code === 'P2025') {
      return reply.status(404).send({ error: 'Record not found' });
    }
    if (prismaError.code === 'P2002') {
      return reply.status(409).send({ error: 'Record already exists' });
    }
  }

  // Generic error
  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    error: config.nodeEnv === 'production' ? 'Internal Server Error' : error.message,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Graceful Shutdown
// ══════════════════════════════════════════════════════════════════════════════

const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await server.close();
    await prisma.$disconnect();
    server.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    server.log.error(error, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ══════════════════════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════════════════════

const start = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    server.log.info('Connected to database');

    // Start server
    await server.listen({ port: config.port, host: '0.0.0.0' });
    server.log.info(`Embedded Tools Service running on port ${config.port}`);
  } catch (error) {
    server.log.error(error, 'Failed to start server');
    process.exit(1);
  }
};

start();

export { server };
