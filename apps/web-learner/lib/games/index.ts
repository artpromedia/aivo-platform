/**
 * Game Library Utilities for Web Learner
 *
 * This module provides types, API client, and hooks for game sessions.
 */

// Types
export type {
  GradeBand,
  GameCategory,
  SelfReportedMood,
  GamePhase,
  BreathingVisualizerConfig,
  MemoryGameConfig,
  PatternGameConfig,
  ColorMatchConfig,
  SequenceGameConfig,
  TapRhythmConfig,
  DrawingPromptConfig,
  FocusSpotConfig,
  CountingGameConfig,
  ShapeTracingConfig,
  GameConfig,
  GameDefinition,
  GameSession,
  GamePreferences,
  GameStats,
  GamesListResponse,
  RecommendedGameResponse,
  StartGameResponse,
  EndGameResponse,
  ReturnToFocusResponse,
  PreferencesResponse,
  ActiveGameResponse,
  GamePlayerProps,
  GameSelectorProps,
  GameResultsProps,
  SharedGameProps,
  GameResult,
} from './game-types';

export {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from './game-types';

// API Client
export {
  getGamesForGrade,
  getGamesByCategory,
  getGameDetails,
  getRecommendedGame,
  startGameSession,
  endGameSession,
  recordReturnToFocus,
  getLearnerPreferences,
  getLearnerGameStats,
  getActiveGameSession,
  getCategoryIcon,
  getCategoryColorClass,
  formatDuration,
  getEncouragementMessage,
  getMockGames,
} from './game-api';

// Hooks
export {
  useGameSession,
  useGameTimer,
  useGameScore,
} from './use-game-session';
export type { UseGameSessionOptions, UseGameSessionReturn } from './use-game-session';
