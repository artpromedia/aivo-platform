/**
 * Gradebook Service Entry Point
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

import { createApp } from './app.js';
import { config } from './config.js';

const prisma = new PrismaClient();
const PORT = parseInt(config.port, 10);

try {
  // Connect to database
  await prisma.$connect();
  console.log('Connected to database');

  // Create and start Fastify app
  const app = createApp();

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Gradebook service listening on port ${PORT}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await app.close();
    await prisma.$disconnect();
    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
