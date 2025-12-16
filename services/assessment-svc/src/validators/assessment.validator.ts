import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const AssessmentTypeSchema = z.enum([
  'QUIZ',
  'TEST',
  'PRACTICE',
  'DIAGNOSTIC',
  'ASSIGNMENT',
  'SURVEY',
]);

export const AssessmentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const DifficultySchema = z.enum(['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT']);

export const QuestionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
  'FILL_BLANK',
  'MATCHING',
  'ORDERING',
  'NUMERIC',
  'HOTSPOT',
  'DRAG_DROP',
]);

export const AttemptStatusSchema = z.enum([
  'IN_PROGRESS',
  'SUBMITTED',
  'GRADING',
  'GRADED',
  'EXPIRED',
  'ABANDONED',
]);

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const AssessmentSettingsSchema = z
  .object({
    timeLimit: z.number().int().positive().optional(), // in minutes
    passingScore: z.number().min(0).max(100).optional(),
    maxAttempts: z.number().int().positive().optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    showCorrectAnswers: z.boolean().optional(),
    showExplanations: z.boolean().optional(),
    allowReview: z.boolean().optional(),
    adaptiveDifficulty: z.boolean().optional(),
  })
  .optional()
  .default({});

// ============================================================================
// ASSESSMENT SCHEMAS
// ============================================================================

export const CreateAssessmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: AssessmentTypeSchema,
  settings: AssessmentSettingsSchema,
  subjectId: z.string().uuid().optional(),
  topicIds: z.array(z.string().uuid()).optional().default([]),
  difficulty: DifficultySchema.optional().default('MEDIUM'),
  estimatedMinutes: z.number().int().positive().max(600).optional().default(15),
});

export const UpdateAssessmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: AssessmentTypeSchema.optional(),
  settings: AssessmentSettingsSchema,
  subjectId: z.string().uuid().optional().nullable(),
  topicIds: z.array(z.string().uuid()).optional(),
  difficulty: DifficultySchema.optional(),
  estimatedMinutes: z.number().int().positive().max(600).optional(),
});

export const PublishAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
});

export const ArchiveAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
});

export const AssessmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  type: AssessmentTypeSchema.optional(),
  status: AssessmentStatusSchema.optional(),
  subjectId: z.string().uuid().optional(),
  difficulty: DifficultySchema.optional(),
  search: z.string().max(200).optional(),
  sortBy: z
    .enum(['title', 'createdAt', 'updatedAt', 'publishedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// QUESTION SCHEMAS
// ============================================================================

export const MediaSchema = z.object({
  type: z.enum(['image', 'audio', 'video']),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
});

export const OptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  media: MediaSchema.optional(),
});

export const MatchingPairSchema = z.object({
  left: z.string().min(1),
  right: z.string().min(1),
});

// Correct answer schemas by question type
export const MultipleChoiceAnswerSchema = z.object({
  optionId: z.string(),
});

export const MultipleSelectAnswerSchema = z.object({
  optionIds: z.array(z.string()).min(1),
});

export const TrueFalseAnswerSchema = z.object({
  value: z.boolean(),
});

export const ShortAnswerSchema = z.object({
  acceptedAnswers: z.array(z.string().min(1)),
  caseSensitive: z.boolean().optional().default(false),
});

export const NumericAnswerSchema = z.object({
  value: z.number(),
  tolerance: z.number().min(0).optional().default(0),
});

export const OrderingAnswerSchema = z.object({
  correctOrder: z.array(z.string()), // array of option IDs in correct order
});

export const MatchingAnswerSchema = z.object({
  pairs: z.array(MatchingPairSchema),
});

export const FillBlankAnswerSchema = z.object({
  blanks: z.array(
    z.object({
      position: z.number().int().min(0),
      acceptedAnswers: z.array(z.string()),
      caseSensitive: z.boolean().optional().default(false),
    })
  ),
});

// Combined correct answer schema
export const CorrectAnswerSchema = z.union([
  MultipleChoiceAnswerSchema,
  MultipleSelectAnswerSchema,
  TrueFalseAnswerSchema,
  ShortAnswerSchema,
  NumericAnswerSchema,
  OrderingAnswerSchema,
  MatchingAnswerSchema,
  FillBlankAnswerSchema,
  z.object({}), // Essay and other manually graded types
]);

