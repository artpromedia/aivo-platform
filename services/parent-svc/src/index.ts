/**
 * Parent Service Entry Point
 *
 * Provides parent engagement functionality including:
 * - Parent account management and student linkage
 * - Progress visibility and weekly summaries
 * - Parent-teacher secure messaging
 * - Consent management (COPPA/FERPA)
 * - Multi-language support
 */

import { logger } from '@aivo/ts-observability';

import { buildApp } from './app.js';
import { config } from './config.js';
import { disconnectDatabase } from './prisma/prisma.service.js';

async function start() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Received shutdown signal');
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    const port = config.port || 3010;
    await app.listen({ port, host: '0.0.0.0' });
    logger.info(
      { service: 'parent-svc', environment: config.environment },
      `Parent service running on port ${port}`
    );
  } catch (err) {
    logger.error({ error: err }, 'Failed to start parent service');
    await disconnectDatabase();
    process.exit(1);
  }
}

start();

export * from './parent/parent.service.js';
export * from './parent/parent.types.js';
export * from './messaging/messaging.service.js';
export * from './messaging/messaging.types.js';
export * from './digest/weekly-digest.service.js';
