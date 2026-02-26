import {
  PrismaClient,
  Prisma,
  TutorSubject,
  SessionStatus,
  MessageRole,
  EmotionType,
} from '../generated/prisma-client/index.js';

import { config } from './config.js';

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});

export { Prisma, TutorSubject, SessionStatus, MessageRole, EmotionType };
export type { PrismaClient };
