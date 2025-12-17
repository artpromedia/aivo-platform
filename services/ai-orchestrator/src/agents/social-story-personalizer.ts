/**
 * Social Story Personalizer Agent - ND-1.2
 *
 * AI-powered personalization of social stories for neurodiverse learners.
 * Uses learner context, preferences, and emotional state to adapt stories.
 *
 * Carol Gray's Social Stories™ Framework Compliance:
 * - Maintains proper sentence type ratios (descriptive > directive)
 * - Uses first-person perspective appropriate to the learner
 * - Preserves positive, patient, and reassuring tone
 */

import { randomUUID } from 'node:crypto';

import type { AiLoggingService } from '../logging/index.js';
import { runAiCall, type AiCallContext, type AiCallOutput } from '../pipeline/AiCallPipeline.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import type { TelemetryStore } from '../telemetry/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SocialStoryPersonalizationInput {
  /** The original story content */
  story: {
    id: string;
    title: string;
    category: string;
    pages: StoryPage[];
    targetSentenceTypes?: string[];
  };
  /** Learner context for personalization */
  learnerContext: LearnerContext;
  /** Personalization preferences */
  preferences: PersonalizationPreferences;
}

export interface StoryPage {
  pageNumber: number;
  title?: string;
  sentences: StorySentence[];
  visualPrompt?: string;
}

export interface StorySentence {
  id: string;
  text: string;
  sentenceType: SentenceType;
  emphasisWords?: string[];
  personalizable?: boolean;
  placeholders?: string[];
}

export type SentenceType =
  | 'DESCRIPTIVE'
  | 'PERSPECTIVE'
  | 'DIRECTIVE'
  | 'AFFIRMATIVE'
  | 'COOPERATIVE'
  | 'CONTROL'
  | 'PARTIAL';

export interface LearnerContext {
  learnerId: string;
  name?: string;
  preferredName?: string;
  gradeLevel?: number;
  pronouns?: {
    subject: string; // "he", "she", "they"
    object: string; // "him", "her", "them"
    possessive: string; // "his", "her", "their"
  };
  interests?: string[];
  currentEmotionalState?: string;
  currentActivityType?: string;
  nextActivityType?: string;
  recentChallenges?: string[];
  recentSuccesses?: string[];
  preferredCopingStrategies?: string[];
  sensoryPreferences?: {
    lightSensitivity?: 'low' | 'medium' | 'high';
    soundSensitivity?: 'low' | 'medium' | 'high';
    preferredCalmingActivities?: string[];
  };
}

export interface PersonalizationPreferences {
  readingLevel: 'SIMPLIFIED' | 'STANDARD' | 'ADVANCED';
  vocabularyLevel: 'BASIC' | 'GRADE_LEVEL' | 'ADVANCED';
  includeVisualPrompts: boolean;
  sentenceLength: 'SHORT' | 'MEDIUM' | 'LONG';
  useLearnerName: boolean;
  includeInteractiveElements: boolean;
  emphasizeEmotions: boolean;
  includeBreathingExercises: boolean;
}

export interface PersonalizedStory {
  originalStoryId: string;
  personalizedAt: Date;
  pages: PersonalizedPage[];
  personalizationNotes: string[];
  readabilityScore?: number;
  estimatedDuration: number;
}

export interface PersonalizedPage {
  pageNumber: number;
  title?: string;
  sentences: PersonalizedSentence[];
  visualPrompt?: string;
  interactionPrompt?: string;
}

