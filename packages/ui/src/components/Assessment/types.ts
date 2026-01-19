import type { AssessmentQuestion, DomainInfo, AssessmentPhase } from '../../types';

export interface AssessmentFlowProps {
  /** Current phase of the assessment */
  phase: AssessmentPhase;
  /** All domain info */
  domains: DomainInfo[];
  /** Current domain index */
  currentDomainIndex: number;
  /** Current question in domain */
  currentQuestionIndex: number;
  /** Total questions per domain */
  questionsPerDomain?: number;
  /** Current questions for the domain */
  questions?: AssessmentQuestion[];
  /** Whether questions are loading */
  isLoading?: boolean;
  /** Callback when answer is selected */
  onAnswer: (questionId: string, answer: number | string) => void;
  /** Callback when phase changes */
  onPhaseChange: (phase: AssessmentPhase) => void;
  /** Callback when domain starts */
  onStartDomain: () => void;
  /** Callback when break is skipped */
  onSkipBreak: () => void;
  /** Overall progress percentage */
  progress: number;
  /** Additional CSS classes */
  className?: string;
}

export interface AssessmentCardProps {
  /** Domain information */
  domain: DomainInfo;
  /** Card variant */
  variant?: 'intro' | 'progress' | 'complete';
  /** Questions answered count */
  answeredCount?: number;
  /** Total questions */
  totalQuestions?: number;
  /** Callback when clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface QuestionRendererProps {
  /** Question data */
  question: AssessmentQuestion;
  /** Domain info for styling */
  domain: DomainInfo;
  /** Current question number */
  questionNumber: number;
  /** Total questions */
  totalQuestions: number;
  /** Callback when answer is selected */
  onAnswer: (optionIndex: number) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface ProgressIndicatorProps {
  /** Current progress percentage */
  progress: number;
  /** Label to display */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage text */
  showPercentage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface GameBreakProps {
  /** Break activity data */
  activity: {
    emoji: string;
    title: string;
    instruction: string;
    duration: number;
  };
  /** Countdown time remaining */
  countdown: number;
  /** Message to display after break */
  message?: string;
  /** Callback when break is skipped */
  onSkip: () => void;
  /** Additional CSS classes */
  className?: string;
}
