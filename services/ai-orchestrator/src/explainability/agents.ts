/**
 * Agent Explanation Hooks
 *
 * Pre-built explanation generators for common agent decisions.
 * These provide type-safe, consistent explanations across agents.
 *
 * @module ai-orchestrator/explainability/agents
 */

import type {
  ExplanationActionType,
  ExplanationSourceType,
  TemplateContext,
} from '@aivo/ts-types';

import type {
  BuildExplanationInput,
  ExplanationBuilder,
  ExplanationReasonInput,
} from './builder.js';

// ════════════════════════════════════════════════════════════════════════════
// Base Context Type
// ════════════════════════════════════════════════════════════════════════════

export interface AgentContext {
  tenantId: string;
  learnerId: string;
  sessionId?: string;
  userId?: string;
  learnerName?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Lesson Planner Agent
// ════════════════════════════════════════════════════════════════════════════

export interface ContentSelectionDecision {
  /** Selected learning object version ID */
  selectedLoVersionId: string;

  /** Learning object name/title */
  contentName: string;

  /** Subject area */
  subject: string;

  /** Target skill area */
  skillArea?: string;

  /** Learner's mastery score for this skill (0-1) */
  masteryScore: number;

  /** Grade band match quality */
  gradeBand: string;

  /** Days since this content was last used */
  lastUsedDaysAgo?: number;

  /** Mastery threshold used for selection */
  masteryThreshold?: number;

  /** Reasons for selection */
  selectionReasons: ContentSelectionReason[];
}

export type ContentSelectionReason =
  | 'MASTERY_MATCH'
  | 'NOT_RECENTLY_USED'
  | 'GRADE_BAND_MATCH'
  | 'PREREQUISITE_MET'
  | 'SKILL_GAP_FILL'
  | 'REINFORCEMENT'
  | 'EXPERIMENT_VARIANT';

const CONTENT_SELECTION_DESCRIPTIONS: Record<ContentSelectionReason, string> = {
  MASTERY_MATCH: 'matches current skill level',
  NOT_RECENTLY_USED: 'provides fresh practice opportunities',
  GRADE_BAND_MATCH: 'is appropriate for current grade level',
  PREREQUISITE_MET: 'builds on recently mastered skills',
  SKILL_GAP_FILL: 'addresses an area identified for growth',
  REINFORCEMENT: 'helps strengthen developing skills',
  EXPERIMENT_VARIANT: 'is part of a learning optimization study',
};

/**
 * Generate explanation for Lesson Planner content selection.
 */
export function explainContentSelection(
  builder: ExplanationBuilder,
  context: AgentContext,
  decision: ContentSelectionDecision
): void {
  const reasons: ExplanationReasonInput[] = decision.selectionReasons.map((reason, idx) => ({
    code: reason,
    description: CONTENT_SELECTION_DESCRIPTIONS[reason],
    weight: 1 / (idx + 1),
  }));

  const templateKey =
    decision.selectionReasons.includes('SKILL_GAP_FILL')
      ? 'CONTENT_SKILL_GAP'
      : decision.selectionReasons.includes('REINFORCEMENT')
        ? 'CONTENT_REINFORCEMENT'
        : undefined;

  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType: 'LESSON_PLANNER',
    actionType: 'CONTENT_SELECTION',
    relatedEntityType: 'LEARNING_OBJECT_VERSION',
    relatedEntityId: decision.selectedLoVersionId,
    reasons,
    inputs: {
      masteryScore: decision.masteryScore,
      gradeBand: decision.gradeBand,
      subject: decision.subject,
      skillArea: decision.skillArea,
      contentName: decision.contentName,
      learnerName: context.learnerName,
      ...(decision.lastUsedDaysAgo !== undefined && { lastUsedDaysAgo: decision.lastUsedDaysAgo }),
    },
    thresholds: {
      ...(decision.masteryThreshold !== undefined && {
        masteryThreshold: decision.masteryThreshold,
      }),
    },
    templateKey,
    templateContext: {
      content_name: decision.contentName,
      skill_area: decision.skillArea,
      subject: decision.subject,
      learner_name: context.learnerName,
    },
  };

