/**
 * Curated Math Questions
 *
 * Validated, educationally-reviewed math questions organized by grade band and skill.
 * These serve as reliable fallback when AI generation is unavailable.
 *
 * @module curated-questions/math
 */

import type { GeneratedQuestion } from '../../types/questions.types.js';

/**
 * Grade K-5 Math Questions
 */
export const MATH_K5: GeneratedQuestion[] = [
  // ── Number Sense ──
  {
    id: 'math-k5-ns-001',
    skillCode: 'MATH_NUMBER_SENSE',
    type: 'multiple-choice',
    stem: 'What number comes after 7?',
    options: [
      { id: 'A', text: '6', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: '8', isCorrect: true },
      { id: 'C', text: '9', isCorrect: false, distractorType: 'careless-error' },
      { id: 'D', text: '5', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'B',
    explanation:
      'When counting forward, the number after 7 is 8. We count: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.',
    standardsAlignment: ['CCSS.MATH.K.CC.A.1'],
    difficulty: 0.2,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 1,
      wordCount: 5,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'math-k5-ns-002',
    skillCode: 'MATH_NUMBER_SENSE',
    type: 'multiple-choice',
    stem: 'Which group has more objects?',
    instructions: 'Look at both groups carefully.',
    visuals: [
      {
        type: 'image',
        altText: 'Group A shows 4 apples. Group B shows 7 apples.',
        position: 'before-stem',
      },
    ],
    options: [
      { id: 'A', text: 'Group A (4 apples)', isCorrect: false },
      { id: 'B', text: 'Group B (7 apples)', isCorrect: true },
      {
        id: 'C',
        text: 'They are the same',
        isCorrect: false,
        distractorType: 'common-misconception',
      },
      { id: 'D', text: 'Cannot tell', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Group B has 7 apples, which is more than Group A with 4 apples. 7 > 4.',
    standardsAlignment: ['CCSS.MATH.K.CC.C.6'],
    difficulty: 0.25,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 6,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Operations ──
  {
    id: 'math-k5-op-001',
    skillCode: 'MATH_OPERATIONS',
    type: 'multiple-choice',
    stem: 'What is 5 + 3?',
    options: [
      { id: 'A', text: '7', isCorrect: false, distractorType: 'careless-error' },
      { id: 'B', text: '8', isCorrect: true },
      { id: 'C', text: '9', isCorrect: false, distractorType: 'careless-error' },
      { id: 'D', text: '2', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: 'When we add 5 + 3, we start at 5 and count 3 more: 6, 7, 8. So 5 + 3 = 8.',
    standardsAlignment: ['CCSS.MATH.1.OA.C.6'],
    difficulty: 0.25,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 1,
      wordCount: 4,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'math-k5-op-002',
    skillCode: 'MATH_OPERATIONS',
    type: 'multiple-choice',
    stem: 'There are 12 birds on a tree. 4 birds fly away. How many birds are left on the tree?',
    options: [
      { id: 'A', text: '16', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: '8', isCorrect: true },
      { id: 'C', text: '4', isCorrect: false },
      { id: 'D', text: '6', isCorrect: false, distractorType: 'careless-error' },
    ],
    correctAnswer: 'B',
    explanation:
      'This is a subtraction problem. We start with 12 birds and take away 4: 12 - 4 = 8 birds left.',
    standardsAlignment: ['CCSS.MATH.2.OA.A.1'],
    difficulty: 0.35,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 18,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fractions ──
  {
    id: 'math-k5-fr-001',
    skillCode: 'MATH_FRACTIONS',
    type: 'multiple-choice',
    stem: 'A pizza is cut into 4 equal slices. You eat 1 slice. What fraction of the pizza did you eat?',
    options: [
      { id: 'A', text: '1/2', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: '1/4', isCorrect: true },
      { id: 'C', text: '1/3', isCorrect: false },
      { id: 'D', text: '4/1', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'B',
    explanation:
      'The pizza has 4 equal parts and you ate 1 part. A fraction shows part over whole: 1/4.',
    standardsAlignment: ['CCSS.MATH.3.NF.A.1'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 20,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Geometry ──
  {
    id: 'math-k5-ge-001',
    skillCode: 'MATH_GEOMETRY',
    type: 'multiple-choice',
    stem: 'How many sides does a triangle have?',
    options: [
      { id: 'A', text: '2', isCorrect: false },
      { id: 'B', text: '3', isCorrect: true },
      { id: 'C', text: '4', isCorrect: false },
      { id: 'D', text: '5', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'A triangle is a shape with 3 sides. The prefix "tri-" means three.',
    standardsAlignment: ['CCSS.MATH.K.G.B.4'],
    difficulty: 0.2,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 7,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  // ── Problem Solving ──
  {
    id: 'math-k5-ps-001',
    skillCode: 'MATH_PROBLEM_SOLVING',
    type: 'multiple-choice',
    stem: 'Emma has 3 red crayons and 4 blue crayons. How many crayons does she have in all?',
    options: [
      { id: 'A', text: '1', isCorrect: false },
      { id: 'B', text: '6', isCorrect: false, distractorType: 'careless-error' },
      { id: 'C', text: '7', isCorrect: true },
      { id: 'D', text: '12', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'C',
    explanation: 'To find the total, we add both groups: 3 red + 4 blue = 7 crayons altogether.',
    standardsAlignment: ['CCSS.MATH.1.OA.A.1'],
    difficulty: 0.3,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 16,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 6-8 Math Questions
 */
export const MATH_G6_8: GeneratedQuestion[] = [
  // ── Number Sense ──
  {
    id: 'math-g68-ns-001',
    skillCode: 'MATH_NUMBER_SENSE',
    type: 'multiple-choice',
    stem: 'Which of the following is equivalent to 0.75?',
    options: [
      { id: 'A', text: '75/10', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'B', text: '3/4', isCorrect: true },
      { id: 'C', text: '7/5', isCorrect: false },
      { id: 'D', text: '75%', isCorrect: false, distractorType: 'careless-error' },
    ],
    correctAnswer: 'B',
    explanation:
      '0.75 = 75/100 = 3/4 when simplified. Both represent the same value: three-fourths.',
    standardsAlignment: ['CCSS.MATH.6.NS.C.6'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 5,
      wordCount: 8,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Operations (Integers) ──
  {
    id: 'math-g68-op-001',
    skillCode: 'MATH_OPERATIONS',
    type: 'multiple-choice',
    stem: 'What is -8 + 5?',
    options: [
      { id: 'A', text: '-13', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: '-3', isCorrect: true },
      { id: 'C', text: '3', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: '13', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      'When adding a negative and positive number, find the difference and keep the sign of the larger absolute value: |-8| - |5| = 3, and since 8 > 5, the answer is -3.',
    standardsAlignment: ['CCSS.MATH.7.NS.A.1'],
    difficulty: 0.5,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 4,
      wordCount: 5,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Algebraic Expressions ──
  {
    id: 'math-g68-fr-001',
    skillCode: 'MATH_FRACTIONS',
    type: 'multiple-choice',
    stem: 'Simplify the expression: 3x + 2x - 5',
    options: [
      { id: 'A', text: '5x - 5', isCorrect: true },
      { id: 'B', text: '6x - 5', isCorrect: false, distractorType: 'careless-error' },
      { id: 'C', text: '0', isCorrect: false },
      { id: 'D', text: '5x + 5', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'A',
    explanation:
      'Combine like terms: 3x + 2x = 5x. The constant -5 stays the same. Result: 5x - 5.',
    standardsAlignment: ['CCSS.MATH.6.EE.A.3'],
    difficulty: 0.5,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 6,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Geometry ──
  {
    id: 'math-g68-ge-001',
    skillCode: 'MATH_GEOMETRY',
    type: 'multiple-choice',
    stem: 'What is the area of a rectangle with length 8 cm and width 5 cm?',
    options: [
      { id: 'A', text: '13 cm²', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: '26 cm²', isCorrect: false },
      { id: 'C', text: '40 cm²', isCorrect: true },
      { id: 'D', text: '80 cm²', isCorrect: false, distractorType: 'careless-error' },
    ],
    correctAnswer: 'C',
    explanation:
      'Area of a rectangle = length × width = 8 cm × 5 cm = 40 cm². Note: 13 cm would be the perimeter formula mistake (half of 26).',
    standardsAlignment: ['CCSS.MATH.6.G.A.1'],
    difficulty: 0.4,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 5,
      wordCount: 14,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Problem Solving ──
  {
    id: 'math-g68-ps-001',
    skillCode: 'MATH_PROBLEM_SOLVING',
    type: 'multiple-choice',
    stem: 'A store has a 20% off sale. If a jacket originally costs $50, what is the sale price?',
    options: [
      { id: 'A', text: '$10', isCorrect: false },
      { id: 'B', text: '$30', isCorrect: false },
      { id: 'C', text: '$40', isCorrect: true },
      { id: 'D', text: '$60', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'C',
    explanation: '20% of $50 = 0.20 × $50 = $10 discount. Sale price = $50 - $10 = $40.',
    standardsAlignment: ['CCSS.MATH.7.RP.A.3'],
    difficulty: 0.55,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 20,
      estimatedTimeSeconds: 40,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 9-12 Math Questions
 */
export const MATH_G9_12: GeneratedQuestion[] = [
  // ── Number Sense (Scientific Notation) ──
  {
    id: 'math-g912-ns-001',
    skillCode: 'MATH_NUMBER_SENSE',
    type: 'multiple-choice',
    stem: 'Express 0.00045 in scientific notation.',
    options: [
      { id: 'A', text: '4.5 × 10⁻⁴', isCorrect: true },
      { id: 'B', text: '45 × 10⁻⁵', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'C', text: '4.5 × 10⁴', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: '0.45 × 10⁻³', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation:
      'Move the decimal 4 places right to get 4.5. Since we moved right from a number less than 1, the exponent is negative: 4.5 × 10⁻⁴.',
    standardsAlignment: ['CCSS.MATH.8.EE.A.3'],
    difficulty: 0.55,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 8,
      wordCount: 5,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Operations (Quadratics) ──
  {
    id: 'math-g912-op-001',
    skillCode: 'MATH_OPERATIONS',
    type: 'multiple-choice',
    stem: 'Solve for x: x² - 5x + 6 = 0',
    options: [
      { id: 'A', text: 'x = 2 or x = 3', isCorrect: true },
      {
        id: 'B',
        text: 'x = -2 or x = -3',
        isCorrect: false,
        distractorType: 'common-misconception',
      },
      { id: 'C', text: 'x = 1 or x = 6', isCorrect: false },
      { id: 'D', text: 'x = 5', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'A',
    explanation:
      'Factor: (x - 2)(x - 3) = 0. Set each factor to zero: x - 2 = 0 gives x = 2, and x - 3 = 0 gives x = 3.',
    standardsAlignment: ['CCSS.MATH.HSA.REI.B.4'],
    difficulty: 0.6,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 7,
      estimatedTimeSeconds: 60,
      contentRiskLevel: 'safe',
    },
  },
  // ── Functions ──
  {
    id: 'math-g912-fr-001',
    skillCode: 'MATH_FRACTIONS',
    type: 'multiple-choice',
    stem: 'If f(x) = 2x + 3, what is f(4)?',
    options: [
      { id: 'A', text: '8', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'B', text: '11', isCorrect: true },
      { id: 'C', text: '14', isCorrect: false, distractorType: 'careless-error' },
      { id: 'D', text: '7', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Substitute x = 4 into the function: f(4) = 2(4) + 3 = 8 + 3 = 11.',
    standardsAlignment: ['CCSS.MATH.HSF.IF.A.2'],
    difficulty: 0.45,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 8,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Geometry (Pythagorean) ──
  {
    id: 'math-g912-ge-001',
    skillCode: 'MATH_GEOMETRY',
    type: 'multiple-choice',
    stem: 'In a right triangle, if one leg is 3 units and the other leg is 4 units, what is the length of the hypotenuse?',
    options: [
      { id: 'A', text: '5 units', isCorrect: true },
      { id: 'B', text: '7 units', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'C', text: '12 units', isCorrect: false },
      { id: 'D', text: '25 units', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'A',
    explanation:
      'Using the Pythagorean theorem: a² + b² = c². So 3² + 4² = 9 + 16 = 25. The hypotenuse c = √25 = 5 units.',
    standardsAlignment: ['CCSS.MATH.8.G.B.7'],
    difficulty: 0.5,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 24,
      estimatedTimeSeconds: 45,
      contentRiskLevel: 'safe',
    },
  },
  // ── Problem Solving ──
  {
    id: 'math-g912-ps-001',
    skillCode: 'MATH_PROBLEM_SOLVING',
    type: 'multiple-choice',
    stem: 'A car travels 60 miles per hour for 2.5 hours. How far does it travel?',
    options: [
      { id: 'A', text: '120 miles', isCorrect: false },
      { id: 'B', text: '150 miles', isCorrect: true },
      { id: 'C', text: '62.5 miles', isCorrect: false },
      { id: 'D', text: '24 miles', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Distance = Rate × Time = 60 mph × 2.5 hours = 150 miles.',
    standardsAlignment: ['CCSS.MATH.7.RP.A.1'],
    difficulty: 0.4,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 15,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Get all math questions by grade band
 */
export function getMathQuestions(gradeBand: 'K5' | 'G6_8' | 'G9_12'): GeneratedQuestion[] {
  switch (gradeBand) {
    case 'K5':
      return MATH_K5;
    case 'G6_8':
      return MATH_G6_8;
    case 'G9_12':
      return MATH_G9_12;
    default:
      return MATH_G6_8;
  }
}

/**
 * Get math questions by skill code
 */
export function getMathQuestionsBySkill(
  gradeBand: 'K5' | 'G6_8' | 'G9_12',
  skillCode: string
): GeneratedQuestion[] {
  return getMathQuestions(gradeBand).filter((q) => q.skillCode === skillCode);
}
