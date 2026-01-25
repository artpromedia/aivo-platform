/**
 * Assessment Zod Schemas
 *
 * Validation schemas for assessment-related endpoints
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
 * Schema for assessment ID parameter
 */
export const assessmentIdParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema for question ID parameter
 */
export const questionIdParamsSchema = z.object({
  questionId: uuidSchema,
});

/**
 * Schema for submission ID parameter
 */
export const submissionIdParamsSchema = z.object({
  submissionId: uuidSchema,
});

/**
 * Schema for rubric ID parameter
 */
export const rubricIdParamsSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// Assessment Schemas
// ============================================================================

/**
 * Create assessment body schema
 */
export const createAssessmentBodySchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  title: nonEmptyString.max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  timeLimit: z.number().int().positive('Time limit must be positive').optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional(),
  showCorrectAnswers: z.boolean().optional(),
  allowRetakes: z.boolean().optional(),
  maxAttempts: z.number().int().positive('Max attempts must be positive').optional(),
  passingScore: z.number().min(0).max(100, 'Passing score must be between 0 and 100').optional(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  subjectId: uuidSchema.optional(),
  gradeLevel: z.string().max(50).optional(),
});

/**
 * Update assessment body schema
 */
export const updateAssessmentBodySchema = z.object({
  title: nonEmptyString.max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  timeLimit: z.number().int().positive().optional().nullable(),
  shuffleQuestions: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional(),
  showCorrectAnswers: z.boolean().optional(),
  allowRetakes: z.boolean().optional(),
  maxAttempts: z.number().int().positive().optional(),
  passingScore: z.number().min(0).max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  subjectId: uuidSchema.optional().nullable(),
  gradeLevel: z.string().max(50).optional().nullable(),
});

// ============================================================================
// Question Schemas
// ============================================================================

/**
 * Question type enum
 */
export const questionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
  'FILL_BLANK',
  'MATCHING',
  'ORDERING',
  'NUMERIC',
]);

/**
 * Question media schema
 */
export const questionMediaSchema = z.object({
  type: z.enum(['image', 'audio', 'video']),
  url: z.string().url('Invalid media URL'),
  alt: z.string().max(200).optional(),
}).optional();

/**
 * Multiple choice option schema
 */
export const multipleChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  media: questionMediaSchema,
});

/**
 * Add question body schema
 */
export const addQuestionBodySchema = z.object({
  type: questionTypeSchema,
  questionText: nonEmptyString.max(5000, 'Question text must be 5000 characters or less'),
  questionMedia: questionMediaSchema,
  options: z.array(multipleChoiceOptionSchema).optional(),
  correctAnswer: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.string(), z.string()),
  ]).optional(),
  acceptedAnswers: z.array(z.string().max(500)).optional(),
  points: z.number().positive('Points must be positive').optional(),
  partialCredit: z.boolean().optional(),
  explanation: z.string().max(2000, 'Explanation must be 2000 characters or less').optional(),
  hints: z.array(z.string().max(500)).max(5, 'Maximum 5 hints allowed').optional(),
  orderIndex: z.number().int().min(0),
});

/**
 * Update question body schema
 */
export const updateQuestionBodySchema = z.object({
  type: questionTypeSchema.optional(),
  questionText: nonEmptyString.max(5000).optional(),
  questionMedia: questionMediaSchema.nullable(),
  options: z.array(multipleChoiceOptionSchema).optional(),
  correctAnswer: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.string(), z.string()),
  ]).optional(),
  acceptedAnswers: z.array(z.string().max(500)).optional(),
  points: z.number().positive().optional(),
  partialCredit: z.boolean().optional(),
  explanation: z.string().max(2000).optional().nullable(),
  hints: z.array(z.string().max(500)).max(5).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

/**
 * Reorder questions body schema
 */
export const reorderQuestionsBodySchema = z.object({
  questions: z.array(
    z.object({
      id: uuidSchema,
      orderIndex: z.number().int().min(0),
    })
  ).min(1, 'At least one question is required'),
});

// ============================================================================
// Submission Schemas
// ============================================================================

/**
 * Grade submission body schema
 */
export const gradeSubmissionBodySchema = z.object({
  gradedBy: uuidSchema,
  feedback: z.string().max(5000, 'Feedback must be 5000 characters or less').optional(),
});

