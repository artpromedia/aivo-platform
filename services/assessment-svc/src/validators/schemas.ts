/**
 * Assessment Validation Schemas
 * 
 * Zod schemas for validating assessment-related inputs
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

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
  'CODE',
  'MATH_EQUATION',
]);

export const AssessmentTypeSchema = z.enum([
  'QUIZ',
  'TEST',
  'PRACTICE',
  'DIAGNOSTIC',
  'ASSIGNMENT',
  'SURVEY',
]);

export const DifficultySchema = z.enum([
  'BEGINNER',
  'EASY',
  'MEDIUM',
  'HARD',
  'EXPERT',
]);

export const RubricTypeSchema = z.enum([
  'HOLISTIC',
  'ANALYTIC',
  'SINGLE_POINT',
]);

// ============================================================================
// QUESTION OPTION SCHEMAS
// ============================================================================

export const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  html: z.string().optional(),
  media: z.object({
    type: z.enum(['image', 'audio', 'video']),
    url: z.string().url(),
    alt: z.string().optional(),
  }).optional(),
  feedback: z.string().optional(),
});

export const MatchingPairSchema = z.object({
  id: z.string(),
  left: z.string().min(1),
  right: z.string().min(1),
  leftMedia: z.object({ type: z.literal('image'), url: z.string().url() }).optional(),
  rightMedia: z.object({ type: z.literal('image'), url: z.string().url() }).optional(),
});

export const FillBlankSlotSchema = z.object({
  id: z.string(),
  position: z.number().int().min(0),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
  caseSensitive: z.boolean().optional(),
  allowFuzzyMatch: z.boolean().optional(),
  fuzzyThreshold: z.number().min(0).max(1).optional(),
});

export const HotspotRegionSchema = z.object({
  id: z.string(),
  type: z.enum(['circle', 'rectangle', 'polygon']),
  centerX: z.number().optional(),
  centerY: z.number().optional(),
  radius: z.number().positive().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  label: z.string().optional(),
  correct: z.boolean().optional(),
});

export const DragDropZoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  acceptedItems: z.array(z.string()),
});

export const DragDropItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  media: z.object({ type: z.literal('image'), url: z.string().url() }).optional(),
});

export const CodeTestCaseSchema = z.object({
  id: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
  hidden: z.boolean().optional(),
  points: z.number().positive().optional(),
  description: z.string().optional(),
});

export const QuestionFeedbackSchema = z.object({
  correct: z.string().optional(),
  incorrect: z.string().optional(),
  partialCredit: z.string().optional(),
  options: z.record(z.string()).optional(),
});

// ============================================================================
// CREATE QUESTION SCHEMA
// ============================================================================

export const CreateQuestionInputSchema = z.object({
  type: QuestionTypeSchema,
  stem: z.string().min(1).max(10000),
  stemHtml: z.string().optional(),
  stemMedia: z.object({
    type: z.enum(['image', 'audio', 'video']),
    url: z.string().url(),
    alt: z.string().optional(),
  }).optional(),
  
  // Multiple choice / multi-select
  options: z.array(QuestionOptionSchema).optional(),
  correctAnswer: z.any().optional(), // Varies by type
  correctAnswers: z.array(z.string()).optional(),
  
  // Fill-blank
  blanks: z.array(FillBlankSlotSchema).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  
  // Matching
  pairs: z.array(MatchingPairSchema).optional(),
  
  // Ordering
  correctOrder: z.array(z.string()).optional(),
  items: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  
  // Numeric
  tolerance: z.number().optional(),
  toleranceType: z.enum(['absolute', 'percentage']).optional(),
  unit: z.string().optional(),
  
  // Hotspot
  imageUrl: z.string().url().optional(),
  imageWidth: z.number().positive().optional(),
  imageHeight: z.number().positive().optional(),
  regions: z.array(HotspotRegionSchema).optional(),
  
  // Drag-drop
  backgroundImage: z.string().url().optional(),
  zones: z.array(DragDropZoneSchema).optional(),
  dragItems: z.array(DragDropItemSchema).optional(),
  
  // Code
  language: z.enum(['javascript', 'python', 'java', 'cpp', 'csharp', 'sql']).optional(),
  starterCode: z.string().optional(),
  testCases: z.array(CodeTestCaseSchema).optional(),
  timeoutSeconds: z.number().int().positive().optional(),
  memoryLimitMb: z.number().int().positive().optional(),
  
  // Math
  alternativeAnswers: z.array(z.string()).optional(),
  allowEquivalent: z.boolean().optional(),
  
  // Essay
  minWords: z.number().int().min(0).optional(),
  maxWords: z.number().int().positive().optional(),
  richTextEnabled: z.boolean().optional(),
  sampleAnswer: z.string().optional(),
  
  // Common
  explanation: z.string().optional(),
  hints: z.array(z.string()).optional(),
  feedback: QuestionFeedbackSchema.optional(),
  points: z.number().int().min(1).max(1000).default(1),
  difficulty: DifficultySchema.default('MEDIUM'),
  partialCredit: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  topicId: z.string().uuid().optional(),
  rubricId: z.string().uuid().optional(),
  standardIds: z.array(z.string().uuid()).optional(),
  isPublic: z.boolean().default(false),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionInputSchema>;

export const UpdateQuestionInputSchema = CreateQuestionInputSchema.partial().extend({
  forceUpdate: z.boolean().optional(), // Allow updating even if used in published assessments
});

export type UpdateQuestionInput = z.infer<typeof UpdateQuestionInputSchema>;

// ============================================================================
// QUESTION SEARCH SCHEMA
// ============================================================================

export const QuestionSearchInputSchema = z.object({
  query: z.string().optional(),
  types: z.array(QuestionTypeSchema).optional(),
  difficulty: DifficultySchema.optional(),
  tags: z.array(z.string()).optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  standardIds: z.array(z.string().uuid()).optional(),
  includePublic: z.boolean().default(true),
  authorId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'difficulty', 'points']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QuestionSearchInput = z.infer<typeof QuestionSearchInputSchema>;

// ============================================================================
// ASSESSMENT SETTINGS SCHEMA
// ============================================================================

export const AssessmentSettingsSchema = z.object({
  // Timing
  timeLimit: z.number().int().positive().optional(),
  timeLimitEnforced: z.boolean().default(true),
  lateSubmissionPolicy: z.enum(['prevent', 'deduct', 'allow']).default('prevent'),
  lateDeductionPercent: z.number().int().min(0).max(100).optional(),

  // Attempts
  attemptsAllowed: z.number().int().min(1).max(99).default(1),
  scoringMethod: z.enum(['highest', 'latest', 'average']).default('highest'),

  // Randomization
  shuffleQuestions: z.boolean().default(false),
  shuffleAnswers: z.boolean().default(false),
  questionPoolEnabled: z.boolean().default(false),

  // Display
  questionsPerPage: z.union([
    z.literal('all'),
    z.literal('one'),
    z.number().int().positive(),
  ]).default('all'),
  allowBackNavigation: z.boolean().default(true),
  showQuestionNumbers: z.boolean().default(true),
  showProgressBar: z.boolean().default(true),

  // Feedback & Results
  showResults: z.enum(['immediately', 'after_submission', 'after_due_date', 'never']).default('after_submission'),
  showCorrectAnswers: z.boolean().default(true),
  showFeedback: z.boolean().default(true),
  showPointsPerQuestion: z.boolean().default(true),
  gradeReleasePolicy: z.enum(['IMMEDIATELY', 'AFTER_DUE_DATE', 'AFTER_ALL_GRADED', 'MANUAL']).default('IMMEDIATELY'),
  gradeReleaseDate: z.coerce.date().optional(),

  // Security
  requireLockdownBrowser: z.boolean().default(false),
  lockdownBrowserPassword: z.string().optional(),
  webcamRequired: z.boolean().default(false),
  preventCopyPaste: z.boolean().default(true),
  preventRightClick: z.boolean().default(true),
  detectTabSwitch: z.boolean().default(true),
  requireFullscreen: z.boolean().default(false),
  maxViolationsAllowed: z.number().int().min(1).max(99).default(3),
  ipRestriction: z.array(z.string()).default([]),

  // Proctoring
  proctoringEnabled: z.boolean().default(false),
  proctoringProvider: z.enum(['proctorio', 'honorlock', 'examity']).optional(),
  proctoringSettings: z.record(z.unknown()).optional(),

  // Availability
  availableFrom: z.coerce.date().optional(),
  availableUntil: z.coerce.date().optional(),
  password: z.string().max(100).optional(),
});

// ============================================================================
// CREATE ASSESSMENT SCHEMA
// ============================================================================

export const CreateAssessmentInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: AssessmentTypeSchema.default('QUIZ'),
  settings: AssessmentSettingsSchema.optional(),
  subjectId: z.string().uuid().optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  difficulty: DifficultySchema.default('MEDIUM'),
  estimatedMinutes: z.number().int().min(1).max(999).default(15),
  passingScore: z.number().min(0).max(100).optional(),
  
  // Questions
  questionIds: z.array(z.string().uuid()).optional(),
  questionPoints: z.record(z.string().uuid(), z.number().int().positive()).optional(),
  
  // Question pools
  questionPools: z.array(z.object({
    name: z.string().min(1).max(200),
    pickCount: z.number().int().min(1),
    pointsPerQuestion: z.number().int().min(1),
    questionIds: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string()).optional(),
    difficulty: DifficultySchema.optional(),
    topicIds: z.array(z.string().uuid()).optional(),
  })).optional(),
  
  // Standards
  standardIds: z.array(z.string().uuid()).optional(),
});

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentInputSchema>;

export const UpdateAssessmentInputSchema = CreateAssessmentInputSchema.partial().extend({
  forceUpdate: z.boolean().optional(),
});

export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentInputSchema>;

// ============================================================================
// ASSESSMENT QUERY SCHEMA
// ============================================================================

export const AssessmentQuerySchema = z.object({
  type: AssessmentTypeSchema.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  subjectId: z.string().uuid().optional(),
  difficulty: DifficultySchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'totalPoints']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AssessmentQuery = z.infer<typeof AssessmentQuerySchema>;

// ============================================================================
// ATTEMPT SCHEMAS
// ============================================================================

export const StartAttemptInputSchema = z.object({
  assessmentId: z.string().uuid(),
  accommodations: z.object({
    extraTimePercent: z.number().int().min(0).max(200).optional(),
    readAloud: z.boolean().optional(),
    largeText: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    reducedDistraction: z.boolean().optional(),
    breaksAllowed: z.boolean().optional(),
  }).optional(),
  password: z.string().optional(),
});

export type StartAttemptInput = z.infer<typeof StartAttemptInputSchema>;

export const SubmitAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.any(), // Varies by question type
  flagged: z.boolean().optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

export type SubmitAnswerInput = z.infer<typeof SubmitAnswerInputSchema>;

export const ReportViolationInputSchema = z.object({
  type: z.enum([
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'COPY_ATTEMPT',
    'PASTE_ATTEMPT',
    'SCREENSHOT',
    'RIGHT_CLICK',
    'DEV_TOOLS',
    'FULLSCREEN_EXIT',
    'SECOND_DEVICE',
    'OTHER',
  ]),
  details: z.record(z.unknown()).optional(),
});

export type ReportViolationInput = z.infer<typeof ReportViolationInputSchema>;

// ============================================================================
// GRADING SCHEMAS
// ============================================================================

export const GradeResponseInputSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(5000).optional(),
  rubricScores: z.array(z.object({
    criterionId: z.string().uuid(),
    levelId: z.string().uuid(),
    comment: z.string().max(1000).optional(),
  })).optional(),
});

export type GradeResponseInput = z.infer<typeof GradeResponseInputSchema>;

export const BatchGradeInputSchema = z.object({
  grades: z.array(z.object({
    responseId: z.string().uuid(),
    score: z.number().min(0),
    feedback: z.string().max(5000).optional(),
  })).min(1).max(100),
});

export type BatchGradeInput = z.infer<typeof BatchGradeInputSchema>;

export const ReleaseGradesInputSchema = z.object({
  attemptIds: z.array(z.string().uuid()).optional(),
  releaseDate: z.coerce.date().optional(),
});

export type ReleaseGradesInput = z.infer<typeof ReleaseGradesInputSchema>;

// ============================================================================
// RUBRIC SCHEMAS
// ============================================================================

export const CreateRubricInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: RubricTypeSchema.default('ANALYTIC'),
  isPublic: z.boolean().default(false),
  criteria: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    maxPoints: z.number().int().min(1).max(100),
    weight: z.number().min(0.1).max(10).default(1),
    levels: z.array(z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(2000),
      points: z.number().int().min(0),
      feedback: z.string().max(1000).optional(),
    })).min(2).max(10),
  })).min(1).max(20),
});

export type CreateRubricInput = z.infer<typeof CreateRubricInputSchema>;

export const UpdateRubricInputSchema = CreateRubricInputSchema.partial();

export type UpdateRubricInput = z.infer<typeof UpdateRubricInputSchema>;
