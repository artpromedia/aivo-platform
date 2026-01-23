/**
 * IEP (Individualized Education Program) Types
 *
 * Comprehensive type definitions for AI-powered IEP goal generation.
 * Designed for IDEA (Individuals with Disabilities Education Act) compliance.
 *
 * @module types/iep.types
 */

// ════════════════════════════════════════════════════════════════════════════════
// ENUMS AND CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * IEP goal categories as defined by IDEA
 */
export type IEPGoalCategory = 'academic' | 'functional' | 'behavioral' | 'social-emotional';

/**
 * Academic/functional domains for IEP goals
 */
export type IEPDomain =
  | 'ELA'
  | 'MATH'
  | 'SCIENCE'
  | 'SPEECH'
  | 'SEL'
  | 'BEHAVIOR'
  | 'MOTOR'
  | 'ADAPTIVE'
  | 'VOCATIONAL'
  | 'OTHER';

/**
 * Common disability categories under IDEA
 */
export type DisabilityCategory =
  | 'autism'
  | 'deaf-blindness'
  | 'deafness'
  | 'developmental-delay'
  | 'emotional-disturbance'
  | 'hearing-impairment'
  | 'intellectual-disability'
  | 'multiple-disabilities'
  | 'orthopedic-impairment'
  | 'other-health-impairment'
  | 'specific-learning-disability'
  | 'speech-language-impairment'
  | 'traumatic-brain-injury'
  | 'visual-impairment';

/**
 * Measurement methods for IEP goal tracking
 */
export type MeasurementMethod =
  | 'observation'
  | 'work-samples'
  | 'curriculum-based-assessment'
  | 'standardized-test'
  | 'teacher-made-test'
  | 'rubric-scoring'
  | 'frequency-count'
  | 'duration-recording'
  | 'interval-recording'
  | 'portfolio-assessment'
  | 'checklist'
  | 'rating-scale';

/**
 * Service provider types for IEP services
 */
export type ServiceProvider =
  | 'special-education-teacher'
  | 'general-education-teacher'
  | 'speech-language-pathologist'
  | 'occupational-therapist'
  | 'physical-therapist'
  | 'school-psychologist'
  | 'school-counselor'
  | 'behavior-specialist'
  | 'paraprofessional'
  | 'other';

// ════════════════════════════════════════════════════════════════════════════════
// STUDENT CONTEXT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Current performance level in a subject area
 */
export interface PerformanceLevel {
  /** Academic or functional subject area */
  subject: string;
  /** Current performance level (e.g., "below grade level", "approaching", "at grade level") */
  level: string;
  /** Detailed description of current abilities */
  description: string;
  /** Quantitative baseline if available (e.g., "45% accuracy on multiplication facts") */
  quantitativeBaseline?: string;
  /** Assessment source (e.g., "STAR Reading", "teacher observation") */
  assessmentSource?: string;
  /** Date of assessment */
  assessmentDate?: string;
}

/**
 * Student context for IEP goal generation
 */
export interface IEPStudentContext {
  /** Unique learner identifier */
  learnerId: string;
  /** Student's current grade level (K, 1-12) */
  gradeLevel: number | string;
  /** Primary language */
  primaryLanguage?: string;
  /** IDEA disability categories */
  disabilities: DisabilityCategory[];
  /** Current performance levels across subjects */
  currentPerformanceLevels: PerformanceLevel[];
  /** Student's identified strengths */
  strengths: string[];
  /** Student's identified needs/areas for growth */
  needs: string[];
  /** Parent/guardian concerns and input */
  parentConcerns?: string;
  /** Student's own input (for transition-age students) */
  studentInput?: string;
  /** Recent evaluation data */
  evaluationData?: {
    /** Cognitive assessment results */
    cognitive?: Record<string, unknown>;
    /** Academic achievement results */
    academic?: Record<string, unknown>;
    /** Behavioral assessment results */
    behavioral?: Record<string, unknown>;
    /** Speech/language evaluation results */
    speechLanguage?: Record<string, unknown>;
    /** Other evaluations */
    other?: Record<string, unknown>;
  };
  /** Learning preferences and style */
  learningPreferences?: {
    visualLearner?: boolean;
    auditoryLearner?: boolean;
    kinestheticLearner?: boolean;
    preferredModality?: string;
  };
  /** Existing accommodations that have been effective */
  effectiveAccommodations?: string[];
  /** Previous IEP goals for continuity */
  previousGoals?: PreviousGoal[];
}

