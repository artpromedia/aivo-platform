/**
 * Prisma Service
 *
 * Database client wrapper with connection management.
 */

import { logger } from '@aivo/ts-observability';

import { PrismaClient } from '../../generated/prisma-client/index.js';

export type PrismaService = PrismaClient;

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.warn(
      `Database connection failed - service will start without DB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

// Re-export PrismaClient type for service constructors
export type { PrismaClient };
