/**
 * AI Types for Frontend Applications
 *
 * Shared types for AI-powered features including:
 * - Writing Assistant
 * - AI Insights
 * - Homework Helper
 * - Focus Recommendations
 * - Word Predictions
 */

// ============================================================================
// Common AI Types
// ============================================================================

export interface AIFeedbackRating {
  feedbackId: string;
  rating: 'helpful' | 'not_helpful';
  reason?: string;
  timestamp: string;
}

export interface AIResponseMetadata {
  generatedAt: string;
  model?: string;
  confidence: number;
  cached: boolean;
  latencyMs?: number;
  tokensUsed?: number;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;
  suggestion?: string;
}

// ============================================================================
// Writing Assistant Types
// ============================================================================

export type WritingTaskType =
  | 'freeWrite'
  | 'response'
  | 'essay'
  | 'story'
  | 'journal'
  | 'letter'
  | 'poem'
  | 'report';

export type WritingLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'proficient';

export type SuggestionType =
  | 'spelling'
  | 'grammar'
  | 'punctuation'
  | 'wordChoice'
  | 'sentenceStructure'
  | 'clarity'
  | 'vocabulary'
  | 'transition'
  | 'general'
  | 'encouragement';

export interface WritingContext {
  gradeLevel: string;
  taskType: WritingTaskType;
  level: WritingLevel;
  assignmentId?: string;
  rubricId?: string;
  minWords?: number;
  maxWords?: number;
}

export interface WritingSuggestion {
  id: string;
  type: SuggestionType;
  message: string;
  startPosition?: number;
  endPosition?: number;
  replacement?: string;
  confidence: number;
  explanation?: string;
}

export interface GrammarIssue {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  message: string;
  startPosition: number;
  endPosition: number;
  originalText: string;
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
}

export interface WritingFeedback {
  id: string;
  sessionId: string;
  overallScore: number;
  rubricScores: Record<string, number>;
  suggestions: WritingSuggestion[];
  grammarIssues: GrammarIssue[];
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  encouragement: string;
  nextSteps: string[];
  metadata: AIResponseMetadata;
}

export interface WritingFeedbackRequest {
  text: string;
  context: WritingContext;
  focusAreas?: SuggestionType[];
  includeGrammarCheck?: boolean;
  includeEncouragement?: boolean;
}

// ============================================================================
// AI Insights Types (Parent Dashboard)
// ============================================================================

export type AIInsightType =
  | 'progress'
  | 'recommendation'
  | 'alert'
  | 'celebration'
  | 'strength'
  | 'improvement'
  | 'concern';

export type AIInsightPriority = 'high' | 'medium' | 'low';

export type AIInsightTrend = 'improving' | 'steady' | 'declining';

export interface AIInsightRelatedData {
  subject?: string;
  trend?: AIInsightTrend;
  metrics?: Record<string, number>;
  comparisonPeriod?: string;
  percentageChange?: number;
}

export interface AIInsight {
  id: string;
  type: AIInsightType;
  title: string;
  description: string;
  actionable: boolean;
  suggestedAction?: string;
  actionPath?: string;
  priority: AIInsightPriority;
  relatedData?: AIInsightRelatedData;
  subject?: string;
  confidence: number;
  generatedAt: string;
  expiresAt?: string;
  dismissed?: boolean;
  dismissedAt?: string;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  generatedAt: string;
  nextRefreshAt: string;
  studentSummary?: {
    overallTrend: AIInsightTrend;
    topStrengths: string[];
    focusAreas: string[];
    engagementLevel: 'high' | 'medium' | 'low';
  };
}

export interface AIInsightFeedback {
  insightId: string;
  helpful: boolean;
  actionTaken?: boolean;
  feedback?: string;
}

// ============================================================================
// Homework Helper Types
// ============================================================================

export type HomeworkSubject = 'ela' | 'math' | 'science' | 'social_studies' | 'other';

export interface HomeworkStep {
  id: string;
  stepNumber: number;
  prompt: string;
  isCompleted: boolean;
  hint?: string;
  learnerResponse?: string;
  feedback?: string;
  isCorrect?: boolean;
  explanation?: string;
  relatedConcepts?: string[];
}

export interface HomeworkSession {
  id: string;
  sessionId: string;
  problem: string;
  subject: HomeworkSubject;
  gradeLevel: string;
  steps: HomeworkStep[];
  currentStepIndex: number;
  isComplete: boolean;
  startedAt: string;
  completedAt?: string;
  totalHints: number;
  correctSteps: number;
}

export interface HomeworkHint {
  stepId: string;
  hintLevel: number; // 1 = subtle, 2 = moderate, 3 = explicit
  hint: string;
  visualAid?: string;
  relatedExample?: string;
}

export interface StepAnswerResult {
  stepId: string;
  isCorrect: boolean;
  feedback: string;
  hint?: string;
  explanation?: string;
  proceedToNext: boolean;
  encouragement?: string;
}

