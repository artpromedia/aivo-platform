/**
 * Explainability Types
 *
 * Structured types for explanation events that provide human-readable
 * justifications for platform decisions.
 *
 * @module @aivo/ts-types/explainability
 */
// ════════════════════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════════════════════
/**
 * Source systems that generate explanations.
 */
export const EXPLANATION_SOURCE_TYPES = [
    'LESSON_PLANNER',
    'VIRTUAL_BRAIN',
    'FOCUS_AGENT',
    'RECOMMENDER',
    'SYSTEM_POLICY',
    'BASELINE_AGENT',
    'HOMEWORK_HELPER',
];
/**
 * Types of actions being explained.
 */
export const EXPLANATION_ACTION_TYPES = [
    'CONTENT_SELECTION',
    'DIFFICULTY_CHANGE',
    'FOCUS_BREAK_TRIGGER',
    'FOCUS_INTERVENTION',
    'MODULE_RECOMMENDATION',
    'LEARNING_PATH_ADJUSTMENT',
    'SKILL_PROGRESSION',
    'SCAFFOLDING_DECISION',
    'POLICY_ENFORCEMENT',
];
/**
 * Common related entity types.
 */
export const RELATED_ENTITY_TYPES = [
    'LEARNING_OBJECT_VERSION',
    'RECOMMENDATION',
    'SKILL',
    'SESSION_EVENT',
    'EXPERIMENT',
    'POLICY_RULE',
    'MODULE',
    'ACTIVITY',
];
// ════════════════════════════════════════════════════════════════════════════
// Convenience Constants
// ════════════════════════════════════════════════════════════════════════════
/**
 * Well-known template keys for programmatic use.
 */
export const TEMPLATE_KEYS = {
    // Difficulty changes
    DIFFICULTY_DOWN_STRUGGLE: 'DIFFICULTY_DOWN_STRUGGLE',
    DIFFICULTY_UP_MASTERY: 'DIFFICULTY_UP_MASTERY',
    // Focus breaks
    FOCUS_BREAK_TIME_BASED: 'FOCUS_BREAK_TIME_BASED',
    FOCUS_BREAK_ATTENTION: 'FOCUS_BREAK_ATTENTION',
    FOCUS_INTERVENTION_ACTIVITY: 'FOCUS_INTERVENTION_ACTIVITY',
    // Content selection
    CONTENT_SKILL_GAP: 'CONTENT_SKILL_GAP',
    CONTENT_REINFORCEMENT: 'CONTENT_REINFORCEMENT',
    // Recommendations
    RECOMMEND_NEXT_SKILL: 'RECOMMEND_NEXT_SKILL',
    RECOMMEND_PRACTICE: 'RECOMMEND_PRACTICE',
    // Learning path
    PATH_ACCELERATE: 'PATH_ACCELERATE',
    PATH_REINFORCE: 'PATH_REINFORCE',
    // Scaffolding
    SCAFFOLD_HINT: 'SCAFFOLD_HINT',
    SCAFFOLD_STEP_BREAKDOWN: 'SCAFFOLD_STEP_BREAKDOWN',
    // Policy
    POLICY_TIME_LIMIT: 'POLICY_TIME_LIMIT',
    POLICY_CONTENT_FILTER: 'POLICY_CONTENT_FILTER',
};
/**
 * Reason codes for machine-readable explanation details.
 */
export const REASON_CODES = {
    // Mastery-related
    LOW_MASTERY: 'LOW_MASTERY',
    HIGH_MASTERY: 'HIGH_MASTERY',
    MASTERY_PLATEAU: 'MASTERY_PLATEAU',
    // Performance-related
    RECENT_STRUGGLE: 'RECENT_STRUGGLE',
    RECENT_SUCCESS: 'RECENT_SUCCESS',
    ACCURACY_BELOW_THRESHOLD: 'ACCURACY_BELOW_THRESHOLD',
    ACCURACY_ABOVE_THRESHOLD: 'ACCURACY_ABOVE_THRESHOLD',
    // Focus-related
    FOCUS_LOSS_DETECTED: 'FOCUS_LOSS_DETECTED',
    TIME_BASED_BREAK: 'TIME_BASED_BREAK',
    IDLE_DETECTED: 'IDLE_DETECTED',
    // Learning path
    PREREQUISITE_MET: 'PREREQUISITE_MET',
    SKILL_GAP_IDENTIFIED: 'SKILL_GAP_IDENTIFIED',
    REINFORCEMENT_NEEDED: 'REINFORCEMENT_NEEDED',
    // Policy
    POLICY_RULE_TRIGGERED: 'POLICY_RULE_TRIGGERED',
    TIME_LIMIT_REACHED: 'TIME_LIMIT_REACHED',
    CONTENT_RESTRICTION: 'CONTENT_RESTRICTION',
    // Experiment
    EXPERIMENT_VARIANT: 'EXPERIMENT_VARIANT',
};
//# sourceMappingURL=explainability.js.map