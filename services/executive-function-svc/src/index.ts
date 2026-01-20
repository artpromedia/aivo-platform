/**
 * Executive Function Service
 * Comprehensive executive function support including task management,
 * visual schedules, planning assistance, and EF strategy recommendations.
 */

import cors from '@fastify/cors';
import Fastify from 'fastify';
import 'dotenv/config';

import { connectDatabase, disconnectDatabase } from './db.js';
import { analyticsRoutes } from './routes/analytics.js';
import { profileRoutes } from './routes/profile.js';
import { schedulesRoutes } from './routes/schedules.js';
import { strategiesRoutes } from './routes/strategies.js';
import { tasksRoutes } from './routes/tasks.js';

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

  // Health checks
  app.get('/health', async () => ({ status: 'ok', service: 'executive-function-svc' }));
  app.get('/ready', async () => {
    try {
      await connectDatabase();
      return { status: 'ready', service: 'executive-function-svc' };
    } catch (error) {
      return { status: 'not_ready', error: 'Database connection failed' };
    }
  });

  // Register routes
  await app.register(profileRoutes, { prefix: '/profile' });
  await app.register(tasksRoutes, { prefix: '/tasks' });
  await app.register(schedulesRoutes, { prefix: '/schedules' });
  await app.register(strategiesRoutes, { prefix: '/strategies' });
  await app.register(analyticsRoutes, { prefix: '/analytics' });

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
    app.log.info(`Executive Function Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
