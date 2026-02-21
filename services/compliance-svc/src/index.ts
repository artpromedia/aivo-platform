/**
 * AIVO Compliance Service - Entry Point
 *
 * Unified compliance service: core monitoring, COPPA/consent,
 * legal-hold management, and Data Subject Requests (DSR).
 */

import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config.js';
import { closePool, getPool } from './modules/shared/db.js';
import { createDsrWorker } from './modules/dsr/worker.js';
import { startGracePeriodScheduler, stopGracePeriodScheduler } from './modules/dsr/scheduler.js';
import { prisma } from './prisma.js';

async function main() {
  const app = createApp();
  const pool = getPool();

  // Start DSR background worker
  const dsrWorker = createDsrWorker(pool);
  dsrWorker.start();

  // Start DSR grace-period scheduler
  startGracePeriodScheduler(pool);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    try {
      dsrWorker.stop();
      stopGracePeriodScheduler();
      await app.close();
      await prisma.$disconnect();
      await closePool();
      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Connect to database
  try {
    await prisma.$connect();
    console.log('Connected to database');
  } catch (error) {
    console.error('Failed to connect to database (will retry on first request):', error);
  }

  // Start server
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Compliance service listening on ${config.host}:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    await closePool();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
