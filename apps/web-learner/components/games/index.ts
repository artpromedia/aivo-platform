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
 * Games (Part 1):
 * - BreathingExercise: Guided breathing visualization (relaxation)
 * - MemoryMatchGame: Card matching memory game (cognitive)
 * - PatternGame: Simon Says pattern recognition (cognitive)
 * - ColorMatchGame: Color matching puzzle (cognitive)
 * - CountingGame: Number/letter sequencing (cognitive)
 *
 * Games (Part 2):
 * - ReactionTimeGame: Reaction time challenge
 * - ShapeSorterGame: Shape sorting game
 * - WordScrambleGame: Word unscrambling game
 * - LogicPuzzleGame: Logic puzzle challenges
 * - SimonSaysGame: Simon Says memory game
 *
 * Shared Components:
 * - GameTimer: Countdown/countup timer display
 * - GameScore: Score and moves display
 * - GameInstructions: Instructions overlay
 */

// Types
export * from './types';

// API
export * from './games-api';

// Hooks
export { useGameSession, useGameRecommendations, useGameFavorites, useRecentlyPlayed } from './useGameSession';

// Main container components
export { GamePlayer } from './GamePlayer';
export type { GamePlayerProps } from './GamePlayer';

export { GameSelector, useGameSelection } from './GameSelector';
export type { GameSelectorProps } from './GameSelector';

export { GameResults } from './GameResults';
export type { GameResultsProps } from './GameResults';

export { GameContainer } from './GameContainer';

// Game implementations (Part 1)
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

// Game implementations (Part 2)
export { ReactionTimeGame } from './games/ReactionTimeGame';
export { ShapeSorterGame } from './games/ShapeSorterGame';
export { WordScrambleGame } from './games/WordScrambleGame';
export { LogicPuzzleGame } from './games/LogicPuzzleGame';
export { SimonSaysGame } from './games/SimonSaysGame';

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
