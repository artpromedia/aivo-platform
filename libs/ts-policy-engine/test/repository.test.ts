import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';

import { PolicyRepository } from '../src/repository.js';
import type {
  PolicyDocument,
  PolicyDocumentContent,
  PolicyOverride,
  PolicyScopeType,
} from '../src/types.js';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ══════════════════════════════════════════════════════════════════════════════

function createMockClient() {
  return {
    query: vi.fn(),
    release: vi.fn(),
  };
}

function createMockPool() {
  const mockClient = createMockClient();
  return {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(mockClient),
    _mockClient: mockClient, // Expose for test access
  } as unknown as Pool & { _mockClient: ReturnType<typeof createMockClient> };
}

const NOW = new Date('2024-01-15T00:00:00Z');

const MOCK_GLOBAL_POLICY_JSON: PolicyDocumentContent = {
  safety: {
    min_severity_for_incident: 'MEDIUM',
    blocked_content_action: 'FALLBACK',
    log_all_evaluations: false,
    coppa_strict_mode: true,
    additional_blocked_keywords: [],
  },
  ai: {
    allowed_providers: ['OPENAI', 'ANTHROPIC'],
    allowed_models: ['gpt-4o', 'claude-3-5-sonnet-20241022'],
    max_tokens_per_call: 4096,
    max_latency_ms: 30000,
    fallback_provider: null,
    enable_caching: true,
    cache_ttl_seconds: 300,
    rate_limit_per_minute: 1000,
    temperature_override: null,
  },
  retention: {
    ai_call_logs_days: 365,
    session_events_days: 365,
    homework_uploads_days: 730,
    consent_logs_days: 2555,
    ai_incidents_days: 365,
    dsr_exports_days: 30,
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

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('PolicyRepository', () => {
  let mockPool: Pool & { _mockClient: ReturnType<typeof createMockClient> };
  let repository: PolicyRepository;

  beforeEach(() => {
    mockPool = createMockPool();
    repository = new PolicyRepository(mockPool);
    vi.clearAllMocks();
  });

  describe('getActiveGlobalPolicy', () => {
    it('should return active global policy', async () => {
      const mockRow = {
        id: 'global-1',
        scope_type: 'GLOBAL',
        tenant_id: null,
        version: 2,
        name: 'global_default',
        is_active: true,
        policy_json: MOCK_GLOBAL_POLICY_JSON,
        description: null,
        created_by_user_id: null,
        created_at: NOW,
        updated_at: NOW,
      };

      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [mockRow] });

      const result = await repository.getActiveGlobalPolicy();

      expect(result).not.toBeNull();
      expect(result?.scope_type).toBe('GLOBAL');
      expect(result?.is_active).toBe(true);
    });

    it('should return null when no active global policy exists', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await repository.getActiveGlobalPolicy();

      expect(result).toBeNull();
    });
  });

  describe('getActiveTenantPolicy', () => {
    it('should return active tenant policy for given tenant', async () => {
      const mockRow = {
        id: 'tenant-1',
        scope_type: 'TENANT',
        tenant_id: 'tenant-abc',
        version: 1,
        name: 'tenant_override',
        is_active: true,
        policy_json: { retention: { ai_call_logs_days: 30 } } as PolicyOverride,
        description: 'Custom retention',
        created_by_user_id: null,
        created_at: NOW,
        updated_at: NOW,
      };

      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [mockRow] });

      const result = await repository.getActiveTenantPolicy('tenant-abc');

      expect(result).not.toBeNull();
      expect(result?.tenant_id).toBe('tenant-abc');
      expect(result?.is_active).toBe(true);
    });

    it('should return null when no active policy for tenant', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await repository.getActiveTenantPolicy('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return policy by ID', async () => {
      const mockRow = {
        id: 'policy-123',
        scope_type: 'TENANT',
        tenant_id: 'tenant-abc',
        version: 1,
        name: 'test_policy',
        is_active: false,
        policy_json: { safety: { additional_blocked_keywords: ['test'] } },
        description: 'A test policy',
        created_by_user_id: null,
        created_at: NOW,
        updated_at: NOW,
      };

      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [mockRow] });

      const result = await repository.getById('policy-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('policy-123');
    });

    it('should return null when policy not found', async () => {
      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await repository.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history for a scope', async () => {
      const mockRows = [
        {
          id: 'policy-v3',
          scope_type: 'GLOBAL',
          tenant_id: null,
          version: 3,
          name: 'global_v3',
          is_active: true,
          policy_json: MOCK_GLOBAL_POLICY_JSON,
          description: null,
          created_by_user_id: null,
          created_at: NOW,
          updated_at: NOW,
        },
        {
          id: 'policy-v2',
          scope_type: 'GLOBAL',
          tenant_id: null,
          version: 2,
          name: 'global_v2',
          is_active: false,
          policy_json: MOCK_GLOBAL_POLICY_JSON,
          description: null,
          created_by_user_id: null,
          created_at: NOW,
          updated_at: NOW,
        },
      ];

      (mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: mockRows });

      const result = await repository.getVersionHistory('GLOBAL', null, 10);

      expect(result).toHaveLength(2);
      expect(result[0]?.version).toBe(3);
      expect(result[1]?.version).toBe(2);
    });
  });

  describe('listActiveTenantPolicies', () => {
    it('should return paginated list of active tenant policies', async () => {
      const mockRows = [
        {
          id: 'tenant-policy-1',
          scope_type: 'TENANT',
          tenant_id: 'tenant-1',
          version: 1,
          name: 'tenant_1',
          is_active: true,
          policy_json: {},
          description: null,
          created_by_user_id: null,
          created_at: NOW,
          updated_at: NOW,
        },
        {
          id: 'tenant-policy-2',
          scope_type: 'TENANT',
          tenant_id: 'tenant-2',
          version: 1,
          name: 'tenant_2',
          is_active: true,
          policy_json: {},
          description: null,
          created_by_user_id: null,
          created_at: NOW,
          updated_at: NOW,
        },
      ];

      (mockPool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockRows });

      const result = await repository.listActiveTenantPolicies({ limit: 10, offset: 0 });

      expect(result.policies).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('create', () => {
    it('should create a new policy', async () => {
      const mockRow = {
        id: 'new-policy',
        scope_type: 'TENANT',
        tenant_id: 'tenant-abc',
        version: 1,
        name: 'new_policy',
        is_active: false,
        policy_json: { safety: { min_severity_for_incident: 'HIGH' } },
        description: 'New policy',
        created_by_user_id: 'user-123',
        created_at: NOW,
        updated_at: NOW,
      };

      // Mock client query calls for transactions
      const mockClient = mockPool._mockClient;
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_version: 0 }] }) // Get next version
        .mockResolvedValueOnce({ rows: [mockRow] }) // INSERT RETURNING
        .mockResolvedValueOnce({ rows: [] }) // Audit log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repository.create({
        scopeType: 'TENANT',
        tenantId: 'tenant-abc',
        name: 'new_policy',
        policyJson: { safety: { min_severity_for_incident: 'HIGH' } },
        description: 'New policy',
        createdByUserId: 'user-123',
      });

      expect(result.id).toBe('new-policy');
      expect(result.scope_type).toBe('TENANT');
      expect(result.is_active).toBe(false);
    });
  });

  describe('update', () => {
    it('should update policy fields', async () => {
      const existingRow = {
        id: 'policy-1',
        scope_type: 'TENANT',
        tenant_id: 'tenant-abc',
        version: 1,
        name: 'old_name',
        is_active: true,
        policy_json: {},
        description: null,
        created_by_user_id: null,
        created_at: NOW,
        updated_at: NOW,
      };

      const updatedRow = {
        ...existingRow,
        name: 'updated_name',
        policy_json: { safety: { additional_blocked_keywords: ['updated'] } },
        description: 'Updated description',
        updated_at: new Date(),
      };

      const mockClient = mockPool._mockClient;
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [existingRow] }) // SELECT to get original
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE RETURNING
        .mockResolvedValueOnce({ rows: [] }) // Audit log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repository.update('policy-1', {
        name: 'updated_name',
        policyJson: { safety: { additional_blocked_keywords: ['updated'] } },
        description: 'Updated description',
      });

      expect(result?.name).toBe('updated_name');
    });

    it('should return null if policy not found', async () => {
      const mockClient = mockPool._mockClient;
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT - not found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(repository.update('nonexistent', { name: 'test' })).rejects.toThrow();
    });
  });

  describe('activate', () => {
    it('should activate policy and deactivate others of same scope', async () => {
      const mockRow = {
        id: 'policy-1',
        scope_type: 'GLOBAL',
        tenant_id: null,
        version: 1,
        name: 'global',
        is_active: true,
        policy_json: MOCK_GLOBAL_POLICY_JSON,
        description: null,
        created_by_user_id: null,
        created_at: NOW,
        updated_at: new Date(),
      };

      const mockClient = mockPool._mockClient;
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRow] }) // SELECT to get doc
        .mockResolvedValueOnce({ rows: [] }) // UPDATE deactivate others
        .mockResolvedValueOnce({ rows: [mockRow] }) // UPDATE activate
        .mockResolvedValueOnce({ rows: [] }) // Audit log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repository.activate('policy-1');

      expect(result?.is_active).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a policy', async () => {
      const mockRow = {
        id: 'policy-1',
        scope_type: 'TENANT',
        tenant_id: 'tenant-abc',
        version: 1,
        name: 'tenant_policy',
        is_active: false,
        policy_json: {},
        description: null,
        created_by_user_id: null,
        created_at: NOW,
        updated_at: new Date(),
      };

      const mockClient = mockPool._mockClient;
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRow] }) // UPDATE RETURNING
        .mockResolvedValueOnce({ rows: [] }) // Audit log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repository.deactivate('policy-1');

      expect(result?.is_active).toBe(false);
    });

    it('should return null if policy not found', async () => {
      const mockClient = mockPool._mockClient;
      (mockClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE - not found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(repository.deactivate('nonexistent')).rejects.toThrow();
    });
  });
});
