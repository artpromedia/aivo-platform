/**
 * AIVO Legal Hold Service - Entry Point
 *
 * Litigation hold and e-discovery management service.
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import * as notificationService from './services/notificationService.js';

async function main() {
  const app = createApp();

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

  try {
    await prisma.$connect();
    console.log('Connected to database');

    await notificationService.initNotifications();

    await app.listen({ port: config.port, host: config.host });
    console.log(`Legal Hold Service listening on ${config.host}:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