  builder.explainAsync(input);
}

// ════════════════════════════════════════════════════════════════════════════
// Virtual Brain Agent
// ════════════════════════════════════════════════════════════════════════════

export interface DifficultyChangeDecision {
  /** The skill or content affected */
  skillId: string;

  /** Subject area */
  subject: string;

  /** Direction of change */
  direction: 'INCREASE' | 'DECREASE';

  /** Previous difficulty level (1-5 or similar scale) */
  previousLevel: number;

  /** New difficulty level */
  newLevel: number;

  /** Recent accuracy rate (0-1) */
  recentAccuracy: number;

  /** Number of recent attempts */
  attemptCount: number;

  /** Mastery score if available */
  masteryScore?: number;

  /** Reasons for the change */
  changeReasons: DifficultyChangeReason[];
}

export type DifficultyChangeReason =
  | 'HIGH_CORRECT_RATE'
  | 'LOW_ERROR_RATE'
  | 'REPEATED_STRUGGLE'
  | 'MASTERY_ACHIEVED'
  | 'BELOW_THRESHOLD'
  | 'CONFIDENCE_BOOST'
  | 'CHALLENGE_READY';

const DIFFICULTY_CHANGE_DESCRIPTIONS: Record<DifficultyChangeReason, string> = {
  HIGH_CORRECT_RATE: 'recent practice shows strong understanding',
  LOW_ERROR_RATE: 'mistakes are becoming less frequent',
  REPEATED_STRUGGLE: 'recent practice showed some areas for growth',
  MASTERY_ACHIEVED: 'skill mastery has been demonstrated',
  BELOW_THRESHOLD: 'additional practice at current level is helpful',
  CONFIDENCE_BOOST: 'building confidence with achievable challenges',
  CHALLENGE_READY: 'ready for more challenging practice',
};

/**
 * Generate explanation for Virtual Brain difficulty adjustment.
 */
export function explainDifficultyChange(
  builder: ExplanationBuilder,
  context: AgentContext,
  decision: DifficultyChangeDecision
): void {
  const reasons: ExplanationReasonInput[] = decision.changeReasons.map((reason, idx) => ({
    code: reason,
    description: DIFFICULTY_CHANGE_DESCRIPTIONS[reason],
    weight: 1 / (idx + 1),
  }));

  // Select appropriate template
  const templateKey =
    decision.direction === 'INCREASE' ? 'DIFFICULTY_UP_MASTERY' : 'DIFFICULTY_DOWN_STRUGGLE';

  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType: 'VIRTUAL_BRAIN',
    actionType: 'DIFFICULTY_CHANGE',
    relatedEntityType: 'SKILL',
    relatedEntityId: decision.skillId,
    reasons,
    inputs: {
      subject: decision.subject,
      direction: decision.direction,
      previousLevel: decision.previousLevel,
      newLevel: decision.newLevel,
      recentAccuracy: decision.recentAccuracy,
      attemptCount: decision.attemptCount,
      learnerName: context.learnerName,
      ...(decision.masteryScore !== undefined && { masteryScore: decision.masteryScore }),
    },
    thresholds: {
      accuracyThreshold: decision.direction === 'INCREASE' ? 0.85 : 0.5,
    },
    templateKey,
    templateContext: {
      subject: decision.subject,
      learner_name: context.learnerName,
    },
  };

  builder.explainAsync(input);
}

// ════════════════════════════════════════════════════════════════════════════
// Focus Agent
// ════════════════════════════════════════════════════════════════════════════

export interface FocusBreakDecision {
  /** Session event ID that triggered the break */
  sessionEventId: string;

  /** Session duration in minutes */
  sessionDurationMinutes: number;

  /** Focus score (0-1) when break was triggered */
  focusScore?: number;

  /** Seconds of inactivity if applicable */
  idleSeconds?: number;

