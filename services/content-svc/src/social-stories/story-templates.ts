/**
 * Built-in Social Story Templates
 *
 * These are pre-defined social stories that can be seeded into a tenant's
 * story library. They cover common scenarios for K-12 learners.
 */

import type { SocialStoryCategory, StoryVisualStyle, StoryReadingLevel } from './types.js';

export interface StoryTemplate {
  slug: string;
  title: string;
  description: string;
  category: SocialStoryCategory;
  readingLevel: StoryReadingLevel;
  minAge: number;
  maxAge: number;
  gradeBands: string[];
  estimatedDuration: number;
  supportsPersonalization: boolean;
  personalizationTokens: string[];
  pages: StoryPageTemplate[];
}

interface StoryPageTemplate {
  pageNumber: number;
  sentences: StorySentenceTemplate[];
  visualPrompt?: string;
}

interface StorySentenceTemplate {
  text: string;
  type: 'DESCRIPTIVE' | 'PERSPECTIVE' | 'DIRECTIVE' | 'AFFIRMATIVE' | 'COOPERATIVE' | 'CONTROL' | 'PARTIAL';
}

/**
 * Built-in story templates organized by category
 */
export const BUILT_IN_STORY_TEMPLATES: StoryTemplate[] = [
  // TRANSITION STORIES
  {
    slug: 'starting-a-new-lesson',
    title: 'Starting a New Lesson',
    description: 'Helps learners prepare for transitioning to a new lesson or activity.',
    category: 'STARTING_LESSON',
    readingLevel: 'EARLY_READER',
    minAge: 5,
    maxAge: 10,
    gradeBands: ['K_2', 'G3_5'],
    estimatedDuration: 60,
    supportsPersonalization: true,
    personalizationTokens: ['learnerName', 'teacherName', 'lessonTopic'],
    pages: [
      {
        pageNumber: 1,
        sentences: [
          { text: 'I am about to start a new lesson.', type: 'DESCRIPTIVE' },
          { text: 'New lessons help me learn new things.', type: 'PERSPECTIVE' },
        ],
        visualPrompt: 'Student sitting at desk looking at a book with a curious expression',
      },
      {
        pageNumber: 2,
        sentences: [
          { text: 'I will take a deep breath and get ready.', type: 'DIRECTIVE' },
          { text: 'I can do my best work when I am calm and focused.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Student taking a deep breath with eyes closed',
      },
      {
        pageNumber: 3,
        sentences: [
          { text: 'If I need help, I can ask my teacher.', type: 'CONTROL' },
          { text: 'It is okay to ask questions.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Student raising hand with teacher smiling nearby',
      },
    ],
  },

  // EMOTIONAL REGULATION STORIES
  {
    slug: 'feeling-frustrated',
    title: 'When I Feel Frustrated',
    description: 'Helps learners identify and manage feelings of frustration.',
    category: 'FEELING_FRUSTRATED',
    readingLevel: 'EARLY_READER',
    minAge: 4,
    maxAge: 12,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDuration: 90,
    supportsPersonalization: true,
    personalizationTokens: ['learnerName', 'calmPlace', 'comfortItem'],
    pages: [
      {
        pageNumber: 1,
        sentences: [
          { text: 'Sometimes things feel hard and I get frustrated.', type: 'DESCRIPTIVE' },
          { text: 'Feeling frustrated is a normal feeling.', type: 'PERSPECTIVE' },
        ],
        visualPrompt: 'Child with a slightly frustrated expression working on a puzzle',
      },
      {
        pageNumber: 2,
        sentences: [
          { text: 'When I feel frustrated, my body might feel tense.', type: 'DESCRIPTIVE' },
          { text: 'I might want to give up or feel upset.', type: 'PERSPECTIVE' },
        ],
        visualPrompt: 'Child with tense shoulders and clenched fists',
      },
      {
        pageNumber: 3,
        sentences: [
          { text: 'I can stop and take three deep breaths.', type: 'DIRECTIVE' },
          { text: 'Breathing helps my body and mind calm down.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Child breathing deeply with a calmer expression',
      },
      {
        pageNumber: 4,
        sentences: [
          { text: 'I can try again or ask for help.', type: 'CONTROL' },
          { text: 'It is brave to keep trying.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Child smiling while working on the puzzle again',
      },
    ],
  },

  // ASKING FOR HELP STORIES
  {
    slug: 'asking-for-help',
    title: 'How to Ask for Help',
    description: 'Teaches learners appropriate ways to ask for help.',
    category: 'ASKING_FOR_HELP',
    readingLevel: 'EARLY_READER',
    minAge: 4,
    maxAge: 10,
    gradeBands: ['K_2', 'G3_5'],
    estimatedDuration: 60,
    supportsPersonalization: true,
    personalizationTokens: ['learnerName', 'teacherName', 'helpSignal'],
    pages: [
      {
        pageNumber: 1,
        sentences: [
          { text: 'Everyone needs help sometimes.', type: 'DESCRIPTIVE' },
          { text: 'Asking for help is smart, not weak.', type: 'PERSPECTIVE' },
        ],
        visualPrompt: 'Various students of different ages asking questions',
      },
      {
        pageNumber: 2,
        sentences: [
          { text: 'When I need help, I can raise my hand.', type: 'DIRECTIVE' },
          { text: 'I can say, "Excuse me, I need some help please."', type: 'DIRECTIVE' },
        ],
        visualPrompt: 'Student raising hand politely',
      },
      {
        pageNumber: 3,
        sentences: [
          { text: 'I wait patiently for my turn.', type: 'DIRECTIVE' },
          { text: 'My teacher wants to help me succeed.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Teacher coming to help the student',
      },
    ],
  },

  // TAKING A BREAK STORIES
  {
    slug: 'asking-for-a-break',
    title: 'Taking a Break',
    description: 'Helps learners recognize when they need a break and how to ask appropriately.',
    category: 'ASKING_FOR_BREAK',
    readingLevel: 'EARLY_READER',
    minAge: 4,
    maxAge: 12,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDuration: 60,
    supportsPersonalization: true,
    personalizationTokens: ['learnerName', 'breakSignal', 'calmPlace'],
    pages: [
      {
        pageNumber: 1,
        sentences: [
          { text: 'Sometimes my brain needs a rest.', type: 'DESCRIPTIVE' },
          { text: 'It is okay to need a break.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Child looking tired while working',
      },
      {
        pageNumber: 2,
        sentences: [
          { text: 'I can ask for a break by using my words or signal.', type: 'DIRECTIVE' },
          { text: 'I can say, "I need a break, please."', type: 'DIRECTIVE' },
        ],
        visualPrompt: 'Child using a break card or raising hand',
      },
      {
        pageNumber: 3,
        sentences: [
          { text: 'During my break, I can do something calming.', type: 'DIRECTIVE' },
          { text: 'After my break, I will feel ready to work again.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Child relaxed in a calm corner, then returning to work',
      },
    ],
  },

  // TEST TAKING STORIES
  {
    slug: 'taking-a-quiz',
    title: 'Taking a Quiz or Test',
    description: 'Prepares learners for assessment situations.',
    category: 'TAKING_QUIZ',
    readingLevel: 'DEVELOPING',
    minAge: 6,
    maxAge: 14,
    gradeBands: ['K_2', 'G3_5', 'G6_8'],
    estimatedDuration: 90,
    supportsPersonalization: true,
    personalizationTokens: ['learnerName', 'teacherName'],
    pages: [
      {
        pageNumber: 1,
        sentences: [
          { text: 'Today I have a quiz or test.', type: 'DESCRIPTIVE' },
          { text: 'Tests help show what I have learned.', type: 'PERSPECTIVE' },
        ],
        visualPrompt: 'Student looking at a test paper calmly',
      },
      {
        pageNumber: 2,
        sentences: [
          { text: 'I will read each question carefully.', type: 'DIRECTIVE' },
          { text: 'If I do not know an answer, I can skip it and come back.', type: 'CONTROL' },
        ],
        visualPrompt: 'Student reading a question thoughtfully',
      },
      {
        pageNumber: 3,
        sentences: [
          { text: 'I will do my best and stay calm.', type: 'DIRECTIVE' },
          { text: 'My best effort is what matters most.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Student completing test with confident expression',
      },
    ],
  },

  // CALMING STORIES
  {
    slug: 'calming-down',
    title: 'How to Calm Down',
    description: 'Teaches self-regulation techniques for calming down.',
    category: 'CALMING_DOWN',
    readingLevel: 'PRE_READER',
    minAge: 3,
    maxAge: 10,
    gradeBands: ['K_2', 'G3_5'],
    estimatedDuration: 90,
    supportsPersonalization: true,
    personalizationTokens: ['learnerName', 'calmPlace', 'comfortItem'],
    pages: [
      {
        pageNumber: 1,
        sentences: [
          { text: 'Sometimes I feel upset or overwhelmed.', type: 'DESCRIPTIVE' },
          { text: 'These are normal feelings.', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Child looking upset',
      },
      {
        pageNumber: 2,
        sentences: [
          { text: 'I can take slow, deep breaths.', type: 'DIRECTIVE' },
          { text: 'Breathe in... hold... breathe out slowly.', type: 'DIRECTIVE' },
        ],
        visualPrompt: 'Child doing breathing exercise',
      },
      {
        pageNumber: 3,
        sentences: [
          { text: 'I can count to ten slowly.', type: 'CONTROL' },
          { text: 'I can think of my favorite calm place.', type: 'CONTROL' },
        ],
        visualPrompt: 'Child counting on fingers with calm expression',
      },
      {
        pageNumber: 4,
        sentences: [
          { text: 'I am getting calmer now.', type: 'DESCRIPTIVE' },
          { text: 'I did a great job calming myself down!', type: 'AFFIRMATIVE' },
        ],
        visualPrompt: 'Child smiling peacefully',
      },
    ],
  },
];

/**
 * Seed built-in stories into the database
 */
export async function seedBuiltInStories(
  createStory: (data: any, createdBy: string) => Promise<any>
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const systemUserId = 'system';

  for (const template of BUILT_IN_STORY_TEMPLATES) {
    try {
      await createStory(
        {
          tenantId: null, // Global built-in story
          slug: template.slug,
          title: template.title,
          description: template.description,
          category: template.category,
          readingLevel: template.readingLevel,
          minAge: template.minAge,
          maxAge: template.maxAge,
          gradeBands: template.gradeBands,
          estimatedDuration: template.estimatedDuration,
          supportsPersonalization: template.supportsPersonalization,
          personalizationTokens: template.personalizationTokens,
          isBuiltIn: true,
          isApproved: true,
          pages: template.pages.map((page, idx) => ({
            id: `${template.slug}-page-${idx + 1}`,
            pageNumber: page.pageNumber,
            sentences: page.sentences.map((s, sIdx) => ({
              id: `${template.slug}-page-${idx + 1}-sentence-${sIdx + 1}`,
              text: s.text,
              type: s.type,
            })),
            visualPrompt: page.visualPrompt,
          })),
        },
        systemUserId
      );
      results.created++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // If it's a duplicate slug error, count as skipped
      if (message.includes('unique') || message.includes('duplicate')) {
        results.skipped++;
      } else {
        results.errors.push(`${template.slug}: ${message}`);
      }
    }
  }

  return results;
}

export default BUILT_IN_STORY_TEMPLATES;
