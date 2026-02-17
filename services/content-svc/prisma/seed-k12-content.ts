/**
 * K-12 Content LearningObject Seed Data
 *
 * Creates LearningObject + LearningObjectVersion records across
 * ALL grade bands (K-2, 3-5, 6-8, 9-12) and ALL subjects.
 * These LOs are designed to pair with curriculum-svc lessons via
 * LessonContentLink.
 *
 * Subject mapping:
 *   ELA          → LearningObjectSubject.ELA
 *   MATH         → LearningObjectSubject.MATH
 *   SCIENCE      → LearningObjectSubject.SCIENCE
 *   SEL          → LearningObjectSubject.SEL
 *   Other (SS, Arts, Tech, WL, PE, CTE) → LearningObjectSubject.OTHER
 *
 * Usage:
 *   npx tsx prisma/seed-k12-content.ts
 */

import {
  PrismaClient,
  LearningObjectSubject,
  LearningObjectGradeBand,
  LearningObjectVersionState,
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AUTHOR_USER_ID = '00000000-0000-0000-1000-000000000002';

// ─── ID generators (range 5xxxx to avoid collisions with other seeds) ────────

let loCounter = 0;
function nextLoId(): string {
  loCounter++;
  return `50000000-0000-0000-5000-${String(loCounter).padStart(12, '0')}`;
}

// ─── Content block helpers ───────────────────────────────────────────────────

function heading(level: number, content: string) {
  return { type: 'heading', level, content };
}
function p(content: string) {
  return { type: 'paragraph', content };
}
function list(items: string[]) {
  return { type: 'list', items };
}
function definition(term: string, def: string) {
  return { type: 'definition', term, definition: def };
}
function interactive(subtype: string, config: Record<string, unknown> = {}) {
  return { type: 'interactive', subtype, config };
}
function practice(problems: string[]) {
  return { type: 'practice', problems };
}
function example(expression: string) {
  return { type: 'example', expression };
}

// ─── LO definition type ─────────────────────────────────────────────────────

interface LODef {
  slug: string;
  title: string;
  subject: LearningObjectSubject;
  gradeBand: LearningObjectGradeBand;
  tags: string[];
  content: {
    blocks: Record<string, unknown>[];
    estimatedMinutes: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// K-2 LEARNING OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

const K2_LOS: LODef[] = [
  // ELA K-2
  {
    slug: 'k2-phonics-letter-sounds',
    title: 'Letter Sounds & Phonics',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['phonics', 'letters', 'reading', 'beginner'],
    content: {
      blocks: [
        heading(1, 'Let\'s Learn Letter Sounds!'),
        p('Every letter makes a special sound. Let\'s practice hearing and saying them!'),
        interactive('letter-sound-match', { letters: 'abcdefghijklmnopqrstuvwxyz' }),
        p('When we put letter sounds together, we can read words!'),
        practice(['c-a-t', 's-u-n', 'd-o-g', 'r-u-n']),
      ],
      estimatedMinutes: 10,
      difficulty: 'beginner',
    },
  },
  {
    slug: 'k2-sight-words-set-1',
    title: 'Sight Words Set 1',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['sight-words', 'reading', 'fluency'],
    content: {
      blocks: [
        heading(1, 'Sight Words You Should Know'),
        p('Sight words are words we see a lot. Let\'s practice reading them quickly!'),
        list(['the', 'and', 'is', 'it', 'to', 'in', 'he', 'she', 'was', 'for']),
        interactive('sight-word-flashcards', { words: ['the', 'and', 'is', 'it', 'to'] }),
      ],
      estimatedMinutes: 10,
      difficulty: 'beginner',
    },
  },
  {
    slug: 'k2-reading-fluency-practice',
    title: 'Reading Fluency Practice',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['fluency', 'reading', 'practice'],
    content: {
      blocks: [
        heading(1, 'Let\'s Read Smoothly!'),
        p('Good readers read smoothly, not too fast and not too slow. Let\'s practice!'),
        interactive('read-aloud-passage', { passage: 'The cat sat on a mat. The dog ran to the park. They played all day.' }),
        p('Try to read with expression, like you\'re telling a story!'),
      ],
      estimatedMinutes: 10,
      difficulty: 'beginner',
    },
  },
  // Math K-2
  {
    slug: 'k2-counting-to-100',
    title: 'Counting to 100',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['counting', 'numbers', 'beginner'],
    content: {
      blocks: [
        heading(1, 'Counting to 100'),
        p('Let\'s count all the way to 100! We can count by 1s, 2s, 5s, and 10s.'),
        interactive('number-line', { max: 100, skipCount: [1, 2, 5, 10] }),
        practice(['Count by 2s to 20', 'Count by 5s to 50', 'Count by 10s to 100']),
      ],
      estimatedMinutes: 10,
      difficulty: 'beginner',
    },
  },
  {
    slug: 'k2-addition-within-20',
    title: 'Addition Within 20',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['addition', 'basic-operations', 'numbers'],
    content: {
      blocks: [
        heading(1, 'Adding Numbers'),
        p('When we add, we put groups together to find the total.'),
        example('3 + 4 = 7'),
        interactive('ten-frame', { max: 20 }),
        practice(['2 + 3 = ?', '5 + 4 = ?', '7 + 6 = ?', '8 + 5 = ?']),
      ],
      estimatedMinutes: 12,
      difficulty: 'beginner',
    },
  },
  {
    slug: 'k2-shapes-and-geometry',
    title: '2D and 3D Shapes',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['geometry', 'shapes', 'visual'],
    content: {
      blocks: [
        heading(1, 'Shapes Are Everywhere!'),
        p('Look around you — shapes are everywhere! Let\'s learn their names.'),
        definition('Circle', 'A round shape with no corners'),
        definition('Square', 'A shape with 4 equal sides and 4 corners'),
        definition('Triangle', 'A shape with 3 sides and 3 corners'),
        interactive('shape-sorter', { shapes: ['circle', 'square', 'triangle', 'rectangle', 'hexagon'] }),
      ],
      estimatedMinutes: 10,
      difficulty: 'beginner',
    },
  },
  // Science K-2
  {
    slug: 'k2-living-things',
    title: 'Living vs Non-Living Things',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['life-science', 'living', 'classification'],
    content: {
      blocks: [
        heading(1, 'Is It Alive?'),
        p('All living things grow, need food and water, and can make more of themselves.'),
        list(['Living things grow', 'Living things need food and water', 'Living things reproduce']),
        interactive('sort-living-nonliving', { items: ['dog', 'rock', 'flower', 'car', 'fish', 'toy'] }),
      ],
      estimatedMinutes: 12,
      difficulty: 'beginner',
    },
  },
  {
    slug: 'k2-weather-and-seasons',
    title: 'Weather and Seasons',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['earth-science', 'weather', 'seasons'],
    content: {
      blocks: [
        heading(1, 'What\'s the Weather Like Today?'),
        p('Weather changes every day. The seasons bring different kinds of weather.'),
        definition('Spring', 'Warmer temperatures, flowers bloom, rain showers'),
        definition('Summer', 'Hot days, lots of sunshine, long days'),
        definition('Fall', 'Leaves change colors, cooler temperatures'),
        definition('Winter', 'Cold temperatures, snow in some places'),
        interactive('weather-tracker', { days: 7 }),
      ],
      estimatedMinutes: 12,
      difficulty: 'beginner',
    },
  },
  // SEL K-2
  {
    slug: 'k2-identifying-feelings',
    title: 'Identifying My Feelings',
    subject: LearningObjectSubject.SEL,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['emotions', 'self-awareness', 'sel'],
    content: {
      blocks: [
        heading(1, 'How Am I Feeling?'),
        p('Everyone has feelings! It\'s okay to feel happy, sad, angry, or scared. Let\'s learn to name our feelings.'),
        interactive('emotion-wheel', { emotions: ['happy', 'sad', 'angry', 'scared', 'surprised', 'calm'] }),
        p('When you can name how you feel, it\'s easier to ask for help.'),
      ],
      estimatedMinutes: 10,
      difficulty: 'beginner',
    },
  },
  // Social Studies K-2 (mapped to OTHER)
  {
    slug: 'k2-my-community',
    title: 'My Community',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.K_2,
    tags: ['social-studies', 'community', 'civics'],
    content: {
      blocks: [
        heading(1, 'My Community'),
        p('A community is a place where people live, work, and play together.'),
        list(['Schools', 'Libraries', 'Fire stations', 'Parks', 'Hospitals']),
        p('Community helpers like teachers, firefighters, and doctors keep our community safe and running.'),
        interactive('community-builder', { places: ['school', 'library', 'park', 'fire-station', 'hospital'] }),
      ],
      estimatedMinutes: 12,
      difficulty: 'beginner',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3-5 LEARNING OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

const G35_LOS: LODef[] = [
  // ELA 3-5
  {
    slug: 'g35-story-elements',
    title: 'Story Elements: Character, Setting, Plot',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['reading', 'comprehension', 'story-elements'],
    content: {
      blocks: [
        heading(1, 'Understanding Story Elements'),
        definition('Characters', 'The people or animals in a story'),
        definition('Setting', 'Where and when a story takes place'),
        definition('Plot', 'What happens in a story — beginning, middle, and end'),
        p('Every story has characters, a setting, and a plot. Let\'s practice finding them!'),
        interactive('story-map', { fields: ['characters', 'setting', 'beginning', 'middle', 'end'] }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g35-informational-text',
    title: 'Reading Informational Text',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['reading', 'nonfiction', 'text-features'],
    content: {
      blocks: [
        heading(1, 'How to Read Informational Text'),
        p('Informational texts teach us facts. They use special features to organize information.'),
        list(['Headings tell you what each section is about', 'Captions explain pictures', 'Glossaries define important words', 'Bold words are key vocabulary']),
        practice(['Find the main idea of a paragraph', 'Identify 3 text features in an article']),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g35-writing-workshop-opinion',
    title: 'Opinion Writing',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['writing', 'opinion', 'persuasive'],
    content: {
      blocks: [
        heading(1, 'Writing Your Opinion'),
        p('An opinion essay tells what you think and gives reasons why.'),
        list(['1. State your opinion clearly', '2. Give at least 3 reasons', '3. Use linking words (because, also, for example)', '4. Write a strong conclusion']),
        interactive('opinion-organizer', { fields: ['opinion', 'reason1', 'reason2', 'reason3', 'conclusion'] }),
      ],
      estimatedMinutes: 25,
      difficulty: 'intermediate',
    },
  },
  // Math 3-5
  {
    slug: 'g35-multiplication-facts',
    title: 'Multiplication Facts to 12',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['multiplication', 'facts', 'fluency'],
    content: {
      blocks: [
        heading(1, 'Mastering Multiplication'),
        p('Multiplication is a fast way to add equal groups. Let\'s practice!'),
        example('4 × 3 = 12  (four groups of three)'),
        interactive('times-table-drill', { maxFactor: 12, timeLimit: 60 }),
        practice(['6 × 7 = ?', '8 × 4 = ?', '9 × 6 = ?', '12 × 3 = ?']),
      ],
      estimatedMinutes: 15,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g35-fractions-intro',
    title: 'Introduction to Fractions',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['fractions', 'numbers', 'beginner'],
    content: {
      blocks: [
        heading(1, 'Understanding Fractions'),
        p('A fraction shows a part of a whole. The top number is the numerator, and the bottom number is the denominator.'),
        interactive('fraction-visualizer', { defaultNumerator: 1, defaultDenominator: 4 }),
        practice(['What fraction is shaded: 2 out of 5 parts?', 'Is 1/2 greater or less than 1/4?']),
      ],
      estimatedMinutes: 15,
      difficulty: 'beginner',
    },
  },
  {
    slug: 'g35-geometry-area-perimeter',
    title: 'Area and Perimeter',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['geometry', 'area', 'perimeter', 'measurement'],
    content: {
      blocks: [
        heading(1, 'Area and Perimeter'),
        definition('Perimeter', 'The distance around a shape — add all the sides'),
        definition('Area', 'The space inside a shape — multiply length × width for rectangles'),
        example('A rectangle 5 cm by 3 cm: Perimeter = 16 cm, Area = 15 sq cm'),
        practice(['Find the perimeter of a square with sides of 4 cm', 'Find the area of a rectangle 6 m by 2 m']),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  // Science 3-5
  {
    slug: 'g35-ecosystems',
    title: 'Ecosystems & Food Chains',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['ecosystems', 'food-chain', 'life-science'],
    content: {
      blocks: [
        heading(1, 'Ecosystems & Food Chains'),
        p('An ecosystem includes all the living and non-living things in an area. Food chains show how energy flows.'),
        definition('Producer', 'An organism that makes its own food (plants)'),
        definition('Consumer', 'An organism that eats other organisms'),
        definition('Decomposer', 'An organism that breaks down dead material'),
        interactive('food-chain-builder', { organisms: ['sun', 'grass', 'rabbit', 'fox', 'mushroom'] }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g35-matter-states',
    title: 'States of Matter',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['physical-science', 'matter', 'states'],
    content: {
      blocks: [
        heading(1, 'Solids, Liquids, and Gases'),
        definition('Solid', 'Has a definite shape and volume — molecules tightly packed'),
        definition('Liquid', 'Has a definite volume but takes the shape of its container'),
        definition('Gas', 'Fills its entire container — molecules far apart and moving fast'),
        interactive('matter-sorter', { items: ['ice', 'water', 'steam', 'rock', 'juice', 'air'] }),
      ],
      estimatedMinutes: 15,
      difficulty: 'intermediate',
    },
  },
  // Social Studies 3-5 (OTHER)
  {
    slug: 'g35-us-history-overview',
    title: 'US History: From Colonies to Nation',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['social-studies', 'us-history', 'colonies'],
    content: {
      blocks: [
        heading(1, 'How the United States Began'),
        p('Long ago, people from Europe came to North America and built colonies. Over time, these colonies became the United States.'),
        list(['13 original colonies', 'Declaration of Independence in 1776', 'George Washington was the first President']),
        interactive('timeline', { events: ['1607 Jamestown', '1620 Plymouth', '1776 Independence', '1789 Constitution'] }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  // SEL 3-5
  {
    slug: 'g35-growth-mindset',
    title: 'Growth Mindset',
    subject: LearningObjectSubject.SEL,
    gradeBand: LearningObjectGradeBand.G3_5,
    tags: ['sel', 'growth-mindset', 'resilience'],
    content: {
      blocks: [
        heading(1, 'Your Brain Can Grow!'),
        p('A growth mindset means believing you can get smarter with effort and practice.'),
        list(['Instead of "I can\'t do this," say "I can\'t do this YET"', 'Mistakes help your brain grow', 'Effort is more important than being perfect']),
        interactive('mindset-checker', { scenarios: ['hard math problem', 'new sport', 'spelling test'] }),
      ],
      estimatedMinutes: 12,
      difficulty: 'beginner',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 6-8 LEARNING OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

const G68_LOS: LODef[] = [
  // ELA 6-8
  {
    slug: 'g68-literary-analysis',
    title: 'Literary Analysis: Theme & Evidence',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['reading', 'literary-analysis', 'theme'],
    content: {
      blocks: [
        heading(1, 'Analyzing Literature'),
        p('Literary analysis means examining how an author creates meaning through character, setting, conflict, and theme.'),
        definition('Theme', 'The underlying message or lesson in a story'),
        list(['Identify the conflict', 'Track how characters change', 'Look for recurring symbols or motifs', 'State the theme in a complete sentence']),
        practice(['What is the theme of a story where a character overcomes fear?']),
      ],
      estimatedMinutes: 25,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g68-argumentative-writing',
    title: 'Argumentative Writing',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['writing', 'argument', 'evidence'],
    content: {
      blocks: [
        heading(1, 'Writing a Strong Argument'),
        p('An argumentative essay takes a position and supports it with evidence.'),
        list(['1. Hook your reader', '2. State your claim clearly', '3. Provide at least 3 pieces of evidence', '4. Address the counterargument', '5. Conclude by restating your position']),
        interactive('argument-organizer', { sections: ['claim', 'evidence1', 'evidence2', 'evidence3', 'counterargument', 'conclusion'] }),
      ],
      estimatedMinutes: 30,
      difficulty: 'intermediate',
    },
  },
  // Math 6-8
  {
    slug: 'g68-ratios-proportions',
    title: 'Ratios & Proportional Relationships',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['ratios', 'proportions', 'rates'],
    content: {
      blocks: [
        heading(1, 'Understanding Ratios & Proportions'),
        definition('Ratio', 'A comparison of two quantities — e.g., 3:4'),
        definition('Proportion', 'An equation stating two ratios are equal — e.g., 3/4 = 6/8'),
        example('If 3 apples cost $6, how much do 9 apples cost? → $18'),
        practice(['Solve: 4/5 = x/20', 'A map scale is 1 cm : 50 km. Two cities are 3.5 cm apart. How far?']),
      ],
      estimatedMinutes: 25,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g68-expressions-equations',
    title: 'Algebraic Expressions & Equations',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['algebra', 'equations', 'expressions'],
    content: {
      blocks: [
        heading(1, 'Expressions & Equations'),
        definition('Expression', 'A math phrase with numbers, variables, and operations — e.g., 2x + 3'),
        definition('Equation', 'A statement that two expressions are equal — e.g., 2x + 3 = 11'),
        p('To solve an equation, isolate the variable by doing the same thing to both sides.'),
        example('2x + 3 = 11 → 2x = 8 → x = 4'),
        practice(['Solve: 3x - 7 = 14', 'Solve: x/4 + 2 = 6']),
      ],
      estimatedMinutes: 25,
      difficulty: 'intermediate',
    },
  },
  // Science 6-8
  {
    slug: 'g68-cells-structure',
    title: 'Cell Structure & Function',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['biology', 'cells', 'life-science'],
    content: {
      blocks: [
        heading(1, 'Cells: The Building Blocks of Life'),
        p('All living things are made of cells. Cells are the smallest unit of life.'),
        definition('Cell membrane', 'Controls what enters and leaves the cell'),
        definition('Nucleus', 'Contains DNA and controls cell activities'),
        definition('Mitochondria', 'Produces energy for the cell'),
        interactive('cell-explorer', { type: 'animal-and-plant', labels: true }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g68-plate-tectonics',
    title: 'Plate Tectonics',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['earth-science', 'tectonics', 'geology'],
    content: {
      blocks: [
        heading(1, 'Earth\'s Moving Plates'),
        p('Earth\'s surface is divided into large plates that slowly move. Their interactions cause earthquakes, volcanoes, and mountain formation.'),
        definition('Convergent boundary', 'Plates move toward each other'),
        definition('Divergent boundary', 'Plates move apart'),
        definition('Transform boundary', 'Plates slide past each other'),
        interactive('plate-map', { showBoundaries: true }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g68-forces-motion',
    title: 'Forces & Motion',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['physics', 'forces', 'motion'],
    content: {
      blocks: [
        heading(1, 'Forces & Motion'),
        definition('Force', 'A push or pull that can change an object\'s motion'),
        definition('Newton\'s First Law', 'An object at rest stays at rest unless acted on by an unbalanced force'),
        definition('Newton\'s Second Law', 'Force = mass × acceleration (F = ma)'),
        example('A 10 kg box with a 50 N force: a = 50/10 = 5 m/s²'),
        practice(['Find the force needed to accelerate a 5 kg object at 3 m/s²']),
      ],
      estimatedMinutes: 25,
      difficulty: 'intermediate',
    },
  },
  // Social Studies 6-8 (OTHER)
  {
    slug: 'g68-ancient-civilizations',
    title: 'Ancient Civilizations',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['social-studies', 'ancient-history', 'civilizations'],
    content: {
      blocks: [
        heading(1, 'Ancient Civilizations'),
        p('The earliest civilizations arose in river valleys where farming was possible.'),
        list(['Mesopotamia (Tigris-Euphrates)', 'Egypt (Nile)', 'Indus Valley', 'China (Yellow River)']),
        p('Each civilization developed writing, government, and complex social structures.'),
        interactive('civilization-timeline', { civilizations: ['Mesopotamia', 'Egypt', 'Indus Valley', 'China', 'Greece', 'Rome'] }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  // SEL 6-8
  {
    slug: 'g68-identity-self-awareness',
    title: 'Identity & Self-Awareness',
    subject: LearningObjectSubject.SEL,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['sel', 'identity', 'self-awareness'],
    content: {
      blocks: [
        heading(1, 'Understanding Yourself'),
        p('Middle school is a time of big changes. Understanding your identity helps you make good decisions.'),
        list(['Your values — what matters most to you', 'Your strengths — what you\'re good at', 'Your goals — what you want to achieve', 'Your emotions — how you feel and why']),
        interactive('strengths-inventory', { categories: ['academic', 'social', 'creative', 'physical'] }),
      ],
      estimatedMinutes: 15,
      difficulty: 'intermediate',
    },
  },
  // Arts 6-8 (OTHER)
  {
    slug: 'g68-elements-of-art',
    title: 'Elements of Art & Design',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['arts', 'visual-art', 'design'],
    content: {
      blocks: [
        heading(1, 'The 7 Elements of Art'),
        definition('Line', 'A mark made by a moving point'),
        definition('Shape', 'A 2D area defined by edges'),
        definition('Form', 'A 3D object with height, width, and depth'),
        definition('Color', 'Created by light reflecting off surfaces'),
        definition('Value', 'The lightness or darkness of a color'),
        definition('Texture', 'How a surface feels or looks like it feels'),
        definition('Space', 'The area around, between, or within objects'),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  // Technology 6-8 (OTHER)
  {
    slug: 'g68-digital-citizenship',
    title: 'Digital Citizenship',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G6_8,
    tags: ['technology', 'digital-citizenship', 'online-safety'],
    content: {
      blocks: [
        heading(1, 'Being a Good Digital Citizen'),
        p('Digital citizenship means using technology responsibly and safely.'),
        list(['Protect your personal information', 'Think before you post', 'Be kind online', 'Report cyberbullying', 'Give credit for others\' work']),
        interactive('scenario-chooser', { scenarios: ['sharing photos', 'online comments', 'password safety'] }),
      ],
      estimatedMinutes: 15,
      difficulty: 'beginner',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 9-12 LEARNING OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

const G912_LOS: LODef[] = [
  // ELA 9-12
  {
    slug: 'g912-rhetorical-analysis',
    title: 'Rhetorical Analysis',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['rhetoric', 'analysis', 'writing', 'advanced'],
    content: {
      blocks: [
        heading(1, 'Analyzing Rhetoric'),
        p('Rhetorical analysis examines how an author uses language to persuade, inform, or entertain an audience.'),
        definition('Ethos', 'Appeal to the author\'s credibility'),
        definition('Pathos', 'Appeal to the audience\'s emotions'),
        definition('Logos', 'Appeal to logic and evidence'),
        p('When analyzing rhetoric, consider the speaker, audience, purpose, context, and the specific strategies used.'),
        practice(['Identify ethos, pathos, and logos in a given speech excerpt']),
      ],
      estimatedMinutes: 30,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-literary-analysis-essay',
    title: 'Writing a Literary Analysis Essay',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['writing', 'literary-analysis', 'essay'],
    content: {
      blocks: [
        heading(1, 'The Literary Analysis Essay'),
        p('A literary analysis essay argues an interpretation of a text using evidence from the work.'),
        list([
          '1. Develop a debatable thesis about the text',
          '2. Use textual evidence (quotations) with analysis',
          '3. Address how literary devices contribute to meaning',
          '4. Organize paragraphs around sub-claims',
          '5. Conclude by widening the significance',
        ]),
        interactive('thesis-builder', { type: 'literary', prompts: ['theme', 'characterization', 'symbolism'] }),
      ],
      estimatedMinutes: 35,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-synthesis-writing',
    title: 'Synthesis Writing',
    subject: LearningObjectSubject.ELA,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['writing', 'synthesis', 'research'],
    content: {
      blocks: [
        heading(1, 'Synthesizing Multiple Sources'),
        p('Synthesis writing combines ideas from multiple sources to support an original claim.'),
        list([
          'Read and annotate each source',
          'Identify common themes and contradictions',
          'Develop a thesis that goes beyond any single source',
          'Integrate evidence from multiple sources in each paragraph',
        ]),
        practice(['Given 3 sources on technology in education, write a synthesis paragraph']),
      ],
      estimatedMinutes: 35,
      difficulty: 'advanced',
      prerequisites: ['g912-rhetorical-analysis'],
    },
  },
  // Math 9-12
  {
    slug: 'g912-linear-functions',
    title: 'Linear Functions & Systems',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['algebra', 'linear', 'functions', 'systems'],
    content: {
      blocks: [
        heading(1, 'Linear Functions'),
        definition('Slope', 'The rate of change — rise over run — m = (y₂ - y₁)/(x₂ - x₁)'),
        definition('Slope-Intercept Form', 'y = mx + b'),
        example('A line through (1, 3) and (3, 7): slope = (7-3)/(3-1) = 2, equation: y = 2x + 1'),
        practice(['Write the equation of a line through (2, 5) with slope 3', 'Solve the system: y = 2x + 1 and y = -x + 7']),
      ],
      estimatedMinutes: 30,
      difficulty: 'intermediate',
    },
  },
  {
    slug: 'g912-quadratic-functions',
    title: 'Quadratic Functions',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['algebra', 'quadratics', 'functions'],
    content: {
      blocks: [
        heading(1, 'Quadratic Functions'),
        p('A quadratic function has the form f(x) = ax² + bx + c. Its graph is a parabola.'),
        definition('Vertex', 'The highest or lowest point on the parabola'),
        definition('Axis of Symmetry', 'The vertical line x = -b/(2a)'),
        definition('Discriminant', 'b² - 4ac determines the number of real solutions'),
        example('f(x) = x² - 4x + 3: vertex at (2, -1), zeros at x = 1 and x = 3'),
        practice(['Factor: x² + 5x + 6', 'Use the quadratic formula: 2x² - 3x - 2 = 0']),
      ],
      estimatedMinutes: 30,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-geometry-proofs',
    title: 'Geometric Proofs & Congruence',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['geometry', 'proofs', 'congruence'],
    content: {
      blocks: [
        heading(1, 'Geometric Proofs'),
        p('A proof is a logical argument that demonstrates a geometric relationship is always true.'),
        list(['Two-column proofs list statements and reasons', 'Paragraph proofs explain reasoning in sentences', 'Flow proofs use arrows to show logical flow']),
        definition('SSS', 'If three sides of one triangle are equal to three sides of another, the triangles are congruent'),
        definition('SAS', 'If two sides and the included angle are equal, the triangles are congruent'),
        practice(['Prove: If AB = CD and BC = DA, then triangle ABC ≅ triangle CDA']),
      ],
      estimatedMinutes: 35,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-trig-right-triangles',
    title: 'Right Triangle Trigonometry',
    subject: LearningObjectSubject.MATH,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['trigonometry', 'geometry', 'right-triangle'],
    content: {
      blocks: [
        heading(1, 'Trigonometric Ratios'),
        definition('Sine', 'sin(θ) = opposite / hypotenuse'),
        definition('Cosine', 'cos(θ) = adjacent / hypotenuse'),
        definition('Tangent', 'tan(θ) = opposite / adjacent'),
        example('In a right triangle with angle 30°, hypotenuse 10: opposite = 10 × sin(30°) = 5'),
        practice(['Find the height of a tree if you stand 20 m away and the angle of elevation is 35°']),
      ],
      estimatedMinutes: 30,
      difficulty: 'advanced',
    },
  },
  // Science 9-12
  {
    slug: 'g912-cell-biology',
    title: 'Cell Biology: Structure & Energy',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['biology', 'cells', 'respiration', 'photosynthesis'],
    content: {
      blocks: [
        heading(1, 'Cell Biology'),
        p('Cells are the fundamental unit of life. They obtain energy through cellular respiration and (in plants) photosynthesis.'),
        definition('Cellular Respiration', 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP'),
        definition('Photosynthesis', '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂'),
        interactive('cell-diagram', { type: 'eukaryotic', labels: ['nucleus', 'mitochondria', 'chloroplast', 'ER', 'golgi'] }),
      ],
      estimatedMinutes: 30,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-genetics-dna',
    title: 'Genetics: DNA & Protein Synthesis',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['biology', 'genetics', 'dna', 'protein-synthesis'],
    content: {
      blocks: [
        heading(1, 'From DNA to Protein'),
        p('DNA contains the instructions for building proteins. The process goes: DNA → mRNA (transcription) → Protein (translation).'),
        definition('Transcription', 'DNA is copied into messenger RNA in the nucleus'),
        definition('Translation', 'Ribosomes read mRNA codons and assemble amino acids into proteins'),
        interactive('codon-translator', { sequence: 'AUG-GCA-UUC-UAA' }),
        practice(['If the DNA template strand is TAC-CGT-AAG, what is the mRNA?']),
      ],
      estimatedMinutes: 30,
      difficulty: 'advanced',
      prerequisites: ['g912-cell-biology'],
    },
  },
  {
    slug: 'g912-chemistry-bonding',
    title: 'Chemical Bonding',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['chemistry', 'bonding', 'ionic', 'covalent'],
    content: {
      blocks: [
        heading(1, 'Chemical Bonds'),
        p('Atoms bond to achieve stable electron configurations (usually a full octet).'),
        definition('Ionic Bond', 'Transfer of electrons from a metal to a nonmetal'),
        definition('Covalent Bond', 'Sharing of electrons between nonmetals'),
        definition('Metallic Bond', 'Sea of delocalized electrons among metal atoms'),
        practice(['Draw the Lewis structure for H₂O', 'Classify NaCl, O₂, and Fe as ionic, covalent, or metallic']),
      ],
      estimatedMinutes: 25,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-physics-kinematics',
    title: 'Kinematics: Motion in 1D',
    subject: LearningObjectSubject.SCIENCE,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['physics', 'kinematics', 'motion'],
    content: {
      blocks: [
        heading(1, 'Describing Motion'),
        p('Kinematics describes motion without considering the forces that cause it.'),
        definition('Displacement', 'Change in position: Δx = x_final - x_initial'),
        definition('Velocity', 'Rate of change of displacement: v = Δx/Δt'),
        definition('Acceleration', 'Rate of change of velocity: a = Δv/Δt'),
        example('A car accelerates from 0 to 25 m/s in 5 s: a = 25/5 = 5 m/s²'),
        practice(['A ball is dropped from 20 m. How long does it take to hit the ground? (g = 9.8 m/s²)']),
      ],
      estimatedMinutes: 30,
      difficulty: 'advanced',
    },
  },
  // Social Studies 9-12 (OTHER)
  {
    slug: 'g912-world-history-revolutions',
    title: 'Age of Revolutions',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['social-studies', 'world-history', 'revolutions'],
    content: {
      blocks: [
        heading(1, 'The Age of Revolutions'),
        p('The 18th and 19th centuries saw a wave of political revolutions inspired by Enlightenment ideals.'),
        list(['American Revolution (1775-1783)', 'French Revolution (1789-1799)', 'Haitian Revolution (1791-1804)', 'Latin American Independence movements']),
        p('Common themes: liberty, equality, natural rights, and opposition to absolute monarchy.'),
        interactive('revolution-comparison', { revolutions: ['American', 'French', 'Haitian'] }),
      ],
      estimatedMinutes: 25,
      difficulty: 'advanced',
    },
  },
  {
    slug: 'g912-us-government',
    title: 'US Government: Constitutional Principles',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['social-studies', 'government', 'civics', 'constitution'],
    content: {
      blocks: [
        heading(1, 'The US Constitution'),
        p('The Constitution establishes the framework of American government based on several key principles.'),
        definition('Federalism', 'Division of power between national and state governments'),
        definition('Separation of Powers', 'Government divided into legislative, executive, and judicial branches'),
        definition('Checks and Balances', 'Each branch can limit the power of the other branches'),
        practice(['Explain how the President can check the power of Congress', 'How does judicial review work?']),
      ],
      estimatedMinutes: 25,
      difficulty: 'advanced',
    },
  },
  // SEL 9-12
  {
    slug: 'g912-college-career-readiness',
    title: 'College & Career Readiness',
    subject: LearningObjectSubject.SEL,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['sel', 'career', 'college', 'planning'],
    content: {
      blocks: [
        heading(1, 'Planning for Your Future'),
        p('Whether you\'re heading to college, a trade program, or the workforce, planning ahead helps you succeed.'),
        list(['1. Assess your interests and strengths', '2. Research career pathways', '3. Set short-term and long-term goals', '4. Build a portfolio of skills and experiences', '5. Develop a personal action plan']),
        interactive('career-explorer', { clusters: ['STEM', 'Arts', 'Business', 'Health', 'Education', 'Trades'] }),
      ],
      estimatedMinutes: 20,
      difficulty: 'intermediate',
    },
  },
  // Arts 9-12 (OTHER)
  {
    slug: 'g912-studio-art-drawing',
    title: 'Observational Drawing & Composition',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['arts', 'drawing', 'visual-art', 'composition'],
    content: {
      blocks: [
        heading(1, 'Observational Drawing'),
        p('Observational drawing captures what you see accurately, focusing on proportion, value, and texture.'),
        list(['Use contour lines to define edges', 'Add value (shading) for 3D form', 'Apply the rule of thirds for strong composition', 'Use negative space to improve accuracy']),
        interactive('drawing-guide', { techniques: ['contour', 'cross-hatching', 'stippling', 'blending'] }),
      ],
      estimatedMinutes: 30,
      difficulty: 'intermediate',
    },
  },
  // Technology 9-12 (OTHER)
  {
    slug: 'g912-intro-programming',
    title: 'Introduction to Programming',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['technology', 'programming', 'computer-science'],
    content: {
      blocks: [
        heading(1, 'Learning to Code'),
        p('Programming is writing instructions for a computer to follow. Programs manipulate data using variables, conditions, and loops.'),
        definition('Variable', 'A named container that stores a value'),
        definition('Conditional', 'Makes decisions: if something is true, do this; otherwise, do that'),
        definition('Loop', 'Repeats a block of code multiple times'),
        interactive('code-sandbox', { language: 'python', starter: 'name = input("What is your name?")\\nprint(f"Hello, {name}!")' }),
      ],
      estimatedMinutes: 30,
      difficulty: 'intermediate',
    },
  },
  // Career Tech 9-12 (OTHER)
  {
    slug: 'g912-career-exploration',
    title: 'Career Clusters & Pathways',
    subject: LearningObjectSubject.OTHER,
    gradeBand: LearningObjectGradeBand.G9_12,
    tags: ['career-tech', 'career', 'exploration'],
    content: {
      blocks: [
        heading(1, 'Exploring Career Clusters'),
        p('The 16 career clusters organize hundreds of occupations into groups based on shared skills and knowledge.'),
        list(['Agriculture, Food & Natural Resources', 'Architecture & Construction', 'Arts, A/V Technology & Communications', 'Business Management & Administration', 'Education & Training', 'Health Science', 'Information Technology', 'STEM']),
        interactive('career-interest-survey', { questions: 10 }),
      ],
      estimatedMinutes: 20,
      difficulty: 'beginner',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDER
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_LOS: LODef[] = [
  ...K2_LOS,
  ...G35_LOS,
  ...G68_LOS,
  ...G912_LOS,
];

async function main(): Promise<void> {
  console.log('🌱 Seeding K-12 Learning Objects (content-svc)...\n');

  let created = 0;

  for (const lo of ALL_LOS) {
    const loId = nextLoId();
    const { tags, content, ...loData } = lo;

    // Upsert Learning Object
    const record = await prisma.learningObject.upsert({
      where: {
        tenantId_slug: {
          tenantId: DEV_TENANT_ID,
          slug: lo.slug,
        },
      },
      update: {},
      create: {
        id: loId,
        tenantId: DEV_TENANT_ID,
        ...loData,
        createdByUserId: AUTHOR_USER_ID,
        isActive: true,
      },
    });

    // Create published version
    await prisma.learningObjectVersion.upsert({
      where: {
        learningObjectId_versionNumber: {
          learningObjectId: record.id,
          versionNumber: 1,
        },
      },
      update: {},
      create: {
        learningObjectId: record.id,
        versionNumber: 1,
        state: LearningObjectVersionState.PUBLISHED,
        createdByUserId: AUTHOR_USER_ID,
        approvedByUserId: AUTHOR_USER_ID,
        contentJson: content,
        changeSummary: 'Initial version - K-12 curriculum seed',
        publishedAt: new Date(),
      },
    });

    // Create tags
    for (const tag of tags) {
      await prisma.learningObjectTag.upsert({
        where: {
          learningObjectId_tag: {
            learningObjectId: record.id,
            tag,
          },
        },
        update: {},
        create: {
          learningObjectId: record.id,
          tag,
        },
      });
    }

    console.log(`  ✅ ${lo.gradeBand} ${lo.subject}: ${lo.title}`);
    created++;
  }

  const byGrade = {
    K_2: K2_LOS.length,
    G3_5: G35_LOS.length,
    G6_8: G68_LOS.length,
    G9_12: G912_LOS.length,
  };

  console.log(`\n✅ K-12 content seeded: ${created} learning objects`);
  console.log(`  K-2: ${byGrade.K_2} | 3-5: ${byGrade.G3_5} | 6-8: ${byGrade.G6_8} | 9-12: ${byGrade.G9_12}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
