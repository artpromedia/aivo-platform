/**
 * Experimentation Service - Entry Point
 */

/* eslint-disable @typescript-eslint/no-floating-promises */

import { buildApp, gracefulShutdown } from './app.js';
import { config } from './config.js';
import { initPools, getPolicyPool } from './db.js';
import { initPolicyEngine } from './policy.js';

async function main(): Promise<void> {
  console.log('[experimentation-svc] Starting service...');
  console.log(`[experimentation-svc] Environment: ${process.env.NODE_ENV ?? 'development'}`);

  try {
    // Initialize database pools
    initPools();
    console.log('[experimentation-svc] Database pools initialized');

    // Initialize policy engine
    initPolicyEngine(getPolicyPool());
    console.log('[experimentation-svc] Policy engine initialized');

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

    console.log(`[experimentation-svc] Server listening at ${address}`);
    console.log('[experimentation-svc] Ready to serve requests');
  } catch (error) {
    console.error('[experimentation-svc] Failed to start:', error);
    process.exit(1);
  }
}

main();