  /** Number of rapid wrong attempts */
  rapidWrongAttempts?: number;

  /** Break type */
  breakType: 'MOVEMENT' | 'BREATHING' | 'GAME' | 'FREE';

  /** Reasons for triggering the break */
  triggerReasons: FocusBreakReason[];
}

export type FocusBreakReason =
  | 'TIME_BASED'
  | 'FOCUS_SCORE_LOW'
  | 'INACTIVITY_TIMEOUT'
  | 'RAPID_WRONG_ATTEMPTS'
  | 'SELF_REPORTED_MOOD'
  | 'SCHEDULED_BREAK';

const FOCUS_BREAK_DESCRIPTIONS: Record<FocusBreakReason, string> = {
  TIME_BASED: 'after focused practice to help maintain attention',
  FOCUS_SCORE_LOW: 'to help reset and refocus',
  INACTIVITY_TIMEOUT: 'after noticing a pause in activity',
  RAPID_WRONG_ATTEMPTS: 'to take a moment and come back refreshed',
  SELF_REPORTED_MOOD: 'in response to how the learner was feeling',
  SCHEDULED_BREAK: 'as part of healthy learning habits',
};

/**
 * Generate explanation for Focus Agent break trigger.
 */
export function explainFocusBreak(
  builder: ExplanationBuilder,
  context: AgentContext,
  decision: FocusBreakDecision
): void {
  const reasons: ExplanationReasonInput[] = decision.triggerReasons.map((reason, idx) => ({
    code: reason,
    description: FOCUS_BREAK_DESCRIPTIONS[reason],
    weight: 1 / (idx + 1),
  }));

  // Select template based on primary reason
  const templateKey = decision.triggerReasons.includes('TIME_BASED')
    ? 'FOCUS_BREAK_TIME_BASED'
    : 'FOCUS_BREAK_ATTENTION';

  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType: 'FOCUS_AGENT',
    actionType: 'FOCUS_BREAK_TRIGGER',
    relatedEntityType: 'SESSION_EVENT',
    relatedEntityId: decision.sessionEventId,
    reasons,
    inputs: {
      sessionDurationMinutes: decision.sessionDurationMinutes,
      durationMinutes: decision.sessionDurationMinutes,
      breakType: decision.breakType,
      learnerName: context.learnerName,
      ...(decision.focusScore !== undefined && { focusScore: decision.focusScore }),
      ...(decision.idleSeconds !== undefined && { idleSeconds: decision.idleSeconds }),
      ...(decision.rapidWrongAttempts !== undefined && {
        rapidWrongAttempts: decision.rapidWrongAttempts,
      }),
    },
    thresholds: {
      timeThresholdMinutes: 25,
      focusThreshold: 0.4,
    },
    templateKey,
    templateContext: {
      duration_minutes: decision.sessionDurationMinutes,
      learner_name: context.learnerName,
    },
  };

  builder.explainAsync(input);
}

// ════════════════════════════════════════════════════════════════════════════
// Focus Agent - Intervention
// ════════════════════════════════════════════════════════════════════════════

export interface FocusInterventionDecision {
  /** Session event ID */
  sessionEventId: string;

  /** Type of intervention offered */
  interventionType: 'MOVEMENT_ACTIVITY' | 'BREATHING_EXERCISE' | 'MINI_GAME' | 'ENCOURAGEMENT';

  /** Focus score when intervention was shown */
  focusScore?: number;

  /** Session duration at intervention */
  sessionDurationMinutes: number;

  /** Reasons for intervention */
  reasons: FocusInterventionReason[];
}

export type FocusInterventionReason =
  | 'ENGAGEMENT_DROP'
  | 'FRUSTRATION_DETECTED'
  | 'FATIGUE_SIGNALS'
  | 'PROACTIVE_SUPPORT';

const FOCUS_INTERVENTION_DESCRIPTIONS: Record<FocusInterventionReason, string> = {
  ENGAGEMENT_DROP: 'to help re-engage with learning',
  FRUSTRATION_DETECTED: 'to provide a moment to reset',
  FATIGUE_SIGNALS: 'to help restore energy for learning',
  PROACTIVE_SUPPORT: 'as a supportive learning strategy',
};

