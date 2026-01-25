/**
 * Prisma Client Instance
 *
 * Singleton instance for database access.
 * Re-exports types and enums from generated Prisma client.
 */

import { PrismaClient } from './generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

// Re-export types
export type {
  Curriculum,
  CurriculumUnit,
  Lesson,
  StandardAlignment,
  UnitResource,
  LessonContentLink,
  PacingGuide,
  TeacherCurriculumProgress,
} from './generated/prisma-client/index.js';

// Re-export enums
export {
  CurriculumStandard,
  GradeBand,
  SubjectArea,
  UnitStatus,
} from './generated/prisma-client/index.js';

// Re-export Prisma namespace for InputJsonValue and other utilities
export { Prisma, PrismaClient } from './generated/prisma-client/index.js';
