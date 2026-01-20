/**
 * Speech Therapy Service
 * Comprehensive speech therapy session management, goal tracking,
 * recording analysis, and home practice features.
 */

import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import 'dotenv/config';

import { connectDatabase, disconnectDatabase, prisma } from './db.js';
import { gamificationRoutes } from './routes/gamification.js';
import { goalsRoutes } from './routes/goals.js';
import { homePracticeRoutes } from './routes/home-practice.js';
import { recordingsRoutes } from './routes/recordings.js';
import { reportsRoutes } from './routes/reports.js';
import { sessionsRoutes } from './routes/sessions.js';
import { initializeGamificationService } from './services/speech-gamification.service.js';

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
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio files
  });

  // Health checks
  app.get('/health', async () => ({ status: 'ok', service: 'speech-therapy-svc' }));
  app.get('/ready', async () => {
    try {
      await connectDatabase();
      return { status: 'ready', service: 'speech-therapy-svc' };
    } catch (_error) {
      return { status: 'not_ready', error: 'Database connection failed' };
    }
  });

  // Register routes
  await app.register(goalsRoutes, { prefix: '/goals' });
  await app.register(sessionsRoutes, { prefix: '/sessions' });
  await app.register(recordingsRoutes, { prefix: '/recordings' });
  await app.register(homePracticeRoutes, { prefix: '/home-practice' });
  await app.register(reportsRoutes, { prefix: '/reports' });
  await app.register(gamificationRoutes, { prefix: '/gamification' });

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
    initializeGamificationService(prisma);
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Speech Therapy Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
