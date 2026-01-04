/**
 * Curriculum Service
 * Comprehensive curriculum management including curriculum creation,
 * unit/lesson organization, standards alignment, pacing guides, and teacher progress tracking.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

import { connectDatabase, disconnectDatabase } from './db.js';
import { curriculaRoutes } from './routes/curricula.js';
import { unitsRoutes } from './routes/units.js';
import { lessonsRoutes } from './routes/lessons.js';
import { standardsRoutes } from './routes/standards.js';
import { pacingRoutes } from './routes/pacing.js';
import { progressRoutes } from './routes/progress.js';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
};

async function main() {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  await app.register(cors, { origin: true, credentials: true });

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
