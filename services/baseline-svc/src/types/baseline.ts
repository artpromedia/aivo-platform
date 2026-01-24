// Type aliases that mirror Prisma types (avoid direct @prisma/client import for standalone type checking)
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';
export type BaselineDomain = 
  | 'ELA' 
  | 'MATH' 
  | 'SCIENCE' 
  | 'SPEECH' 
  | 'SEL'
  | 'SPELLING'
  | 'CREATIVE_WRITING'
  | 'LIFE_SKILLS'
  | 'MOTOR'
  | 'EXECUTIVE_FUNCTION'
  | 'SENSORY_PROCESSING';
export type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';

// ── IEP Document Types (for AI-powered question generation) ─────────────────

export interface IepGoalData {
  id: string;
  domain: string;
  category: string;
  description: string;
  baseline?: string | null;
  target?: string | null;
  measurementMethod?: string | null;
  timeline?: string | null;
  confidence?: number;
}

export interface IepAccommodationData {
  id: string;
  category: string;
  description: string;
  setting?: string | null;
  frequency?: string | null;
  confidence?: number;
}

export interface IepServiceData {
  id: string;
  type: string;
  provider?: string | null;
  frequency?: string | null;
  duration?: string | null;
  location?: string | null;
}

// ── AI Orchestrator request/response contracts ──────────────────────────────

export interface BaselineQuestionGenerationPayload {
  tenantId: string;
  learnerId: string;
  gradeBand: GradeBand;
  domain: BaselineDomain;
  skillCodes: string[];
  /** Target difficulty level (1-5 scale). Defaults to 3 (medium). */
  difficulty?: number;
  /** Number of questions to generate for this domain. Defaults to skillCodes.length. */
  questionCount?: number;

  // ── Parent Assessment Context (IDEA/504 Compliance) ───────────────────────
  /** Assessment type from parent assessment */
  assessmentType?: AssessmentType;
  /** Whether learner has an IEP */
  hasIep?: boolean;
  /** Whether learner has a 504 plan */
  has504?: boolean;
  /** IDEA disability categories */
  disabilityCategories?: string[];
  /** Areas of concern from parent assessment */
  areasOfConcern?: string[];

  // ── IEP Document Data (when available) ────────────────────────────────────
  /** IEP goals extracted from uploaded IEP document */
  iepGoals?: IepGoalData[];
  /** IEP accommodations from uploaded IEP document */
  iepAccommodations?: IepAccommodationData[];
  /** IEP services from uploaded IEP document */
  iepServices?: IepServiceData[];
}

export interface GeneratedQuestion {
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  questionText: string;
  options?: string[];
  correctAnswer: number | string;
  rubric?: string;
  /** Difficulty level of this question (1-5). */
  difficulty?: number;
}

export interface ScoreResponsePayload {
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  correctAnswer: number | string;
  selectedOption?: number;
  openResponse?: string;
  rubric?: string;
  /** Skill code for context in AI scoring */
  skillCode?: string;
  /** Grade band for context in AI scoring */
  gradeBand?: GradeBand;
}

export interface ScoreResponseResult {
  isCorrect: boolean;
  partialCredit: number | null;
  /** AI-generated feedback for the response (open-ended only) */
  feedback?: string;
}

// ── Domain skill codes (deterministic mapping) ──────────────────────────────

