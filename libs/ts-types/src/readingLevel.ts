/**
 * Reading Level Types
 *
 * Types for reading level assessment, Lexile measurement,
 * and content adaptation for personalized learning.
 */

// ══════════════════════════════════════════════════════════════════════════════
// LEXILE & READING LEVEL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Lexile measure ranges by grade level
 * @example { K: { min: -100, max: 100, typical: 0 } }
 */
export interface LexileGradeRange {
  min: number;
  max: number;
  typical: number;
}

/** Standard Lexile ranges by grade */
export type LexileGradeRanges = Record<string, LexileGradeRange>;

/**
 * A learner's reading level profile
 */
export interface ReadingLevelProfile {
  /** Current estimated Lexile level */
  lexileLevel: number;
  /** Lower bound of comfort reading range */
  lexileLevelLow: number;
  /** Upper bound (stretch level) */
  lexileLevelHigh: number;
  /** Confidence in the estimate (0-1) */
  confidence: number;
  /** Grade-equivalent (e.g., 5.3 = 5th grade, 3rd month) */
  gradeEquivalent: number;
  /** When the level was last assessed */
  lastAssessedAt?: string;
  /** Preferred content delivery Lexile (may differ from reading level) */
  targetContentLexile?: number;
  /** Whether learner prefers simplified language */
  preferSimplifiedLanguage?: boolean;
}

/**
 * Reading assessment types
 */
export type ReadingAssessmentType =
  | 'BASELINE'
  | 'ADAPTIVE'
  | 'COMPREHENSION_CHECK'
  | 'ORAL_READING'
  | 'VOCABULARY_PROBE';

/**
 * A single reading level assessment result
 */
export interface ReadingLevelAssessment {
  id: string;
  virtualBrainId: string;
  assessmentType: ReadingAssessmentType;
  lexileLevel: number;
  gradeEquivalent: number;
  confidence: number;
  /** Number of words in the assessment */
  wordsAssessed?: number;
  /** Number of passages read */
  passagesRead?: number;
  /** Comprehension score (0-1) */
  comprehensionScore?: number;
  /** Oral reading fluency in words per minute */
  fluencyWpm?: number;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// READABILITY ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Text statistics for readability calculation
 */
export interface TextStatistics {
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  complexWordCount: number;
  complexWordPercentage: number;
}

/**
 * Vocabulary complexity analysis
 */
export interface VocabularyAnalysis {
  academicWordCount: number;
  rareWordCount: number;
  domainSpecificTerms: string[];
}

/**
 * Complete readability analysis result
 */
export interface ReadabilityAnalysis {
  lexileLevel: number;
  gradeEquivalent: number;
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  confidence: number;
  analysis: TextStatistics;
  vocabularyAnalysis: VocabularyAnalysis;
  suggestions?: string[];
}

/**
 * Request to estimate Lexile level
 */
export interface LexileEstimateRequest {
  text: string;
  context?: {
    subject?: string;
    gradeLevel?: string;
    contentType?: 'instruction' | 'narrative' | 'informational' | 'assessment';
  };
}

/**
 * Reading level estimate result
 */
export interface ReadingLevelEstimate {
  lexileLevel: number;
  lexileLevelLow: number;
  lexileLevelHigh: number;
  gradeEquivalent: number;
  confidence: number;
  assessmentBasis: 'ai_analysis' | 'formula_estimate' | 'comprehension_performance';
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT ADAPTATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Content type for adaptation context
 */
export type ContentType = 'instruction' | 'explanation' | 'question' | 'feedback' | 'narrative';

/**
 * Learner context for personalized adaptation
 */
export interface LearnerAdaptationContext {
  hasIEP?: boolean;
  englishLearner?: boolean;
  interests?: string[];
}

/**
 * Request to adapt content to a target reading level
 */
export interface ContentAdaptationRequest {
  content: string;
  targetLexile: number;
  currentLexile?: number;
  subject?: string;
  topic?: string;
  conceptGradeLevel?: string;
  contentType?: ContentType;
  preserveTerms?: string[];
  context?: {
    learnerProfile?: LearnerAdaptationContext;
  };
}

/**
 * A term simplification record
 */
export interface TermSimplification {
  original: string;
  simplified: string;
  reason?: string;
}

/**
 * Vocabulary support for a term
 */
export interface VocabularySupport {
  term: string;
  definition: string;
  exampleSentence?: string;
}

/**
 * Result of content adaptation
 */
export interface AdaptedContent {
  adaptedContent: string;
  originalContent: string;
  achievedLexile: number;
  targetLexile: number;
  gradeEquivalent: number;
  simplifications: TermSimplification[];
  preservedTerms: string[];
  vocabularySupport?: VocabularySupport[];
  confidence: number;
}

/**
 * A version of content at a specific reading level
 */
export interface ScaffoldedVersion {
  lexileLevel: number;
  gradeEquivalent: number;
  content: string;
  vocabularySupport?: VocabularySupport[];
}

/**
 * Multiple scaffolded versions of content
 */
export interface ScaffoldedContent {
  versions: ScaffoldedVersion[];
  recommendedVersion: number;
}

/**
 * Request for batch content adaptation
 */
export interface BatchAdaptationRequest {
  items: Array<{
    id: string;
    content: string;
    contentType?: ContentType;
  }>;
  targetLexile: number;
  subject?: string;
  preserveTerms?: string[];
}

/**
 * Result of batch content adaptation
 */
export interface BatchAdaptationResult {
  results: Record<string, AdaptedContent>;
  itemCount: number;
  targetLexile: number;
}

/**
 * Question to be adapted
 */
export interface AdaptableQuestion {
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

/**
 * Result of adapting a question
 */
export interface AdaptedQuestion {
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  originalPrompt: string;
  achievedLexile: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// VIRTUAL BRAIN READING LEVEL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Reading level fields for Virtual Brain
 */
export interface VirtualBrainReadingLevel {
  lexileLevel?: number;
  lexileLevelLow?: number;
  lexileLevelHigh?: number;
  lexileConfidence?: number;
  lexileLastAssessed?: string;
  readingGradeLevel?: number;
  preferSimplifiedLanguage: boolean;
  targetContentLexile?: number;
}

/**
 * Request to update reading level in Virtual Brain
 */
export interface UpdateReadingLevelRequest {
  lexileLevel: number;
  lexileLevelLow?: number;
  lexileLevelHigh?: number;
  confidence: number;
  gradeEquivalent: number;
  assessmentType: ReadingAssessmentType;
  assessmentDetails?: {
    wordsAssessed?: number;
    passagesRead?: number;
    comprehensionScore?: number;
    fluencyWpm?: number;
  };
}
