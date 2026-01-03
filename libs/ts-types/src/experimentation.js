/**
 * Experimentation Types
 *
 * Shared types for experiment configuration consumed by agents.
 */
// ══════════════════════════════════════════════════════════════════════════════
// KNOWN EXPERIMENT KEYS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Well-known experiment keys used across the platform.
 * Add new experiment keys here as they are created.
 */
export const KNOWN_EXPERIMENT_KEYS = {
    // Focus experiments
    FOCUS_SESSION_LENGTH: 'focus_session_length',
    FOCUS_BREAK_LENGTH: 'focus_break_length',
    ADAPTIVE_TIMING: 'adaptive_timing',
    FOCUS_REMINDERS: 'focus_reminders',
    FOCUS_STRATEGIES: 'focus_strategies',
    // Content/recommendation experiments
    CONTENT_SELECTION_ALGORITHM: 'content_selection_algorithm',
    DIFFICULTY_ADJUSTMENT: 'difficulty_adjustment',
    PERSONALIZATION_SIGNALS_USAGE: 'personalization_signals_usage',
    RECOMMENDATION_EXPLANATION: 'recommendation_explanation',
    // UI/UX experiments
    ONBOARDING_FLOW: 'onboarding_flow',
    PROGRESS_VISUALIZATION: 'progress_visualization',
    REWARD_SYSTEM: 'reward_system',
};
//# sourceMappingURL=experimentation.js.map