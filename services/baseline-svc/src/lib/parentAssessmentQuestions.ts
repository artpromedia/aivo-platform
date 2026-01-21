/**
 * Parent Assessment Question Bank
 *
 * Pre-baseline assessment for parents to provide context about their child.
 * Helps the system understand the child from the parent's perspective before
 * the child takes the baseline assessment.
 *
 * Now includes functioning level and sensory accessibility questions
 * to determine appropriate assessment mode.
 */

export interface ParentAssessmentQuestion {
  id: string;
  category:
    | 'learning_style'
    | 'strengths'
    | 'challenges'
    | 'behavior'
    | 'preferences'
    | 'social_emotional'
    | 'functioning_level'
    | 'sensory_accessibility'
    | 'communication_needs'
    | 'input_method'
    | 'support_needs';
  questionText: string;
  questionType: 'multiple_choice' | 'rating_scale' | 'open_ended' | 'multi_select' | 'yes_no';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  required: boolean;
  helpText?: string;
  /** Weight for assessment mode routing algorithm (0-10) */
  routingWeight?: number;
  /** Trigger values that indicate non-standard assessment may be needed */
  flagTriggers?: string[];
}

export const PARENT_ASSESSMENT_QUESTIONS: ParentAssessmentQuestion[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // LEARNING STYLE (6 questions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'ls-1',
    category: 'learning_style',
    questionText: 'How does your child learn best?',
    questionType: 'multiple_choice',
    options: [
      'By seeing pictures, videos, and demonstrations',
      'By listening to explanations and discussions',
      'By doing hands-on activities and moving around',
      'By reading and writing things down',
      'A combination of several ways',
    ],
    required: true,
    helpText: 'Think about times when your child learned something new successfully.',
  },
  {
    id: 'ls-2',
    category: 'learning_style',
    questionText: 'When your child encounters a challenging problem, they typically:',
    questionType: 'multiple_choice',
    options: [
      'Work through it independently with persistence',
      'Seek help immediately from an adult',
      'Get frustrated and give up quickly',
      'Try a few times, then ask for guidance',
      'Avoid the task altogether',
    ],
    required: true,
  },
  {
    id: 'ls-3',
    category: 'learning_style',
    questionText: 'How long can your child focus on a learning task without becoming distracted?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Less than 5 minutes',
      max: '30+ minutes consistently',
    },
    required: true,
  },
  {
    id: 'ls-4',
    category: 'learning_style',
    questionText: 'What time of day is your child most alert and ready to learn?',
    questionType: 'multiple_choice',
    options: [
      'Early morning (6-9 AM)',
      'Late morning (9-12 PM)',
      'Early afternoon (12-3 PM)',
      'Late afternoon (3-6 PM)',
      'Evening (6-9 PM)',
      'It varies day to day',
    ],
    required: true,
    helpText: 'This helps us recommend optimal learning times.',
  },
  {
    id: 'ls-5',
    category: 'learning_style',
    questionText: 'Does your child prefer learning:',
    questionType: 'multiple_choice',
    options: [
      'Alone and independently',
      'With one other person (parent, sibling, or peer)',
      'In a small group setting',
      'In a larger classroom environment',
      'Depends on the subject or activity',
    ],
    required: true,
  },
  {
    id: 'ls-6',
    category: 'learning_style',
    questionText: 'How does your child respond to mistakes or incorrect answers?',
    questionType: 'multiple_choice',
    options: [
      'Learns from them and tries again with enthusiasm',
      'Gets mildly frustrated but continues',
      'Becomes very upset and needs encouragement',
      'Avoids similar tasks in the future',
      'Shows little emotional response',
    ],
    required: true,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STRENGTHS (4 questions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'str-1',
    category: 'strengths',
    questionText: 'Which subjects or activities does your child excel in?',
    questionType: 'multi_select',
    options: [
      'Reading and comprehension',
      'Writing and storytelling',
      'Math and numbers',
      'Science and discovery',
      'Creative arts (drawing, music, etc.)',
      'Physical activities and sports',
      'Problem-solving and puzzles',
      'Social interactions and communication',
      'Memory and recall',
    ],
    required: true,
    helpText: 'Select all that apply.',
  },
  {
    id: 'str-2',
    category: 'strengths',
    questionText: 'What specific skills or talents have you noticed in your child?',
    questionType: 'open_ended',
    required: false,
    helpText: 'Share any unique abilities, interests, or accomplishments.',
  },
  {
    id: 'str-3',
    category: 'strengths',
    questionText: 'How creative is your child when solving problems or playing?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Prefers structured guidance',
      max: 'Extremely imaginative and innovative',
    },
    required: true,
  },
  {
    id: 'str-4',
    category: 'strengths',
    questionText: 'How well does your child remember and recall information?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Struggles to remember',
      max: 'Excellent memory and recall',
    },
    required: true,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHALLENGES (5 questions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'ch-1',
    category: 'challenges',
    questionText: 'Which subjects or areas does your child find most challenging?',
    questionType: 'multi_select',
    options: [
      'Reading and comprehension',
      'Writing and composition',
      'Math calculations',
      'Math word problems',
      'Spelling',
      'Science concepts',
      'Focusing and attention',
      'Following multi-step instructions',
      'Organization and time management',
    ],
    required: false,
    helpText: 'Select all that apply. This helps us provide targeted support.',
  },
  {
    id: 'ch-2',
    category: 'challenges',
    questionText: 'Does your child have any diagnosed learning differences or accommodations?',
    questionType: 'multiple_choice',
    options: [
      "No, none that I'm aware of",
      'Yes, ADHD/ADD',
      'Yes, dyslexia or reading difficulty',
      'Yes, dyscalculia or math difficulty',
      'Yes, autism spectrum',
      'Yes, other (please specify in notes)',
      'Currently being evaluated',
    ],
    required: false,
    helpText: 'This information remains confidential and helps us personalize learning.',
  },
  {
    id: 'ch-3',
    category: 'challenges',
    questionText: 'Additional information about challenges or accommodations:',
    questionType: 'open_ended',
    required: false,
    helpText: 'Share any IEP/504 accommodations, strategies that work, or specific needs.',
  },
  {
    id: 'ch-4',
    category: 'challenges',
    questionText: 'How does your child handle homework or independent work?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Needs constant supervision',
      max: 'Completely independent',
    },
    required: true,
  },
  {
    id: 'ch-5',
    category: 'challenges',
    questionText: 'What frustrates your child most about learning?',
    questionType: 'open_ended',
    required: false,
    helpText: 'Understanding frustrations helps us avoid triggers and build confidence.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BEHAVIOR & ENGAGEMENT (4 questions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'beh-1',
    category: 'behavior',
    questionText: 'How motivated is your child to learn new things?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Requires significant encouragement',
      max: 'Self-motivated and curious',
    },
    required: true,
  },
  {
    id: 'beh-2',
    category: 'behavior',
    questionText: 'How does your child respond to praise and rewards?',
    questionType: 'multiple_choice',
    options: [
      'Very responsive - highly motivated by praise',
      'Moderately responsive',
      "Neutral - doesn't seem to affect motivation",
      'Prefers tangible rewards over verbal praise',
      'Internal motivation is stronger than external',
    ],
    required: true,
  },
  {
    id: 'beh-3',
    category: 'behavior',
    questionText: 'Does your child exhibit any behavioral patterns during learning?',
    questionType: 'multi_select',
    options: [
      'Gets restless and needs movement breaks',
      'Works better with background music or sound',
      'Prefers complete silence',
      'Needs frequent breaks',
      'Works best in short bursts',
      'Can sustain focus for extended periods',
      'None of the above',
    ],
    required: false,
    helpText: 'Select all that apply.',
  },
  {
    id: 'beh-4',
    category: 'behavior',
    questionText: 'How does your child typically start their day or learning session?',
    questionType: 'multiple_choice',
    options: [
      'Energetic and ready to go',
      'Needs time to warm up',
      'Resistant and requires encouragement',
      'Depends on the activity or their mood',
      'Variable and unpredictable',
    ],
    required: true,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PREFERENCES (3 questions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'pref-1',
    category: 'preferences',
    questionText: 'What subjects or topics is your child most interested in?',
    questionType: 'multi_select',
    options: [
      'Animals and nature',
      'Space and astronomy',
      'Technology and computers',
      'Sports and athletics',
      'Art and creativity',
      'Music and performance',
      'History and cultures',
      'Math puzzles and logic',
      'Science experiments',
      'Reading and stories',
    ],
    required: false,
    helpText: 'We can incorporate these interests into learning activities.',
  },
  {
    id: 'pref-2',
    category: 'preferences',
    questionText: 'Does your child prefer structure or flexibility in learning?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Needs clear structure and routines',
      max: 'Thrives with flexibility and choice',
    },
    required: true,
  },
  {
    id: 'pref-3',
    category: 'preferences',
    questionText: 'What type of activities engage your child the most?',
    questionType: 'multiple_choice',
    options: [
      'Games and competitions',
      'Stories and narratives',
      'Building and creating',
      'Exploring and discovering',
      'Practicing and mastering skills',
      'Collaborating with others',
    ],
    required: true,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SOCIAL-EMOTIONAL (3 questions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'se-1',
    category: 'social_emotional',
    questionText: 'How confident is your child in their abilities as a learner?',
    questionType: 'rating_scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: {
      min: 'Low confidence, often doubts themselves',
      max: 'Very confident and self-assured',
    },
    required: true,
  },
  {
    id: 'se-2',
    category: 'social_emotional',
    questionText: 'How does your child handle frustration or setbacks?',
    questionType: 'multiple_choice',
    options: [
      'Bounces back quickly and tries again',
      'Needs encouragement but persists',
      'Gets upset but calms down with support',
      'Becomes very discouraged',
      'Shuts down or avoids the situation',
    ],
    required: true,
  },
  {
    id: 'se-3',
    category: 'social_emotional',
    questionText: "Is there anything else you'd like us to know about your child?",
    questionType: 'open_ended',
    required: false,
    helpText:
      "Share any additional insights, concerns, or context that would help us support your child's learning journey.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FUNCTIONING LEVEL ASSESSMENT (Critical for assessment routing)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'fl-1',
    category: 'functioning_level',
    questionText: 'Does your child have an Individualized Education Program (IEP) or 504 plan?',
    questionType: 'multiple_choice',
    options: [
      'No IEP or 504 plan',
      'Yes, 504 plan only',
      'Yes, IEP for learning disabilities',
      'Yes, IEP for developmental delay',
      'Yes, IEP for intellectual disability',
      'Yes, IEP for multiple disabilities',
      'Currently being evaluated',
    ],
    required: true,
    routingWeight: 10,
    flagTriggers: [
      'Yes, IEP for intellectual disability',
      'Yes, IEP for developmental delay',
      'Yes, IEP for multiple disabilities',
    ],
    helpText: 'This helps us customize the assessment experience appropriately.',
  },
  {
    id: 'fl-2',
    category: 'functioning_level',
    questionText: 'Can your child follow simple 1-2 step verbal instructions independently?',
    questionType: 'multiple_choice',
    options: [
      'Yes, consistently and independently',
      'Yes, with occasional reminders',
      'Sometimes, with frequent prompting needed',
      'Rarely, requires significant support',
      'No, requires physical guidance or demonstration',
    ],
    required: true,
    routingWeight: 9,
    flagTriggers: [
      'Rarely, requires significant support',
      'No, requires physical guidance or demonstration',
    ],
  },
  {
    id: 'fl-3',
    category: 'functioning_level',
    questionText: 'Can your child recognize and identify basic pictures and symbols?',
    questionType: 'multiple_choice',
    options: [
      'Yes, recognizes many pictures and symbols',
      'Yes, recognizes common objects and simple symbols',
      'Somewhat, recognizes a limited set of familiar images',
      'Rarely, struggles to connect pictures to meaning',
      'No, does not demonstrate picture/symbol recognition',
    ],
    required: true,
    routingWeight: 9,
    flagTriggers: [
      'Rarely, struggles to connect pictures to meaning',
      'No, does not demonstrate picture/symbol recognition',
    ],
  },
  {
    id: 'fl-4',
    category: 'functioning_level',
    questionText: 'How does your child typically respond to questions or choices?',
    questionType: 'multiple_choice',
    options: [
      'Verbally answers questions clearly',
      'Uses short words or phrases',
      'Points to or touches choices',
      'Uses communication device or pictures',
      'Looks at or gazes toward choices',
      'Requires adult to interpret responses',
      'Does not consistently respond to questions',
    ],
    required: true,
    routingWeight: 8,
    flagTriggers: [
      'Looks at or gazes toward choices',
      'Requires adult to interpret responses',
      'Does not consistently respond to questions',
    ],
  },
  {
    id: 'fl-5',
    category: 'functioning_level',
    questionText: "What is your child's current level of reading ability?",
    questionType: 'multiple_choice',
    options: [
      'Reads at or above grade level',
      'Reads 1-2 grades below level',
      'Recognizes some sight words',
      'Recognizes letters but not words',
      'Does not read or recognize letters',
      'Non-applicable / Pre-reading age',
    ],
    required: true,
    routingWeight: 7,
    flagTriggers: ['Does not read or recognize letters'],
    helpText: 'This helps us determine if content should be read aloud.',
  },
  {
    id: 'fl-6',
    category: 'functioning_level',
    questionText: 'Can your child independently use a tablet or touchscreen?',
    questionType: 'multiple_choice',
    options: [
      'Yes, uses tablets/touchscreens independently',
      'Yes, with occasional guidance',
      'Yes, but needs large buttons/targets',
      'Somewhat, with physical hand-over-hand support',
      'No, requires an adult to navigate for them',
      'Uses assistive technology (switch, eye gaze)',
    ],
    required: true,
    routingWeight: 8,
    flagTriggers: [
      'Somewhat, with physical hand-over-hand support',
      'No, requires an adult to navigate for them',
      'Uses assistive technology (switch, eye gaze)',
    ],
  },
  {
    id: 'fl-7',
    category: 'functioning_level',
    questionText: "How would you describe your child's overall developmental level?",
    questionType: 'multiple_choice',
    options: [
      'Age-appropriate development',
      'Mild delays (about 1-2 years behind peers)',
      'Moderate delays (about 3-4 years behind peers)',
      'Significant delays (more than 4 years behind peers)',
      'Profound delays (functioning at infant/toddler level)',
      'Unsure / Prefer not to answer',
    ],
    required: true,
    routingWeight: 10,
    flagTriggers: [
      'Significant delays (more than 4 years behind peers)',
      'Profound delays (functioning at infant/toddler level)',
    ],
    helpText: 'This information is confidential and helps us create the best experience.',
  },
  {
    id: 'fl-8',
    category: 'functioning_level',
    questionText:
      'Which daily living skills can your child perform independently? (Select all that apply)',
    questionType: 'multi_select',
    options: [
      'Feeding themselves',
      'Dressing with minimal help',
      'Basic hygiene (handwashing, teeth brushing)',
      'Using the bathroom independently',
      'Following household routines',
      'None of the above independently',
    ],
    required: false,
    routingWeight: 6,
    flagTriggers: ['None of the above independently'],
    helpText: 'This helps us understand appropriate activity complexity.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SENSORY ACCESSIBILITY (Vision & Hearing)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'sa-1',
    category: 'sensory_accessibility',
    questionText: 'Does your child have any vision impairment?',
    questionType: 'multiple_choice',
    options: [
      'No vision impairment',
      'Wears glasses/contacts (corrected to normal)',
      'Low vision (even with glasses)',
      'Legally blind',
      'Totally blind',
    ],
    required: true,
    routingWeight: 10,
    flagTriggers: ['Low vision (even with glasses)', 'Legally blind', 'Totally blind'],
    helpText: 'This determines if we need to provide audio-first or screen reader content.',
  },
  {
    id: 'sa-2',
    category: 'sensory_accessibility',
    questionText:
      'If your child has vision impairment, what tools do they use? (Select all that apply)',
    questionType: 'multi_select',
    options: [
      'Not applicable - no vision impairment',
      'Screen reader (NVDA, JAWS, VoiceOver, TalkBack)',
      'Screen magnification software',
      'Braille display',
      'Audio descriptions',
      'High contrast mode',
      'Large print materials',
      'Tactile graphics/models',
    ],
    required: false,
    routingWeight: 8,
    helpText: 'We will configure the app to work with these tools.',
  },
  {
    id: 'sa-3',
    category: 'sensory_accessibility',
    questionText: 'Does your child have any hearing impairment?',
    questionType: 'multiple_choice',
    options: [
      'No hearing impairment',
      'Mild hearing loss (uses hearing aids)',
      'Moderate hearing loss',
      'Severe hearing loss',
      'Profoundly deaf',
      'Deaf since birth',
    ],
    required: true,
    routingWeight: 10,
    flagTriggers: [
      'Moderate hearing loss',
      'Severe hearing loss',
      'Profoundly deaf',
      'Deaf since birth',
    ],
    helpText: 'This determines if we need to provide visual/sign language content.',
  },
  {
    id: 'sa-4',
    category: 'sensory_accessibility',
    questionText: 'If your child has hearing impairment, what do they use? (Select all that apply)',
    questionType: 'multi_select',
    options: [
      'Not applicable - no hearing impairment',
      'Hearing aids',
      'Cochlear implant',
      'American Sign Language (ASL)',
      'British Sign Language (BSL)',
      'Other sign language',
      'Lip reading',
      'Written/text communication',
      'Captions/subtitles',
    ],
    required: false,
    routingWeight: 8,
    helpText: 'We will provide appropriate visual supports.',
  },
  {
    id: 'sa-5',
    category: 'sensory_accessibility',
    questionText: 'Does your child have combined vision and hearing impairment (deafblind)?',
    questionType: 'yes_no',
    options: ['Yes', 'No'],
    required: true,
    routingWeight: 10,
    flagTriggers: ['Yes'],
    helpText: 'Deafblind learners need specialized tactile/haptic content.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION NEEDS
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'cn-1',
    category: 'communication_needs',
    questionText: 'How does your child primarily communicate?',
    questionType: 'multiple_choice',
    options: [
      'Verbal speech (speaks clearly)',
      'Verbal speech (limited vocabulary or clarity)',
      'Sign language',
      'Picture symbols (PECS, Boardmaker, etc.)',
      'Communication device/app (AAC)',
      'Gestures and pointing',
      'Combination of methods',
      'Non-verbal / Pre-verbal',
    ],
    required: true,
    routingWeight: 9,
    flagTriggers: [
      'Picture symbols (PECS, Boardmaker, etc.)',
      'Communication device/app (AAC)',
      'Non-verbal / Pre-verbal',
    ],
    helpText: 'This helps us provide appropriate response options.',
  },
  {
    id: 'cn-2',
    category: 'communication_needs',
    questionText:
      'Does your child use an AAC (Augmentative and Alternative Communication) device or app?',
    questionType: 'multiple_choice',
    options: [
      'No, does not use AAC',
      'Yes - Proloquo2Go',
      'Yes - TouchChat',
      'Yes - LAMP Words for Life',
      'Yes - Snap + Core First',
      'Yes - GoTalk or similar low-tech device',
      'Yes - Picture Exchange Communication System (PECS)',
      'Yes - Other AAC system',
    ],
    required: false,
    routingWeight: 7,
    helpText: 'We can integrate with some AAC systems for seamless communication.',
  },
  {
    id: 'cn-3',
    category: 'communication_needs',
    questionText: 'What symbol set is your child most familiar with?',
    questionType: 'multiple_choice',
    options: [
      'Not applicable - uses verbal/text communication',
      'PCS (Picture Communication Symbols / Boardmaker)',
      'SymbolStix',
      'Widgit Symbols',
      'LAMP symbols',
      'Photographs of real objects',
      'Custom/other symbols',
      'Not sure',
    ],
    required: false,
    routingWeight: 5,
    helpText: 'Using familiar symbols helps your child respond more easily.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // INPUT METHOD NEEDS
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'im-1',
    category: 'input_method',
    questionText: 'How does your child interact with screens/devices?',
    questionType: 'multiple_choice',
    options: [
      'Standard touch/mouse - no adaptations needed',
      'Needs larger touch targets/buttons',
      'Uses switch access (single switch)',
      'Uses switch access (two switches)',
      'Uses eye gaze/eye tracking',
      'Uses head tracking',
      'Uses voice control',
      "Parent/aide operates device based on child's cues",
    ],
    required: true,
    routingWeight: 10,
    flagTriggers: [
      'Uses switch access (single switch)',
      'Uses switch access (two switches)',
      'Uses eye gaze/eye tracking',
      'Uses head tracking',
      "Parent/aide operates device based on child's cues",
    ],
    helpText: "We will configure the app for your child's access method.",
  },
  {
    id: 'im-2',
    category: 'input_method',
    questionText: 'If your child uses switch or scanning access, what settings work best?',
    questionType: 'multiple_choice',
    options: [
      'Not applicable - does not use switch access',
      'Automatic scanning (items highlight in sequence)',
      'Step scanning (switch advances to next item)',
      'Row-column scanning',
      'Group scanning',
      'Unsure - need help determining',
    ],
    required: false,
    routingWeight: 6,
    helpText: 'We can customize scanning patterns and timing.',
  },
  {
    id: 'im-3',
    category: 'input_method',
    questionText: 'Does your child need extra time to respond to questions?',
    questionType: 'multiple_choice',
    options: [
      'No, responds at typical pace',
      'Yes, needs a few extra seconds',
      'Yes, needs significantly more time (10+ seconds)',
      'Yes, needs partner assistance to respond',
      'Yes, no time limits should be used',
    ],
    required: true,
    routingWeight: 7,
    flagTriggers: [
      'Yes, needs significantly more time (10+ seconds)',
      'Yes, needs partner assistance to respond',
      'Yes, no time limits should be used',
    ],
    helpText: 'We will adjust timing and remove any time pressure.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SUPPORT NEEDS DURING ASSESSMENT
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'sn-1',
    category: 'support_needs',
    questionText: 'Will an adult need to be present during the assessment?',
    questionType: 'multiple_choice',
    options: [
      'No, child can complete independently',
      'Yes, to provide encouragement but not help',
      'Yes, to read questions aloud',
      'Yes, to physically assist with responses',
      'Yes, to interpret/translate responses',
      'Yes, to fully facilitate (observational mode)',
    ],
    required: true,
    routingWeight: 8,
    flagTriggers: [
      'Yes, to physically assist with responses',
      'Yes, to interpret/translate responses',
      'Yes, to fully facilitate (observational mode)',
    ],
    helpText: 'This helps us determine the best assessment format.',
  },
  {
    id: 'sn-2',
    category: 'support_needs',
    questionText: 'How many questions can your child typically handle before needing a break?',
    questionType: 'multiple_choice',
    options: [
      '20+ questions at a time',
      '10-20 questions at a time',
      '5-10 questions at a time',
      '3-5 questions at a time',
      '1-2 questions at a time',
      'Needs frequent breaks after each question',
    ],
    required: true,
    routingWeight: 6,
    flagTriggers: ['1-2 questions at a time', 'Needs frequent breaks after each question'],
    helpText: 'We will build in appropriate breaks.',
  },
  {
    id: 'sn-3',
    category: 'support_needs',
    questionText: 'What type of breaks help your child re-focus? (Select all that apply)',
    questionType: 'multi_select',
    options: [
      'Movement breaks (stretching, walking)',
      'Sensory breaks (calming music, visuals)',
      'Quiet rest (close eyes, dark room)',
      'Preferred activity break (watch video, play)',
      'Deep pressure/weighted blanket',
      'Snack break',
      'Social interaction break',
      'No specific break type needed',
    ],
    required: false,
    routingWeight: 3,
    helpText: 'We can suggest appropriate break activities.',
  },
  {
    id: 'sn-4',
    category: 'support_needs',
    questionText: 'Does your child have any specific triggers we should avoid in content?',
    questionType: 'multi_select',
    options: [
      'Loud or sudden sounds',
      'Flashing lights or animations',
      'Certain colors (please specify)',
      'Crowded or busy visuals',
      'Cartoon characters or faces',
      'Specific topics (please specify in notes)',
      'Time pressure or countdowns',
      "None that I'm aware of",
    ],
    required: false,
    routingWeight: 5,
    helpText: 'This helps us create a comfortable assessment environment.',
  },
  {
    id: 'sn-5',
    category: 'support_needs',
    questionText: "Any additional information about your child's accessibility or support needs?",
    questionType: 'open_ended',
    required: false,
    helpText:
      'Share any specific accommodations, equipment, or strategies that help your child succeed.',
  },
];