export const DOMAIN_SKILL_CODES: Record<BaselineDomain, string[]> = {
  // ═══ CORE ACADEMIC DOMAINS ═══
  ELA: [
    'ELA_PHONEMIC_AWARENESS',
    'ELA_FLUENCY',
    'ELA_VOCABULARY',
    'ELA_COMPREHENSION',
    'ELA_WRITING',
  ],
  MATH: [
    'MATH_NUMBER_SENSE',
    'MATH_OPERATIONS',
    'MATH_FRACTIONS',
    'MATH_GEOMETRY',
    'MATH_PROBLEM_SOLVING',
  ],
  SCIENCE: ['SCI_OBSERVATION', 'SCI_HYPOTHESIS', 'SCI_EXPERIMENT', 'SCI_DATA', 'SCI_CONCLUSION'],
  SPEECH: [
    'SPEECH_ARTICULATION',
    'SPEECH_FLUENCY',
    'SPEECH_VOICE',
    'SPEECH_LANGUAGE',
    'SPEECH_PRAGMATICS',
  ],
  SEL: [
    'SEL_SELF_AWARENESS',
    'SEL_SELF_MANAGEMENT',
    'SEL_SOCIAL_AWARENESS',
    'SEL_RELATIONSHIPS',
    'SEL_DECISIONS',
  ],

  // ═══ EXTENDED ACADEMIC DOMAINS ═══
  SPELLING: [
    'SPELL_PATTERNS',
    'SPELL_PHONICS',
    'SPELL_RULES',
    'SPELL_SIGHT_WORDS',
    'SPELL_COMPOUND',
  ],
  CREATIVE_WRITING: [
    'CW_STORY_ELEMENTS',
    'CW_CHARACTER',
    'CW_SETTING',
    'CW_DESCRIPTIVE',
    'CW_IMAGINATION',
  ],

  // ═══ FUNCTIONAL & DEVELOPMENTAL DOMAINS ═══
  // These are included based on IEP goals or parent assessment responses
  LIFE_SKILLS: [
    'LIFE_TIME',           // Time management, reading clocks, schedules
    'LIFE_MONEY',          // Coin identification, making change, budgeting
    'LIFE_SAFETY',         // Personal and community safety
    'LIFE_HYGIENE',        // Personal hygiene and health
    'LIFE_ORGANIZATION',   // Organizing belongings and tasks
  ],
  MOTOR: [
    'MOTOR_FINE_GRASP',       // Pencil grip, scissors use, buttoning
    'MOTOR_FINE_COORDINATION', // Tracing, cutting, threading
    'MOTOR_FINE_STRENGTH',    // Hand strength, endurance for writing
    'MOTOR_GROSS_BALANCE',    // Standing, walking, posture
    'MOTOR_GROSS_COORDINATION', // Throwing, catching, jumping
  ],
  EXECUTIVE_FUNCTION: [
    'EF_ATTENTION',           // Sustained attention, selective attention
    'EF_WORKING_MEMORY',      // Holding and manipulating information
    'EF_INHIBITION',          // Impulse control, waiting
    'EF_PLANNING',            // Task planning, sequencing steps
    'EF_FLEXIBILITY',         // Shifting between tasks, adapting to changes
  ],
  SENSORY_PROCESSING: [
    'SENSORY_VISUAL',         // Visual processing, tracking, discrimination
    'SENSORY_AUDITORY',       // Auditory processing, filtering
    'SENSORY_TACTILE',        // Touch sensitivity, discrimination
    'SENSORY_VESTIBULAR',     // Balance, movement processing
    'SENSORY_PROPRIOCEPTIVE', // Body awareness, force modulation
  ],
};

// ═══ DOMAIN CATEGORIES ═══
// Domains organized by when they should be included

/** Core academic domains - always included for all learners */
export const CORE_DOMAINS: BaselineDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];

/** Extended academic domains - included based on assessment type */
export const EXTENDED_ACADEMIC_DOMAINS: BaselineDomain[] = ['SPELLING', 'CREATIVE_WRITING'];

/** Functional domains - included for MODIFIED/ALTERNATE assessments or when indicated by IEP */
export const FUNCTIONAL_DOMAINS: BaselineDomain[] = ['LIFE_SKILLS'];

/** Developmental domains - included when indicated by IEP goals, services, or parent concerns */
export const DEVELOPMENTAL_DOMAINS: BaselineDomain[] = [
  'MOTOR',
  'EXECUTIVE_FUNCTION',
  'SENSORY_PROCESSING',
];

/** Default domains for standard assessments */
export const ALL_DOMAINS: BaselineDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];

// ═══ DOMAIN SELECTION CONTEXT ═══

export interface DomainSelectionContext {
  assessmentType: AssessmentType;
  hasIep: boolean;
  has504: boolean;
  iepGoals?: IepGoalData[];
  iepServices?: IepServiceData[];
  areasOfConcern?: string[];
  disabilityCategories?: string[];
  parentAssessmentResponses?: Record<string, unknown>;
}

export interface DomainSelectionResult {
  selectedDomains: BaselineDomain[];
  reasons: Record<BaselineDomain, string>;
  questionsPerDomain: Record<BaselineDomain, number>;
}
