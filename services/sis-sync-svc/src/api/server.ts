/**
 * SIS Sync Service - Main Entry Point
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyPluginAsync } from 'fastify';

import { DeviceSyncService, deviceSyncRoutes, deviceSyncAuthMiddleware } from '../modules/device-sync/index.js';
import type { ExtendedPrismaClient } from '../prisma-types.js';
import { PrismaClient as BasePrismaClient } from '../prisma.js';
import { registerSyncRoutes } from '../routes/sync-routes.js';
import { SyncScheduler } from '../scheduler/index.js';

import { registerOAuthRoutes } from './oauth.js';
import { registerRoutes } from './routes.js';

export async function createServer() {
  const prisma = new BasePrismaClient() as unknown as ExtendedPrismaClient;
  
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.dataIngestion('sis-sync-svc'));

  // Initialize scheduler
  const scheduler = new SyncScheduler(prisma, {
    autoStart: process.env.NODE_ENV !== 'test',
    maxConcurrentSyncs: Number.parseInt(process.env.MAX_CONCURRENT_SYNCS || '2', 10),
    lockTimeout: Number.parseInt(process.env.SYNC_LOCK_TIMEOUT || '1800000', 10),
  });

  // Register routes
  registerRoutes(app, prisma, scheduler);
  
  // Register delta-sync / webhook / sync-status routes
  await registerSyncRoutes(app, prisma);
  
  // Register OAuth routes for Google/Microsoft SSO
  registerOAuthRoutes(app, prisma, {
    baseUrl: process.env.BASE_URL || 'http://localhost:4016',
    google: process.env.GOOGLE_CLIENT_ID ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    } : undefined,
    microsoft: process.env.MICROSOFT_CLIENT_ID ? {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    } : undefined,
  });

  // Register device sync module (absorbed from sync-svc, Sprint 3)
  const deviceSyncService = new DeviceSyncService(prisma as any);
  const deviceSyncPlugin: FastifyPluginAsync = async (deviceSyncApp) => {
    await deviceSyncApp.register(deviceSyncAuthMiddleware as any);
    await deviceSyncApp.register(deviceSyncRoutes as any, { syncService: deviceSyncService });
  };
  await app.register(deviceSyncPlugin, { prefix: '/api/v1/device-sync' });

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

// Start server
createServer()
  .then(async ({ app }) => {
    const port = Number.parseInt(process.env.PORT || '4016', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    app.log.info(`SIS Sync Service running on http://${host}:${port}`);
  })
  .catch((err: unknown) => {
    console.error('sis-sync-svc fatal:', err);
    process.exit(1);
  });
