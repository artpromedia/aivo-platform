import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

import type { ExtendedPrismaClient } from './prisma-types.js';

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ??
  (new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }) as unknown as ExtendedPrismaClient);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma namespace for type utilities
export { Prisma };

export type { ExtendedPrismaClient as PrismaClient };
