import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

// Re-export Prisma namespace for types
export { Prisma };
export type { PrismaClient };

// Re-export enums from schema
export {
  SessionType,
  SessionOrigin,
  SessionEventType,
  Subject,
  GradeBand,
  SubmissionStatus,
} from '../generated/prisma-client/index.js';

// Prisma singleton instance
export const prisma = new PrismaClient();
