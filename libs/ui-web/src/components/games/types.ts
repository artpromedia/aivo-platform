/**
 * Game Component Types
 */

export type GameType =
  | 'memory'
  | 'pattern'
  | 'sorting'
  | 'matching'
  | 'sequencing'
  | 'focus'
  | 'breathing'
  | 'mindfulness';

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface GameSession {
  id: string;
  gameType: GameType;
  difficulty: GameDifficulty;
  startTime: Date;
  endTime?: Date;
  score: number;
  maxScore: number;
  attemptsCount: number;
  correctAnswers: number;
  focusMetrics?: FocusMetrics;
}

export interface FocusMetrics {
  averageResponseTime: number;
  focusDuration: number;
  distractionCount: number;
  engagementScore: number;
}

export interface AdaptiveGameCardProps {
  /** Game identifier */
  gameId: string;
  /** Game title */
  title: string;
  /** Game description */
  description: string;
  /** Game type */
  type: GameType;
  /** Current difficulty level */
  difficulty: GameDifficulty;
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Whether the game is locked */
  isLocked?: boolean;
  /** Subject area for the game */
  subject?: string;
  /** Target skills */
  skills?: string[];
  /** Estimated duration in minutes */
  duration?: number;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export interface AdaptiveGameGridProps {
  /** List of games to display */
  games: AdaptiveGameCardProps[];
  /** Loading state */
  isLoading?: boolean;
  /** Filter by subject */
  subjectFilter?: string;
  /** Filter by game type */
  typeFilter?: GameType;
  /** Click handler for game selection */
  onGameSelect?: (gameId: string) => void;
  /** Custom class name */
  className?: string;
}

export interface FocusGameCardProps {
  /** Game identifier */
  gameId: string;
  /** Game title */
  title: string;
  /** Game description */
  description: string;
  /** Focus activity type */
  activityType: 'breathing' | 'mindfulness' | 'movement' | 'grounding';
  /** Duration in seconds */
  duration: number;
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Whether this is recommended based on learner state */
  isRecommended?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export interface FocusGamePlayerProps {
  /** Game identifier */
  gameId: string;
  /** Activity type */
  activityType: 'breathing' | 'mindfulness' | 'movement' | 'grounding';
  /** Instructions for the activity */
  instructions: string[];
  /** Duration in seconds */
  duration: number;
  /** Audio URL for guided activity */
  audioUrl?: string;
  /** Animation type */
  animationType?: 'breathing' | 'waves' | 'pulse' | 'none';
  /** Completion callback */
  onComplete?: (focusMetrics: FocusMetrics) => void;
  /** Exit callback */
  onExit?: () => void;
  /** Custom class name */
  className?: string;
}

export interface GameProgressTrackerProps {
  /** Current session data */
  session: GameSession;
  /** Show detailed metrics */
  showDetails?: boolean;
  /** Custom class name */
  className?: string;
}

export interface GameDifficultySelectorProps {
  /** Currently selected difficulty */
  value: GameDifficulty;
  /** Change handler */
  onChange: (difficulty: GameDifficulty) => void;
  /** Available difficulty levels */
  availableLevels?: GameDifficulty[];
  /** Disable adaptive mode */
  disableAdaptive?: boolean;
  /** Custom class name */
  className?: string;
}
