/**
 * Game Templates
 *
 * Template definitions for AI-generated adaptive games.
 * Each template includes:
 * - Game mechanics
 * - Configurable parameters
 * - Rendering hints for frontends
 * - Scoring rules
 * - Difficulty ranges
 */

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type GameType =
  | 'word_search'
  | 'crossword'
  | 'anagram'
  | 'equation_builder'
  | 'number_pattern'
  | 'mental_math'
  | 'visual_math'
  | 'pattern_recognition'
  | 'sequence_puzzle'
  | 'logic_grid'
  | 'memory_match'
  | 'vocabulary_builder';

export type GameCategory = 'word_puzzles' | 'math_challenges' | 'pattern_games' | 'logic_puzzles' | 'memory_games';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface GameTemplate {
  id: GameType;
  name: string;
  description: string;
  category: GameCategory;
  icon: string;
  minGradeLevel: number;
  maxGradeLevel: number;
  parameters: GameParameter[];
  mechanics: GameMechanics;
  scoring: ScoringRules;
  renderingHints: RenderingHints;
  aiGenerationPrompt: string;
}

export interface GameParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  default: unknown;
  min?: number;
  max?: number;
  options?: string[];
  description: string;
  difficultyMap?: {
    easy: unknown;
    medium: unknown;
    hard: unknown;
  };
}

export interface GameMechanics {
  duration: number; // seconds
  timeLimit?: number;
  allowsHints: boolean;
  allowsPause: boolean;
  multipleAttempts: boolean;
  progressSaving: boolean;
}

export interface ScoringRules {
  basePoints: number;
  timeBonus: boolean;
  accuracyMultiplier: boolean;
  hintPenalty: number; // points deducted per hint
  streakBonus: boolean;
}

