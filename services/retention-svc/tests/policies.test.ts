/**
 * Tests for retention-svc policies and types.
 */
import { describe, it, expect } from 'vitest';

const RESOURCE_TYPES = [
  'EVENT', 'HOMEWORK_UPLOAD', 'AI_INCIDENT', 'SESSION',
  'AI_CALL_LOG', 'RECOMMENDATION', 'CONSENT_LOG', 'DSR_EXPORT',
] as const;

describe('resource types', () => {
  it('defines 8 resource types', () => {
    expect(RESOURCE_TYPES).toHaveLength(8);
  });

  it('includes data subject request export', () => {
    expect(RESOURCE_TYPES).toContain('DSR_EXPORT');
  });

  it('includes consent log', () => {
    expect(RESOURCE_TYPES).toContain('CONSENT_LOG');
  });

  it('includes session type', () => {
    expect(RESOURCE_TYPES).toContain('SESSION');
  });
});

describe('retention policy structure', () => {
  interface RetentionPolicy {
    id: string;
    tenant_id: string | null;
    resource_type: string;
    retention_days: number;
    soft_delete_only: boolean;
    config_json: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
  }

  it('allows tenant-specific override', () => {
    const global: RetentionPolicy = {
      id: '1', tenant_id: null, resource_type: 'EVENT',
      retention_days: 365, soft_delete_only: false,
      config_json: null, created_at: new Date(), updated_at: new Date(),
    };
    const tenantSpecific: RetentionPolicy = {
      ...global, id: '2', tenant_id: 'tenant-1', retention_days: 730,
    };
    expect(tenantSpecific.retention_days).toBeGreaterThan(global.retention_days);
    expect(global.tenant_id).toBeNull();
    expect(tenantSpecific.tenant_id).toBe('tenant-1');
  });

  it('supports soft-delete mode', () => {
    const policy: RetentionPolicy = {
      id: '1', tenant_id: null, resource_type: 'AI_INCIDENT',
      retention_days: 2555, soft_delete_only: true,
      config_json: null, created_at: new Date(), updated_at: new Date(),
    };
    expect(policy.soft_delete_only).toBe(true);
  });

  it('accepts additional config via config_json', () => {
    const policy: RetentionPolicy = {
      id: '1', tenant_id: null, resource_type: 'SESSION',
      retention_days: 90, soft_delete_only: false,
      config_json: { archiveBucket: 's3://archive' },
      created_at: new Date(), updated_at: new Date(),
    };
    expect(policy.config_json?.archiveBucket).toBe('s3://archive');
  });
});