/**
 * Generate explanation for Focus Agent intervention.
 */
export function explainFocusIntervention(
  builder: ExplanationBuilder,
  context: AgentContext,
  decision: FocusInterventionDecision
): void {
  const reasons: ExplanationReasonInput[] = decision.reasons.map((reason, idx) => ({
    code: reason,
    description: FOCUS_INTERVENTION_DESCRIPTIONS[reason],
    weight: 1 / (idx + 1),
  }));

  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType: 'FOCUS_AGENT',
    actionType: 'FOCUS_INTERVENTION',
    relatedEntityType: 'SESSION_EVENT',
    relatedEntityId: decision.sessionEventId,
    reasons,
    inputs: {
      interventionType: decision.interventionType,
      sessionDurationMinutes: decision.sessionDurationMinutes,
      learnerName: context.learnerName,
      ...(decision.focusScore !== undefined && { focusScore: decision.focusScore }),
    },
    templateKey: 'FOCUS_INTERVENTION_ACTIVITY',
    templateContext: {
      learner_name: context.learnerName,
    },
  };

  builder.explainAsync(input);
}

// ════════════════════════════════════════════════════════════════════════════
// Recommender Agent
// ════════════════════════════════════════════════════════════════════════════

export interface ModuleRecommendationDecision {
  /** Recommended module ID */
  moduleId: string;

  /** Module name */
  moduleName: string;

  /** Target subject */
  subject: string;

  /** Target skill */
  skillArea: string;

  /** Prerequisite skill (if applicable) */
  prerequisiteSkill?: string;

  /** Confidence in recommendation (0-1) */
  confidence: number;

  /** Reasons for recommendation */
  recommendationReasons: ModuleRecommendationReason[];
}

export type ModuleRecommendationReason =
  | 'NEXT_IN_SEQUENCE'
  | 'SKILL_GAP'
  | 'PRACTICE_NEEDED'
  | 'HIGH_ENGAGEMENT_PREDICTED'
  | 'PARENT_PREFERENCE';

const MODULE_RECOMMENDATION_DESCRIPTIONS: Record<ModuleRecommendationReason, string> = {
  NEXT_IN_SEQUENCE: 'is the natural next step in the learning journey',
  SKILL_GAP: 'addresses an area that would benefit from more practice',
  PRACTICE_NEEDED: 'helps solidify understanding before moving on',
  HIGH_ENGAGEMENT_PREDICTED: 'matches learning preferences',
  PARENT_PREFERENCE: 'aligns with family learning goals',
};

/**
 * Generate explanation for Recommender module recommendation.
 */
export function explainModuleRecommendation(
  builder: ExplanationBuilder,
  context: AgentContext,
  decision: ModuleRecommendationDecision
): void {
  const reasons: ExplanationReasonInput[] = decision.recommendationReasons.map((reason, idx) => ({
    code: reason,
    description: MODULE_RECOMMENDATION_DESCRIPTIONS[reason],
    weight: 1 / (idx + 1),
  }));

  const templateKey = decision.recommendationReasons.includes('PRACTICE_NEEDED')
    ? 'RECOMMEND_PRACTICE'
    : 'RECOMMEND_NEXT_SKILL';

  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType: 'RECOMMENDER',
    actionType: 'MODULE_RECOMMENDATION',
    relatedEntityType: 'MODULE',
    relatedEntityId: decision.moduleId,
    reasons,
    inputs: {
      moduleName: decision.moduleName,
      subject: decision.subject,
      skillArea: decision.skillArea,
      learnerName: context.learnerName,
      ...(decision.prerequisiteSkill && { prerequisiteSkill: decision.prerequisiteSkill }),
    },
    confidence: decision.confidence,
    templateKey,
    templateContext: {
      module_name: decision.moduleName,
      learner_name: context.learnerName,
      skill_area: decision.skillArea,
      prerequisite_skill: decision.prerequisiteSkill,
    },
  };

  builder.explainAsync(input);
}

