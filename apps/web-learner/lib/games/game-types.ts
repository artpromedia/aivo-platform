/**
 * Game Types for Web Learner Mini-Games
 *
 * These types align with the backend game library at:
 * services/focus-svc/src/games/game-library.ts
 */

// Grade bands for age-appropriate content
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

// Game categories
export type GameCategory = 'cognitive' | 'relaxation' | 'physical' | 'creative';

// Self-reported mood for recommendations
export type SelfReportedMood = 'happy' | 'okay' | 'frustrated' | 'tired' | 'confused';

// Game completion status
export type GamePhase = 'instructions' | 'playing' | 'paused' | 'completed';

// ============ Game Configuration Types ============

export interface BreathingVisualizerConfig {
  pattern: 'box' | 'triangle' | 'star' | 'wave' | 'balloon';
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  visualStyle: 'expanding-circle' | 'moving-dot' | 'color-shift' | 'particle-flow';
}

export interface MemoryGameConfig {
  cardPairs: number; // 3-6 pairs
  theme: 'shapes' | 'colors' | 'emojis' | 'nature';
  revealTime: number; // ms to show card before hiding
}

export interface PatternGameConfig {
  sequenceLength: number; // 3-6 items
  speed: 'slow' | 'medium' | 'fast';
  patternType: 'visual' | 'auditory' | 'combined';
}

export interface ColorMatchConfig {
  colorCount: number; // 3-5 colors
  rounds: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SequenceGameConfig {
  sequenceType: 'numbers' | 'letters' | 'shapes';
  length: number;
  ascending: boolean;
}

export interface TapRhythmConfig {
  pattern: number[]; // ms intervals
  repetitions: number;
  showVisualCues: boolean;
  playSound: boolean;
}

export interface DrawingPromptConfig {
  prompt: string;
  timeLimit: number;
  suggestedShapes: string[];
  freeform: boolean;
}

export interface FocusSpotConfig {
  duration: number;
  visualType: 'mandala' | 'nature' | 'abstract';
  soundType?: 'ambient' | 'nature' | 'none';
}

export interface CountingGameConfig {
  objectType: 'stars' | 'circles' | 'animals' | 'shapes';
  countRange: { min: number; max: number };
  rounds: number;
}

export interface ShapeTracingConfig {
  shapes: ('circle' | 'triangle' | 'square' | 'star' | 'heart')[];
  speed: 'slow' | 'medium' | 'fast';
  repetitions: number;
}

// Union of all game configs
export type GameConfig =
  | BreathingVisualizerConfig
  | MemoryGameConfig
  | PatternGameConfig
  | ColorMatchConfig
  | SequenceGameConfig
  | TapRhythmConfig
  | DrawingPromptConfig
  | FocusSpotConfig
  | CountingGameConfig
  | ShapeTracingConfig;

// ============ Game Definition Types ============

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  durationSeconds: number;
  gradeBands: GradeBand[];
  instructions: string[];
  config: GameConfig;
  thumbnailUrl?: string;
  accessibilityFeatures?: string[];
}

// ============ Game Session Types ============

export interface GameSession {
  id: string;
  sessionId: string; // Learning session ID
  learnerId: string;
  gameId: string;
  gameTitle: string;
  gameCategory: GameCategory;
  startedAt: string; // ISO date
  endedAt?: string;
  durationSeconds?: number;
  completed: boolean;
  score?: number;
  maxScore?: number;
  returnedToFocus?: boolean;
  helpfulnessRating?: number; // 1-5
  preFocusScore?: number;
  postFocusScore?: number;
}

export interface GamePreferences {
  learnerId: string;
  favoriteCategories: GameCategory[];
  completedGames: string[];
  averageRatings: Record<string, number>;
  lastPlayedDates: Record<string, string>;
}

export interface GameStats {
  totalGamesPlayed: number;
  totalTimePlayedSeconds: number;
  favoriteCategory?: GameCategory;
  mostPlayedGame?: string;
  averageCompletionRate: number;
  averageHelpfulnessRating?: number;
  categoryBreakdown: Record<GameCategory, number>;
}

// ============ API Response Types ============

export interface GamesListResponse {
  gradeBand: GradeBand;
  games: GameDefinition[];
  categories: {
    category: GameCategory;
    count: number;
    games: GameDefinition[];
  }[];
  totalCount: number;
}

export interface RecommendedGameResponse {
  game: GameDefinition;
  recommendation: {
    reason: string;
    matchScore: number;
  };
}

export interface StartGameResponse {
  success: boolean;
  gameSession: GameSession;
  game: GameDefinition;
  message: string;
}

export interface EndGameResponse {
  success: boolean;
  gameSession: GameSession;
  message: string;
  encouragement: string;
  rewards?: {
    xpEarned: number;
    coinsEarned: number;
    streakBonus?: number;
  };
}

export interface ReturnToFocusResponse {
  success: boolean;
  message: string;
  effectivenessScore?: number;
}

export interface PreferencesResponse {
  learnerId: string;
  preferences: GamePreferences;
  stats: GameStats;
  recentGames: GameSession[];
}

export interface ActiveGameResponse {
  hasActiveGame: boolean;
  activeSession?: GameSession;
  game?: GameDefinition;
}

// ============ Component Props Types ============

export interface GamePlayerProps {
  game: GameDefinition;
  sessionId: string;
  learnerId: string;
  onComplete: (completed: boolean, score?: number, maxScore?: number) => void;
  onExit: () => void;
  gradeBand?: GradeBand;
}

export interface GameSelectorProps {
  games: GameDefinition[];
  recommendedGameIds?: string[];
  onSelectGame: (game: GameDefinition) => void;
  className?: string;
  gradeBand?: GradeBand;
}

export interface GameResultsProps {
  gameSession: GameSession;
  game: GameDefinition;
  rewards?: EndGameResponse['rewards'];
  encouragement: string;
  onPlayAgain: () => void;
  onReturnToFocus: () => void;
  onExit: () => void;
}

export interface SharedGameProps {
  config: GameConfig;
  onComplete: (score: number, maxScore: number) => void;
  onProgress?: (progress: number) => void;
  isPaused?: boolean;
}

// ============ Game Result Types ============

export interface GameResult {
  completed: boolean;
  score?: number;
  maxScore?: number;
  durationSeconds: number;
  metrics?: Record<string, number | string>;
}

// ============ Category Metadata ============

export const CATEGORY_ICONS: Record<GameCategory, string> = {
  cognitive: '🧠',
  relaxation: '🧘',
  physical: '💪',
  creative: '🎨',
};

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  cognitive: 'Brain Training',
  relaxation: 'Relaxation',
  physical: 'Movement',
  creative: 'Creative',
};

export const CATEGORY_COLORS: Record<GameCategory, string> = {
  cognitive: 'blue',
  relaxation: 'green',
  physical: 'orange',
  creative: 'purple',
};
