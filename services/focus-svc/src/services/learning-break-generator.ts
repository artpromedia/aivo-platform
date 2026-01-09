/**
 * Learning Break Game Generator
 *
 * Generates fun, learning-laced brain break activities personalized to the learner's
 * current skill levels from their Virtual Brain. These games are designed to:
 *
 * 1. Provide a refreshing mental break from main learning activities
 * 2. Reinforce curriculum-aligned skills in a game-like format
 * 3. Adapt difficulty based on the learner's mastery levels
 * 4. Feel fun and rewarding, not like "more homework"
 *
 * Game Types:
 * - Math Bubble Pop: Pop bubbles with correct math answers
 * - Word Scramble Sprint: Unscramble vocabulary words
 * - Quick Quiz Blast: Fast-paced review questions
 * - Pattern Power: Find patterns in sequences
 * - Fact or Fiction: True/false knowledge check
 *
 * @author AIVO Platform Team
 */

import type { GradeBand } from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type LearningGameType =
  | 'MATH_BUBBLE_POP'
  | 'WORD_SCRAMBLE'
  | 'QUICK_QUIZ'
  | 'PATTERN_POWER'
  | 'FACT_OR_FICTION'
  | 'NUMBER_NINJA'
  | 'SPELLING_BEE';

export type SkillDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL';

export interface LearnerSkillSnapshot {
  domain: SkillDomain;
  skillCode: string;
  masteryLevel: number; // 0-10
  recentlyPracticed: boolean;
}

export interface LearningBreakGame {
  gameType: LearningGameType;
  title: string;
  description: string;
  instructions: string[];
  estimatedDurationSeconds: number;
  targetDomain: SkillDomain;
  targetSkillCodes: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  gameConfig: LearningGameConfig;
  xpReward: number;
  coinReward: number;
}

export interface LearningGameConfig {
  // Common fields
  timeLimit?: number;
  questionCount?: number;

  // Game-specific content
  questions?: GameQuestion[];
  words?: WordPuzzle[];
  patterns?: PatternPuzzle[];
  mathProblems?: MathProblem[];
}

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  skillCode: string;
  feedback?: string;
}

export interface WordPuzzle {
  word: string;
  scrambled: string;
  hint: string;
  skillCode: string;
}

export interface PatternPuzzle {
  sequence: (string | number)[];
  missingIndex: number;
  options: (string | number)[];
  correctAnswer: string | number;
  skillCode: string;
}

export interface MathProblem {
  expression: string;
  correctAnswer: number;
  options: number[];
  skillCode: string;
}