// ============================================================================
// Import Questions Schema
// ============================================================================

/**
 * Import questions body schema
 */
export const importQuestionsBodySchema = z.object({
  sourceAssessmentId: uuidSchema,
});

// ============================================================================
// Auto-Generate Schema
// ============================================================================

/**
 * Question bank filter schema
 */
export const questionBankFilterSchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  tags: z.array(z.string()).optional(),
  type: questionTypeSchema.optional(),
  subjectId: uuidSchema.optional(),
  gradeLevel: z.string().max(50).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

/**
 * Auto-generate assessment body schema
 */
export const autoGenerateBodySchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  title: nonEmptyString.max(200),
  filter: questionBankFilterSchema,
  questionCount: z.number().int().positive('Question count must be positive').max(100, 'Maximum 100 questions'),
  pointsPerQuestion: z.number().positive().optional(),
});

// ============================================================================
// Question Bank Schemas
// ============================================================================

/**
 * Question bank query schema
 */
export const questionBankQuerySchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  tags: z.string().optional(), // comma-separated in query
  type: questionTypeSchema.optional(),
  subjectId: uuidSchema.optional(),
  gradeLevel: z.string().max(50).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

/**
 * Add to question bank body schema
 */
export const addToQuestionBankBodySchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  type: questionTypeSchema,
  questionText: nonEmptyString.max(5000),
  questionMedia: questionMediaSchema,
  options: z.array(multipleChoiceOptionSchema).default([]),
  correctAnswer: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.string(), z.string()),
  ]).optional(),
  acceptedAnswers: z.array(z.string().max(500)).default([]),
  tags: z.array(z.string().max(50)).max(20).default([]),
  subjectId: uuidSchema.optional(),
  gradeLevel: z.string().max(50).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  isShared: z.boolean().default(false),
  sharedWith: z.array(uuidSchema).default([]),
});

// ============================================================================
// Rubric Schemas
// ============================================================================

/**
 * Rubric query schema
 */
export const rubricQuerySchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
});

/**
 * Rubric level schema
 */
export const rubricLevelSchema = z.object({
  points: z.number().min(0),
  label: nonEmptyString.max(100),
  description: z.string().max(500),
  feedback: z.string().max(500).optional(),
});

/**
 * Rubric criterion schema
 */
export const rubricCriterionSchema = z.object({
  name: nonEmptyString.max(100),
  description: z.string().max(500).optional(),
  maxPoints: z.number().positive('Max points must be positive'),
  levels: z.array(rubricLevelSchema).min(2, 'At least 2 levels required'),
});

/**
 * Create rubric body schema
 */
export const createRubricBodySchema = z.object({
  teacherId: uuidSchema,
  tenantId: uuidSchema,
  name: nonEmptyString.max(200, 'Rubric name must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  criteria: z.array(rubricCriterionSchema).min(1, 'At least one criterion is required'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AssessmentIdParams = z.infer<typeof assessmentIdParamsSchema>;
export type QuestionIdParams = z.infer<typeof questionIdParamsSchema>;
export type SubmissionIdParams = z.infer<typeof submissionIdParamsSchema>;
export type RubricIdParams = z.infer<typeof rubricIdParamsSchema>;
export type CreateAssessmentBody = z.infer<typeof createAssessmentBodySchema>;
export type UpdateAssessmentBody = z.infer<typeof updateAssessmentBodySchema>;
export type AddQuestionBody = z.infer<typeof addQuestionBodySchema>;
export type UpdateQuestionBody = z.infer<typeof updateQuestionBodySchema>;
export type ReorderQuestionsBody = z.infer<typeof reorderQuestionsBodySchema>;
export type GradeSubmissionBody = z.infer<typeof gradeSubmissionBodySchema>;
export type ImportQuestionsBody = z.infer<typeof importQuestionsBodySchema>;
export type AutoGenerateBody = z.infer<typeof autoGenerateBodySchema>;
export type QuestionBankQuery = z.infer<typeof questionBankQuerySchema>;
export type AddToQuestionBankBody = z.infer<typeof addToQuestionBankBodySchema>;
export type RubricQuery = z.infer<typeof rubricQuerySchema>;
export type CreateRubricBody = z.infer<typeof createRubricBodySchema>;
