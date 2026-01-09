/**
 * Realtime Service Entry Point
 *
 * Production-ready WebSocket service for real-time collaboration.
 */

import { buildApp, type AppServices } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { closeRedisConnections } from './redis/index.js';

let services: AppServices | null = null;

async function main() {
  logger.info('Starting service...');

  const { app, services: appServices } = await buildApp();
  services = appServices;

  // Start the server
  await app.listen({ port: config.port, host: '0.0.0.0' });

  logger.info({ port: config.port, env: config.nodeEnv, maxConnections: config.maxConnectionsPerPod }, 'Service started');
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');

  if (services) {
    // Shutdown event handlers
    services.sessionEventHandler.shutdown();
    services.analyticsEventHandler.shutdown();

    // Shutdown gateway
    await services.gateway.shutdown();

    // Shutdown message broker
    await services.messageBroker.shutdown();

    // Shutdown presence service
    services.presenceService.shutdown();
  }

  // Close Redis connections
  await closeRedisConnections();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Failed to start');
  process.exit(1);
});
