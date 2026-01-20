/**
 * Gradebook Zod Schemas
 *
 * Validation schemas for gradebook-related endpoints
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Non-empty string schema
 */
export const nonEmptyString = z.string().min(1, 'Field cannot be empty');

// ============================================================================
// Params Schemas
// ============================================================================

/**
 * Schema for classroom ID parameter
 */
export const classroomIdParamsSchema = z.object({
  classroomId: uuidSchema,
});

/**
 * Schema for generic ID parameter
 */
export const idParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema for student and classroom params
 */
export const studentClassroomParamsSchema = z.object({
  studentId: uuidSchema,
  classroomId: uuidSchema,
});

// ============================================================================
// Gradebook Config Schemas
// ============================================================================

/**
 * Grade calculation type enum
 */
export const gradeCalculationTypeSchema = z.enum([
  'TOTAL_POINTS',
  'WEIGHTED_CATEGORIES',
]);

/**
 * Letter grade scale schema
 */
export const letterGradeScaleSchema = z.record(z.string(), z.number()).optional();

/**
 * Create/update gradebook config body schema
 */
export const upsertGradebookConfigBodySchema = z.object({
  classroomId: uuidSchema,
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  calculationType: gradeCalculationTypeSchema.optional(),
  letterGradeScale: letterGradeScaleSchema,
  roundingMode: z.enum(['UP', 'DOWN', 'HALF_UP', 'HALF_DOWN']).optional(),
  showLetterGrades: z.boolean().optional(),
  showPercentages: z.boolean().optional(),
  allowExtraCredit: z.boolean().optional(),
});

// ============================================================================
// Category Schemas
// ============================================================================

/**
 * Create category body schema
 */
export const createCategoryBodySchema = z.object({
  gradebookConfigId: uuidSchema,
  name: nonEmptyString.max(100, 'Category name must be 100 characters or less'),
  weight: z.number().min(0, 'Weight must be non-negative').max(100, 'Weight cannot exceed 100'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').optional(),
  dropLowest: z.number().int().min(0, 'Drop lowest must be non-negative').optional(),
  orderIndex: z.number().int().min(0).optional(),
});

/**
 * Update category weights body schema
 */
export const updateCategoryWeightsBodySchema = z.object({
  categories: z.array(
    z.object({
      id: uuidSchema,
      weight: z.number().min(0, 'Weight must be non-negative').max(100, 'Weight cannot exceed 100'),
    })
  ).min(1, 'At least one category is required'),
});

// ============================================================================
// Assignment Schemas
// ============================================================================

/**
 * Assignment type enum
 */
export const assignmentTypeSchema = z.enum([
  'HOMEWORK',
  'QUIZ',
  'TEST',
  'PROJECT',
  'LAB',
  'ESSAY',
  'PRESENTATION',
  'PARTICIPATION',
  'EXTRA_CREDIT',
  'OTHER',
]);

/**
 * Create assignment body schema
 */
export const createAssignmentBodySchema = z.object({
  gradebookConfigId: uuidSchema,
  categoryId: uuidSchema.optional(),
  title: nonEmptyString.max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  type: assignmentTypeSchema,
  totalPoints: z.number().positive('Total points must be positive'),
  extraCredit: z.boolean().optional(),
  dueDate: z.coerce.date().optional(),
  assignedDate: z.coerce.date().optional(),
  availableFrom: z.coerce.date().optional(),
  availableUntil: z.coerce.date().optional(),
  allowLateSubmissions: z.boolean().optional(),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  assessmentId: uuidSchema.optional(),
  createdBy: uuidSchema,
});

/**
 * Update assignment body schema
 */
export const updateAssignmentBodySchema = z.object({
  categoryId: uuidSchema.optional(),
  title: nonEmptyString.max(200).optional(),
  description: z.string().max(2000).optional(),
  type: assignmentTypeSchema.optional(),
  totalPoints: z.number().positive().optional(),
  extraCredit: z.boolean().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assignedDate: z.coerce.date().optional().nullable(),
  availableFrom: z.coerce.date().optional().nullable(),
  availableUntil: z.coerce.date().optional().nullable(),
  allowLateSubmissions: z.boolean().optional(),
  latePenaltyPercent: z.number().min(0).max(100).optional().nullable(),
});

// ============================================================================
// Grade Schemas
// ============================================================================

/**
 * Grade status enum
 */
export const gradeStatusSchema = z.enum([
  'NOT_SUBMITTED',
  'SUBMITTED',
  'GRADED',
  'RETURNED',
  'EXCUSED',
  'MISSING',
  'LATE',
]);

/**
 * Submit grade body schema
 */
export const submitGradeBodySchema = z.object({
  gradeId: uuidSchema.optional(),
  assignmentId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
  score: z.number().nullable().optional(),
  status: gradeStatusSchema.optional(),
  feedback: z.string().max(5000, 'Feedback must be 5000 characters or less').optional(),
  privateNotes: z.string().max(2000, 'Private notes must be 2000 characters or less').optional(),
  rubricScores: z.record(z.string(), z.number()).optional(),
  gradedBy: uuidSchema,
  overrideReason: z.string().max(500, 'Override reason must be 500 characters or less').optional(),
});

/**
 * Update grade params schema
 */
export const gradeIdParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Update grade body schema
 */
export const updateGradeBodySchema = z.object({
  score: z.number().nullable().optional(),
  status: gradeStatusSchema.optional(),
  feedback: z.string().max(5000).optional(),
  privateNotes: z.string().max(2000).optional(),
  rubricScores: z.record(z.string(), z.number()).optional(),
  gradedBy: uuidSchema,
  overrideReason: z.string().max(500).optional(),
});

// ============================================================================
// Bulk Import Schema
// ============================================================================

/**
 * Bulk import grades body schema
 */
export const bulkImportGradesBodySchema = z.object({
  assignmentId: uuidSchema,
  grades: z.array(
    z.object({
      studentId: uuidSchema,
      score: z.number().nullable(),
      feedback: z.string().max(5000).optional(),
    })
  ).min(1, 'At least one grade is required'),
  importedBy: uuidSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type ClassroomIdParams = z.infer<typeof classroomIdParamsSchema>;
export type IdParams = z.infer<typeof idParamsSchema>;
export type StudentClassroomParams = z.infer<typeof studentClassroomParamsSchema>;
export type UpsertGradebookConfigBody = z.infer<typeof upsertGradebookConfigBodySchema>;
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryWeightsBody = z.infer<typeof updateCategoryWeightsBodySchema>;
export type CreateAssignmentBody = z.infer<typeof createAssignmentBodySchema>;
export type UpdateAssignmentBody = z.infer<typeof updateAssignmentBodySchema>;
export type SubmitGradeBody = z.infer<typeof submitGradeBodySchema>;
export type GradeIdParams = z.infer<typeof gradeIdParamsSchema>;
export type UpdateGradeBody = z.infer<typeof updateGradeBodySchema>;
export type BulkImportGradesBody = z.infer<typeof bulkImportGradesBodySchema>;
