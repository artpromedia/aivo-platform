/**
 * Mini-Games Library for Web Learner
 *
 * This module provides all game components and utilities for focus breaks.
 *
 * Components:
 * - GamePlayer: Main game container that handles game lifecycle
 * - GameSelector: UI for browsing and selecting games
 * - GameResults: Post-game results display with rewards
 *
 * Games:
 * - BreathingExercise: Guided breathing visualization (relaxation)
 * - MemoryMatchGame: Card matching memory game (cognitive)
 * - PatternGame: Simon Says pattern recognition (cognitive)
 * - ColorMatchGame: Color matching puzzle (cognitive)
 * - CountingGame: Number/letter sequencing (cognitive)
 *
 * Shared Components:
 * - GameTimer: Countdown/countup timer display
 * - GameScore: Score and moves display
 * - GameInstructions: Instructions overlay
 */

// Main container components
export { GamePlayer } from './GamePlayer';
export type { GamePlayerProps } from './GamePlayer';

export { GameSelector, useGameSelection } from './GameSelector';
export type { GameSelectorProps } from './GameSelector';

export { GameResults } from './GameResults';
export type { GameResultsProps } from './GameResults';

// Game implementations
export {
  BreathingExercise,
  MemoryMatchGame,
  PatternGame,
  ColorMatchGame,
  CountingGame,
} from './games';
export type {
  BreathingExerciseProps,
  MemoryMatchGameProps,
  PatternGameProps,
  ColorMatchGameProps,
  CountingGameProps,
} from './games';

// Shared components
export {
  GameTimer,
  GameCountup,
  GameScore,
  GameMoves,
  GameStars,
  GameInstructions,
  InGameInstructions,
} from './shared';
export type {
  GameTimerProps,
  GameCountupProps,
  GameScoreProps,
  GameMovesProps,
  GameStarsProps,
  GameInstructionsProps,
  InGameInstructionsProps,
} from './shared';
