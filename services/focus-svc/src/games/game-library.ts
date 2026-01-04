/**
 * Focus Break Mini-Games Library
 *
 * A curated collection of short, calming mini-games designed for focus breaks.
 * All games are:
 * - Appropriate for neurodiverse learners (clear instructions, predictable patterns)
 * - Short duration (30-120 seconds)
 * - Non-competitive (self-improvement focused)
 * - Calming/re-centering (not stimulating)
 */

import type { GradeBand } from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GameCategory = 'cognitive' | 'relaxation' | 'physical' | 'creative';

export interface MiniGame {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  gradeRange: GradeBand[];
  durationSeconds: number;
  instructions: string[];
  gameConfig: GameConfig;
}

export type GameConfig =
  | MemoryGameConfig
  | PatternGameConfig
  | BreathingVisualizerConfig
  | TapRhythmConfig
  | DrawingPromptConfig
  | ColorMatchConfig
  | SequenceGameConfig
  | FocusSpotConfig
  | CountingGameConfig
  | ShapeTracingConfig;

// ─── Game-Specific Configs ──────────────────────────────────────────────────

export interface MemoryGameConfig {
  type: 'memory';
  cardPairs: number; // 3-6 pairs
  theme: 'shapes' | 'colors' | 'emojis' | 'nature';
  revealTime: number; // ms to show card before hiding
}

export interface PatternGameConfig {
  type: 'pattern';
  sequenceLength: number; // 3-6 items to remember
  speed: 'slow' | 'medium' | 'fast';
  patternType: 'visual' | 'auditory' | 'combined';
}

export interface BreathingVisualizerConfig {
  type: 'breathing';
  pattern: 'box' | 'triangle' | 'star' | 'wave' | 'balloon';
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  visualStyle: 'expanding-circle' | 'moving-dot' | 'color-shift' | 'particle-flow';
}

export interface TapRhythmConfig {
  type: 'tap-rhythm';
  pattern: number[]; // milliseconds between taps
  repetitions: number;
  showVisualCues: boolean;
  playSound: boolean;
}

export interface DrawingPromptConfig {
  type: 'drawing';
  prompt: string;
  timeLimit: number;
  suggestedShapes?: string[];
  freeform: boolean;
}

