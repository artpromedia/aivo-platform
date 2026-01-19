// ============================================================================
// Game Types
// ============================================================================

export type GameDifficulty = 'Easy' | 'Medium' | 'Hard';

export type GameCategory =
  | 'Math'
  | 'Reading'
  | 'Science'
  | 'Social Studies'
  | 'Focus'
  | 'All';

export interface GameType {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  difficulty: GameDifficulty;
  plays: number;
  highScore: number;
  category: GameCategory;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  reward: number;
  timeLeft: string;
  completed: boolean;
}

// ============================================================================
// Focus Types
// ============================================================================

export type FocusMode = 'pomodoro' | 'custom' | 'deep-work';
export type FocusState = 'focused' | 'wandering' | 'distracted';
export type TimerState = 'idle' | 'focusing' | 'break';

export interface FocusSession {
  id: string;
  learnerId: string;
  mode: FocusMode;
  duration: number;
  startTime: string;
  endTime?: string;
  completed: boolean;
  distractions: FocusDistraction[];
  breaks: FocusBreak[];
}

export interface FocusDistraction {
  id: string;
  timestamp: string;
  type: 'manual' | 'auto';
}

export interface FocusBreak {
  id: string;
  startTime: string;
  endTime?: string;
  activityType: string;
}

export interface FocusPreferences {
  defaultMode: FocusMode;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  customWorkMinutes: number;
  customBreakMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface FocusStats {
  totalSessions: number;
  totalFocusTime: number;
  averageSessionLength: number;
  longestStreak: number;
  currentStreak: number;
  distractionRate: number;
}

// ============================================================================
// Assessment Types
// ============================================================================

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

export type AssessmentPhase =
  | 'learning_style'
  | 'transition_to_domains'
  | 'domain_intro'
  | 'domain_questions'
  | 'game_break'
  | 'completing';

// ============================================================================
// Progress Types
// ============================================================================

export interface ProgressMetrics {
  totalXP: number;
  level: number;
  streak: number;
  lessonsCompleted: number;
  coursesInProgress: number;
}

export interface DailyGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  emoji: string;
}

export interface LearningLesson {
  id: string;
  courseId: string;
  title: string;
  courseName: string;
  progress: number;
  thumbnail: string;
  estimatedTime: string;
}

export interface Achievement {
  id: string;
  title: string;
  emoji: string;
  earned: boolean;
  earnedAt?: string;
}

export interface UpcomingItem {
  id: string;
  title: string;
  dueDate: string;
  type: 'quiz' | 'project' | 'assignment' | 'lesson';
  emoji: string;
}

// ============================================================================
// Subject Types
// ============================================================================

export interface SubjectInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
}

// ============================================================================
// Common Props
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export type ThemeVariant = 'K5' | 'MS' | 'HS';

export interface ThemedComponentProps extends BaseComponentProps {
  theme?: ThemeVariant;
}