export const CreateQuestionSchema = z.object({
  type: QuestionTypeSchema,
  stem: z.string().min(1).max(5000),
  stemMedia: MediaSchema.optional(),
  options: z.array(OptionSchema).optional(),
  correctAnswer: CorrectAnswerSchema,
  explanation: z.string().max(2000).optional(),
  hints: z.array(z.string().max(500)).max(5).optional().default([]),
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  difficulty: DifficultySchema.optional().default('MEDIUM'),
  points: z.number().int().positive().max(100).optional().default(1),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
});

export const UpdateQuestionSchema = CreateQuestionSchema.partial();

export const QuestionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  type: QuestionTypeSchema.optional(),
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  difficulty: DifficultySchema.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(200).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'difficulty', 'points'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// ASSESSMENT QUESTION SCHEMAS
// ============================================================================

export const AddQuestionToAssessmentSchema = z.object({
  questionId: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
  points: z.number().int().positive().max(100).optional(),
  required: z.boolean().optional().default(true),
});

export const ReorderQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      questionId: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    })
  ),
});

// ============================================================================
// ATTEMPT SCHEMAS
// ============================================================================

export const StartAttemptSchema = z.object({
  assessmentId: z.string().uuid(),
});

export const SubmitAttemptSchema = z.object({
  attemptId: z.string().uuid(),
});

export const AttemptMetadataSchema = z.object({
  browser: z.string().optional(),
  device: z.string().optional(),
  ipAddress: z.string().optional(),
  proctored: z.boolean().optional(),
});

export const AttemptQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  assessmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: AttemptStatusSchema.optional(),
  startedAfter: z.coerce.date().optional(),
  startedBefore: z.coerce.date().optional(),
  sortBy: z.enum(['startedAt', 'submittedAt', 'score']).optional().default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const SubmitResponseSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  response: z.unknown(), // Validated based on question type
  timeSpentSeconds: z.number().int().min(0).optional(),
});

export const BulkSubmitResponsesSchema = z.object({
  attemptId: z.string().uuid(),
  responses: z.array(
    z.object({
      questionId: z.string().uuid(),
      response: z.unknown(),
      timeSpentSeconds: z.number().int().min(0).optional(),
    })
  ),
});

// ============================================================================
// GRADING SCHEMAS
// ============================================================================

export const ManualGradeSchema = z.object({
  responseId: z.string().uuid(),
  pointsEarned: z.number().min(0),
  isCorrect: z.boolean().optional(),
  feedback: z.string().max(2000).optional(),
});

export const BulkManualGradeSchema = z.object({
  attemptId: z.string().uuid(),
  grades: z.array(
    z.object({
      responseId: z.string().uuid(),
      pointsEarned: z.number().min(0),
      isCorrect: z.boolean().optional(),
      feedback: z.string().max(2000).optional(),
    })
  ),
  overallFeedback: z.string().max(5000).optional(),
});

// ============================================================================
// QUESTION POOL SCHEMAS
// ============================================================================

export const QuestionPoolCriteriaSchema = z.object({
  subjectIds: z.array(z.string().uuid()).optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  difficulties: z.array(DifficultySchema).optional(),
  types: z.array(QuestionTypeSchema).optional(),
  tags: z.array(z.string()).optional(),
  minCorrectRate: z.number().min(0).max(100).optional(),
  maxCorrectRate: z.number().min(0).max(100).optional(),
});

export const CreateQuestionPoolSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  criteria: QuestionPoolCriteriaSchema,
});

export const UpdateQuestionPoolSchema = CreateQuestionPoolSchema.partial();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;
export type AssessmentQuery = z.infer<typeof AssessmentQuerySchema>;
export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type QuestionQuery = z.infer<typeof QuestionQuerySchema>;
export type AddQuestionToAssessmentInput = z.infer<typeof AddQuestionToAssessmentSchema>;
export type ReorderQuestionsInput = z.infer<typeof ReorderQuestionsSchema>;
export type StartAttemptInput = z.infer<typeof StartAttemptSchema>;
export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
export type AttemptQuery = z.infer<typeof AttemptQuerySchema>;
export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;
export type BulkSubmitResponsesInput = z.infer<typeof BulkSubmitResponsesSchema>;
export type ManualGradeInput = z.infer<typeof ManualGradeSchema>;
export type BulkManualGradeInput = z.infer<typeof BulkManualGradeSchema>;
export type CreateQuestionPoolInput = z.infer<typeof CreateQuestionPoolSchema>;
export type UpdateQuestionPoolInput = z.infer<typeof UpdateQuestionPoolSchema>;
