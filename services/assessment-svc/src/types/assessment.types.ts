/**
 * Assessment Types and DTOs
 * 
 * Comprehensive type definitions for the assessment system including:
 * - Question types (multiple choice, essay, matching, etc.)
 * - Assessment configuration
 * - Grading and rubrics
 * - Analytics
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const QuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  MULTIPLE_SELECT: 'MULTIPLE_SELECT',
  TRUE_FALSE: 'TRUE_FALSE',
  SHORT_ANSWER: 'SHORT_ANSWER',
  ESSAY: 'ESSAY',
  FILL_BLANK: 'FILL_BLANK',
  MATCHING: 'MATCHING',
  ORDERING: 'ORDERING',
  NUMERIC: 'NUMERIC',
  HOTSPOT: 'HOTSPOT',
  DRAG_DROP: 'DRAG_DROP',
  CODE: 'CODE',
  MATH_EQUATION: 'MATH_EQUATION',
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const AssessmentType = {
  QUIZ: 'QUIZ',
  TEST: 'TEST',
  PRACTICE: 'PRACTICE',
  DIAGNOSTIC: 'DIAGNOSTIC',
  ASSIGNMENT: 'ASSIGNMENT',
  SURVEY: 'SURVEY',
} as const;

export type AssessmentType = (typeof AssessmentType)[keyof typeof AssessmentType];

export const AssessmentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AssessmentStatus = (typeof AssessmentStatus)[keyof typeof AssessmentStatus];

export const Difficulty = {
  BEGINNER: 'BEGINNER',
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  EXPERT: 'EXPERT',
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  GRADING: 'GRADING',
  GRADED: 'GRADED',
  EXPIRED: 'EXPIRED',
  ABANDONED: 'ABANDONED',
} as const;

export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

export const RubricType = {
  HOLISTIC: 'HOLISTIC',
  ANALYTIC: 'ANALYTIC',
  SINGLE_POINT: 'SINGLE_POINT',
} as const;

export type RubricType = (typeof RubricType)[keyof typeof RubricType];

export const SecurityViolationType = {
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  COPY_ATTEMPT: 'COPY_ATTEMPT',
  PASTE_ATTEMPT: 'PASTE_ATTEMPT',
  SCREENSHOT: 'SCREENSHOT',
  RIGHT_CLICK: 'RIGHT_CLICK',
  DEV_TOOLS: 'DEV_TOOLS',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  SECOND_DEVICE: 'SECOND_DEVICE',
  OTHER: 'OTHER',
} as const;

export type SecurityViolationType = (typeof SecurityViolationType)[keyof typeof SecurityViolationType];

export const AccommodationType = {
  EXTENDED_TIME: 'EXTENDED_TIME',
  READ_ALOUD: 'READ_ALOUD',
  LARGE_TEXT: 'LARGE_TEXT',
  HIGH_CONTRAST: 'HIGH_CONTRAST',
  REDUCED_DISTRACTION: 'REDUCED_DISTRACTION',
  BREAKS_ALLOWED: 'BREAKS_ALLOWED',
  SEPARATE_SETTING: 'SEPARATE_SETTING',
} as const;

export type AccommodationType = (typeof AccommodationType)[keyof typeof AccommodationType];

// ============================================================================
// QUESTION OPTION TYPES
// ============================================================================

export interface QuestionOption {
  id: string;
  text: string;
  html?: string;
  media?: {
    type: 'image' | 'audio' | 'video';
    url: string;
    alt?: string;
  };
  feedback?: string; // Feedback shown if this option is selected
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
  leftMedia?: { type: 'image'; url: string };
  rightMedia?: { type: 'image'; url: string };
}

export interface FillBlankSlot {
  id: string;
  position: number; // Position in the stem text
  acceptedAnswers: string[];
  caseSensitive?: boolean;
  allowFuzzyMatch?: boolean;
  fuzzyThreshold?: number; // 0-1, default 0.8
}

export interface HotspotRegion {
  id: string;
  type: 'circle' | 'rectangle' | 'polygon';
  // Circle
  centerX?: number;
  centerY?: number;
  radius?: number;
  // Rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Polygon
  points?: Array<{ x: number; y: number }>;
  // Common
  label?: string;
  correct?: boolean;
}

export interface DragDropZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  acceptedItems: string[]; // IDs of correct items for this zone
}

export interface DragDropItem {
  id: string;
  text: string;
  media?: { type: 'image'; url: string };
}

export interface CodeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden?: boolean; // Hidden from students
  points?: number;
  description?: string;
}

// ============================================================================
// QUESTION FEEDBACK
// ============================================================================

export interface QuestionFeedback {
  correct?: string;
  incorrect?: string;
  partialCredit?: string;
  // Per-option feedback for multiple choice
  options?: Record<string, string>;
}

// ============================================================================
// QUESTION TYPES
// ============================================================================

export interface BaseQuestion {
  id: string;
  tenantId: string;
  type: QuestionType;
  stem: string;
  stemHtml?: string;
  stemMedia?: {
    type: 'image' | 'audio' | 'video';
    url: string;
    alt?: string;
  };
  explanation?: string;
  hints?: string[];
  feedback?: QuestionFeedback;
  points: number;
  difficulty: Difficulty;
  partialCredit: boolean;
  tags: string[];
  subject?: string;
  gradeLevel?: string;
  topicId?: string;
  rubricId?: string;
  isPublic: boolean;
  status: 'active' | 'superseded' | 'archived';
  version: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  standards?: Array<{
    id: string;
    code: string;
    name: string;
    framework: string;
  }>;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'MULTIPLE_CHOICE';
  options: QuestionOption[];
  correctAnswer: string; // Option ID
}

export interface MultipleSelectQuestion extends BaseQuestion {
  type: 'MULTIPLE_SELECT';
  options: QuestionOption[];
  correctAnswers: string[]; // Option IDs
  minSelections?: number;
  maxSelections?: number;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'TRUE_FALSE';
  correctAnswer: boolean;
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'SHORT_ANSWER';
  acceptedAnswers: string[];
  caseSensitive?: boolean;
  allowFuzzyMatch?: boolean;
  fuzzyThreshold?: number;
  maxLength?: number;
}

export interface EssayQuestion extends BaseQuestion {
  type: 'ESSAY';
  rubricId?: string;
  minWords?: number;
  maxWords?: number;
  richTextEnabled?: boolean;
  sampleAnswer?: string;
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'FILL_BLANK';
  blanks: FillBlankSlot[];
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'MATCHING';
  pairs: MatchingPair[];
  shuffleOptions?: boolean;
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'ORDERING';
  items: Array<{ id: string; text: string }>;
  correctOrder: string[]; // Ordered item IDs
}

export interface NumericQuestion extends BaseQuestion {
  type: 'NUMERIC';
  correctAnswer: number;
  tolerance?: number;
  toleranceType?: 'absolute' | 'percentage';
  unit?: string;
  showUnit?: boolean;
}

export interface HotspotQuestion extends BaseQuestion {
  type: 'HOTSPOT';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  regions: HotspotRegion[];
  multiSelect?: boolean;
}

export interface DragDropQuestion extends BaseQuestion {
  type: 'DRAG_DROP';
  backgroundImage?: string;
  items: DragDropItem[];
  zones: DragDropZone[];
}

export interface CodeQuestion extends BaseQuestion {
  type: 'CODE';
  language: 'javascript' | 'python' | 'java' | 'cpp' | 'csharp' | 'sql';
  starterCode?: string;
  testCases: CodeTestCase[];
  timeoutSeconds?: number;
  memoryLimitMb?: number;
}

export interface MathEquationQuestion extends BaseQuestion {
  type: 'MATH_EQUATION';
  correctAnswer: string; // LaTeX format
  alternativeAnswers?: string[]; // Equivalent LaTeX expressions
  allowEquivalent?: boolean; // Use CAS to check equivalence
}

export type Question =
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | EssayQuestion
  | FillBlankQuestion
  | MatchingQuestion
  | OrderingQuestion
  | NumericQuestion
  | HotspotQuestion
  | DragDropQuestion
  | CodeQuestion
  | MathEquationQuestion;

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export interface AssessmentSettings {
  // Timing
  timeLimit?: number; // Minutes
  timeLimitEnforced: boolean;
  lateSubmissionPolicy: 'prevent' | 'deduct' | 'allow';
  lateDeductionPercent?: number;

  // Attempts
  attemptsAllowed: number;
  scoringMethod: 'highest' | 'latest' | 'average';

  // Randomization
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  questionPoolEnabled: boolean;

  // Display
  questionsPerPage: 'all' | 'one' | number;
  allowBackNavigation: boolean;
  showQuestionNumbers: boolean;
  showProgressBar: boolean;

  // Feedback & Results
  showResults: 'immediately' | 'after_submission' | 'after_due_date' | 'never';
  showCorrectAnswers: boolean;
  showFeedback: boolean;
  showPointsPerQuestion: boolean;
  gradeReleasePolicy: 'IMMEDIATELY' | 'AFTER_DUE_DATE' | 'AFTER_ALL_GRADED' | 'MANUAL';
  gradeReleaseDate?: Date;

  // Security
  requireLockdownBrowser: boolean;
  lockdownBrowserPassword?: string;
  webcamRequired: boolean;
  preventCopyPaste: boolean;
  preventRightClick: boolean;
  detectTabSwitch: boolean;
  requireFullscreen: boolean;
  maxViolationsAllowed: number;
  ipRestriction: string[];

  // Proctoring
  proctoringEnabled: boolean;
  proctoringProvider?: 'proctorio' | 'honorlock' | 'examity';
  proctoringSettings?: Record<string, unknown>;

  // Availability
  availableFrom?: Date;
  availableUntil?: Date;
  password?: string;
}

export interface AssessmentQuestionItem {
  id: string;
  questionId: string;
  question: Question;
  orderIndex: number;
  points?: number; // Override
  required: boolean;
}

export interface AssessmentQuestionPool {
  id: string;
  name: string;
  orderIndex: number;
  pickCount: number;
  pointsPerQuestion: number;
  questionIds: string[];
  tags?: string[];
  difficulty?: Difficulty;
  topicIds?: string[];
}

export interface Assessment {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: AssessmentType;
  status: AssessmentStatus;
  settings: AssessmentSettings;
  totalPoints: number;
  passingScore?: number;
  version: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  questions: AssessmentQuestionItem[];
  questionPools: AssessmentQuestionPool[];
  standards?: Array<{ id: string; code: string; name: string }>;
}

// ============================================================================
// ATTEMPT TYPES
// ============================================================================

export interface AttemptAccommodation {
  type: AccommodationType;
  value?: string;
  grantedBy: string;
  grantedAt: Date;
  reason?: string;
}

export interface SecurityViolation {
  id: string;
  type: SecurityViolationType;
  details?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}

export interface AttemptQuestion {
  questionId: string;
  question: Question;
  points: number;
  answerOrder?: string[]; // Shuffled answer order
}

export interface Attempt {
  id: string;
  assessmentId: string;
  userId: string;
  tenantId: string;
  status: AttemptStatus;
  attemptNumber: number;
  startedAt: Date;
  submittedAt?: Date;
  timeSpentSeconds: number;
  timeLimit?: number;
  expiresAt?: Date;
  score?: number;
  pointsEarned?: number;
  pointsPossible?: number;
  passed?: boolean;
  questionOrder: string[];
  answerOrders?: Record<string, string[]>;
  securityToken?: string;
  violationCount: number;
  accommodations: AttemptAccommodation[];
  securityViolations: SecurityViolation[];
  gradedBy?: string;
  gradedAt?: Date;
  gradesReleasedAt?: Date;
  feedback?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export type QuestionAnswer =
  | string // Multiple choice, short answer
  | string[] // Multiple select, ordering
  | boolean // True/false
  | number // Numeric
  | Record<string, string> // Matching (left -> right)
  | Array<{ x: number; y: number }> // Hotspot
  | Record<string, string[]> // Drag drop (zone -> items)
  | { code: string; language: string }; // Code

export interface QuestionResponse {
  id: string;
  attemptId: string;
  questionId: string;
  response: QuestionAnswer;
  responseText?: string;
  isCorrect?: boolean;
  pointsEarned?: number;
  maxPoints: number;
  partialCredit: boolean;
  autoGraded: boolean;
  status: 'not_answered' | 'answered' | 'graded' | 'flagged';
  flagged: boolean;
  rubricScores?: Array<{
    criterionId: string;
    levelId: string;
    points: number;
    comment?: string;
  }>;
  startedAt: Date;
  answeredAt?: Date;
  timeSpentSeconds: number;
  hintsUsed: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}

// ============================================================================
// RUBRIC TYPES
// ============================================================================

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  points: number;
  orderIndex: number;
  feedback?: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
  maxPoints: number;
  weight: number;
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: RubricType;
  maxPoints: number;
  isPublic: boolean;
  criteria: RubricCriterion[];
  createdBy: string;
  clonedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface QuestionAnalytics {
  questionId: string;
  timesUsed: number;
  timesAnswered: number;
  timesSkipped: number;
  averageScore?: number;
  averageTimeSeconds?: number;
  correctRate?: number; // p-value
  difficultyIndex?: number;
  discriminationIndex?: number;
  pointBiserial?: number;
  distractorAnalysis?: Record<string, {
    selectedCount: number;
    topQuartileRate: number;
    bottomQuartileRate: number;
  }>;
  answerDistribution?: Record<string, number>;
  lastCalculated: Date;
}

export interface AssessmentAnalytics {
  assessmentId: string;
  totalAttempts: number;
  completedAttempts: number;
  averageTimeMinutes?: number;
  completionRate?: number;
  averageScore?: number;
  medianScore?: number;
  highestScore?: number;
  lowestScore?: number;
  standardDeviation?: number;
  passRate?: number;
  scoreDistribution?: Record<string, number>;
  gradeDistribution?: Record<string, number>;
  cronbachAlpha?: number;
  standardError?: number;
  lastCalculated: Date;
}

export interface ItemAnalysisReport {
  assessmentId: string;
  assessmentTitle: string;
  analyzedAt: Date;
  totalAttempts: number;
  items: Array<{
    questionId: string;
    questionStem: string;
    questionType: QuestionType;
    difficulty: Difficulty;
    points: number;
    difficultyIndex: number;
    discriminationIndex: number;
    pointBiserial: number;
    averageScore: number;
    averageTime: number;
    answerDistribution: Record<string, number>;
    flags: string[]; // e.g., "Low discrimination", "Too easy", "Negative correlation"
  }>;
  reliability: {
    cronbachAlpha: number;
    standardError: number;
    splitHalfReliability: number;
  };
  recommendations: string[];
}

// ============================================================================
// GRADING TYPES
// ============================================================================

export interface GradingQueueItem {
  responseId: string;
  questionId: string;
  questionStem: string;
  questionType: QuestionType;
  studentAnswer: QuestionAnswer;
  studentName: string;
  assessmentTitle: string;
  submittedAt?: Date;
  maxPoints: number;
  rubricId?: string;
}

export interface GradingQueue {
  total: number;
  pending: number;
  items: GradingQueueItem[];
  byAssessment: Array<{
    assessmentId: string;
    assessmentTitle: string;
    pendingCount: number;
  }>;
}

export interface GradingSummary {
  assessmentId: string;
  assessmentTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  pendingGrading: number;
  fullyGraded: number;
  gradingProgress: {
    total: number;
    graded: number;
    pending: number;
    percentComplete: number;
  };
  scoreDistribution: Record<string, number>;
  statistics?: {
    mean: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
    passRate?: number;
  };
  studentBreakdown: Array<{
    studentId: string;
    studentName: string;
    attemptId: string;
    status: AttemptStatus;
    score?: number;
    submittedAt?: Date;
    gradedResponsesCount: number;
    totalResponses: number;
  }>;
}

// ============================================================================
// STANDARD TYPES
// ============================================================================

export interface Standard {
  id: string;
  code: string;
  name: string;
  description?: string;
  framework: string;
  subject: string;
  gradeLevel: string;
  domain?: string;
  cluster?: string;
  parentId?: string;
  children?: Standard[];
}
