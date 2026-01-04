/**
 * Game Catalog - Built-in game definitions
 * These are seeded into the database on startup
 */

import type { GameDefinition } from '../types/index.js';

export const GAME_CATALOG: GameDefinition[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // FOCUS BREAK GAMES
  // ══════════════════════════════════════════════════════════════════════════════
  {
    slug: 'balloon-breaths',
    title: 'Balloon Breaths',
    description: 'Blow up a colorful balloon by breathing deeply. Watch it grow with each breath!',
    instructions: 'Breathe in slowly as the balloon inflates. Hold when it\'s full. Breathe out as it gently deflates.',
    type: 'FOCUS_BREAK',
    category: 'RELAXATION',
    minAge: 5,
    maxAge: 12,
    gradeBands: ['K_2', 'G3_5'],
    estimatedDurationSec: 120,
    cognitiveSkills: ['ATTENTION', 'INHIBITORY_CONTROL'],
    accessibilityFeatures: ['reduced-motion', 'high-contrast', 'audio-cues'],
    gameConfig: {
      breathCycles: 5,
      inhaleSeconds: 4,
      holdSeconds: 4,
      exhaleSeconds: 6,
      balloonColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    },
    xpReward: 15,
    coinReward: 5,
    tags: ['breathing', 'calm', 'relaxation', 'focus-break'],
  },
  {
    slug: 'bubble-pop',
    title: 'Bubble Pop',
    description: 'Pop colorful bubbles floating across the screen. Simple, satisfying, and calming.',
    instructions: 'Tap or click on bubbles to pop them. Try to pop them all before they float away!',
    type: 'FOCUS_BREAK',
    category: 'RELAXATION',
    minAge: 5,
    maxAge: 18,
    gradeBands: ['K_2', 'G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 90,
    cognitiveSkills: ['ATTENTION', 'PROCESSING_SPEED'],
    accessibilityFeatures: ['large-touch-targets', 'audio-cues', 'reduced-motion'],
    gameConfig: {
      bubbleCount: 20,
      spawnRate: 1.5,
      bubbleSizes: [40, 60, 80],
    },
    xpReward: 10,
    coinReward: 3,
    tags: ['relaxation', 'simple', 'calming', 'focus-break'],
  },
  {
    slug: 'color-zen',
    title: 'Color Zen',
    description: 'A peaceful coloring activity. Fill in beautiful patterns with soothing colors.',
    instructions: 'Select a color and tap on areas to fill them in. Create your own masterpiece!',
    type: 'FOCUS_BREAK',
    category: 'CREATIVE',
    minAge: 5,
    maxAge: 14,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDurationSec: 180,
    cognitiveSkills: ['ATTENTION', 'VISUAL_SPATIAL'],
    accessibilityFeatures: ['large-touch-targets', 'high-contrast-palette'],
    gameConfig: {
      patterns: ['mandala', 'nature', 'animals', 'geometric'],
      colorPalettes: ['rainbow', 'sunset', 'ocean', 'forest'],
    },
    xpReward: 15,
    coinReward: 5,
    tags: ['creative', 'calming', 'art', 'focus-break'],
  },
  {
    slug: 'star-stretch',
    title: 'Star Stretch',
    description: 'Follow the star as it guides you through gentle stretches. Great for body breaks!',
    instructions: 'Copy the movements shown on screen. Stretch slowly and breathe deeply.',
    type: 'FOCUS_BREAK',
    category: 'MOVEMENT',
    minAge: 5,
    maxAge: 14,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDurationSec: 120,
    cognitiveSkills: ['ATTENTION', 'INHIBITORY_CONTROL'],
    accessibilityFeatures: ['seated-alternatives', 'audio-instructions', 'slow-pace'],
    gameConfig: {
      stretches: ['reach-high', 'twist', 'shoulder-roll', 'neck-gentle', 'arm-circles'],
      holdSeconds: 5,
      transitionSeconds: 3,
    },
    xpReward: 20,
    coinReward: 8,
    tags: ['movement', 'stretching', 'body-break', 'focus-break'],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // BRAIN TRAINING GAMES
  // ══════════════════════════════════════════════════════════════════════════════
  {
    slug: 'memory-match',
    title: 'Memory Match',
    description: 'Flip cards to find matching pairs. Train your memory with increasingly challenging levels!',
    instructions: 'Tap cards to flip them. Find all matching pairs with the fewest moves.',
    type: 'BRAIN_TRAINING',
    category: 'MEMORY',
    minAge: 5,
    maxAge: 18,
    gradeBands: ['K_2', 'G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 180,
    cognitiveSkills: ['WORKING_MEMORY', 'ATTENTION', 'VISUAL_SPATIAL'],
    accessibilityFeatures: ['high-contrast', 'large-cards', 'audio-feedback'],
    gameConfig: {
      levels: [
        { id: 1, name: 'Easy', difficulty: 'easy', config: { pairs: 4, timeLimit: 60 } },
        { id: 2, name: 'Medium', difficulty: 'medium', config: { pairs: 6, timeLimit: 90 } },
        { id: 3, name: 'Hard', difficulty: 'hard', config: { pairs: 8, timeLimit: 120 } },
        { id: 4, name: 'Expert', difficulty: 'expert', config: { pairs: 12, timeLimit: 180 } },
      ],
      cardThemes: ['animals', 'shapes', 'numbers', 'emojis'],
    },
    xpReward: 25,
    coinReward: 10,
    tags: ['memory', 'matching', 'brain-training', 'classic'],
  },
  {
    slug: 'pattern-sequence',
    title: 'Pattern Sequence',
    description: 'Watch the pattern, then repeat it! Test how long a sequence you can remember.',
    instructions: 'Watch the sequence of colors/sounds carefully. Then tap them in the same order.',
    type: 'BRAIN_TRAINING',
    category: 'PATTERN',
    minAge: 6,
    maxAge: 18,
    gradeBands: ['K_2', 'G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 180,
    cognitiveSkills: ['WORKING_MEMORY', 'ATTENTION', 'PATTERN_RECOGNITION'],
    accessibilityFeatures: ['audio-cues', 'high-contrast', 'adjustable-speed'],
    gameConfig: {
      startingLength: 3,
      maxLength: 12,
      showSpeed: 800, // ms per item
      colors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'],
      useSounds: true,
    },
    xpReward: 30,
    coinReward: 12,
    tags: ['pattern', 'sequence', 'memory', 'brain-training', 'simon-says'],
  },
  {
    slug: 'speed-sort',
    title: 'Speed Sort',
    description: 'Sort items into the correct categories as fast as you can!',
    instructions: 'Drag items to the correct category box. Be quick but accurate!',
    type: 'BRAIN_TRAINING',
    category: 'REACTION',
    minAge: 7,
    maxAge: 18,
    gradeBands: ['G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 120,
    cognitiveSkills: ['PROCESSING_SPEED', 'COGNITIVE_FLEXIBILITY', 'INHIBITORY_CONTROL'],
    accessibilityFeatures: ['large-touch-targets', 'extended-time-mode'],
    gameConfig: {
      difficulties: ['easy', 'medium', 'hard'],
      categories: {
        easy: ['colors', 'sizes'],
        medium: ['shapes', 'even-odd'],
        hard: ['greater-less', 'multiples'],
      },
      itemsPerRound: 20,
      timeLimitSec: 60,
    },
    xpReward: 25,
    coinReward: 10,
    tags: ['sorting', 'speed', 'categories', 'brain-training'],
  },
  {
    slug: 'focus-finder',
    title: 'Focus Finder',
    description: 'Find the hidden objects in busy scenes. Perfect for attention training!',
    instructions: 'Look carefully at the scene. Tap on the hidden items from the list.',
    type: 'BRAIN_TRAINING',
    category: 'PUZZLE',
    minAge: 6,
    maxAge: 14,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDurationSec: 240,
    cognitiveSkills: ['ATTENTION', 'VISUAL_SPATIAL', 'PROCESSING_SPEED'],
    accessibilityFeatures: ['zoom-available', 'hint-system', 'high-contrast-mode'],
    gameConfig: {
      scenes: ['bedroom', 'classroom', 'park', 'kitchen'],
      itemsToFind: 8,
      hintsAllowed: 3,
      timeLimit: 180,
    },
    xpReward: 30,
    coinReward: 12,
    tags: ['hidden-object', 'attention', 'visual', 'brain-training'],
  },
  {
    slug: 'word-builder',
    title: 'Word Builder',
    description: 'Create words from jumbled letters. Expand your vocabulary!',
    instructions: 'Tap letters to form words. Find as many words as you can!',
    type: 'BRAIN_TRAINING',
    category: 'LANGUAGE',
    minAge: 7,
    maxAge: 18,
    gradeBands: ['G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 180,
    cognitiveSkills: ['VERBAL_REASONING', 'WORKING_MEMORY', 'COGNITIVE_FLEXIBILITY'],
    accessibilityFeatures: ['text-to-speech', 'dyslexia-friendly-font', 'large-letters'],
    gameConfig: {
      letterCount: 6,
      minWordLength: 3,
      timeLimit: 120,
      difficulties: ['easy', 'medium', 'hard'],
      bonusWords: true,
    },
    xpReward: 25,
    coinReward: 10,
    tags: ['words', 'vocabulary', 'spelling', 'brain-training', 'language'],
  },
  {
    slug: 'number-ninja',
    title: 'Number Ninja',
    description: 'Slice through math problems like a ninja! Quick mental math training.',
    instructions: 'Solve the math problem and swipe to the correct answer before time runs out.',
    type: 'BRAIN_TRAINING',
    category: 'MATH',
    minAge: 6,
    maxAge: 14,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDurationSec: 120,
    cognitiveSkills: ['PROCESSING_SPEED', 'WORKING_MEMORY', 'ATTENTION'],
    accessibilityFeatures: ['extended-time', 'larger-numbers', 'audio-problems'],
    gameConfig: {
      levels: [
        { id: 1, name: 'Addition', difficulty: 'easy', config: { operations: ['+'], maxNum: 10 } },
        { id: 2, name: 'Subtraction', difficulty: 'easy', config: { operations: ['-'], maxNum: 10 } },
        { id: 3, name: 'Mixed Easy', difficulty: 'medium', config: { operations: ['+', '-'], maxNum: 20 } },
        { id: 4, name: 'Multiplication', difficulty: 'medium', config: { operations: ['×'], maxNum: 10 } },
        { id: 5, name: 'All Operations', difficulty: 'hard', config: { operations: ['+', '-', '×', '÷'], maxNum: 12 } },
      ],
      problemsPerRound: 15,
      timePerProblem: 5,
    },
    xpReward: 25,
    coinReward: 10,
    tags: ['math', 'arithmetic', 'speed', 'brain-training'],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // REWARD / UNLOCKABLE GAMES
  // ══════════════════════════════════════════════════════════════════════════════
  {
    slug: 'space-explorer',
    title: 'Space Explorer',
    description: 'Navigate your spaceship through the galaxy, collecting stars and avoiding asteroids!',
    instructions: 'Tilt or tap to steer your spaceship. Collect stars and power-ups. Avoid asteroids!',
    type: 'REWARD',
    category: 'REACTION',
    minAge: 6,
    maxAge: 14,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDurationSec: 180,
    cognitiveSkills: ['PROCESSING_SPEED', 'ATTENTION', 'VISUAL_SPATIAL'],
    accessibilityFeatures: ['one-hand-mode', 'reduced-motion', 'adjustable-speed'],
    gameConfig: {
      controlModes: ['tilt', 'tap', 'swipe'],
      powerUps: ['shield', 'magnet', 'slow-motion'],
      obstacleTypes: ['asteroid', 'comet', 'black-hole'],
    },
    xpReward: 30,
    coinReward: 15,
    tags: ['space', 'adventure', 'arcade', 'reward'],
  },
  {
    slug: 'pet-care',
    title: 'Pet Paradise',
    description: 'Take care of your virtual pet! Feed, play, and keep them happy.',
    instructions: 'Tap on activities to care for your pet. Keep all meters full to earn rewards!',
    type: 'REWARD',
    category: 'RELAXATION',
    minAge: 5,
    maxAge: 12,
    gradeBands: ['K_2', 'G3_5'],
    estimatedDurationSec: 300,
    cognitiveSkills: ['ATTENTION', 'INHIBITORY_CONTROL'],
    accessibilityFeatures: ['simple-interface', 'audio-feedback', 'no-time-pressure'],
    gameConfig: {
      petTypes: ['puppy', 'kitten', 'bunny', 'hamster'],
      activities: ['feed', 'play', 'sleep', 'clean', 'walk'],
      unlockables: ['toys', 'accessories', 'environments'],
    },
    xpReward: 20,
    coinReward: 10,
    tags: ['pet', 'care', 'relaxing', 'reward', 'virtual-pet'],
  },
  {
    slug: 'puzzle-quest',
    title: 'Puzzle Quest',
    description: 'Solve challenging puzzles to unlock treasure and advance through levels!',
    instructions: 'Complete each puzzle to earn keys and unlock the next area.',
    type: 'REWARD',
    category: 'PUZZLE',
    minAge: 7,
    maxAge: 18,
    gradeBands: ['G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 300,
    cognitiveSkills: ['COGNITIVE_FLEXIBILITY', 'VISUAL_SPATIAL', 'PATTERN_RECOGNITION'],
    accessibilityFeatures: ['hint-system', 'undo-button', 'no-time-limit'],
    gameConfig: {
      puzzleTypes: ['sliding', 'rotation', 'connection', 'logic'],
      worldCount: 5,
      levelsPerWorld: 10,
    },
    xpReward: 35,
    coinReward: 15,
    tags: ['puzzle', 'adventure', 'logic', 'reward'],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // RELAXATION GAMES
  // ══════════════════════════════════════════════════════════════════════════════
  {
    slug: 'sound-garden',
    title: 'Sound Garden',
    description: 'Create peaceful soundscapes by placing nature sounds in your garden.',
    instructions: 'Tap to add sounds. Mix rain, birds, wind, and more to create your perfect space.',
    type: 'RELAXATION',
    category: 'CREATIVE',
    minAge: 5,
    maxAge: 18,
    gradeBands: ['K_2', 'G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 300,
    cognitiveSkills: ['ATTENTION', 'COGNITIVE_FLEXIBILITY'],
    accessibilityFeatures: ['visual-alternatives', 'adjustable-volume', 'no-time-pressure'],
    gameConfig: {
      soundCategories: ['rain', 'birds', 'wind', 'water', 'forest', 'night'],
      maxLayers: 6,
      visualizations: ['garden', 'forest', 'beach', 'mountain'],
    },
    xpReward: 15,
    coinReward: 5,
    tags: ['soundscape', 'relaxation', 'creative', 'calming', 'sensory'],
  },
  {
    slug: 'zen-garden',
    title: 'Zen Garden',
    description: 'Rake peaceful patterns in the sand. A mindful, calming activity.',
    instructions: 'Drag to rake patterns in the sand. Place stones and plants for your perfect garden.',
    type: 'RELAXATION',
    category: 'CREATIVE',
    minAge: 6,
    maxAge: 18,
    gradeBands: ['K_2', 'G3_5', 'G6_8', 'G9_12'],
    estimatedDurationSec: 300,
    cognitiveSkills: ['ATTENTION', 'VISUAL_SPATIAL'],
    accessibilityFeatures: ['no-time-pressure', 'simple-controls', 'high-contrast-mode'],
    gameConfig: {
      tools: ['rake', 'smooth', 'pattern'],
      decorations: ['stones', 'plants', 'lanterns', 'bridges'],
      patterns: ['waves', 'circles', 'spiral', 'free'],
    },
    xpReward: 15,
    coinReward: 5,
    tags: ['zen', 'mindful', 'relaxation', 'creative', 'calming'],
  },
];

/**
 * Get games filtered by criteria
 */
export function filterGames(
  games: GameDefinition[],
  filters: {
    type?: string;
    category?: string;
    gradeBand?: string;
    cognitiveSkill?: string;
    maxDurationSec?: number;
    minAge?: number;
    maxAge?: number;
    tags?: string[];
    accessibilityFeatures?: string[];
  }
): GameDefinition[] {
  return games.filter((game) => {
    if (filters.type && game.type !== filters.type) return false;
    if (filters.category && game.category !== filters.category) return false;
    if (filters.gradeBand && !game.gradeBands.includes(filters.gradeBand as any)) return false;
    if (filters.cognitiveSkill && !game.cognitiveSkills.includes(filters.cognitiveSkill as any)) return false;
    if (filters.maxDurationSec && game.estimatedDurationSec > filters.maxDurationSec) return false;
    if (filters.minAge && game.maxAge < filters.minAge) return false;
    if (filters.maxAge && game.minAge > filters.maxAge) return false;
    if (filters.tags && !filters.tags.some((tag) => game.tags.includes(tag))) return false;
    if (filters.accessibilityFeatures) {
      const hasRequiredFeatures = filters.accessibilityFeatures.every((f) =>
        game.accessibilityFeatures.includes(f)
      );
      if (!hasRequiredFeatures) return false;
    }
    return true;
  });
}

/**
 * Get a random game for focus break
 */
export function getRandomFocusBreakGame(
  games: GameDefinition[],
  gradeBand: string,
  excludeIds: string[] = []
): GameDefinition | null {
  const focusBreakGames = games.filter(
    (g) =>
      (g.type === 'FOCUS_BREAK' || g.type === 'RELAXATION') &&
      g.gradeBands.includes(gradeBand as any) &&
      !excludeIds.includes(g.slug)
  );

  if (focusBreakGames.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * focusBreakGames.length);
  return focusBreakGames[randomIndex];
}
