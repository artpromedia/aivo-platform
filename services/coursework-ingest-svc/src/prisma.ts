import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

// Re-export enums from generated Prisma client
export { IngestStatus, ContentType, SourceType } from '../generated/prisma-client/index.js';

// Re-export Prisma namespace for types
export { Prisma };

// Re-export PrismaClient type
export type { PrismaClient };

// Create and export the Prisma client instance
export const prisma = new PrismaClient();
