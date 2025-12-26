/**
 * Assessment Builder Types
 * 
 * Type definitions for the assessment builder components
 */

// ============================================================================
// QUESTION TYPES
// ============================================================================

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'ORDERING'
  | 'NUMERIC'
  | 'HOTSPOT'
  | 'DRAG_DROP'
  | 'CODE'
  | 'MATH_EQUATION';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

// ============================================================================
// QUESTION OPTIONS
// ============================================================================

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface FillBlankSlot {
  id: string;
  position: number;
  correctAnswers: string[];
  caseSensitive?: boolean;
}

export interface HotspotRegion {
  id: string;
  type: 'rectangle' | 'circle' | 'polygon';
  coordinates: number[];
  isCorrect: boolean;
  label?: string;
}

export interface DragDropZone {
  id: string;
  label: string;
  acceptsItems: string[];
}

export interface DragDropItem {
  id: string;
  text: string;
  correctZone: string;
}

export interface CodeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
}

// ============================================================================
// QUESTION
// ============================================================================

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  stemHtml?: string;
  points: number;
  difficulty: Difficulty;
  tags: string[];
  hint?: string;
  explanation?: string;
  
  // Type-specific fields
  options?: QuestionOption[];
  correctOption?: number;
  correctOptions?: number[];
  correctAnswer?: string | string[] | boolean | number;
  
  // Fill in blank
  blanks?: FillBlankSlot[];
  
  // Matching
  pairs?: MatchingPair[];
  
  // Ordering
  correctOrder?: string[];
  
  // Hotspot
  imageUrl?: string;
  regions?: HotspotRegion[];
  
  // Drag & Drop
  zones?: DragDropZone[];
  items?: DragDropItem[];
  
  // Code
  language?: string;
  starterCode?: string;
  testCases?: CodeTestCase[];
  
  // Numeric
  tolerance?: number;
  unit?: string;
  
  // Grading
  partialCredit?: boolean;
  rubricId?: string;
  
  // Standards
  standards?: string[];
  
  // Question bank
  isPublic?: boolean;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

// ============================================================================
// RUBRIC
// ============================================================================

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  points: number;
  feedback?: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  maxPoints: number;
  weight: number;
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  type: 'ANALYTIC' | 'HOLISTIC' | 'SINGLE_POINT';
  maxPoints: number;
  criteria: RubricCriterion[];
}

// ============================================================================
// ASSESSMENT
// ============================================================================

export type AssessmentType = 
  | 'QUIZ'
  | 'TEST'
  | 'EXAM'
  | 'PRACTICE'
  | 'SURVEY'
  | 'DIAGNOSTIC';

export interface AssessmentSettings {
  // Timing
  timeLimit?: number; // minutes
  allowLateSubmissions: boolean;
  latePenaltyPercent?: number;
  
  // Navigation
  allowBackNavigation: boolean;
  showOneQuestionAtATime: boolean;
  
  // Randomization
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  
  // Security
  requireLockdownBrowser: boolean;
  preventCopyPaste: boolean;
  detectTabSwitch: boolean;
  maxViolations: number;
  
  // Attempts
  maxAttempts: number;
  attemptsGradingPolicy: 'HIGHEST' | 'LATEST' | 'AVERAGE';
  
  // Feedback
  showCorrectAnswers: boolean;
  showCorrectAnswersAfter?: 'IMMEDIATE' | 'AFTER_DUE_DATE' | 'NEVER';
  showPointValues: boolean;
  showFeedback: boolean;
  
  // Grading
  passingScore?: number;
  gradeReleasePolicy: 'IMMEDIATE' | 'MANUAL' | 'AFTER_ALL_GRADED';
}

export interface QuestionPool {
  id: string;
  name: string;
  questionIds: string[];
  selectCount: number;
  points: number;
}

export interface Assessment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  instructions?: string;
  type: AssessmentType;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  
  // Questions
  questions: Question[];
  questionPools: QuestionPool[];
  
  // Settings
  settings: AssessmentSettings;
  
  // Scheduling
  availableFrom?: Date;
  availableUntil?: Date;
  
  // Scoring
  totalPoints: number;
  passingScore?: number;
  
  // Standards
  standards?: string[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ============================================================================
// BUILDER STATE
// ============================================================================

export interface BuilderState {
  assessment: Assessment;
  selectedQuestionId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  errors: Record<string, string[]>;
  previewMode: boolean;
}

export interface DragItem {
  type: 'question' | 'question-type';
  id: string;
  index?: number;
  questionType?: QuestionType;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface CreateQuestionInput {
  type: QuestionType;
  stem: string;
  points: number;
  difficulty?: Difficulty;
  tags?: string[];
  options?: Omit<QuestionOption, 'id'>[];
  correctOption?: number;
  correctAnswer?: string | string[] | boolean | number;
  // ... other type-specific fields
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {
  id: string;
}

export interface CreateAssessmentInput {
  name: string;
  description?: string;
  type: AssessmentType;
  settings?: Partial<AssessmentSettings>;
}

export interface UpdateAssessmentInput extends Partial<CreateAssessmentInput> {
  id: string;
  questions?: UpdateQuestionInput[];
}
