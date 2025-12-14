/**
 * SIS Sync Service - Main Entry Point
 */

import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerRoutes } from './routes';
import { registerOAuthRoutes } from './oauth';
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
    maxConcurrentSyncs: Number.parseInt(process.env.MAX_CONCURRENT_SYNCS || '2', 10),
    lockTimeout: Number.parseInt(process.env.SYNC_LOCK_TIMEOUT || '1800000', 10),
  });

  // Register routes
  registerRoutes(app, prisma, scheduler);
  
  // Register OAuth routes for Google/Microsoft SSO
  registerOAuthRoutes(app, prisma);

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
  void createServer().then(async ({ app }) => {
    const port = Number.parseInt(process.env.PORT || '3000', 10);
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
