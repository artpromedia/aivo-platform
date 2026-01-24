/**
 * Domain Expert Agent Configurations
 * 
 * Each learning domain has specialized:
 * 1. Expert system prompt with pedagogical knowledge
 * 2. Curriculum standards (TEKS, Common Core, NGSS)
 * 3. Hyperparameters optimized for the domain
 * 4. Skill taxonomies and misconception databases
 */

import type { BaselineDomain } from '../generation/baseline-question.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DomainExpertConfig {
  domain: BaselineDomain;
  agentType: string;
  displayName: string;
  systemPrompt: string;
  hyperparameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  curriculumStandards: CurriculumStandard[];
  skillTaxonomy: SkillNode[];
  commonMisconceptions: Misconception[];
  pedagogicalStrategies: string[];
  assessmentPrinciples: string[];
}

export interface CurriculumStandard {
  code: string;
  framework: 'COMMON_CORE' | 'TEKS' | 'NGSS' | 'CASEL' | 'ASHA' | 'STATE';
  gradeRange: string;
  description: string;
  skills: string[];
}

export interface SkillNode {
  code: string;
  name: string;
  prerequisites: string[];
  subskills: string[];
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
}

export interface Misconception {
  concept: string;
  misconception: string;
  correctUnderstanding: string;
  diagnosticQuestion: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ELA DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const ELA_EXPERT: DomainExpertConfig = {
  domain: 'ELA',
  agentType: 'BASELINE_ELA',
  displayName: 'English Language Arts Expert',
  
  systemPrompt: `You are an expert English Language Arts educator with deep knowledge of literacy development from Pre-K through 12th grade. You specialize in:

EXPERTISE AREAS:
- Phonemic awareness and phonics instruction (Science of Reading)
- Reading fluency development and assessment
- Vocabulary acquisition and word study
- Reading comprehension strategies (close reading, text evidence)
- Writing process and composition
- Grammar, syntax, and language conventions

PEDAGOGICAL APPROACH:
- Use the gradual release model (I do, We do, You do)
- Incorporate multiple-meaning words and context clues
- Design questions that assess both literal and inferential comprehension
- Create text-dependent questions when passages are provided
- Use age-appropriate vocabulary and sentence complexity

ASSESSMENT DESIGN PRINCIPLES:
- Questions should have clear, unambiguous correct answers
- Distractors should reflect common student misconceptions
- Avoid "all of the above" or "none of the above" options
- Reading passages should be grade-appropriate in Lexile level
- Open-ended questions should have clear rubrics

COMMON CORE ALIGNMENT:
- CCSS.ELA-LITERACY.RF (Reading: Foundational Skills)
- CCSS.ELA-LITERACY.RL (Reading: Literature)
- CCSS.ELA-LITERACY.RI (Reading: Informational Text)
- CCSS.ELA-LITERACY.W (Writing)
- CCSS.ELA-LITERACY.L (Language)

When generating questions, always verify:
✓ The correct answer is definitively correct
✓ Distractors are plausible but clearly wrong
✓ Language complexity matches the grade level
✓ Questions assess the intended skill`,

  hyperparameters: {
    temperature: 0.7,  // Balanced creativity for varied question stems
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.3,  // Encourage variety in language
    presencePenalty: 0.2,
  },

  curriculumStandards: [
    {
      code: 'CCSS.ELA-LITERACY.RF.K.2',
      framework: 'COMMON_CORE',
      gradeRange: 'K',
      description: 'Demonstrate understanding of spoken words, syllables, and sounds (phonemes)',
      skills: ['ELA_PHONEMIC_AWARENESS'],
    },
    {
      code: 'CCSS.ELA-LITERACY.RF.2.4',
      framework: 'COMMON_CORE',
      gradeRange: '2',
      description: 'Read with sufficient accuracy and fluency to support comprehension',
      skills: ['ELA_FLUENCY'],
    },
    {
      code: 'CCSS.ELA-LITERACY.L.4.4',
      framework: 'COMMON_CORE',
      gradeRange: '4',
      description: 'Determine or clarify the meaning of unknown words and phrases',
      skills: ['ELA_VOCABULARY'],
    },
    {
      code: 'CCSS.ELA-LITERACY.RL.5.2',
      framework: 'COMMON_CORE',
      gradeRange: '5',
      description: 'Determine a theme of a story from details in the text',
      skills: ['ELA_COMPREHENSION'],
    },
    {
      code: 'TEKS.110.6.b.11',
      framework: 'TEKS',
      gradeRange: '4',
      description: 'Compose literary texts such as personal narratives and poetry',
      skills: ['ELA_WRITING'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'ELA_PHONEMIC_AWARENESS',
      name: 'Phonemic Awareness',
      prerequisites: [],
      subskills: ['rhyming', 'segmenting', 'blending', 'manipulating'],
      bloomLevel: 'understand',
    },
    {
      code: 'ELA_FLUENCY',
      name: 'Reading Fluency',
      prerequisites: ['ELA_PHONEMIC_AWARENESS'],
      subskills: ['accuracy', 'rate', 'prosody'],
      bloomLevel: 'apply',
    },
    {
      code: 'ELA_VOCABULARY',
      name: 'Vocabulary',
      prerequisites: ['ELA_FLUENCY'],
      subskills: ['context_clues', 'word_relationships', 'word_parts'],
      bloomLevel: 'analyze',
    },
    {
      code: 'ELA_COMPREHENSION',
      name: 'Reading Comprehension',
      prerequisites: ['ELA_FLUENCY', 'ELA_VOCABULARY'],
      subskills: ['main_idea', 'inference', 'text_structure', 'author_purpose'],
      bloomLevel: 'analyze',
    },
    {
      code: 'ELA_WRITING',
      name: 'Writing',
      prerequisites: ['ELA_VOCABULARY'],
      subskills: ['organization', 'development', 'conventions', 'style'],
      bloomLevel: 'create',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Main Idea',
      misconception: 'The main idea is always stated in the first sentence',
      correctUnderstanding: 'The main idea can be stated anywhere or implied',
      diagnosticQuestion: 'Ask students to find the main idea in a passage where it appears in the conclusion',
    },
    {
      concept: 'Inference',
      misconception: 'Inferences can be made from personal opinions',
      correctUnderstanding: 'Inferences must be supported by text evidence',
      diagnosticQuestion: 'Ask students to identify which inference is supported by the text',
    },
    {
      concept: 'Rhyming',
      misconception: 'Words that start with the same sound rhyme',
      correctUnderstanding: 'Words rhyme when they have the same ending sound',
      diagnosticQuestion: 'Which word rhymes with "cat": "can" or "hat"?',
    },
  ],

  pedagogicalStrategies: [
    'Use think-alouds to model comprehension strategies',
    'Incorporate graphic organizers for text structure',
    'Provide multiple exposures to vocabulary in context',
    'Use mentor texts for writing instruction',
    'Scaffold from phonemic awareness to phonics to fluency',
  ],

  assessmentPrinciples: [
    'Assess phonemic awareness through oral tasks for early grades',
    'Use passage-based questions for comprehension assessment',
    'Include both literal and inferential comprehension questions',
    'Writing assessments should include clear rubrics',
    'Vocabulary questions should include context clues',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// MATH DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const MATH_EXPERT: DomainExpertConfig = {
  domain: 'MATH',
  agentType: 'BASELINE_MATH',
  displayName: 'Mathematics Expert',
  
  systemPrompt: `You are an expert Mathematics educator with deep knowledge of mathematical development from Pre-K through 12th grade. You specialize in:

EXPERTISE AREAS:
- Number sense and place value understanding
- Computational fluency with all four operations
- Fraction, decimal, and percent relationships
- Geometric reasoning and spatial visualization
- Algebraic thinking and patterns
- Mathematical problem solving and reasoning

PEDAGOGICAL APPROACH:
- Use the Concrete-Representational-Abstract (CRA) sequence
- Incorporate multiple representations (visual, symbolic, verbal)
- Design problems that require mathematical reasoning, not just computation
- Include real-world contexts that are culturally relevant
- Build conceptual understanding before procedural fluency

ASSESSMENT DESIGN PRINCIPLES:
- ALWAYS verify your arithmetic before finalizing answers
- Distractors should reflect common computational errors
- Include multi-step problems at appropriate grade levels
- Word problems should have clear, unambiguous language
- Avoid trick questions or unnecessarily complex wording

COMMON CORE MATH PRACTICES:
1. Make sense of problems and persevere in solving them
2. Reason abstractly and quantitatively
3. Construct viable arguments and critique reasoning
4. Model with mathematics
5. Use appropriate tools strategically
6. Attend to precision
7. Look for and make use of structure
8. Look for and express regularity in repeated reasoning

CRITICAL VERIFICATION:
✓ Double-check ALL calculations before setting the correct answer
✓ Verify that the correct answer IS in the options
✓ Ensure distractors are plausible but definitively wrong
✓ For equations: substitute your answer back to verify
✓ For word problems: check that the answer makes sense in context`,

  hyperparameters: {
    temperature: 0.5,  // Lower for more precise mathematical accuracy
    maxTokens: 2000,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.1,
  },

  curriculumStandards: [
    {
      code: 'CCSS.MATH.CONTENT.K.CC',
      framework: 'COMMON_CORE',
      gradeRange: 'K',
      description: 'Know number names and the count sequence',
      skills: ['MATH_NUMBER_SENSE'],
    },
    {
      code: 'CCSS.MATH.CONTENT.3.OA.A',
      framework: 'COMMON_CORE',
      gradeRange: '3',
      description: 'Represent and solve problems involving multiplication and division',
      skills: ['MATH_OPERATIONS'],
    },
    {
      code: 'CCSS.MATH.CONTENT.4.NF.A',
      framework: 'COMMON_CORE',
      gradeRange: '4',
      description: 'Extend understanding of fraction equivalence and ordering',
      skills: ['MATH_FRACTIONS'],
    },
    {
      code: 'CCSS.MATH.CONTENT.5.G.A',
      framework: 'COMMON_CORE',
      gradeRange: '5',
      description: 'Graph points on the coordinate plane to solve problems',
      skills: ['MATH_GEOMETRY'],
    },
    {
      code: 'TEKS.111.6.b.3',
      framework: 'TEKS',
      gradeRange: '4',
      description: 'Solve problems involving addition and subtraction of fractions',
      skills: ['MATH_FRACTIONS', 'MATH_PROBLEM_SOLVING'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'MATH_NUMBER_SENSE',
      name: 'Number Sense',
      prerequisites: [],
      subskills: ['counting', 'place_value', 'comparison', 'estimation'],
      bloomLevel: 'understand',
    },
    {
      code: 'MATH_OPERATIONS',
      name: 'Operations',
      prerequisites: ['MATH_NUMBER_SENSE'],
      subskills: ['addition', 'subtraction', 'multiplication', 'division'],
      bloomLevel: 'apply',
    },
    {
      code: 'MATH_FRACTIONS',
      name: 'Fractions & Decimals',
      prerequisites: ['MATH_OPERATIONS'],
      subskills: ['fraction_concepts', 'equivalence', 'operations', 'decimals'],
      bloomLevel: 'apply',
    },
    {
      code: 'MATH_GEOMETRY',
      name: 'Geometry',
      prerequisites: ['MATH_NUMBER_SENSE'],
      subskills: ['shapes', 'measurement', 'spatial_reasoning', 'transformations'],
      bloomLevel: 'analyze',
    },
    {
      code: 'MATH_PROBLEM_SOLVING',
      name: 'Problem Solving',
      prerequisites: ['MATH_OPERATIONS'],
      subskills: ['representation', 'strategy_selection', 'execution', 'verification'],
      bloomLevel: 'evaluate',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Multiplication',
      misconception: 'Multiplication always makes numbers bigger',
      correctUnderstanding: 'Multiplying by fractions less than 1 makes numbers smaller',
      diagnosticQuestion: 'Which is greater: 10 × 0.5 or 10?',
    },
    {
      concept: 'Fractions',
      misconception: 'A larger denominator means a larger fraction',
      correctUnderstanding: 'A larger denominator means smaller pieces (1/8 < 1/4)',
      diagnosticQuestion: 'Which is larger: 1/4 or 1/8?',
    },
    {
      concept: 'Subtraction',
      misconception: 'You can always subtract smaller from larger in any column',
      correctUnderstanding: 'Regrouping is needed when a digit is smaller than the one being subtracted',
      diagnosticQuestion: 'Calculate 52 - 37',
    },
    {
      concept: 'Division',
      misconception: 'Division always makes numbers smaller',
      correctUnderstanding: 'Dividing by fractions less than 1 makes numbers larger',
      diagnosticQuestion: 'Which is greater: 6 ÷ 0.5 or 6?',
    },
  ],

  pedagogicalStrategies: [
    'Use manipulatives before moving to abstract representations',
    'Encourage multiple solution strategies',
    'Connect mathematical concepts to real-world contexts',
    'Use number talks to develop mental math fluency',
    'Incorporate visual models (number lines, area models, arrays)',
  ],

  assessmentPrinciples: [
    'Balance computational and conceptual questions',
    'Include questions that assess mathematical reasoning',
    'Distractors should reflect common calculation errors',
    'Word problems should be clearly worded without unnecessary complexity',
    'Always verify calculations before finalizing the correct answer',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SCIENCE DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const SCIENCE_EXPERT: DomainExpertConfig = {
  domain: 'SCIENCE',
  agentType: 'BASELINE_SCIENCE',
  displayName: 'Science Expert',
  
  systemPrompt: `You are an expert Science educator with deep knowledge of scientific inquiry and content from Pre-K through 12th grade. You specialize in:

EXPERTISE AREAS:
- Scientific observation and data collection
- Hypothesis formation and testing
- Experimental design and variables
- Data analysis and interpretation
- Evidence-based conclusions
- Cross-cutting concepts (patterns, cause/effect, systems)

PEDAGOGICAL APPROACH:
- Use the 5E Model (Engage, Explore, Explain, Elaborate, Evaluate)
- Incorporate hands-on and virtual investigations
- Develop scientific argumentation skills
- Connect content to real-world phenomena
- Build science literacy through reading and writing

NGSS SCIENCE & ENGINEERING PRACTICES:
1. Asking questions and defining problems
2. Developing and using models
3. Planning and carrying out investigations
4. Analyzing and interpreting data
5. Using mathematics and computational thinking
6. Constructing explanations and designing solutions
7. Engaging in argument from evidence
8. Obtaining, evaluating, and communicating information

ASSESSMENT DESIGN PRINCIPLES:
- Questions should assess understanding of scientific concepts
- Include questions about experimental design and variables
- Use data tables and graphs for interpretation questions
- Avoid questions that can be answered with memorization alone
- Include questions about the nature of science

DISCIPLINARY CORE IDEAS:
- Physical Science: Matter, forces, energy, waves
- Life Science: Organisms, ecosystems, heredity, evolution
- Earth and Space Science: Earth systems, weather, universe
- Engineering: Design process, optimization

When generating questions, always:
✓ Base questions on observable phenomena
✓ Include questions about cause and effect
✓ Assess understanding of scientific processes
✓ Use age-appropriate scientific vocabulary`,

  hyperparameters: {
    temperature: 0.65,
    maxTokens: 2000,
    topP: 0.88,
    frequencyPenalty: 0.25,
    presencePenalty: 0.15,
  },

  curriculumStandards: [
    {
      code: 'NGSS.K-2-ETS1-1',
      framework: 'NGSS',
      gradeRange: 'K-2',
      description: 'Ask questions based on observations to find more information',
      skills: ['SCI_OBSERVATION'],
    },
    {
      code: 'NGSS.3-5-ETS1-1',
      framework: 'NGSS',
      gradeRange: '3-5',
      description: 'Define a simple design problem reflecting a need or a want',
      skills: ['SCI_HYPOTHESIS'],
    },
    {
      code: 'NGSS.MS-ETS1-3',
      framework: 'NGSS',
      gradeRange: '6-8',
      description: 'Analyze data from tests to determine similarities and differences',
      skills: ['SCI_DATA'],
    },
    {
      code: 'TEKS.112.15.b.2',
      framework: 'TEKS',
      gradeRange: '5',
      description: 'Plan and implement comparative and descriptive investigations',
      skills: ['SCI_EXPERIMENT'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'SCI_OBSERVATION',
      name: 'Scientific Observation',
      prerequisites: [],
      subskills: ['qualitative', 'quantitative', 'recording', 'questioning'],
      bloomLevel: 'understand',
    },
    {
      code: 'SCI_HYPOTHESIS',
      name: 'Hypothesis Formation',
      prerequisites: ['SCI_OBSERVATION'],
      subskills: ['prediction', 'testability', 'if_then_statements'],
      bloomLevel: 'apply',
    },
    {
      code: 'SCI_EXPERIMENT',
      name: 'Experimental Design',
      prerequisites: ['SCI_HYPOTHESIS'],
      subskills: ['variables', 'controls', 'procedures', 'materials'],
      bloomLevel: 'analyze',
    },
    {
      code: 'SCI_DATA',
      name: 'Data Analysis',
      prerequisites: ['SCI_OBSERVATION'],
      subskills: ['tables', 'graphs', 'patterns', 'statistics'],
      bloomLevel: 'analyze',
    },
    {
      code: 'SCI_CONCLUSION',
      name: 'Drawing Conclusions',
      prerequisites: ['SCI_DATA', 'SCI_EXPERIMENT'],
      subskills: ['evidence', 'reasoning', 'limitations', 'implications'],
      bloomLevel: 'evaluate',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Scientific Method',
      misconception: 'There is one strict scientific method that all scientists follow',
      correctUnderstanding: 'Scientists use various approaches depending on their questions',
      diagnosticQuestion: 'Which statement is true about how scientists work?',
    },
    {
      concept: 'Hypothesis',
      misconception: 'A hypothesis is just a guess',
      correctUnderstanding: 'A hypothesis is an educated prediction based on prior knowledge',
      diagnosticQuestion: 'What makes a good scientific hypothesis?',
    },
    {
      concept: 'Variables',
      misconception: 'You should change multiple variables to get better results',
      correctUnderstanding: 'A fair test changes only one variable at a time',
      diagnosticQuestion: 'Why do scientists change only one variable at a time?',
    },
  ],

  pedagogicalStrategies: [
    'Use phenomena-based instruction',
    'Incorporate science notebooks for recording observations',
    'Develop claims-evidence-reasoning skills',
    'Use simulations for dangerous or inaccessible experiments',
    'Connect to local environmental issues',
  ],

  assessmentPrinciples: [
    'Assess scientific practices, not just content knowledge',
    'Include data interpretation questions',
    'Use scenarios that require applying scientific reasoning',
    'Avoid questions that can be answered by memorization alone',
    'Include questions about experimental design',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SPEECH DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const SPEECH_EXPERT: DomainExpertConfig = {
  domain: 'SPEECH',
  agentType: 'BASELINE_SPEECH',
  displayName: 'Speech-Language Expert',
  
  systemPrompt: `You are an expert Speech-Language Pathologist (SLP) with deep knowledge of communication development from birth through adulthood. You specialize in:

EXPERTISE AREAS:
- Articulation and phonological processes
- Fluency (stuttering, cluttering)
- Voice quality and production
- Receptive and expressive language
- Pragmatic/social communication
- Augmentative and alternative communication (AAC)

ASHA STANDARDS ALIGNMENT:
- Speech Sound Production
- Language (receptive, expressive, pragmatic)
- Fluency
- Voice and Resonance
- Swallowing (where applicable)
- Cognitive Communication

DEVELOPMENTAL MILESTONES:
- Age 2-3: 2-3 word phrases, understood by familiar listeners 50-75%
- Age 4-5: Complete sentences, most sounds correct, understood by unfamiliar listeners
- Age 6-7: All speech sounds mastered, complex sentence structures
- Age 8+: Advanced language skills, figurative language understanding

ASSESSMENT DESIGN PRINCIPLES:
- Questions should be accessible to students with communication challenges
- Use clear, simple language in question stems
- Include visual supports where appropriate
- Avoid idioms or figurative language unless assessing that skill
- Consider that students may have word-finding difficulties

COMMUNICATION MODALITIES:
- Verbal expression
- Written expression
- Gestural communication
- AAC systems
- Multimodal communication

When generating questions:
✓ Use simple, direct language
✓ Avoid complex sentence structures
✓ Include visual descriptions when helpful
✓ Consider processing time needs
✓ Focus on functional communication skills`,

  hyperparameters: {
    temperature: 0.6,
    maxTokens: 1800,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.15,
  },

  curriculumStandards: [
    {
      code: 'ASHA.ARTICULATION',
      framework: 'ASHA',
      gradeRange: 'K-12',
      description: 'Produce speech sounds accurately',
      skills: ['SPEECH_ARTICULATION'],
    },
    {
      code: 'ASHA.FLUENCY',
      framework: 'ASHA',
      gradeRange: 'K-12',
      description: 'Produce fluent speech',
      skills: ['SPEECH_FLUENCY'],
    },
    {
      code: 'ASHA.LANGUAGE',
      framework: 'ASHA',
      gradeRange: 'K-12',
      description: 'Understand and use language effectively',
      skills: ['SPEECH_LANGUAGE'],
    },
    {
      code: 'ASHA.PRAGMATICS',
      framework: 'ASHA',
      gradeRange: 'K-12',
      description: 'Use language appropriately in social contexts',
      skills: ['SPEECH_PRAGMATICS'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'SPEECH_ARTICULATION',
      name: 'Articulation',
      prerequisites: [],
      subskills: ['phoneme_production', 'connected_speech', 'intelligibility'],
      bloomLevel: 'apply',
    },
    {
      code: 'SPEECH_FLUENCY',
      name: 'Speech Fluency',
      prerequisites: [],
      subskills: ['rate', 'rhythm', 'smoothness', 'self_monitoring'],
      bloomLevel: 'apply',
    },
    {
      code: 'SPEECH_VOICE',
      name: 'Voice Quality',
      prerequisites: [],
      subskills: ['pitch', 'volume', 'resonance', 'breath_support'],
      bloomLevel: 'apply',
    },
    {
      code: 'SPEECH_LANGUAGE',
      name: 'Language Skills',
      prerequisites: [],
      subskills: ['vocabulary', 'grammar', 'sentence_structure', 'comprehension'],
      bloomLevel: 'understand',
    },
    {
      code: 'SPEECH_PRAGMATICS',
      name: 'Social Communication',
      prerequisites: ['SPEECH_LANGUAGE'],
      subskills: ['turn_taking', 'topic_maintenance', 'context_awareness', 'nonverbal'],
      bloomLevel: 'analyze',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Stuttering',
      misconception: 'Stuttering is caused by nervousness or anxiety',
      correctUnderstanding: 'Stuttering is a neurological condition, not caused by emotions',
      diagnosticQuestion: 'What is the main cause of stuttering?',
    },
    {
      concept: 'Language vs. Speech',
      misconception: 'Speech and language are the same thing',
      correctUnderstanding: 'Speech is the physical production; language is the system of communication',
      diagnosticQuestion: 'What is the difference between speech and language?',
    },
  ],

  pedagogicalStrategies: [
    'Use visual supports and cues',
    'Provide extended wait time for responses',
    'Model correct production without explicit correction',
    'Use functional, meaningful communication contexts',
    'Incorporate AAC supports as needed',
  ],

  assessmentPrinciples: [
    'Allow for multiple response modalities',
    'Use simple, clear language in questions',
    'Include visual supports where helpful',
    'Consider processing time needs',
    'Focus on functional communication abilities',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SEL DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const SEL_EXPERT: DomainExpertConfig = {
  domain: 'SEL',
  agentType: 'BASELINE_SEL',
  displayName: 'Social-Emotional Learning Expert',
  
  systemPrompt: `You are an expert in Social-Emotional Learning (SEL) with deep knowledge of emotional development from Pre-K through 12th grade. You specialize in:

EXPERTISE AREAS:
- Self-awareness (emotions, values, strengths)
- Self-management (emotional regulation, goal setting)
- Social awareness (empathy, perspective-taking)
- Relationship skills (communication, teamwork)
- Responsible decision-making (ethics, consequences)

CASEL FRAMEWORK:
The Collaborative for Academic, Social, and Emotional Learning (CASEL) identifies five core competencies:
1. Self-Awareness: Recognizing one's emotions, thoughts, and values
2. Self-Management: Regulating emotions, thoughts, and behaviors
3. Social Awareness: Understanding and empathizing with others
4. Relationship Skills: Building and maintaining healthy relationships
5. Responsible Decision-Making: Making ethical, constructive choices

DEVELOPMENTAL CONSIDERATIONS:
- Pre-K to K: Basic emotion identification, simple regulation strategies
- Grades 1-3: Expanded emotion vocabulary, beginning empathy
- Grades 4-6: Perspective-taking, conflict resolution
- Grades 7-9: Identity development, peer relationships
- Grades 10-12: Complex ethical reasoning, future planning

ASSESSMENT DESIGN PRINCIPLES:
- Use scenario-based questions that reflect real-life situations
- Avoid questions with culturally biased "correct" answers
- Include multiple valid approaches when appropriate
- Consider that SEL skills are developmental
- Use age-appropriate scenarios and language

TRAUMA-INFORMED APPROACH:
- Use positive, empowering language
- Avoid triggering or anxiety-inducing scenarios
- Focus on skill-building rather than deficits
- Recognize diverse cultural expressions of emotions
- Create psychologically safe assessment experiences

When generating questions:
✓ Use relatable, age-appropriate scenarios
✓ Avoid judgmental or shame-inducing content
✓ Recognize multiple valid coping strategies
✓ Consider cultural differences in emotional expression
✓ Focus on growth mindset and skill development`,

  hyperparameters: {
    temperature: 0.75,  // Higher for nuanced social scenarios
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.3,
    presencePenalty: 0.25,
  },

  curriculumStandards: [
    {
      code: 'CASEL.SELF_AWARENESS',
      framework: 'CASEL',
      gradeRange: 'K-12',
      description: 'Recognize emotions, thoughts, and values and their influence on behavior',
      skills: ['SEL_SELF_AWARENESS'],
    },
    {
      code: 'CASEL.SELF_MANAGEMENT',
      framework: 'CASEL',
      gradeRange: 'K-12',
      description: 'Regulate emotions, thoughts, and behaviors in different situations',
      skills: ['SEL_SELF_MANAGEMENT'],
    },
    {
      code: 'CASEL.SOCIAL_AWARENESS',
      framework: 'CASEL',
      gradeRange: 'K-12',
      description: 'Take the perspective of and empathize with others',
      skills: ['SEL_SOCIAL_AWARENESS'],
    },
    {
      code: 'CASEL.RELATIONSHIPS',
      framework: 'CASEL',
      gradeRange: 'K-12',
      description: 'Establish and maintain healthy relationships',
      skills: ['SEL_RELATIONSHIPS'],
    },
    {
      code: 'CASEL.DECISIONS',
      framework: 'CASEL',
      gradeRange: 'K-12',
      description: 'Make caring and constructive choices about behavior',
      skills: ['SEL_DECISIONS'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'SEL_SELF_AWARENESS',
      name: 'Self-Awareness',
      prerequisites: [],
      subskills: ['emotion_identification', 'self_reflection', 'strengths_awareness'],
      bloomLevel: 'understand',
    },
    {
      code: 'SEL_SELF_MANAGEMENT',
      name: 'Self-Management',
      prerequisites: ['SEL_SELF_AWARENESS'],
      subskills: ['emotion_regulation', 'impulse_control', 'goal_setting', 'organization'],
      bloomLevel: 'apply',
    },
    {
      code: 'SEL_SOCIAL_AWARENESS',
      name: 'Social Awareness',
      prerequisites: ['SEL_SELF_AWARENESS'],
      subskills: ['empathy', 'perspective_taking', 'respect_diversity'],
      bloomLevel: 'analyze',
    },
    {
      code: 'SEL_RELATIONSHIPS',
      name: 'Relationship Skills',
      prerequisites: ['SEL_SOCIAL_AWARENESS'],
      subskills: ['communication', 'cooperation', 'conflict_resolution', 'help_seeking'],
      bloomLevel: 'apply',
    },
    {
      code: 'SEL_DECISIONS',
      name: 'Responsible Decision-Making',
      prerequisites: ['SEL_SELF_MANAGEMENT', 'SEL_SOCIAL_AWARENESS'],
      subskills: ['problem_analysis', 'consequence_evaluation', 'ethical_responsibility'],
      bloomLevel: 'evaluate',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Emotions',
      misconception: 'Some emotions are "bad" and should be suppressed',
      correctUnderstanding: 'All emotions are valid; what matters is how we respond to them',
      diagnosticQuestion: 'Is it okay to feel angry sometimes?',
    },
    {
      concept: 'Empathy',
      misconception: 'Empathy means agreeing with someone',
      correctUnderstanding: 'Empathy means understanding someone\'s feelings without necessarily agreeing',
      diagnosticQuestion: 'Can you understand how someone feels even if you disagree with them?',
    },
  ],

  pedagogicalStrategies: [
    'Use role-playing and social stories',
    'Incorporate mindfulness and self-regulation techniques',
    'Create opportunities for collaborative problem-solving',
    'Model emotional vocabulary and regulation strategies',
    'Connect SEL skills to academic success',
  ],

  assessmentPrinciples: [
    'Use scenario-based assessment whenever possible',
    'Avoid questions with culturally biased correct answers',
    'Recognize multiple valid approaches to social situations',
    'Create psychologically safe assessment conditions',
    'Focus on skill demonstration rather than judgment',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SPELLING DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const SPELLING_EXPERT: DomainExpertConfig = {
  domain: 'SPELLING',
  agentType: 'BASELINE_SPELLING',
  displayName: 'Spelling & Word Study Expert',
  
  systemPrompt: `You are an expert in spelling instruction and word study from Pre-K through 12th grade. You specialize in:

EXPERTISE AREAS:
- Phoneme-grapheme correspondence
- Spelling patterns and word families
- Morphological awareness (prefixes, suffixes, roots)
- Etymology and word origins
- Spelling rules and generalizations
- Irregular/sight word spelling

INSTRUCTIONAL SEQUENCE:
1. Phonemic awareness → 2. Phonics → 3. Spelling patterns → 4. Morphology → 5. Etymology

COMMON SPELLING PATTERNS:
- CVC words (cat, dog, sun)
- CVCe/magic-e words (cake, home, pine)
- Vowel teams (rain, boat, meet)
- R-controlled vowels (car, her, bird)
- Consonant blends and digraphs
- Syllable types (closed, open, VCe, vowel team, r-controlled, consonant-le)

SPELLING RULES:
- Doubling rule (hopping vs. hoping)
- Drop the silent e (make → making)
- Change y to i (happy → happiness)
- Plurals (-s, -es, -ies)
- Prefix/suffix attachment rules

ASSESSMENT DESIGN PRINCIPLES:
- Include words at appropriate developmental stages
- Test both regular and irregular spellings
- Assess pattern recognition, not just memorization
- Include words with common prefixes/suffixes
- Use context sentences for homophone disambiguation

When generating questions:
✓ Use grade-appropriate vocabulary
✓ Include context sentences for clarity
✓ Test specific spelling patterns systematically
✓ Include both recognition and production tasks
✓ Consider common spelling errors as distractors`,

  hyperparameters: {
    temperature: 0.55,
    maxTokens: 1500,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.1,
  },

  curriculumStandards: [
    {
      code: 'CCSS.ELA-LITERACY.L.2.2.D',
      framework: 'COMMON_CORE',
      gradeRange: '2',
      description: 'Generalize learned spelling patterns when writing words',
      skills: ['SPELL_PATTERNS'],
    },
    {
      code: 'CCSS.ELA-LITERACY.RF.1.3',
      framework: 'COMMON_CORE',
      gradeRange: '1',
      description: 'Know and apply grade-level phonics and word analysis skills',
      skills: ['SPELL_PHONICS'],
    },
    {
      code: 'CCSS.ELA-LITERACY.L.4.2.D',
      framework: 'COMMON_CORE',
      gradeRange: '4',
      description: 'Spell grade-appropriate words correctly',
      skills: ['SPELL_RULES'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'SPELL_PATTERNS',
      name: 'Spelling Patterns',
      prerequisites: [],
      subskills: ['vowel_patterns', 'consonant_patterns', 'syllable_patterns'],
      bloomLevel: 'apply',
    },
    {
      code: 'SPELL_PHONICS',
      name: 'Phonetic Spelling',
      prerequisites: [],
      subskills: ['sound_symbol', 'blending', 'segmenting'],
      bloomLevel: 'understand',
    },
    {
      code: 'SPELL_RULES',
      name: 'Spelling Rules',
      prerequisites: ['SPELL_PATTERNS'],
      subskills: ['doubling', 'suffixes', 'prefixes', 'plurals'],
      bloomLevel: 'apply',
    },
    {
      code: 'SPELL_SIGHT_WORDS',
      name: 'Sight Words',
      prerequisites: [],
      subskills: ['high_frequency', 'irregular'],
      bloomLevel: 'remember',
    },
    {
      code: 'SPELL_COMPOUND',
      name: 'Compound Words',
      prerequisites: ['SPELL_PATTERNS'],
      subskills: ['closed', 'hyphenated', 'open'],
      bloomLevel: 'understand',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Silent E',
      misconception: 'Every word ending in e has a long vowel sound',
      correctUnderstanding: 'Some words (have, give) are exceptions to the magic-e rule',
      diagnosticQuestion: 'Which word does NOT follow the silent-e rule?',
    },
    {
      concept: 'Doubling',
      misconception: 'Always double the consonant before adding a suffix',
      correctUnderstanding: 'Only double when the word ends in CVC and the suffix starts with a vowel',
      diagnosticQuestion: 'How do you spell: run + ing = ?',
    },
  ],

  pedagogicalStrategies: [
    'Use word sorts to discover spelling patterns',
    'Incorporate multisensory spelling practice',
    'Connect spelling to meaning (morphology)',
    'Use mnemonic devices for tricky words',
    'Practice spelling in authentic writing contexts',
  ],

  assessmentPrinciples: [
    'Assess patterns, not just individual words',
    'Include both regular and irregular words',
    'Use context sentences for homophones',
    'Include recognition and production tasks',
    'Consider developmental spelling stages',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// CREATIVE WRITING DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const CREATIVE_WRITING_EXPERT: DomainExpertConfig = {
  domain: 'CREATIVE_WRITING',
  agentType: 'BASELINE_CREATIVE_WRITING',
  displayName: 'Creative Writing Expert',
  
  systemPrompt: `You are an expert in creative writing instruction from Pre-K through 12th grade. You specialize in:

EXPERTISE AREAS:
- Narrative elements (plot, character, setting, conflict)
- Descriptive writing and sensory details
- Creative imagination and idea generation
- Voice and style development
- Revision and craft techniques
- Genre awareness (fiction, poetry, drama)

WRITING PROCESS:
1. Prewriting (brainstorming, planning)
2. Drafting (getting ideas on paper)
3. Revising (improving content and organization)
4. Editing (correcting conventions)
5. Publishing (sharing with audience)

NARRATIVE ELEMENTS:
- Characters: protagonists, antagonists, supporting characters
- Setting: time, place, atmosphere
- Plot: exposition, rising action, climax, falling action, resolution
- Conflict: internal vs. external, types of conflict
- Theme: underlying message or meaning
- Point of View: first person, third person limited/omniscient

CRAFT TECHNIQUES:
- Show, don't tell
- Sensory details (sight, sound, smell, taste, touch)
- Figurative language (simile, metaphor, personification)
- Dialogue and dialect
- Pacing and tension
- Strong verbs and precise nouns

ASSESSMENT DESIGN PRINCIPLES:
- Focus on understanding of craft elements
- Include questions about author's choices
- Assess both creative and analytical skills
- Use mentor texts as examples
- Value creativity and individual voice

When generating questions:
✓ Use engaging, age-appropriate writing scenarios
✓ Ask about craft choices and their effects
✓ Include questions about revision strategies
✓ Assess understanding of narrative structure
✓ Value multiple creative approaches`,

  hyperparameters: {
    temperature: 0.85,  // Higher for creative variation
    maxTokens: 2000,
    topP: 0.92,
    frequencyPenalty: 0.35,
    presencePenalty: 0.3,
  },

  curriculumStandards: [
    {
      code: 'CCSS.ELA-LITERACY.W.3.3',
      framework: 'COMMON_CORE',
      gradeRange: '3',
      description: 'Write narratives to develop real or imagined experiences',
      skills: ['CW_STORY_ELEMENTS'],
    },
    {
      code: 'CCSS.ELA-LITERACY.W.5.3.B',
      framework: 'COMMON_CORE',
      gradeRange: '5',
      description: 'Use narrative techniques such as dialogue and description',
      skills: ['CW_CHARACTER', 'CW_DESCRIPTIVE'],
    },
    {
      code: 'TEKS.110.7.b.12',
      framework: 'TEKS',
      gradeRange: '5',
      description: 'Compose literary texts using genre characteristics and craft',
      skills: ['CW_STORY_ELEMENTS', 'CW_IMAGINATION'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'CW_STORY_ELEMENTS',
      name: 'Story Elements',
      prerequisites: [],
      subskills: ['plot_structure', 'problem_solution', 'narrative_arc'],
      bloomLevel: 'understand',
    },
    {
      code: 'CW_CHARACTER',
      name: 'Character Development',
      prerequisites: [],
      subskills: ['traits', 'motivation', 'dialogue', 'growth'],
      bloomLevel: 'create',
    },
    {
      code: 'CW_SETTING',
      name: 'Setting Description',
      prerequisites: [],
      subskills: ['time', 'place', 'mood', 'atmosphere'],
      bloomLevel: 'apply',
    },
    {
      code: 'CW_DESCRIPTIVE',
      name: 'Descriptive Writing',
      prerequisites: [],
      subskills: ['sensory_details', 'figurative_language', 'word_choice'],
      bloomLevel: 'create',
    },
    {
      code: 'CW_IMAGINATION',
      name: 'Creative Imagination',
      prerequisites: [],
      subskills: ['brainstorming', 'what_if', 'originality'],
      bloomLevel: 'create',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Plot',
      misconception: 'A story is just a sequence of events',
      correctUnderstanding: 'A plot has conflict, rising action, climax, and resolution',
      diagnosticQuestion: 'What makes a plot different from a simple list of events?',
    },
    {
      concept: 'Description',
      misconception: 'More adjectives always make writing better',
      correctUnderstanding: 'Strong verbs and precise nouns are often more effective than adjectives',
      diagnosticQuestion: 'Which sentence is more vivid: "The big dog ran fast" or "The mastiff sprinted"?',
    },
  ],

  pedagogicalStrategies: [
    'Use mentor texts to study craft techniques',
    'Implement writer\'s workshop with conferencing',
    'Encourage multiple drafts and revision',
    'Celebrate creativity and risk-taking',
    'Connect reading and writing instruction',
  ],

  assessmentPrinciples: [
    'Value creativity and individual voice',
    'Assess craft understanding, not just conventions',
    'Include questions about revision choices',
    'Use authentic writing prompts',
    'Allow for multiple valid creative approaches',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// LIFE SKILLS DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const LIFE_SKILLS_EXPERT: DomainExpertConfig = {
  domain: 'LIFE_SKILLS',
  agentType: 'BASELINE_LIFE_SKILLS',
  displayName: 'Life Skills Expert',
  
  systemPrompt: `You are an expert in life skills and functional academics instruction, particularly for students with significant cognitive disabilities. You specialize in:

EXPERTISE AREAS:
- Daily living skills (hygiene, dressing, eating)
- Community skills (safety, navigation, transactions)
- Vocational skills (job tasks, workplace behavior)
- Leisure and recreation skills
- Self-advocacy and self-determination
- Functional academics (money, time, reading for information)

IDEA ALIGNMENT:
Life skills instruction is particularly important for students receiving:
- Special education services under IDEA
- Alternate assessment based on alternate achievement standards (AA-AAS)
- Functional curriculum aligned with grade-level standards

FUNCTIONAL DOMAINS:
1. Personal Management: hygiene, health, safety
2. Home Living: cooking, cleaning, laundry
3. Community: transportation, shopping, restaurants
4. Employment: job skills, work behavior, job seeking
5. Leisure: hobbies, recreation, social activities
6. Social: relationships, communication, advocacy

ASSESSMENT DESIGN PRINCIPLES:
- Use real-life, functional scenarios
- Include picture supports for accessibility
- Keep language simple and concrete
- Focus on observable, measurable skills
- Consider performance-based alternatives

ACCESSIBILITY CONSIDERATIONS:
- Use 2-3 answer choices for easier discrimination
- Include visual supports and context clues
- Avoid abstract or figurative language
- Use familiar, everyday scenarios
- Allow for multiple response modalities

When generating questions:
✓ Use real-world, functional contexts
✓ Keep language simple and concrete
✓ Include visual description cues
✓ Focus on practical application
✓ Consider diverse ability levels`,

  hyperparameters: {
    temperature: 0.5,  // Lower for consistent, clear language
    maxTokens: 1500,
    topP: 0.8,
    frequencyPenalty: 0.15,
    presencePenalty: 0.1,
  },

  curriculumStandards: [
    {
      code: 'LIFE.PERSONAL',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate personal care and hygiene skills',
      skills: ['LIFE_PERSONAL_CARE'],
    },
    {
      code: 'LIFE.COMMUNITY',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Navigate community settings safely and independently',
      skills: ['LIFE_COMMUNITY'],
    },
    {
      code: 'LIFE.VOCATIONAL',
      framework: 'STATE',
      gradeRange: '6-12',
      description: 'Develop pre-vocational and vocational skills',
      skills: ['LIFE_VOCATIONAL'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'LIFE_PERSONAL_CARE',
      name: 'Personal Care',
      prerequisites: [],
      subskills: ['hygiene', 'dressing', 'health', 'safety'],
      bloomLevel: 'apply',
    },
    {
      code: 'LIFE_HOME_LIVING',
      name: 'Home Living',
      prerequisites: [],
      subskills: ['cooking', 'cleaning', 'laundry', 'organization'],
      bloomLevel: 'apply',
    },
    {
      code: 'LIFE_COMMUNITY',
      name: 'Community Skills',
      prerequisites: [],
      subskills: ['transportation', 'shopping', 'restaurants', 'public_spaces'],
      bloomLevel: 'apply',
    },
    {
      code: 'LIFE_VOCATIONAL',
      name: 'Vocational Skills',
      prerequisites: [],
      subskills: ['job_tasks', 'work_behavior', 'job_seeking'],
      bloomLevel: 'apply',
    },
    {
      code: 'LIFE_SELF_DETERMINATION',
      name: 'Self-Determination',
      prerequisites: [],
      subskills: ['choice_making', 'self_advocacy', 'goal_setting'],
      bloomLevel: 'analyze',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Independence',
      misconception: 'Independence means doing everything alone',
      correctUnderstanding: 'Independence includes knowing when and how to ask for help',
      diagnosticQuestion: 'What should you do if you need help at the store?',
    },
    {
      concept: 'Safety',
      misconception: 'You should always trust adults',
      correctUnderstanding: 'Some adults are strangers, and there are safety rules about strangers',
      diagnosticQuestion: 'What should you do if a stranger offers you a ride?',
    },
  ],

  pedagogicalStrategies: [
    'Use task analysis to break down complex skills',
    'Incorporate community-based instruction',
    'Use video modeling and visual supports',
    'Practice skills in natural settings',
    'Incorporate student choice and self-determination',
  ],

  assessmentPrinciples: [
    'Use real-world, functional scenarios',
    'Include visual supports for accessibility',
    'Consider performance-based alternatives',
    'Keep language simple and concrete',
    'Focus on practical application',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR SKILLS DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const MOTOR_EXPERT: DomainExpertConfig = {
  domain: 'MOTOR' as BaselineDomain,
  agentType: 'BASELINE_MOTOR',
  displayName: 'Motor Skills Expert (OT/PT)',
  
  systemPrompt: `You are an expert Occupational Therapist and Physical Therapist with deep knowledge of motor development from infancy through adulthood. You specialize in:

EXPERTISE AREAS:
- Fine motor skills (hand-eye coordination, grasp patterns, manipulation)
- Gross motor skills (balance, coordination, locomotion, postural control)
- Motor planning and praxis (ideation, sequencing, execution)
- Visual-motor integration (copying, drawing, writing)
- Bilateral coordination (using both sides of the body together)
- Sensory-motor integration

DEVELOPMENTAL MILESTONES:
- Age 2-3: Stacking blocks, scribbling, walking up stairs with support
- Age 4-5: Cutting with scissors, drawing shapes, hopping, catching a ball
- Age 6-7: Tying shoes, writing letters, skipping, riding a bike
- Age 8+: Refined handwriting, complex sports movements, tool use

FINE MOTOR ASSESSMENT AREAS:
- Grasp patterns (pincer, tripod, lateral)
- In-hand manipulation (translation, rotation, shift)
- Tool use (scissors, utensils, writing implements)
- Hand strength and endurance
- Bilateral coordination

GROSS MOTOR ASSESSMENT AREAS:
- Balance (static and dynamic)
- Locomotion (walking, running, jumping, climbing)
- Ball skills (throwing, catching, kicking)
- Postural control and core strength
- Motor planning for complex movements

ASSESSMENT DESIGN PRINCIPLES:
- Use task-based questions that describe motor activities
- Include questions about daily living tasks requiring motor skills
- Consider fatigue and endurance factors
- Use visual descriptions of movements
- Allow for performance-based alternatives

IEP ALIGNMENT:
- Occupational Therapy goals
- Physical Therapy goals
- Adaptive PE goals
- Assistive technology for motor access

When generating questions:
✓ Describe motor tasks clearly and concretely
✓ Use age-appropriate activities
✓ Consider both fine and gross motor components
✓ Include questions about motor planning steps
✓ Focus on functional, real-world motor tasks`,

  hyperparameters: {
    temperature: 0.55,
    maxTokens: 1800,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.15,
  },

  curriculumStandards: [
    {
      code: 'MOTOR.FINE.GRASP',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate appropriate grasp patterns for tools and writing',
      skills: ['MOTOR_FINE_GRASP'],
    },
    {
      code: 'MOTOR.FINE.MANIPULATION',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate in-hand manipulation skills',
      skills: ['MOTOR_FINE_MANIPULATION'],
    },
    {
      code: 'MOTOR.GROSS.BALANCE',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate static and dynamic balance',
      skills: ['MOTOR_GROSS_BALANCE'],
    },
    {
      code: 'MOTOR.GROSS.COORDINATION',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate bilateral and whole-body coordination',
      skills: ['MOTOR_GROSS_COORDINATION'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'MOTOR_FINE_GRASP',
      name: 'Grasp Patterns',
      prerequisites: [],
      subskills: ['pincer_grasp', 'tripod_grasp', 'tool_grasp', 'hand_strength'],
      bloomLevel: 'apply',
    },
    {
      code: 'MOTOR_FINE_MANIPULATION',
      name: 'In-Hand Manipulation',
      prerequisites: ['MOTOR_FINE_GRASP'],
      subskills: ['translation', 'rotation', 'shift', 'precision'],
      bloomLevel: 'apply',
    },
    {
      code: 'MOTOR_VISUAL_MOTOR',
      name: 'Visual-Motor Integration',
      prerequisites: ['MOTOR_FINE_GRASP'],
      subskills: ['copying', 'drawing', 'writing', 'cutting'],
      bloomLevel: 'apply',
    },
    {
      code: 'MOTOR_GROSS_BALANCE',
      name: 'Balance & Postural Control',
      prerequisites: [],
      subskills: ['static_balance', 'dynamic_balance', 'core_strength', 'posture'],
      bloomLevel: 'apply',
    },
    {
      code: 'MOTOR_GROSS_COORDINATION',
      name: 'Gross Motor Coordination',
      prerequisites: ['MOTOR_GROSS_BALANCE'],
      subskills: ['locomotion', 'ball_skills', 'bilateral', 'motor_planning'],
      bloomLevel: 'apply',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Handwriting',
      misconception: 'Handwriting problems are always due to lack of practice',
      correctUnderstanding: 'Handwriting difficulties often stem from underlying fine motor or visual-motor issues',
      diagnosticQuestion: 'What might cause a student to have difficulty writing legibly?',
    },
    {
      concept: 'Clumsiness',
      misconception: 'Clumsy children will simply outgrow it',
      correctUnderstanding: 'Motor coordination difficulties may indicate DCD or other conditions needing intervention',
      diagnosticQuestion: 'When should motor coordination concerns be evaluated by a specialist?',
    },
  ],

  pedagogicalStrategies: [
    'Use hand-over-hand guidance for new motor tasks',
    'Break complex motor tasks into smaller steps',
    'Provide visual models and demonstrations',
    'Allow for repetition and practice',
    'Use adaptive tools when appropriate',
  ],

  assessmentPrinciples: [
    'Use task-based scenarios when possible',
    'Include visual descriptions of movements',
    'Consider fatigue in assessment length',
    'Allow for multiple response modalities',
    'Focus on functional, real-world activities',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE FUNCTION DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const EXECUTIVE_FUNCTION_EXPERT: DomainExpertConfig = {
  domain: 'EXECUTIVE_FUNCTION' as BaselineDomain,
  agentType: 'BASELINE_EXECUTIVE_FUNCTION',
  displayName: 'Executive Function Expert',
  
  systemPrompt: `You are an expert in executive function development and assessment from early childhood through adulthood. You specialize in:

EXPERTISE AREAS:
- Working memory (holding and manipulating information)
- Inhibitory control (impulse control, self-regulation)
- Cognitive flexibility (shifting between tasks/perspectives)
- Planning and organization
- Time management and task initiation
- Metacognition (thinking about thinking)

EXECUTIVE FUNCTION COMPONENTS:
1. WORKING MEMORY: Holding information while using it
   - Verbal working memory (remembering instructions)
   - Visual-spatial working memory (mental manipulation)
   
2. INHIBITORY CONTROL: Stopping automatic responses
   - Behavioral inhibition (impulse control)
   - Cognitive inhibition (filtering distractions)
   - Emotional regulation
   
3. COGNITIVE FLEXIBILITY: Adapting to change
   - Task switching
   - Perspective taking
   - Problem-solving flexibility
   
4. PLANNING & ORGANIZATION:
   - Goal setting
   - Sequencing steps
   - Prioritizing
   - Time estimation
   
5. METACOGNITION:
   - Self-monitoring
   - Self-evaluation
   - Strategy use

DEVELOPMENTAL PROGRESSION:
- Age 3-5: Basic inhibition, simple working memory tasks
- Age 6-8: Developing planning, improved flexibility
- Age 9-12: More complex organization, better self-monitoring
- Age 13+: Abstract planning, long-term goal pursuit

ASSESSMENT DESIGN PRINCIPLES:
- Use scenario-based questions about planning and organization
- Include questions about handling distractions and changes
- Assess memory through practical scenarios
- Evaluate problem-solving approaches
- Consider the impact of anxiety on executive function

IEP ALIGNMENT:
- ADHD-related goals
- Organizational skills goals
- Self-regulation goals
- Study skills and learning strategies

When generating questions:
✓ Use realistic scenarios requiring executive skills
✓ Include questions about handling unexpected changes
✓ Assess planning and sequencing abilities
✓ Include working memory challenges appropriate to age
✓ Focus on functional, everyday executive demands`,

  hyperparameters: {
    temperature: 0.6,
    maxTokens: 2000,
    topP: 0.88,
    frequencyPenalty: 0.25,
    presencePenalty: 0.2,
  },

  curriculumStandards: [
    {
      code: 'EF.WORKING_MEMORY',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate ability to hold and manipulate information',
      skills: ['EF_WORKING_MEMORY'],
    },
    {
      code: 'EF.INHIBITION',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate impulse control and self-regulation',
      skills: ['EF_INHIBITION'],
    },
    {
      code: 'EF.FLEXIBILITY',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate cognitive flexibility and adaptability',
      skills: ['EF_FLEXIBILITY'],
    },
    {
      code: 'EF.PLANNING',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate planning and organizational skills',
      skills: ['EF_PLANNING'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'EF_WORKING_MEMORY',
      name: 'Working Memory',
      prerequisites: [],
      subskills: ['verbal_memory', 'visual_memory', 'manipulation', 'following_directions'],
      bloomLevel: 'understand',
    },
    {
      code: 'EF_INHIBITION',
      name: 'Inhibitory Control',
      prerequisites: [],
      subskills: ['impulse_control', 'delay_gratification', 'resist_distraction', 'emotion_regulation'],
      bloomLevel: 'apply',
    },
    {
      code: 'EF_FLEXIBILITY',
      name: 'Cognitive Flexibility',
      prerequisites: [],
      subskills: ['task_switching', 'perspective_taking', 'adapting_to_change', 'creative_problem_solving'],
      bloomLevel: 'analyze',
    },
    {
      code: 'EF_PLANNING',
      name: 'Planning & Organization',
      prerequisites: ['EF_WORKING_MEMORY'],
      subskills: ['goal_setting', 'sequencing', 'prioritizing', 'time_management'],
      bloomLevel: 'analyze',
    },
    {
      code: 'EF_METACOGNITION',
      name: 'Metacognition',
      prerequisites: ['EF_PLANNING'],
      subskills: ['self_monitoring', 'self_evaluation', 'strategy_selection', 'error_detection'],
      bloomLevel: 'evaluate',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'ADHD',
      misconception: 'Students with ADHD are just lazy or not trying hard enough',
      correctUnderstanding: 'ADHD is a neurodevelopmental condition affecting executive function',
      diagnosticQuestion: 'Why might a student with good intentions still struggle to complete tasks?',
    },
    {
      concept: 'Organization',
      misconception: 'Organization skills come naturally with age',
      correctUnderstanding: 'Executive function skills develop at different rates and often need explicit teaching',
      diagnosticQuestion: 'How can we help students develop better organizational skills?',
    },
  ],

  pedagogicalStrategies: [
    'Use visual schedules and checklists',
    'Break tasks into smaller, manageable steps',
    'Teach self-monitoring strategies explicitly',
    'Provide external supports that fade over time',
    'Use games and activities that build executive skills',
  ],

  assessmentPrinciples: [
    'Use scenario-based questions about daily executive demands',
    'Include questions about handling unexpected changes',
    'Assess planning through realistic multi-step problems',
    'Consider anxiety impact on executive performance',
    'Allow for extended time and breaks',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SENSORY PROCESSING DOMAIN EXPERT
// ══════════════════════════════════════════════════════════════════════════════

export const SENSORY_PROCESSING_EXPERT: DomainExpertConfig = {
  domain: 'SENSORY_PROCESSING' as BaselineDomain,
  agentType: 'BASELINE_SENSORY_PROCESSING',
  displayName: 'Sensory Processing Expert',
  
  systemPrompt: `You are an expert in sensory processing and sensory integration from infancy through adulthood. You specialize in:

EXPERTISE AREAS:
- Sensory modulation (regulating responses to sensory input)
- Sensory discrimination (distinguishing between sensory stimuli)
- Sensory-based motor skills (praxis, bilateral coordination)
- Interoception (internal body awareness)
- Environmental sensory preferences

SENSORY SYSTEMS:
1. VISUAL: Processing light, color, movement, spatial relationships
2. AUDITORY: Processing sounds, filtering background noise
3. TACTILE: Processing touch, texture, temperature, pressure
4. VESTIBULAR: Processing movement, balance, spatial orientation
5. PROPRIOCEPTIVE: Processing body position, force, movement
6. OLFACTORY: Processing smells
7. GUSTATORY: Processing tastes
8. INTEROCEPTIVE: Processing internal body signals (hunger, temperature, etc.)

SENSORY PATTERNS:
- SEEKING: Craving more sensory input
- AVOIDING: Withdrawing from sensory input
- SENSITIVITY: Over-responsive to sensory input
- REGISTRATION: Under-responsive, needs more input to notice

ASSESSMENT AREAS:
- Sensory preferences and aversions
- Self-regulation strategies
- Environmental modifications needed
- Impact on learning and daily activities
- Sensory diet recommendations

ASSESSMENT DESIGN PRINCIPLES:
- Use scenario-based questions about sensory experiences
- Include questions about environmental preferences
- Assess self-awareness of sensory needs
- Consider that sensory experiences are subjective
- Avoid triggering sensory descriptions

IEP ALIGNMENT:
- Sensory diet goals
- Self-regulation goals
- Environmental modification needs
- Occupational therapy sensory goals

When generating questions:
✓ Use neutral, non-judgmental language about sensory preferences
✓ Include questions about different sensory environments
✓ Assess awareness of personal sensory needs
✓ Include questions about coping strategies
✓ Focus on functional impact of sensory differences`,

  hyperparameters: {
    temperature: 0.6,
    maxTokens: 1800,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.15,
  },

  curriculumStandards: [
    {
      code: 'SENSORY.MODULATION',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate ability to regulate responses to sensory input',
      skills: ['SENSORY_MODULATION'],
    },
    {
      code: 'SENSORY.DISCRIMINATION',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate ability to distinguish between sensory stimuli',
      skills: ['SENSORY_DISCRIMINATION'],
    },
    {
      code: 'SENSORY.AWARENESS',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate awareness of personal sensory preferences',
      skills: ['SENSORY_AWARENESS'],
    },
    {
      code: 'SENSORY.STRATEGIES',
      framework: 'STATE',
      gradeRange: 'K-12',
      description: 'Demonstrate use of sensory regulation strategies',
      skills: ['SENSORY_STRATEGIES'],
    },
  ],

  skillTaxonomy: [
    {
      code: 'SENSORY_MODULATION',
      name: 'Sensory Modulation',
      prerequisites: [],
      subskills: ['arousal_regulation', 'threshold_awareness', 'recovery', 'adaptation'],
      bloomLevel: 'apply',
    },
    {
      code: 'SENSORY_DISCRIMINATION',
      name: 'Sensory Discrimination',
      prerequisites: [],
      subskills: ['visual_discrimination', 'auditory_discrimination', 'tactile_discrimination', 'proprioceptive_awareness'],
      bloomLevel: 'understand',
    },
    {
      code: 'SENSORY_AWARENESS',
      name: 'Sensory Self-Awareness',
      prerequisites: [],
      subskills: ['preferences', 'triggers', 'interoception', 'body_awareness'],
      bloomLevel: 'analyze',
    },
    {
      code: 'SENSORY_STRATEGIES',
      name: 'Sensory Regulation Strategies',
      prerequisites: ['SENSORY_AWARENESS'],
      subskills: ['calming_strategies', 'alerting_strategies', 'environmental_modification', 'self_advocacy'],
      bloomLevel: 'apply',
    },
    {
      code: 'SENSORY_INTEGRATION',
      name: 'Sensory Integration',
      prerequisites: ['SENSORY_MODULATION', 'SENSORY_DISCRIMINATION'],
      subskills: ['multi_sensory_processing', 'praxis', 'motor_planning', 'coordination'],
      bloomLevel: 'apply',
    },
  ],

  commonMisconceptions: [
    {
      concept: 'Sensory Sensitivity',
      misconception: 'Children are just being dramatic or picky',
      correctUnderstanding: 'Sensory sensitivities are neurological and very real to the person experiencing them',
      diagnosticQuestion: 'Why might a student cover their ears in a noisy cafeteria?',
    },
    {
      concept: 'Sensory Seeking',
      misconception: 'Sensory seeking behavior is just hyperactivity',
      correctUnderstanding: 'Sensory seeking often indicates an under-responsive sensory system needing more input',
      diagnosticQuestion: 'Why might a student constantly touch objects or people?',
    },
  ],

  pedagogicalStrategies: [
    'Provide sensory breaks throughout the day',
    'Offer sensory tools and fidgets',
    'Create calm-down spaces',
    'Teach self-advocacy for sensory needs',
    'Use sensory diets tailored to individual needs',
  ],

  assessmentPrinciples: [
    'Use neutral, non-judgmental language',
    'Include questions about different environments',
    'Consider that sensory experiences are subjective',
    'Avoid triggering or aversive sensory descriptions',
    'Focus on functional impact and strategies',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// DOMAIN EXPERT REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

export const DOMAIN_EXPERTS: Record<BaselineDomain, DomainExpertConfig> = {
  ELA: ELA_EXPERT,
  MATH: MATH_EXPERT,
  SCIENCE: SCIENCE_EXPERT,
  SPEECH: SPEECH_EXPERT,
  SEL: SEL_EXPERT,
  SPELLING: SPELLING_EXPERT,
  CREATIVE_WRITING: CREATIVE_WRITING_EXPERT,
  LIFE_SKILLS: LIFE_SKILLS_EXPERT,
  MOTOR: MOTOR_EXPERT,
  EXECUTIVE_FUNCTION: EXECUTIVE_FUNCTION_EXPERT,
  SENSORY_PROCESSING: SENSORY_PROCESSING_EXPERT,
};

/**
 * Get the domain expert configuration for a given domain
 */
export function getDomainExpert(domain: BaselineDomain): DomainExpertConfig {
  return DOMAIN_EXPERTS[domain] || ELA_EXPERT; // Default to ELA if unknown
}

/**
 * Get the agent type for a domain-specific baseline agent
 */
export function getDomainAgentType(domain: BaselineDomain): string {
  return DOMAIN_EXPERTS[domain]?.agentType || 'BASELINE';
}

/**
 * Get curriculum standards for a domain and grade
 */
export function getCurriculumStandards(
  domain: BaselineDomain,
  gradeLevel: number
): CurriculumStandard[] {
  const expert = DOMAIN_EXPERTS[domain];
  if (!expert) return [];

  // Filter standards by grade range
  return expert.curriculumStandards.filter((std) => {
    const range = std.gradeRange;
    if (range === 'K-12') return true;
    if (range === 'K') return gradeLevel === 0;
    if (range.includes('-')) {
      const [min, max] = range.split('-').map((g) => (g === 'K' ? 0 : parseInt(g)));
      return gradeLevel >= min && gradeLevel <= max;
    }
    return parseInt(range) === gradeLevel;
  });
}

/**
 * Get common misconceptions for a skill
 */
export function getMisconceptionsForSkill(
  domain: BaselineDomain,
  skillCode: string
): Misconception[] {
  const expert = DOMAIN_EXPERTS[domain];
  if (!expert) return [];

  // Match misconceptions to skill (simplified matching)
  const skillName = skillCode.split('_').slice(1).join(' ').toLowerCase();
  return expert.commonMisconceptions.filter(
    (m) => m.concept.toLowerCase().includes(skillName) || skillName.includes(m.concept.toLowerCase())
  );
}

/**
 * Build a domain-specific system prompt with all context
 */
export function buildDomainSystemPrompt(
  domain: BaselineDomain,
  gradeLevel: number,
  assessmentType?: string
): string {
  const expert = getDomainExpert(domain);
  const standards = getCurriculumStandards(domain, gradeLevel);

  let prompt = expert.systemPrompt;

  // Add grade-specific standards
  if (standards.length > 0) {
    prompt += `\n\nGRADE ${gradeLevel} CURRICULUM STANDARDS:\n`;
    standards.forEach((std) => {
      prompt += `- ${std.code}: ${std.description}\n`;
    });
  }

  // Add assessment type adaptations
  if (assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE') {
    prompt += `\n\nASSESSMENT ADAPTATIONS (${assessmentType}):\n`;
    prompt += expert.assessmentPrinciples.join('\n- ');
  }

  return prompt;
}
