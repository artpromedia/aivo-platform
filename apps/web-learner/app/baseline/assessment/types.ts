// Domain-based baseline assessment types

export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

export type AssessmentDomain = 
  | 'MATH' 
  | 'ELA' 
  | 'SPEECH' 
  | 'SEL' 
  | 'SPELLING' 
  | 'CREATIVE_WRITING' 
  | 'LIFE_SKILLS';

export interface DomainInfo {
  id: AssessmentDomain;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const ASSESSMENT_DOMAINS: DomainInfo[] = [
  { 
    id: 'MATH', 
    name: 'Math', 
    emoji: '🔢', 
    description: 'Numbers, shapes, and problem-solving',
    color: 'from-blue-400 to-blue-600'
  },
  { 
    id: 'ELA', 
    name: 'Reading & Writing', 
    emoji: '📚', 
    description: 'Reading, vocabulary, and comprehension',
    color: 'from-purple-400 to-purple-600'
  },
  { 
    id: 'SPEECH', 
    name: 'Speech & Language', 
    emoji: '🗣️', 
    description: 'Communication and expression',
    color: 'from-teal-400 to-teal-600'
  },
  { 
    id: 'SEL', 
    name: 'Social & Emotional', 
    emoji: '❤️', 
    description: 'Feelings, relationships, and decisions',
    color: 'from-pink-400 to-pink-600'
  },
  { 
    id: 'SPELLING', 
    name: 'Spelling', 
    emoji: '✏️', 
    description: 'Word patterns and spelling rules',
    color: 'from-amber-400 to-amber-600'
  },
  { 
    id: 'CREATIVE_WRITING', 
    name: 'Creative Writing', 
    emoji: '🎨', 
    description: 'Imagination and storytelling',
    color: 'from-green-400 to-green-600'
  },
  { 
    id: 'LIFE_SKILLS', 
    name: 'Life Skills', 
    emoji: '🌟', 
    description: 'Everyday knowledge and practical skills',
    color: 'from-orange-400 to-orange-600'
  },
];

export interface AssessmentQuestion {
  id: string;
  domain: AssessmentDomain;
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  questionText: string;
  options?: string[];
  correctAnswer?: number; // index of correct option (from AI generation)
  difficulty: number; // 1-5 scale
  questionNumber: number; // 1-5 within domain
}

export interface AssessmentAnswer {
  questionId: string;
  domain: AssessmentDomain;
  selectedOption?: number;
  openResponse?: string;
  latencyMs: number;
  isCorrect?: boolean;
  partialCredit?: number;
}

export interface DomainScore {
  domain: AssessmentDomain;
  questionsAnswered: number;
  correctAnswers: number;
  averageDifficulty: number;
  proficiencyLevel: 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'ADVANCED';
}

export interface AssessmentProgress {
  currentDomain: AssessmentDomain;
  currentQuestionInDomain: number;
  totalQuestionsAnswered: number;
  domainsCompleted: AssessmentDomain[];
  domainScores: Record<AssessmentDomain, DomainScore>;
}

export interface BaselineResult {
  profileId: string;
  learnerId: string;
  completedAt: string;
  domainScores: DomainScore[];
  overallProficiency: 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'ADVANCED';
  recommendedGradeBand: GradeBand;
  learningStyleInsights: {
    preferredQuestionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
    averageResponseTime: number;
    strongDomains: AssessmentDomain[];
    growthAreas: AssessmentDomain[];
  };
}