export interface HomeworkStartRequest {
  problemText: string;
  subject: HomeworkSubject;
  gradeBand: string;
  sourceType?: 'text' | 'image' | 'voice';
  maxSteps?: number;
  preferredApproach?: 'guided' | 'hints_only' | 'collaborative';
}

// ============================================================================
// Focus & Recommendation Types
// ============================================================================

export type BreakActivityType =
  | 'breathing'
  | 'stretching'
  | 'movement'
  | 'grounding'
  | 'mindfulPause'
  | 'simpleGame'
  | 'learningGame';

export type SelfReportedMood = 'happy' | 'okay' | 'frustrated' | 'tired' | 'confused';

export interface RegulationActivity {
  type: BreakActivityType;
  title: string;
  description: string;
  instructions: string;
  durationSeconds: number;
  mediaUrl?: string;
  benefits: string[];
}

export interface FocusRecommendation {
  id: string;
  type: 'break' | 'activity_switch' | 'encouragement' | 'goal_check';
  urgency: 'immediate' | 'soon' | 'optional';
  reason: string;
  activity?: RegulationActivity;
  alternativeActivities?: RegulationActivity[];
  personalized: boolean;
  basedOn: string[];
  metadata: AIResponseMetadata;
}

export interface FocusPingRequest {
  sessionId: string;
  learnerId: string;
  activityId: string;
  idleMs: number;
  appInBackground: boolean;
  selfReportedMood?: SelfReportedMood;
  rapidExit?: boolean;
}

export interface FocusPingResult {
  needsBreak: boolean;
  recommendation?: FocusRecommendation;
  focusScore: number;
  sessionDuration: number;
  nextCheckIn: number;
}

// ============================================================================
// Word Prediction Types
// ============================================================================

export interface WordPrediction {
  word: string;
  confidence: number;
  partOfSpeech?: string;
  isContextual: boolean;
}

export interface WordPredictionRequest {
  context: string;
  cursorPosition: number;
  gradeLevel: string;
  maxPredictions?: number;
  includeSpellingCorrections?: boolean;
}

export interface WordPredictionResponse {
  predictions: WordPrediction[];
  spellingCorrections?: {
    original: string;
    suggestions: string[];
    position: number;
  }[];
  metadata: AIResponseMetadata;
}

// ============================================================================
// Learning Game Types (Focus Breaks)
// ============================================================================

export type LearningGameType =
  | 'mathBubblePop'
  | 'wordScramble'
  | 'quickQuiz'
  | 'patternPower'
  | 'factOrFiction'
  | 'numberNinja'
  | 'spellingBee';

export interface LearningBreakGame {
  gameType: LearningGameType;
  title: string;
  description: string;
  instructions: string[];
  durationSeconds: number;
  targetDomain: string;
  targetSkillCodes: string[];
  difficulty: number;
  gameConfig: Record<string, unknown>;
  xpReward: number;
  coinReward: number;
}

export interface LearningBreakResult {
  game: LearningBreakGame;
  personalized: boolean;
  skillsAnalyzed: number;
  recommendationReason: string;
}

// ============================================================================
// AI Feedback Collection Types
// ============================================================================

export interface AIFeedback {
  id: string;
  featureType: 'writing' | 'homework' | 'focus' | 'prediction' | 'insight';
  responseId: string;
  rating: 'thumbs_up' | 'thumbs_down' | null;
  feedbackText?: string;
  reportedIssue?: 'inappropriate' | 'incorrect' | 'unhelpful' | 'confusing' | 'other';
  clarificationRequested?: boolean;
  submittedAt: string;
  userId: string;
  sessionId?: string;
}

export interface AIFeedbackSubmission {
  featureType: AIFeedback['featureType'];
  responseId: string;
  rating?: 'thumbs_up' | 'thumbs_down';
  feedbackText?: string;
  reportedIssue?: AIFeedback['reportedIssue'];
  clarificationRequested?: boolean;
}

// ============================================================================
// AI Cache Types
// ============================================================================

export interface AICacheConfig {
  writing: {
    ttlSeconds: number; // 3600 = 1 hour
    keyBy: 'contentHash';
  };
  focus: {
    ttlSeconds: number; // 900 = 15 minutes
    keyBy: 'context';
  };
  predictions: {
    ttlSeconds: number; // 30 seconds
    keyBy: 'context';
  };
  insights: {
    ttlSeconds: number; // 3600 = 1 hour
    invalidateOn: 'activity';
  };
}

export const DEFAULT_AI_CACHE_CONFIG: AICacheConfig = {
  writing: { ttlSeconds: 3600, keyBy: 'contentHash' },
  focus: { ttlSeconds: 900, keyBy: 'context' },
  predictions: { ttlSeconds: 30, keyBy: 'context' },
  insights: { ttlSeconds: 3600, invalidateOn: 'activity' },
};
