/**
 * Parent Assessment Question Bank
 * 
 * Pre-baseline assessment for parents to provide context about their child.
 * Helps the system understand the child from the parent's perspective before
 * the child takes the baseline assessment.
 */

export interface ParentAssessmentQuestion {
  id: string;
  category: 'learning_style' | 'strengths' | 'challenges' | 'behavior' | 'preferences' | 'social_emotional';
  questionText: string;
  questionType: 'multiple_choice' | 'rating_scale' | 'open_ended' | 'multi_select';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  required: boolean;
  helpText?: string;
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
      'No, none that I\'m aware of',
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
      'Neutral - doesn\'t seem to affect motivation',
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
    questionText: 'Is there anything else you\'d like us to know about your child?',
    questionType: 'open_ended',
    required: false,
    helpText: 'Share any additional insights, concerns, or context that would help us support your child\'s learning journey.',
  },
];

/**
 * Get categorized questions for progressive disclosure UI
 */
export function getQuestionsByCategory() {
  const categories = {
    learning_style: PARENT_ASSESSMENT_QUESTIONS.filter(q => q.category === 'learning_style'),
    strengths: PARENT_ASSESSMENT_QUESTIONS.filter(q => q.category === 'strengths'),
    challenges: PARENT_ASSESSMENT_QUESTIONS.filter(q => q.category === 'challenges'),
    behavior: PARENT_ASSESSMENT_QUESTIONS.filter(q => q.category === 'behavior'),
    preferences: PARENT_ASSESSMENT_QUESTIONS.filter(q => q.category === 'preferences'),
    social_emotional: PARENT_ASSESSMENT_QUESTIONS.filter(q => q.category === 'social_emotional'),
  };

  return categories;
}

/**
 * Validate parent assessment responses
 */
export function validateResponses(responses: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all required questions are answered
  const requiredQuestions = PARENT_ASSESSMENT_QUESTIONS.filter(q => q.required);
  
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
