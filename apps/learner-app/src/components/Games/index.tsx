/**
 * Games Module
 *
 * Comprehensive mini-games library for the AIVO learning platform.
 * Includes various educational games across subjects and skill levels.
 */

// Main exports
export { GamePicker } from './GamePicker';
export { GameCard } from './GameCard';
export { GameScoreDisplay } from './GameScoreDisplay';
export { GameResults } from './GameResults';

// Game components
export { MemoryGame } from './MemoryGame';
export { MathRaceGame } from './MathRaceGame';

// Types and utilities
export {
  GAME_CATALOG,
  getGamesBySubject,
  getGamesByGrade,
  getGameById,
} from './types';

export type {
  GameCardProps,
  BaseGameProps,
  MemoryGameProps,
  MatchingGameProps,
  MathRaceGameProps,
  WordHuntGameProps,
  SpellingBeeGameProps,
  GameScoreDisplayProps,
  GameResultsProps,
  GameCatalogEntry,
} from './types';
