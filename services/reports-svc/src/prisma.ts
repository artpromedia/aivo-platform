/**
 * AIVO Reports Service - Prisma Client
 *
 * Database client singleton for report history and scheduling.
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export { Prisma };
export type { PrismaClient };

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
});
