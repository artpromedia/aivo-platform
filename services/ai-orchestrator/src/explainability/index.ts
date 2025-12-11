/**
 * Explainability Module
 *
 * Provides structured explanation generation for AI agent decisions.
 *
 * Usage:
 *
 * ```typescript
 * import { createExplanationBuilder, explainContentSelection } from './explainability/index.js';
 *
 * const builder = createExplanationBuilder(pool);
 *
 * // Use typed agent helpers
 * explainContentSelection(builder, context, {
 *   selectedLoVersionId: 'lo-123',
 *   contentName: 'Fraction Basics',
 *   subject: 'Math',
 *   masteryScore: 0.42,
 *   gradeBand: 'K5',
 *   selectionReasons: ['MASTERY_MATCH', 'SKILL_GAP_FILL'],
 * });
 *
 * // Or use the builder directly
 * builder.explainAsync({
 *   tenantId: 'tenant-1',
 *   learnerId: 'learner-1',
 *   sourceType: 'VIRTUAL_BRAIN',
 *   actionType: 'DIFFICULTY_CHANGE',
 *   // ...
 * });
 * ```
 *
 * @module ai-orchestrator/explainability
 */

// Core builder
export {
  ExplanationBuilder,
  createExplanationBuilder,
  DEFAULT_EXPLAINABILITY_CONFIG,
  parseExplainabilityConfigFromEnv,
} from './builder.js';

export type {
  ExplainabilityConfig,
  BuildExplanationInput,
  BuildExplanationResult,
  ExplanationReasonInput,
  PersistExplanationResult,
} from './builder.js';

// Agent-specific helpers
export {
  explainContentSelection,
  explainDifficultyChange,
  explainFocusBreak,
  explainFocusIntervention,
  explainModuleRecommendation,
  explainScaffolding,
  explainDecision,
} from './agents.js';

export type {
  AgentContext,
  ContentSelectionDecision,
  ContentSelectionReason,
  DifficultyChangeDecision,
  DifficultyChangeReason,
  FocusBreakDecision,
  FocusBreakReason,
  FocusInterventionDecision,
  FocusInterventionReason,
  ModuleRecommendationDecision,
  ModuleRecommendationReason,
  ScaffoldingDecision,
  ScaffoldingReason,
} from './agents.js';

// Re-export types from shared library for convenience
export type {
  ExplanationEvent,
  ExplanationTemplate,
  ExplanationDetails,
  ExplanationReason,
  ExplanationSourceType,
  ExplanationActionType,
  TemplateContext,
  TemplateKey,
  ReasonCode,
} from '@aivo/ts-types';

export { TEMPLATE_KEYS, REASON_CODES } from '@aivo/ts-types';
