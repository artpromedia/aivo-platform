/**
 * AI Content Generation Types
 *
 * Type definitions for AI-powered content generation including:
 * - Lesson generation
 * - Question generation
 * - Adaptive explanations
 * - Feedback generation
 * - Image generation
 * - Learning paths
 */

// ────────────────────────────────────────────────────────────────────────────
// COMMON TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface GenerationContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  correlationId?: string;
}

export interface GenerationMetadata {
  generatedAt: Date;
  model: string;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
  cached: boolean;
}

export type GradeLevel =
  | 'k'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | 'college';

export type ContentStyle = 'formal' | 'conversational' | 'interactive';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type BloomsLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

// ────────────────────────────────────────────────────────────────────────────
// LESSON GENERATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface LessonGenerationRequest extends GenerationContext {
  topic: string;
  subject: string;
  gradeLevel: GradeLevel;
  standards?: string[];
  duration?: number;
  learningObjectives?: string[];
  includeActivities?: boolean;
  includeAssessment?: boolean;
  contentStyle?: ContentStyle;
  difficultyLevel?: DifficultyLevel;
  prerequisites?: string[];
  keywords?: string[];
  targetAudience?: string;
}

export interface GeneratedLesson {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  duration: number;
  blocks: GeneratedBlock[];
  assessment?: GeneratedAssessment;
  vocabulary?: VocabularyItem[];
  resources?: LessonResource[];
  teacherNotes?: string;
  standards?: string[];
  metadata: GenerationMetadata;
}

export interface GeneratedBlock {
  id: string;
  type: BlockType;
  order: number;
  data: BlockData;
}

export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'interactive'
  | 'question'
  | 'activity'
  | 'callout'
  | 'example'
  | 'code';

export interface BlockData {
  content?: string;
  text?: string;
  level?: number;
  title?: string;
  instructions?: string;
  duration?: number;
  type?: string;
  src?: string;
  alt?: string;
  caption?: string;
  language?: string;
  [key: string]: unknown;
}

export interface VocabularyItem {
  term: string;
  definition: string;
  example?: string;
}

export interface LessonResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'interactive' | 'worksheet' | 'other';
  description?: string;
}

export interface LessonOutline {
  title: string;
  objectives: string[];
  sections: LessonSection[];
  estimatedDuration: number;
}

export interface LessonSection {
  title: string;
  topics: string[];
  duration?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// QUESTION GENERATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface QuestionGenerationRequest extends GenerationContext {
  content: string;
  subject: string;
  gradeLevel: GradeLevel;
  questionTypes: QuestionType[];
  count: number;
  difficulty?: DifficultyLevel | 'mixed';
  bloomsLevels?: BloomsLevel[];
  includeExplanations?: boolean;
  includeHints?: boolean;
  standards?: string[];
}

export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'essay'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'drag_drop';

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  stem: string;
  stemHtml?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  hints?: string[];
  difficulty: DifficultyLevel;
  bloomsLevel: BloomsLevel;
  points: number;
  tags: string[];
  metadata: {
    generatedAt: Date;
    source: 'ai';
  };
}

export interface QuestionOption {
  id: string;
  text: string;
  correct: boolean;
  feedback?: string;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface QuestionImprovement {
  stem: string;
  options?: QuestionOption[];
  suggestions: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// ASSESSMENT GENERATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface GeneratedAssessment {
  id: string;
  type: 'quiz' | 'exit_ticket' | 'test' | 'diagnostic';
  title?: string;
  instructions?: string;
  timeLimit?: number;
  questions: AssessmentQuestion[];
  passingScore?: number;
  metadata: GenerationMetadata;
}

export interface AssessmentQuestion {
  type: QuestionType;
  stem: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
  standard?: string;
  bloomsLevel?: BloomsLevel;
}

export interface RubricCriteria {
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  description: string;
}

export interface GeneratedRubric {
  id: string;
  title: string;
  description?: string;
  criteria: RubricCriteria[];
  totalPoints: number;
  metadata: GenerationMetadata;
}

// ────────────────────────────────────────────────────────────────────────────
// ADAPTIVE EXPLANATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ExplanationRequest extends GenerationContext {
  concept: string;
  context?: string;
  studentId: string;
  skillId?: string;
  previousAttempt?: {
    question: string;
    studentAnswer: string;
    correctAnswer: string;
  };
  preferredStyle?: 'visual' | 'textual' | 'example-based' | 'step-by-step';
}

export interface AdaptiveExplanation {
  explanation: string;
  examples?: ExplanationExample[];
  visualDescription?: string;
  analogies?: string[];
  checkQuestions?: CheckQuestion[];
  relatedConcepts?: string[];
  difficultyLevel: 'simplified' | 'standard' | 'advanced';
}

export interface ExplanationExample {
  scenario: string;
  application: string;
}

export interface CheckQuestion {
  question: string;
  answer: string;
}

export interface StepByStepSolution {
  steps: SolutionStep[];
  finalAnswer: string;
  commonMistakes?: string[];
}

export interface SolutionStep {
  number: number;
  action: string;
  explanation: string;
  checkpoint?: string;
}

