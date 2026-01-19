// =============================================================================
// Assessment System Types
// =============================================================================

// Grade Bands
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

// Assessment Types
export type AssessmentType = 'baseline' | 'progress' | 'subject';

// Assessment Domains
export type AssessmentDomain =
  | 'MATH'
  | 'ELA'
  | 'SPEECH'
  | 'SEL'
  | 'SPELLING'
  | 'CREATIVE_WRITING'
  | 'LIFE_SKILLS';

// Question Types
export type QuestionType = 'MULTIPLE_CHOICE' | 'OPEN_ENDED' | 'TRUE_FALSE' | 'MATCHING';

// Proficiency Levels
export type ProficiencyLevel = 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'ADVANCED';

// Assessment Phases
export type AssessmentPhase =
  | 'learning_style'
  | 'transition_to_domains'
  | 'domain_intro'
  | 'domain_questions'
  | 'game_break'
  | 'completing';

// =============================================================================
// Domain Information
// =============================================================================

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
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 'ELA',
    name: 'Reading & Writing',
    emoji: '📚',
    description: 'Reading, vocabulary, and comprehension',
    color: 'from-purple-400 to-purple-600',
  },
  {
    id: 'SPEECH',
    name: 'Speech & Language',
    emoji: '🗣️',
    description: 'Communication and expression',
    color: 'from-teal-400 to-teal-600',
  },
  {
    id: 'SEL',
    name: 'Social & Emotional',
    emoji: '❤️',
    description: 'Feelings, relationships, and decisions',
    color: 'from-pink-400 to-pink-600',
  },
  {
    id: 'SPELLING',
    name: 'Spelling',
    emoji: '✏️',
    description: 'Word patterns and spelling rules',
    color: 'from-amber-400 to-amber-600',
  },
  {
    id: 'CREATIVE_WRITING',
    name: 'Creative Writing',
    emoji: '🎨',
    description: 'Imagination and storytelling',
    color: 'from-green-400 to-green-600',
  },
  {
    id: 'LIFE_SKILLS',
    name: 'Life Skills',
    emoji: '🌟',
    description: 'Everyday knowledge and practical skills',
    color: 'from-orange-400 to-orange-600',
  },
];

// =============================================================================
// Assessment Session
// =============================================================================

export interface AssessmentConfig {
  type: AssessmentType;
  learnerId: string;
  subjectId?: string;
  gradeBand?: GradeBand;
}

export interface AssessmentSession {
  id: string;
  learnerId: string;
  type: AssessmentType;
  subjectId?: string;
  startedAt: string;
  completedAt?: string;
  currentPhase: AssessmentPhase;
  currentDomainIndex: number;
  currentQuestionIndex: number;
  results?: AssessmentResult;
}

// =============================================================================
// Questions
// =============================================================================

export interface AssessmentQuestion {
  id: string;
  domain: AssessmentDomain;
  skillCode: string;
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer?: number | string;
  difficulty: number; // 1-5 scale
  questionNumber: number;
  imageUrl?: string;
  audioUrl?: string;
  hints?: string[];
}

export interface LearningStyleQuestion {
  id: string;
  category: 'learning_style' | 'interests' | 'strengths' | 'challenges' | 'preferences';
  emoji: string;
  question: string;
  type: 'choice' | 'emoji_scale' | 'multi_select';
  options: { value: string; label: string; emoji?: string }[];
}

// =============================================================================
// Answers
// =============================================================================

export interface AssessmentAnswer {
  questionId: string;
  domain: AssessmentDomain;
  selectedOption?: number;
  openResponse?: string;
  latencyMs: number;
  isCorrect?: boolean;
  partialCredit?: number;
  timestamp: string;
}

export interface LearningStyleAnswer {
  questionId: string;
  value: string | string[];
}

// =============================================================================
// Scores and Results
// =============================================================================

export interface DomainScore {
  domain: AssessmentDomain;
  questionsAnswered: number;
  correctAnswers: number;
  averageDifficulty: number;
  averageLatencyMs: number;
  proficiencyLevel: ProficiencyLevel;
  score: number; // 0-100
}

export interface LearningStyleInsights {
  preferredLearningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  preferredQuestionType: QuestionType;
  averageResponseTime: number;
  interests: string[];
  strengths: string[];
  challenges: string[];
  breakPreference: 'frequent' | 'occasional' | 'rare';
  bestTimeToLearn: 'morning' | 'afternoon' | 'evening' | 'anytime';
}

export interface AssessmentResult {
  sessionId: string;
  learnerId: string;
  type: AssessmentType;
  completedAt: string;
  learningStyleAnswers?: Record<string, string | string[]>;
  domainScores: DomainScore[];
  overallScore: number;
  overallProficiency: ProficiencyLevel;
  recommendedGradeBand: GradeBand;
  learningStyleInsights?: LearningStyleInsights;
  strongDomains: AssessmentDomain[];
  growthAreas: AssessmentDomain[];
  recommendations: Recommendation[];
}

export interface Recommendation {
  type: 'subject' | 'skill' | 'activity' | 'accommodation';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedDomains: AssessmentDomain[];
}

// =============================================================================
// Game Breaks
// =============================================================================

export type GameBreakType = 'breathing' | 'movement' | 'mindful' | 'celebration';

export interface GameBreak {
  id: string;
  type: GameBreakType;
  title: string;
  emoji: string;
  instruction: string;
  duration: number; // seconds
}

export const GAME_BREAKS: GameBreak[] = [
  {
    id: 'break-1',
    type: 'breathing',
    title: 'Balloon Breath!',
    emoji: '🎈',
    instruction: 'Take a deep breath in... now blow up an imaginary balloon!',
    duration: 8,
  },
  {
    id: 'break-2',
    type: 'movement',
    title: 'Shake It Out!',
    emoji: '💃',
    instruction: 'Stand up and shake your arms and legs for 10 seconds!',
    duration: 10,
  },
  {
    id: 'break-3',
    type: 'mindful',
    title: 'Star Gazing',
    emoji: '⭐',
    instruction: "Close your eyes and imagine you're looking at stars in the sky...",
    duration: 8,
  },
  {
    id: 'break-4',
    type: 'celebration',
    title: 'Dance Party!',
    emoji: '🎉',
    instruction: 'Do your favorite dance move! You earned it!',
    duration: 8,
  },
  {
    id: 'break-5',
    type: 'breathing',
    title: 'Flower Smell',
    emoji: '🌸',
    instruction: 'Breathe in like smelling a flower... breathe out like blowing a dandelion!',
    duration: 8,
  },
  {
    id: 'break-6',
    type: 'movement',
    title: 'Stretch Time!',
    emoji: '🧘',
    instruction: 'Reach your arms up high like a giraffe! Now touch your toes!',
    duration: 10,
  },
];

// =============================================================================
// API Response Types
// =============================================================================

export interface StartAssessmentResponse {
  session: AssessmentSession;
  initialQuestions?: AssessmentQuestion[];
  learningStyleQuestions?: LearningStyleQuestion[];
}

export interface SubmitAnswerResponse {
  isCorrect?: boolean;
  feedback?: string;
  nextQuestion?: AssessmentQuestion;
  updatedScore?: number;
  shouldShowBreak?: boolean;
}

export interface CompleteAssessmentResponse {
  results: AssessmentResult;
  nextSteps: Recommendation[];
}
