/**
 * Experimentation Service - Application Builder
 */

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { closeConnections, checkDatabaseHealth } from './db.js';
import {
  registerExperimentRoutes,
  registerAssignmentRoutes,
  registerExposureRoutes,
} from './routes.js';

// ════════════════════════════════════════════════════════════════════════════════
// APP BUILDER
// ════════════════════════════════════════════════════════════════════════════════

export async function buildApp(): Promise<FastifyInstance> {
  const loggerConfig =
    process.env.NODE_ENV !== 'production'
      ? {
          level: process.env.LOG_LEVEL ?? 'info',
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        }
      : {
          level: process.env.LOG_LEVEL ?? 'info',
        };

  const app = Fastify({
    logger: loggerConfig,
  });

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Health check endpoints
  app.get('/health', async () => ({ status: 'ok', service: 'experimentation-svc' }));

  app.get('/health/detailed', async () => {
    const dbHealth = await checkDatabaseHealth();
    const healthy = dbHealth.main && dbHealth.policy;

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'experimentation-svc',
      databases: {
        main: dbHealth.main ? 'connected' : 'disconnected',
        warehouse: dbHealth.warehouse ? 'connected' : 'disconnected',
        policy: dbHealth.policy ? 'connected' : 'disconnected',
      },
    };
  });

  // Register routes
  await registerExperimentRoutes(app);
  await registerAssignmentRoutes(app);
  await registerExposureRoutes(app);

  return app;
}

// ════════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════════════════════

export async function gracefulShutdown(app: FastifyInstance, signal: string): Promise<void> {
  console.log(`[experimentation-svc] Received ${signal}, shutting down gracefully...`);

  try {
    await app.close();
    await closeConnections();
    console.log('[experimentation-svc] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[experimentation-svc] Error during shutdown:', error);
    process.exit(1);
  }
}
