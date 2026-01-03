/**
 * Audit Event Types
 *
 * Types for the unified audit trail system that tracks changes to:
 * - Learner difficulty levels
 * - Today Plans
 * - Policy documents
 *
 * @module @aivo/ts-types/audit
 */
export const AUDIT_ACTOR_TYPES = ['USER', 'SYSTEM', 'AGENT'];
export const AUDIT_ACTION_TYPES = [
    'CREATED',
    'UPDATED',
    'DELETED',
    'ACTIVATED',
    'DEACTIVATED',
];
export const AUDIT_ENTITY_TYPES = [
    'LEARNER_DIFFICULTY',
    'TODAY_PLAN',
    'POLICY_DOCUMENT',
    'LEARNER_PROFILE',
    'TENANT_SETTINGS',
    'USER_ROLE',
];
// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Actor type display configuration
 */
export const ACTOR_TYPE_DISPLAY = {
    USER: { label: 'User', icon: 'user' },
    SYSTEM: { label: 'System', icon: 'server' },
    AGENT: { label: 'AI Agent', icon: 'bot' },
};
/**
 * Action type display configuration
 */
export const ACTION_TYPE_DISPLAY = {
    CREATED: { label: 'Created', colorClass: 'bg-emerald-100 text-emerald-800' },
    UPDATED: { label: 'Updated', colorClass: 'bg-blue-100 text-blue-800' },
    DELETED: { label: 'Deleted', colorClass: 'bg-red-100 text-red-800' },
    ACTIVATED: { label: 'Activated', colorClass: 'bg-green-100 text-green-800' },
    DEACTIVATED: { label: 'Deactivated', colorClass: 'bg-amber-100 text-amber-800' },
};
/**
 * Entity type display configuration
 */
export const ENTITY_TYPE_DISPLAY = {
    LEARNER_DIFFICULTY: { label: 'Difficulty Level', icon: 'gauge' },
    TODAY_PLAN: { label: 'Today Plan', icon: 'calendar' },
    POLICY_DOCUMENT: { label: 'Policy', icon: 'file-text' },
    LEARNER_PROFILE: { label: 'Learner Profile', icon: 'user' },
    TENANT_SETTINGS: { label: 'Tenant Settings', icon: 'settings' },
    USER_ROLE: { label: 'User Role', icon: 'shield' },
};
/**
 * Well-known agent IDs for display
 */
export const AGENT_DISPLAY_NAMES = {
    VIRTUAL_BRAIN: 'Virtual Brain',
    LESSON_PLANNER: 'Lesson Planner',
    FOCUS_AGENT: 'Focus Agent',
    BASELINE_AGENT: 'Baseline Agent',
    HOMEWORK_HELPER: 'Homework Helper',
    RECOMMENDER: 'Recommender',
};
//# sourceMappingURL=audit.js.map