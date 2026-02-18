/**
 * AIVO Audit Service - Entry Point
 *
 * Immutable audit logging service for compliance and security.
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { startEventConsumer, stopEventConsumer } from './consumers/eventConsumer.js';
import { startEscalationScheduler, stopEscalationScheduler } from './schedulers/correction-escalation.js';
import { registerWormMiddleware } from './services/wormService.js';

async function main() {
  const app = createApp();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      stopEscalationScheduler();
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
    // Register WORM (Write Once Read Many) enforcement on audit logs
    registerWormMiddleware();
    app.log.info('WORM storage enforcement enabled for audit logs');

    // Start event consumer for capturing audit events from other services
    await startEventConsumer();

    // Start FERPA correction request escalation scheduler (daily check)
    startEscalationScheduler(app.log);

    await app.listen({ port: config.port, host: config.host });
    app.log.info(`audit-svc running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
