/**
 * Gradebook Service Entry Point
 */

import { PrismaClient } from './generated/prisma-client/index.js';
import { createApp } from './app.js';
import { config } from './config.js';

const prisma = new PrismaClient();
const PORT = config.port;

try {
  // Connect to database
  await prisma.$connect();
  console.log('Connected to database');

  // Create and start Express app
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Gradebook service listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');

    server.close(async () => {
      await prisma.$disconnect();
      console.log('Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
