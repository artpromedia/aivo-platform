// Type aliases that mirror Prisma types (avoid direct @prisma/client import for standalone type checking)
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';
export type BaselineDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL';

// ── AI Orchestrator request/response contracts ──────────────────────────────

export interface BaselineQuestionGenerationPayload {
  tenantId: string;
  learnerId: string;
  gradeBand: GradeBand;
  domain: BaselineDomain;
  skillCodes: string[];
}

export interface GeneratedQuestion {
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  questionText: string;
  options?: string[];
  correctAnswer: number | string;
  rubric?: string;
}

export interface ScoreResponsePayload {
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  correctAnswer: number | string;
  selectedOption?: number;
  openResponse?: string;
  rubric?: string;
}

export interface ScoreResponseResult {
  isCorrect: boolean;
  partialCredit: number | null;
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
