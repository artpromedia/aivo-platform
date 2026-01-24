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
};

export const ALL_DOMAINS: BaselineDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];