export interface RenderingHints {
  layout: 'grid' | 'list' | 'canvas' | 'split' | 'full-screen';
  interactions: string[];
  visualElements: string[];
  animations: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// GAME TEMPLATES
// ────────────────────────────────────────────────────────────────────────────

export const GAME_TEMPLATES: Record<GameType, GameTemplate> = {
  // ══════════════════════════════════════════════════════════════════════════
  // WORD PUZZLES
  // ══════════════════════════════════════════════════════════════════════════

  word_search: {
    id: 'word_search',
    name: 'Word Search',
    description: 'Find hidden words in a letter grid',
    category: 'word_puzzles',
    icon: '🔍',
    minGradeLevel: 2,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'gridSize',
        type: 'number',
        default: 10,
        min: 8,
        max: 15,
        description: 'Grid dimensions (NxN)',
        difficultyMap: { easy: 8, medium: 10, hard: 15 },
      },
      {
        name: 'wordCount',
        type: 'number',
        default: 8,
        min: 5,
        max: 15,
        description: 'Number of words to find',
        difficultyMap: { easy: 5, medium: 8, hard: 12 },
      },
      {
        name: 'directions',
        type: 'select',
        default: 'horizontal_vertical',
        options: ['horizontal_vertical', 'all_directions', 'diagonal_only'],
        description: 'Allowed word directions',
        difficultyMap: { easy: 'horizontal_vertical', medium: 'all_directions', hard: 'all_directions' },
      },
      {
        name: 'theme',
        type: 'string',
        default: '',
        description: 'Vocabulary theme (e.g., "science", "history")',
      },
    ],
    mechanics: {
      duration: 600,
      timeLimit: 600,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: false,
      progressSaving: true,
    },
    scoring: {
      basePoints: 10,
      timeBonus: true,
      accuracyMultiplier: false,
      hintPenalty: 5,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'grid',
      interactions: ['click', 'drag-select', 'tap'],
      visualElements: ['letter-grid', 'word-list', 'timer', 'score'],
      animations: ['word-highlight', 'completion-celebration'],
    },
    aiGenerationPrompt: `Generate a word search puzzle with the following specifications:
- Grid size: {gridSize}x{gridSize}
- Number of words: {wordCount}
- Directions: {directions}
- Theme/Subject: {theme}
- Grade level: {gradeLevel}
- Learner interests: {learnerInterests}

Create educational vocabulary words appropriate for the grade level and theme.
Words should be engaging and relevant to the learner's current curriculum.

Return JSON:
{
  "words": ["word1", "word2", ...],
  "grid": [["A", "B", ...], ["C", "D", ...], ...],
  "solutions": [{"word": "word1", "start": [row, col], "direction": "horizontal"}, ...],
  "hints": ["hint for word1", "hint for word2", ...],
  "theme": "actual theme used"
}`,
  },

  crossword: {
    id: 'crossword',
    name: 'Crossword Puzzle',
    description: 'Complete the crossword using clues',
    category: 'word_puzzles',
    icon: '📝',
    minGradeLevel: 3,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'size',
        type: 'select',
        default: 'medium',
        options: ['small', 'medium', 'large'],
        description: 'Puzzle size (5x5, 9x9, 13x13)',
        difficultyMap: { easy: 'small', medium: 'medium', hard: 'large' },
      },
      {
        name: 'clueCount',
        type: 'number',
        default: 10,
        min: 5,
        max: 20,
        description: 'Number of words/clues',
        difficultyMap: { easy: 5, medium: 10, hard: 15 },
      },
      {
        name: 'subject',
        type: 'string',
        default: '',
        description: 'Subject area for clues',
      },
    ],
    mechanics: {
      duration: 900,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: true,
    },
    scoring: {
      basePoints: 15,
      timeBonus: false,
      accuracyMultiplier: true,
      hintPenalty: 3,
      streakBonus: false,
    },
    renderingHints: {
      layout: 'split',
      interactions: ['click', 'type', 'arrow-navigation'],
      visualElements: ['crossword-grid', 'clue-list', 'active-word-highlight'],
      animations: ['cell-fill', 'correct-word-celebration'],
    },
    aiGenerationPrompt: `Generate a crossword puzzle:
- Size: {size}
- Clue count: {clueCount}
- Subject: {subject}
- Grade level: {gradeLevel}

Create an interlocking crossword with educational content.

Return JSON:
{
  "grid": [[{"letter": "A", "number": 1, "black": false}, ...], ...],
  "across": [{"number": 1, "clue": "...", "answer": "...", "row": 0, "col": 0}, ...],
  "down": [{"number": 2, "clue": "...", "answer": "...", "row": 0, "col": 0}, ...],
  "hints": {"1": "additional hint", ...}
}`,
  },

  anagram: {
    id: 'anagram',
    name: 'Anagram Solver',
    description: 'Unscramble letters to form words',
    category: 'word_puzzles',
    icon: '🔤',
    minGradeLevel: 2,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'wordCount',
        type: 'number',
        default: 10,
        min: 5,
        max: 20,
        description: 'Number of anagrams',
        difficultyMap: { easy: 5, medium: 10, hard: 15 },
      },
      {
        name: 'wordLength',
        type: 'select',
        default: 'mixed',
        options: ['short', 'medium', 'long', 'mixed'],
        description: 'Word length preference',
        difficultyMap: { easy: 'short', medium: 'medium', hard: 'long' },
      },
      {
        name: 'vocabulary',
        type: 'string',
        default: '',
        description: 'Vocabulary set or theme',
      },
    ],
    mechanics: {
      duration: 300,
      allowsHints: true,
      allowsPause: false,
      multipleAttempts: true,
      progressSaving: false,
    },
    scoring: {
      basePoints: 5,
      timeBonus: true,
      accuracyMultiplier: false,
      hintPenalty: 2,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'full-screen',
      interactions: ['drag', 'tap', 'keyboard'],
      visualElements: ['letter-tiles', 'answer-slots', 'skip-button'],
      animations: ['tile-shuffle', 'correct-animation'],
    },
    aiGenerationPrompt: `Generate anagram puzzles:
- Word count: {wordCount}
- Word length: {wordLength}
- Vocabulary: {vocabulary}
- Grade level: {gradeLevel}

Return JSON:
{
  "anagrams": [
    {"scrambled": "TAC", "answer": "CAT", "hint": "A furry pet", "category": "animals"},
    ...
  ]
}`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MATH CHALLENGES
  // ══════════════════════════════════════════════════════════════════════════

  equation_builder: {
    id: 'equation_builder',
    name: 'Equation Builder',
    description: 'Build equations to reach target numbers',
    category: 'math_challenges',
    icon: '🔢',
    minGradeLevel: 3,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'operations',
        type: 'select',
        default: 'basic',
        options: ['addition_only', 'basic', 'advanced', 'algebra'],
        description: 'Allowed operations',
        difficultyMap: { easy: 'addition_only', medium: 'basic', hard: 'advanced' },
      },
      {
        name: 'challengeCount',
        type: 'number',
        default: 10,
        min: 5,
        max: 20,
        description: 'Number of challenges',
      },
      {
        name: 'numberRange',
        type: 'select',
        default: 'medium',
        options: ['small', 'medium', 'large'],
        description: 'Range of numbers used',
        difficultyMap: { easy: 'small', medium: 'medium', hard: 'large' },
      },
    ],
    mechanics: {
      duration: 600,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: true,
    },
    scoring: {
      basePoints: 20,
      timeBonus: true,
      accuracyMultiplier: true,
      hintPenalty: 5,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'canvas',
      interactions: ['drag', 'click', 'keyboard'],
      visualElements: ['number-tiles', 'operation-buttons', 'target-display', 'equation-area'],
      animations: ['tile-placement', 'solution-check'],
    },
    aiGenerationPrompt: `Generate equation building challenges:
- Operations: {operations}
- Challenge count: {challengeCount}
- Number range: {numberRange}
- Grade level: {gradeLevel}

Return JSON:
{
  "challenges": [
    {
      "target": 24,
      "numbers": [3, 4, 6, 8],
      "operations": ["+", "-", "*", "/"],
      "solutions": ["3 * 8 = 24", "6 * 4 = 24"],
      "hint": "Think about multiplication"
    },
    ...
  ]
}`,
  },

  number_pattern: {
    id: 'number_pattern',
    name: 'Number Patterns',
    description: 'Complete the number sequence',
    category: 'math_challenges',
    icon: '🔢',
    minGradeLevel: 2,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'patternCount',
        type: 'number',
        default: 8,
        min: 5,
        max: 15,
        description: 'Number of patterns',
      },
      {
        name: 'complexity',
        type: 'select',
        default: 'medium',
        options: ['simple', 'medium', 'complex'],
        description: 'Pattern complexity',
        difficultyMap: { easy: 'simple', medium: 'medium', hard: 'complex' },
      },
    ],
    mechanics: {
      duration: 400,
      allowsHints: true,
      allowsPause: false,
      multipleAttempts: true,
      progressSaving: false,
    },
    scoring: {
      basePoints: 10,
      timeBonus: true,
      accuracyMultiplier: true,
      hintPenalty: 3,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'list',
      interactions: ['click', 'keyboard'],
      visualElements: ['sequence-display', 'answer-input', 'explanation'],
      animations: ['number-reveal', 'correct-feedback'],
    },
    aiGenerationPrompt: `Generate number pattern puzzles:
- Pattern count: {patternCount}
- Complexity: {complexity}
- Grade level: {gradeLevel}

Return JSON:
{
  "patterns": [
    {
      "sequence": [2, 4, 6, 8, "?"],
      "answer": 10,
      "rule": "Add 2 each time",
      "hint": "Look at the difference between numbers",
      "type": "arithmetic"
    },
    ...
  ]
}`,
  },

  mental_math: {
    id: 'mental_math',
    name: 'Mental Math Sprint',
    description: 'Quick mental math practice',
    category: 'math_challenges',
    icon: '⚡',
    minGradeLevel: 1,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'duration',
        type: 'number',
        default: 60,
        min: 30,
        max: 300,
        description: 'Time limit in seconds',
      },
      {
        name: 'operations',
        type: 'select',
        default: 'mixed',
        options: ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
        description: 'Math operations',
      },
      {
        name: 'difficulty',
        type: 'select',
        default: 'medium',
        options: ['easy', 'medium', 'hard'],
        description: 'Problem difficulty',
      },
    ],
    mechanics: {
      duration: 60,
      timeLimit: 60,
      allowsHints: false,
      allowsPause: false,
      multipleAttempts: false,
      progressSaving: false,
    },
    scoring: {
      basePoints: 5,
      timeBonus: false,
      accuracyMultiplier: true,
      hintPenalty: 0,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'full-screen',
      interactions: ['keyboard', 'number-pad'],
      visualElements: ['problem-display', 'answer-input', 'timer', 'streak-counter'],
      animations: ['problem-transition', 'streak-celebration'],
    },
    aiGenerationPrompt: `Generate mental math problems:
- Duration: {duration} seconds
- Operations: {operations}
- Difficulty: {difficulty}
- Grade level: {gradeLevel}

Generate enough problems for continuous play. Include adaptive difficulty.

Return JSON:
{
  "problems": [
    {"question": "7 + 8", "answer": 15, "operation": "addition"},
    {"question": "12 × 3", "answer": 36, "operation": "multiplication"},
    ...
  ],
  "targetProblemsPerMinute": 10
}`,
  },

  visual_math: {
    id: 'visual_math',
    name: 'Visual Math',
    description: 'Solve visual math problems (fractions, geometry)',
    category: 'math_challenges',
    icon: '📐',
    minGradeLevel: 3,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'problemType',
        type: 'select',
        default: 'mixed',
        options: ['fractions', 'geometry', 'area', 'mixed'],
        description: 'Type of visual problems',
      },
      {
        name: 'problemCount',
        type: 'number',
        default: 8,
        min: 4,
        max: 12,
        description: 'Number of problems',
      },
    ],
    mechanics: {
      duration: 600,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: true,
    },
    scoring: {
      basePoints: 25,
      timeBonus: false,
      accuracyMultiplier: true,
      hintPenalty: 5,
      streakBonus: false,
    },
    renderingHints: {
      layout: 'canvas',
      interactions: ['click', 'drag', 'draw'],
      visualElements: ['diagram', 'answer-input', 'drawing-tools'],
      animations: ['diagram-reveal', 'solution-visualization'],
    },
    aiGenerationPrompt: `Generate visual math problems:
- Problem type: {problemType}
- Problem count: {problemCount}
- Grade level: {gradeLevel}

Return JSON with SVG/Canvas drawing instructions:
{
  "problems": [
    {
      "type": "fraction",
      "question": "What fraction is shaded?",
      "visual": {"type": "circle", "parts": 8, "shaded": [0, 1, 2]},
      "answer": "3/8",
      "hint": "Count the shaded parts"
    },
    ...
  ]
}`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PATTERN & LOGIC GAMES
  // ══════════════════════════════════════════════════════════════════════════

  pattern_recognition: {
    id: 'pattern_recognition',
    name: 'Pattern Recognition',
    description: 'Identify and complete visual patterns',
    category: 'pattern_games',
    icon: '🎨',
    minGradeLevel: 1,
    maxGradeLevel: 10,
    parameters: [
      {
        name: 'patternCount',
        type: 'number',
        default: 10,
        min: 5,
        max: 15,
        description: 'Number of patterns',
      },
      {
        name: 'complexity',
        type: 'select',
        default: 'medium',
        options: ['simple', 'medium', 'complex'],
        description: 'Pattern complexity',
        difficultyMap: { easy: 'simple', medium: 'medium', hard: 'complex' },
      },
    ],
    mechanics: {
      duration: 400,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: false,
    },
    scoring: {
      basePoints: 15,
      timeBonus: true,
      accuracyMultiplier: false,
      hintPenalty: 3,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'grid',
      interactions: ['click', 'tap'],
      visualElements: ['pattern-sequence', 'answer-choices'],
      animations: ['pattern-reveal', 'selection-feedback'],
    },
    aiGenerationPrompt: `Generate pattern recognition puzzles:
- Pattern count: {patternCount}
- Complexity: {complexity}
- Grade level: {gradeLevel}

Return JSON:
{
  "patterns": [
    {
      "sequence": ["🔴", "🔵", "🔴", "🔵", "?"],
      "choices": ["🔴", "🔵", "🟢", "🟡"],
      "answer": "🔴",
      "rule": "Alternating red and blue",
      "hint": "Look at the repeating colors"
    },
    ...
  ]
}`,
  },

  sequence_puzzle: {
    id: 'sequence_puzzle',
    name: 'Sequence Puzzle',
    description: 'Arrange items in the correct order',
    category: 'logic_puzzles',
    icon: '📊',
    minGradeLevel: 2,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'puzzleCount',
        type: 'number',
        default: 8,
        min: 4,
        max: 12,
        description: 'Number of puzzles',
      },
      {
        name: 'itemCount',
        type: 'select',
        default: 'medium',
        options: ['small', 'medium', 'large'],
        description: 'Items per sequence',
        difficultyMap: { easy: 'small', medium: 'medium', hard: 'large' },
      },
      {
        name: 'subject',
        type: 'string',
        default: '',
        description: 'Subject area for sequences',
      },
    ],
    mechanics: {
      duration: 500,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: true,
    },
    scoring: {
      basePoints: 20,
      timeBonus: false,
      accuracyMultiplier: true,
      hintPenalty: 4,
      streakBonus: false,
    },
    renderingHints: {
      layout: 'list',
      interactions: ['drag', 'reorder'],
      visualElements: ['item-cards', 'drop-zones', 'check-button'],
      animations: ['card-shuffle', 'correct-order-lock'],
    },
    aiGenerationPrompt: `Generate sequence puzzles:
- Puzzle count: {puzzleCount}
- Item count: {itemCount}
- Subject: {subject}
- Grade level: {gradeLevel}

Return JSON:
{
  "puzzles": [
    {
      "items": ["Seed", "Sprout", "Plant", "Flower", "Fruit"],
      "scrambled": ["Flower", "Seed", "Fruit", "Plant", "Sprout"],
      "title": "Plant Life Cycle",
      "hint": "Start with how a plant begins"
    },
    ...
  ]
}`,
  },

  logic_grid: {
    id: 'logic_grid',
    name: 'Logic Grid',
    description: 'Solve logic puzzles using deduction',
    category: 'logic_puzzles',
    icon: '🧩',
    minGradeLevel: 4,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'gridSize',
        type: 'select',
        default: 'small',
        options: ['small', 'medium', 'large'],
        description: 'Grid size (3x3, 4x4, 5x5)',
        difficultyMap: { easy: 'small', medium: 'medium', hard: 'large' },
      },
      {
        name: 'clueCount',
        type: 'number',
        default: 6,
        min: 4,
        max: 10,
        description: 'Number of clues',
      },
    ],
    mechanics: {
      duration: 900,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: true,
    },
    scoring: {
      basePoints: 30,
      timeBonus: false,
      accuracyMultiplier: true,
      hintPenalty: 8,
      streakBonus: false,
    },
    renderingHints: {
      layout: 'grid',
      interactions: ['click', 'mark'],
      visualElements: ['logic-grid', 'clue-list', 'mark-buttons'],
      animations: ['cell-mark', 'solution-reveal'],
    },
    aiGenerationPrompt: `Generate a logic grid puzzle:
- Grid size: {gridSize}
- Clue count: {clueCount}
- Grade level: {gradeLevel}

Return JSON:
{
  "categories": ["Names", "Colors", "Pets"],
  "items": {
    "Names": ["Alice", "Bob", "Carol"],
    "Colors": ["Red", "Blue", "Green"],
    "Pets": ["Cat", "Dog", "Bird"]
  },
  "clues": [
    "Alice's favorite color is not blue",
    "The person who likes red has a dog",
    ...
  ],
  "solution": [
    {"name": "Alice", "color": "Green", "pet": "Cat"},
    ...
  ],
  "hints": ["Start with the clue about Alice's color"]
}`,
  },

  memory_match: {
    id: 'memory_match',
    name: 'Memory Match',
    description: 'Match pairs of cards from memory',
    category: 'memory_games',
    icon: '🎴',
    minGradeLevel: 1,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'pairCount',
        type: 'number',
        default: 8,
        min: 4,
        max: 16,
        description: 'Number of pairs',
        difficultyMap: { easy: 4, medium: 8, hard: 12 },
      },
      {
        name: 'theme',
        type: 'string',
        default: '',
        description: 'Card theme (vocabulary, math facts, etc.)',
      },
      {
        name: 'cardType',
        type: 'select',
        default: 'educational',
        options: ['educational', 'vocabulary', 'math_facts', 'images'],
        description: 'Type of card content',
      },
    ],
    mechanics: {
      duration: 300,
      allowsHints: false,
      allowsPause: true,
      multipleAttempts: false,
      progressSaving: false,
    },
    scoring: {
      basePoints: 10,
      timeBonus: true,
      accuracyMultiplier: true,
      hintPenalty: 0,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'grid',
      interactions: ['click', 'tap'],
      visualElements: ['card-grid', 'flip-animation', 'match-counter'],
      animations: ['card-flip', 'match-celebration', 'mismatch-shake'],
    },
    aiGenerationPrompt: `Generate memory match cards:
- Pair count: {pairCount}
- Theme: {theme}
- Card type: {cardType}
- Grade level: {gradeLevel}

Return JSON:
{
  "pairs": [
    {"id": 1, "front": "2 + 2", "back": "4", "category": "addition"},
    {"id": 2, "front": "3 × 3", "back": "9", "category": "multiplication"},
    ...
  ],
  "theme": "Math Facts"
}`,
  },

  vocabulary_builder: {
    id: 'vocabulary_builder',
    name: 'Vocabulary Builder',
    description: 'Match words with definitions or synonyms',
    category: 'word_puzzles',
    icon: '📚',
    minGradeLevel: 3,
    maxGradeLevel: 12,
    parameters: [
      {
        name: 'wordCount',
        type: 'number',
        default: 10,
        min: 5,
        max: 20,
        description: 'Number of vocabulary words',
      },
      {
        name: 'subject',
        type: 'string',
        default: '',
        description: 'Subject area',
      },
      {
        name: 'matchType',
        type: 'select',
        default: 'definition',
        options: ['definition', 'synonym', 'antonym', 'example'],
        description: 'What to match words with',
      },
    ],
    mechanics: {
      duration: 600,
      allowsHints: true,
      allowsPause: true,
      multipleAttempts: true,
      progressSaving: true,
    },
    scoring: {
      basePoints: 10,
      timeBonus: false,
      accuracyMultiplier: true,
      hintPenalty: 2,
      streakBonus: true,
    },
    renderingHints: {
      layout: 'split',
      interactions: ['drag', 'click', 'connect'],
      visualElements: ['word-column', 'match-column', 'connection-lines'],
      animations: ['connection-draw', 'correct-match-lock'],
    },
    aiGenerationPrompt: `Generate vocabulary matching game:
- Word count: {wordCount}
- Subject: {subject}
- Match type: {matchType}
- Grade level: {gradeLevel}
- Learner vocabulary level: {vocabularyLevel}

Return JSON:
{
  "words": [
    {
      "word": "photosynthesis",
      "match": "Process by which plants make food using sunlight",
      "hint": "Related to how plants eat",
      "sentence": "Plants use photosynthesis to create energy."
    },
    ...
  ]
}`,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

export function getTemplateByType(type: GameType): GameTemplate {
  return GAME_TEMPLATES[type];
}

export function getTemplatesByCategory(category: GameCategory): GameTemplate[] {
  return Object.values(GAME_TEMPLATES).filter((t) => t.category === category);
}

export function getTemplatesForGrade(gradeLevel: number): GameTemplate[] {
  return Object.values(GAME_TEMPLATES).filter(
    (t) => gradeLevel >= t.minGradeLevel && gradeLevel <= t.maxGradeLevel
  );
}

export function getAllGameTypes(): GameType[] {
  return Object.keys(GAME_TEMPLATES) as GameType[];
}

export function getParametersForDifficulty(template: GameTemplate, difficulty: DifficultyLevel): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const param of template.parameters) {
    if (param.difficultyMap && param.difficultyMap[difficulty] !== undefined) {
      params[param.name] = param.difficultyMap[difficulty];
    } else {
      params[param.name] = param.default;
    }
  }

  return params;
}
