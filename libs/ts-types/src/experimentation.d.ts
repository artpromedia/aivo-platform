/**
 * Experimentation Types
 *
 * Shared types for experiment configuration consumed by agents.
 */
export type ExperimentScope = 'TENANT' | 'LEARNER';
export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type AssignmentReason = 'HASH_ALLOCATION' | 'TENANT_OPT_OUT' | 'EXPERIMENT_NOT_RUNNING' | 'EXPERIMENT_NOT_FOUND' | 'FORCED_VARIANT';
/**
 * Generic variant configuration object.
 * Specific experiments will have typed configurations.
 */
export type VariantConfig = Record<string, unknown>;
/**
 * Result of an experiment assignment query.
 */
export interface ExperimentAssignmentResult {
    /** Experiment key */
    experimentKey: string;
    /** Assigned variant key */
    variantKey: string;
    /** Variant-specific configuration */
    config: VariantConfig;
    /** How the assignment was determined */
    reason: AssignmentReason;
    /** Whether the subject is actually in the experiment */
    assigned: boolean;
}
/**
 * Batch assignment result for multiple experiments.
 */
export interface BatchExperimentAssignmentResult {
    tenantId: string;
    learnerId?: string;
    assignments: ExperimentAssignmentResult[];
}
/**
 * Lightweight experiment context for agent integration.
 * Used by Focus Agent, Virtual Brain, Lesson Planner, etc.
 */
export interface AgentExperimentContext {
    /** Active experiments with assigned variants */
    experiments: {
        key: string;
        variant: string;
        config: VariantConfig;
    }[];
}
/**
 * Experiment-driven configuration for Focus Agent.
 */
export interface FocusAgentExperimentConfig {
    /** Session duration in minutes */
    sessionDurationMinutes?: number;
    /** Break duration in minutes */
    breakDurationMinutes?: number;
    /** Whether to use adaptive session timing */
    adaptiveTimingEnabled?: boolean;
    /** Focus reminder frequency in minutes */
    reminderFrequencyMinutes?: number;
    /** Custom focus strategies */
    strategies?: string[];
}
/**
 * Experiment-driven configuration for Virtual Brain.
 */
export interface VirtualBrainExperimentConfig {
    /** Content selection algorithm variant */
    contentSelectionAlgorithm?: string;
    /** Difficulty adjustment sensitivity (0-1) */
    difficultyAdjustmentSensitivity?: number;
    /** Whether to use personalization signals */
    usePersonalizationSignals?: boolean;
    /** Recommendation explanation style */
    explanationStyle?: string;
}
/**
 * Input for logging an experiment exposure.
 */
export interface LogExposureInput {
    /** Experiment key */
    experimentKey: string;
    /** Tenant ID */
    tenantId: string;
    /** Learner ID (for LEARNER-scoped experiments) */
    learnerId?: string;
    /** Which variant was shown */
    variantKey: string;
    /** Where the exposure occurred (e.g., 'focus_agent', 'recommendations_ui') */
    featureArea: string;
    /** Session context */
    sessionId?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Well-known experiment keys used across the platform.
 * Add new experiment keys here as they are created.
 */
export declare const KNOWN_EXPERIMENT_KEYS: {
    readonly FOCUS_SESSION_LENGTH: "focus_session_length";
    readonly FOCUS_BREAK_LENGTH: "focus_break_length";
    readonly ADAPTIVE_TIMING: "adaptive_timing";
    readonly FOCUS_REMINDERS: "focus_reminders";
    readonly FOCUS_STRATEGIES: "focus_strategies";
    readonly CONTENT_SELECTION_ALGORITHM: "content_selection_algorithm";
    readonly DIFFICULTY_ADJUSTMENT: "difficulty_adjustment";
    readonly PERSONALIZATION_SIGNALS_USAGE: "personalization_signals_usage";
    readonly RECOMMENDATION_EXPLANATION: "recommendation_explanation";
    readonly ONBOARDING_FLOW: "onboarding_flow";
    readonly PROGRESS_VISUALIZATION: "progress_visualization";
    readonly REWARD_SYSTEM: "reward_system";
};
export type KnownExperimentKey = (typeof KNOWN_EXPERIMENT_KEYS)[keyof typeof KNOWN_EXPERIMENT_KEYS];
//# sourceMappingURL=experimentation.d.ts.map