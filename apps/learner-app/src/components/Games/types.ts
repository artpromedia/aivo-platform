import type { GameType, GameDifficulty, GameState, GameResult } from '@/lib/GameEngine';

export interface GameCardProps {
  id: string;
  type: GameType;
  title: string;
  description: string;
  emoji: string;
  difficulty: GameDifficulty;
  unlocked: boolean;
  highScore?: number;
  stars?: number;
  onClick: () => void;
}

export interface BaseGameProps {
  gameId: string;
  learnerId: string;
  difficulty: GameDifficulty;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

export interface MemoryGameProps extends BaseGameProps {
  gridSize?: number; // 4x4, 6x6, etc.
}

export interface MatchingGameProps extends BaseGameProps {
  pairs: { left: string; right: string; id: string }[];
  subject?: string;
}

export interface MathRaceGameProps extends BaseGameProps {
  level: number;
  questionCount: number;
}

export interface WordHuntGameProps extends BaseGameProps {
  words: string[];
  gridSize?: number;
}

export interface SpellingBeeGameProps extends BaseGameProps {
  words: { word: string; hint: string; audio?: string }[];
}

export interface GameScoreDisplayProps {
  score: number;
  streak: number;
  lives: number;
  timeRemaining?: number;
}

export interface GameResultsProps {
  result: GameResult;
  onPlayAgain: () => void;
  onExit: () => void;
}

// Game catalog entries
export interface GameCatalogEntry {
  id: string;
  type: GameType;
  title: string;
  description: string;
  emoji: string;
  minGrade: number;
  maxGrade: number;
  subjects: string[];
  skills: string[];
  defaultDifficulty: GameDifficulty;
}

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: 'memory-animals',
    type: 'memory',
    title: 'Animal Memory',
    description: 'Match pairs of adorable animals!',
    emoji: '🐾',
    minGrade: 0,
    maxGrade: 5,
    subjects: ['science', 'life_skills'],
    skills: ['memory', 'focus', 'pattern_recognition'],
    defaultDifficulty: 'easy',
  },
  {
    id: 'memory-math',
    type: 'memory',
    title: 'Math Memory',
    description: 'Match equations with their answers!',
    emoji: '🔢',
    minGrade: 1,
    maxGrade: 8,
    subjects: ['math'],
    skills: ['memory', 'mental_math', 'focus'],
    defaultDifficulty: 'medium',
  },
  {
    id: 'matching-vocab',
    type: 'matching',
    title: 'Vocabulary Match',
    description: 'Connect words with their meanings!',
    emoji: '📚',
    minGrade: 1,
    maxGrade: 12,
    subjects: ['ela', 'vocabulary'],
    skills: ['vocabulary', 'reading_comprehension'],
    defaultDifficulty: 'adaptive',
  },
  {
    id: 'matching-spanish',
    type: 'matching',
    title: 'Spanish Match',
    description: 'Match English words to Spanish!',
    emoji: '🇪🇸',
    minGrade: 1,
    maxGrade: 12,
    subjects: ['spanish', 'languages'],
    skills: ['vocabulary', 'language_learning'],
    defaultDifficulty: 'easy',
  },
  {
    id: 'math-race',
    type: 'math_race',
    title: 'Math Race',
    description: 'Solve math problems against the clock!',
    emoji: '🏎️',
    minGrade: 1,
    maxGrade: 8,
    subjects: ['math'],
    skills: ['mental_math', 'speed', 'accuracy'],
    defaultDifficulty: 'adaptive',
  },
  {
    id: 'word-hunt',
    type: 'word_hunt',
    title: 'Word Hunt',
    description: 'Find hidden words in the letter grid!',
    emoji: '🔍',
    minGrade: 2,
    maxGrade: 8,
    subjects: ['ela', 'spelling'],
    skills: ['vocabulary', 'pattern_recognition', 'spelling'],
    defaultDifficulty: 'medium',
  },
  {
    id: 'spelling-bee',
    type: 'spelling_bee',
    title: 'Spelling Bee',
    description: 'Listen and spell the words correctly!',
    emoji: '🐝',
    minGrade: 1,
    maxGrade: 8,
    subjects: ['ela', 'spelling'],
    skills: ['spelling', 'listening', 'vocabulary'],
    defaultDifficulty: 'adaptive',
  },
  {
    id: 'pattern-master',
    type: 'pattern',
    title: 'Pattern Master',
    description: 'Find the next number in the pattern!',
    emoji: '🧩',
    minGrade: 2,
    maxGrade: 8,
    subjects: ['math'],
    skills: ['pattern_recognition', 'logical_thinking'],
    defaultDifficulty: 'adaptive',
  },
  {
    id: 'sorting-game',
    type: 'sorting',
    title: 'Sort It Out',
    description: 'Sort items into the right categories!',
    emoji: '📦',
    minGrade: 0,
    maxGrade: 5,
    subjects: ['science', 'math', 'life_skills'],
    skills: ['categorization', 'critical_thinking'],
    defaultDifficulty: 'easy',
  },
  {
    id: 'focus-breathing',
    type: 'focus_breathing',
    title: 'Calm Breathing',
    description: 'Practice mindful breathing exercises',
    emoji: '🧘',
    minGrade: 0,
    maxGrade: 12,
    subjects: ['sel', 'wellness'],
    skills: ['focus', 'self_regulation', 'mindfulness'],
    defaultDifficulty: 'easy',
  },
];

export function getGamesBySubject(subject: string): GameCatalogEntry[] {
  return GAME_CATALOG.filter(game =>
    game.subjects.includes(subject.toLowerCase())
  );
}

export function getGamesByGrade(grade: number): GameCatalogEntry[] {
  return GAME_CATALOG.filter(
    game => grade >= game.minGrade && grade <= game.maxGrade
  );
}

export function getGameById(id: string): GameCatalogEntry | undefined {
  return GAME_CATALOG.find(game => game.id === id);
}
