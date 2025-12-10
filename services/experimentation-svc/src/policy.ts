/**
 * Policy Integration
 *
 * Integrates with the Policy Engine to check tenant opt-out for experimentation.
 */

import { PolicyEngine } from '@aivo/ts-policy-engine';
import type { Pool } from 'pg';

import { config } from './config.js';

// ════════════════════════════════════════════════════════════════════════════════
// POLICY CHECKER
// ════════════════════════════════════════════════════════════════════════════════

let policyEngine: PolicyEngine | null = null;

/**
 * Initialize the policy engine with a database pool.
 */
export function initPolicyEngine(pool: Pool): void {
  policyEngine = new PolicyEngine(pool, {
    cacheTtlMs: config.policyCacheTtlMs,
    enableCache: true,
  });
}

/**
 * Get the policy engine instance.
 */
export function getPolicyEngine(): PolicyEngine {
  if (!policyEngine) {
    throw new Error('Policy engine not initialized. Call initPolicyEngine first.');
  }
  return policyEngine;
}

/**
 * Check if experimentation is enabled for a tenant.
 *
 * Looks for `features.experimentation_enabled` in the effective policy.
 * If not found, defaults to true (experimentation is opt-out, not opt-in).
 */
export async function isExperimentationEnabled(tenantId: string): Promise<boolean> {
  try {
    const engine = getPolicyEngine();
    const policy = await engine.getEffectivePolicy(tenantId);

    // Check if experimentation_enabled is defined in features
    // Note: This field may not exist in the current policy schema,
    // so we need to handle undefined gracefully
    const features = policy.features as Record<string, unknown>;

    // If explicitly set to false, honor the opt-out
    if (features.experimentation_enabled === false) {
      return false;
    }

    // Default: experimentation is enabled
    return true;
  } catch (error) {
    // If policy lookup fails, default to allowing experimentation
    // This prevents policy service issues from blocking all experiments
    console.warn(`[policy] Failed to check experimentation policy for tenant ${tenantId}:`, error);
    return true;
  }
}

/**
 * Get experimentation-related policies for a tenant.
 * Returns additional constraints that may affect experimentation.
 */
export async function getExperimentationPolicy(tenantId: string): Promise<{
  enabled: boolean;
  allowedFeatureAreas?: string[];
  maxActiveExperiments?: number;
}> {
  try {
    const engine = getPolicyEngine();
    const policy = await engine.getEffectivePolicy(tenantId);

    const features = policy.features as Record<string, unknown>;

    const result: {
      enabled: boolean;
      allowedFeatureAreas?: string[];
      maxActiveExperiments?: number;
    } = {
      enabled: features.experimentation_enabled !== false,
    };

    if (features.experimentation_allowed_areas) {
      result.allowedFeatureAreas = features.experimentation_allowed_areas as string[];
    }
    if (features.experimentation_max_active !== undefined) {
      result.maxActiveExperiments = features.experimentation_max_active as number;
    }

    return result;
  } catch (error) {
    console.warn(`[policy] Failed to get experimentation policy for tenant ${tenantId}:`, error);
    return { enabled: true };
  }
}

/**
 * Check if a specific feature area is allowed for experimentation.
 */
export async function isFeatureAreaAllowed(
  tenantId: string,
  featureArea: string
): Promise<boolean> {
  const policy = await getExperimentationPolicy(tenantId);

  if (!policy.enabled) {
    return false;
  }

  // If no allowed areas specified, all areas are allowed
  if (!policy.allowedFeatureAreas || policy.allowedFeatureAreas.length === 0) {
    return true;
  }

  return policy.allowedFeatureAreas.includes(featureArea);
}
