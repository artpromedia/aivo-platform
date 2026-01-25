/**
 * Prisma Client for Billing Service
 */

import { PrismaClient } from '@prisma/client';

import { config } from './config.js';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('📦 Billing database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📦 Billing database disconnected');
}
