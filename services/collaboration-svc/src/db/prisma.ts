/**
 * Prisma Client Instance for Collaboration Service
 */

import { PrismaClient } from '../../generated/prisma-client/index.js';

export { Prisma } from '../../generated/prisma-client/index.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Re-export enums
export {
  CareTeamRole,
  ActionPlanStatus,
  TaskContext,
  TaskFrequency,
  TaskCompletionStatus,
  CareNoteType,
  NoteVisibility,
  MeetingStatus,
  MeetingType,
} from '../../generated/prisma-client/index.js';

// Re-export PrismaClient type
export type { PrismaClient } from '../../generated/prisma-client/index.js';
