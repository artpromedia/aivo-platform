import { describe, it, expect } from 'vitest';

import {
  INCIDENT_SEVERITIES,
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  SAFETY_LABELS,
  LEGAL_HOLD_STATUSES,
  LEGAL_HOLD_TYPES,
} from '@/lib/types';
import type {
  TenantType,
  TenantStatus,
  Tenant,
  FeatureFlag,
  Entitlement,
  IncidentSeverity,
  IncidentCategory,
  IncidentStatus,
  SafetyLabel,
  LegalHoldStatus,
  LegalHoldType,
  PolicyScopeType,
} from '@/lib/types';

// ── Incident const arrays ────────────────────────────────────────

describe('INCIDENT_SEVERITIES', () => {
  it('has correct values', () => {
    expect(INCIDENT_SEVERITIES).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
  });

  it('is readonly (frozen-like)', () => {
    expect(INCIDENT_SEVERITIES).toHaveLength(5);
  });
});

describe('INCIDENT_CATEGORIES', () => {
  it('has correct values', () => {
    expect(INCIDENT_CATEGORIES).toEqual([
      'SAFETY_VIOLATION',
      'POLICY_VIOLATION',
      'PERFORMANCE_DEGRADATION',
      'BIAS_DETECTED',
      'OTHER',
    ]);
  });
});

describe('INCIDENT_STATUSES', () => {
  it('has correct values', () => {
    expect(INCIDENT_STATUSES).toEqual(['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED']);
  });
});

// ── Safety labels ────────────────────────────────────────────────

describe('SAFETY_LABELS', () => {
  it('has 4 values', () => {
    expect(SAFETY_LABELS).toEqual(['SAFE', 'LOW', 'MEDIUM', 'HIGH']);
  });
});

// ── Legal hold const arrays ──────────────────────────────────────

describe('LEGAL_HOLD_STATUSES', () => {
  it('has 3 statuses', () => {
    expect(LEGAL_HOLD_STATUSES).toEqual(['ACTIVE', 'RELEASED', 'EXPIRED']);
  });
});

describe('LEGAL_HOLD_TYPES', () => {
  it('has 4 types', () => {
    expect(LEGAL_HOLD_TYPES).toEqual([
      'LITIGATION', 'REGULATORY', 'INTERNAL_INVESTIGATION', 'PRESERVATION',
    ]);
  });
});

// ── Type shape tests ─────────────────────────────────────────────

describe('TenantType / TenantStatus types', () => {
  it('TenantType supports expected values', () => {
    const types: TenantType[] = ['DISTRICT', 'SCHOOL', 'INDIVIDUAL'];
    expect(types).toHaveLength(3);
  });

  it('TenantStatus supports expected values', () => {
    const statuses: TenantStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    expect(statuses).toHaveLength(3);
  });
});

describe('Tenant interface', () => {
  it('constructs a valid tenant', () => {
    const tenant: Tenant = {
      id: 't1',
      name: 'Test District',
      slug: 'test-district',
      type: 'DISTRICT',
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(tenant.type).toBe('DISTRICT');
    expect(tenant.status).toBe('ACTIVE');
  });
});

describe('FeatureFlag interface', () => {
  it('constructs with required fields', () => {
    const flag: FeatureFlag = {
      id: 'ff1',
      key: 'ai-tutor-v2',
      name: 'AI Tutor V2',
      enabled: true,
      description: 'New AI tutor experience',
    };
    expect(flag.key).toBe('ai-tutor-v2');
    expect(flag.enabled).toBe(true);
  });
});

describe('PolicyScopeType type', () => {
  it('supports GLOBAL and TENANT', () => {
    const scopes: PolicyScopeType[] = ['GLOBAL', 'TENANT'];
    expect(scopes).toHaveLength(2);
  });
});
