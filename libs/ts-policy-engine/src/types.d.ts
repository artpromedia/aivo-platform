/**
 * Policy Engine Types
 *
 * Defines the structure for global and tenant-specific policies.
 * Policies control safety thresholds, AI provider/model access, and retention windows.
 */
import { z } from 'zod';
export declare const POLICY_SCOPE_TYPES: readonly ["GLOBAL", "TENANT"];
export type PolicyScopeType = (typeof POLICY_SCOPE_TYPES)[number];
export declare const SAFETY_SEVERITY_LEVELS: readonly ["LOW", "MEDIUM", "HIGH"];
export type SafetySeverityLevel = (typeof SAFETY_SEVERITY_LEVELS)[number];
export declare const BLOCKED_CONTENT_ACTIONS: readonly ["FALLBACK", "REJECT"];
export type BlockedContentAction = (typeof BLOCKED_CONTENT_ACTIONS)[number];
export declare const AI_PROVIDERS: readonly ["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"];
export type AIProvider = (typeof AI_PROVIDERS)[number];
/**
 * Safety policy configuration
 */
export declare const SafetyPolicySchema: z.ZodObject<{
    /** Minimum severity level to trigger incident creation */
    min_severity_for_incident: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>>;
    /** Action to take when content is blocked */
    blocked_content_action: z.ZodDefault<z.ZodEnum<["FALLBACK", "REJECT"]>>;
    /** Whether to log all safety evaluations (including OK) */
    log_all_evaluations: z.ZodDefault<z.ZodBoolean>;
    /** Enable additional safety checks for COPPA compliance */
    coppa_strict_mode: z.ZodDefault<z.ZodBoolean>;
    /** Custom keywords to block (tenant-specific) */
    additional_blocked_keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
    blocked_content_action?: "FALLBACK" | "REJECT";
    log_all_evaluations?: boolean;
    coppa_strict_mode?: boolean;
    additional_blocked_keywords?: string[];
}, {
    min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
    blocked_content_action?: "FALLBACK" | "REJECT";
    log_all_evaluations?: boolean;
    coppa_strict_mode?: boolean;
    additional_blocked_keywords?: string[];
}>;
export type SafetyPolicy = z.infer<typeof SafetyPolicySchema>;
/**
 * AI provider and model configuration
 */
export declare const AIPolicySchema: z.ZodObject<{
    /** List of allowed AI providers */
    allowed_providers: z.ZodDefault<z.ZodArray<z.ZodEnum<["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"]>, "many">>;
    /** List of allowed model identifiers */
    allowed_models: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Maximum tokens per single AI call */
    max_tokens_per_call: z.ZodDefault<z.ZodNumber>;
    /** Maximum acceptable latency in milliseconds */
    max_latency_ms: z.ZodDefault<z.ZodNumber>;
    /** Fallback provider when primary fails */
    fallback_provider: z.ZodDefault<z.ZodNullable<z.ZodEnum<["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"]>>>;
    /** Enable request/response caching */
    enable_caching: z.ZodDefault<z.ZodBoolean>;
    /** Cache TTL in seconds */
    cache_ttl_seconds: z.ZodDefault<z.ZodNumber>;
    /** Rate limit: max calls per minute per tenant */
    rate_limit_per_minute: z.ZodDefault<z.ZodNumber>;
    /** Temperature override (null = use agent default) */
    temperature_override: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
    allowed_models?: string[];
    max_tokens_per_call?: number;
    max_latency_ms?: number;
    fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
    enable_caching?: boolean;
    cache_ttl_seconds?: number;
    rate_limit_per_minute?: number;
    temperature_override?: number;
}, {
    allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
    allowed_models?: string[];
    max_tokens_per_call?: number;
    max_latency_ms?: number;
    fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
    enable_caching?: boolean;
    cache_ttl_seconds?: number;
    rate_limit_per_minute?: number;
    temperature_override?: number;
}>;
export type AIPolicy = z.infer<typeof AIPolicySchema>;
/**
 * Data retention policy configuration
 */
