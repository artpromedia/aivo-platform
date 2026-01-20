/**
 * Professional Development Service
 * Comprehensive PD program management, enrollment tracking,
 * compliance monitoring, and certification management.
 */

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import 'dotenv/config';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { connectDatabase, disconnectDatabase } from './db.js';
import { activitiesRoutes } from './routes/activities.js';
import { certificationsRoutes } from './routes/certifications.js';
import { complianceRoutes } from './routes/compliance.js';
import { enrollmentsRoutes } from './routes/enrollments.js';
import { programsRoutes } from './routes/programs.js';
import { reportsRoutes } from './routes/reports.js';
import { requirementsRoutes } from './routes/requirements.js';

const config = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
};

async function main() {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, FastifyRateLimitPresets.publicApi('professional-dev-svc'));

  // Health checks
  app.get('/health', async () => ({ status: 'ok', service: 'professional-dev-svc' }));
  app.get('/ready', async () => {
    try {
      await connectDatabase();
      return { status: 'ready', service: 'professional-dev-svc' };
    } catch (error) {
      return { status: 'not_ready', error: 'Database connection failed' };
    }
  });

  // Register routes
  await app.register(programsRoutes, { prefix: '/programs' });
  await app.register(enrollmentsRoutes, { prefix: '/enrollments' });
  await app.register(requirementsRoutes, { prefix: '/requirements' });
  await app.register(complianceRoutes, { prefix: '/compliance' });
  await app.register(certificationsRoutes, { prefix: '/certifications' });
  await app.register(reportsRoutes, { prefix: '/reports' });
  await app.register(activitiesRoutes, { prefix: '/activities' });

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
    app.log.info(`Professional Development Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
