/**
 * AIVO Event Collector Service - Prisma Client
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

// Re-export Prisma namespace for type imports
export { Prisma };

import { config } from './config.js';

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
