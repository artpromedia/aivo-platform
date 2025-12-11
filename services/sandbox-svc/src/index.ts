/**
 * Sandbox Service
 * 
 * Provides sandbox environment management for partner developers:
 * - Partner registration and approval
 * - Sandbox tenant provisioning
 * - Synthetic data generation
 * - API key management
 * - Usage tracking
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { partnerRoutes } from './routes/partners.js';
import { tenantRoutes } from './routes/tenants.js';
import { publicApiRoutes } from './routes/public-api.js';
import { webhookRoutes } from './routes/webhooks.js';
import { adminRoutes } from './routes/admin.js';

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty' } 
      : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Decorate with Prisma
fastify.decorate('prisma', prisma);

// Register routes
await fastify.register(partnerRoutes, { prefix: '/api/partners' });
await fastify.register(tenantRoutes, { prefix: '/api/tenants' });
await fastify.register(publicApiRoutes, { prefix: '/api/public/v1' });
await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'sandbox-svc' };
});

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Start server
const start = async () => {
  try {
    await prisma.$connect();
    const port = parseInt(process.env.PORT ?? '3011', 10);
    const host = process.env.HOST ?? '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Sandbox service running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify, prisma };
