/**
 * Policy Enforcement for AI Orchestrator
 *
 * Provides middleware and utilities to enforce policy constraints
 * on AI calls before they are executed.
 */

import { PolicyEngine, type EffectivePolicy, type AIPolicy } from '@aivo/ts-policy-engine';
import type { Pool } from 'pg';

import type { SafetyLabel } from '../logging/index.js';
import type { ProviderType } from '../types/agentConfig.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface PolicyEnforcementResult {
  allowed: boolean;
  violations: PolicyViolation[];
  policy: EffectivePolicy;
}

export interface PolicyViolation {
  type: 'MODEL_NOT_ALLOWED' | 'PROVIDER_NOT_ALLOWED' | 'TOKENS_EXCEEDED' | 'FEATURE_DISABLED';
  message: string;
  details?: Record<string, unknown>;
}

export interface PolicyEnforcementContext {
  tenantId: string;
  modelName: string;
  provider: ProviderType;
  estimatedTokens?: number;
  feature?: keyof EffectivePolicy['features'];
}

// ════════════════════════════════════════════════════════════════════════════════
// POLICY ENFORCER CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class PolicyEnforcer {
  private engine: PolicyEngine;

  constructor(pool: Pool) {
    this.engine = new PolicyEngine(pool, {
      cacheTtlMs: 30_000,
      enableCache: true,
    });
  }

  /**
   * Get the underlying policy engine
   */
  getEngine(): PolicyEngine {
    return this.engine;
  }

  /**
   * Check if an AI call is allowed by policy
   */
  async checkCallAllowed(context: PolicyEnforcementContext): Promise<PolicyEnforcementResult> {
    const policy = await this.engine.getEffectivePolicy(context.tenantId);
    const violations: PolicyViolation[] = [];

    // Check provider
    if (!policy.ai.allowed_providers.includes(context.provider)) {
      violations.push({
        type: 'PROVIDER_NOT_ALLOWED',
        message: `Provider '${context.provider}' is not allowed by policy`,
        details: {
          requested: context.provider,
          allowed: policy.ai.allowed_providers,
        },
      });
    }

    // Check model
    if (!policy.ai.allowed_models.includes(context.modelName)) {
      violations.push({
        type: 'MODEL_NOT_ALLOWED',
        message: `Model '${context.modelName}' is not allowed by policy`,
        details: {
          requested: context.modelName,
          allowed: policy.ai.allowed_models,
        },
      });
    }

    // Check tokens if provided
    if (
      context.estimatedTokens !== undefined &&
      context.estimatedTokens > policy.ai.max_tokens_per_call
    ) {
      violations.push({
        type: 'TOKENS_EXCEEDED',
        message: `Estimated tokens (${context.estimatedTokens}) exceeds maximum (${policy.ai.max_tokens_per_call})`,
        details: {
          requested: context.estimatedTokens,
          maximum: policy.ai.max_tokens_per_call,
        },
      });
    }

    // Check feature if specified
    if (context.feature && !policy.features[context.feature]) {
      violations.push({
        type: 'FEATURE_DISABLED',
        message: `Feature '${context.feature}' is disabled by policy`,
        details: { feature: context.feature },
      });
    }

    return {
      allowed: violations.length === 0,
      violations,
      policy,
    };
  }

  /**
   * Enforce policy - throws if not allowed
   */
  async enforcePolicy(context: PolicyEnforcementContext): Promise<EffectivePolicy> {
    const result = await this.checkCallAllowed(context);
    if (!result.allowed) {
      const violationSummary = result.violations.map((v) => v.message).join('; ');
      throw new PolicyViolationError(`Policy violation: ${violationSummary}`, result.violations);
    }
    return result.policy;
  }

  /**
   * Check if a safety label should trigger an incident based on policy
   */
  async shouldCreateIncident(tenantId: string, label: SafetyLabel): Promise<boolean> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    const severityOrder = ['LOW', 'MEDIUM', 'HIGH'] as const;
    const labelIndex = severityOrder.indexOf(label as (typeof severityOrder)[number]);
    const thresholdIndex = severityOrder.indexOf(policy.safety.min_severity_for_incident);

    // SAFE is not in the order and should never trigger
    if (label === 'SAFE') return false;

    return labelIndex >= thresholdIndex;
  }

  /**
   * Get policy-aware fallback action for blocked content
   */
  async getBlockedContentAction(tenantId: string): Promise<'FALLBACK' | 'REJECT'> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    return policy.safety.blocked_content_action;
  }

  /**
   * Get max latency budget from policy
   */
  async getMaxLatencyMs(tenantId: string): Promise<number> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    return policy.ai.max_latency_ms;
  }

  /**
   * Get rate limit from policy
   */
  async getRateLimit(tenantId: string): Promise<number> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    return policy.ai.rate_limit_per_minute;
  }

  /**
   * Map agent type to feature key
   */
  getFeatureKeyForAgentType(agentType: string): keyof EffectivePolicy['features'] | null {
    const mapping: Record<string, keyof EffectivePolicy['features']> = {
      HOMEWORK_HELPER: 'ai_homework_helper_enabled',
      LESSON_PLANNER: 'ai_lesson_planning_enabled',
      TUTOR: 'ai_tutor_enabled',
      BASELINE: 'baseline_assessments_enabled',
    };
    return mapping[agentType] ?? null;
  }

  /**
   * Invalidate policy cache for a tenant
   */
  invalidateCache(tenantId?: string): void {
    this.engine.invalidateCache(tenantId);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class PolicyViolationError extends Error {
  constructor(
    message: string,
    public violations: PolicyViolation[]
  ) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let enforcerInstance: PolicyEnforcer | null = null;

export function createPolicyEnforcer(pool: Pool): PolicyEnforcer {
  if (!enforcerInstance) {
    enforcerInstance = new PolicyEnforcer(pool);
  }
  return enforcerInstance;
}

export function getPolicyEnforcer(): PolicyEnforcer | null {
  return enforcerInstance;
}