export interface GenerationContext {
  tenantId: string;
  learnerId: string;
  gradeBand: GradeBand;
  skills: LearnerSkillSnapshot[];
  preferredDomain?: SkillDomain;
  excludeRecentSkills?: boolean;
  maxDurationSeconds?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME TEMPLATES BY GRADE BAND
// ══════════════════════════════════════════════════════════════════════════════

interface GameTemplate {
  gameType: LearningGameType;
  title: string;
  description: string;
  instructions: string[];
  estimatedDurationSeconds: number;
  domains: SkillDomain[];
  gradeBands: GradeBand[];
  baseXpReward: number;
  baseCoinReward: number;
}

const GAME_TEMPLATES: GameTemplate[] = [
  // ─── Math Games ────────────────────────────────────────────────────────────
  {
    gameType: 'MATH_BUBBLE_POP',
    title: 'Math Bubble Pop',
    description: 'Pop the bubbles with the right answers! Quick math fun.',
    instructions: [
      'Bubbles with math problems float up',
      'Tap the bubble with the correct answer',
      'Pop as many as you can before time runs out!',
    ],
    estimatedDurationSeconds: 60,
    domains: ['MATH'],
    gradeBands: ['K5', 'G6_8'],
    baseXpReward: 15,
    baseCoinReward: 5,
  },
  {
    gameType: 'NUMBER_NINJA',
    title: 'Number Ninja',
    description: 'Slice through math problems like a ninja!',
    instructions: [
      'Math problems appear on screen',
      'Swipe to the correct answer',
      'Build your combo streak!',
    ],
    estimatedDurationSeconds: 90,
    domains: ['MATH'],
    gradeBands: ['K5', 'G6_8', 'G9_12'],
    baseXpReward: 20,
    baseCoinReward: 8,
  },

  // ─── ELA Games ─────────────────────────────────────────────────────────────
  {
    gameType: 'WORD_SCRAMBLE',
    title: 'Word Scramble Sprint',
    description: 'Unscramble the letters to find hidden words!',
    instructions: [
      'Look at the scrambled letters',
      'Tap letters in order to spell the word',
      'Use the hint if you get stuck!',
    ],
    estimatedDurationSeconds: 90,
    domains: ['ELA'],
    gradeBands: ['K5', 'G6_8', 'G9_12'],
    baseXpReward: 15,
    baseCoinReward: 5,
  },
  {
    gameType: 'SPELLING_BEE',
    title: 'Spelling Bee Buzz',
    description: 'Hear the word, spell it right!',
    instructions: [
      'Listen to the word carefully',
      'Type or tap to spell it correctly',
      'Get it right to earn points!',
    ],
    estimatedDurationSeconds: 90,
    domains: ['ELA', 'SPEECH'],
    gradeBands: ['K5', 'G6_8'],
    baseXpReward: 15,
    baseCoinReward: 5,
  },

  // ─── Multi-Domain Games ────────────────────────────────────────────────────
  {
    gameType: 'QUICK_QUIZ',
    title: 'Quick Quiz Blast',
    description: 'Answer quick questions from your lessons!',
    instructions: [
      'Read each question carefully',
      'Tap the correct answer',
      'Beat the clock for bonus points!',
    ],
    estimatedDurationSeconds: 60,
    domains: ['ELA', 'MATH', 'SCIENCE', 'SEL'],
    gradeBands: ['K5', 'G6_8', 'G9_12'],
    baseXpReward: 20,
    baseCoinReward: 8,
  },
  {
    gameType: 'FACT_OR_FICTION',
    title: 'Fact or Fiction?',
    description: 'Is it true or false? You decide!',
    instructions: [
      'Read the statement',
      'Swipe right for TRUE, left for FALSE',
      'How many can you get right?',
    ],
    estimatedDurationSeconds: 60,
    domains: ['SCIENCE', 'ELA', 'MATH'],
    gradeBands: ['K5', 'G6_8', 'G9_12'],
    baseXpReward: 15,
    baseCoinReward: 5,
  },
  {
    gameType: 'PATTERN_POWER',
    title: 'Pattern Power',
    description: 'Find the pattern and complete the sequence!',
    instructions: [
      'Look at the pattern carefully',
      'Figure out what comes next',
      'Tap the correct answer!',
    ],
    estimatedDurationSeconds: 90,
    domains: ['MATH', 'SCIENCE'],
    gradeBands: ['K5', 'G6_8', 'G9_12'],
    baseXpReward: 20,
    baseCoinReward: 8,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT GENERATORS BY DOMAIN/GRADE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate math problems appropriate for the learner's level
 */
function generateMathProblems(
  gradeBand: GradeBand,
  difficulty: number,
  count: number,
  skillCode: string
): MathProblem[] {
  const problems: MathProblem[] = [];

  for (let i = 0; i < count; i++) {
    const problem = generateSingleMathProblem(gradeBand, difficulty, skillCode);
    problems.push(problem);
  }

  return problems;
}

function generateSingleMathProblem(
  gradeBand: GradeBand,
  difficulty: number,
  skillCode: string
): MathProblem {
  // Determine number ranges based on grade and difficulty
  let maxNum: number;
  let operations: string[];

  if (gradeBand === 'K5') {
    maxNum = difficulty <= 2 ? 10 : difficulty <= 4 ? 20 : 50;
    operations = difficulty <= 2 ? ['+'] : difficulty <= 4 ? ['+', '-'] : ['+', '-', '×'];
  } else if (gradeBand === 'G6_8') {
    maxNum = difficulty <= 2 ? 20 : difficulty <= 4 ? 50 : 100;
    operations = difficulty <= 2 ? ['+', '-'] : ['+', '-', '×', '÷'];
  } else {
    maxNum = difficulty <= 2 ? 50 : difficulty <= 4 ? 100 : 200;
    operations = ['+', '-', '×', '÷'];
  }

  const op = operations[Math.floor(Math.random() * operations.length)];
  let a: number, b: number, correctAnswer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      correctAnswer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * a) + 1; // Ensure positive result
      correctAnswer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      correctAnswer = a * b;
      break;
    case '÷':
      b = Math.floor(Math.random() * 12) + 1;
      correctAnswer = Math.floor(Math.random() * 12) + 1;
      a = b * correctAnswer; // Ensure clean division
      break;
    default:
      a = 1;
      b = 1;
      correctAnswer = 2;
  }

  // Generate wrong options
  const options = generateMathOptions(correctAnswer, 4);

  return {
    expression: `${a} ${op} ${b}`,
    correctAnswer,
    options,
    skillCode,
  };
}

function generateMathOptions(correct: number, count: number): number[] {
  const options = new Set<number>([correct]);

  while (options.size < count) {
    // Generate plausible wrong answers
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = correct + offset;
    if (wrong !== correct && wrong >= 0) {
      options.add(wrong);
    }
  }

  // Shuffle options
  return [...options].sort(() => Math.random() - 0.5);
}

/**
 * Generate word puzzles appropriate for the learner's level
 */
function generateWordPuzzles(
  gradeBand: GradeBand,
  difficulty: number,
  count: number,
  skillCode: string
): WordPuzzle[] {
  // Word banks by grade band and difficulty
  const wordBanks: Record<GradeBand, Record<number, { word: string; hint: string }[]>> = {
    K5: {
      1: [
        { word: 'cat', hint: 'A furry pet that meows' },
        { word: 'dog', hint: 'A pet that barks' },
        { word: 'sun', hint: 'Bright and in the sky' },
        { word: 'run', hint: 'Move fast with legs' },
        { word: 'hat', hint: 'Wear it on your head' },
      ],
      2: [
        { word: 'happy', hint: 'Feeling joyful' },
        { word: 'water', hint: 'You drink it' },
        { word: 'house', hint: 'You live in it' },
        { word: 'friend', hint: 'Someone you play with' },
        { word: 'school', hint: 'Where you learn' },
      ],
      3: [
        { word: 'beautiful', hint: 'Very pretty' },
        { word: 'important', hint: 'Matters a lot' },
        { word: 'different', hint: 'Not the same' },
        { word: 'beginning', hint: 'The start' },
        { word: 'together', hint: 'With each other' },
      ],
      4: [
        { word: 'adventure', hint: 'An exciting journey' },
        { word: 'discover', hint: 'Find something new' },
        { word: 'creature', hint: 'A living thing' },
        { word: 'enormous', hint: 'Really big' },
        { word: 'celebrate', hint: 'Have a party' },
      ],
      5: [
        { word: 'extraordinary', hint: 'Beyond ordinary' },
        { word: 'mysterious', hint: 'Hard to explain' },
        { word: 'imagination', hint: 'Creating in your mind' },
        { word: 'approximately', hint: 'Close to' },
        { word: 'environment', hint: 'The world around us' },
      ],
    },
    G6_8: {
      1: [
        { word: 'analyze', hint: 'Study carefully' },
        { word: 'conclude', hint: 'Reach an end' },
        { word: 'evidence', hint: 'Proof or support' },
      ],
      2: [
        { word: 'hypothesis', hint: 'An educated guess' },
        { word: 'significant', hint: 'Important or meaningful' },
        { word: 'consequence', hint: 'Result of an action' },
      ],
      3: [
        { word: 'perspective', hint: 'Point of view' },
        { word: 'demonstrate', hint: 'Show or prove' },
        { word: 'circumstance', hint: 'Situation or condition' },
      ],
      4: [
        { word: 'controversial', hint: 'Causing disagreement' },
        { word: 'phenomenon', hint: 'Observable event' },
        { word: 'interpretation', hint: 'Explanation of meaning' },
      ],
      5: [
        { word: 'unprecedented', hint: 'Never done before' },
        { word: 'sophisticated', hint: 'Complex and refined' },
        { word: 'comprehensive', hint: 'Complete and thorough' },
      ],
    },
    G9_12: {
      1: [
        { word: 'ambiguous', hint: 'Having multiple meanings' },
        { word: 'eloquent', hint: 'Well-spoken' },
        { word: 'pragmatic', hint: 'Practical approach' },
      ],
      2: [
        { word: 'paradox', hint: 'Contradictory truth' },
        { word: 'rhetoric', hint: 'Art of persuasion' },
        { word: 'synthesis', hint: 'Combining elements' },
      ],
      3: [
        { word: 'dichotomy', hint: 'Division into two' },
        { word: 'ephemeral', hint: 'Short-lived' },
        { word: 'ubiquitous', hint: 'Found everywhere' },
      ],
      4: [
        { word: 'juxtaposition', hint: 'Placed side by side' },
        { word: 'paradigm', hint: 'A model or pattern' },
        { word: 'anachronism', hint: 'Out of time period' },
      ],
      5: [
        { word: 'existential', hint: 'Relating to existence' },
        { word: 'epistemology', hint: 'Study of knowledge' },
        { word: 'idiosyncratic', hint: 'Uniquely characteristic' },
      ],
    },
  };

  const bank = wordBanks[gradeBand]?.[difficulty] || wordBanks[gradeBand]?.[3] || [];
  const puzzles: WordPuzzle[] = [];

  // Shuffle and take count items
  const shuffled = [...bank].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const { word, hint } = shuffled[i];
    puzzles.push({
      word,
      scrambled: scrambleWord(word),
      hint,
      skillCode,
    });
  }

