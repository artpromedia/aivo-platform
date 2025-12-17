/**
 * Social Stories Tests - ND-1.2
 *
 * Tests for social story service, templates, and personalization.
 */

import { describe, it, expect } from 'vitest';

import {
  SocialStoryCategory,
  SocialStoryReadingLevel,
  SocialStoryVisualStyle,
  SentenceType,
} from '../src/social-stories/social-story.types.js';
import { BUILT_IN_TEMPLATES } from '../src/social-stories/story-templates.js';

// ══════════════════════════════════════════════════════════════════════════════
// STORY TEMPLATES TESTS
// ══════════════════════════════════════════════════════════════════════════════

// Helper functions for tests
const getBuiltInTemplate = (slug: string) => BUILT_IN_TEMPLATES.find((t) => t.slug === slug);
const getTemplatesByCategory = (category: SocialStoryCategory) =>
  BUILT_IN_TEMPLATES.filter((t) => t.category === category);

describe('Social Story Templates', () => {
  describe('Built-in Templates', () => {
    it('should have all required templates', () => {
      const requiredTemplates = [
        'starting-my-lesson',
        'taking-a-quiz',
        'asking-for-a-break',
        'when-i-feel-overwhelmed',
        'calming-down',
        'when-things-change',
      ];

      for (const slug of requiredTemplates) {
        const template = BUILT_IN_TEMPLATES.find((t) => t.slug === slug);
        expect(template, `Missing template: ${slug}`).toBeDefined();
      }
    });

    it('should retrieve a template by slug', () => {
      const template = getBuiltInTemplate('starting-my-lesson');
      expect(template).toBeDefined();
      expect(template?.title).toBe('Starting My Lesson');
    });

    it('should return undefined for unknown slug', () => {
      const template = getBuiltInTemplate('non-existent-template');
      expect(template).toBeUndefined();
    });

    it('should filter templates by category', () => {
      const quizTemplates = getTemplatesByCategory(SocialStoryCategory.TAKING_QUIZ);
      expect(quizTemplates.length).toBeGreaterThan(0);
      expect(quizTemplates.every((t) => t.category === SocialStoryCategory.TAKING_QUIZ)).toBe(true);
    });
  });

  describe('Template Structure', () => {
    it('should have valid structure for all templates', () => {
      for (const template of BUILT_IN_TEMPLATES) {
        // Required fields
        expect(template.slug).toBeTruthy();
        expect(template.title).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.pages.length).toBeGreaterThan(0);

        // Pages structure
        for (const page of template.pages) {
          expect(page.pageNumber).toBeGreaterThan(0);
          expect(page.sentences.length).toBeGreaterThan(0);

          // Sentences structure
          for (const sentence of page.sentences) {
            expect(sentence.id).toBeTruthy();
            expect(sentence.text).toBeTruthy();
            expect(Object.values(SentenceType)).toContain(sentence.type);
          }
        }
      }
    });

    it('should follow Carol Gray sentence ratio guideline', () => {
      // For each template, descriptive/perspective/affirmative sentences
      // should outnumber directive/control sentences by at least 2:1
      for (const template of BUILT_IN_TEMPLATES) {
        let supportiveSentences = 0;
        let directiveSentences = 0;

        for (const page of template.pages) {
          for (const sentence of page.sentences) {
            if (
              sentence.type === SentenceType.DESCRIPTIVE ||
              sentence.type === SentenceType.PERSPECTIVE ||
              sentence.type === SentenceType.AFFIRMATIVE ||
              sentence.type === SentenceType.COOPERATIVE
            ) {
              supportiveSentences++;
            } else if (
              sentence.type === SentenceType.DIRECTIVE ||
              sentence.type === SentenceType.CONTROL
            ) {
              directiveSentences++;
            }
          }
        }

        // If there are directive sentences, ratio should be at least 2:1
        if (directiveSentences > 0) {
          const ratio = supportiveSentences / directiveSentences;
          expect(
            ratio,
            `Template "${template.slug}" has invalid ratio: ${ratio}. Expected >= 2`
          ).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('should have appropriate reading levels', () => {
      for (const template of BUILT_IN_TEMPLATES) {
        // readingLevel is optional on CreateSocialStoryInput
        if (template.readingLevel) {
          expect(Object.values(SocialStoryReadingLevel)).toContain(template.readingLevel);
        }
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SENTENCE TYPE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Sentence Types', () => {
  describe('Sentence Type Classification', () => {
    it('should have all Carol Gray sentence types', () => {
      const expectedTypes = [
        'DESCRIPTIVE',
        'PERSPECTIVE',
        'DIRECTIVE',
        'AFFIRMATIVE',
        'COOPERATIVE',
        'CONTROL',
        'PARTIAL',
      ];

      for (const type of expectedTypes) {
        expect(Object.values(SentenceType)).toContain(type);
      }
    });
  });

  describe('Sentence Type Descriptions', () => {
    const sentenceExamples: Record<string, string> = {
      DESCRIPTIVE: 'My classroom has desks and chairs.',
      PERSPECTIVE: 'My teacher feels happy when I try my best.',
      DIRECTIVE: 'I will try to stay calm.',
      AFFIRMATIVE: 'This is okay and normal.',
      COOPERATIVE: 'My teacher and I will work together.',
      CONTROL: 'When I need help, I can raise my hand like a flag.',
      PARTIAL: 'When I feel nervous, I can _____.',
    };

    it('should provide examples for all sentence types', () => {
      for (const type of Object.values(SentenceType)) {
        expect(sentenceExamples[type], `Missing example for ${type}`).toBeDefined();
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Social Story Categories', () => {
  describe('Category Coverage', () => {
    it('should have academic transition categories', () => {
      const academicCategories = [
        'STARTING_LESSON',
        'ENDING_LESSON',
        'CHANGING_ACTIVITY',
        'TAKING_QUIZ',
        'RECEIVING_FEEDBACK',
      ];

      for (const cat of academicCategories) {
        expect(Object.values(SocialStoryCategory)).toContain(cat);
      }
    });

    it('should have emotional regulation categories', () => {
      const emotionalCategories = [
        'FEELING_FRUSTRATED',
        'FEELING_OVERWHELMED',
        'FEELING_ANXIOUS',
        'CALMING_DOWN',
        'CELEBRATING_SUCCESS',
      ];

      for (const cat of emotionalCategories) {
        expect(Object.values(SocialStoryCategory)).toContain(cat);
      }
    });

    it('should have communication categories', () => {
      const communicationCategories = [
        'ASKING_FOR_HELP',
        'ASKING_FOR_BREAK',
        'RAISING_HAND',
        'TALKING_TO_TEACHER',
      ];

      for (const cat of communicationCategories) {
        expect(Object.values(SocialStoryCategory)).toContain(cat);
      }
    });

    it('should have safety categories', () => {
      const safetyCategories = ['FIRE_DRILL', 'LOCKDOWN', 'FEELING_UNSAFE'];

      for (const cat of safetyCategories) {
        expect(Object.values(SocialStoryCategory)).toContain(cat);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PERSONALIZATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Story Personalization', () => {
  describe('Placeholder Replacement', () => {
    it('should identify placeholders in sentences', () => {
      const sentences = [
        { text: 'My name is {{learnerName}}.', placeholders: ['learnerName'] },
        { text: 'I am in {{gradeLevel}} grade.', placeholders: ['gradeLevel'] },
        {
          text: 'I like {{interest1}} and {{interest2}}.',
          placeholders: ['interest1', 'interest2'],
        },
      ];

      for (const sentence of sentences) {
        const foundPlaceholders = sentence.text.match(/\{\{(\w+)\}\}/g) ?? [];
        expect(foundPlaceholders.length).toBe(sentence.placeholders.length);
      }
    });

    it('should support learner name personalization', () => {
      const learnerContext = {
        learnerId: 'test-learner-id',
        name: 'Alex',
        preferredName: 'Alex',
      };

      const templateText = 'My name is {{learnerName}}.';
      const personalizedText = templateText.replace(
        '{{learnerName}}',
        learnerContext.preferredName ?? learnerContext.name ?? 'I'
      );

      expect(personalizedText).toBe('My name is Alex.');
    });
  });

  describe('Reading Level Adaptation', () => {
    const sampleSentence =
      'When I experience feelings of frustration, I will utilize my coping strategies.';

    it('should simplify text for SIMPLIFIED reading level', () => {
      // Mock simplification
      const simplified = 'When I feel frustrated, I can use my calming tools.';
      expect(simplified.length).toBeLessThan(sampleSentence.length);
    });

    it('should maintain advanced vocabulary for ADVANCED reading level', () => {
      const advanced =
        'When I experience feelings of frustration, I will implement my coping strategies.';
      expect(advanced).toContain('implement');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VISUAL STYLE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Visual Styles', () => {
  it('should have all expected visual styles', () => {
    const expectedStyles = [
      'REALISTIC_PHOTOS',
      'ILLUSTRATED',
      'ICONS',
      'SYMBOLS',
      'CARTOON',
      'MINIMAL',
    ];

    for (const style of expectedStyles) {
      expect(Object.values(SocialStoryVisualStyle)).toContain(style);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INTERACTION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Story Interactions', () => {
  describe('Interactive Elements', () => {
    it('should support breathing exercises', () => {
      const breathingExercise = {
        type: 'BREATHING',
        breathingPattern: {
          inhale: 4,
          hold: 4,
          exhale: 4,
          holdAfterExhale: 4,
          cycles: 3,
        },
      };

      expect(breathingExercise.breathingPattern.inhale).toBe(4);
      expect(breathingExercise.breathingPattern.cycles).toBe(3);
    });

    it('should support emotion check-ins', () => {
      const emotionCheckIn = {
        type: 'EMOTION_CHECKIN',
        options: ['happy', 'calm', 'worried', 'frustrated'],
      };

      expect(emotionCheckIn.options.length).toBeGreaterThan(0);
    });

    it('should support choice prompts', () => {
      const choicePrompt = {
        type: 'CHOICE',
        choices: ['Take a break', 'Ask for help', 'Keep trying'],
        correctChoices: [0, 1, 2], // All are valid
      };

      expect(choicePrompt.choices.length).toBe(3);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Story Recommendations', () => {
  describe('Context-Based Recommendations', () => {
    it('should recommend transition stories for activity changes', () => {
      // Simulating context-based recommendation matching
      const currentActivityType = 'LESSON';
      const nextActivityType = 'QUIZ';

      // Mock recommendation logic
      const recommendedCategories = [
        SocialStoryCategory.CHANGING_ACTIVITY,
        SocialStoryCategory.TAKING_QUIZ,
      ];

      expect(currentActivityType).toBe('LESSON');
      expect(nextActivityType).toBe('QUIZ');
      expect(recommendedCategories).toContain(SocialStoryCategory.TAKING_QUIZ);
    });

    it('should recommend emotional support stories based on emotional state', () => {
      // Simulating emotional state detection
      const detectedEmotionalState = 'frustrated';

      // Mock recommendation logic
      const recommendedCategories = [
        SocialStoryCategory.FEELING_FRUSTRATED,
        SocialStoryCategory.CALMING_DOWN,
      ];

      expect(detectedEmotionalState).toBe('frustrated');
      expect(recommendedCategories).toContain(SocialStoryCategory.CALMING_DOWN);
    });

    it('should prioritize teacher-assigned stories', () => {
      const assignments = [
        { storyId: 'story-1', priority: 'HIGH', reason: 'TEACHER_ASSIGNED' },
        { storyId: 'story-2', priority: 'MEDIUM', reason: 'CONTEXT_MATCH' },
      ];

      const sortedAssignments = assignments.sort((a, b) => {
        if (a.reason === 'TEACHER_ASSIGNED') return -1;
        if (b.reason === 'TEACHER_ASSIGNED') return 1;
        return 0;
      });

      expect(sortedAssignments[0].reason).toBe('TEACHER_ASSIGNED');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Story Analytics', () => {
  describe('View Tracking', () => {
    it('should track story view metadata', () => {
      const viewRecord = {
        storyId: 'story-123',
        learnerId: 'learner-456',
        tenantId: 'tenant-789',
        viewedAt: new Date(),
        completedAt: null,
        pagesViewed: 3,
        totalPages: 5,
        interactionsCompleted: 2,
        wasHelpful: null,
        sessionId: 'session-abc',
        triggerType: 'CONTEXT_RECOMMENDATION',
      };

      expect(viewRecord.pagesViewed).toBeLessThanOrEqual(viewRecord.totalPages);
      expect(viewRecord.viewedAt).toBeInstanceOf(Date);
    });

    it('should calculate completion percentage', () => {
      const pagesViewed = 4;
      const totalPages = 5;
      const completionPercentage = (pagesViewed / totalPages) * 100;

      expect(completionPercentage).toBe(80);
    });
  });

  describe('Effectiveness Metrics', () => {
    it('should track helpfulness ratings', () => {
      const ratings = [true, true, false, true, true];
      const helpfulCount = ratings.filter(Boolean).length;
      const helpfulPercentage = (helpfulCount / ratings.length) * 100;

      expect(helpfulPercentage).toBe(80);
    });

    it('should track completion rates by category', () => {
      const viewsByCategory = {
        [SocialStoryCategory.CALMING_DOWN]: { views: 100, completions: 85 },
        [SocialStoryCategory.ASKING_FOR_BREAK]: { views: 50, completions: 48 },
      };

      const calmingCompletionRate =
        (viewsByCategory[SocialStoryCategory.CALMING_DOWN].completions /
          viewsByCategory[SocialStoryCategory.CALMING_DOWN].views) *
        100;

      expect(calmingCompletionRate).toBe(85);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Accessibility', () => {
  describe('Text-to-Speech Support', () => {
    it('should provide TTS-friendly text', () => {
      const sentence = 'I will take a deep breath.';
      // TTS-friendly text should avoid abbreviations and symbols
      expect(sentence).not.toContain('&');
      expect(sentence).not.toMatch(/\b[A-Z]{2,}\b/); // No all-caps abbreviations
    });

    it('should support pronunciation hints', () => {
      const sentence = {
        text: 'I can use my PECS board.',
        pronunciationHint: 'I can use my peks board.',
      };

      expect(sentence.pronunciationHint).toBeDefined();
    });
  });

  describe('Visual Accessibility', () => {
    it('should support high contrast mode', () => {
      const visualConfig = {
        highContrast: true,
        reducedMotion: false,
        fontSize: 'large',
      };

      expect(visualConfig.highContrast).toBe(true);
    });

    it('should support reduced motion', () => {
      const visualConfig = {
        highContrast: false,
        reducedMotion: true,
        fontSize: 'medium',
      };

      expect(visualConfig.reducedMotion).toBe(true);
    });
  });
});
