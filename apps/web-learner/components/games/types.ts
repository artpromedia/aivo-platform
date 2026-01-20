/**
 * Game Component Types for Web Learner
 */

export type GameCategory = 'cognitive' | 'relaxation' | 'physical' | 'creative' | 'language';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'abandoned';

export interface GameConfig {
  /** Game identifier */
  gameId: string;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Grade band for age-appropriate content */
  gradeBand: 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
  /** Time limit in seconds (optional) */
  timeLimit?: number;
  /** Number of rounds */
  rounds?: number;
}

export interface GameMetrics {
  /** Score achieved */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Correct responses */
  correctAnswers: number;
  /** Total attempts made */
  totalAttempts: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** Best response time in ms */
  bestResponseTime?: number;
  /** Time spent playing in seconds */
  duration: number;
  /** Level reached (if applicable) */
  levelReached?: number;
}

export interface GameResult {
  /** Game completed successfully */
  completed: boolean;
  /** Game metrics */
  metrics: GameMetrics;
  /** XP earned */
  xpEarned: number;
  /** Coins earned */
  coinsEarned: number;
  /** Is personal best */
  isPersonalBest: boolean;
  /** Stars earned (1-3) */
  stars: number;
  /** Achievements unlocked */
  achievementsUnlocked?: string[];
}

export interface BaseGameProps {
  /** Game configuration */
  config: GameConfig;
  /** Called when game completes */
  onComplete: (result: GameResult) => void;
  /** Called when game is exited early */
  onExit: () => void;
  /** Custom class name */
  className?: string;
}

export interface GameSelectorProps {
  /** Currently selected category filter */
  categoryFilter?: GameCategory;
  /** Grade band for recommendations */
  gradeBand: 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
  /** Called when a game is selected */
  onSelectGame: (gameId: string) => void;
  /** Favorite game IDs */
  favorites?: string[];
  /** Recently played game IDs */
  recentlyPlayed?: string[];
  /** Custom class name */
  className?: string;
}

export interface GameResultsProps {
  /** Game result data */
  result: GameResult;
  /** Game that was played */
  gameId: string;
  /** Game title */
  gameTitle: string;
  /** Called when play again is clicked */
  onPlayAgain: () => void;
  /** Called when returning to game list */
  onReturn: () => void;
  /** Called when rating the game */
  onRate?: (helpful: boolean) => void;
  /** Custom class name */
  className?: string;
}

// Word lists by grade band for WordScrambleGame
export const WORD_BANKS: Record<string, { word: string; hint: string }[]> = {
  K_2: [
    { word: 'CAT', hint: 'A furry pet that meows' },
    { word: 'DOG', hint: 'A loyal pet that barks' },
    { word: 'SUN', hint: 'It shines in the sky' },
    { word: 'BALL', hint: 'You can throw and catch it' },
    { word: 'FISH', hint: 'It swims in water' },
    { word: 'TREE', hint: 'It has leaves and branches' },
    { word: 'BIRD', hint: 'It can fly in the sky' },
    { word: 'BOOK', hint: 'You read stories in it' },
    { word: 'STAR', hint: 'It twinkles at night' },
    { word: 'MOON', hint: 'It glows at night' },
  ],
  G3_5: [
    { word: 'PLANET', hint: 'Earth is one of these' },
    { word: 'GARDEN', hint: 'Where flowers grow' },
    { word: 'FRIEND', hint: 'Someone you enjoy spending time with' },
    { word: 'CASTLE', hint: 'Where kings and queens live' },
    { word: 'JUNGLE', hint: 'A tropical forest' },
    { word: 'BRIDGE', hint: 'It helps you cross water' },
    { word: 'PUZZLE', hint: 'A game with pieces to fit together' },
    { word: 'ISLAND', hint: 'Land surrounded by water' },
    { word: 'ROCKET', hint: 'It flies to space' },
    { word: 'ARTIST', hint: 'Someone who creates art' },
  ],
  G6_8: [
    { word: 'ADVENTURE', hint: 'An exciting journey' },
    { word: 'DISCOVERY', hint: 'Finding something new' },
    { word: 'KNOWLEDGE', hint: 'What you gain from learning' },
    { word: 'CURIOSITY', hint: 'Wanting to learn more' },
    { word: 'UNIVERSE', hint: 'Everything that exists' },
    { word: 'SYMPHONY', hint: 'Music played by an orchestra' },
    { word: 'MYTHOLOGY', hint: 'Ancient stories and legends' },
    { word: 'ECOSYSTEM', hint: 'Living things and their environment' },
    { word: 'DEMOCRACY', hint: 'Government by the people' },
    { word: 'ALGORITHM', hint: 'Step-by-step instructions' },
  ],
  G9_12: [
    { word: 'PHILOSOPHY', hint: 'Study of fundamental questions' },
    { word: 'HYPOTHESIS', hint: 'An educated guess in science' },
    { word: 'RENAISSANCE', hint: 'Period of cultural rebirth' },
    { word: 'EQUILIBRIUM', hint: 'State of balance' },
    { word: 'METAPHYSICS', hint: 'Branch of philosophy' },
    { word: 'SUSTAINABLE', hint: 'Can continue long-term' },
    { word: 'PERSPECTIVE', hint: 'Point of view' },
    { word: 'CIRCUMFERENCE', hint: 'Distance around a circle' },
    { word: 'REVOLUTIONARY', hint: 'Causing major change' },
    { word: 'PHOTOSYNTHESIS', hint: 'How plants make food' },
  ],
};

// Logic puzzle patterns by difficulty
export const PATTERN_TYPES = {
  easy: ['number', 'shape', 'color'],
  medium: ['number', 'shape', 'color', 'rotation', 'size'],
  hard: ['number', 'shape', 'color', 'rotation', 'size', 'combination'],
};