  return puzzles;
}

function scrambleWord(word: string): string {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Ensure it's actually scrambled
  if (letters.join('') === word) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters.join('');
}

/**
 * Generate quiz questions based on domain and level
 */
function generateQuizQuestions(
  domain: SkillDomain,
  gradeBand: GradeBand,
  difficulty: number,
  count: number,
  skillCode: string
): GameQuestion[] {
  // Question banks by domain
  const questionBanks: Record<SkillDomain, Record<GradeBand, { q: string; options: string[]; correct: number }[]>> = {
    MATH: {
      K5: [
        { q: 'What shape has 4 equal sides?', options: ['Circle', 'Square', 'Triangle', 'Rectangle'], correct: 1 },
        { q: 'What is half of 10?', options: ['2', '4', '5', '8'], correct: 2 },
        { q: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], correct: 1 },
      ],
      G6_8: [
        { q: 'What is 15% of 100?', options: ['10', '15', '20', '25'], correct: 1 },
        { q: 'Solve: 3x = 12', options: ['x = 2', 'x = 3', 'x = 4', 'x = 6'], correct: 2 },
        { q: 'What is the area of a 5x5 square?', options: ['10', '20', '25', '30'], correct: 2 },
      ],
      G9_12: [
        { q: 'What is the derivative of x²?', options: ['x', '2x', 'x²', '2'], correct: 1 },
        { q: 'Sin(90°) equals?', options: ['0', '0.5', '1', '-1'], correct: 2 },
        { q: 'What is log₁₀(100)?', options: ['1', '2', '10', '100'], correct: 1 },
      ],
    },
    ELA: {
      K5: [
        { q: 'Which word rhymes with "cat"?', options: ['Dog', 'Hat', 'Cup', 'Run'], correct: 1 },
        { q: 'What punctuation ends a question?', options: ['.', '!', '?', ','], correct: 2 },
        { q: 'Which is a noun?', options: ['Run', 'Happy', 'Apple', 'Quickly'], correct: 2 },
      ],
      G6_8: [
        { q: 'What is a metaphor?', options: ['A comparison using like/as', 'A direct comparison', 'An exaggeration', 'A sound word'], correct: 1 },
        { q: 'Which is the subject in "The dog ran fast"?', options: ['dog', 'ran', 'fast', 'The'], correct: 0 },
        { q: '"Their" vs "There" - which shows possession?', options: ['There', 'Their', 'They\'re', 'None'], correct: 1 },
      ],
      G9_12: [
        { q: 'What literary device is "the wind whispered"?', options: ['Simile', 'Metaphor', 'Personification', 'Alliteration'], correct: 2 },
        { q: 'What is the climax of a story?', options: ['The beginning', 'Rising action', 'Turning point', 'Resolution'], correct: 2 },
        { q: 'Which is an example of irony?', options: ['Exaggeration', 'Fire station burns down', 'Comparison', 'Repetition'], correct: 1 },
      ],
    },
    SCIENCE: {
      K5: [
        { q: 'What do plants need to grow?', options: ['Darkness', 'Sunlight', 'Ice', 'Rocks'], correct: 1 },
        { q: 'What is H2O?', options: ['Air', 'Water', 'Fire', 'Soil'], correct: 1 },
        { q: 'Which planet is closest to the Sun?', options: ['Earth', 'Mars', 'Mercury', 'Venus'], correct: 2 },
      ],
      G6_8: [
        { q: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Membrane'], correct: 1 },
        { q: 'What gas do plants release?', options: ['Carbon dioxide', 'Nitrogen', 'Oxygen', 'Hydrogen'], correct: 2 },
        { q: 'What causes tides?', options: ['Wind', 'Sun only', 'Moon\'s gravity', 'Earth\'s rotation'], correct: 2 },
      ],
      G9_12: [
        { q: 'What is Newton\'s 2nd law?', options: ['F=ma', 'E=mc²', 'PV=nRT', 'V=IR'], correct: 0 },
        { q: 'What bond shares electrons?', options: ['Ionic', 'Covalent', 'Metallic', 'Hydrogen'], correct: 1 },
        { q: 'What organelle makes proteins?', options: ['Golgi', 'Lysosome', 'Ribosome', 'Vacuole'], correct: 2 },
      ],
    },
    SPEECH: {
      K5: [
        { q: 'How should you start a presentation?', options: ['Yelling', 'Greeting', 'Whispering', 'Running'], correct: 1 },
        { q: 'What helps others understand you?', options: ['Speaking fast', 'Speaking clearly', 'Looking down', 'Mumbling'], correct: 1 },
        { q: 'Good eye contact means?', options: ['Staring at floor', 'Looking at people', 'Closing eyes', 'Looking away'], correct: 1 },
      ],
      G6_8: [
        { q: 'What is pace in speech?', options: ['Volume', 'Speed of speaking', 'Pitch', 'Accent'], correct: 1 },
        { q: 'How do you show you\'re listening?', options: ['Interrupt', 'Look at phone', 'Nod and respond', 'Walk away'], correct: 2 },
        { q: 'What is a thesis statement?', options: ['A question', 'Main argument', 'Conclusion', 'Introduction'], correct: 1 },
      ],
      G9_12: [
        { q: 'What is ethos in persuasion?', options: ['Emotion', 'Logic', 'Credibility', 'Style'], correct: 2 },
        { q: 'What is a rhetorical question?', options: ['Needs an answer', 'For effect only', 'Is rude', 'Is informal'], correct: 1 },
        { q: 'What is active listening?', options: ['Hearing only', 'Full engagement', 'Multitasking', 'Selective hearing'], correct: 1 },
      ],
    },
    SEL: {
      K5: [
        { q: 'What can you do when feeling angry?', options: ['Hit something', 'Take deep breaths', 'Yell', 'Ignore it'], correct: 1 },
        { q: 'How do you show kindness?', options: ['Sharing', 'Taking', 'Ignoring', 'Pushing'], correct: 0 },
        { q: 'What is empathy?', options: ['Being happy', 'Understanding feelings', 'Being angry', 'Being alone'], correct: 1 },
      ],
      G6_8: [
        { q: 'What is a healthy way to handle stress?', options: ['Avoid sleep', 'Exercise', 'Isolate', 'Overeat'], correct: 1 },
        { q: 'What is self-awareness?', options: ['Ignoring feelings', 'Knowing yourself', 'Being selfish', 'Avoiding others'], correct: 1 },
        { q: 'How can you resolve conflicts?', options: ['Fighting', 'Ignoring', 'Talking it out', 'Gossiping'], correct: 2 },
      ],
      G9_12: [
        { q: 'What is emotional regulation?', options: ['Suppressing emotions', 'Managing reactions', 'Avoiding feelings', 'Expressing anger'], correct: 1 },
        { q: 'What supports mental health?', options: ['Isolation', 'Social connection', 'Overworking', 'Perfectionism'], correct: 1 },
        { q: 'What is growth mindset?', options: ['Fixed abilities', 'Can improve', 'Natural talent only', 'Avoiding challenges'], correct: 1 },
      ],
    },
  };

  const questions = questionBanks[domain]?.[gradeBand] || [];
  const result: GameQuestion[] = [];

  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const q = shuffled[i];
    result.push({
      id: `q-${i}-${Date.now()}`,
      question: q.q,
      options: q.options,
      correctIndex: q.correct,
      skillCode,
    });
  }

  return result;
}

