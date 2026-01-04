/**
 * AI Agents Module - ND-1.2
 *
 * Exports all AI agent implementations.
 */

export {
  SocialStoryPersonalizerAgent,
  type SocialStoryPersonalizationInput,
  type LearnerContext,
  type PersonalizationPreferences,
  type PersonalizedStory,
  type PersonalizedPage,
  type PersonalizedSentence,
  type CustomStoryScenario,
  type CalmingStrategySuggestion,
} from './social-story-personalizer.js';

// New agent exports
export { BaseAgent, type AgentContext, type AgentResponse } from './base-agent.js';
export { TutorAgent } from './tutor-agent.js';
export {
  WritingAssistantAgent,
  type WritingContext,
  type WritingType,
  type WritingLevel,
  type WritingSuggestion,
  type SentenceCompletion,
  type WritingPromptResponse,
  type WritingFeedback,
} from './writing-assistant.js';
