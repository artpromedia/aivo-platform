/**
 * Policy Engine
 *
 * Core service for resolving effective policies by merging global defaults
 * with tenant-specific overrides.
 */

import type { Pool } from 'pg';

import { PolicyRepository } from './repository.js';
import {
  AIPolicySchema,
  FeaturePolicySchema,
  PolicyDocumentContentSchema,
  RetentionPolicySchema,
  SafetyPolicySchema,
  type AIPolicy,
  type EffectivePolicy,
  type FeaturePolicy,
  type PolicyDocument,
  type PolicyDocumentContent,
  type PolicyOverride,
  type RetentionPolicy,
  type SafetyPolicy,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// CACHE TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  policy: EffectivePolicy;
  expiresAt: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// DEEP MERGE UTILITY
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Remove undefined values from an object to satisfy exactOptionalPropertyTypes
 */
function removeUndefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Deep merge two objects, with source values overriding target values.
 * Arrays are replaced entirely, not merged.
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else {
      // Replace value (including arrays)
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

// ════════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE CLASS
// ════════════════════════════════════════════════════════════════════════════════

export interface PolicyEngineConfig {
  /** Cache TTL in milliseconds (default: 30 seconds) */
  cacheTtlMs?: number;
  /** Enable caching (default: true) */
  enableCache?: boolean;
}

export class PolicyEngine {
  private repository: PolicyRepository;
  private cache = new Map<string, CacheEntry>();
  private config: Required<PolicyEngineConfig>;

  constructor(pool: Pool, config: PolicyEngineConfig = {}) {
    this.repository = new PolicyRepository(pool);
    this.config = {
      cacheTtlMs: config.cacheTtlMs ?? 30_000,
      enableCache: config.enableCache ?? true,
    };
  }

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
  async getEffectivePolicy(tenantId: string | null = null): Promise<EffectivePolicy> {
    const cacheKey = tenantId ?? '__global__';

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.policy;
      }
    }

    // Load global policy (required)
    const globalDoc = await this.repository.getActiveGlobalPolicy();
    if (!globalDoc) {
      throw new Error('No active global policy found. System misconfiguration.');
    }

    // Parse and validate global policy
    const globalPolicy = PolicyDocumentContentSchema.parse(globalDoc.policy_json);

    // Build sources list
    const sources: EffectivePolicy['sources'] = [
      {
        scopeType: 'GLOBAL',
        documentId: globalDoc.id,
        documentName: globalDoc.name,
        version: globalDoc.version,
      },
    ];

    // Start with global policy
    let safety: SafetyPolicy = SafetyPolicySchema.parse(globalPolicy.safety);
    let ai: AIPolicy = AIPolicySchema.parse(globalPolicy.ai);
    let retention: RetentionPolicy = RetentionPolicySchema.parse(globalPolicy.retention);
    let features: FeaturePolicy = FeaturePolicySchema.parse(globalPolicy.features);

    // Load and merge tenant policy if exists
    if (tenantId) {
      const tenantDoc = await this.repository.getActiveTenantPolicy(tenantId);
      if (tenantDoc) {
        const tenantOverride = tenantDoc.policy_json as PolicyOverride;

        if (tenantOverride.safety) {
          safety = deepMerge(safety, removeUndefined(tenantOverride.safety)) as SafetyPolicy;
        }
        if (tenantOverride.ai) {
          ai = deepMerge(ai, removeUndefined(tenantOverride.ai)) as AIPolicy;
        }
        if (tenantOverride.retention) {
          retention = deepMerge(
            retention,
            removeUndefined(tenantOverride.retention)
          ) as RetentionPolicy;
        }
        if (tenantOverride.features) {
          features = deepMerge(features, removeUndefined(tenantOverride.features)) as FeaturePolicy;
        }

        sources.push({
          scopeType: 'TENANT',
          documentId: tenantDoc.id,
          documentName: tenantDoc.name,
          version: tenantDoc.version,
        });
      }
    }

    const effectivePolicy: EffectivePolicy = {
      sources,
      safety: safety as Required<SafetyPolicy>,
      ai: ai as Required<AIPolicy>,
      retention: retention as Required<RetentionPolicy>,
      features: features as Required<FeaturePolicy>,
      computedAt: new Date(),
    };

    // Update cache
    if (this.config.enableCache) {
      this.cache.set(cacheKey, {
        policy: effectivePolicy,
        expiresAt: Date.now() + this.config.cacheTtlMs,
      });
    }

    return effectivePolicy;
  }

  /**
   * Invalidate cache for a specific tenant or all entries
   */
  invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
      // Also invalidate global since it might have changed
      this.cache.delete('__global__');
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get the underlying repository for direct access
   */
  getRepository(): PolicyRepository {
    return this.repository;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CONVENIENCE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a model is allowed for a tenant
   */
  async isModelAllowed(tenantId: string | null, modelName: string): Promise<boolean> {
    const policy = await this.getEffectivePolicy(tenantId);
    return policy.ai.allowed_models.includes(modelName);
  }

  /**
   * Check if a provider is allowed for a tenant
   */
  async isProviderAllowed(tenantId: string | null, provider: string): Promise<boolean> {
    const policy = await this.getEffectivePolicy(tenantId);
    return policy.ai.allowed_providers.includes(provider as AIPolicy['allowed_providers'][number]);
  }

  /**
   * Get retention days for a specific resource type
   */
  async getRetentionDays(
    tenantId: string | null,
    resourceType: keyof RetentionPolicy
  ): Promise<number> {
    const policy = await this.getEffectivePolicy(tenantId);

    // Handle the 'prefer_soft_delete' case which is boolean
    if (resourceType === 'prefer_soft_delete') {
      throw new Error('Use getEffectivePolicy().retention.prefer_soft_delete instead');
    }

    return policy.retention[resourceType];
  }

  /**
   * Check if a feature is enabled for a tenant.
   * Only works with boolean feature flags.
   */
  async isFeatureEnabled(
    tenantId: string | null,
    feature:
      | 'ai_homework_helper_enabled'
      | 'ai_lesson_planning_enabled'
      | 'ai_assessment_builder_enabled'
      | 'ai_tutor_enabled'
      | 'baseline_assessments_enabled'
      | 'progress_tracking_enabled'
      | 'parent_portal_enabled'
      | 'experimentation_enabled'
  ): Promise<boolean> {
    const policy = await this.getEffectivePolicy(tenantId);
    return policy.features[feature];
  }

  /**
   * Get the active global policy document
   */
  async getGlobalPolicy(): Promise<PolicyDocument | null> {
    return this.repository.getActiveGlobalPolicy();
  }

  /**
   * Get the active tenant policy document
   */
  async getTenantPolicy(tenantId: string): Promise<PolicyDocument | null> {
    return this.repository.getActiveTenantPolicy(tenantId);
  }

  /**
   * Create or update a tenant policy override
   * This is a convenience method that creates a new version and activates it
   */
  async setTenantPolicyOverride(
    tenantId: string,
    override: PolicyOverride,
    options: {
      name?: string | undefined;
      description?: string | undefined;
      userId?: string | undefined;
    } = {}
  ): Promise<PolicyDocument> {
    const doc = await this.repository.createAndActivate(
      {
        scopeType: 'TENANT',
        tenantId,
        name: options.name ?? `tenant_override_${tenantId}_v${Date.now()}`,
        policyJson: override,
        description: options.description ?? null,
        createdByUserId: options.userId ?? null,
      },
      options.userId ?? null
    );

    // Invalidate cache for this tenant
    this.invalidateCache(tenantId);

    return doc;
  }

  /**
   * Remove tenant policy override (reverts to global policy)
   */
  async removeTenantPolicyOverride(tenantId: string, userId?: string): Promise<void> {
    const tenantDoc = await this.repository.getActiveTenantPolicy(tenantId);
    if (tenantDoc) {
      await this.repository.deactivate(tenantDoc.id, userId);
      this.invalidateCache(tenantId);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT POLICIES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get the default global policy content
 * Used for initialization and testing
 */
export function getDefaultGlobalPolicy(): PolicyDocumentContent {
  return PolicyDocumentContentSchema.parse({});
}

/**
 * Create an empty policy override
 * Used as starting point for tenant customization
 */
export function createEmptyOverride(): PolicyOverride {
  return {};
}
