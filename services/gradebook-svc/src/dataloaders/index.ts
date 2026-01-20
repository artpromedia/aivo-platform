/**
 * Gradebook Service DataLoaders
 *
 * Provides batched, cached data loading for gradebook entities.
 * Addresses P1: N+1 Query Prevention for gradebook-svc.
 *
 * @module gradebook-svc/dataloaders
 */

import {
  createIdLoader,
  createRelationLoader,
  type DataLoader,
} from '@aivo/ts-api-utils';

// Note: This service uses Express, so we import prisma differently
// Import path will depend on actual prisma setup
import { PrismaClient } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GradebookDataLoaders {
  /** Load grade entries by ID */
  gradeEntryById: DataLoader<string, GradeEntryEntity>;
  /** Load grades by learner ID (returns array) */
  gradesByLearnerId: DataLoader<string, GradeEntryEntity[]>;
  /** Load grades by assignment ID (returns array) */
  gradesByAssignmentId: DataLoader<string, GradeEntryEntity[]>;
  /** Load gradebook by class ID */
  gradebookByClassId: DataLoader<string, GradebookEntity>;
  /** Load categories by gradebook ID (returns array) */
  categoriesByGradebookId: DataLoader<string, CategoryEntity[]>;
  /** Load final grades by learner ID (returns array) */
  finalGradesByLearnerId: DataLoader<string, FinalGradeEntity[]>;
}

interface GradeEntryEntity {
  id: string;
  tenantId: string;
  learnerId: string;
  assignmentId: string;
  classId: string;
  categoryId: string | null;
  pointsEarned: number | null;
  pointsPossible: number;
  percentage: number | null;
  letterGrade: string | null;
  isExcused: boolean;
  isMissing: boolean;
  gradedAt: Date | null;
  gradedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GradebookEntity {
  id: string;
  tenantId: string;
  classId: string;
  gradingPeriodId: string | null;
  gradingScale: object;
  settings: object;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryEntity {
  id: string;
  gradebookId: string;
  name: string;
  weight: number;
  dropLowest: number;
  isDefault: boolean;
  orderIndex: number;
}

interface FinalGradeEntity {
  id: string;
  learnerId: string;
  classId: string;
  gradingPeriodId: string;
  percentage: number;
  letterGrade: string;
  calculatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create DataLoaders for gradebook service.
 * Call once per request to ensure request-scoped caching.
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID for tenant-scoped queries (required for security)
 * @returns Object containing all gradebook DataLoaders
 *
 * @example
 * ```typescript
 * // In Express middleware
 * app.use((req, res, next) => {
 *   const tenantId = req.user?.tenantId;
 *   if (tenantId) {
 *     req.loaders = createGradebookDataLoaders(prisma, tenantId);
 *   }
 *   next();
 * });
 *
 * // In route handler - batch load grades for a class roster
 * const grades = await Promise.all(
 *   learnerIds.map(id => req.loaders.gradesByLearnerId.load(id))
 * );
 * ```
 */
export function createGradebookDataLoaders(
  prisma: PrismaClient,
  tenantId: string
): GradebookDataLoaders {
  return {
    /**
     * Load grade entries by ID with tenant scoping
     */
    gradeEntryById: createIdLoader<string, GradeEntryEntity>(
      async (ids: string[]) => {
        return prisma.gradeEntry.findMany({
          where: {
            id: { in: ids },
            tenantId,
          },
        }) as Promise<GradeEntryEntity[]>;
      },
      { name: 'GradeEntryByIdLoader' }
    ),

    /**
     * Load all grades for a learner (one-to-many)
     */
    gradesByLearnerId: createRelationLoader<GradeEntryEntity>(
      async (learnerIds: string[]) => {
        return prisma.gradeEntry.findMany({
          where: {
            learnerId: { in: learnerIds },
            tenantId,
          },
          orderBy: { createdAt: 'desc' },
        }) as Promise<GradeEntryEntity[]>;
      },
      (grade) => grade.learnerId,
      { name: 'GradesByLearnerLoader' }
    ),

    /**
     * Load all grades for an assignment (one-to-many)
     */
    gradesByAssignmentId: createRelationLoader<GradeEntryEntity>(
      async (assignmentIds: string[]) => {
        return prisma.gradeEntry.findMany({
          where: {
            assignmentId: { in: assignmentIds },
            tenantId,
          },
        }) as Promise<GradeEntryEntity[]>;
      },
      (grade) => grade.assignmentId,
      { name: 'GradesByAssignmentLoader' }
    ),

    /**
     * Load gradebook by class ID
     */
    gradebookByClassId: createIdLoader<string, GradebookEntity>(
      async (classIds: string[]) => {
        const gradebooks = await prisma.gradebook.findMany({
          where: {
            classId: { in: classIds },
            tenantId,
          },
        });

        // Map results by classId for correct ordering
        const gradebookMap = new Map(gradebooks.map((g) => [g.classId, g]));
        return classIds.map((classId) => gradebookMap.get(classId) ?? null);
      },
      { name: 'GradebookByClassLoader' }
    ),

    /**
     * Load categories for gradebooks (one-to-many)
     */
    categoriesByGradebookId: createRelationLoader<CategoryEntity>(
      async (gradebookIds: string[]) => {
        return prisma.gradeCategory.findMany({
          where: { gradebookId: { in: gradebookIds } },
          orderBy: { orderIndex: 'asc' },
        }) as Promise<CategoryEntity[]>;
      },
      (cat) => cat.gradebookId,
      { name: 'CategoriesByGradebookLoader' }
    ),

    /**
     * Load final grades for learners (one-to-many)
     */
    finalGradesByLearnerId: createRelationLoader<FinalGradeEntity>(
      async (learnerIds: string[]) => {
        return prisma.finalGrade.findMany({
          where: { learnerId: { in: learnerIds } },
          orderBy: { calculatedAt: 'desc' },
        }) as Promise<FinalGradeEntity[]>;
      },
      (grade) => grade.learnerId,
      { name: 'FinalGradesByLearnerLoader' }
    ),
  };
}

export type { DataLoader };
