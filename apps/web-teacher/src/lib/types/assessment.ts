/**
 * Assessment Types for Teacher Portal
 *
 * Represents assessments, questions, rubrics, and auto-grading configurations
 */

// ════════════════════════════════════════════════════════════════════════════
// QUESTION TYPES
// ════════════════════════════════════════════════════════════════════════════

export type QuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'short-answer'
  | 'essay'
  | 'math'
  | 'matching'
  | 'fill-in-blank'
  | 'ordering';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  order: number;
  options?: QuestionOption[];
  correctAnswer?: string | boolean | number | string[];
  expectedAnswer?: string;
  rubric?: QuestionRubric;
  hints?: string[];
  explanation?: string;
  imageUrl?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  matchingPairs?: MatchingPair[];
  blanks?: string[];
}

export interface QuestionRubric {
  [criterion: string]: {
    maxPoints: number;
    levels: {
      [level: string]: string;
    };
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ASSESSMENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export type AssessmentType = 'quiz' | 'test' | 'project' | 'rubric' | 'practice';

export type AssessmentStatus = 'draft' | 'published' | 'archived';

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  type: AssessmentType;
  timeLimit: number | null;
  questions: Question[];
  rubric: AssessmentRubric | null;
  autoGrade: boolean;
  adaptiveDifficulty: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback: 'immediately' | 'after-submit' | 'after-due-date' | 'never';
  allowRetakes: boolean;
  maxRetakes?: number;
  passingScore?: number;
  accommodations?: AssessmentAccommodations;
  standards?: string[];
  status: AssessmentStatus;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface AssessmentRubric {
  id?: string;
  title: string;
  criteria: RubricCriterion[];
  totalPoints: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  name: string;
  points: number;
  description: string;
}

export interface AssessmentAccommodations {
  extendedTime?: {
    enabled: boolean;
    multiplier: number;
  };
  readAloud?: boolean;
  largerFont?: boolean;
  reducedQuestions?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// AUTO-GRADING CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

export interface AutoGradeConfig {
  enabled: boolean;
  partialCredit: boolean;
  partialCreditPercentage?: number;
  caseSensitive: boolean;
  acceptSynonyms: boolean;
  aiGrading: {
    enabled: boolean;
    shortAnswerThreshold: number;
    essayEnabled: boolean;
    mathStepsEnabled: boolean;
  };
  feedbackGeneration: boolean;
  feedbackTone: 'encouraging' | 'neutral' | 'detailed';
}

// ════════════════════════════════════════════════════════════════════════════
// ASSESSMENT ASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  classId: string;
  assignedAt: Date;
  dueDate: Date | null;
  availableFrom?: Date;
  availableUntil?: Date;
  studentOverrides?: StudentAssessmentOverride[];
}

export interface StudentAssessmentOverride {
  studentId: string;
  dueDate?: Date;
  timeLimit?: number;
  maxRetakes?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// STUDENT ASSESSMENT SUBMISSION
// ════════════════════════════════════════════════════════════════════════════

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  studentId: string;
  assignmentId: string;
  answers: StudentAnswer[];
  startedAt: Date;
  submittedAt?: Date;
  timeSpent: number;
  attempt: number;
  status: 'in-progress' | 'submitted' | 'graded';
  results?: AssessmentResults;
}

export interface StudentAnswer {
  questionId: string;
  answer: string | boolean | number | string[];
  answeredAt: Date;
  timeSpent?: number;
}

export interface AssessmentResults {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  questionResults: QuestionResult[];
  overallFeedback?: string;
  gradedAt: Date;
  gradedBy: 'auto' | string;
}

export interface QuestionResult {
  questionId: string;
  points: number;
  maxPoints: number;
  correct: boolean;
  feedback?: string;
  rubricScores?: {
    criterionId: string;
    points: number;
    comment?: string;
  }[];
}

// ════════════════════════════════════════════════════════════════════════════
// QUESTION BANK
// ════════════════════════════════════════════════════════════════════════════

export interface QuestionBankItem extends Omit<Question, 'order'> {
  subject: string;
  gradeLevel: string;
  standard?: string;
  usageCount: number;
  averageScore?: number;
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface QuestionBankFilter {
  subject?: string;
  gradeLevel?: string;
  type?: QuestionType;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  search?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// DTOs
// ════════════════════════════════════════════════════════════════════════════

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  type: AssessmentType;
  timeLimit?: number | null;
  questions: Omit<Question, 'id'>[];
  rubric?: Omit<AssessmentRubric, 'id'> | null;
  autoGrade?: boolean;
  adaptiveDifficulty?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showFeedback?: Assessment['showFeedback'];
  allowRetakes?: boolean;
  maxRetakes?: number;
  passingScore?: number;
  accommodations?: AssessmentAccommodations;
  standards?: string[];
  status?: AssessmentStatus;
}

export interface UpdateAssessmentDto extends Partial<CreateAssessmentDto> {
  id: string;
}

export interface AssignAssessmentDto {
  assessmentId: string;
  classId: string;
  dueDate?: Date | null;
  availableFrom?: Date;
  availableUntil?: Date;
}

export interface GradeSubmissionDto {
  submissionId: string;
  questionGrades: {
    questionId: string;
    points: number;
    feedback?: string;
  }[];
  overallFeedback?: string;
}
