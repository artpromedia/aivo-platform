import type { GameType, GameCategory, FocusState, ThemeVariant } from '../../types';

export interface GamePickerProps {
  /** Current focus state of the learner */
  focusState: FocusState;
  /** Theme variant based on grade band */
  theme?: ThemeVariant;
  /** List of previously played games */
  previousGames?: string[];
  /** Available games to choose from */
  games?: GameType[];
  /** Callback when a game is selected */
  onGameSelected: (gameId: string) => void;
  /** Callback when picker is cancelled */
  onCancel: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface GameCardProps {
  /** Game data */
  game: GameType;
  /** Callback when game is clicked */
  onClick?: (gameId: string) => void;
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether to show stats (plays, high score) */
  showStats?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface CategoryFilterProps {
  /** Available categories */
  categories: GameCategory[];
  /** Currently selected category */
  selected: GameCategory;
  /** Callback when category changes */
  onSelect: (category: GameCategory) => void;
  /** Additional CSS classes */
  className?: string;
}
