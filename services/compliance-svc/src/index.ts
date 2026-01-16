/**
 * AIVO Compliance Service - Entry Point
 *
 * Multi-framework compliance monitoring and dashboard.
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

async function main() {
  const app = createApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    try {
      await app.close();
      await prisma.$disconnect();
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
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  // Start server
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Compliance service listening on ${config.host}:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
