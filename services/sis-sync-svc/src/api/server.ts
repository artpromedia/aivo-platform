/**
 * SIS Sync Service - Main Entry Point
 */

import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerRoutes } from './routes';
import { SyncScheduler } from '../scheduler';

export async function createServer() {
  const prisma = new PrismaClient();
  
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' 
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // Initialize scheduler
  const scheduler = new SyncScheduler(prisma, {
    autoStart: process.env.NODE_ENV !== 'test',
    maxConcurrentSyncs: parseInt(process.env.MAX_CONCURRENT_SYNCS || '2'),
    lockTimeout: parseInt(process.env.SYNC_LOCK_TIMEOUT || '1800000'),
  });

  // Register routes
  registerRoutes(app, prisma, scheduler);

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    scheduler.shutdown();
    await prisma.$disconnect();
    await app.close();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Initialize scheduler on startup
  app.addHook('onReady', async () => {
    await scheduler.initialize();
    app.log.info('Scheduler initialized');
  });

  return { app, prisma, scheduler };
}

// Start server if run directly
if (require.main === module) {
  createServer().then(async ({ app }) => {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    try {
      await app.listen({ port, host });
      app.log.info(`SIS Sync Service running on http://${host}:${port}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
