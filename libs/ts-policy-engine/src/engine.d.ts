/**
 * Policy Engine
 *
 * Core service for resolving effective policies by merging global defaults
 * with tenant-specific overrides.
 */
import type { Pool } from 'pg';
import { PolicyRepository } from './repository.js';
import { type EffectivePolicy, type PolicyDocument, type PolicyDocumentContent, type PolicyOverride, type RetentionPolicy } from './types.js';
export interface PolicyEngineConfig {
    /** Cache TTL in milliseconds (default: 30 seconds) */
    cacheTtlMs?: number;
    /** Enable caching (default: true) */
    enableCache?: boolean;
}
export declare class PolicyEngine {
    private repository;
    private cache;
    private config;
    constructor(pool: Pool, config?: PolicyEngineConfig);
    /**
     * Get the effective policy for a tenant.
     *
     * Resolution order:
     * 1. Load active GLOBAL policy (required)
     * 2. Load active TENANT policy (optional)
     * 3. Deep merge: tenant overrides global
     *
     * @param tenantId - The tenant ID to resolve policy for (null for global only)
     * @returns Fully resolved effective policy
     */
    getEffectivePolicy(tenantId?: string | null): Promise<EffectivePolicy>;
    /**
     * Invalidate cache for a specific tenant or all entries
     */
    invalidateCache(tenantId?: string): void;
    /**
     * Get the underlying repository for direct access
     */
    getRepository(): PolicyRepository;
    /**
     * Check if a model is allowed for a tenant
     */
    isModelAllowed(tenantId: string | null, modelName: string): Promise<boolean>;
    /**
     * Check if a provider is allowed for a tenant
     */
    isProviderAllowed(tenantId: string | null, provider: string): Promise<boolean>;
    /**
     * Get retention days for a specific resource type
     */
    getRetentionDays(tenantId: string | null, resourceType: keyof RetentionPolicy): Promise<number>;
    /**
     * Check if a feature is enabled for a tenant.
     * Only works with boolean feature flags.
     */
    isFeatureEnabled(tenantId: string | null, feature: 'ai_homework_helper_enabled' | 'ai_lesson_planning_enabled' | 'ai_assessment_builder_enabled' | 'ai_tutor_enabled' | 'baseline_assessments_enabled' | 'progress_tracking_enabled' | 'parent_portal_enabled' | 'experimentation_enabled'): Promise<boolean>;
    /**
     * Get the active global policy document
     */
    getGlobalPolicy(): Promise<PolicyDocument | null>;
    /**
     * Get the active tenant policy document
     */
    getTenantPolicy(tenantId: string): Promise<PolicyDocument | null>;
    /**
     * Create or update a tenant policy override
     * This is a convenience method that creates a new version and activates it
     */
    setTenantPolicyOverride(tenantId: string, override: PolicyOverride, options?: {
        name?: string | undefined;
        description?: string | undefined;
        userId?: string | undefined;
    }): Promise<PolicyDocument>;
    /**
     * Remove tenant policy override (reverts to global policy)
     */
    removeTenantPolicyOverride(tenantId: string, userId?: string): Promise<void>;
}
/**
 * Get the default global policy content
 * Used for initialization and testing
 */
export declare function getDefaultGlobalPolicy(): PolicyDocumentContent;
/**
 * Create an empty policy override
 * Used as starting point for tenant customization
 */
export declare function createEmptyOverride(): PolicyOverride;
//# sourceMappingURL=engine.d.ts.map