export interface ColorMatchConfig {
  type: 'color-match';
  colorCount: number; // 3-5 colors to match
  rounds: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SequenceGameConfig {
  type: 'sequence';
  sequenceType: 'numbers' | 'letters' | 'shapes';
  length: number;
  ascending: boolean;
}

export interface FocusSpotConfig {
  type: 'focus-spot';
  duration: number;
  visualType: 'dot' | 'mandala' | 'spiral' | 'gradient';
  soundType: 'none' | 'ambient' | 'tone';
}

export interface CountingGameConfig {
  type: 'counting';
  objectType: 'stars' | 'circles' | 'shapes';
  countRange: [number, number];
  rounds: number;
}

export interface ShapeTracingConfig {
  type: 'shape-tracing';
  shapes: ('circle' | 'square' | 'triangle' | 'star' | 'heart')[];
  speed: 'slow' | 'medium';
  repetitions: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME CATALOG
// ══════════════════════════════════════════════════════════════════════════════

export const MINI_GAMES: MiniGame[] = [
  // ─── Cognitive Games (Memory & Pattern) ─────────────────────────────────────
  {
    id: 'memory-shapes-easy',
    title: 'Shape Memory',
    description: 'Find matching pairs of shapes. Take your time!',
    category: 'cognitive',
    gradeRange: ['K5'],
    durationSeconds: 60,
    instructions: [
      'Cards will flip to show shapes',
      'Click two cards to find matching pairs',
      'Try to remember where each shape is',
      'Find all pairs to complete the game',
    ],
    gameConfig: {
      type: 'memory',
      cardPairs: 3,
      theme: 'shapes',
      revealTime: 1500,
    },
  },
  {
    id: 'memory-colors-medium',
    title: 'Color Memory Challenge',
    description: 'Match pairs of colorful cards.',
    category: 'cognitive',
    gradeRange: ['G6_8'],
    durationSeconds: 90,
    instructions: [
      'Study the cards carefully',
      'Find all matching color pairs',
      'Focus on remembering positions',
      'Take a deep breath if you need to',
    ],
    gameConfig: {
      type: 'memory',
      cardPairs: 5,
      theme: 'colors',
      revealTime: 1200,
    },
  },
  {
    id: 'memory-nature-hard',
    title: 'Nature Memory',
    description: 'Match pairs of nature images - a calming memory game.',
    category: 'cognitive',
    gradeRange: ['G9_12'],
    durationSeconds: 90,
    instructions: [
      'Find matching pairs of nature images',
      'Take your time and breathe',
      'Notice the calming images',
      'Complete at your own pace',
    ],
    gameConfig: {
      type: 'memory',
      cardPairs: 6,
      theme: 'nature',
      revealTime: 1000,
    },
  },
  {
    id: 'pattern-visual-easy',
    title: 'Pattern Recall',
    description: 'Watch the pattern, then repeat it!',
    category: 'cognitive',
    gradeRange: ['K5', 'G6_8'],
    durationSeconds: 45,
    instructions: [
      'Watch the colored lights flash',
      'Remember the order',
      'Tap the colors in the same order',
      'Start with 3, then 4 colors',
    ],
    gameConfig: {
      type: 'pattern',
      sequenceLength: 3,
      speed: 'slow',
      patternType: 'visual',
    },
  },
  {
    id: 'sequence-numbers',
    title: 'Number Sequencing',
    description: 'Put numbers in order - a gentle brain exercise.',
    category: 'cognitive',
    gradeRange: ['G6_8', 'G9_12'],
    durationSeconds: 60,
    instructions: [
      'Numbers will appear scrambled',
      'Tap them in ascending order',
      'Take your time',
      'Focus on one number at a time',
    ],
    gameConfig: {
      type: 'sequence',
      sequenceType: 'numbers',
      length: 5,
      ascending: true,
    },
  },

  // ─── Relaxation Games (Breathing & Focus) ───────────────────────────────────
  {
    id: 'breathing-balloon',
    title: 'Balloon Breathing',
    description: 'Watch the balloon grow and shrink with your breath.',
    category: 'relaxation',
    gradeRange: ['K5'],
    durationSeconds: 60,
    instructions: [
      'Breathe in as the balloon grows',
      'Breathe out as the balloon shrinks',
      'Follow the gentle rhythm',
      'Do this 5 times',
    ],
    gameConfig: {
      type: 'breathing',
      pattern: 'balloon',
      inhaleSeconds: 4,
      holdInSeconds: 0,
      exhaleSeconds: 4,
      holdOutSeconds: 0,
      cycles: 5,
      visualStyle: 'expanding-circle',
    },
  },
  {
    id: 'breathing-box',
    title: 'Box Breathing',
    description: 'Follow the box pattern to breathe calmly.',
    category: 'relaxation',
    gradeRange: ['G6_8', 'G9_12'],
    durationSeconds: 80,
    instructions: [
      'Breathe in for 4 counts',
      'Hold for 4 counts',
      'Breathe out for 4 counts',
      'Hold for 4 counts',
      'Repeat 4 times',
    ],
    gameConfig: {
      type: 'breathing',
      pattern: 'box',
      inhaleSeconds: 4,
      holdInSeconds: 4,
      exhaleSeconds: 4,
      holdOutSeconds: 4,
      cycles: 4,
      visualStyle: 'moving-dot',
    },
  },
  {
    id: 'breathing-wave',
    title: 'Wave Breathing',
    description: 'Breathe with the gentle ocean waves.',
    category: 'relaxation',
    gradeRange: ['K5', 'G6_8', 'G9_12'],
    durationSeconds: 90,
    instructions: [
      'Watch the wave rise and fall',
      'Breathe in as the wave rises',
      'Breathe out as the wave falls',
      'Let your breath flow naturally',
    ],
    gameConfig: {
      type: 'breathing',
      pattern: 'wave',
      inhaleSeconds: 5,
      holdInSeconds: 0,
      exhaleSeconds: 6,
      holdOutSeconds: 0,
      cycles: 6,
      visualStyle: 'color-shift',
    },
  },
  {
    id: 'focus-spot-calm',
    title: 'Calm Focus',
    description: 'Gaze at the center and let your mind rest.',
    category: 'relaxation',
    gradeRange: ['G6_8', 'G9_12'],
    durationSeconds: 45,
    instructions: [
      'Look at the center dot',
      'Breathe naturally',
      'Let thoughts drift by',
      'Just focus on the calm visual',
    ],
    gameConfig: {
      type: 'focus-spot',
      duration: 45,
      visualType: 'mandala',
      soundType: 'ambient',
    },
  },

  // ─── Physical Games (Tap & Rhythm) ──────────────────────────────────────────
  {
    id: 'tap-rhythm-simple',
    title: 'Simple Rhythm',
    description: 'Tap along with the rhythm - let your body move!',
    category: 'physical',
    gradeRange: ['K5'],
    durationSeconds: 45,
    instructions: [
      'Watch the circles light up',
      'Tap when you see the light',
      'Follow the steady beat',
      'Repeat 3 times',
    ],
    gameConfig: {
      type: 'tap-rhythm',
      pattern: [1000, 1000, 1000, 2000], // simple 1-2-3-pause pattern
      repetitions: 3,
      showVisualCues: true,
      playSound: true,
    },
  },
  {
    id: 'tap-rhythm-pattern',
    title: 'Rhythm Pattern',
    description: 'Follow the tapping pattern to refocus.',
    category: 'physical',
    gradeRange: ['G6_8', 'G9_12'],
    durationSeconds: 60,
    instructions: [
      'Listen and watch the rhythm',
      'Tap along when ready',
      'Feel the steady pattern',
      'Let it help you refocus',
    ],
    gameConfig: {
      type: 'tap-rhythm',
      pattern: [800, 800, 400, 1200, 800], // varied rhythm
      repetitions: 4,
      showVisualCues: true,
      playSound: true,
    },
  },
  {
    id: 'counting-stars',
    title: 'Star Counter',
    description: 'Count the twinkling stars - a gentle focus exercise.',
    category: 'physical',
    gradeRange: ['K5'],
    durationSeconds: 30,
    instructions: [
      'Stars will appear on the screen',
      'Count them carefully',
      'Tap your answer',
      'Do this 3 times',
    ],
    gameConfig: {
      type: 'counting',
      objectType: 'stars',
      countRange: [3, 8],
      rounds: 3,
    },
  },

  // ─── Creative Games (Drawing & Tracing) ─────────────────────────────────────
  {
    id: 'drawing-calm',
    title: 'Calm Drawing',
    description: 'Draw something peaceful for a quick break.',
    category: 'creative',
    gradeRange: ['K5', 'G6_8'],
    durationSeconds: 90,
    instructions: [
      'Draw whatever feels calm to you',
      'Maybe a flower, sun, or happy face',
      'No rush, no judging',
      'Just create and breathe',
    ],
    gameConfig: {
      type: 'drawing',
      prompt: 'Draw something that makes you feel calm',
      timeLimit: 90,
      suggestedShapes: ['circle', 'star', 'heart', 'flower', 'sun'],
      freeform: true,
    },
  },
  {
    id: 'shape-tracing',
    title: 'Shape Tracing',
    description: 'Trace the shapes slowly and mindfully.',
    category: 'creative',
    gradeRange: ['K5'],
    durationSeconds: 60,
    instructions: [
      'A shape will appear',
      'Trace over it with your finger or mouse',
      'Go slowly and smoothly',
      'Breathe as you trace',
    ],
    gameConfig: {
      type: 'shape-tracing',
      shapes: ['circle', 'triangle', 'square', 'star'],
      speed: 'slow',
      repetitions: 2,
    },
  },
  {
    id: 'color-match-calm',
    title: 'Color Harmony',
    description: 'Match colors to create harmony - a relaxing game.',
    category: 'creative',
    gradeRange: ['G6_8', 'G9_12'],
    durationSeconds: 60,
    instructions: [
      'Match the color shown',
      'Create a harmonious palette',
      'Take your time choosing',
      'Enjoy the calming colors',
    ],
    gameConfig: {
      type: 'color-match',
      colorCount: 4,
      rounds: 3,
      difficulty: 'easy',
    },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// LIBRARY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all games available for a specific grade band
 */
export function getGamesForGrade(gradeBand: GradeBand): MiniGame[] {
  return MINI_GAMES.filter((game) => game.gradeRange.includes(gradeBand));
}

/**
 * Get games by category
 */
export function getGamesByCategory(category: GameCategory, gradeBand?: GradeBand): MiniGame[] {
  let games = MINI_GAMES.filter((game) => game.category === category);

  if (gradeBand) {
    games = games.filter((game) => game.gradeRange.includes(gradeBand));
  }

  return games;
}

/**
 * Get a specific game by ID
 */
export function getGameById(gameId: string): MiniGame | null {
  return MINI_GAMES.find((game) => game.id === gameId) ?? null;
}

/**
 * Get a recommended game based on learner context
 */
export function getRecommendedGame(context: {
  gradeBand: GradeBand;
  mood?: 'happy' | 'okay' | 'frustrated' | 'tired' | 'confused';
  previousGameIds?: string[];
  preferredCategory?: GameCategory;
}): MiniGame | null {
  let eligible = getGamesForGrade(context.gradeBand);

  // Filter out previously played games to avoid repetition
  if (context.previousGameIds && context.previousGameIds.length > 0) {
    eligible = eligible.filter((game) => !context.previousGameIds!.includes(game.id));
  }

  // Score games based on context
  const scored = eligible.map((game) => ({
    game,
    score: scoreGame(game, context),
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Add some randomness among top choices
  const topChoices = scored.filter((s) => s.score >= scored[0]?.score * 0.8);

  if (topChoices.length === 0) {
    return null;
  }

  return topChoices[Math.floor(Math.random() * topChoices.length)].game;
}

/**
 * Score a game based on learner context
 */
function scoreGame(
  game: MiniGame,
  context: {
    mood?: string;
    preferredCategory?: GameCategory;
  }
): number {
  let score = 1;

  // Prefer relaxation games when frustrated or tired
  if (context.mood === 'frustrated' || context.mood === 'tired') {
    if (game.category === 'relaxation') {
      score += 3;
    }
  }

  // Prefer cognitive games when feeling okay or happy
  if (context.mood === 'happy' || context.mood === 'okay') {
    if (game.category === 'cognitive' || game.category === 'creative') {
      score += 2;
    }
  }

  // Prefer physical games for tired learners
  if (context.mood === 'tired' && game.category === 'physical') {
    score += 2;
  }

  // Respect category preference
  if (context.preferredCategory && game.category === context.preferredCategory) {
    score += 2;
  }

  return score;
}

/**
 * Get game categories with counts
 */
export function getGameCategories(gradeBand?: GradeBand): Array<{
  category: GameCategory;
  count: number;
  games: MiniGame[];
}> {
  const categories: GameCategory[] = ['cognitive', 'relaxation', 'physical', 'creative'];

  return categories.map((category) => {
    const games = getGamesByCategory(category, gradeBand);
    return {
      category,
      count: games.length,
      games,
    };
  });
}
