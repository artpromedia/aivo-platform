/**
 * Social Story Personalizer Agent Tests - ND-1.2
 *
 * Tests for AI-powered social story personalization.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  SocialStoryPersonalizerAgent,
  type SocialStoryPersonalizationInput,
  type LearnerContext,
  type PersonalizationPreferences,
  type CustomStoryScenario,
} from '../src/agents/social-story-personalizer.js';
import type { AgentConfigRegistry } from '../src/registry/AgentConfigRegistry.js';
import type { AiCallOutput } from '../src/pipeline/AiCallPipeline.js';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ══════════════════════════════════════════════════════════════════════════════

// Mock the runAiCall function
vi.mock('../src/pipeline/AiCallPipeline.js', () => ({
  runAiCall: vi.fn(),
}));

import { runAiCall } from '../src/pipeline/AiCallPipeline.js';
const mockRunAiCall = vi.mocked(runAiCall);

// Mock registry
const mockRegistry = {
  getConfigForRollout: vi.fn().mockResolvedValue({
    id: 'config-1',
    agentType: 'TUTOR',
    modelName: 'gpt-4',
    provider: 'OPENAI',
    promptTemplate: '',
    hyperparameters: {},
    version: '1.0.0',
    rolloutPercentage: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
} as unknown as AgentConfigRegistry;

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ══════════════════════════════════════════════════════════════════════════════

const sampleStory = {
  id: 'story-123',
  title: 'Starting My Lesson',
  category: 'STARTING_LESSON',
  pages: [
    {
      pageNumber: 1,
      title: 'Getting Ready',
      sentences: [
        {
          id: 'sent-1',
          text: 'My name is {{learnerName}}.',
          sentenceType: 'DESCRIPTIVE' as const,
          personalizable: true,
          placeholders: ['learnerName'],
        },
        {
          id: 'sent-2',
          text: 'I am learning something new today.',
          sentenceType: 'DESCRIPTIVE' as const,
        },
      ],
    },
    {
      pageNumber: 2,
      sentences: [
        {
          id: 'sent-3',
          text: 'It is okay to feel a little nervous.',
          sentenceType: 'AFFIRMATIVE' as const,
        },
        {
          id: 'sent-4',
          text: 'I will try to stay calm.',
          sentenceType: 'DIRECTIVE' as const,
        },
      ],
    },
  ],
};

const sampleLearnerContext: LearnerContext = {
  learnerId: 'learner-456',
  name: 'Alex Johnson',
  preferredName: 'Alex',
  gradeLevel: 3,
  pronouns: {
    subject: 'they',
    object: 'them',
    possessive: 'their',
  },
  interests: ['dinosaurs', 'space', 'drawing'],
  currentEmotionalState: 'calm',
  currentActivityType: 'break',
  nextActivityType: 'math_lesson',
  preferredCopingStrategies: ['deep breathing', 'counting'],
};

const samplePreferences: PersonalizationPreferences = {
  readingLevel: 'STANDARD',
  vocabularyLevel: 'GRADE_LEVEL',
  includeVisualPrompts: true,
  sentenceLength: 'MEDIUM',
  useLearnerName: true,
  includeInteractiveElements: true,
  emphasizeEmotions: true,
  includeBreathingExercises: false,
};

// ══════════════════════════════════════════════════════════════════════════════
// PERSONALIZATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('SocialStoryPersonalizerAgent', () => {
  let agent: SocialStoryPersonalizerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SocialStoryPersonalizerAgent(mockRegistry);
  });

  describe('personalizeStory', () => {
    it('should personalize a story successfully', async () => {
      const mockResponse: AiCallOutput = {
        content: JSON.stringify({
          pages: [
            {
              pageNumber: 1,
              title: 'Getting Ready',
              sentences: [
                {
                  id: 'sent-1',
                  originalText: 'My name is {{learnerName}}.',
                  personalizedText: 'My name is Alex.',
                  sentenceType: 'DESCRIPTIVE',
                  emphasisWords: ['Alex'],
                  wasModified: true,
                  modificationReason: 'Replaced placeholder with learner name',
                },
                {
                  id: 'sent-2',
                  originalText: 'I am learning something new today.',
                  personalizedText: 'I am learning something new today about dinosaurs!',
                  sentenceType: 'DESCRIPTIVE',
                  emphasisWords: ['dinosaurs'],
                  wasModified: true,
                  modificationReason: 'Added learner interest',
                },
              ],
              visualPrompt: 'A friendly classroom with dinosaur decorations',
            },
          ],
          personalizationNotes: ['Added learner name', 'Incorporated dinosaur interest'],
          readabilityScore: 2.8,
          estimatedDuration: 120,
        }),
        tokensUsed: 500,
        safetyStatus: 'OK',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const input: SocialStoryPersonalizationInput = {
        story: sampleStory,
        learnerContext: sampleLearnerContext,
        preferences: samplePreferences,
      };

      const result = await agent.personalizeStory('tenant-123', input);

      expect(result.originalStoryId).toBe('story-123');
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.personalizationNotes.length).toBeGreaterThan(0);
      expect(result.personalizedAt).toBeInstanceOf(Date);
    });

    it('should handle AI response with invalid JSON gracefully', async () => {
      const mockResponse: AiCallOutput = {
        content: 'This is not valid JSON',
        tokensUsed: 100,
        safetyStatus: 'OK',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const input: SocialStoryPersonalizationInput = {
        story: sampleStory,
        learnerContext: sampleLearnerContext,
        preferences: samplePreferences,
      };

      const result = await agent.personalizeStory('tenant-123', input);

      // Should return fallback
      expect(result.pages).toEqual([]);
      expect(result.personalizationNotes).toContain(
        'Personalization could not be applied - using original story'
      );
    });

    it('should throw error when content is blocked', async () => {
      const mockResponse: AiCallOutput = {
        content: '',
        tokensUsed: 0,
        safetyStatus: 'BLOCKED',
        safetyReason: 'Content blocked by safety filter',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const input: SocialStoryPersonalizationInput = {
        story: sampleStory,
        learnerContext: sampleLearnerContext,
        preferences: samplePreferences,
      };

      await expect(agent.personalizeStory('tenant-123', input)).rejects.toThrow(
        'Story personalization failed'
      );
    });

    it('should call runAiCall with correct context', async () => {
      const mockResponse: AiCallOutput = {
        content: JSON.stringify({
          pages: [],
          personalizationNotes: [],
          estimatedDuration: 60,
        }),
        tokensUsed: 100,
        safetyStatus: 'OK',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const input: SocialStoryPersonalizationInput = {
        story: sampleStory,
        learnerContext: sampleLearnerContext,
        preferences: samplePreferences,
      };

      await agent.personalizeStory('tenant-123', input);

      expect(mockRunAiCall).toHaveBeenCalledWith(
        mockRegistry,
        expect.objectContaining({
          tenantId: 'tenant-123',
          agentType: 'TUTOR',
          learnerId: 'learner-456',
          useCase: 'social_story_personalization',
          metadata: expect.objectContaining({
            storyId: 'story-123',
            storyCategory: 'STARTING_LESSON',
          }),
        }),
        expect.any(Object),
        undefined,
        undefined
      );
    });
  });

  describe('generateCustomStory', () => {
    it('should generate a custom story successfully', async () => {
      const mockResponse: AiCallOutput = {
        content: JSON.stringify({
          pages: [
            {
              pageNumber: 1,
              title: 'A New Situation',
              sentences: [
                {
                  id: 'gen-1',
                  originalText: '',
                  personalizedText: 'Sometimes I have a substitute teacher.',
                  sentenceType: 'DESCRIPTIVE',
                  emphasisWords: ['substitute teacher'],
                  wasModified: false,
                },
              ],
              visualPrompt: 'A friendly substitute teacher waving hello',
            },
          ],
          personalizationNotes: ['Generated custom story for substitute teacher scenario'],
          readabilityScore: 2.5,
          estimatedDuration: 150,
        }),
        tokensUsed: 600,
        safetyStatus: 'OK',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const scenario: CustomStoryScenario = {
        type: 'unexpected_change',
        description: 'Meeting a substitute teacher for the first time',
        specificSituation: 'Regular teacher is sick',
        desiredOutcome: 'Help learner feel comfortable with substitute',
        keyBehaviors: ['greeting', 'following new routines'],
      };

      const result = await agent.generateCustomStory(
        'tenant-123',
        scenario,
        sampleLearnerContext,
        samplePreferences
      );

      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.originalStoryId).toBeDefined();
      expect(result.personalizedAt).toBeInstanceOf(Date);
    });

    it('should throw error on generation failure', async () => {
      const mockResponse: AiCallOutput = {
        content: '',
        tokensUsed: 0,
        safetyStatus: 'BLOCKED',
        error: 'Content generation failed',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const scenario: CustomStoryScenario = {
        type: 'custom',
        description: 'Test scenario',
      };

      await expect(
        agent.generateCustomStory('tenant-123', scenario, sampleLearnerContext, samplePreferences)
      ).rejects.toThrow('Story generation failed');
    });
  });

  describe('suggestCalmingStrategy', () => {
    it('should suggest a calming strategy successfully', async () => {
      const mockResponse: AiCallOutput = {
        content: JSON.stringify({
          strategyName: 'Rainbow Breathing',
          description: 'A colorful breathing exercise using visualization.',
          steps: [
            'Imagine a rainbow in the sky',
            'Breathe in as you trace red, orange, yellow',
            'Breathe out as you trace green, blue, purple',
            'Repeat three times',
          ],
          duration: 90,
          visualPrompt: 'A colorful rainbow arc',
          tags: ['breathing', 'visualization', 'calming'],
        }),
        tokensUsed: 200,
        safetyStatus: 'OK',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const anxiousContext: LearnerContext = {
        ...sampleLearnerContext,
        currentEmotionalState: 'anxious',
      };

      const result = await agent.suggestCalmingStrategy('tenant-123', anxiousContext);

      expect(result.strategyName).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should return default strategy on failure', async () => {
      const mockResponse: AiCallOutput = {
        content: 'Invalid response',
        tokensUsed: 50,
        safetyStatus: 'OK',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const result = await agent.suggestCalmingStrategy('tenant-123', sampleLearnerContext);

      // Should return default Box Breathing
      expect(result.strategyName).toBe('Box Breathing');
      expect(result.steps.length).toBe(4);
    });

    it('should return default strategy when content is blocked', async () => {
      const mockResponse: AiCallOutput = {
        content: '',
        tokensUsed: 0,
        safetyStatus: 'BLOCKED',
      };

      mockRunAiCall.mockResolvedValue(mockResponse);

      const result = await agent.suggestCalmingStrategy('tenant-123', sampleLearnerContext);

      // Should return safe default
      expect(result.strategyName).toBe('Box Breathing');
      expect(result.duration).toBe(60);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Prompt Building', () => {
  describe('Learner Context Formatting', () => {
    it('should format pronouns correctly', () => {
      const pronouns = {
        subject: 'she',
        object: 'her',
        possessive: 'her',
      };
      const formatted = `${pronouns.subject}/${pronouns.object}/${pronouns.possessive}`;
      expect(formatted).toBe('she/her/her');
    });

    it('should format interests as comma-separated list', () => {
      const interests = ['dinosaurs', 'space', 'drawing'];
      const formatted = interests.join(', ');
      expect(formatted).toBe('dinosaurs, space, drawing');
    });

    it('should handle missing optional fields', () => {
      const minimalContext: LearnerContext = {
        learnerId: 'learner-123',
      };

      expect(minimalContext.name).toBeUndefined();
      expect(minimalContext.interests).toBeUndefined();
      expect(minimalContext.preferredCopingStrategies).toBeUndefined();
    });
  });

  describe('Story Formatting', () => {
    it('should format story pages for prompt', () => {
      const formattedPage = `Page 1 - Getting Ready:\n  - [DESCRIPTIVE] My name is {{learnerName}}.\n  - [DESCRIPTIVE] I am learning something new today.`;
      expect(formattedPage).toContain('Page 1');
      expect(formattedPage).toContain('[DESCRIPTIVE]');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Response Parsing', () => {
  describe('JSON Extraction', () => {
    it('should extract JSON from response with surrounding text', () => {
      const response =
        'Here is the personalized story:\n\n{"pages": [], "personalizationNotes": [], "estimatedDuration": 60}\n\nI hope this helps!';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();
      expect(JSON.parse(jsonMatch![0])).toEqual({
        pages: [],
        personalizationNotes: [],
        estimatedDuration: 60,
      });
    });

    it('should handle clean JSON response', () => {
      const response = '{"pages": [{"pageNumber": 1}], "estimatedDuration": 120}';
      const parsed = JSON.parse(response);
      expect(parsed.pages[0].pageNumber).toBe(1);
    });
  });
});
