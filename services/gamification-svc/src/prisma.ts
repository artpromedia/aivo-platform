import { PrismaClient } from '@prisma/client';
import type { ExtendedPrismaClient } from './prisma-types';

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

export type { ExtendedPrismaClient as PrismaClient };