export interface WrongAnswerExplanation {
  explanation: string;
  misconception?: string;
  correctPath: string;
  encouragement?: string;
  tryAgainHint?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// FEEDBACK GENERATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface FeedbackRequest extends GenerationContext {
  submissionType: SubmissionType;
  question: string;
  rubric?: RubricCriteria[];
  studentResponse: string;
  maxPoints: number;
  gradeLevel: GradeLevel;
  subject: string;
  studentId: string;
  teacherGuidelines?: string;
  sampleAnswer?: string;
}

export type SubmissionType =
  | 'essay'
  | 'short_answer'
  | 'code'
  | 'project'
  | 'math_work'
  | 'creative_writing'
  | 'lab_report';

export interface GeneratedFeedback {
  overallScore: number;
  maxScore: number;
  percentage: number;
  rubricScores?: RubricScore[];
  strengths: string[];
  areasForImprovement: string[];
  specificFeedback: string;
  suggestions: string[];
  encouragement: string;
  nextSteps?: string[];
  confidence: number;
}

export interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface EssayFeedback extends GeneratedFeedback {
  grammarIssues?: GrammarIssue[];
  structureAnalysis?: StructureAnalysis;
}

export interface GrammarIssue {
  text: string;
  issue: string;
  suggestion: string;
  position?: { start: number; end: number };
}

export interface StructureAnalysis {
  hasIntroduction: boolean;
  hasConclusion: boolean;
  paragraphCount: number;
  suggestions: string[];
}

export interface PeerReviewGuide {
  instructions: string;
  questions: CriterionQuestions[];
  feedbackTemplates: string[];
}

export interface CriterionQuestions {
  criterion: string;
  questions: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ImageGenerationRequest extends GenerationContext {
  prompt: string;
  type: ImageType;
  subject?: string;
  gradeLevel?: GradeLevel;
  style?: ImageStyle;
  size?: ImageSize;
  count?: number;
}

export type ImageType =
  | 'diagram'
  | 'illustration'
  | 'chart'
  | 'infographic'
  | 'map'
  | 'concept_map'
  | 'timeline'
  | 'character'
  | 'scene';

export type ImageStyle =
  | 'realistic'
  | 'cartoon'
  | 'educational'
  | 'minimalist'
  | 'hand-drawn'
  | 'technical';

export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';

export interface GeneratedImage {
  id: string;
  url: string;
  revisedPrompt?: string;
  altText: string;
  metadata: GenerationMetadata;
}

// ────────────────────────────────────────────────────────────────────────────
// LEARNING PATH TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface LearningPathRequest extends GenerationContext {
  goal: string;
  currentLevel?: DifficultyLevel;
  targetSkills?: string[];
  timeframe?: string;
  studentProfile?: StudentPathProfile;
}

export interface StudentPathProfile {
  gradeLevel: GradeLevel;
  strengths?: string[];
  weaknesses?: string[];
  learningStyle?: string;
  pacePreference?: 'fast' | 'moderate' | 'slow';
}

export interface GeneratedLearningPath {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  nodes: LearningPathNode[];
  milestones: PathMilestone[];
  metadata: GenerationMetadata;
}

export interface LearningPathNode {
  id: string;
  type: 'lesson' | 'quiz' | 'project' | 'review' | 'checkpoint';
  title: string;
  description: string;
  duration: number;
  prerequisites?: string[];
  skills: string[];
  order: number;
}

export interface PathMilestone {
  title: string;
  description: string;
  targetNode: string;
  badge?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// TRANSLATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface TranslationRequest extends GenerationContext {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  contentType?: 'lesson' | 'question' | 'feedback' | 'general';
  preserveFormatting?: boolean;
  educationalContext?: boolean;
}

export interface TranslatedContent {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: TranslationGlossaryItem[];
  metadata: GenerationMetadata;
}

export interface TranslationGlossaryItem {
  source: string;
  translation: string;
  context?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// CONTENT ENHANCEMENT TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface EnhancementRequest extends GenerationContext {
  content: string;
  enhancements: EnhancementOptions;
  gradeLevel?: GradeLevel;
}

export interface EnhancementOptions {
  addExamples?: boolean;
  simplifyLanguage?: boolean;
  addInteractiveElements?: boolean;
  addVisualDescriptions?: boolean;
  improveEngagement?: boolean;
  addAccessibility?: boolean;
  expandContent?: boolean;
  summarize?: boolean;
}

export interface EnhancedContent {
  content: string;
  appliedEnhancements: string[];
  suggestions?: string[];
  metadata: GenerationMetadata;
}

// ────────────────────────────────────────────────────────────────────────────
// COST TRACKING TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface CostTrackingData {
  requestId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  userId?: string;
  tenantId: string;
  useCase: string;
  timestamp: Date;
}

export interface UsageSummary {
  period: 'day' | 'week' | 'month';
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, ProviderUsage>;
  byUseCase: Record<string, UseCaseUsage>;
}

export interface ProviderUsage {
  requests: number;
  tokens: number;
  cost: number;
}

export interface UseCaseUsage {
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
}
