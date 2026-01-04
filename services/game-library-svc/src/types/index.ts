/**
 * Game Library Service Types
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS (matching Prisma)
// ══════════════════════════════════════════════════════════════════════════════

export type GameType =
  | 'FOCUS_BREAK'
  | 'BRAIN_TRAINING'
  | 'EDUCATIONAL'
  | 'REWARD'
  | 'RELAXATION';

export type GameCategory =
  | 'PUZZLE'
  | 'MEMORY'
  | 'REACTION'
  | 'PATTERN'
  | 'RELAXATION'
  | 'MOVEMENT'
  | 'CREATIVE'
  | 'MATH'
  | 'LANGUAGE';

export type CognitiveSkill =
  | 'WORKING_MEMORY'
  | 'ATTENTION'
  | 'PROCESSING_SPEED'
  | 'COGNITIVE_FLEXIBILITY'
  | 'INHIBITORY_CONTROL'
  | 'VISUAL_SPATIAL'
  | 'VERBAL_REASONING'
  | 'PATTERN_RECOGNITION';

export type GradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';

export type GameContext =
  | 'BREAK'
  | 'REWARD'
  | 'BRAIN_TRAINING'
  | 'FREE_PLAY'
  | 'TEACHER_ASSIGNED';

export type SessionStatus = 'STARTED' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';

// ══════════════════════════════════════════════════════════════════════════════
// GAME DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface GameDefinition {
  slug: string;
  title: string;
  description: string;
  instructions?: string;
  type: GameType;
  category: GameCategory;
  minAge: number;
  maxAge: number;
  gradeBands: GradeBand[];
  estimatedDurationSec: number;
  cognitiveSkills: CognitiveSkill[];
  accessibilityFeatures: string[];
  thumbnailUrl?: string;
  assetBundleUrl?: string;
  gameConfig: GameConfig;
  xpReward: number;
  coinReward: number;
  tags: string[];
}

export interface GameConfig {
  levels?: GameLevel[];
  difficulties?: string[];
  defaultDifficulty?: string;
  timeLimit?: number;
  targetScore?: number;
  // Game-specific configuration
  [key: string]: unknown;
}

export interface GameLevel {
  id: number;
  name: string;
  difficulty: string;
  config: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME SESSION
// ══════════════════════════════════════════════════════════════════════════════

export interface GameSessionMetrics {
  accuracy?: number;
  averageReactionTimeMs?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  hintsUsed?: number;
  perfectRounds?: number;
  longestStreak?: number;
  itemsCollected?: number;
  puzzlesSolved?: number;
  movesUsed?: number;
  optimalMoves?: number;
  // Additional metrics per game type
  [key: string]: unknown;
}

export interface StartSessionRequest {
  gameId: string;
  context: GameContext;
  difficulty?: string;
  learningSessionId?: string;
}

export interface EndSessionRequest {
  score?: number;
  stars?: number;
  levelReached?: number;
  metrics?: GameSessionMetrics;
  completed: boolean;
}

export interface GameSessionResponse {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  context: GameContext;
  status: SessionStatus;
  score?: number;
  stars?: number;
  levelReached?: number;
  difficulty?: string;
  durationSec?: number;
  xpEarned: number;
  coinsEarned: number;
  isPersonalBest: boolean;
  startedAt: string;
  endedAt?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface GameRecommendation {
  game: GameSummary;
  reason: RecommendationReason;
  priority: number;
}

export interface GameSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  category: GameCategory;
  estimatedDurationSec: number;
  thumbnailUrl?: string;
  xpReward: number;
  coinReward: number;
  cognitiveSkills: CognitiveSkill[];
}

export type RecommendationReason =
  | 'FOCUS_BREAK'           // Recommended for focus break
  | 'BRAIN_TRAINING'        // Part of brain training
  | 'SKILL_BUILDING'        // Targets weak cognitive skill
  | 'REWARD'                // Earned as reward
  | 'FAVORITE'              // User's favorite
  | 'NEW'                   // New game to try
  | 'POPULAR'               // Popular with similar learners
  | 'CONTINUATION'          // Continue from last session
  | 'DAILY_CHALLENGE';      // Daily challenge

// ══════════════════════════════════════════════════════════════════════════════
// BRAIN TRAINING
// ══════════════════════════════════════════════════════════════════════════════

export interface BrainTrainingPlan {
  id: string;
  planDate: string;
  games: GameSummary[];
  targetMinutes: number;
  focusSkills: CognitiveSkill[];
  completedGameIds: string[];
  isCompleted: boolean;
  actualMinutes?: number;
  progress: number; // 0-100
}

export interface BrainTrainingStats {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalMinutes: number;
  averageMinutesPerDay: number;
  skillProgress: Record<CognitiveSkill, number>; // 0-100
  lastTrainingDate?: string;
  weeklyCompletionRate: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// LEADERBOARDS
// ══════════════════════════════════════════════════════════════════════════════

export interface LeaderboardEntry {
  rank: number;
  learnerId: string;
  learnerName?: string;
  score: number;
  achievedAt: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  gameId: string;
  gameTitle: string;
  periodType: 'weekly' | 'monthly' | 'all_time';
  periodKey: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  userScore?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTERS
// ══════════════════════════════════════════════════════════════════════════════

export interface GameFilters {
  type?: GameType;
  category?: GameCategory;
  gradeBand?: GradeBand;
  cognitiveSkill?: CognitiveSkill;
  maxDurationSec?: number;
  minAge?: number;
  maxAge?: number;
  tags?: string[];
  accessibilityFeatures?: string[];
}
