/**
 * Prisma Client Singleton
 */

import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export Prisma namespace for types
export { Prisma };

// Re-export enums for convenience
export {
  ConversationType,
  ParticipantRole,
  MessageType,
  MessageStatus,
  ContextType,
} from '../generated/prisma-client/index.js';
