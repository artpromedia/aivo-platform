/**
 * Realtime Service Entry Point
 *
 * Production-ready WebSocket service for real-time collaboration.
 */

import { config } from './config.js';
import { buildApp, AppServices } from './app.js';
import { closeRedisConnections } from './redis/index.js';

let services: AppServices | null = null;

async function main() {
  console.log('[Realtime] Starting service...');

  const { app, services: appServices } = await buildApp();
  services = appServices;

  // Start the server
  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`[Realtime] Service running on port ${config.port}`);
  console.log(`[Realtime] Environment: ${config.nodeEnv}`);
  console.log(`[Realtime] Max connections per pod: ${config.maxConnectionsPerPod}`);
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[Realtime] Received ${signal}, shutting down gracefully...`);

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

  console.log('[Realtime] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((error: unknown) => {
  console.error('[Realtime] Failed to start:', error);
  process.exit(1);
});
