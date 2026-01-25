/**
 * AIVO Model Registry Service - Prisma Client
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export { Prisma };

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});
