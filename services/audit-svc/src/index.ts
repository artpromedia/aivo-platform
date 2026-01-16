/**
 * AIVO Audit Service - Entry Point
 *
 * Immutable audit logging service for compliance and security.
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { startEventConsumer, stopEventConsumer } from './consumers/eventConsumer.js';

async function main() {
  const app = createApp();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await stopEventConsumer();
      await app.close();
      await prisma.$disconnect();
      app.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    // Start event consumer for capturing audit events from other services
    await startEventConsumer();

    await app.listen({ port: config.port, host: config.host });
    app.log.info(`audit-svc running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
