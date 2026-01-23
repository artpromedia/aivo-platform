/**
 * Baseline Question Generation Service
 *
 * AI-powered unique question generation for learner baseline assessments.
 * Generates personalized questions for each learner to accurately assess
 * their current skill levels across domains.
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GradeBand = 'PRE_K' | 'K5' | 'K_2' | 'GRADE_3_5' | 'G6_8' | 'GRADE_6_8' | 'G9_12' | 'GRADE_9_12';
export type BaselineDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL' | 'SPELLING' | 'CREATIVE_WRITING' | 'LIFE_SKILLS';

/**
 * Assessment Type based on parent assessment results (IDEA/504 aligned)
 * - STANDARD: Full assessment, grade-level questions
 * - STANDARD_WITH_ACCOMMODATIONS: Full content but with accommodations (extended time, breaks)
 * - MODIFIED: Simplified language, visual supports, fewer options
 * - ALTERNATE: Performance-based, functional skills focus, caregiver-assisted
 */
export type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';

export interface BaselineQuestionRequest {
  tenantId: string;
  learnerId: string;
  gradeBand: GradeBand;
  domain: BaselineDomain;
  skillCodes: string[];
  /** Optional seed for reproducible randomization (for testing) */
  seed?: string;
  /** Curriculum standards to align questions (e.g., ["TEKS", "COMMON_CORE"]) */
  curriculumStandards?: string[];
  /** Specific grade level for more precise question difficulty */
  gradeLevel?: number;
  /** State code for state-specific content (e.g., "TX", "CA") */
  stateCode?: string;
  /** Assessment type from parent assessment (determines language complexity, supports) */
  assessmentType?: AssessmentType;
  /** Specific accommodations to apply */
  accommodations?: string[];
  /** Areas of concern from parent assessment - helps focus question difficulty */
  areasOfConcern?: string[];
  /** Whether learner has an IEP */
  hasIep?: boolean;
  /** Whether learner has a 504 plan */
  has504?: boolean;
  /** Disability categories from parent assessment */
  disabilityCategories?: string[];
}

export interface BaselineQuestion {
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  questionText: string;
  options?: string[];
  correctAnswer: number | string;
  rubric?: string;
}

