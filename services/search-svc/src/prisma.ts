import {
  PrismaClient,
  Prisma,
  IndexStatus,
  DocumentStatus,
  SearchEngine,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

export { Prisma, IndexStatus, DocumentStatus, SearchEngine };
export type { PrismaClient };
