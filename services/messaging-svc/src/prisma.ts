/**
 * Prisma Client Singleton
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export enums for convenience
export {
  ConversationType,
  ParticipantRole,
  MessageType,
  MessageStatus,
} from '../generated/prisma-client/index.js';
