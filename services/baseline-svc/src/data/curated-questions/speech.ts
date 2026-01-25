/**
 * Curated Speech & Language Questions
 *
 * Validated, educationally-reviewed speech and language questions organized by grade band and skill.
 * Aligned with ASHA (American Speech-Language-Hearing Association) standards.
 *
 * Skills covered:
 * - SPEECH_ARTICULATION: Sound production and pronunciation
 * - SPEECH_FLUENCY: Rhythm and flow of speech
 * - SPEECH_RECEPTIVE: Understanding spoken language
 * - SPEECH_EXPRESSIVE: Producing spoken language
 * - SPEECH_PHONOLOGICAL: Sound patterns and awareness
 *
 * @module curated-questions/speech
 */

import type { GeneratedQuestion } from '../../types/questions.types.js';

/**
 * Grade K-5 Speech Questions
 */
export const SPEECH_K5: GeneratedQuestion[] = [
  // ── Articulation ──
  {
    id: 'speech-k5-art-001',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'Which word starts with the same sound as "sun"?',
    options: [
      { id: 'A', text: 'Sat', isCorrect: true },
      { id: 'B', text: 'Cat', isCorrect: false },
      { id: 'C', text: 'Fun', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Hat', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '"Sat" and "sun" both start with the /s/ sound. We make this sound by putting our tongue behind our teeth.',
    standardsAlignment: ['ASHA.PHONOLOGY.K-2'],
    difficulty: 0.2,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 1,
      wordCount: 10,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-k5-art-002',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'Which word rhymes with "cat"?',
    options: [
      { id: 'A', text: 'Dog', isCorrect: false },
      { id: 'B', text: 'Bat', isCorrect: true },
      { id: 'C', text: 'Cup', isCorrect: false },
      { id: 'D', text: 'Car', isCorrect: false, distractorType: 'common-misconception' },
    ],
    correctAnswer: 'B',
    explanation: '"Cat" and "bat" both end with the "-at" sound. Words that rhyme have the same ending sound.',
    standardsAlignment: ['ASHA.PHONOLOGY.K-2'],
    difficulty: 0.2,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 1,
      wordCount: 7,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-k5-art-003',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'How many syllables are in the word "butterfly"?',
    options: [
      { id: 'A', text: '2', isCorrect: false },
      { id: 'B', text: '3', isCorrect: true },
      { id: 'C', text: '4', isCorrect: false },
      { id: 'D', text: '1', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '"Butterfly" has 3 syllables: but-ter-fly. A syllable is a word part with one vowel sound.',
    standardsAlignment: ['ASHA.PHONOLOGY.K-2'],
    difficulty: 0.3,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 10,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Receptive Language ──
  {
    id: 'speech-k5-rec-001',
    skillCode: 'SPEECH_RECEPTIVE',
    type: 'multiple-choice',
    stem: 'If someone says "Please close the door," what should you do?',
    options: [
      { id: 'A', text: 'Open a window', isCorrect: false },
      { id: 'B', text: 'Shut the door', isCorrect: true },
      { id: 'C', text: 'Sit down', isCorrect: false },
      { id: 'D', text: 'Turn on the light', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '"Close" means the same as "shut." When someone asks you to close the door, they want you to shut it.',
    standardsAlignment: ['ASHA.RECEPTIVE.K-2'],
    difficulty: 0.2,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 12,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-k5-rec-002',
    skillCode: 'SPEECH_RECEPTIVE',
    type: 'multiple-choice',
    stem: 'What does "before" mean in the sentence: "Wash your hands before you eat"?',
    options: [
      { id: 'A', text: 'After', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'While', isCorrect: false },
      { id: 'C', text: 'First, then', isCorrect: true },
      { id: 'D', text: 'Never', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: '"Before" means something happens first. Wash your hands first, then eat.',
    standardsAlignment: ['ASHA.RECEPTIVE.K-2'],
    difficulty: 0.35,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 14,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Expressive Language ──
  {
    id: 'speech-k5-exp-001',
    skillCode: 'SPEECH_EXPRESSIVE',
    type: 'multiple-choice',
    stem: 'Which word best completes the sentence? "The dog is _____ than the cat."',
    options: [
      { id: 'A', text: 'big', isCorrect: false },
      { id: 'B', text: 'bigger', isCorrect: true },
      { id: 'C', text: 'biggest', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'more big', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'When comparing two things, we use "-er" words like "bigger." "Biggest" is for comparing three or more.',
    standardsAlignment: ['ASHA.EXPRESSIVE.K-2'],
    difficulty: 0.35,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 12,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-k5-exp-002',
    skillCode: 'SPEECH_EXPRESSIVE',
    type: 'multiple-choice',
    stem: 'What word means the opposite of "happy"?',
    options: [
      { id: 'A', text: 'Glad', isCorrect: false },
      { id: 'B', text: 'Joyful', isCorrect: false },
      { id: 'C', text: 'Sad', isCorrect: true },
      { id: 'D', text: 'Excited', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: '"Sad" is the opposite of "happy." Words with opposite meanings are called antonyms.',
    standardsAlignment: ['ASHA.EXPRESSIVE.K-2'],
    difficulty: 0.25,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 9,
      estimatedTimeSeconds: 15,
      contentRiskLevel: 'safe',
    },
  },
  // ── Phonological Awareness ──
  {
    id: 'speech-k5-phon-001',
    skillCode: 'SPEECH_PHONOLOGICAL',
    type: 'multiple-choice',
    stem: 'If you take away the /c/ sound from "cat," what word do you have?',
    options: [
      { id: 'A', text: 'At', isCorrect: true },
      { id: 'B', text: 'Car', isCorrect: false },
      { id: 'C', text: 'Hat', isCorrect: false },
      { id: 'D', text: 'Cot', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'When we remove the /c/ sound from "cat," we are left with "at." This is called sound deletion.',
    standardsAlignment: ['ASHA.PHONOLOGY.K-2'],
    difficulty: 0.4,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 2,
      wordCount: 17,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-k5-phon-002',
    skillCode: 'SPEECH_PHONOLOGICAL',
    type: 'multiple-choice',
    stem: 'Which two words start with the same sound?',
    options: [
      { id: 'A', text: 'Ball and tall', isCorrect: false },
      { id: 'B', text: 'Fish and phone', isCorrect: true },
      { id: 'C', text: 'House and mouse', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'D', text: 'Car and jar', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '"Fish" and "phone" both start with the /f/ sound, even though they are spelled differently.',
    standardsAlignment: ['ASHA.PHONOLOGY.3-5'],
    difficulty: 0.45,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 10,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fluency ──
  {
    id: 'speech-k5-flu-001',
    skillCode: 'SPEECH_FLUENCY',
    type: 'multiple-choice',
    stem: 'What helps us speak more smoothly?',
    options: [
      { id: 'A', text: 'Speaking as fast as possible', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Taking slow breaths and pausing', isCorrect: true },
      { id: 'C', text: 'Not thinking about what to say', isCorrect: false },
      { id: 'D', text: 'Skipping hard words', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Taking slow breaths and pausing helps us speak smoothly. This gives our brain time to plan what to say.',
    standardsAlignment: ['ASHA.FLUENCY.K-5'],
    difficulty: 0.3,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 3,
      wordCount: 9,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 6-8 Speech Questions
 */
export const SPEECH_G6_8: GeneratedQuestion[] = [
  // ── Articulation ──
  {
    id: 'speech-g68-art-001',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'In the word "question," which letters make the /kw/ sound?',
    options: [
      { id: 'A', text: 'ti', isCorrect: false },
      { id: 'B', text: 'qu', isCorrect: true },
      { id: 'C', text: 'st', isCorrect: false },
      { id: 'D', text: 'on', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The letters "qu" together make the /kw/ sound in English words like "question," "queen," and "quick."',
    standardsAlignment: ['ASHA.PHONOLOGY.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 12,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-g68-art-002',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'The words "through," "threw," and "thorough" demonstrate what aspect of English pronunciation?',
    options: [
      { id: 'A', text: 'Words that sound alike are spelled alike', isCorrect: false },
      { id: 'B', text: 'Spelling does not always match pronunciation', isCorrect: true },
      { id: 'C', text: 'All "th" words sound the same', isCorrect: false },
      { id: 'D', text: 'English spelling is always logical', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'English has many words where spelling does not match pronunciation. "Through" and "threw" sound identical but are spelled differently.',
    standardsAlignment: ['ASHA.PHONOLOGY.6-8'],
    difficulty: 0.5,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 15,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Receptive Language ──
  {
    id: 'speech-g68-rec-001',
    skillCode: 'SPEECH_RECEPTIVE',
    type: 'multiple-choice',
    stem: 'What does the idiom "break a leg" mean?',
    options: [
      { id: 'A', text: 'To injure yourself', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Good luck', isCorrect: true },
      { id: 'C', text: 'Be careful', isCorrect: false },
      { id: 'D', text: 'Leave quickly', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '"Break a leg" is an idiom meaning "good luck," especially in theater. Idioms have meanings different from their literal words.',
    standardsAlignment: ['ASHA.RECEPTIVE.6-8'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 8,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-g68-rec-002',
    skillCode: 'SPEECH_RECEPTIVE',
    type: 'multiple-choice',
    stem: 'In the sentence "Although it was raining, we decided to go hiking," what does "although" signal?',
    options: [
      { id: 'A', text: 'A cause and effect relationship', isCorrect: false },
      { id: 'B', text: 'A contrast or unexpected outcome', isCorrect: true },
      { id: 'C', text: 'A sequence of events', isCorrect: false },
      { id: 'D', text: 'A comparison between two things', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '"Although" signals contrast - the second part is unexpected given the first. Despite the rain (expectation: stay home), they went hiking.',
    standardsAlignment: ['ASHA.RECEPTIVE.6-8'],
    difficulty: 0.5,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 20,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Expressive Language ──
  {
    id: 'speech-g68-exp-001',
    skillCode: 'SPEECH_EXPRESSIVE',
    type: 'multiple-choice',
    stem: 'Which sentence uses the most precise language?',
    options: [
      { id: 'A', text: 'The thing was nice.', isCorrect: false },
      { id: 'B', text: 'The sunset was beautiful.', isCorrect: false, distractorType: 'partial-understanding' },
      { id: 'C', text: 'The crimson sunset painted the sky in brilliant orange and purple streaks.', isCorrect: true },
      { id: 'D', text: 'The sun went down and it looked good.', isCorrect: false },
    ],
    correctAnswer: 'C',
    explanation: 'Precise language uses specific, vivid words ("crimson," "brilliant orange and purple streaks") rather than vague terms ("nice," "beautiful").',
    standardsAlignment: ['ASHA.EXPRESSIVE.6-8'],
    difficulty: 0.5,
    cognitiveLevel: 'evaluate',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 8,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-g68-exp-002',
    skillCode: 'SPEECH_EXPRESSIVE',
    type: 'multiple-choice',
    stem: 'What is the purpose of a thesis statement in a speech or essay?',
    options: [
      { id: 'A', text: 'To provide background information', isCorrect: false },
      { id: 'B', text: 'To state the main argument or point', isCorrect: true },
      { id: 'C', text: 'To conclude the discussion', isCorrect: false },
      { id: 'D', text: 'To list supporting details', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'B',
    explanation: 'A thesis statement clearly states the main argument or central point that the rest of the speech or essay will support.',
    standardsAlignment: ['ASHA.EXPRESSIVE.6-8'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 14,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  // ── Phonological Awareness ──
  {
    id: 'speech-g68-phon-001',
    skillCode: 'SPEECH_PHONOLOGICAL',
    type: 'multiple-choice',
    stem: 'Which word contains a silent letter?',
    options: [
      { id: 'A', text: 'Strong', isCorrect: false },
      { id: 'B', text: 'Knight', isCorrect: true },
      { id: 'C', text: 'Print', isCorrect: false },
      { id: 'D', text: 'Blend', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'In "knight," the "k" is silent. We pronounce it as "nite." English has many words with silent letters from historical spelling.',
    standardsAlignment: ['ASHA.PHONOLOGY.6-8'],
    difficulty: 0.4,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 6,
      wordCount: 7,
      estimatedTimeSeconds: 20,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fluency ──
  {
    id: 'speech-g68-flu-001',
    skillCode: 'SPEECH_FLUENCY',
    type: 'multiple-choice',
    stem: 'What is the term for the natural rises and falls in pitch while speaking?',
    options: [
      { id: 'A', text: 'Volume', isCorrect: false },
      { id: 'B', text: 'Intonation', isCorrect: true },
      { id: 'C', text: 'Articulation', isCorrect: false },
      { id: 'D', text: 'Resonance', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'B',
    explanation: 'Intonation refers to the rise and fall of pitch in speech. It helps convey meaning, emotion, and whether a sentence is a question or statement.',
    standardsAlignment: ['ASHA.FLUENCY.6-8'],
    difficulty: 0.5,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 7,
      wordCount: 16,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Grade 9-12 Speech Questions
 */
export const SPEECH_G9_12: GeneratedQuestion[] = [
  // ── Articulation ──
  {
    id: 'speech-g912-art-001',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'The phonetic alphabet symbol /θ/ represents the sound in which word?',
    options: [
      { id: 'A', text: 'The', isCorrect: false, distractorType: 'common-misconception' },
      { id: 'B', text: 'Think', isCorrect: true },
      { id: 'C', text: 'Tree', isCorrect: false },
      { id: 'D', text: 'Ship', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '/θ/ is the voiceless "th" sound in "think." "The" uses /ð/ (voiced th). Learning phonetic symbols helps with pronunciation.',
    standardsAlignment: ['ASHA.PHONOLOGY.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 14,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-g912-art-002',
    skillCode: 'SPEECH_ARTICULATION',
    type: 'multiple-choice',
    stem: 'What distinguishes voiced consonants from voiceless consonants?',
    options: [
      { id: 'A', text: 'Voiced consonants are louder', isCorrect: false },
      { id: 'B', text: 'Voiced consonants involve vibration of the vocal cords', isCorrect: true },
      { id: 'C', text: 'Voiceless consonants require more air', isCorrect: false },
      { id: 'D', text: 'There is no real difference', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Voiced consonants (/b/, /d/, /g/) involve vocal cord vibration. Voiceless consonants (/p/, /t/, /k/) do not. Feel your throat while saying "zzz" vs "sss."',
    standardsAlignment: ['ASHA.PHONOLOGY.9-12'],
    difficulty: 0.5,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 12,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Receptive Language ──
  {
    id: 'speech-g912-rec-001',
    skillCode: 'SPEECH_RECEPTIVE',
    type: 'multiple-choice',
    stem: 'What rhetorical device is being used when a speaker says, "Ask not what your country can do for you—ask what you can do for your country"?',
    options: [
      { id: 'A', text: 'Metaphor', isCorrect: false },
      { id: 'B', text: 'Chiasmus', isCorrect: true },
      { id: 'C', text: 'Hyperbole', isCorrect: false },
      { id: 'D', text: 'Alliteration', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Chiasmus reverses the structure of phrases (ABBA pattern). "Country...you—you...country" creates emphasis and memorability.',
    standardsAlignment: ['ASHA.RECEPTIVE.9-12'],
    difficulty: 0.6,
    cognitiveLevel: 'analyze',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 26,
      estimatedTimeSeconds: 40,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-g912-rec-002',
    skillCode: 'SPEECH_RECEPTIVE',
    type: 'multiple-choice',
    stem: 'In discourse analysis, what is the term for implied meaning that is not explicitly stated?',
    options: [
      { id: 'A', text: 'Denotation', isCorrect: false },
      { id: 'B', text: 'Implicature', isCorrect: true },
      { id: 'C', text: 'Syntax', isCorrect: false },
      { id: 'D', text: 'Register', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Implicature refers to what is suggested or implied but not directly stated. "Nice weather we\'re having" during a storm implies sarcasm.',
    standardsAlignment: ['ASHA.RECEPTIVE.9-12'],
    difficulty: 0.6,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 18,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
  // ── Expressive Language ──
  {
    id: 'speech-g912-exp-001',
    skillCode: 'SPEECH_EXPRESSIVE',
    type: 'multiple-choice',
    stem: 'When adapting language for different audiences, what is this skill called?',
    options: [
      { id: 'A', text: 'Code-switching', isCorrect: true },
      { id: 'B', text: 'Plagiarism', isCorrect: false },
      { id: 'C', text: 'Translation', isCorrect: false, distractorType: 'plausible-alternative' },
      { id: 'D', text: 'Memorization', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Code-switching is adapting language style, vocabulary, or even language based on context and audience. It\'s a sign of communicative competence.',
    standardsAlignment: ['ASHA.EXPRESSIVE.9-12'],
    difficulty: 0.55,
    cognitiveLevel: 'remember',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 14,
      estimatedTimeSeconds: 25,
      contentRiskLevel: 'safe',
    },
  },
  {
    id: 'speech-g912-exp-002',
    skillCode: 'SPEECH_EXPRESSIVE',
    type: 'multiple-choice',
    stem: 'Which organizational pattern would be most effective for a persuasive speech about implementing a new school policy?',
    options: [
      { id: 'A', text: 'Chronological (time-based)', isCorrect: false },
      { id: 'B', text: 'Problem-solution', isCorrect: true },
      { id: 'C', text: 'Spatial (location-based)', isCorrect: false },
      { id: 'D', text: 'Random order', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Problem-solution is ideal for persuasive speeches advocating change. First establish the problem, then present your policy as the solution.',
    standardsAlignment: ['ASHA.EXPRESSIVE.9-12'],
    difficulty: 0.5,
    cognitiveLevel: 'apply',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 10,
      wordCount: 18,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Pragmatics ──
  {
    id: 'speech-g912-prag-001',
    skillCode: 'SPEECH_PRAGMATICS',
    type: 'multiple-choice',
    stem: 'According to Grice\'s Maxims, what principle is violated when someone provides more information than necessary?',
    options: [
      { id: 'A', text: 'Maxim of Quality', isCorrect: false },
      { id: 'B', text: 'Maxim of Quantity', isCorrect: true },
      { id: 'C', text: 'Maxim of Relation', isCorrect: false },
      { id: 'D', text: 'Maxim of Manner', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The Maxim of Quantity states to provide the right amount of information—not too little, not too much. Over-explaining violates this principle.',
    standardsAlignment: ['ASHA.PRAGMATICS.9-12'],
    difficulty: 0.65,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 11,
      wordCount: 18,
      estimatedTimeSeconds: 35,
      contentRiskLevel: 'safe',
    },
  },
  // ── Fluency ──
  {
    id: 'speech-g912-flu-001',
    skillCode: 'SPEECH_FLUENCY',
    type: 'multiple-choice',
    stem: 'What is the term for strategic pauses in public speaking used to create emphasis or allow audience processing?',
    options: [
      { id: 'A', text: 'Filler words', isCorrect: false },
      { id: 'B', text: 'Dramatic pause', isCorrect: true },
      { id: 'C', text: 'Stuttering', isCorrect: false },
      { id: 'D', text: 'Hesitation', isCorrect: false, distractorType: 'plausible-alternative' },
    ],
    correctAnswer: 'B',
    explanation: 'Dramatic pauses are intentional silences used by skilled speakers to create emphasis, build suspense, or allow the audience to absorb key points.',
    standardsAlignment: ['ASHA.FLUENCY.9-12'],
    difficulty: 0.45,
    cognitiveLevel: 'understand',
    metadata: {
      source: 'curated-bank',
      generatedAt: '2024-01-01T00:00:00Z',
      readingLevel: 9,
      wordCount: 20,
      estimatedTimeSeconds: 30,
      contentRiskLevel: 'safe',
    },
  },
];

/**
 * Get all speech questions by grade band
 */
export function getSpeechQuestions(gradeBand: 'K5' | 'G6_8' | 'G9_12'): GeneratedQuestion[] {
  switch (gradeBand) {
    case 'K5':
      return SPEECH_K5;
    case 'G6_8':
      return SPEECH_G6_8;
    case 'G9_12':
      return SPEECH_G9_12;
    default:
      return SPEECH_G6_8;
  }
}

/**
 * Get speech questions by skill code
 */
export function getSpeechQuestionsBySkill(
  gradeBand: 'K5' | 'G6_8' | 'G9_12',
  skillCode: string
): GeneratedQuestion[] {
  return getSpeechQuestions(gradeBand).filter((q) => q.skillCode === skillCode);
}