/**
 * Generate pattern puzzles
 */
function generatePatternPuzzles(
  gradeBand: GradeBand,
  difficulty: number,
  count: number,
  skillCode: string
): PatternPuzzle[] {
  const puzzles: PatternPuzzle[] = [];

  for (let i = 0; i < count; i++) {
    puzzles.push(generateSinglePattern(gradeBand, difficulty, skillCode));
  }

  return puzzles;
}

function generateSinglePattern(
  gradeBand: GradeBand,
  difficulty: number,
  skillCode: string
): PatternPuzzle {
  // Simple number patterns based on grade
  let start: number, step: number, length: number;

  if (gradeBand === 'K5') {
    start = Math.floor(Math.random() * 5) + 1;
    step = difficulty <= 2 ? 1 : difficulty <= 4 ? 2 : 5;
    length = 5;
  } else if (gradeBand === 'G6_8') {
    start = Math.floor(Math.random() * 10) + 1;
    step = difficulty <= 2 ? 3 : difficulty <= 4 ? 5 : 7;
    length = 6;
  } else {
    start = Math.floor(Math.random() * 20) + 1;
    step = difficulty <= 2 ? 4 : difficulty <= 4 ? 6 : 11;
    length = 6;
  }

  const sequence: number[] = [];
  for (let i = 0; i < length; i++) {
    sequence.push(start + i * step);
  }

  const missingIndex = Math.floor(Math.random() * (length - 2)) + 1; // Not first or last
  const correctAnswer = sequence[missingIndex];

  // Generate wrong options
  const options = [correctAnswer];
  while (options.length < 4) {
    const wrong = correctAnswer + (Math.floor(Math.random() * 10) - 5);
    if (!options.includes(wrong) && wrong > 0) {
      options.push(wrong);
    }
  }

  return {
    sequence: sequence.map((n, i) => (i === missingIndex ? '?' : n)),
    missingIndex,
    options: options.sort(() => Math.random() - 0.5),
    correctAnswer,
    skillCode,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Learning Break Game Generator
 *
 * Generates personalized learning-laced brain break games based on the learner's
 * Virtual Brain skill levels and recent learning activity.
 */
export class LearningBreakGenerator {
  /**
   * Generate a personalized learning break game for a learner
   */
  async generateLearningBreak(context: GenerationContext): Promise<LearningBreakGame> {
    const { gradeBand, skills, preferredDomain, maxDurationSeconds } = context;

    // Select target domain based on skills that need reinforcement
    const targetDomain = this.selectTargetDomain(skills, preferredDomain);

    // Calculate appropriate difficulty from skill levels
    const difficulty = this.calculateDifficulty(skills, targetDomain);

    // Select game template appropriate for grade band and domain
    const template = this.selectGameTemplate(gradeBand, targetDomain, maxDurationSeconds);

    // Get skill codes to target
    const targetSkillCodes = this.selectTargetSkills(skills, targetDomain);

    // Generate game-specific content
    const gameConfig = this.generateGameContent(
      template.gameType,
      targetDomain,
      gradeBand,
      difficulty,
      targetSkillCodes[0] || `${targetDomain}_GENERAL`
    );

    // Build the game
    const game: LearningBreakGame = {
      gameType: template.gameType,
      title: template.title,
      description: template.description,
      instructions: template.instructions,
      estimatedDurationSeconds: template.estimatedDurationSeconds,
      targetDomain,
      targetSkillCodes,
      difficulty,
      gameConfig,
      xpReward: Math.round(template.baseXpReward * (1 + difficulty * 0.1)),
      coinReward: Math.round(template.baseCoinReward * (1 + difficulty * 0.1)),
    };

    return game;
  }

  /**
   * Select domain to focus on based on skill levels
   * Prefers domains where learner has moderate mastery (reinforcement zone)
   */
  private selectTargetDomain(
    skills: LearnerSkillSnapshot[],
    preferredDomain?: SkillDomain
  ): SkillDomain {
    if (preferredDomain) {
      return preferredDomain;
    }

    // Group skills by domain
    const domainScores: Record<SkillDomain, { total: number; count: number }> = {
      ELA: { total: 0, count: 0 },
      MATH: { total: 0, count: 0 },
      SCIENCE: { total: 0, count: 0 },
      SPEECH: { total: 0, count: 0 },
      SEL: { total: 0, count: 0 },
    };

    for (const skill of skills) {
      if (domainScores[skill.domain]) {
        domainScores[skill.domain].total += skill.masteryLevel;
        domainScores[skill.domain].count++;
      }
    }

    // Find domain with mastery in "reinforcement zone" (3-7 range)
    // This is where practice is most beneficial
    let bestDomain: SkillDomain = 'MATH';
    let bestScore = -1;

    for (const [domain, scores] of Object.entries(domainScores)) {
      if (scores.count === 0) continue;

      const avgMastery = scores.total / scores.count;
      // Score based on how close to the ideal reinforcement range (4-6)
      const reinforcementScore = 10 - Math.abs(avgMastery - 5);

      if (reinforcementScore > bestScore) {
        bestScore = reinforcementScore;
        bestDomain = domain as SkillDomain;
      }
    }

    return bestDomain;
  }

  /**
   * Calculate appropriate difficulty (1-5) from skill levels
   */
  private calculateDifficulty(
    skills: LearnerSkillSnapshot[],
    targetDomain: SkillDomain
  ): 1 | 2 | 3 | 4 | 5 {
    const domainSkills = skills.filter((s) => s.domain === targetDomain);

    if (domainSkills.length === 0) {
      return 3; // Default to medium
    }

    const avgMastery =
      domainSkills.reduce((sum, s) => sum + s.masteryLevel, 0) / domainSkills.length;

    // Map 0-10 mastery to 1-5 difficulty
    // Slightly easier than mastery to ensure success and fun
    const difficulty = Math.max(1, Math.min(5, Math.round(avgMastery / 2.5)));

    return difficulty as 1 | 2 | 3 | 4 | 5;
  }

  /**
   * Select appropriate game template
   */
  private selectGameTemplate(
    gradeBand: GradeBand,
    targetDomain: SkillDomain,
    maxDuration?: number
  ): GameTemplate {
    const eligible = GAME_TEMPLATES.filter(
      (t) =>
        t.gradeBands.includes(gradeBand) &&
        t.domains.includes(targetDomain) &&
        (!maxDuration || t.estimatedDurationSeconds <= maxDuration)
    );

    if (eligible.length === 0) {
      // Fallback to Quick Quiz which works for all domains
      return GAME_TEMPLATES.find((t) => t.gameType === 'QUICK_QUIZ')!;
    }

    // Random selection from eligible templates
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  /**
   * Select skill codes to target
   */
  private selectTargetSkills(
    skills: LearnerSkillSnapshot[],
    targetDomain: SkillDomain
  ): string[] {
    const domainSkills = skills
      .filter((s) => s.domain === targetDomain)
      .sort((a, b) => a.masteryLevel - b.masteryLevel); // Lower mastery first

    // Take up to 3 skills that need reinforcement
    return domainSkills.slice(0, 3).map((s) => s.skillCode);
  }

  /**
   * Generate game-specific content
   */
  private generateGameContent(
    gameType: LearningGameType,
    domain: SkillDomain,
    gradeBand: GradeBand,
    difficulty: number,
    skillCode: string
  ): LearningGameConfig {
    const questionCount = 8;

    switch (gameType) {
      case 'MATH_BUBBLE_POP':
      case 'NUMBER_NINJA':
        return {
          timeLimit: 60,
          questionCount,
          mathProblems: generateMathProblems(gradeBand, difficulty, questionCount, skillCode),
        };

      case 'WORD_SCRAMBLE':
      case 'SPELLING_BEE':
        return {
          timeLimit: 90,
          questionCount: 6,
          words: generateWordPuzzles(gradeBand, difficulty, 6, skillCode),
        };

      case 'QUICK_QUIZ':
      case 'FACT_OR_FICTION':
        return {
          timeLimit: 60,
          questionCount,
          questions: generateQuizQuestions(domain, gradeBand, difficulty, questionCount, skillCode),
        };

      case 'PATTERN_POWER':
        return {
          timeLimit: 90,
          questionCount: 6,
          patterns: generatePatternPuzzles(gradeBand, difficulty, 6, skillCode),
        };

      default:
        return {
          timeLimit: 60,
          questionCount: 5,
        };
    }
  }
}

// Export singleton
export const learningBreakGenerator = new LearningBreakGenerator();
