import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

export type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