/**
 * Information about previous IEP goals
 */
export interface PreviousGoal {
  /** Goal description */
  description: string;
  /** Goal domain */
  domain: IEPDomain;
  /** Whether the goal was met, partially met, or not met */
  status: 'met' | 'partially-met' | 'not-met' | 'in-progress';
  /** Progress notes */
  progressNotes?: string;
  /** Why the goal was or wasn't met */
  reasonForOutcome?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// IEP GOAL COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Short-term benchmark/objective for an IEP goal
 */
export interface IEPBenchmark {
  /** Unique identifier for this benchmark */
  id?: string;
  /** Target date for achieving this benchmark (ISO date string) */
  targetDate: string;
  /** Description of the benchmark */
  description: string;
  /** Specific success criteria */
  criteria: string;
  /** How progress will be measured */
  measurementMethod: MeasurementMethod | string;
  /** Expected frequency of measurement */
  measurementFrequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
}

/**
 * Complete IEP goal with all required IDEA components
 */
export interface IEPGoal {
  /** Unique identifier */
  id: string;
  /** Goal category (academic, functional, behavioral, social-emotional) */
  category: IEPGoalCategory;
  /** Subject area if applicable */
  subject?: string;
  /** Domain (ELA, MATH, etc.) */
  domain: IEPDomain;
  /** Full annual goal statement (measurable, time-bound) */
  annualGoal: string;
  /** Present level of performance (baseline) */
  baseline: string;
  /** Target criteria for goal completion */
  targetCriteria: string;
  /** How progress will be measured */
  measurementMethod: MeasurementMethod | string;
  /** Short-term objectives/benchmarks */
  benchmarks: IEPBenchmark[];
  /** Required accommodations for this goal */
  accommodations: string[];
  /** Weekly service minutes */
  serviceMinutes: number;
  /** Service provider type */
  provider: ServiceProvider | string;
  /** State/Common Core standards alignment */
  alignedStandards?: string[];
  /** Confidence score for AI-generated goal (0-1) */
  confidence?: number;
  /** Rationale for this goal */
  rationale?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Request payload for IEP goal generation
 */
export interface IEPGenerationRequest {
  /** Tenant ID for multi-tenant support */
  tenantId: string;
  /** Student context with all relevant information */
  studentContext: IEPStudentContext;
  /** Focus areas/domains for goal generation */
  focusAreas: IEPDomain[];
  /** Number of goals to generate per focus area (default: 2) */
  goalsPerArea?: number;
  /** Previous IEP goals for continuity */
  previousGoals?: IEPGoal[];
  /** Custom prompt additions */
  customPrompt?: string;
  /** Timeframe for goals */
  timeframe?: 'quarter' | 'semester' | 'annual';
  /** Request ID for tracking */
  requestId?: string;
}

/**
 * Response payload for IEP goal generation
 */
export interface IEPGenerationResponse {
  /** Generated IEP goals */
  goals: IEPGoal[];
  /** Overall rationale for the generated goals */
  rationale: string;
  /** Suggested accommodations across all goals */
  suggestedAccommodations: string[];
  /** Suggested related services */
  suggestedServices: SuggestedService[];
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Generation metadata */
  metadata: IEPGenerationMetadata;
  /** Legal disclaimer */
  disclaimer: string;
}

/**
 * Suggested related service
 */
export interface SuggestedService {
  /** Service type */
  service: string;
  /** Suggested frequency (e.g., "2x per week") */
  frequency: string;
  /** Suggested duration in minutes per session */
  durationMinutes: number;
  /** Provider type */
  provider: ServiceProvider | string;
  /** Rationale for this service */
  rationale: string;
}

/**
 * Metadata about the IEP generation process
 */
export interface IEPGenerationMetadata {
  /** Request ID */
  requestId: string;
  /** Generation timestamp (ISO string) */
  generatedAt: string;
  /** LLM provider used */
  provider: string;
  /** Model used */
  model: string;
  /** Generation latency in milliseconds */
  latencyMs: number;
  /** Token usage */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Number of generation attempts */
  attempts: number;
  /** Validation results */
  validation: {
    passed: boolean;
    warnings: string[];
    errors: string[];
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ACCOMMODATION TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Accommodation category
 */
export type AccommodationCategory =
  | 'presentation'
  | 'response'
  | 'setting'
  | 'timing-scheduling'
  | 'assistive-technology'
  | 'other';

/**
 * Detailed accommodation suggestion
 */
export interface AccommodationSuggestion {
  /** Accommodation category */
  category: AccommodationCategory;
  /** Accommodation description */
  accommodation: string;
  /** Rationale for this accommodation */
  rationale: string;
  /** Implementation details */
  implementation: string;
  /** Which disabilities this addresses */
  addressesDisabilities?: DisabilityCategory[];
  /** Which domains this supports */
  supportsDomains?: IEPDomain[];
}

/**
 * Request for accommodation suggestions
 */
export interface AccommodationSuggestionRequest {
  /** Student disabilities */
  disabilities: DisabilityCategory[];
  /** Grade level */
  gradeLevel: number | string;
  /** Target domains */
  domains: IEPDomain[];
  /** Student needs */
  needs?: string[];
  /** Existing accommodations to avoid duplicating */
  existingAccommodations?: string[];
}

/**
 * Response for accommodation suggestions
 */
export interface AccommodationSuggestionResponse {
  /** Suggested accommodations */
  accommodations: AccommodationSuggestion[];
  /** Generation metadata */
  generatedAt: string;
  /** Disclaimer */
  disclaimer: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// OBJECTIVE GENERATION TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Request for generating objectives for an existing goal
 */
export interface ObjectiveGenerationRequest {
  /** The annual goal to generate objectives for */
  goalTitle: string;
  /** Goal description */
  goalDescription: string;
  /** Goal domain */
  domain: IEPDomain;
  /** Student grade level */
  gradeLevel: number | string;
  /** Current baseline */
  baseline?: string;
  /** Number of objectives to generate */
  numberOfObjectives?: number;
  /** Goal timeframe */
  timeframe?: 'quarter' | 'semester' | 'annual';
}

/**
 * Response for objective generation
 */
export interface ObjectiveGenerationResponse {
  /** Generated objectives/benchmarks */
  objectives: IEPBenchmark[];
  /** Generation timestamp */
  generatedAt: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Validation result for an IEP goal
 */
export interface IEPGoalValidationResult {
  /** Whether the goal passed all validations */
  valid: boolean;
  /** Goal ID that was validated */
  goalId: string;
  /** Validation errors (blocking issues) */
  errors: ValidationIssue[];
  /** Validation warnings (non-blocking issues) */
  warnings: ValidationIssue[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** IDEA compliance score (0-100) */
  ideaComplianceScore: number;
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  /** Issue code for programmatic handling */
  code: string;
  /** Human-readable message */
  message: string;
  /** Which field caused the issue */
  field?: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Aggregated validation result for multiple goals
 */
export interface IEPValidationResult {
  /** Overall validity */
  valid: boolean;
  /** Individual goal validations */
  goalValidations: IEPGoalValidationResult[];
  /** Overall IDEA compliance score */
  overallComplianceScore: number;
  /** Summary of all errors */
  errorSummary: string[];
  /** Summary of all warnings */
  warningSummary: string[];
}