// ════════════════════════════════════════════════════════════════════════════
// Homework Helper Agent
// ════════════════════════════════════════════════════════════════════════════

export interface ScaffoldingDecision {
  /** Step or problem ID */
  stepId: string;

  /** Type of scaffolding provided */
  scaffoldType: 'HINT' | 'STEP_BREAKDOWN' | 'EXAMPLE' | 'ENCOURAGEMENT';

  /** Number of attempts before scaffolding */
  attemptCount: number;

  /** Whether hint was explicitly requested */
  hintRequested: boolean;

  /** Reasons for scaffolding */
  scaffoldReasons: ScaffoldingReason[];
}

export type ScaffoldingReason =
  | 'HINT_REQUESTED'
  | 'MULTIPLE_ATTEMPTS'
  | 'LONG_PAUSE'
  | 'PROACTIVE_SUPPORT';

const SCAFFOLDING_DESCRIPTIONS: Record<ScaffoldingReason, string> = {
  HINT_REQUESTED: 'in response to a request for help',
  MULTIPLE_ATTEMPTS: 'to guide toward the solution',
  LONG_PAUSE: 'to provide support during thinking time',
  PROACTIVE_SUPPORT: 'to encourage independent problem-solving',
};

/**
 * Generate explanation for Homework Helper scaffolding.
 */
export function explainScaffolding(
  builder: ExplanationBuilder,
  context: AgentContext,
  decision: ScaffoldingDecision
): void {
  const reasons: ExplanationReasonInput[] = decision.scaffoldReasons.map((reason, idx) => ({
    code: reason,
    description: SCAFFOLDING_DESCRIPTIONS[reason],
    weight: 1 / (idx + 1),
  }));

  const templateKey =
    decision.scaffoldType === 'STEP_BREAKDOWN' ? 'SCAFFOLD_STEP_BREAKDOWN' : 'SCAFFOLD_HINT';

  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType: 'HOMEWORK_HELPER',
    actionType: 'SCAFFOLDING_DECISION',
    relatedEntityType: 'ACTIVITY',
    relatedEntityId: decision.stepId,
    reasons,
    inputs: {
      scaffoldType: decision.scaffoldType,
      attemptCount: decision.attemptCount,
      hintRequested: decision.hintRequested,
      learnerName: context.learnerName,
    },
    templateKey,
    templateContext: {
      learner_name: context.learnerName,
    },
  };

  builder.explainAsync(input);
}

// ════════════════════════════════════════════════════════════════════════════
// Generic Explanation Helper
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generic explanation for custom agent decisions.
 */
export function explainDecision(
  builder: ExplanationBuilder,
  context: AgentContext,
  sourceType: ExplanationSourceType,
  actionType: ExplanationActionType,
  relatedEntityType: string,
  relatedEntityId: string,
  reasons: ExplanationReasonInput[],
  inputs: Record<string, unknown>,
  options?: {
    templateKey?: string;
    templateContext?: TemplateContext;
    confidence?: number;
    experimentKey?: string;
    variantId?: string;
    aiCallLogId?: string;
  }
): void {
  const input: BuildExplanationInput = {
    tenantId: context.tenantId,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    userId: context.userId,
    sourceType,
    actionType,
    relatedEntityType,
    relatedEntityId,
    reasons,
    inputs: {
      ...inputs,
      learnerName: context.learnerName,
    },
    ...(options?.templateKey && { templateKey: options.templateKey }),
    ...(options?.templateContext && { templateContext: options.templateContext }),
    ...(options?.confidence !== undefined && { confidence: options.confidence }),
    ...(options?.experimentKey && { experimentKey: options.experimentKey }),
    ...(options?.variantId && { variantId: options.variantId }),
    ...(options?.aiCallLogId && { aiCallLogId: options.aiCallLogId }),
  };

  builder.explainAsync(input);
}
