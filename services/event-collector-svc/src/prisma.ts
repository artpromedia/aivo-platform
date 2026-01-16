/**
 * AIVO Event Collector Service - Prisma Client
 */

import { PrismaClient } from '@prisma/client';

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
