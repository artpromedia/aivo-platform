/**
 * Prisma Client for Payments Service
 *
 * Production-ready Prisma client initialization with:
 * - Connection pooling
 * - Query logging in development
 * - Graceful shutdown handling
 * - Error handling
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

// Create Prisma client with appropriate logging based on environment
const createPrismaClient = (): PrismaClient => {
  const isDev = process.env.NODE_ENV === 'development';

  return new PrismaClient({
    log: isDev
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
  });
};

// Singleton pattern to prevent multiple Prisma Client instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('📦 Payments database connected');
  } catch (error) {
    console.error('Failed to connect to payments database:', error);
    throw error;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📦 Payments database disconnected');
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
