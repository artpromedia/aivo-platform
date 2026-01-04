/**
 * Focus Games Components
 *
 * Interactive mini-games for focus breaks.
 * Includes game player, selector, and game management utilities.
 */

export { FocusGamePlayer } from './FocusGamePlayer';
export type {
  FocusGamePlayerProps,
  GameType,
  GameConfig,
} from './FocusGamePlayer';

export { GameSelector, useGameSelection } from './GameSelector';
export type {
  GameSelectorProps,
  MiniGame,
  GameCategory,
} from './GameSelector';
