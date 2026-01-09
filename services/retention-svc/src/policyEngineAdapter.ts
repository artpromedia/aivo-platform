/**
 * Policy-Engine Integration for Retention Service
 *
 * Provides utilities to fetch retention windows from the centralized
 * policy engine instead of the legacy retention_policies table.
 */

import { PolicyEngine } from '@aivo/ts-policy-engine';

import { logger } from './logger.js';
import type { Pool } from 'pg';

import type { ResourceType, RetentionPolicy } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Mapping from ResourceType to policy engine retention keys
 */
const RESOURCE_TO_POLICY_KEY: Record<ResourceType, string | null> = {
  EVENT: 'session_events_days',
  HOMEWORK_UPLOAD: 'homework_uploads_days',
  AI_INCIDENT: 'ai_incidents_days',
  SESSION: 'session_events_days',
  AI_CALL_LOG: 'ai_call_logs_days',
  RECOMMENDATION: null, // Uses session_events_days as fallback
  CONSENT_LOG: 'consent_logs_days',
  DSR_EXPORT: 'dsr_exports_days',
};

// ════════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE ADAPTER
// ════════════════════════════════════════════════════════════════════════════════

export class RetentionPolicyAdapter {
  private engine: PolicyEngine;

  constructor(pool: Pool) {
    this.engine = new PolicyEngine(pool, {
      cacheTtlMs: 60_000, // Cache for 1 minute (retention jobs run infrequently)
      enableCache: true,
    });
  }

  /**
   * Get retention days for a specific resource type and tenant
   * Falls back to global policy if no tenant-specific override exists
   */
  async getRetentionDays(resourceType: ResourceType, tenantId: string | null): Promise<number> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    const policyKey = RESOURCE_TO_POLICY_KEY[resourceType];

    if (!policyKey) {
      // Default fallback for unmapped resources
      return policy.retention.session_events_days;
    }

    // Type-safe access to retention policy
    const retention = policy.retention;
    switch (policyKey) {
      case 'ai_call_logs_days':
        return retention.ai_call_logs_days;
      case 'session_events_days':
        return retention.session_events_days;
      case 'homework_uploads_days':
        return retention.homework_uploads_days;
      case 'consent_logs_days':
        return retention.consent_logs_days;
      case 'ai_incidents_days':
        return retention.ai_incidents_days;
      case 'dsr_exports_days':
        return retention.dsr_exports_days;
      default:
        return retention.session_events_days;
    }
  }

  /**
   * Check if soft delete is preferred for a tenant
   */
  async preferSoftDelete(tenantId: string | null): Promise<boolean> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    return policy.retention.prefer_soft_delete;
  }

  /**
   * Get a RetentionPolicy-like object for backward compatibility
   * This bridges the gap between the legacy retention_policies table
   * and the new policy engine
   */
  async getRetentionPolicy(
    resourceType: ResourceType,
    tenantId: string | null
  ): Promise<RetentionPolicy> {
    const policy = await this.engine.getEffectivePolicy(tenantId);
    const retentionDays = await this.getRetentionDays(resourceType, tenantId);
    const preferSoftDelete = policy.retention.prefer_soft_delete;

    return {
      id: `policy-engine-${tenantId ?? 'global'}-${resourceType}`,
      tenant_id: tenantId,
      resource_type: resourceType,
      retention_days: retentionDays,
      soft_delete_only: preferSoftDelete,
      config_json: null,
      created_at: policy.computedAt,
      updated_at: policy.computedAt,
    };
  }

  /**
   * Get the underlying policy engine for advanced use cases
   */
  getEngine(): PolicyEngine {
    return this.engine;
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidateCache(tenantId?: string): void {
    this.engine.invalidateCache(tenantId);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let adapterInstance: RetentionPolicyAdapter | null = null;

export function createRetentionPolicyAdapter(pool: Pool): RetentionPolicyAdapter {
  if (!adapterInstance) {
    adapterInstance = new RetentionPolicyAdapter(pool);
  }
  return adapterInstance;
}

export function getRetentionPolicyAdapter(): RetentionPolicyAdapter | null {
  return adapterInstance;
}

// ════════════════════════════════════════════════════════════════════════════════
// MIGRATION HELPER
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Helper to migrate from legacy retention_policies table to policy engine.
 * Reads existing tenant-specific policies and creates corresponding
 * policy document overrides.
 */
export async function migrateRetentionPoliciesToEngine(pool: Pool): Promise<void> {
  const engine = new PolicyEngine(pool);
  const repo = engine.getRepository();

  // Get all unique tenant IDs with custom retention policies
  const { rows: tenantRows } = await pool.query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM retention_policies WHERE tenant_id IS NOT NULL`
  );

  for (const { tenant_id: tenantId } of tenantRows) {
    // Check if tenant already has a policy document
    const existing = await repo.getActiveTenantPolicy(tenantId);
    if (existing) {
      logger.info({ tenantId }, 'Tenant already has policy document, skipping');
      continue;
    }

    // Get all retention policies for this tenant
    const { rows: policies } = await pool.query<{
      resource_type: ResourceType;
      retention_days: number;
      soft_delete_only: boolean;
    }>(
      `SELECT resource_type, retention_days, soft_delete_only
       FROM retention_policies
       WHERE tenant_id = $1`,
      [tenantId]
    );

    if (policies.length === 0) continue;

    // Build retention override from legacy policies
    const retentionOverride: Record<string, number | boolean> = {};
    let hasSoftDelete = false;

    for (const p of policies) {
      const policyKey = RESOURCE_TO_POLICY_KEY[p.resource_type];
      if (policyKey && typeof p.retention_days === 'number') {
        retentionOverride[policyKey] = p.retention_days;
      }
      if (p.soft_delete_only) {
        hasSoftDelete = true;
      }
    }

    if (hasSoftDelete) {
      retentionOverride.prefer_soft_delete = true;
    }

    // Create policy document with retention override
    if (Object.keys(retentionOverride).length > 0) {
      await repo.createAndActivate({
        scopeType: 'TENANT',
        tenantId,
        name: `migrated_retention_policy_${tenantId}`,
        policyJson: {
          retention: retentionOverride,
        },
        description: 'Migrated from legacy retention_policies table',
      });
      logger.info({ tenantId }, 'Migrated retention policies for tenant');
    }
  }

  logger.info('Retention policy migration complete');
}