export declare const RetentionPolicySchema: z.ZodObject<{
    /** Days to retain AI call logs */
    ai_call_logs_days: z.ZodDefault<z.ZodNumber>;
    /** Days to retain session events */
    session_events_days: z.ZodDefault<z.ZodNumber>;
    /** Days to retain homework uploads */
    homework_uploads_days: z.ZodDefault<z.ZodNumber>;
    /** Days to retain consent logs (typically longer for compliance) */
    consent_logs_days: z.ZodDefault<z.ZodNumber>;
    /** Days to retain AI incident records */
    ai_incidents_days: z.ZodDefault<z.ZodNumber>;
    /** Days to retain DSR export artifacts */
    dsr_exports_days: z.ZodDefault<z.ZodNumber>;
    /** Whether to use soft-delete (preserve structure) vs hard-delete */
    prefer_soft_delete: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ai_call_logs_days?: number;
    session_events_days?: number;
    homework_uploads_days?: number;
    consent_logs_days?: number;
    ai_incidents_days?: number;
    dsr_exports_days?: number;
    prefer_soft_delete?: boolean;
}, {
    ai_call_logs_days?: number;
    session_events_days?: number;
    homework_uploads_days?: number;
    consent_logs_days?: number;
    ai_incidents_days?: number;
    dsr_exports_days?: number;
    prefer_soft_delete?: boolean;
}>;
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;
/**
 * Feature access policy configuration
 */
export declare const FeaturePolicySchema: z.ZodObject<{
    /** Enable AI homework helper */
    ai_homework_helper_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable AI lesson planning */
    ai_lesson_planning_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable AI assessment builder */
    ai_assessment_builder_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable AI tutor (chat-based learning) */
    ai_tutor_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable baseline assessments */
    baseline_assessments_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable progress tracking and reports */
    progress_tracking_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable parent portal features */
    parent_portal_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Enable experimentation (A/B testing) */
    experimentation_enabled: z.ZodDefault<z.ZodBoolean>;
    /** Allowed feature areas for experimentation (empty = all allowed) */
    experimentation_allowed_areas: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Maximum number of active experiments for tenant */
    experimentation_max_active: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ai_homework_helper_enabled?: boolean;
    ai_lesson_planning_enabled?: boolean;
    ai_assessment_builder_enabled?: boolean;
    ai_tutor_enabled?: boolean;
    baseline_assessments_enabled?: boolean;
    progress_tracking_enabled?: boolean;
    parent_portal_enabled?: boolean;
    experimentation_enabled?: boolean;
    experimentation_allowed_areas?: string[];
    experimentation_max_active?: number;
}, {
    ai_homework_helper_enabled?: boolean;
    ai_lesson_planning_enabled?: boolean;
    ai_assessment_builder_enabled?: boolean;
    ai_tutor_enabled?: boolean;
    baseline_assessments_enabled?: boolean;
    progress_tracking_enabled?: boolean;
    parent_portal_enabled?: boolean;
    experimentation_enabled?: boolean;
    experimentation_allowed_areas?: string[];
    experimentation_max_active?: number;
}>;
export type FeaturePolicy = z.infer<typeof FeaturePolicySchema>;
/**
 * Complete policy document schema
 */
