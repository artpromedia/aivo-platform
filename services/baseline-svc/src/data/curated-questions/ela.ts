/**
 * Curated ELA (English Language Arts) Questions
 *
 * Validated, educationally-reviewed ELA questions organized by grade band and skill.
 * These serve as reliable fallback when AI generation is unavailable.
 *
 * @module curated-questions/ela
 */

import type { GeneratedQuestion } from '../../types/questions.types.js';

/**
 * Grade K-5 ELA Questions
 */
export const ELA_K5: GeneratedQuestion[] = [
  // ── Phonemic Awareness ──
  {
    id: 'ela-k5-pa-001',
    skillCode: 'ELA_PHONEMIC_AWARENESS',
    type: 'multiple-choice',
    stem: 'Which word rhymes with "cat"?',
    options: [
      { id: 'A', text: 'dog', isCorrect: false },
      { id: 'B', text: 'hat', isCorrect: true },
      { id: 'C', text: 'cup', isCorrect: false },
      { id: 'D', text: 'car', isCorrect: false, distractorType: 'partial-understanding' },
    ],
    correctAnswer: 'B',
    explanation:
      'Words that rhyme have the same ending sound. "Cat" and "hat" both end with the "-at" sound.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RF.K.2.A'],
    difficulty: 0.2,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 1,
      wordCount: 6,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'ela-k5-pa-002',
    skillCode: 'ELA_PHONEMIC_AWARENESS',
    type: 'multiple-choice',
    stem: 'What sound does the letter "S" make in "sun"?',
    options: [
      { id: 'A', text: '/s/ as in "snake"', isCorrect: true },
      {
        id: 'B',
        text: '/z/ as in "zebra"',
        isCorrect: false,
        distractorType: 'common-misconception',
      },
      { id: 'C', text: '/sh/ as in "ship"', isCorrect: false },
      { id: 'D', text: '/t/ as in "top"', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'In the word "sun," the letter S makes the /s/ sound, like a hissing snake.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RF.K.3.A'],
    difficulty: 0.25,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 12,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fluency ──
  {
    id: 'ela-k5-fl-001',
    skillCode: 'ELA_FLUENCY',
    type: 'multiple-choice',
    stem: 'Read this sentence: "The big dog ran fast." What word tells us how the dog ran?',
    options: [
      { id: 'A', text: 'big', isCorrect: false },
      { id: 'B', text: 'dog', isCorrect: false },
      { id: 'C', text: 'ran', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'D', text: 'fast', isCorrect: true },
    ],
    correctAnswer: 'D',
    explanation:
      '"Fast" describes how the dog ran. It is an adverb that tells us about the action.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RF.1.4'],
    difficulty: 0.3,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 18,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Vocabulary ──
  {
    id: 'ela-k5-vo-001',
    skillCode: 'ELA_VOCABULARY',
    type: 'multiple-choice',
    stem: 'What does the word "enormous" mean?',
    options: [
      { id: 'A', text: 'very tiny', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'very big', isCorrect: true },
      { id: 'C', text: 'very fast', isCorrect: false },
      { id: 'D', text: 'very old', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      '"Enormous" means extremely large or huge. An elephant is enormous compared to a mouse.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.2.4'],
    difficulty: 0.3,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 7,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Comprehension ──
  {
    id: 'ela-k5-co-001',
    skillCode: 'ELA_COMPREHENSION',
    type: 'multiple-choice',
    stem: 'Read the story: "Sam saw a cat. The cat was gray. Sam wanted to pet the cat." What color was the cat?',
    options: [
      { id: 'A', text: 'black', isCorrect: false },
      { id: 'B', text: 'white', isCorrect: false },
      { id: 'C', text: 'gray', isCorrect: true },
      { id: 'D', text: 'brown', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation:
      'The story clearly states "The cat was gray." This is finding information directly in the text.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RL.1.1'],
    difficulty: 0.25,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 1,
      wordCount: 30,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Writing ──
  {
    id: 'ela-k5-wr-001',
    skillCode: 'ELA_WRITING',
    type: 'multiple-choice',
    stem: 'Which sentence is written correctly?',
    options: [
      { id: 'A', text: 'the boy ran fast', isCorrect: false },
      { id: 'B', text: 'The boy ran fast.', isCorrect: true },
      {
        id: 'C',
        text: 'The boy ran fast',
        isCorrect: false,
        distractorType: 'partial-understanding',
      },
      { id: 'D', text: 'the Boy ran fast.', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      'A correct sentence starts with a capital letter and ends with a period. "The boy ran fast." follows both rules.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.1.2'],
    difficulty: 0.3,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 6,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 6-8 ELA Questions
 */
export const ELA_G6_8: GeneratedQuestion[] = [
  // ── Vocabulary ──
  {
    id: 'ela-g68-vo-001',
    skillCode: 'ELA_VOCABULARY',
    type: 'multiple-choice',
    stem: 'Based on the sentence, what does "benevolent" mean? "The benevolent king shared his wealth with the poor."',
    options: [
      { id: 'A', text: 'cruel', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'wealthy', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'C', text: 'kind', isCorrect: true },
      { id: 'D', text: 'powerful', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation:
      'Context clues help us understand meaning. The king shared his wealth with the poor, which shows kindness. "Benevolent" means well-meaning and kind.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.6.4.A'],
    difficulty: 0.5,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 18,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Comprehension (Inference) ──
  {
    id: 'ela-g68-co-001',
    skillCode: 'ELA_COMPREHENSION',
    type: 'multiple-choice',
    stem: 'Read the passage: "Maria looked at the dark clouds and grabbed her umbrella before leaving." What can you infer about Maria?',
    passage:
      'Maria looked at the dark clouds gathering in the sky. She reached for her umbrella by the door before stepping outside.',
    options: [
      { id: 'A', text: 'She is afraid of clouds', isCorrect: false },
      { id: 'B', text: 'She thinks it might rain', isCorrect: true },
      { id: 'C', text: 'She always carries an umbrella', isCorrect: false },
      { id: 'D', text: 'She is going to work', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      'Dark clouds often signal rain. Maria grabbing an umbrella shows she expects rain. This is an inference based on context clues.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RL.6.1'],
    difficulty: 0.45,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 5,
      wordCount: 28,
      estimatedTimeSeconds: 40,
      contentRiskLevel: 'safe',
    },
  },
  // ── Writing (Grammar) ──
  {
    id: 'ela-g68-wr-001',
    skillCode: 'ELA_WRITING',
    type: 'multiple-choice',
    stem: 'Which sentence uses the correct form of "their/there/they\'re"?',
    options: [
      { id: 'A', text: 'Their going to the store.', isCorrect: false },
      { id: 'B', text: "They're going to the store.", isCorrect: true },
      { id: 'C', text: 'There going to the store.', isCorrect: false },
      { id: 'D', text: 'Theyre going to the store.', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      '"They\'re" is a contraction of "they are." "Their" shows possession. "There" refers to a place. The sentence needs "they are," so "They\'re" is correct.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.6.1'],
    difficulty: 0.5,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 5,
      wordCount: 12,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fluency (Figurative Language) ──
  {
    id: 'ela-g68-fl-001',
    skillCode: 'ELA_FLUENCY',
    type: 'multiple-choice',
    stem: '"The wind whispered through the trees." This sentence is an example of:',
    options: [
      { id: 'A', text: 'Simile', isCorrect: false },
      { id: 'B', text: 'Personification', isCorrect: true },
      { id: 'C', text: 'Metaphor', isCorrect: false },
      { id: 'D', text: 'Alliteration', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      'Personification gives human qualities to non-human things. Wind cannot literally whisper—that is a human action given to the wind.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.7.5.A'],
    difficulty: 0.55,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 12,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Phonemic Awareness (Root Words) ──
  {
    id: 'ela-g68-pa-001',
    skillCode: 'ELA_PHONEMIC_AWARENESS',
    type: 'multiple-choice',
    stem: 'The root word "bio" means:',
    options: [
      { id: 'A', text: 'water', isCorrect: false },
      { id: 'B', text: 'earth', isCorrect: false },
      { id: 'C', text: 'life', isCorrect: true },
      { id: 'D', text: 'fire', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation:
      '"Bio" comes from Greek and means life. Examples: biology (study of life), biography (story of a life), biome (living environment).',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.6.4.B'],
    difficulty: 0.45,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 5,
      wordCount: 7,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 9-12 ELA Questions
 */
export const ELA_G9_12: GeneratedQuestion[] = [
  // ── Vocabulary (Context) ──
  {
    id: 'ela-g912-vo-001',
    skillCode: 'ELA_VOCABULARY',
    type: 'multiple-choice',
    stem: 'In the sentence "The politician\'s speech was full of grandiloquent phrases that impressed but lacked substance," what does "grandiloquent" most likely mean?',
    options: [
      { id: 'A', text: 'simple and direct', isCorrect: false },
      { id: 'B', text: 'pompous and extravagant', isCorrect: true },
      { id: 'C', text: 'quiet and humble', isCorrect: false },
      {
        id: 'D',
        text: 'confusing and unclear',
        isCorrect: false,
        distractorType: 'partial-understanding',
      },
    ],
    correctAnswer: 'B',
    explanation:
      'The context tells us the phrases "impressed but lacked substance," suggesting style over content. "Grandiloquent" means using extravagant language to impress.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.9-10.4.A'],
    difficulty: 0.65,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 22,
      estimatedTimeSeconds: 45,
      contentRiskLevel: 'safe',
    },
  },
  // ── Comprehension (Theme) ──
  {
    id: 'ela-g912-co-001',
    skillCode: 'ELA_COMPREHENSION',
    type: 'multiple-choice',
    stem: 'A story follows a character who loses everything but ultimately finds happiness through meaningful relationships. What is the most likely theme?',
    options: [
      {
        id: 'A',
        text: 'Material wealth brings happiness',
        isCorrect: false,
        distractorType: 'common-misconception',
      },
      { id: 'B', text: 'True fulfillment comes from human connection', isCorrect: true },
      { id: 'C', text: 'Hard work always leads to success', isCorrect: false },
      { id: 'D', text: 'Society values material possessions', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      'The character loses material things but finds happiness through relationships. This supports the theme that human connection matters more than possessions.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RL.9-10.2'],
    difficulty: 0.6,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 8,
      wordCount: 24,
      estimatedTimeSeconds: 50,
      contentRiskLevel: 'safe',
    },
  },
  // ── Writing (Thesis) ──
  {
    id: 'ela-g912-wr-001',
    skillCode: 'ELA_WRITING',
    type: 'multiple-choice',
    stem: 'Which is the strongest thesis statement for an argumentative essay about renewable energy?',
    options: [
      { id: 'A', text: 'Renewable energy is interesting.', isCorrect: false },
      { id: 'B', text: 'This essay will discuss renewable energy.', isCorrect: false },
      {
        id: 'C',
        text: 'Renewable energy sources should be prioritized over fossil fuels because they reduce carbon emissions and create sustainable jobs.',
        isCorrect: true,
      },
      { id: 'D', text: 'Some people think renewable energy is good.', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation:
      'A strong thesis takes a clear position and provides reasoning. Option C states a claim and gives two supporting reasons, making it arguable and specific.',
    standardsAlignment: ['CCSS.ELA-LITERACY.W.9-10.1.A'],
    difficulty: 0.55,
    cognitiveLevel: 'evaluate',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 20,
      estimatedTimeSeconds: 45,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fluency (Rhetoric) ──
  {
    id: 'ela-g912-fl-001',
    skillCode: 'ELA_FLUENCY',
    type: 'multiple-choice',
    stem: '"I have a dream..." repeated throughout Dr. King\'s speech is an example of which rhetorical device?',
    options: [
      { id: 'A', text: 'Anaphora', isCorrect: true },
      { id: 'B', text: 'Antithesis', isCorrect: false },
      { id: 'C', text: 'Hyperbole', isCorrect: false },
      { id: 'D', text: 'Euphemism', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation:
      'Anaphora is the repetition of words or phrases at the beginning of successive clauses for emphasis. "I have a dream" is repeated to build emotional impact.',
    standardsAlignment: ['CCSS.ELA-LITERACY.RI.11-12.6'],
    difficulty: 0.6,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 18,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Phonemic Awareness (Etymology) ──
  {
    id: 'ela-g912-pa-001',
    skillCode: 'ELA_PHONEMIC_AWARENESS',
    type: 'multiple-choice',
    stem: 'The word "democracy" comes from Greek roots meaning:',
    options: [
      { id: 'A', text: 'one ruler', isCorrect: false },
      { id: 'B', text: 'rule by the people', isCorrect: true },
      { id: 'C', text: 'rule by law', isCorrect: false },
      { id: 'D', text: 'rule by the elite', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation:
      '"Demo" means people (as in demographics), and "cracy" means rule or government (as in aristocracy). Together: government by the people.',
    standardsAlignment: ['CCSS.ELA-LITERACY.L.9-10.4.B'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 10,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Get all ELA questions by grade band
 */
export function getELAQuestions(gradeBand: 'K5' | 'G6_8' | 'G9_12'): GeneratedQuestion[] {
  switch (gradeBand) {
    case 'K5':
      return ELA_K5;
    case 'G6_8':
      return ELA_G6_8;
    case 'G9_12':
      return ELA_G9_12;
    default:
      return ELA_G6_8;
  }
}

/**
 * Get ELA questions by skill code
 */
export function getELAQuestionsBySkill(
  gradeBand: 'K5' | 'G6_8' | 'G9_12',
  skillCode: string
): GeneratedQuestion[] {
  return getELAQuestions(gradeBand).filter((q) => q.skillCode === skillCode);
}
