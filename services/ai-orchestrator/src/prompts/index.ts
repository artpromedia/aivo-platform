/**
 * Prompts Module Exports
 */

export { PromptBuilder, type PromptContext } from './prompt-builder.js';

// IEP Prompt Templates (Sprint 1.3)
export {
  IEP_GOAL_GENERATION_SYSTEM_PROMPT,
  OBJECTIVE_GENERATION_SYSTEM_PROMPT,
  ACCOMMODATION_SUGGESTION_SYSTEM_PROMPT,
  buildIEPGoalPrompt,
  buildObjectivePrompt,
  buildAccommodationPrompt,
  getDomainGuidance,
  getDisabilityGuidance,
} from './iep-prompts.js';