export interface PersonalizedSentence {
  id: string;
  originalText: string;
  personalizedText: string;
  sentenceType: SentenceType;
  emphasisWords: string[];
  wasModified: boolean;
  modificationReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONALIZATION_SYSTEM_PROMPT = `You are an expert in Carol Gray's Social Stories™ methodology, specializing in creating personalized narratives for neurodiverse learners.

Your role is to adapt social stories while strictly maintaining:
1. The Social Story ratio: At least 2 descriptive/perspective/affirmative sentences for every directive/control sentence
2. First-person perspective that matches the learner's preferred pronouns
3. Positive, patient, and reassuring tone throughout
4. Age-appropriate vocabulary based on the learner's reading level
5. Concrete, literal language (avoid idioms and metaphors)

You understand that social stories help:
- Prepare learners for new or challenging situations
- Provide predictability and reduce anxiety
- Model appropriate responses and behaviors
- Validate feelings while offering coping strategies

When personalizing:
- Replace generic placeholders with learner-specific information
- Adjust sentence complexity based on reading level
- Include the learner's preferred coping strategies when relevant
- Reference the learner's interests to increase engagement
- Maintain all sentence type markers and structure`;

const PERSONALIZATION_USER_PROMPT = `Please personalize the following social story for this learner.

LEARNER CONTEXT:
- Name: {{learnerName}}
- Pronouns: {{pronouns}}
- Grade Level: {{gradeLevel}}
- Interests: {{interests}}
- Current Emotional State: {{emotionalState}}
- Current Activity: {{currentActivity}}
- Next Activity: {{nextActivity}}
- Preferred Coping Strategies: {{copingStrategies}}
- Recent Challenges: {{recentChallenges}}
- Recent Successes: {{recentSuccesses}}

PERSONALIZATION PREFERENCES:
- Reading Level: {{readingLevel}}
- Vocabulary Level: {{vocabularyLevel}}
- Sentence Length: {{sentenceLength}}
- Include Visual Prompts: {{includeVisualPrompts}}
- Emphasize Emotions: {{emphasizeEmotions}}

ORIGINAL STORY:
Title: {{storyTitle}}
Category: {{storyCategory}}

{{storyPages}}

OUTPUT INSTRUCTIONS:
Return a JSON object with this structure:
{
  "pages": [
    {
      "pageNumber": 1,
      "title": "Page title if any",
      "sentences": [
        {
          "id": "original-sentence-id",
          "originalText": "Original sentence text",
          "personalizedText": "Personalized version",
          "sentenceType": "DESCRIPTIVE|PERSPECTIVE|DIRECTIVE|AFFIRMATIVE|COOPERATIVE|CONTROL|PARTIAL",
          "emphasisWords": ["key", "words", "to", "emphasize"],
          "wasModified": true,
          "modificationReason": "Brief explanation of changes"
        }
      ],
      "visualPrompt": "Description for visual illustration if needed",
      "interactionPrompt": "Optional interaction like 'Point to how you feel' if appropriate"
    }
  ],
  "personalizationNotes": ["List of key adaptations made"],
  "readabilityScore": 2.5,
  "estimatedDuration": 180
}

Ensure all sentences maintain their original type and the overall story ratio remains compliant with Carol Gray's guidelines.`;

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class SocialStoryPersonalizerAgent {
  private readonly registry: AgentConfigRegistry;
  private readonly telemetryStore?: TelemetryStore;
  private readonly loggingService?: AiLoggingService;

  constructor(
    registry: AgentConfigRegistry,
    telemetryStore?: TelemetryStore,
    loggingService?: AiLoggingService
  ) {
    this.registry = registry;
    this.telemetryStore = telemetryStore;
    this.loggingService = loggingService;
  }

  /**
   * Personalize a social story for a specific learner.
   */
  async personalizeStory(
    tenantId: string,
    input: SocialStoryPersonalizationInput
  ): Promise<PersonalizedStory> {
    const { story, learnerContext, preferences } = input;

    // Build the prompt with learner context
    const prompt = this.buildPersonalizationPrompt(story, learnerContext, preferences);

    // Create AI call context
    const context: AiCallContext = {
      tenantId,
      agentType: 'TUTOR', // Reuse TUTOR agent config for now
      learnerId: learnerContext.learnerId,
      useCase: 'social_story_personalization',
      metadata: {
        storyId: story.id,
        storyCategory: story.category,
        readingLevel: preferences.readingLevel,
      },
    };

    // Run the AI call through the pipeline
    const result = await runAiCall(
      this.registry,
      context,
      { rawPrompt: prompt },
      this.telemetryStore,
      this.loggingService
    );

    // Parse and validate the response
    return this.parsePersonalizationResponse(story.id, result);
  }

  /**
   * Generate a new social story based on a specific scenario.
   */
  async generateCustomStory(
    tenantId: string,
    scenario: CustomStoryScenario,
    learnerContext: LearnerContext,
    preferences: PersonalizationPreferences
  ): Promise<PersonalizedStory> {
    const prompt = this.buildGenerationPrompt(scenario, learnerContext, preferences);

    const context: AiCallContext = {
      tenantId,
      agentType: 'TUTOR',
      learnerId: learnerContext.learnerId,
      useCase: 'social_story_generation',
      metadata: {
        scenarioType: scenario.type,
        scenarioDescription: scenario.description,
      },
    };

    const result = await runAiCall(
      this.registry,
      context,
      { rawPrompt: prompt },
      this.telemetryStore,
      this.loggingService
    );

    return this.parseGenerationResponse(result);
  }

  /**
   * Suggest a calming strategy based on the learner's current state.
   */
  async suggestCalmingStrategy(
    tenantId: string,
    learnerContext: LearnerContext
  ): Promise<CalmingStrategySuggestion> {
    const prompt = this.buildCalmingStrategyPrompt(learnerContext);

    const context: AiCallContext = {
      tenantId,
      agentType: 'TUTOR',
      learnerId: learnerContext.learnerId,
      useCase: 'calming_strategy_suggestion',
      metadata: {
        emotionalState: learnerContext.currentEmotionalState,
      },
    };

    const result = await runAiCall(
      this.registry,
      context,
      { rawPrompt: prompt },
      this.telemetryStore,
      this.loggingService
    );

    return this.parseCalmingStrategyResponse(result);
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  private buildPersonalizationPrompt(
    story: SocialStoryPersonalizationInput['story'],
    learnerContext: LearnerContext,
    preferences: PersonalizationPreferences
  ): string {
    // Format story pages for the prompt
    const storyPagesText = story.pages
      .map((page) => {
        const sentences = page.sentences.map((s) => `  - [${s.sentenceType}] ${s.text}`).join('\n');
        return `Page ${page.pageNumber}${page.title ? ` - ${page.title}` : ''}:\n${sentences}`;
      })
      .join('\n\n');

    // Format pronouns
    const pronounsText = learnerContext.pronouns
      ? `${learnerContext.pronouns.subject}/${learnerContext.pronouns.object}/${learnerContext.pronouns.possessive}`
      : 'they/them/their';

    // Build the complete prompt
    let prompt = `${PERSONALIZATION_SYSTEM_PROMPT}\n\n${PERSONALIZATION_USER_PROMPT}`;

    // Replace placeholders
    prompt = prompt
      .replace(
        '{{learnerName}}',
        learnerContext.preferredName ?? learnerContext.name ?? 'the learner'
      )
      .replace('{{pronouns}}', pronounsText)
      .replace('{{gradeLevel}}', learnerContext.gradeLevel?.toString() ?? 'unknown')
      .replace('{{interests}}', learnerContext.interests?.join(', ') ?? 'not specified')
      .replace('{{emotionalState}}', learnerContext.currentEmotionalState ?? 'neutral')
      .replace('{{currentActivity}}', learnerContext.currentActivityType ?? 'general learning')
      .replace('{{nextActivity}}', learnerContext.nextActivityType ?? 'not specified')
      .replace(
        '{{copingStrategies}}',
        learnerContext.preferredCopingStrategies?.join(', ') ?? 'standard strategies'
      )
      .replace('{{recentChallenges}}', learnerContext.recentChallenges?.join(', ') ?? 'none noted')
      .replace('{{recentSuccesses}}', learnerContext.recentSuccesses?.join(', ') ?? 'none noted')
      .replace('{{readingLevel}}', preferences.readingLevel)
      .replace('{{vocabularyLevel}}', preferences.vocabularyLevel)
      .replace('{{sentenceLength}}', preferences.sentenceLength)
      .replace('{{includeVisualPrompts}}', preferences.includeVisualPrompts ? 'yes' : 'no')
      .replace('{{emphasizeEmotions}}', preferences.emphasizeEmotions ? 'yes' : 'no')
      .replace('{{storyTitle}}', story.title)
      .replace('{{storyCategory}}', story.category)
      .replace('{{storyPages}}', storyPagesText);

    return prompt;
  }

  private buildGenerationPrompt(
    scenario: CustomStoryScenario,
    learnerContext: LearnerContext,
    preferences: PersonalizationPreferences
  ): string {
    return `${PERSONALIZATION_SYSTEM_PROMPT}

You are creating a NEW social story for this specific scenario:

SCENARIO:
- Type: ${scenario.type}
- Description: ${scenario.description}
- Specific Situation: ${scenario.specificSituation ?? 'Not specified'}
- Desired Outcome: ${scenario.desiredOutcome ?? 'Help the learner navigate this situation successfully'}
- Key Behaviors to Address: ${scenario.keyBehaviors?.join(', ') ?? 'General coping'}

LEARNER CONTEXT:
- Name: ${learnerContext.preferredName ?? learnerContext.name ?? 'the learner'}
- Grade Level: ${learnerContext.gradeLevel ?? 'unknown'}
- Interests: ${learnerContext.interests?.join(', ') ?? 'not specified'}
- Preferred Coping Strategies: ${learnerContext.preferredCopingStrategies?.join(', ') ?? 'standard strategies'}

REQUIREMENTS:
1. Create a story with 4-6 pages
2. Each page should have 2-4 sentences
3. Maintain Carol Gray's sentence ratio (2+ descriptive/perspective/affirmative per directive)
4. Use ${preferences.readingLevel.toLowerCase()} reading level
5. Use ${preferences.sentenceLength.toLowerCase()} sentences
6. Include visual prompts for each page
7. Include at least one interactive element

OUTPUT: Return JSON in the same format as the personalization task.`;
  }

  private buildCalmingStrategyPrompt(learnerContext: LearnerContext): string {
    return `You are a supportive assistant helping a neurodiverse learner who is experiencing ${learnerContext.currentEmotionalState ?? 'difficulty'}.

LEARNER CONTEXT:
- Name: ${learnerContext.preferredName ?? learnerContext.name ?? 'the learner'}
- Preferred Coping Strategies: ${learnerContext.preferredCopingStrategies?.join(', ') ?? 'not specified'}
- Sensory Preferences:
  - Light Sensitivity: ${learnerContext.sensoryPreferences?.lightSensitivity ?? 'unknown'}
  - Sound Sensitivity: ${learnerContext.sensoryPreferences?.soundSensitivity ?? 'unknown'}
  - Preferred Calming Activities: ${learnerContext.sensoryPreferences?.preferredCalmingActivities?.join(', ') ?? 'not specified'}

Suggest a calming strategy that:
1. Matches the learner's preferences
2. Can be done immediately in a learning environment
3. Takes 1-3 minutes
4. Uses simple, concrete instructions

OUTPUT JSON:
{
  "strategyName": "Name of the strategy",
  "description": "Brief description",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "duration": 120,
  "visualPrompt": "Description for visual aid",
  "audioPrompt": "Optional calming audio description",
  "tags": ["breathing", "movement", "sensory", etc.]
}`;
  }

  private parsePersonalizationResponse(storyId: string, result: AiCallOutput): PersonalizedStory {
    if (result.error ?? result.safetyStatus === 'BLOCKED') {
      throw new Error(
        `Story personalization failed: ${result.error ?? 'Content blocked by safety filter'}`
      );
    }

    try {
      // Extract JSON from the response
      const jsonMatch = /\{[\s\S]*\}/.exec(result.content);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        pages: PersonalizedPage[];
        personalizationNotes: string[];
        readabilityScore?: number;
        estimatedDuration: number;
      };

      return {
        originalStoryId: storyId,
        personalizedAt: new Date(),
        pages: parsed.pages,
        personalizationNotes: parsed.personalizationNotes,
        readabilityScore: parsed.readabilityScore,
        estimatedDuration: parsed.estimatedDuration,
      };
    } catch (err) {
      // Return a fallback that indicates personalization wasn't applied
      console.warn('[SocialStoryPersonalizer] Failed to parse AI response:', err);
      return {
        originalStoryId: storyId,
        personalizedAt: new Date(),
        pages: [],
        personalizationNotes: ['Personalization could not be applied - using original story'],
        estimatedDuration: 180,
      };
    }
  }

  private parseGenerationResponse(result: AiCallOutput): PersonalizedStory {
    if (result.error ?? result.safetyStatus === 'BLOCKED') {
      throw new Error(
        `Story generation failed: ${result.error ?? 'Content blocked by safety filter'}`
      );
    }

    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(result.content);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        pages: PersonalizedPage[];
        personalizationNotes: string[];
        readabilityScore?: number;
        estimatedDuration: number;
      };

      return {
        originalStoryId: randomUUID(), // New story gets a new ID
        personalizedAt: new Date(),
        pages: parsed.pages,
        personalizationNotes: parsed.personalizationNotes,
        readabilityScore: parsed.readabilityScore,
        estimatedDuration: parsed.estimatedDuration,
      };
    } catch {
      throw new Error('Failed to parse generated story from AI response');
    }
  }

  private parseCalmingStrategyResponse(result: AiCallOutput): CalmingStrategySuggestion {
    if (result.error ?? result.safetyStatus === 'BLOCKED') {
      // Return a safe default strategy
      return {
        strategyName: 'Box Breathing',
        description: 'A simple breathing exercise to help calm down.',
        steps: [
          'Breathe in slowly for 4 counts',
          'Hold your breath for 4 counts',
          'Breathe out slowly for 4 counts',
          'Wait for 4 counts before breathing in again',
        ],
        duration: 60,
        visualPrompt: 'A square with arrows showing the breathing pattern',
        tags: ['breathing', 'calming'],
      };
    }

    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(result.content);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      return JSON.parse(jsonMatch[0]) as CalmingStrategySuggestion;
    } catch {
      // Return default strategy on parse failure
      return {
        strategyName: 'Box Breathing',
        description: 'A simple breathing exercise to help calm down.',
        steps: [
          'Breathe in slowly for 4 counts',
          'Hold your breath for 4 counts',
          'Breathe out slowly for 4 counts',
          'Wait for 4 counts before breathing in again',
        ],
        duration: 60,
        visualPrompt: 'A square with arrows showing the breathing pattern',
        tags: ['breathing', 'calming'],
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CustomStoryScenario {
  type: string;
  description: string;
  specificSituation?: string;
  desiredOutcome?: string;
  keyBehaviors?: string[];
}

export interface CalmingStrategySuggestion {
  strategyName: string;
  description: string;
  steps: string[];
  duration: number;
  visualPrompt?: string;
  audioPrompt?: string;
  tags: string[];
}
