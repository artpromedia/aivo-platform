import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';
import { logger } from './logger.js';

// Re-export Prisma namespace for type utilities
export { Prisma };
export type { PrismaClient };

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
