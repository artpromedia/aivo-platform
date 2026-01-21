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

import type { PrismaClient } from '../../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Based on actual Prisma schema models
// ══════════════════════════════════════════════════════════════════════════════

export interface GradebookDataLoaders {
  /** Load grade by ID */
  gradeById: DataLoader<string, GradeEntity>;
  /** Load grades by student ID (returns array) */
  gradesByStudentId: DataLoader<string, GradeEntity[]>;
  /** Load grades by assignment ID (returns array) */
  gradesByAssignmentId: DataLoader<string, GradeEntity[]>;
  /** Load gradebook config by classroom ID */
  gradebookConfigByClassroomId: DataLoader<string, GradebookConfigEntity>;
  /** Load categories by gradebook config ID (returns array) */
  categoriesByGradebookConfigId: DataLoader<string, CategoryEntity[]>;
  /** Load assignments by gradebook config ID (returns array) */
  assignmentsByGradebookConfigId: DataLoader<string, AssignmentEntity[]>;
}

interface GradeEntity {
  id: string;
  assignmentId: string;
  studentId: string;
  tenantId: string;
  score: number | null;
  maxPoints: number;
  percentage: number | null;
  letterGrade: string | null;
  status: string;
  submittedAt: Date | null;
  gradedAt: Date | null;
  gradedBy: string | null;
  isLate: boolean;
  latePenalty: number | null;
  isOverride: boolean;
  overrideReason: string | null;
  originalScore: number | null;
  feedback: string | null;
  privateNotes: string | null;
  rubricScores: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface GradebookConfigEntity {
  id: string;
  tenantId: string;
  classroomId: string;
  teacherId: string;
  gradingScale: string;
  calculationType: string;
  dropLowestScores: number;
  allowLateSubmissions: boolean;
  latePenaltyPercent: number | null;
  extraCreditEnabled: boolean;
  showStudentGrades: boolean;
  showClassAverage: boolean;
  roundGrades: boolean;
  letterGradeScale: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryEntity {
  id: string;
  gradebookConfigId: string;
  name: string;
  weight: number;
  color: string | null;
  dropLowest: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AssignmentEntity {
  id: string;
  tenantId: string;
  gradebookConfigId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  totalPoints: number;
  extraCredit: boolean;
  assignedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
     * Load grade by ID with tenant scoping
     */
    gradeById: createIdLoader<string, GradeEntity>(
      async (ids: string[]) => {
        return prisma.grade.findMany({
          where: {
            id: { in: ids },
            tenantId,
          },
        }) as unknown as Promise<GradeEntity[]>;
      },
      { name: 'GradeByIdLoader' }
    ),

    /**
     * Load all grades for a student (one-to-many)
     */
    gradesByStudentId: createRelationLoader<GradeEntity>(
      async (studentIds: string[]) => {
        return prisma.grade.findMany({
          where: {
            studentId: { in: studentIds },
            tenantId,
          },
          orderBy: { createdAt: 'desc' },
        }) as unknown as Promise<GradeEntity[]>;
      },
      (grade) => grade.studentId,
      { name: 'GradesByStudentLoader' }
    ),

    /**
     * Load all grades for an assignment (one-to-many)
     */
    gradesByAssignmentId: createRelationLoader<GradeEntity>(
      async (assignmentIds: string[]) => {
        return prisma.grade.findMany({
          where: {
            assignmentId: { in: assignmentIds },
            tenantId,
          },
        }) as unknown as Promise<GradeEntity[]>;
      },
      (grade) => grade.assignmentId,
      { name: 'GradesByAssignmentLoader' }
    ),

    /**
     * Load gradebook config by classroom ID
     */
    gradebookConfigByClassroomId: createIdLoader<string, GradebookConfigEntity>(
      async (classroomIds: string[]) => {
        const configs = await prisma.gradebookConfig.findMany({
          where: {
            classroomId: { in: classroomIds },
            tenantId,
          },
        });

        // Map results by classroomId for correct ordering
        const configMap = new Map(configs.map((c) => [c.classroomId, c]));
        return classroomIds.map((id) => configMap.get(id) ?? null) as GradebookConfigEntity[];
      },
      { name: 'GradebookConfigByClassroomLoader' }
    ),

    /**
     * Load categories for gradebook configs (one-to-many)
     */
    categoriesByGradebookConfigId: createRelationLoader<CategoryEntity>(
      async (configIds: string[]) => {
        return prisma.gradeCategory.findMany({
          where: { gradebookConfigId: { in: configIds } },
          orderBy: { orderIndex: 'asc' },
        }) as unknown as Promise<CategoryEntity[]>;
      },
      (cat) => cat.gradebookConfigId,
      { name: 'CategoriesByGradebookConfigLoader' }
    ),

    /**
     * Load assignments for gradebook configs (one-to-many)
     */
    assignmentsByGradebookConfigId: createRelationLoader<AssignmentEntity>(
      async (configIds: string[]) => {
        return prisma.assignment.findMany({
          where: { gradebookConfigId: { in: configIds } },
          orderBy: { assignedDate: 'desc' },
        }) as unknown as Promise<AssignmentEntity[]>;
      },
      (assignment) => assignment.gradebookConfigId,
      { name: 'AssignmentsByGradebookConfigLoader' }
    ),
  };
}

export type { DataLoader } from '@aivo/ts-api-utils';
