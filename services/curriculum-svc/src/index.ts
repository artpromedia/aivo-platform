/**
 * Curriculum Service
 * Comprehensive curriculum management including curriculum creation,
 * unit/lesson organization, standards alignment, pacing guides, and teacher progress tracking.
 */

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import 'dotenv/config';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { connectDatabase, disconnectDatabase } from './db.js';
import { curriculaRoutes } from './routes/curricula.js';
import { lessonsRoutes } from './routes/lessons.js';
import { pacingRoutes } from './routes/pacing.js';
import { progressRoutes } from './routes/progress.js';
import { standardsRoutes } from './routes/standards.js';
import { unitsRoutes } from './routes/units.js';

const config = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
};

async function main() {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(cors as any, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.content('curriculum-svc'));

  // Health checks
  app.get('/health', async () => ({ status: 'ok', service: 'curriculum-svc' }));
  app.get('/ready', async () => {
    try {
      await connectDatabase();
      return { status: 'ready', service: 'curriculum-svc' };
    } catch (error) {
      return { status: 'not_ready', error: 'Database connection failed' };
    }
  });

  // Register routes
  await app.register(curriculaRoutes, { prefix: '/curricula' });
  await app.register(unitsRoutes, { prefix: '/units' });
  await app.register(lessonsRoutes, { prefix: '/lessons' });
  await app.register(standardsRoutes, { prefix: '/standards' });
  await app.register(pacingRoutes, { prefix: '/pacing' });
  await app.register(progressRoutes, { prefix: '/progress' });

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down...`);
      await app.close();
      await disconnectDatabase();
      process.exit(0);
    });
  });

  try {
    await connectDatabase();
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Curriculum Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
