/**
 * AIVO Legal Hold Service - Prisma Client
 */

import { PrismaClient } from '@prisma/client';

import { config } from './config.js';

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
