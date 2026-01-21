/**
 * Assessment Service DataLoaders
 *
 * Provides batched, cached data loading for assessment entities.
 * Addresses P0: N+1 Query Prevention for assessment-svc.
 *
 * @module assessment-svc/dataloaders
 */

import {
  createIdLoader,
  createRelationLoader,
  type DataLoader,
} from '@aivo/ts-api-utils';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AssessmentDataLoaders {
  /** Load assessments by ID */
  assessmentById: DataLoader<string, AssessmentEntity>;
  /** Load questions by assessment ID (returns array) */
  questionsByAssessmentId: DataLoader<string, AssessmentQuestionEntity[]>;
  /** Load question details by ID */
  questionById: DataLoader<string, QuestionEntity>;
  /** Load attempts by assessment ID (returns array) */
  attemptsByAssessmentId: DataLoader<string, AttemptEntity[]>;
  /** Load attempts by user ID (returns array) */
  attemptsByUserId: DataLoader<string, AttemptEntity[]>;
  /** Load responses by attempt ID (returns array) */
  responsesByAttemptId: DataLoader<string, ResponseEntity[]>;
}

interface AssessmentEntity {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  totalPoints: number;
  settings: object;
  createdAt: Date;
  updatedAt: Date;
}

interface AssessmentQuestionEntity {
  id: string;
  assessmentId: string;
  questionId: string;
  orderIndex: number;
  points: number;
  required: boolean;
}

interface QuestionEntity {
  id: string;
  tenantId: string;
  type: string;
  status: string;
  subjectId: string;
  difficulty: string;
  version: number;
  authorId: string;
  createdAt: Date;
}

interface AttemptEntity {
  id: string;
  tenantId: string;
  assessmentId: string;
  userId: string;
  status: string;
  attemptNumber: number;
  startedAt: Date;
  submittedAt: Date | null;
}

interface ResponseEntity {
  id: string;
  attemptId: string;
  questionId: string;
  response: object;
  isCorrect: boolean | null;
  pointsEarned: number | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create DataLoaders for assessment service.
 * Call once per request to ensure request-scoped caching.
 *
 * @param tenantId - Tenant ID for tenant-scoped queries (required for security)
 * @returns Object containing all assessment DataLoaders
 *
 * @example
 * ```typescript
 * // In request hook
 * fastify.addHook('preHandler', async (request) => {
 *   const tenantId = request.user?.tenantId;
 *   if (tenantId) {
 *     request.loaders = createAssessmentDataLoaders(tenantId);
 *   }
 * });
 *
 * // In route handler
 * const assessment = await request.loaders.assessmentById.load(assessmentId);
 * const questions = await request.loaders.questionsByAssessmentId.load(assessmentId);
 * ```
 */
export function createAssessmentDataLoaders(tenantId: string): AssessmentDataLoaders {
  return {
    /**
     * Load assessments by ID with tenant scoping
     */
    assessmentById: createIdLoader<string, AssessmentEntity>(
      async (ids: string[]) => {
        return prisma.assessment.findMany({
          where: {
            id: { in: ids },
            tenantId,
          },
        }) as Promise<AssessmentEntity[]>;
      },
      { name: 'AssessmentByIdLoader' }
    ),

    /**
     * Load questions linked to assessments (one-to-many via junction table)
     */
    questionsByAssessmentId: createRelationLoader<AssessmentQuestionEntity>(
      async (assessmentIds: string[]) => {
        return prisma.assessmentQuestion.findMany({
          where: { assessmentId: { in: assessmentIds } },
          orderBy: { orderIndex: 'asc' },
        }) as Promise<AssessmentQuestionEntity[]>;
      },
      (aq) => aq.assessmentId,
      { name: 'QuestionsByAssessmentLoader' }
    ),

    /**
     * Load question details by ID
     */
    questionById: createIdLoader<string, QuestionEntity>(
      async (ids: string[]) => {
        return prisma.question.findMany({
          where: {
            id: { in: ids },
            tenantId,
          },
        }) as Promise<QuestionEntity[]>;
      },
      { name: 'QuestionByIdLoader' }
    ),

    /**
     * Load attempts for assessments
     */
    attemptsByAssessmentId: createRelationLoader<AttemptEntity>(
      async (assessmentIds: string[]) => {
        return prisma.attempt.findMany({
          where: { assessmentId: { in: assessmentIds } },
          orderBy: { startedAt: 'desc' },
        }) as Promise<AttemptEntity[]>;
      },
      (attempt) => attempt.assessmentId,
      { name: 'AttemptsByAssessmentLoader' }
    ),

    /**
     * Load attempts for users
     */
    attemptsByUserId: createRelationLoader<AttemptEntity>(
      async (userIds: string[]) => {
        return prisma.attempt.findMany({
          where: { userId: { in: userIds } },
          orderBy: { startedAt: 'desc' },
        }) as Promise<AttemptEntity[]>;
      },
      (attempt) => attempt.userId,
      { name: 'AttemptsByUserLoader' }
    ),

    /**
     * Load responses for attempts
     */
    responsesByAttemptId: createRelationLoader<ResponseEntity>(
      async (attemptIds: string[]) => {
        return prisma.questionResponse.findMany({
          where: { attemptId: { in: attemptIds } },
        }) as Promise<ResponseEntity[]>;
      },
      (response) => response.attemptId,
      { name: 'ResponsesByAttemptLoader' }
    ),
  };
}

export type { DataLoader } from '@aivo/ts-api-utils';
