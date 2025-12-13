/**
 * Prisma Client Instance for Focus Service
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

export type {
  LearnerFocusState,
  FocusPingLog,
  FocusIntervention,
  BreakSession,
  DailyFocusSummary,
} from '../generated/prisma-client/index.js';

export {
  FocusState,
  InterventionType,
  FocusLossReason,
} from '../generated/prisma-client/index.js';
