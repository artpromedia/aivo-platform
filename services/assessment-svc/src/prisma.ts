import {
  PrismaClient,
  Prisma,
  AssessmentType,
  AssessmentStatus,
  Difficulty,
  QuestionType,
  AttemptStatus,
  RubricType,
  GradeReleasePolicy,
  AccommodationType,
  SecurityViolationType,
} from '../generated/prisma-client/index.js';

// Re-export PrismaClient and Prisma namespace
export { PrismaClient, Prisma };

// Re-export all enums
export {
  AssessmentType,
  AssessmentStatus,
  Difficulty,
  QuestionType,
  AttemptStatus,
  RubricType,
  GradeReleasePolicy,
  AccommodationType,
  SecurityViolationType,
};

// Re-export types
export type { Assessment, AssessmentQuestion, Question, Attempt } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

// Type for Prisma transaction client - using Omit to create a compatible type
export type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
