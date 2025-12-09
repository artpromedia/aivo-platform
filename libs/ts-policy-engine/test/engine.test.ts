import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';

import { PolicyEngine } from '../src/engine.js';
import type { PolicyDocument, PolicyDocumentContent, PolicyOverride } from '../src/types.js';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ══════════════════════════════════════════════════════════════════════════════

function createMockPool() {
  return {
    query: vi.fn(),
  } as unknown as Pool;
}

const NOW = new Date('2024-01-15T00:00:00Z');

const MOCK_GLOBAL_POLICY_JSON: PolicyDocumentContent = {
  safety: {
    min_severity_for_incident: 'LOW',
    blocked_content_action: 'FALLBACK',
    log_all_evaluations: true,
    coppa_strict_mode: true,
    additional_blocked_keywords: ['adult'],
  },
  ai: {
    allowed_providers: ['OPENAI'],
    allowed_models: ['gpt-4o'],
    max_tokens_per_call: 8192,
    max_latency_ms: 60000,
    fallback_provider: null,
    enable_caching: true,
    cache_ttl_seconds: 300,
    rate_limit_per_minute: 200,
    temperature_override: null,
  },
  retention: {
    ai_call_logs_days: 180,
    session_events_days: 730,
    homework_uploads_days: 1095,
    consent_logs_days: 2555,
    ai_incidents_days: 730,
    dsr_exports_days: 180,
    prefer_soft_delete: true,
  },
  features: {
    ai_homework_helper_enabled: true,
    ai_lesson_planning_enabled: true,
    ai_assessment_builder_enabled: false,
    ai_tutor_enabled: true,
    baseline_assessments_enabled: true,
    progress_tracking_enabled: true,
    parent_portal_enabled: true,
  },
};

const MOCK_GLOBAL_POLICY: PolicyDocument = {
  id: 'global-1',
  scope_type: 'GLOBAL',
  tenant_id: null,
  version: 1,
  name: 'global_default',
  is_active: true,
  policy_json: MOCK_GLOBAL_POLICY_JSON,
  description: null,
  created_by_user_id: null,
  created_at: NOW,
  updated_at: NOW,
};

const MOCK_TENANT_OVERRIDE: PolicyOverride = {
  safety: {
    min_severity_for_incident: 'MEDIUM', // More restrictive
    additional_blocked_keywords: ['tenant-specific'],
  },
  ai: {
    max_tokens_per_call: 2048, // Lower limit
  },
  retention: {
    ai_call_logs_days: 30, // Shorter retention
  },
};

