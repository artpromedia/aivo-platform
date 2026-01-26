/**
 * AI-Assisted Content Authoring Types
 *
 * Type definitions for AI-powered content creation, validation, and quality assurance.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS & COMMON TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ContentType =
  | 'lesson'
  | 'assessment'
  | 'activity'
  | 'reading-passage'
  | 'video-script'
  | 'interactive-exercise'
  | 'study-guide'
  | 'flashcard-set';

export type Subject =
  | 'ELA'
  | 'MATH'
  | 'SCIENCE'
  | 'SOCIAL_STUDIES'
  | 'SEL'
  | 'SPEECH'
  | 'ART'
  | 'MUSIC'
  | 'WORLD_LANGUAGES'
  | 'HEALTH'
  | 'OTHER';

export type ContentStyle = 'formal' | 'conversational' | 'interactive' | 'narrative';

export type TargetLength = 'short' | 'medium' | 'long';

export type DOKLevel = 1 | 2 | 3 | 4; // Depth of Knowledge levels

export type AlignmentStrength = 'strong' | 'moderate' | 'weak';

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

export type BloomsLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export type QualityIssueSeverity = 'critical' | 'warning' | 'suggestion';

export type BiasType =
  | 'gender'
  | 'racial'
  | 'cultural'
  | 'socioeconomic'
  | 'ability'
  | 'religious'
  | 'age';

export type AccessibilityIssueType =
  | 'missing_alt_text'
  | 'complex_language'
  | 'insufficient_contrast'
  | 'missing_captions'
  | 'inaccessible_interactive'
  | 'no_keyboard_support'
  | 'missing_headings';

// ══════════════════════════════════════════════════════════════════════════════
// DRAFT GENERATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DraftGenerationRequest {
  contentType: ContentType;
  subject: Subject;
  gradeLevel: number;
  curriculumStandards: string[];
  topic: string;
  learningObjectives: string[];
  targetLength?: TargetLength;
  style?: ContentStyle;
  includeAssessments?: boolean;
  includeActivities?: boolean;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  keywords?: string[];
  prerequisites?: string[];
  targetAudience?: string;
  locale?: string;
}

export interface ContentSection {
  id: string;
  title: string;
  type: ContentSectionType;
  content: string;
  order: number;
  duration?: number; // estimated minutes
  blocks?: SectionBlock[];
  teacherNotes?: string;
}

export type ContentSectionType =
  | 'introduction'
  | 'instruction'
  | 'example'
  | 'practice'
  | 'activity'
  | 'assessment'
  | 'summary'
  | 'extension';

export interface SectionBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
}

export interface ImageSuggestion {
  description: string;
  purpose: string;
  placement: string; // section ID or position hint
  altText: string;
  searchTerms: string[];
}

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  stem: string;
  options?: QuestionOption[];
  correctAnswer: string | string[];
  explanation?: string;
  hints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: BloomsLevel;
  points: number;
  standardId?: string;
  tags?: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
  correct: boolean;
  feedback?: string;
}

export interface LearningActivity {
  id: string;
  title: string;
  type: ActivityType;
  description: string;
  instructions: string[];
  materials?: string[];
  duration: number; // minutes
  grouping: 'individual' | 'pairs' | 'small_group' | 'whole_class';
  standards?: string[];
  differentiations?: ActivityDifferentiation[];
}

export type ActivityType =
  | 'discussion'
  | 'hands_on'
  | 'project'
  | 'game'
  | 'investigation'
  | 'creative'
  | 'collaborative'
  | 'reflection'
  | 'practice';

export interface ActivityDifferentiation {
  level: 'below' | 'on' | 'above';
  modifications: string[];
}

export interface VocabularyTerm {
  term: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech?: string;
  examples: string[];
  context?: string;
  gradeAppropriate: boolean;
}

export interface GenerationMetadata {
  generatedAt: Date;
  model: string;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
  cached: boolean;
  requestId: string;
  version: string;
}

export interface GeneratedDraft {
  id: string;
  title: string;
  content: string;
  description: string;
  sections: ContentSection[];
  suggestedImages: ImageSuggestion[];
  assessmentQuestions?: AssessmentQuestion[];
  activities?: LearningActivity[];
  vocabularyTerms: VocabularyTerm[];
  curriculumAlignment: CurriculumAlignment;
  readabilityScore: ReadabilityMetrics;
  generationMetadata: GenerationMetadata;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  tenantId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// CURRICULUM ALIGNMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CurriculumAlignment {
  primaryStandards: AlignedStandard[];
  secondaryStandards: AlignedStandard[];
  misalignments: Misalignment[];
  coverageScore: number; // 0-100
  depthOfKnowledge: DOKLevel;
  suggestions: AlignmentSuggestion[];
  validatedAt: Date;
}

export interface AlignedStandard {
  standardId: string;
  standardCode: string;
  standardText: string;
  alignmentStrength: AlignmentStrength;
  evidence: string[];
  confidence: number; // 0-1
}

export interface Misalignment {
  standardId: string;
  standardCode: string;
  standardText: string;
  reason: string;
  suggestion: string;
}

export interface AlignmentSuggestion {
  type: 'add_content' | 'modify_content' | 'add_assessment' | 'adjust_depth';
  description: string;
  standardId?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number; // 0-100
}

export interface StandardSuggestion {
  standardId: string;
  standardCode: string;
  standardText: string;
  subject: Subject;
  gradeLevel: number;
  confidence: number;
  relevanceScore: number;
  evidence: string[];
}

export interface CurriculumGap {
  standardId: string;
  standardCode: string;
  standardText: string;
  gapType: 'missing' | 'insufficient' | 'off_target';
  severity: 'critical' | 'moderate' | 'minor';
  suggestedAdditions: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY SCORING TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface QualityScore {
  overall: number; // 0-100
  dimensions: QualityDimensions;
  issues: QualityIssue[];
  suggestions: QualitySuggestion[];
  readability: ReadabilityMetrics;
  scoredAt: Date;
  model: string;
}

export interface QualityDimensions {
  accuracy: DimensionScore;
  clarity: DimensionScore;
  engagement: DimensionScore;
  ageAppropriateness: DimensionScore;
  accessibility: DimensionScore;
  pedagogicalSoundness: DimensionScore;
  culturalSensitivity: DimensionScore;
}

export interface DimensionScore {
  score: number; // 0-100
  confidence: number; // 0-1
  feedback: string;
  evidence: string[];
}

export interface QualityIssue {
  id: string;
  dimension: keyof QualityDimensions;
  severity: QualityIssueSeverity;
  description: string;
  location?: ContentLocation;
  suggestedFix?: string;
}

export interface ContentLocation {
  sectionId?: string;
  paragraph?: number;
  startOffset?: number;
  endOffset?: number;
  text?: string;
}

export interface QualitySuggestion {
  id: string;
  dimension: keyof QualityDimensions;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
  rationale: string;
}

export interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageSentenceLength: number;
  averageWordLength: number;
  complexWordPercentage: number;
  sentenceCount: number;
  wordCount: number;
  syllableCount: number;
  targetGradeLevel: number;
  targetGradeAppropriate: boolean;
  recommendation?: string;
}

export interface AccuracyCheck {
  overall: number;
  factualIssues: FactualIssue[];
  verifiedClaims: VerifiedClaim[];
  unverifiableClaims: string[];
  confidence: number;
}

export interface FactualIssue {
  claim: string;
  issue: string;
  correction?: string;
  source?: string;
  severity: 'error' | 'misleading' | 'outdated';
}

export interface VerifiedClaim {
  claim: string;
  confidence: number;
  source?: string;
}

export interface BiasAnalysis {
  overall: number; // 0-100 (higher = less biased)
  detectedBiases: DetectedBias[];
  inclusivityScore: number;
  recommendations: string[];
}

export interface DetectedBias {
  type: BiasType;
  severity: 'high' | 'medium' | 'low';
  location: ContentLocation;
  description: string;
  suggestion: string;
}

export interface AccessibilityCheck {
  wcagLevel: 'A' | 'AA' | 'AAA';
  issues: AccessibilityIssue[];
  score: number;
  recommendations: string[];
}

export interface AccessibilityIssue {
  type: AccessibilityIssueType;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  location?: ContentLocation;
  wcagCriteria: string;
  howToFix: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface RegenerateSectionRequest {
  draftId: string;
  sectionIndex: number;
  feedback?: string;
}

export interface ExpandContentRequest {
  draftId: string;
  sectionIndex: number;
  targetLength: number; // approximate word count
}

export interface SimplifyContentRequest {
  contentId: string;
  targetGradeLevel: number;
}

export interface ValidateAlignmentRequest {
  contentId?: string;
  content?: string;
  targetStandards: string[];
  subject: Subject;
  gradeLevel: number;
}

export interface ScoreQualityRequest {
  contentId?: string;
  content?: string;
  metadata?: ContentMetadata;
}

export interface ContentMetadata {
  subject: Subject;
  gradeLevel: number;
  contentType: ContentType;
  standards?: string[];
  targetAudience?: string;
}

export interface SuggestImprovementsRequest {
  contentId: string;
  focusAreas?: (keyof QualityDimensions)[];
}

export interface ImprovementSuggestions {
  suggestions: DetailedSuggestion[];
  prioritizedActions: PrioritizedAction[];
  estimatedScoreImpact: number;
}

export interface DetailedSuggestion {
  id: string;
  area: keyof QualityDimensions;
  title: string;
  description: string;
  currentState: string;
  suggestedState: string;
  rationale: string;
  impact: number;
}

export interface PrioritizedAction {
  rank: number;
  suggestionId: string;
  summary: string;
  estimatedEffort: string;
}

export interface AutoTagRequest {
  contentId: string;
}

export interface AutoTagResponse {
  tags: GeneratedTag[];
  standards: StandardSuggestion[];
  topics: string[];
  skills: string[];
}

export interface GeneratedTag {
  name: string;
  category: 'topic' | 'skill' | 'concept' | 'audience' | 'difficulty';
  confidence: number;
}

export interface GenerateAssessmentRequest {
  contentId: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  bloomsLevels?: BloomsLevel[];
  includeRubric?: boolean;
}

export interface AssessmentDraft {
  id: string;
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  rubric?: GeneratedRubric;
  totalPoints: number;
  estimatedDuration: number;
  standards: string[];
  metadata: GenerationMetadata;
}

export interface GeneratedRubric {
  id: string;
  title: string;
  criteria: RubricCriterion[];
  totalPoints: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AIReviewSession {
  id: string;
  contentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  qualityScore?: QualityScore;
  alignmentResult?: CurriculumAlignment;
  accessibilityCheck?: AccessibilityCheck;
  suggestions: AIReviewSuggestion[];
  startedAt: Date;
  completedAt?: Date;
  reviewerId?: string;
}

export interface AIReviewSuggestion {
  id: string;
  type: 'quality' | 'alignment' | 'accessibility' | 'bias';
  title: string;
  description: string;
  autoApplicable: boolean;
  appliedAt?: Date;
  appliedBy?: string;
  dismissed?: boolean;
  dismissedReason?: string;
}

export interface ContentPipelineStage {
  name: PipelineStageName;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type PipelineStageName =
  | 'ai_draft_generation'
  | 'human_review_edit'
  | 'ai_quality_check'
  | 'curriculum_validation'
  | 'accessibility_check'
  | 'final_approval';

export interface ContentPipelineState {
  contentId: string;
  stages: ContentPipelineStage[];
  currentStage: PipelineStageName;
  overallStatus: 'in_progress' | 'completed' | 'blocked' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
}

export interface CachedResult<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  cacheKey: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DraftGeneratorConfig {
  maxContentLength: number;
  defaultTimeout: number;
  enableStreaming: boolean;
  cacheConfig: CacheConfig;
  qualityThreshold: number;
}

export interface AIAuthoringConfig {
  aiOrchestratorUrl: string;
  draftGenerator: DraftGeneratorConfig;
  cache: CacheConfig;
  generation: {
    timeout: number;
    maxRetries: number;
    temperature: number;
  };
  validation: {
    alignmentCacheTtl: number;
    qualityScoreCacheTtl: number;
  };
}