export interface BaselineQuestionResult {
  questions: BaselineQuestion[];
  generationId: string;
  learnerId: string;
  domain: BaselineDomain;
  gradeBand: GradeBand;
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL DESCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════

const SKILL_DESCRIPTIONS: Record<
  string,
  { name: string; description: string; sampleTopics: string[] }
> = {
  // ELA Skills
  ELA_PHONEMIC_AWARENESS: {
    name: 'Phonemic Awareness',
    description: 'Ability to identify and manipulate individual sounds in spoken words',
    sampleTopics: ['rhyming', 'syllable counting', 'initial sounds', 'blending sounds'],
  },
  ELA_FLUENCY: {
    name: 'Reading Fluency',
    description: 'Ability to read text accurately, quickly, and with proper expression',
    sampleTopics: ['sight words', 'reading rate', 'expression', 'punctuation reading'],
  },
  ELA_VOCABULARY: {
    name: 'Vocabulary',
    description: 'Knowledge of word meanings and ability to use context clues',
    sampleTopics: [
      'word definitions',
      'synonyms',
      'antonyms',
      'context clues',
      'word relationships',
    ],
  },
  ELA_COMPREHENSION: {
    name: 'Reading Comprehension',
    description: 'Ability to understand, analyze, and interpret text',
    sampleTopics: ['main idea', 'supporting details', 'inference', 'sequence', 'cause and effect'],
  },
  ELA_WRITING: {
    name: 'Writing Skills',
    description: 'Ability to express ideas clearly in written form',
    sampleTopics: ['sentence structure', 'paragraph organization', 'grammar', 'punctuation'],
  },

  // Math Skills
  MATH_NUMBER_SENSE: {
    name: 'Number Sense',
    description: 'Understanding of numbers, their relationships, and place value',
    sampleTopics: ['place value', 'number comparison', 'ordering numbers', 'rounding'],
  },
  MATH_OPERATIONS: {
    name: 'Operations',
    description: 'Ability to perform and understand arithmetic operations',
    sampleTopics: ['addition', 'subtraction', 'multiplication', 'division', 'order of operations'],
  },
  MATH_FRACTIONS: {
    name: 'Fractions & Decimals',
    description: 'Understanding of fractions, decimals, and their relationships',
    sampleTopics: ['fraction identification', 'equivalent fractions', 'decimals', 'conversions'],
  },
  MATH_GEOMETRY: {
    name: 'Geometry',
    description: 'Understanding of shapes, spatial relationships, and measurement',
    sampleTopics: ['shape identification', 'perimeter', 'area', 'angles', 'symmetry'],
  },
  MATH_PROBLEM_SOLVING: {
    name: 'Problem Solving',
    description: 'Ability to apply mathematical concepts to solve word problems',
    sampleTopics: ['word problems', 'multi-step problems', 'logical reasoning', 'patterns'],
  },

  // Science Skills
  SCI_OBSERVATION: {
    name: 'Scientific Observation',
    description: 'Ability to observe and describe natural phenomena',
    sampleTopics: ['using senses', 'recording observations', 'qualitative vs quantitative'],
  },
  SCI_HYPOTHESIS: {
    name: 'Hypothesis Formation',
    description: 'Ability to form testable predictions based on observations',
    sampleTopics: ['if-then statements', 'predictions', 'testable questions'],
  },
  SCI_EXPERIMENT: {
    name: 'Experimental Design',
    description: 'Understanding of how to design and conduct experiments',
    sampleTopics: ['variables', 'controls', 'fair tests', 'procedures'],
  },
  SCI_DATA: {
    name: 'Data Analysis',
    description: 'Ability to collect, organize, and interpret scientific data',
    sampleTopics: ['tables', 'graphs', 'measurements', 'patterns in data'],
  },
  SCI_CONCLUSION: {
    name: 'Drawing Conclusions',
    description: 'Ability to draw evidence-based conclusions from experiments',
    sampleTopics: ['evidence', 'reasoning', 'supporting claims', 'limitations'],
  },

  // Speech Skills
  SPEECH_ARTICULATION: {
    name: 'Articulation',
    description: 'Ability to produce speech sounds correctly',
    sampleTopics: ['consonant sounds', 'vowel sounds', 'blends', 'pronunciation'],
  },
  SPEECH_FLUENCY: {
    name: 'Speech Fluency',
    description: 'Smoothness and flow of speech production',
    sampleTopics: ['pacing', 'pausing', 'repetitions', 'prolongations'],
  },
  SPEECH_VOICE: {
    name: 'Voice Quality',
    description: 'Quality and characteristics of voice production',
    sampleTopics: ['volume', 'pitch', 'resonance', 'breath support'],
  },
  SPEECH_LANGUAGE: {
    name: 'Language Skills',
    description: 'Ability to understand and use language effectively',
    sampleTopics: ['vocabulary use', 'grammar in speech', 'sentence formation', 'word finding'],
  },
  SPEECH_PRAGMATICS: {
    name: 'Social Communication',
    description: 'Ability to use language appropriately in social contexts',
    sampleTopics: ['turn-taking', 'topic maintenance', 'nonverbal cues', 'audience awareness'],
  },

  // SEL Skills
  SEL_SELF_AWARENESS: {
    name: 'Self-Awareness',
    description: 'Ability to recognize own emotions, thoughts, and values',
    sampleTopics: [
      'identifying emotions',
      'self-reflection',
      'strengths and weaknesses',
      'confidence',
    ],
  },
  SEL_SELF_MANAGEMENT: {
    name: 'Self-Management',
    description: 'Ability to regulate emotions and behaviors',
    sampleTopics: ['impulse control', 'stress management', 'goal setting', 'organization'],
  },
  SEL_SOCIAL_AWARENESS: {
    name: 'Social Awareness',
    description: 'Ability to understand perspectives of others',
    sampleTopics: [
      'empathy',
      'respect for others',
      'diversity appreciation',
      'community awareness',
    ],
  },
  SEL_RELATIONSHIPS: {
    name: 'Relationship Skills',
    description: 'Ability to build and maintain healthy relationships',
    sampleTopics: ['communication', 'cooperation', 'conflict resolution', 'teamwork'],
  },
  SEL_DECISIONS: {
    name: 'Responsible Decision-Making',
    description: 'Ability to make constructive choices',
    sampleTopics: [
      'identifying problems',
      'evaluating consequences',
      'ethical responsibility',
      'seeking help',
    ],
  },
  
  // Spelling Skills
  SPELL_PATTERNS: {
    name: 'Spelling Patterns',
    description: 'Recognition and application of common spelling patterns',
    sampleTopics: ['vowel patterns', 'consonant blends', 'word families', 'suffixes', 'prefixes'],
  },
  SPELL_PHONICS: {
    name: 'Phonetic Spelling',
    description: 'Ability to spell words using sound-letter relationships',
    sampleTopics: ['phoneme-grapheme correspondence', 'silent letters', 'digraphs'],
  },
  SPELL_RULES: {
    name: 'Spelling Rules',
    description: 'Application of spelling rules and conventions',
    sampleTopics: ['doubling rules', 'plurals', 'changing y to i', 'dropping silent e'],
  },
  SPELL_SIGHT_WORDS: {
    name: 'Sight Words',
    description: 'Recognition and spelling of high-frequency words',
    sampleTopics: ['common words', 'irregular spellings', 'frequently used words'],
  },
  SPELL_COMPOUND: {
    name: 'Compound Words',
    description: 'Understanding and spelling compound words',
    sampleTopics: ['closed compounds', 'hyphenated compounds', 'open compounds'],
  },

  // Creative Writing Skills
  CW_STORY_ELEMENTS: {
    name: 'Story Elements',
    description: 'Understanding of basic narrative components',
    sampleTopics: ['beginning, middle, end', 'problem and solution', 'narrative arc'],
  },
  CW_CHARACTER: {
    name: 'Character Development',
    description: 'Creating and describing characters in writing',
    sampleTopics: ['character traits', 'dialogue', 'motivation', 'relationships'],
  },
  CW_SETTING: {
    name: 'Setting Description',
    description: 'Describing time, place, and atmosphere in writing',
    sampleTopics: ['location details', 'time period', 'mood', 'sensory details'],
  },
  CW_DESCRIPTIVE: {
    name: 'Descriptive Writing',
    description: 'Using vivid language and sensory details',
    sampleTopics: ['adjectives', 'adverbs', 'metaphors', 'similes', 'imagery'],
  },
  CW_IMAGINATION: {
    name: 'Creative Imagination',
    description: 'Ability to generate original ideas for stories',
    sampleTopics: ['brainstorming', 'what-if scenarios', 'fantasy elements', 'creativity'],
  },

  // Life Skills
  LIFE_TIME: {
    name: 'Time Management',
    description: 'Understanding time concepts and scheduling',
    sampleTopics: ['reading clocks', 'calendars', 'daily routines', 'schedules'],
  },
  LIFE_MONEY: {
    name: 'Money Skills',
    description: 'Basic financial literacy and money handling',
    sampleTopics: ['coin identification', 'making change', 'basic budgeting', 'saving'],
  },
  LIFE_SAFETY: {
    name: 'Safety Awareness',
    description: 'Understanding personal and community safety',
    sampleTopics: ['crossing streets', 'stranger safety', 'emergency numbers', 'fire safety'],
  },
  LIFE_HYGIENE: {
    name: 'Personal Hygiene',
    description: 'Understanding health and hygiene practices',
    sampleTopics: ['hand washing', 'dental care', 'bathing', 'grooming'],
  },
  LIFE_ORGANIZATION: {
    name: 'Organization Skills',
    description: 'Ability to organize belongings and tasks',
    sampleTopics: ['keeping things tidy', 'following routines', 'task completion', 'planning'],
  },
};

/**
 * Assessment type specific guidance for question generation
 */
const ASSESSMENT_TYPE_GUIDANCE: Record<AssessmentType, { 
  description: string; 
  languageLevel: string;
  questionFormat: string;
  supportFeatures: string[];
}> = {
  STANDARD: {
    description: 'Standard grade-level assessment',
    languageLevel: 'Age-appropriate vocabulary and sentence complexity',
    questionFormat: 'Standard multiple choice with 4 options',
    supportFeatures: [],
  },
  STANDARD_WITH_ACCOMMODATIONS: {
    description: 'Standard content with accommodation support',
    languageLevel: 'Age-appropriate vocabulary with clear, direct language',
    questionFormat: 'Standard multiple choice with 4 options, clearly formatted',
    supportFeatures: ['Clear visual layout', 'Extra white space', 'Larger text compatibility'],
  },
  MODIFIED: {
    description: 'Modified assessment with simplified language and supports',
    languageLevel: 'Simplified vocabulary, shorter sentences, concrete language only',
    questionFormat: 'Multiple choice with 3 options maximum, visual supports encouraged',
    supportFeatures: [
      'Simplified language (2-3 grade levels below)',
      'Concrete examples only',
      'Visual supports and pictures',
      'Reduced answer choices (3 instead of 4)',
      'Short, simple sentences',
      'Avoid idioms and figurative language',
    ],
  },
  ALTERNATE: {
    description: 'Alternate assessment for significant cognitive disabilities',
    languageLevel: 'Very simple vocabulary, single-step instructions, functional language',
    questionFormat: 'Simple choice (2-3 options), picture-based when possible, functional focus',
    supportFeatures: [
      'Very simple language',
      'Functional life skills focus',
      'Picture/symbol supports',
      '2-3 answer choices maximum',
      'Single-step questions',
      'Observable behaviors',
      'Caregiver/teacher assistance noted',
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// EVIDENCE-BASED NEURODIVERSE TEACHING STRATEGIES
// Based on research from: National Center on Educational Outcomes, Council for
// Exceptional Children, International Dyslexia Association, CHADD, Autism Society
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Evidence-based teaching strategies for neurodiverse learners.
 * These strategies are incorporated into question design and presentation
 * to maximize learning effectiveness for each disability category.
 */
const NEURODIVERSE_TEACHING_STRATEGIES: Record<string, {
  description: string;
  questionDesignPrinciples: string[];
  presentationStrategies: string[];
  languageGuidelines: string[];
  avoidPatterns: string[];
}> = {
  // Autism Spectrum Disorder (ASD)
  autism: {
    description: 'Autism Spectrum Disorder - Focus on predictability, concrete language, and clear structure',
    questionDesignPrinciples: [
      'Use explicit, literal language - avoid idioms, sarcasm, and figurative speech',
      'Provide clear, predictable structure with consistent formatting',
      'Break complex questions into single-concept steps',
      'Include visual supports and concrete examples',
      'Use specific rather than general terms',
    ],
    presentationStrategies: [
      'Maintain consistent visual layout across questions',
      'Use bullet points and numbered lists for clarity',
      'Provide advance organizers explaining what to expect',
      'Allow processing time without time pressure',
      'Minimize sensory distractions in question presentation',
    ],
    languageGuidelines: [
      'Use concrete, specific vocabulary',
      'Say exactly what you mean - no hidden meanings',
      'Avoid open-ended questions when possible',
      'Provide clear examples of expected responses',
      'Use "first/then" sequential language',
    ],
    avoidPatterns: [
      'Idioms (e.g., "piece of cake", "raining cats and dogs")',
      'Sarcasm or implied meanings',
      'Vague pronouns without clear antecedents',
      'Questions requiring inference of social cues',
      'Unexpected format changes',
    ],
  },

  // Attention Deficit Hyperactivity Disorder (ADHD)
  adhd: {
    description: 'ADHD - Focus on engagement, chunking, and executive function support',
    questionDesignPrinciples: [
      'Keep questions concise and focused on one concept',
      'Use engaging, high-interest contexts',
      'Chunk information into manageable pieces',
      'Highlight key information visually',
      'Provide clear start/stop points',
    ],
    presentationStrategies: [
      'Use bold or color to highlight important words',
      'Break long passages into shorter paragraphs',
      'Include movement or interactive elements where possible',
      'Provide frequent feedback and encouragement',
      'Use timers/progress indicators to support pacing',
    ],
    languageGuidelines: [
      'Use action-oriented, dynamic language',
      'Keep sentences under 15 words',
      'Front-load important information',
      'Use active voice rather than passive',
      'Include engaging hooks and real-world connections',
    ],
    avoidPatterns: [
      'Long, dense text blocks',
      'Multiple concepts in one question',
      'Monotonous or repetitive formats',
      'Excessive distractors in answer choices',
      'Open-ended questions without clear boundaries',
    ],
  },

  // Dyslexia and Reading Disabilities
  dyslexia: {
    description: 'Dyslexia - Focus on multi-sensory approaches, phonetic support, and visual clarity',
    questionDesignPrinciples: [
      'Use dyslexia-friendly fonts and spacing',
      'Include audio support options for text',
      'Avoid visually confusing letter combinations (b/d, p/q)',
      'Use phonetically regular words when possible',
      'Provide visual context alongside text',
    ],
    presentationStrategies: [
      'Use left-aligned text (not justified)',
      'Provide generous line spacing (1.5-2x)',
      'Use cream/off-white backgrounds instead of pure white',
      'Keep text lines short (60-70 characters max)',
      'Offer text-to-speech options',
    ],
    languageGuidelines: [
      'Use familiar, high-frequency words',
      'Avoid complex word patterns or silent letters',
      'Use consistent vocabulary throughout',
      'Break compound sentences into simple ones',
      'Repeat key terms rather than using synonyms',
    ],
    avoidPatterns: [
      'Words with similar visual patterns (was/saw, on/no)',
      'Dense text without visual breaks',
      'Serif fonts or decorative typefaces',
      'Small font sizes',
      'Red/green color coding (often hard to distinguish)',
    ],
  },

  // Dyscalculia and Math Learning Disabilities
  dyscalculia: {
    description: 'Dyscalculia - Focus on concrete representations, visual math, and step-by-step approaches',
    questionDesignPrinciples: [
      'Include visual representations of quantities',
      'Break multi-step problems into explicit single steps',
      'Use real-world, concrete contexts for math',
      'Provide number lines and visual aids',
      'Minimize working memory demands',
    ],
    presentationStrategies: [
      'Show math problems vertically when possible',
      'Use grid paper or structured layouts',
      'Include manipulative-based representations',
      'Highlight operation signs clearly',
      'Provide worked examples before practice',
    ],
    languageGuidelines: [
      'Explicitly state what operation is needed',
      'Use consistent math vocabulary',
      'Avoid word problems with unnecessary narrative',
      'Define math terms in context',
      'Use "math to English" translations',
    ],
    avoidPatterns: [
      'Problems requiring mental math',
      'Crowded number arrangements',
      'Mixing different operations without clear cues',
      'Abstract number concepts without visuals',
      'Timed math fact drills',
    ],
  },

  // Speech and Language Impairments
  speech_language: {
    description: 'Speech/Language Impairment - Focus on visual supports, simplified language, and alternative response options',
    questionDesignPrinciples: [
      'Provide visual cues alongside verbal content',
      'Use simplified, direct sentence structures',
      'Offer multiple response modalities (pointing, selecting)',
      'Reduce vocabulary complexity',
      'Allow extra processing time',
    ],
    presentationStrategies: [
      'Include pictures, symbols, or icons',
      'Use AAC-compatible formats',
      'Provide sentence starters for open responses',
      'Model expected responses visually',
      'Allow voice or typing alternatives',
    ],
    languageGuidelines: [
      'Use simple subject-verb-object structures',
      'Avoid complex grammatical constructions',
      'Repeat key information in different ways',
      'Use high-frequency vocabulary',
      'Provide context clues for new words',
    ],
    avoidPatterns: [
      'Complex syntax or embedded clauses',
      'Abstract or technical vocabulary',
      'Questions requiring verbal-only responses',
      'Rapid-fire question sequences',
      'Phonetically complex words',
    ],
  },

  // Intellectual/Developmental Disabilities
  intellectual: {
    description: 'Intellectual Disability - Focus on functional skills, concrete examples, and scaffolded support',
    questionDesignPrinciples: [
      'Focus on functional, life-relevant skills',
      'Use very concrete, observable concepts',
      'Provide step-by-step scaffolding',
      'Limit answer choices to 2-3 options',
      'Include real-life photos and examples',
    ],
    presentationStrategies: [
      'Use picture-based questions when possible',
      'Pair text with visual symbols',
      'Provide immediate feedback',
      'Use familiar, everyday contexts',
      'Allow demonstration-based responses',
    ],
    languageGuidelines: [
      'Use very simple vocabulary',
      'Single-step instructions only',
      'Avoid abstract concepts',
      'Use consistent, predictable language patterns',
      'Connect to personal experience',
    ],
    avoidPatterns: [
      'Multi-step reasoning',
      'Abstract or hypothetical scenarios',
      'Complex vocabulary',
      'Time-sensitive questions',
      'Questions requiring generalization',
    ],
  },

  // Emotional/Behavioral Disorders
  emotional: {
    description: 'Emotional/Behavioral Disorder - Focus on positive framing, choice, and anxiety reduction',
    questionDesignPrinciples: [
      'Use positive, encouraging language',
      'Provide choice and control where possible',
      'Break tasks into small, achievable steps',
      'Reduce anxiety through familiar formats',
      'Include calming visual design',
    ],
    presentationStrategies: [
      'Start with easier questions to build confidence',
      'Provide progress indicators',
      'Use calming colors (blues, greens)',
      'Include self-regulation check-ins',
      'Offer breaks as part of assessment structure',
    ],
    languageGuidelines: [
      'Use growth mindset language',
      'Avoid language that feels judgmental',
      'Provide clear expectations',
      'Use "I" statements in examples',
      'Normalize challenge as part of learning',
    ],
    avoidPatterns: [
      'High-pressure language',
      'Comparison to others',
      'Unexpected or startling content',
      'Themes involving conflict or distress',
      'Questions that feel personal or invasive',
    ],
  },

  // Executive Function Difficulties
  executive_function: {
    description: 'Executive Function Challenges - Focus on organization, planning support, and working memory scaffolds',
    questionDesignPrinciples: [
      'Provide clear organizational structure',
      'Minimize working memory demands',
      'Include step-by-step guidance',
      'Use visual organizers and checklists',
      'Highlight key information',
    ],
    presentationStrategies: [
      'Number steps explicitly',
      'Provide scratch space or note areas',
      'Use color coding for organization',
      'Show progress through tasks',
      'Include planning prompts',
    ],
    languageGuidelines: [
      'Use explicit transitional language',
      'State the goal clearly at the beginning',
      'Provide "what you need to do" summaries',
      'Use numbered or bulleted lists',
      'Repeat key information at relevant points',
    ],
    avoidPatterns: [
      'Implicit instructions',
      'Questions requiring planning without support',
      'Multiple pieces of information to hold in memory',
      'Long delays between question parts',
      'Assumptions about prior organization',
    ],
  },

  // Sensory Processing Differences
  sensory: {
    description: 'Sensory Processing Differences - Focus on clean design, predictable layouts, and sensory modulation',
    questionDesignPrinciples: [
      'Use clean, uncluttered visual design',
      'Maintain consistent layouts',
      'Provide options for sensory preferences',
      'Avoid sudden changes or surprises',
      'Use muted colors and simple graphics',
    ],
    presentationStrategies: [
      'Minimize visual "noise" and decorations',
      'Use consistent, predictable formatting',
      'Provide adjustable display options',
      'Allow for sensory breaks',
      'Offer alternative sensory modalities',
    ],
    languageGuidelines: [
      'Clear, simple language without excessive description',
      'Avoid sensory-heavy imagery that may distract',
      'Use straightforward explanations',
      'Provide content warnings for potentially triggering content',
      'Maintain calm, neutral tone',
    ],
    avoidPatterns: [
      'Busy backgrounds or animations',
      'Sudden sounds or visual changes',
      'Complex visual patterns',
      'Overwhelming amounts of information',
      'Bright, high-contrast colors',
    ],
  },
};

/**
 * Maps areas of concern keywords to disability categories for strategy selection
 */
const CONCERN_TO_CATEGORY_MAP: Record<string, string[]> = {
  // ADHD-related concerns
  'attention': ['adhd'],
  'focus': ['adhd'],
  'hyperactivity': ['adhd'],
  'impulsivity': ['adhd'],
  'distracted': ['adhd'],
  'concentration': ['adhd'],
  'sitting still': ['adhd'],
  
  // Autism-related concerns
  'autism': ['autism'],
  'asd': ['autism'],
  'social skills': ['autism', 'emotional'],
  'repetitive': ['autism'],
  'routines': ['autism'],
  'transitions': ['autism', 'executive_function'],
  'sensory': ['sensory', 'autism'],
  'literal': ['autism'],
  
  // Dyslexia/Reading concerns
  'reading': ['dyslexia'],
  'dyslexia': ['dyslexia'],
  'spelling': ['dyslexia'],
  'letters': ['dyslexia'],
  'decoding': ['dyslexia'],
  'phonics': ['dyslexia'],
  'words': ['dyslexia'],
  
  // Math concerns
  'math': ['dyscalculia'],
  'numbers': ['dyscalculia'],
  'calculation': ['dyscalculia'],
  'dyscalculia': ['dyscalculia'],
  'counting': ['dyscalculia'],
  'arithmetic': ['dyscalculia'],
  
  // Speech/Language concerns
  'speech': ['speech_language'],
  'language': ['speech_language'],
  'articulation': ['speech_language'],
  'stuttering': ['speech_language'],
  'communication': ['speech_language', 'autism'],
  'vocabulary': ['speech_language'],
  'expressive': ['speech_language'],
  'receptive': ['speech_language'],
  
  // Emotional/Behavioral concerns
  'anxiety': ['emotional'],
  'behavior': ['emotional'],
  'emotional': ['emotional'],
  'regulation': ['emotional', 'executive_function'],
  'anger': ['emotional'],
  'depression': ['emotional'],
  'meltdowns': ['emotional', 'sensory'],
  
  // Executive function concerns
  'organization': ['executive_function'],
  'planning': ['executive_function'],
  'memory': ['executive_function'],
  'working memory': ['executive_function'],
  'following directions': ['executive_function', 'speech_language'],
  'time management': ['executive_function'],
  'task completion': ['executive_function'],
  
  // Intellectual concerns
  'developmental': ['intellectual'],
  'intellectual': ['intellectual'],
  'cognitive': ['intellectual'],
  'slow learner': ['intellectual'],
  'global delay': ['intellectual'],
};

const GRADE_BAND_DESCRIPTIONS: Record<
  GradeBand,
  { grades: string; ageRange: string; complexity: string }
> = {
  PRE_K: {
    grades: 'Pre-Kindergarten',
    ageRange: '3-5 years old',
    complexity: 'Very simple language, concrete concepts, picture-based, play-focused',
  },
  K_2: {
    grades: 'Kindergarten through 2nd grade',
    ageRange: '5-8 years old',
    complexity: 'Simple language, concrete concepts, visual/hands-on focus, short sentences',
  },
  K5: {
    grades: 'Kindergarten through 5th grade',
    ageRange: '5-11 years old',
    complexity: 'Simple language, concrete concepts, visual/hands-on focus',
  },
  GRADE_3_5: {
    grades: '3rd through 5th grade',
    ageRange: '8-11 years old',
    complexity: 'Age-appropriate language, some abstract concepts, multi-step reasoning',
  },
  G6_8: {
    grades: '6th through 8th grade',
    ageRange: '11-14 years old',
    complexity: 'Moderate complexity, abstract thinking introduced, multi-step problems',
  },
  GRADE_6_8: {
    grades: '6th through 8th grade',
    ageRange: '11-14 years old',
    complexity: 'Moderate complexity, abstract thinking introduced, multi-step problems',
  },
  G9_12: {
    grades: '9th through 12th grade',
    ageRange: '14-18 years old',
    complexity: 'Advanced concepts, critical thinking, complex analysis',
  },
  GRADE_9_12: {
    grades: '9th through 12th grade',
    ageRange: '14-18 years old',
    complexity: 'Advanced concepts, critical thinking, complex analysis',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// CURRICULUM STANDARDS GUIDANCE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Guidance for question generation based on curriculum standards
 */
const CURRICULUM_GUIDANCE: Record<string, string> = {
  TEKS: 'Texas Essential Knowledge and Skills - Emphasize practical application, Texas history/geography context where relevant, explicit skill progressions',
  COMMON_CORE: 'Common Core State Standards - Focus on deep understanding, reasoning, and evidence-based responses. Emphasize analytical thinking.',
  NGSS: 'Next Generation Science Standards - Focus on three-dimensional learning: practices, crosscutting concepts, and disciplinary core ideas',
  C3: 'College, Career, and Civic Life Framework - Emphasize inquiry-based social studies, civic participation, and evidence evaluation',
  SOL: 'Virginia Standards of Learning - Focus on specific content knowledge and skill benchmarks',
  'B.E.S.T': 'Florida Benchmarks for Excellent Student Thinking - Emphasize math fluency and explicit ELA skills',
  IAS: 'Indiana Academic Standards - Focus on clear learning progressions and practical applications',
  OAS: 'Oklahoma Academic Standards - Balance conceptual understanding with procedural fluency',
  SCCCR: 'South Carolina College and Career Ready Standards - Emphasize college and career readiness skills',
};

/**
 * State-specific notes for localized content
 */
const STATE_CURRICULUM_NOTES: Record<string, string> = {
  TX: 'Include references to Texas geography, history, and culture where appropriate. Use TEKS terminology.',
  CA: 'Include diverse cultural references. Align with California Content Standards where possible.',
  NY: 'Reference New York state contexts. Align with NY Learning Standards.',
  FL: 'Use Florida B.E.S.T. standards terminology. Include Florida-relevant contexts.',
  VA: 'Align with Virginia SOL expectations. Include Virginia historical references where appropriate.',
  IL: 'Include Midwest regional contexts. Align with Illinois Learning Standards.',
  PA: 'Reference Pennsylvania history and geography where relevant.',
  OH: 'Include Ohio-specific contexts. Align with Ohio Learning Standards.',
  GA: 'Include Georgia contexts. Align with Georgia Standards of Excellence.',
  NC: 'Align with NC Standard Course of Study.',
};

const BASELINE_SYSTEM_PROMPT = `You are an expert educational assessment designer creating baseline diagnostic questions.

Your goal is to generate questions that accurately assess a learner's current skill level without teaching.

Key principles:
1. Questions must be diagnostic, not instructional
2. Language should be grade-appropriate
3. Questions should be unambiguous with clear correct answers
4. Multiple choice options should include plausible distractors based on common misconceptions
5. Questions should be engaging and accessible
6. Each question should uniquely test the specified skill
7. Avoid trick questions or unnecessarily complex wording`;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class BaselineQuestionGenerationService {
  constructor(private readonly llm: LLMOrchestrator) {}

  /**
   * Generate unique baseline questions for a learner
   */
  async generateQuestions(request: BaselineQuestionRequest): Promise<BaselineQuestionResult> {
    const generationId = uuidv4();
    const startTime = Date.now();

    console.info('Starting baseline question generation', {
      generationId,
      learnerId: request.learnerId,
      domain: request.domain,
      gradeBand: request.gradeBand,
      skillCount: request.skillCodes.length,
    });

    try {
      incrementCounter('baseline_question_generation.started');

      const prompt = this.buildPrompt(request, generationId);
      const messages: LLMMessage[] = [
        { role: 'system', content: BASELINE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.8, // Higher temperature for more variety
        maxTokens: 4000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.learnerId,
          agentType: 'BASELINE',
        },
      });

      const questions = this.parseResponse(result.content, request.skillCodes);
      const validQuestions = this.validateAndFixQuestions(questions, request.skillCodes);

      // Randomize answer option order for each question
      const randomizedQuestions = this.randomizeOptions(validQuestions, request.seed);

      const latencyMs = Date.now() - startTime;
      recordHistogram('baseline_question_generation.duration', latencyMs);
      incrementCounter('baseline_question_generation.success');

      console.info('Baseline question generation completed', {
        generationId,
        learnerId: request.learnerId,
        generated: randomizedQuestions.length,
        latencyMs,
      });

      return {
        questions: randomizedQuestions,
        generationId,
        learnerId: request.learnerId,
        domain: request.domain,
        gradeBand: request.gradeBand,
      };
    } catch (error) {
      incrementCounter('baseline_question_generation.error');
      console.error('Baseline question generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(request: BaselineQuestionRequest, generationId: string): string {
    const gradeBandInfo = GRADE_BAND_DESCRIPTIONS[request.gradeBand] || GRADE_BAND_DESCRIPTIONS['K5'];
    const assessmentType = request.assessmentType || 'STANDARD';
    const typeGuidance = ASSESSMENT_TYPE_GUIDANCE[assessmentType];

    const parts: string[] = [
      `Generate ${request.skillCodes.length} unique baseline assessment questions for a learner.`,
      '',
      '═══ CONTEXT ═══',
      `Domain: ${request.domain}`,
      `Grade Band: ${gradeBandInfo.grades} (${gradeBandInfo.ageRange})`,
      `Complexity Level: ${gradeBandInfo.complexity}`,
    ];

    // Add specific grade level if provided
    if (request.gradeLevel !== undefined) {
      parts.push(`Specific Grade Level: Grade ${request.gradeLevel}`);
    }

    // Add assessment type context (CRITICAL for IDEA/504 compliance)
    parts.push(
      '',
      '═══ ASSESSMENT TYPE (CRITICAL) ═══',
      `Type: ${assessmentType}`,
      `Description: ${typeGuidance.description}`,
      `Language Level: ${typeGuidance.languageLevel}`,
      `Question Format: ${typeGuidance.questionFormat}`
    );

    if (typeGuidance.supportFeatures.length > 0) {
      parts.push('Support Features Required:');
      typeGuidance.supportFeatures.forEach((feature, idx) => {
        parts.push(`  ${idx + 1}. ${feature}`);
      });
    }

    // Add specific accommodations if provided
    if (request.accommodations && request.accommodations.length > 0) {
      parts.push('', 'Specific Accommodations:', ...request.accommodations.map(a => `  - ${a}`));
    }

    // Add IEP/504 context - important for understanding learner needs
    if (request.hasIep || request.has504) {
      parts.push('', '═══ LEARNER SUPPORT CONTEXT ═══');
      if (request.hasIep) {
        parts.push('- Learner has an Individualized Education Program (IEP)');
      }
      if (request.has504) {
        parts.push('- Learner has a Section 504 Plan');
      }
    }

    // Add areas of concern from parent assessment
    if (request.areasOfConcern && request.areasOfConcern.length > 0) {
      parts.push(
        '',
        '═══ PARENT-IDENTIFIED AREAS OF CONCERN ═══',
        'The parent/caregiver has noted the following areas where the learner may need support:',
        ...request.areasOfConcern.map(area => `  - ${area}`),
        '',
        'Consider these when calibrating question difficulty. Start with accessible questions to build confidence.'
      );
    }

    // Add neurodiverse teaching strategies based on disability categories and concerns
    this.addNeurodiverseStrategies(parts, request);

    // Add curriculum standards context
    this.addCurriculumContext(parts, request);

    // Add generation metadata
    parts.push(
      '',
      `Unique Generation ID: ${generationId}`,
      `Learner ID: ${request.learnerId}`,
      '',
      '═══ SKILLS TO ASSESS ═══'
    );

    // Add skill descriptions
    this.addSkillDescriptions(parts, request.skillCodes);

    // Determine requirements based on assessment type
    const optionCount = assessmentType === 'ALTERNATE' ? '2-3' : assessmentType === 'MODIFIED' ? '3' : '4';
    const optionLabels = assessmentType === 'ALTERNATE' ? '(A, B, or C)' : assessmentType === 'MODIFIED' ? '(A, B, C)' : '(A, B, C, D)';

    // Add requirements and format
    parts.push(
      '',
      '═══ REQUIREMENTS ═══',
      '1. Generate exactly ONE question per skill code',
      '2. Each question must be unique (do not reuse questions from previous assessments)',
      `3. Multiple choice questions should have ${optionCount} options ${optionLabels}`,
      '4. Include 1-2 OPEN_ENDED questions for writing/verbal skills if appropriate (skip for ALTERNATE type)',
      `5. For MULTIPLE_CHOICE: correctAnswer is the index (0-${assessmentType === 'ALTERNATE' ? 2 : assessmentType === 'MODIFIED' ? 2 : 3}) of the correct option`,
      '6. For OPEN_ENDED: correctAnswer is a sample correct response, include a rubric',
      '7. Make distractors plausible - based on common misconceptions',
      `8. Language must be appropriate for ${assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE' ? 'simplified accessibility' : 'the grade band'}`,
      '9. Questions should be clear, concise, and unambiguous',
      '',
      '═══ CRITICAL: ANSWER CORRECTNESS ═══',
      '- VERIFY that the correctAnswer index points to the ACTUALLY CORRECT answer',
      '- For math: Double-check your arithmetic! If 2x + 5 = 11, then x = 3 (verify: 2*3 + 5 = 11)',
      '- The correct answer MUST be included in the options array',
      '- Options should be just the answer values, NOT prefixed with "Option A:" or "A."',
      '- Example: options: ["3", "5", "7", "9"] NOT ["Option A: 3", "Option B: 5", ...]'
    );

    // Add assessment-type specific requirements
    if (assessmentType === 'MODIFIED') {
      parts.push(
        '10. Use simple, concrete vocabulary - avoid abstract concepts',
        '11. Keep sentences short (under 15 words)',
        '12. Avoid idioms, metaphors, and figurative language',
        '13. Consider adding picture/visual cues in question descriptions'
      );
    } else if (assessmentType === 'ALTERNATE') {
      parts.push(
        '10. Focus on functional, real-life applications',
        '11. Use single-step instructions only',
        '12. Questions should assess observable skills',
        '13. Include only 2-3 very distinct answer choices',
        '14. Consider performance-based alternatives where appropriate'
      );
    }

    parts.push(
      '',
      '═══ RESPONSE FORMAT ═══',
      'Respond with valid JSON:',
      this.getResponseFormatExample(assessmentType)
    );

    return parts.join('\n');
  }

  /**
   * Add curriculum context to prompt parts
   */
  private addCurriculumContext(parts: string[], request: BaselineQuestionRequest): void {
    if (!request.curriculumStandards || request.curriculumStandards.length === 0) {
      return;
    }

    parts.push(
      '',
      '═══ CURRICULUM ALIGNMENT ═══',
      `Standards: ${request.curriculumStandards.join(', ')}`
    );

    // Add curriculum-specific guidance
    for (const standard of request.curriculumStandards) {
      const guidance = CURRICULUM_GUIDANCE[standard];
      if (guidance) {
        parts.push(`${standard} Focus: ${guidance}`);
      }
    }

    if (request.stateCode) {
      parts.push(`State: ${request.stateCode}`);
      const stateGuidance = STATE_CURRICULUM_NOTES[request.stateCode];
      if (stateGuidance) {
        parts.push(`State Notes: ${stateGuidance}`);
      }
    }
  }

  /**
   * Add evidence-based neurodiverse teaching strategies to prompt parts.
   * This method infers disability categories from areas of concern, explicit categories,
   * and assessment type to include targeted, research-backed teaching strategies.
   */
  private addNeurodiverseStrategies(parts: string[], request: BaselineQuestionRequest): void {
    // Collect applicable disability categories
    const categories = new Set<string>();

    // Add explicitly specified disability categories
    if (request.disabilityCategories) {
      for (const cat of request.disabilityCategories) {
        const normalizedCat = cat.toLowerCase().replace(/[^a-z]/g, '_');
        if (NEURODIVERSE_TEACHING_STRATEGIES[normalizedCat]) {
          categories.add(normalizedCat);
        }
      }
    }

    // Infer categories from areas of concern
    if (request.areasOfConcern) {
      for (const concern of request.areasOfConcern) {
        const normalizedConcern = concern.toLowerCase();
        for (const [keyword, cats] of Object.entries(CONCERN_TO_CATEGORY_MAP)) {
          if (normalizedConcern.includes(keyword)) {
            cats.forEach(cat => categories.add(cat));
          }
        }
      }
    }

    // Infer from assessment type
    if (request.assessmentType === 'ALTERNATE') {
      categories.add('intellectual');
    } else if (request.assessmentType === 'MODIFIED' && (request.hasIep || request.has504)) {
      // Modified assessment often indicates learning disabilities
      categories.add('executive_function');
    }

    // If no categories identified but has IEP/504, add general executive function support
    if (categories.size === 0 && (request.hasIep || request.has504)) {
      categories.add('executive_function');
    }

    // If no neurodiverse categories apply, return early
    if (categories.size === 0) {
      return;
    }

    parts.push(
      '',
      '═══ NEURODIVERSE TEACHING STRATEGIES (EVIDENCE-BASED) ═══',
      'Apply the following research-backed strategies to make questions effective for this learner:',
      ''
    );

    // Add strategies for each applicable category
    for (const category of categories) {
      const strategies = NEURODIVERSE_TEACHING_STRATEGIES[category];
      if (!strategies) continue;

      parts.push(
        `▸ ${strategies.description}`,
        ''
      );

      // Add top question design principles (limit to 3 for prompt length)
      parts.push('  Question Design:');
      strategies.questionDesignPrinciples.slice(0, 3).forEach(principle => {
        parts.push(`    • ${principle}`);
      });

      // Add top language guidelines (limit to 2 for prompt length)
      parts.push('  Language Guidelines:');
      strategies.languageGuidelines.slice(0, 2).forEach(guideline => {
        parts.push(`    • ${guideline}`);
      });

      // Add patterns to avoid (limit to 2 for prompt length)
      parts.push('  AVOID:');
      strategies.avoidPatterns.slice(0, 2).forEach(pattern => {
        parts.push(`    ✗ ${pattern}`);
      });

      parts.push('');
    }

    // Add summary guidance
    parts.push(
      'IMPORTANT: These strategies are based on research from the National Center on Educational',
      'Outcomes, Council for Exceptional Children, and disability-specific organizations.',
      'Apply them thoughtfully to maximize the learner\'s ability to demonstrate their knowledge.',
      ''
    );
  }

  /**
   * Add skill descriptions to prompt parts
   */
  private addSkillDescriptions(parts: string[], skillCodes: string[]): void {
    for (const skillCode of skillCodes) {
      const skill = SKILL_DESCRIPTIONS[skillCode];
      if (skill) {
        parts.push(
          `\n${skillCode}:`,
          `  Name: ${skill.name}`,
          `  Description: ${skill.description}`,
          `  Sample Topics: ${skill.sampleTopics.join(', ')}`
        );
      } else {
        parts.push(`\n${skillCode}: (custom skill)`);
      }
    }
  }

  /**
   * Get the response format example JSON based on assessment type
   */
  private getResponseFormatExample(assessmentType: AssessmentType = 'STANDARD'): string {
    // Use realistic example options (NOT "Option A", "Option B" - those are placeholders!)
    // The LLM should generate actual answer content
    const mathExample = assessmentType === 'ALTERNATE' 
      ? ['Yes', 'No', 'Help me']
      : assessmentType === 'MODIFIED'
        ? ['3', '5', '7']
        : ['12', '15', '18', '21'];

    const examples: Array<{ skillCode: string; questionType: string; questionText: string; options?: string[]; correctAnswer: number | string; rubric?: string }> = [
      {
        skillCode: 'MATH_NUMBER_SENSE',
        questionType: 'MULTIPLE_CHOICE',
        questionText: assessmentType === 'ALTERNATE' 
          ? 'Can you count to 5?' 
          : assessmentType === 'MODIFIED'
            ? 'What is 2 + 1?'
            : 'What is 7 + 5?',
        options: mathExample,
        correctAnswer: 0  // The FIRST option must be the correct answer
      }
    ];

    // Only include open-ended for STANDARD types
    if (assessmentType === 'STANDARD' || assessmentType === 'STANDARD_WITH_ACCOMMODATIONS') {
      examples.push({
        skillCode: 'SKILL_CODE',
        questionType: 'OPEN_ENDED',
        questionText: 'The open-ended question here?',
        correctAnswer: 'Sample correct response',
        rubric: 'Scoring rubric for evaluating responses'
      });
    }

    return JSON.stringify({ questions: examples }, null, 2);
  }

  /**
   * Clean option text by removing common prefixes like "Option A:", "A.", "A)", etc.
   */
  private cleanOptionText(option: string): string {
    if (typeof option !== 'string') return String(option);
    // Remove prefixes like "Option A:", "Option B:", "A.", "B)", "1.", "1)", etc.
    return option
      .replace(/^Option\s*[A-Da-d]\s*[:.)/-]?\s*/i, '')
      .replace(/^[A-Da-d]\s*[:.)/-]\s*/i, '')
      .replace(/^[1-4]\s*[:.)/-]\s*/i, '')
      .trim();
  }

  /**
   * Parse the LLM response into questions
   */
  private parseResponse(content: string, expectedSkillCodes: string[]): BaselineQuestion[] {
    try {
      // Extract JSON from response
      const jsonMatch = /\{[\s\S]*\}/.exec(content);
      if (!jsonMatch) {
        console.warn('No JSON found in baseline question response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as { questions?: unknown[] };
      const rawQuestions = parsed.questions ?? [];

      return rawQuestions.map((q) => {
        const question = q as Record<string, unknown>;
        const questionType =
          (question.questionType as string) === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE';

        // Clean option texts to remove prefixes
        let options: string[] | undefined;
        if (questionType === 'MULTIPLE_CHOICE') {
          const rawOptions = (question.options as string[]) ?? ['A', 'B', 'C', 'D'];
          options = rawOptions.map(opt => this.cleanOptionText(opt));
        }

        return {
          skillCode: (question.skillCode as string) ?? expectedSkillCodes[0],
          questionType,
          questionText: (question.questionText as string) ?? '',
          options,
          correctAnswer: (question.correctAnswer as number | string) ?? 0,
          rubric: questionType === 'OPEN_ENDED' ? (question.rubric as string) : undefined,
        };
      });
    } catch (error) {
      console.error('Failed to parse baseline question response', { error });
      return [];
    }
  }

  /**
   * Validate questions and fill in missing ones
   */
  private validateAndFixQuestions(
    questions: BaselineQuestion[],
    expectedSkillCodes: string[]
  ): BaselineQuestion[] {
    const result: BaselineQuestion[] = [];
    const coveredSkills = new Set<string>();

    // Add valid parsed questions
    for (const q of questions) {
      if (this.isValidQuestion(q) && this.isExpectedSkill(q, expectedSkillCodes, coveredSkills)) {
        coveredSkills.add(q.skillCode);
        result.push(q);
      }
    }

    // Generate fallback questions for missing skills
    for (const skillCode of expectedSkillCodes) {
      if (!coveredSkills.has(skillCode)) {
        result.push(this.createFallbackQuestion(skillCode));
      }
    }

    return result;
  }

  /**
   * Check if a question is valid
   */
  private isValidQuestion(q: BaselineQuestion): boolean {
    if (!q.questionText || q.questionText.length < 10) {
      return false;
    }

    if (q.questionType === 'MULTIPLE_CHOICE') {
      if (!q.options || q.options.length < 2) {
        return false;
      }
      // Fix invalid correctAnswer
      if (
        typeof q.correctAnswer !== 'number' ||
        q.correctAnswer < 0 ||
        q.correctAnswer >= q.options.length
      ) {
        q.correctAnswer = 0;
      }
    }

    return true;
  }

  /**
   * Check if question's skill is expected and not yet covered
   */
  private isExpectedSkill(
    q: BaselineQuestion,
    expectedSkillCodes: string[],
    coveredSkills: Set<string>
  ): boolean {
    return expectedSkillCodes.includes(q.skillCode) && !coveredSkills.has(q.skillCode);
  }

  /**
   * Create a fallback question for a skill
   */
  private createFallbackQuestion(skillCode: string): BaselineQuestion {
    const skill = SKILL_DESCRIPTIONS[skillCode];
    return {
      skillCode,
      questionType: 'MULTIPLE_CHOICE',
      questionText: skill
        ? `Which of the following best demonstrates understanding of ${skill.name.toLowerCase()}?`
        : `Which answer best demonstrates the skill: ${skillCode}?`,
      options: [
        'I can demonstrate this skill independently',
        'I need some help with this skill',
        'I am still learning this skill',
        'I have not yet learned this skill',
      ],
      correctAnswer: 0,
    };
  }

  /**
   * Randomize option order while tracking correct answer
   */
  private randomizeOptions(questions: BaselineQuestion[], seed?: string): BaselineQuestion[] {
    return questions.map((q, qIndex) => {
      if (q.questionType !== 'MULTIPLE_CHOICE' || !q.options) {
        return q;
      }

      // Create a seeded random for reproducibility in tests
      const seedValue = seed ? this.hashString(`${seed}-${qIndex}`) : Date.now() + qIndex;

      const correctIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
      const correctOption = q.options[correctIndex];

      // Fisher-Yates shuffle with seeded random
      const shuffled = [...q.options];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = this.seededRandom(seedValue + i) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Find new position of correct answer
      const newCorrectIndex = shuffled.indexOf(correctOption);

      return {
        ...q,
        options: shuffled,
        correctAnswer: newCorrectIndex,
      };
    });
  }

  /**
   * Simple hash function for seeding
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.codePointAt(i) ?? 0;
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Simple seeded random
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * 1000000);
  }
}
