/**
 * Built-in Social Story Templates - ND-1.2
 *
 * Pre-authored, evidence-based social stories following Carol Gray's framework.
 * These templates are designed for common educational scenarios and can be
 * personalized for individual learners.
 */

import type { CreateSocialStoryInput } from './social-story.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// STORY TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

export const BUILT_IN_TEMPLATES: CreateSocialStoryInput[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // TRANSITION STORIES
  // ────────────────────────────────────────────────────────────────────────────
  {
    slug: 'starting-my-lesson',
    title: 'Starting My Lesson',
    description: 'Helps learners understand what to expect when beginning a new learning activity.',
    category: 'STARTING_LESSON',
    readingLevel: 'DEVELOPING',
    estimatedDuration: 45,
    gradeBands: ['K_2', 'G3_5'],
    supportsPersonalization: true,
    personalizationTokens: ['NAME', 'TEACHER', 'FAVORITE_ACTIVITY'],
    defaultVisualStyle: 'CARTOON',
    hasAudio: true,
    isBuiltIn: true,
    sourceTemplate: 'built-in-v1',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        sentences: [
          {
            id: 'p1-s1',
            text: "It's time to start a new lesson.",
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s2',
            text: 'Many students feel excited or a little nervous when starting something new.',
            type: 'PERSPECTIVE',
          },
        ],
        visual: {
          id: 'v1',
          type: 'IMAGE',
          url: '/assets/social-stories/starting-lesson-1.svg',
          altText: 'A student sitting at a desk, ready to learn',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E3F2FD',
      },
      {
        id: 'page-2',
        pageNumber: 2,
        sentences: [
          {
            id: 'p2-s1',
            text: '{{NAME}} can take a deep breath before starting.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p2-s2',
            text: 'Taking a breath helps my body feel calm and ready.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v2',
          type: 'IMAGE',
          url: '/assets/social-stories/deep-breath.svg',
          altText: 'A person taking a deep breath with arrows showing inhale and exhale',
          style: 'CARTOON',
          position: 'CENTER',
        },
        interactions: [
          {
            id: 'i1',
            type: 'PRACTICE',
            config: { action: 'breathing_exercise', duration: 5 },
            required: false,
          },
        ],
        backgroundColor: '#E8F5E9',
      },
      {
        id: 'page-3',
        pageNumber: 3,
        sentences: [
          {
            id: 'p3-s1',
            text: 'During the lesson, I will see questions and activities.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p3-s2',
            text: 'It is okay if I need to think about the answers.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p3-s3',
            text: "Learning takes time, and that's perfectly fine.",
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v3',
          type: 'IMAGE',
          url: '/assets/social-stories/thinking-student.svg',
          altText: 'A student with a thought bubble, thinking about a question',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FFF8E1',
      },
      {
        id: 'page-4',
        pageNumber: 4,
        sentences: [
          {
            id: 'p4-s1',
            text: 'If I need help, I can ask {{TEACHER}} or use the help button.',
            type: 'COOPERATIVE',
          },
          {
            id: 'p4-s2',
            text: 'Asking for help shows that I am a good learner.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v4',
          type: 'IMAGE',
          url: '/assets/social-stories/asking-help.svg',
          altText: 'A student raising their hand to ask for help',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#F3E5F5',
      },
      {
        id: 'page-5',
        pageNumber: 5,
        sentences: [
          {
            id: 'p5-s1',
            text: "I'm ready to start my lesson now!",
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p5-s2',
            text: 'I will try my best and learn new things.',
            type: 'DIRECTIVE',
          },
        ],
        visual: {
          id: 'v5',
          type: 'IMAGE',
          url: '/assets/social-stories/confident-student.svg',
          altText: 'A happy, confident student ready to learn',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E0F7FA',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // TAKING A QUIZ
  // ────────────────────────────────────────────────────────────────────────────
  {
    slug: 'taking-a-quiz',
    title: 'Taking a Quiz',
    description: 'Prepares learners for quiz and assessment situations with calming strategies.',
    category: 'TAKING_QUIZ',
    readingLevel: 'DEVELOPING',
    estimatedDuration: 60,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    supportsPersonalization: true,
    personalizationTokens: ['NAME', 'CALM_PLACE'],
    defaultVisualStyle: 'CARTOON',
    hasAudio: true,
    isBuiltIn: true,
    sourceTemplate: 'built-in-v1',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        sentences: [
          {
            id: 'p1-s1',
            text: 'Sometimes I will take quizzes to show what I have learned.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s2',
            text: 'Quizzes help {{NAME}} and teachers see how much I know.',
            type: 'PERSPECTIVE',
          },
        ],
        visual: {
          id: 'v1',
          type: 'IMAGE',
          url: '/assets/social-stories/quiz-intro.svg',
          altText: 'A tablet showing a quiz with multiple choice questions',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E3F2FD',
      },
      {
        id: 'page-2',
        pageNumber: 2,
        sentences: [
          {
            id: 'p2-s1',
            text: 'Some students feel nervous before a quiz.',
            type: 'PERSPECTIVE',
          },
          {
            id: 'p2-s2',
            text: 'This is a normal feeling that many people have.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p2-s3',
            text: 'I can use my calming strategies when I feel nervous.',
            type: 'DIRECTIVE',
          },
        ],
        visual: {
          id: 'v2',
          type: 'IMAGE',
          url: '/assets/social-stories/nervous-student.svg',
          altText: 'A student looking thoughtful with butterflies representing nervous feelings',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FFF3E0',
      },
      {
        id: 'page-3',
        pageNumber: 3,
        sentences: [
          {
            id: 'p3-s1',
            text: 'Before starting, I can take three deep breaths.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s2',
            text: 'I breathe in slowly... and breathe out slowly.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p3-s3',
            text: 'This helps my brain think clearly.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v3',
          type: 'IMAGE',
          url: '/assets/social-stories/breathing-exercise.svg',
          altText: 'Three circles showing breathing in and out rhythm',
          style: 'CARTOON',
          position: 'CENTER',
        },
        interactions: [
          {
            id: 'i1',
            type: 'PRACTICE',
            config: { action: 'breathing_exercise', count: 3 },
            required: false,
          },
        ],
        backgroundColor: '#E8F5E9',
      },
      {
        id: 'page-4',
        pageNumber: 4,
        sentences: [
          {
            id: 'p4-s1',
            text: 'I will read each question carefully.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s2',
            text: "If I don't know an answer, I can skip it and come back later.",
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p4-s3',
            text: "It's okay to not know everything.",
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v4',
          type: 'IMAGE',
          url: '/assets/social-stories/reading-question.svg',
          altText: 'A student reading a question on their device',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E1F5FE',
      },
      {
        id: 'page-5',
        pageNumber: 5,
        sentences: [
          {
            id: 'p5-s1',
            text: 'When I finish, I can feel proud that I tried my best.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p5-s2',
            text: '{{NAME}} is a good learner, no matter the score.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v5',
          type: 'IMAGE',
          url: '/assets/social-stories/proud-student.svg',
          altText: 'A happy student with a star, showing pride in their effort',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FCE4EC',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ASKING FOR A BREAK
  // ────────────────────────────────────────────────────────────────────────────
  {
    slug: 'asking-for-a-break',
    title: 'Asking for a Break',
    description:
      'Teaches learners how to recognize when they need a break and how to ask appropriately.',
    category: 'ASKING_FOR_BREAK',
    readingLevel: 'DEVELOPING',
    estimatedDuration: 50,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    supportsPersonalization: true,
    personalizationTokens: ['NAME', 'TEACHER', 'CALM_PLACE', 'BREAK_SIGNAL'],
    defaultVisualStyle: 'CARTOON',
    hasAudio: true,
    isBuiltIn: true,
    sourceTemplate: 'built-in-v1',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        sentences: [
          {
            id: 'p1-s1',
            text: 'Sometimes my brain and body need a break.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s2',
            text: "Everyone needs breaks, and that's okay.",
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v1',
          type: 'IMAGE',
          url: '/assets/social-stories/need-break.svg',
          altText: 'A student looking tired with low battery symbol',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E3F2FD',
      },
      {
        id: 'page-2',
        pageNumber: 2,
        sentences: [
          {
            id: 'p2-s1',
            text: 'I might need a break when:',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s2',
            text: '• My body feels wiggly or restless',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s3',
            text: '• My brain feels tired or foggy',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s4',
            text: '• I feel upset or frustrated',
            type: 'DESCRIPTIVE',
          },
        ],
        visual: {
          id: 'v2',
          type: 'IMAGE',
          url: '/assets/social-stories/break-signals.svg',
          altText: 'Icons showing different feelings that signal needing a break',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FFF8E1',
      },
      {
        id: 'page-3',
        pageNumber: 3,
        sentences: [
          {
            id: 'p3-s1',
            text: 'I can ask for a break in a calm voice.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s2',
            text: 'I can say "I need a break, please" or use my {{BREAK_SIGNAL}}.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s3',
            text: 'Asking nicely helps others understand what I need.',
            type: 'PERSPECTIVE',
          },
        ],
        visual: {
          id: 'v3',
          type: 'IMAGE',
          url: '/assets/social-stories/ask-break.svg',
          altText: 'A student calmly asking for a break using words or a break card',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E8F5E9',
      },
      {
        id: 'page-4',
        pageNumber: 4,
        sentences: [
          {
            id: 'p4-s1',
            text: 'During my break, I can go to {{CALM_PLACE}}.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s2',
            text: 'I can take deep breaths, stretch, or do something quiet.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s3',
            text: 'This helps my brain and body feel better.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v4',
          type: 'IMAGE',
          url: '/assets/social-stories/calm-break.svg',
          altText: 'A student in a calm corner taking deep breaths',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#F3E5F5',
      },
      {
        id: 'page-5',
        pageNumber: 5,
        sentences: [
          {
            id: 'p5-s1',
            text: 'After my break, I will feel ready to learn again.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p5-s2',
            text: 'Taking breaks helps {{NAME}} be a better learner.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v5',
          type: 'IMAGE',
          url: '/assets/social-stories/recharged.svg',
          altText: 'A happy student with a full battery symbol, ready to learn',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E0F7FA',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // FEELING OVERWHELMED
  // ────────────────────────────────────────────────────────────────────────────
  {
    slug: 'when-i-feel-overwhelmed',
    title: 'When I Feel Overwhelmed',
    description:
      'Helps learners recognize and manage feelings of overwhelm with practical strategies.',
    category: 'FEELING_OVERWHELMED',
    readingLevel: 'DEVELOPING',
    estimatedDuration: 60,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    supportsPersonalization: true,
    personalizationTokens: ['NAME', 'HELPER', 'CALM_PLACE', 'COMFORT_ITEM'],
    defaultVisualStyle: 'CARTOON',
    hasAudio: true,
    isBuiltIn: true,
    sourceTemplate: 'built-in-v1',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        sentences: [
          {
            id: 'p1-s1',
            text: 'Sometimes things can feel like too much.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s2',
            text: 'This feeling is called being overwhelmed.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s3',
            text: 'Many people feel this way sometimes.',
            type: 'PERSPECTIVE',
          },
        ],
        visual: {
          id: 'v1',
          type: 'IMAGE',
          url: '/assets/social-stories/overwhelmed.svg',
          altText: 'A student surrounded by many things representing overwhelming feelings',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FFEBEE',
      },
      {
        id: 'page-2',
        pageNumber: 2,
        sentences: [
          {
            id: 'p2-s1',
            text: '{{NAME}} might feel overwhelmed when:',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s2',
            text: "• There's too much noise around me",
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s3',
            text: '• Something is too hard or confusing',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s4',
            text: '• I have too many things to do',
            type: 'DESCRIPTIVE',
          },
        ],
        visual: {
          id: 'v2',
          type: 'IMAGE',
          url: '/assets/social-stories/overwhelm-causes.svg',
          altText: 'Icons showing different things that can be overwhelming',
          style: 'CARTOON',
          position: 'CENTER',
        },
        interactions: [
          {
            id: 'i1',
            type: 'EMOTION_CHECK',
            config: { question: 'Do any of these make you feel overwhelmed?' },
            required: false,
          },
        ],
        backgroundColor: '#FFF3E0',
      },
      {
        id: 'page-3',
        pageNumber: 3,
        sentences: [
          {
            id: 'p3-s1',
            text: 'When I feel overwhelmed, I can STOP and notice my body.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s2',
            text: 'My heart might beat fast. My hands might feel shaky.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p3-s3',
            text: 'These are signals that I need to calm down.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v3',
          type: 'IMAGE',
          url: '/assets/social-stories/body-signals.svg',
          altText: 'A body outline showing areas that feel stress',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E1F5FE',
      },
      {
        id: 'page-4',
        pageNumber: 4,
        sentences: [
          {
            id: 'p4-s1',
            text: 'I have tools to help me feel better:',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p4-s2',
            text: '• Take slow, deep breaths',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s3',
            text: '• Go to {{CALM_PLACE}}',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s4',
            text: '• Hold my {{COMFORT_ITEM}}',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s5',
            text: '• Ask {{HELPER}} for help',
            type: 'COOPERATIVE',
          },
        ],
        visual: {
          id: 'v4',
          type: 'IMAGE',
          url: '/assets/social-stories/calming-tools.svg',
          altText: 'A toolkit showing different calming strategies',
          style: 'CARTOON',
          position: 'CENTER',
        },
        interactions: [
          {
            id: 'i2',
            type: 'PRACTICE',
            config: { action: 'breathing_exercise', count: 5 },
            required: false,
          },
        ],
        backgroundColor: '#E8F5E9',
      },
      {
        id: 'page-5',
        pageNumber: 5,
        sentences: [
          {
            id: 'p5-s1',
            text: 'After I calm down, I can try one small thing at a time.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p5-s2',
            text: 'Big tasks can be broken into smaller steps.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p5-s3',
            text: '{{NAME}} can handle hard things, one step at a time.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v5',
          type: 'IMAGE',
          url: '/assets/social-stories/one-step.svg',
          altText: 'Steps showing breaking a big task into small pieces',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#F3E5F5',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // CALMING DOWN
  // ────────────────────────────────────────────────────────────────────────────
  {
    slug: 'calming-down',
    title: 'Calming Down',
    description: 'Teaches self-regulation strategies for when learners feel upset or dysregulated.',
    category: 'CALMING_DOWN',
    readingLevel: 'EARLY_READER',
    estimatedDuration: 55,
    gradeBands: ['K_2', 'G3_5'],
    supportsPersonalization: true,
    personalizationTokens: ['NAME', 'CALM_PLACE', 'COMFORT_ITEM'],
    defaultVisualStyle: 'CARTOON',
    hasAudio: true,
    isBuiltIn: true,
    sourceTemplate: 'built-in-v1',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        sentences: [
          {
            id: 'p1-s1',
            text: 'Sometimes I have big feelings.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s2',
            text: 'Big feelings are okay. Everyone has them.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v1',
          type: 'IMAGE',
          url: '/assets/social-stories/big-feelings.svg',
          altText: 'Different faces showing various big emotions',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E3F2FD',
      },
      {
        id: 'page-2',
        pageNumber: 2,
        sentences: [
          {
            id: 'p2-s1',
            text: 'When feelings feel too big, I can calm my body.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p2-s2',
            text: "Here's how:",
            type: 'DESCRIPTIVE',
          },
        ],
        visual: {
          id: 'v2',
          type: 'IMAGE',
          url: '/assets/social-stories/calm-intro.svg',
          altText: 'A peaceful scene introducing calming strategies',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E8F5E9',
      },
      {
        id: 'page-3',
        pageNumber: 3,
        sentences: [
          {
            id: 'p3-s1',
            text: '1. BREATHE: Take 5 slow breaths.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s2',
            text: 'In through my nose... Out through my mouth...',
            type: 'DESCRIPTIVE',
          },
        ],
        visual: {
          id: 'v3',
          type: 'IMAGE',
          url: '/assets/social-stories/breathing-steps.svg',
          altText: 'Animation of breathing in and out',
          style: 'CARTOON',
          position: 'CENTER',
        },
        interactions: [
          {
            id: 'i1',
            type: 'PRACTICE',
            config: { action: 'breathing_exercise', count: 5 },
            required: true,
          },
        ],
        backgroundColor: '#E1F5FE',
      },
      {
        id: 'page-4',
        pageNumber: 4,
        sentences: [
          {
            id: 'p4-s1',
            text: '2. SQUEEZE: Squeeze my hands tight, then let go.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p4-s2',
            text: 'This helps my muscles relax.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v4',
          type: 'IMAGE',
          url: '/assets/social-stories/squeeze-relax.svg',
          altText: 'Hands squeezing tight then opening and relaxing',
          style: 'CARTOON',
          position: 'CENTER',
        },
        interactions: [
          {
            id: 'i2',
            type: 'PRACTICE',
            config: { action: 'muscle_relaxation', duration: 3 },
            required: false,
          },
        ],
        backgroundColor: '#FFF8E1',
      },
      {
        id: 'page-5',
        pageNumber: 5,
        sentences: [
          {
            id: 'p5-s1',
            text: '3. THINK: Think of {{CALM_PLACE}}.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p5-s2',
            text: 'Picture it in my mind. How does it look? How does it feel?',
            type: 'DIRECTIVE',
          },
        ],
        visual: {
          id: 'v5',
          type: 'IMAGE',
          url: '/assets/social-stories/peaceful-place.svg',
          altText: 'A thought bubble showing a calm, peaceful place',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#F3E5F5',
      },
      {
        id: 'page-6',
        pageNumber: 6,
        sentences: [
          {
            id: 'p6-s1',
            text: '4. HOLD: Hold {{COMFORT_ITEM}} if I have it.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p6-s2',
            text: 'Familiar things can help me feel safe.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v6',
          type: 'IMAGE',
          url: '/assets/social-stories/comfort-object.svg',
          altText: 'A child holding a comforting object',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FFEBEE',
      },
      {
        id: 'page-7',
        pageNumber: 7,
        sentences: [
          {
            id: 'p7-s1',
            text: '{{NAME}} knows how to calm down.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p7-s2',
            text: 'Breathe. Squeeze. Think. Hold.',
            type: 'CONTROL',
          },
          {
            id: 'p7-s3',
            text: 'I can do hard things!',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v7',
          type: 'IMAGE',
          url: '/assets/social-stories/calm-success.svg',
          altText: 'A calm, happy child with the four steps shown',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E0F7FA',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // UNEXPECTED CHANGES
  // ────────────────────────────────────────────────────────────────────────────
  {
    slug: 'when-things-change',
    title: 'When Things Change',
    description: 'Helps learners cope with unexpected changes to their schedule or routine.',
    category: 'UNEXPECTED_CHANGE',
    readingLevel: 'DEVELOPING',
    estimatedDuration: 50,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    supportsPersonalization: true,
    personalizationTokens: ['NAME', 'TEACHER', 'HELPER'],
    defaultVisualStyle: 'CARTOON',
    hasAudio: true,
    isBuiltIn: true,
    sourceTemplate: 'built-in-v1',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        sentences: [
          {
            id: 'p1-s1',
            text: 'Sometimes plans change.',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p1-s2',
            text: "Changes can happen even when we don't expect them.",
            type: 'DESCRIPTIVE',
          },
        ],
        visual: {
          id: 'v1',
          type: 'IMAGE',
          url: '/assets/social-stories/schedule-change.svg',
          altText: 'A schedule with some items being moved around',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E3F2FD',
      },
      {
        id: 'page-2',
        pageNumber: 2,
        sentences: [
          {
            id: 'p2-s1',
            text: 'When things change, {{NAME}} might feel:',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s2',
            text: '• Confused or surprised',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s3',
            text: '• Worried or upset',
            type: 'DESCRIPTIVE',
          },
          {
            id: 'p2-s4',
            text: 'These feelings make sense.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v2',
          type: 'IMAGE',
          url: '/assets/social-stories/change-feelings.svg',
          altText: 'Faces showing surprised and worried expressions',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#FFF8E1',
      },
      {
        id: 'page-3',
        pageNumber: 3,
        sentences: [
          {
            id: 'p3-s1',
            text: 'When something changes, I can ask questions.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s2',
            text: '"What is happening now?"',
            type: 'DIRECTIVE',
          },
          {
            id: 'p3-s3',
            text: '"What will happen next?"',
            type: 'DIRECTIVE',
          },
        ],
        visual: {
          id: 'v3',
          type: 'IMAGE',
          url: '/assets/social-stories/ask-questions.svg',
          altText: 'A student asking questions with question mark bubbles',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E8F5E9',
      },
      {
        id: 'page-4',
        pageNumber: 4,
        sentences: [
          {
            id: 'p4-s1',
            text: '{{TEACHER}} or {{HELPER}} can explain the new plan.',
            type: 'COOPERATIVE',
          },
          {
            id: 'p4-s2',
            text: 'Knowing what comes next can help me feel better.',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v4',
          type: 'IMAGE',
          url: '/assets/social-stories/new-plan.svg',
          altText: 'A teacher explaining a new schedule to a student',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#F3E5F5',
      },
      {
        id: 'page-5',
        pageNumber: 5,
        sentences: [
          {
            id: 'p5-s1',
            text: 'Changes can be hard, but I can handle them.',
            type: 'AFFIRMATIVE',
          },
          {
            id: 'p5-s2',
            text: 'I can breathe, ask questions, and follow the new plan.',
            type: 'DIRECTIVE',
          },
          {
            id: 'p5-s3',
            text: '{{NAME}} is flexible and brave!',
            type: 'AFFIRMATIVE',
          },
        ],
        visual: {
          id: 'v5',
          type: 'IMAGE',
          url: '/assets/social-stories/flexible-brave.svg',
          altText: 'A confident student adapting to change',
          style: 'CARTOON',
          position: 'CENTER',
        },
        backgroundColor: '#E0F7FA',
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// SEEDING FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Seed built-in stories to the database.
 * Skips stories that already exist (by slug).
 */
export async function seedBuiltInStories(
  createStory: (input: CreateSocialStoryInput, userId?: string) => Promise<unknown>
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const template of BUILT_IN_TEMPLATES) {
    try {
      await createStory(template);
      created++;
    } catch (error) {
      // Likely already exists
      skipped++;
    }
  }

  return { created, skipped };
}