const MOCK_TENANT_POLICY: PolicyDocument = {
  id: 'tenant-1',
  scope_type: 'TENANT',
  tenant_id: 'tenant-abc',
  version: 1,
  name: 'tenant_abc_override',
  is_active: true,
  policy_json: MOCK_TENANT_OVERRIDE,
  description: null,
  created_by_user_id: null,
  created_at: NOW,
  updated_at: NOW,
};

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('PolicyEngine', () => {
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = createMockPool();
    vi.clearAllMocks();
  });

  describe('getEffectivePolicy', () => {
    it('should throw error when no global policy exists', async () => {
      // Mock: no global policy
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const engine = new PolicyEngine(mockPool, { enableCache: false });

      await expect(engine.getEffectivePolicy(null)).rejects.toThrow(
        'No active global policy found'
      );
    });

    it('should return global policy when no tenant override exists', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] }) // Global query
        .mockResolvedValueOnce({ rows: [] }); // Tenant query

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const policy = await engine.getEffectivePolicy('tenant-xyz');

      // Should use global values
      expect(policy.safety.min_severity_for_incident).toBe('LOW');
      expect(policy.ai.max_tokens_per_call).toBe(8192);
      expect(policy.retention.ai_call_logs_days).toBe(180);
    });

    it('should deep merge tenant overrides with global policy', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] }) // Global query
        .mockResolvedValueOnce({ rows: [MOCK_TENANT_POLICY] }); // Tenant query

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const policy = await engine.getEffectivePolicy('tenant-abc');

      // Tenant overrides
      expect(policy.safety.min_severity_for_incident).toBe('MEDIUM'); // Tenant override
      expect(policy.ai.max_tokens_per_call).toBe(2048); // Tenant override
      expect(policy.retention.ai_call_logs_days).toBe(30); // Tenant override

      // Global fallbacks (not overridden)
      expect(policy.safety.blocked_content_action).toBe('FALLBACK'); // From global
      expect(policy.ai.allowed_providers).toEqual(['OPENAI']); // From global
      expect(policy.retention.session_events_days).toBe(730); // From global
    });

    it('should use null tenant ID to get global-only policy', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [MOCK_GLOBAL_POLICY],
      }); // Global query

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const policy = await engine.getEffectivePolicy(null);

      expect(policy.safety.min_severity_for_incident).toBe('LOW');
      expect(policy.ai.max_tokens_per_call).toBe(8192);
    });

    it('should cache policies when caching is enabled', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] })
        .mockResolvedValueOnce({ rows: [] });

      const engine = new PolicyEngine(mockPool, { enableCache: true, cacheTtlMs: 60000 });

      // First call
      await engine.getEffectivePolicy('tenant-xyz');
      // Second call (should use cache)
      await engine.getEffectivePolicy('tenant-xyz');

      // Query should only have been called once for global + once for tenant
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache for specific tenant', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [MOCK_GLOBAL_POLICY],
      });

      const engine = new PolicyEngine(mockPool, { enableCache: true, cacheTtlMs: 60000 });

      await engine.getEffectivePolicy('tenant-xyz');
      engine.invalidateCache('tenant-xyz');
      await engine.getEffectivePolicy('tenant-xyz');

      // Global + tenant (x2 because cache was invalidated)
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });

    it('should include sources in effective policy', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] })
        .mockResolvedValueOnce({ rows: [MOCK_TENANT_POLICY] });

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const policy = await engine.getEffectivePolicy('tenant-abc');

      expect(policy.sources).toHaveLength(2);
      expect(policy.sources[0]?.scopeType).toBe('GLOBAL');
      expect(policy.sources[1]?.scopeType).toBe('TENANT');
    });
  });

  describe('convenience methods', () => {
    it('isModelAllowed should return true for allowed model', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] }) // getActiveGlobalPolicy
        .mockResolvedValueOnce({ rows: [] }); // getActiveTenantPolicy for null tenant

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const allowed = await engine.isModelAllowed(null, 'gpt-4o');

      expect(allowed).toBe(true);
    });

    it('isModelAllowed should return false for disallowed model', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] }) // getActiveGlobalPolicy
        .mockResolvedValueOnce({ rows: [] }); // getActiveTenantPolicy for null tenant

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const notAllowed = await engine.isModelAllowed(null, 'unknown-model');

      expect(notAllowed).toBe(false);
    });

    it('isProviderAllowed should return true for allowed provider', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] }) // getActiveGlobalPolicy
        .mockResolvedValueOnce({ rows: [] }); // getActiveTenantPolicy for null tenant

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const allowed = await engine.isProviderAllowed(null, 'OPENAI');

      expect(allowed).toBe(true);
    });

    it('isProviderAllowed should return false for disallowed provider', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] }) // getActiveGlobalPolicy
        .mockResolvedValueOnce({ rows: [] }); // getActiveTenantPolicy for null tenant

      const engine = new PolicyEngine(mockPool, { enableCache: false });
      const notAllowed = await engine.isProviderAllowed(null, 'AZURE');

      expect(notAllowed).toBe(false);
    });

    it('getRetentionDays should return correct value', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [MOCK_GLOBAL_POLICY],
      });

      const engine = new PolicyEngine(mockPool, { enableCache: false });

      const days = await engine.getRetentionDays(null, 'ai_call_logs_days');

      expect(days).toBe(180);
    });
  });
});

describe('Deep Merge Behavior', () => {
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = createMockPool();
    vi.clearAllMocks();
  });

  it('should replace arrays entirely (not concatenate)', async () => {
    const tenantWithModels: PolicyDocument = {
      ...MOCK_TENANT_POLICY,
      policy_json: {
        ai: {
          allowed_models: ['gpt-4o-mini'], // Only allow this one model
        },
      },
    };

    (mockPool.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] })
      .mockResolvedValueOnce({ rows: [tenantWithModels] });

    const engine = new PolicyEngine(mockPool, { enableCache: false });
    const policy = await engine.getEffectivePolicy('tenant-abc');

    // Array should be replaced, not merged
    expect(policy.ai.allowed_models).toEqual(['gpt-4o-mini']);
  });

  it('should preserve nested object structure during merge', async () => {
    const tenantWithPartialSafety: PolicyDocument = {
      ...MOCK_TENANT_POLICY,
      policy_json: {
        safety: {
          min_severity_for_incident: 'HIGH', // Only override this one field
        },
      },
    };

    (mockPool.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [MOCK_GLOBAL_POLICY] })
      .mockResolvedValueOnce({ rows: [tenantWithPartialSafety] });

    const engine = new PolicyEngine(mockPool, { enableCache: false });
    const policy = await engine.getEffectivePolicy('tenant-abc');

    // Overridden field
    expect(policy.safety.min_severity_for_incident).toBe('HIGH');
    // Global fallbacks for sibling fields
    expect(policy.safety.blocked_content_action).toBe('FALLBACK');
    expect(policy.safety.coppa_strict_mode).toBe(true);
  });
});
