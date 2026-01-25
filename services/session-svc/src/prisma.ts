/**
 * Prisma client singleton for session-svc
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Re-export types for convenience
export type {
  Session,
  SessionEvent,
  SessionPlan,
  SessionRoutine,
  SessionPredictabilityLog,
  SessionStructureTemplate,
  VisualSchedule,
  ScheduleTemplate,
  SchedulePreferences,
  PredictabilityPreferences,
  TransitionPreferences,
  TransitionRoutine,
} from '../generated/prisma-client/index.js';

// Re-export enums
export {
  SessionType,
  SessionOrigin,
  SessionEventType,
  RoutineType,
  PredictabilityEventType,
  ScheduleType,
  ScheduleDisplayStyle,
  TransitionOutcome,
  VisualWarningStyle,
  TransitionColorScheme,
  AudioWarningType,
} from '../generated/prisma-client/index.js';

// Re-export PrismaClient type
export type { PrismaClient } from '../generated/prisma-client/index.js';