export declare const PolicyDocumentContentSchema: z.ZodObject<{
    safety: z.ZodDefault<z.ZodObject<{
        /** Minimum severity level to trigger incident creation */
        min_severity_for_incident: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>>;
        /** Action to take when content is blocked */
        blocked_content_action: z.ZodDefault<z.ZodEnum<["FALLBACK", "REJECT"]>>;
        /** Whether to log all safety evaluations (including OK) */
        log_all_evaluations: z.ZodDefault<z.ZodBoolean>;
        /** Enable additional safety checks for COPPA compliance */
        coppa_strict_mode: z.ZodDefault<z.ZodBoolean>;
        /** Custom keywords to block (tenant-specific) */
        additional_blocked_keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    }, {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    }>>;
    ai: z.ZodDefault<z.ZodObject<{
        /** List of allowed AI providers */
        allowed_providers: z.ZodDefault<z.ZodArray<z.ZodEnum<["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"]>, "many">>;
        /** List of allowed model identifiers */
        allowed_models: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Maximum tokens per single AI call */
        max_tokens_per_call: z.ZodDefault<z.ZodNumber>;
        /** Maximum acceptable latency in milliseconds */
        max_latency_ms: z.ZodDefault<z.ZodNumber>;
        /** Fallback provider when primary fails */
        fallback_provider: z.ZodDefault<z.ZodNullable<z.ZodEnum<["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"]>>>;
        /** Enable request/response caching */
        enable_caching: z.ZodDefault<z.ZodBoolean>;
        /** Cache TTL in seconds */
        cache_ttl_seconds: z.ZodDefault<z.ZodNumber>;
        /** Rate limit: max calls per minute per tenant */
        rate_limit_per_minute: z.ZodDefault<z.ZodNumber>;
        /** Temperature override (null = use agent default) */
        temperature_override: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    }, {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    }>>;
    retention: z.ZodDefault<z.ZodObject<{
        /** Days to retain AI call logs */
        ai_call_logs_days: z.ZodDefault<z.ZodNumber>;
        /** Days to retain session events */
        session_events_days: z.ZodDefault<z.ZodNumber>;
        /** Days to retain homework uploads */
        homework_uploads_days: z.ZodDefault<z.ZodNumber>;
        /** Days to retain consent logs (typically longer for compliance) */
        consent_logs_days: z.ZodDefault<z.ZodNumber>;
        /** Days to retain AI incident records */
        ai_incidents_days: z.ZodDefault<z.ZodNumber>;
        /** Days to retain DSR export artifacts */
        dsr_exports_days: z.ZodDefault<z.ZodNumber>;
        /** Whether to use soft-delete (preserve structure) vs hard-delete */
        prefer_soft_delete: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    }, {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    }>>;
    features: z.ZodDefault<z.ZodObject<{
        /** Enable AI homework helper */
        ai_homework_helper_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable AI lesson planning */
        ai_lesson_planning_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable AI assessment builder */
        ai_assessment_builder_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable AI tutor (chat-based learning) */
        ai_tutor_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable baseline assessments */
        baseline_assessments_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable progress tracking and reports */
        progress_tracking_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable parent portal features */
        parent_portal_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Enable experimentation (A/B testing) */
        experimentation_enabled: z.ZodDefault<z.ZodBoolean>;
        /** Allowed feature areas for experimentation (empty = all allowed) */
        experimentation_allowed_areas: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Maximum number of active experiments for tenant */
        experimentation_max_active: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    }, {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    safety?: {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    };
    ai?: {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    };
    retention?: {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    };
    features?: {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    };
}, {
    safety?: {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    };
    ai?: {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    };
    retention?: {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    };
    features?: {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    };
}>;
export type PolicyDocumentContent = z.infer<typeof PolicyDocumentContentSchema>;
/**
 * Deep partial version for tenant overrides
 */
export declare const PolicyOverrideSchema: z.ZodObject<{
    safety: z.ZodOptional<z.ZodObject<{
        min_severity_for_incident: z.ZodOptional<z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>>>;
        blocked_content_action: z.ZodOptional<z.ZodDefault<z.ZodEnum<["FALLBACK", "REJECT"]>>>;
        log_all_evaluations: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        coppa_strict_mode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        additional_blocked_keywords: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    }, {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    }>>;
    ai: z.ZodOptional<z.ZodObject<{
        allowed_providers: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEnum<["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"]>, "many">>>;
        allowed_models: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        max_tokens_per_call: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        max_latency_ms: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        fallback_provider: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodEnum<["OPENAI", "ANTHROPIC", "GEMINI", "MOCK"]>>>>;
        enable_caching: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        cache_ttl_seconds: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        rate_limit_per_minute: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        temperature_override: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
    }, "strip", z.ZodTypeAny, {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    }, {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    }>>;
    retention: z.ZodOptional<z.ZodObject<{
        ai_call_logs_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        session_events_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        homework_uploads_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        consent_logs_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        ai_incidents_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        dsr_exports_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        prefer_soft_delete: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    }, {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    }>>;
    features: z.ZodOptional<z.ZodObject<{
        ai_homework_helper_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        ai_lesson_planning_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        ai_assessment_builder_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        ai_tutor_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        baseline_assessments_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        progress_tracking_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        parent_portal_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        experimentation_enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        experimentation_allowed_areas: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        experimentation_max_active: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    }, {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    safety?: {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    };
    ai?: {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    };
    retention?: {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    };
    features?: {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    };
}, {
    safety?: {
        min_severity_for_incident?: "LOW" | "MEDIUM" | "HIGH";
        blocked_content_action?: "FALLBACK" | "REJECT";
        log_all_evaluations?: boolean;
        coppa_strict_mode?: boolean;
        additional_blocked_keywords?: string[];
    };
    ai?: {
        allowed_providers?: ("OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK")[];
        allowed_models?: string[];
        max_tokens_per_call?: number;
        max_latency_ms?: number;
        fallback_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI" | "MOCK";
        enable_caching?: boolean;
        cache_ttl_seconds?: number;
        rate_limit_per_minute?: number;
        temperature_override?: number;
    };
    retention?: {
        ai_call_logs_days?: number;
        session_events_days?: number;
        homework_uploads_days?: number;
        consent_logs_days?: number;
        ai_incidents_days?: number;
        dsr_exports_days?: number;
        prefer_soft_delete?: boolean;
    };
    features?: {
        ai_homework_helper_enabled?: boolean;
        ai_lesson_planning_enabled?: boolean;
        ai_assessment_builder_enabled?: boolean;
        ai_tutor_enabled?: boolean;
        baseline_assessments_enabled?: boolean;
        progress_tracking_enabled?: boolean;
        parent_portal_enabled?: boolean;
        experimentation_enabled?: boolean;
        experimentation_allowed_areas?: string[];
        experimentation_max_active?: number;
    };
}>;
export type PolicyOverride = z.infer<typeof PolicyOverrideSchema>;
/**
 * Policy document as stored in the database
 */
export interface PolicyDocument {
    id: string;
    scope_type: PolicyScopeType;
    tenant_id: string | null;
    version: number;
    name: string;
    is_active: boolean;
    policy_json: PolicyDocumentContent | PolicyOverride;
    description: string | null;
    created_by_user_id: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Input for creating a new policy document
 */
export interface CreatePolicyDocumentInput {
    scopeType: PolicyScopeType;
    tenantId?: string | null | undefined;
    name: string;
    policyJson: PolicyDocumentContent | PolicyOverride;
    description?: string | null | undefined;
    createdByUserId?: string | null | undefined;
}
/**
 * Input for updating a policy document
 */
export interface UpdatePolicyDocumentInput {
    name?: string | undefined;
    policyJson?: PolicyDocumentContent | PolicyOverride | undefined;
    description?: string | null | undefined;
}
/**
 * Fully resolved policy (all required fields present)
 * This is what consumers receive after merging global + tenant policies
 */
export interface EffectivePolicy {
    /** Source of this policy (GLOBAL only, or GLOBAL + tenant merge) */
    sources: {
        scopeType: PolicyScopeType;
        documentId: string;
        documentName: string;
        version: number;
    }[];
    /** Safety configuration */
    safety: Required<SafetyPolicy>;
    /** AI provider/model configuration */
    ai: Required<AIPolicy>;
    /** Data retention configuration */
    retention: Required<RetentionPolicy>;
    /** Feature access configuration */
    features: Required<FeaturePolicy>;
    /** When this effective policy was computed */
    computedAt: Date;
}
/**
 * Validate a complete policy document (for GLOBAL scope)
 */
export declare function validateFullPolicy(data: unknown): PolicyDocumentContent;
/**
 * Validate a policy override (for TENANT scope)
 */
export declare function validatePolicyOverride(data: unknown): PolicyOverride;
/**
 * Check if a model is allowed by the policy
 */
export declare function isModelAllowed(policy: EffectivePolicy, modelName: string): boolean;
/**
 * Check if a provider is allowed by the policy
 */
export declare function isProviderAllowed(policy: EffectivePolicy, provider: AIProvider): boolean;
/**
 * Check if a safety label should trigger an incident based on policy
 */
export declare function shouldCreateIncident(policy: EffectivePolicy, label: SafetySeverityLevel): boolean;
//# sourceMappingURL=types.d.ts.map