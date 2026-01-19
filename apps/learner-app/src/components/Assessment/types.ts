export type AssessmentDomain =
  | 'MATH'
  | 'ELA'
  | 'SPEECH'
  | 'SEL'
  | 'SPELLING'
  | 'CREATIVE_WRITING'
  | 'LIFE_SKILLS';

export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'OPEN_RESPONSE'
  | 'MATCHING';

export type AssessmentPhase =
  | 'learning_style'
  | 'transition_to_domains'
  | 'domain_intro'
  | 'domain_questions'
  | 'game_break'
  | 'completing';

export interface AssessmentQuestion {
  id: string;
  domain: AssessmentDomain;
  skillCode: string;
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  difficulty: number;
  questionNumber: number;
}

export interface DomainInfo {
  id: AssessmentDomain;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export interface DomainScore {
  domain: AssessmentDomain;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

export interface AssessmentResult {
  id: string;
  learnerId: string;
  completedAt: string;
  learningStyleAnswers: Record<string, string | string[]>;
  domainScores: DomainScore[];
}

export interface AssessmentFlowProps {
  sessionId?: string;
  onSubmitAnswer: (sessionId: string, questionId: string, answer: string | number) => Promise<void>;
  onComplete: (results: AssessmentResult) => Promise<void>;
  className?: string;
}

export interface LearningStyleQuestion {
  id: string;
  question: string;
  options: Array<{
    value: string;
    label: string;
    emoji: string;
  }>;
  multiSelect?: boolean;
}
