/**
 * Personalization Service - Entry Point
 *
 * Starts the HTTP server for the personalization signals API.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-floating-promises */

import { config } from './config.js';
import { buildApp, gracefulShutdown } from './app.js';
import { initPools } from './db.js';

async function main(): Promise<void> {
  console.log('[personalization-svc] Starting service...');
  console.log(`[personalization-svc] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);

  try {
    // Initialize database pools
    initPools();
    console.log('[personalization-svc] Database pools initialized');

    // Build Fastify app
    const app = await buildApp();

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));

    // Start listening
    const address = await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`[personalization-svc] Server listening at ${address}`);
    console.log('[personalization-svc] Ready to serve requests');
  } catch (error) {
    console.error('[personalization-svc] Failed to start:', error);
    process.exit(1);
  }
}

main();