/**
 * Get categorized questions for progressive disclosure UI
 */
export function getQuestionsByCategory() {
  const categories = {
    learning_style: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'learning_style'),
    strengths: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'strengths'),
    challenges: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'challenges'),
    behavior: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'behavior'),
    preferences: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'preferences'),
    social_emotional: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'social_emotional'),
    functioning_level: PARENT_ASSESSMENT_QUESTIONS.filter(
      (q) => q.category === 'functioning_level'
    ),
    sensory_accessibility: PARENT_ASSESSMENT_QUESTIONS.filter(
      (q) => q.category === 'sensory_accessibility'
    ),
    communication_needs: PARENT_ASSESSMENT_QUESTIONS.filter(
      (q) => q.category === 'communication_needs'
    ),
    input_method: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'input_method'),
    support_needs: PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'support_needs'),
  };

  return categories;
}

/**
 * Get only the accessibility-related questions (for quick assessment mode routing)
 */
export function getAccessibilityQuestions(): ParentAssessmentQuestion[] {
  return PARENT_ASSESSMENT_QUESTIONS.filter(
    (q) =>
      q.category === 'functioning_level' ||
      q.category === 'sensory_accessibility' ||
      q.category === 'communication_needs' ||
      q.category === 'input_method' ||
      q.category === 'support_needs'
  );
}

/**
 * Get questions that trigger non-standard assessment modes
 */
export function getRoutingCriticalQuestions(): ParentAssessmentQuestion[] {
  return PARENT_ASSESSMENT_QUESTIONS.filter(
    (q) => q.routingWeight !== undefined && q.routingWeight >= 8
  );
}

/**
 * Validate parent assessment responses
 */
export function validateResponses(responses: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check all required questions are answered
  const requiredQuestions = PARENT_ASSESSMENT_QUESTIONS.filter((q) => q.required);

  for (const question of requiredQuestions) {
    const response = responses[question.id];

    if (response === undefined || response === null || response === '') {
      errors.push(`Question "${question.id}" is required but not answered`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
