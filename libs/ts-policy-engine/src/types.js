/**
 * Policy Engine Types
 *
 * Defines the structure for global and tenant-specific policies.
 * Policies control safety thresholds, AI provider/model access, and retention windows.
 */
import { z } from 'zod';
// ════════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════
export const POLICY_SCOPE_TYPES = ['GLOBAL', 'TENANT'];
export const SAFETY_SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
export const BLOCKED_CONTENT_ACTIONS = ['FALLBACK', 'REJECT'];
export const AI_PROVIDERS = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'MOCK'];
// ════════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Safety policy configuration
 */
export const SafetyPolicySchema = z.object({
    /** Minimum severity level to trigger incident creation */
    min_severity_for_incident: z.enum(SAFETY_SEVERITY_LEVELS).default('MEDIUM'),
    /** Action to take when content is blocked */
    blocked_content_action: z.enum(BLOCKED_CONTENT_ACTIONS).default('FALLBACK'),
    /** Whether to log all safety evaluations (including OK) */
    log_all_evaluations: z.boolean().default(false),
    /** Enable additional safety checks for COPPA compliance */
    coppa_strict_mode: z.boolean().default(true),
    /** Custom keywords to block (tenant-specific) */
    additional_blocked_keywords: z.array(z.string()).default([]),
});
/**
 * AI provider and model configuration
 */
export const AIPolicySchema = z.object({
    /** List of allowed AI providers */
    allowed_providers: z.array(z.enum(AI_PROVIDERS)).default(['OPENAI', 'ANTHROPIC']),
    /** List of allowed model identifiers */
    allowed_models: z
        .array(z.string())
        .default(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022']),
    /** Maximum tokens per single AI call */
    max_tokens_per_call: z.number().int().min(1).max(100000).default(4096),
    /** Maximum acceptable latency in milliseconds */
    max_latency_ms: z.number().int().min(100).max(120000).default(30000),
    /** Fallback provider when primary fails */
    fallback_provider: z.enum(AI_PROVIDERS).nullable().default(null),
    /** Enable request/response caching */
    enable_caching: z.boolean().default(true),
    /** Cache TTL in seconds */
    cache_ttl_seconds: z.number().int().min(0).max(86400).default(300),
    /** Rate limit: max calls per minute per tenant */
    rate_limit_per_minute: z.number().int().min(1).max(10000).default(1000),
    /** Temperature override (null = use agent default) */
    temperature_override: z.number().min(0).max(2).nullable().default(null),
});
/**
 * Data retention policy configuration
 */
export const RetentionPolicySchema = z.object({
    /** Days to retain AI call logs */
    ai_call_logs_days: z.number().int().min(1).max(3650).default(365),
    /** Days to retain session events */
    session_events_days: z.number().int().min(1).max(3650).default(365),
    /** Days to retain homework uploads */
    homework_uploads_days: z.number().int().min(1).max(3650).default(730),
    /** Days to retain consent logs (typically longer for compliance) */
    consent_logs_days: z.number().int().min(365).max(3650).default(2555), // ~7 years
    /** Days to retain AI incident records */
    ai_incidents_days: z.number().int().min(1).max(3650).default(365),
    /** Days to retain DSR export artifacts */
    dsr_exports_days: z.number().int().min(7).max(365).default(30),
    /** Whether to use soft-delete (preserve structure) vs hard-delete */
    prefer_soft_delete: z.boolean().default(true),
});
/**
 * Feature access policy configuration
 */
export const FeaturePolicySchema = z.object({
    /** Enable AI homework helper */
    ai_homework_helper_enabled: z.boolean().default(true),
    /** Enable AI lesson planning */
    ai_lesson_planning_enabled: z.boolean().default(true),
    /** Enable AI assessment builder */
    ai_assessment_builder_enabled: z.boolean().default(false),
    /** Enable AI tutor (chat-based learning) */
    ai_tutor_enabled: z.boolean().default(true),
    /** Enable baseline assessments */
    baseline_assessments_enabled: z.boolean().default(true),
    /** Enable progress tracking and reports */
    progress_tracking_enabled: z.boolean().default(true),
    /** Enable parent portal features */
    parent_portal_enabled: z.boolean().default(true),
    /** Enable experimentation (A/B testing) */
    experimentation_enabled: z.boolean().default(true),
    /** Allowed feature areas for experimentation (empty = all allowed) */
    experimentation_allowed_areas: z.array(z.string()).default([]),
    /** Maximum number of active experiments for tenant */
    experimentation_max_active: z.number().int().min(0).max(100).default(10),
});
/**
 * Complete policy document schema
 */
export const PolicyDocumentContentSchema = z.object({
    safety: SafetyPolicySchema.default({}),
    ai: AIPolicySchema.default({}),
    retention: RetentionPolicySchema.default({}),
    features: FeaturePolicySchema.default({}),
});
/**
 * Deep partial version for tenant overrides
 */
export const PolicyOverrideSchema = z.object({
    safety: SafetyPolicySchema.partial().optional(),
    ai: AIPolicySchema.partial().optional(),
    retention: RetentionPolicySchema.partial().optional(),
    features: FeaturePolicySchema.partial().optional(),
});
// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Validate a complete policy document (for GLOBAL scope)
 */
export function validateFullPolicy(data) {
    return PolicyDocumentContentSchema.parse(data);
}
/**
 * Validate a policy override (for TENANT scope)
 */
export function validatePolicyOverride(data) {
    return PolicyOverrideSchema.parse(data);
}
/**
 * Check if a model is allowed by the policy
 */
export function isModelAllowed(policy, modelName) {
    return policy.ai.allowed_models.includes(modelName);
}
/**
 * Check if a provider is allowed by the policy
 */
export function isProviderAllowed(policy, provider) {
    return policy.ai.allowed_providers.includes(provider);
}
/**
 * Check if a safety label should trigger an incident based on policy
 */
export function shouldCreateIncident(policy, label) {
    const severityOrder = ['LOW', 'MEDIUM', 'HIGH'];
    const labelIndex = severityOrder.indexOf(label);
    const thresholdIndex = severityOrder.indexOf(policy.safety.min_severity_for_incident);
    return labelIndex >= thresholdIndex;
}
//# sourceMappingURL=types.js.map