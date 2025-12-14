/**
 * AI Incident Service Tests
 *
 * Tests incident logging, retrieval, and admin review workflow.
 */

import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { IncidentService } from '../src/incidents/index.js';
import type { IncidentInput } from '../src/types/aiRequest.js';

// Type for queries tracked by mock pool
interface TrackedQuery {
  text: string;
  values: unknown[];
}

// Extended mock pool type with query tracking
type MockPoolWithTracking = Pool & { getQueries: () => TrackedQuery[] };

// Mock database pool
function createMockPool(): MockPoolWithTracking {
  const queries: TrackedQuery[] = [];

  const pool = {
    query: vi.fn(async (text: string, values: unknown[] = []) => {
      queries.push({ text, values });

      // Return mock results based on query type
      if (text.includes('INSERT')) {
        const incident = {
          id: 'incident-123',
          tenant_id: values[1] ?? 'tenant-123',
          severity: values[2] ?? 'HIGH',
          category: values[3] ?? 'SELF_HARM',
          status: 'OPEN',
          title: values[4] ?? 'Test Incident',
          description: values[5] ?? 'Test description',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          occurrence_count: 1,
          created_by_system: true,
          metadata_json: values[7] ?? '{}',
          created_at: new Date(),
          updated_at: new Date(),
        };
        return { rows: [incident] };
      }
      if (text.includes('SELECT') && text.includes('COUNT')) {
        return { rows: [{ total: '5' }] };
      }
      if (text.includes('SELECT')) {
        return { rows: [] };
      }
      if (text.includes('UPDATE')) {
        const incident = {
          id: values[0],
          status: values[1],
          resolved_by_user_id: values[2],
          resolution_notes: values[3],
          resolved_at: new Date(),
          updated_at: new Date(),
        };
        return { rows: [incident] };
      }
      return { rows: [] };
    }),
    end: vi.fn(),
    getQueries: () => queries,
  } as unknown as MockPoolWithTracking;

  return pool;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INCIDENT LOGGING TESTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Incident Service: Logging', () => {
  it('logs incident with all required fields', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const incident: IncidentInput = {
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      userId: 'user-789',
      agentType: 'HOMEWORK_HELPER',
      severity: 'HIGH',
      category: 'SELF_HARM',
      inputSummary: 'User expressed self-harm intent',
    };

    const result = await service.logIncident(incident);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    const queries = mockPool.getQueries();
    expect(queries.length).toBeGreaterThan(0);

    const insertQuery = queries.find((q) => q.text.includes('INSERT'));
    expect(insertQuery).toBeDefined();
    expect(insertQuery?.values).toContain('tenant-123');
    expect(insertQuery?.values).toContain('HIGH');
  });

  it('logs homework answer blocked incident', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const incident: IncidentInput = {
      tenantId: 'tenant-123',
      agentType: 'HOMEWORK_HELPER',
      severity: 'LOW',
      category: 'HOMEWORK_ANSWER_BLOCKED',
      inputSummary: 'LLM attempted to provide direct answer',
    };

    const result = await service.logIncident(incident);

    expect(result).toBeDefined();
    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));
    expect(insertQuery?.values).toContain('LOW');
  });

  it('logs PII detection incident', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const incident: IncidentInput = {
      tenantId: 'tenant-123',
      agentType: 'TUTOR',
      severity: 'MEDIUM',
      category: 'PII_DETECTED',
      inputSummary: 'Email address detected in user input',
    };

    const result = await service.logIncident(incident);

    expect(result).toBeDefined();
  });

  it('logs diagnosis attempt incident', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const incident: IncidentInput = {
      tenantId: 'tenant-123',
      agentType: 'FOCUS',
      severity: 'HIGH',
      category: 'DIAGNOSIS_ATTEMPT',
      inputSummary: 'LLM attempted to diagnose ADHD',
    };

    const result = await service.logIncident(incident);

    expect(result).toBeDefined();
  });

  it('stores metadata in JSON field', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const incident: IncidentInput = {
      tenantId: 'tenant-123',
      agentType: 'HOMEWORK_HELPER',
      severity: 'HIGH',
      category: 'SELF_HARM',
      inputSummary: 'Test',
      metadata: { customField: 'customValue' },
    };

    await service.logIncident(incident);

    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));

    // Metadata should be JSON stringified
    const metadataValue = insertQuery?.values.find(
      (v) => typeof v === 'string' && v.includes('customField')
    );
    expect(metadataValue).toBeDefined();
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INCIDENT RETRIEVAL TESTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Incident Service: Retrieval', () => {
  it('lists incidents with pagination', async () => {
    const mockPool = createMockPool();
    (mockPool as unknown as { query: unknown }).query = vi.fn(async (text: string) => {
      if (text.includes('COUNT')) {
        return { rows: [{ total: '10' }] };
      }
      if (text.includes('SELECT')) {
        return {
          rows: [
            {
              id: 'incident-1',
              tenant_id: 'tenant-123',
              severity: 'HIGH',
              category: 'SELF_HARM',
              status: 'OPEN',
              created_at: new Date(),
              metadata_json: '{}',
            },
            {
              id: 'incident-2',
              tenant_id: 'tenant-123',
              severity: 'MEDIUM',
              category: 'PII_DETECTED',
              status: 'OPEN',
              created_at: new Date(),
              metadata_json: '{}',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const service = new IncidentService(mockPool);
    const result = await service.listIncidents({ tenantId: 'tenant-123' }, 1, 10);

    expect(result.incidents).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('filters incidents by severity', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    await service.listIncidents({ tenantId: 'tenant-123', severity: 'HIGH' });

    expect(mockPool.query).toHaveBeenCalled();
    const calls = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls;
    const selectCall = calls.find((c) => c[0].includes('SELECT') && c[0].includes('severity'));
    expect(selectCall).toBeDefined();
    expect(selectCall?.[1]).toContain('HIGH');
  });

  it('filters incidents by category', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    await service.listIncidents({ tenantId: 'tenant-123', category: 'SELF_HARM' });

    expect(mockPool.query).toHaveBeenCalled();
    const calls = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls;
    const selectCall = calls.find((c) => c[0].includes('SELECT') && c[0].includes('category'));
    expect(selectCall).toBeDefined();
  });

  it('filters incidents by status', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    await service.listIncidents({ tenantId: 'tenant-123', status: 'OPEN' });

    expect(mockPool.query).toHaveBeenCalled();
    const calls = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls;
    const selectCall = calls.find((c) => c[0].includes('SELECT') && c[0].includes('status'));
    expect(selectCall).toBeDefined();
    expect(selectCall?.[1]).toContain('OPEN');
  });

  it('retrieves single incident by ID', async () => {
    const mockPool = createMockPool();
    (mockPool as unknown as { query: unknown }).query = vi.fn(async () => ({
      rows: [
        {
          id: 'incident-123',
          tenant_id: 'tenant-123',
          severity: 'HIGH',
          category: 'SELF_HARM',
          status: 'OPEN',
          created_at: new Date(),
          metadata_json: '{}',
        },
      ],
    }));

    const service = new IncidentService(mockPool);
    const incident = await service.getIncident('incident-123');

    expect(incident).toBeDefined();
    expect(incident?.id).toBe('incident-123');
  });

  it('returns null for non-existent incident', async () => {
    const mockPool = createMockPool();
    (mockPool as unknown as { query: unknown }).query = vi.fn(async () => ({ rows: [] }));

    const service = new IncidentService(mockPool);
    const incident = await service.getIncident('non-existent');

    expect(incident).toBeNull();
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INCIDENT REVIEW TESTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Incident Service: Review', () => {
  it('marks incident as investigating', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const result = await service.reviewIncident({
      incidentId: 'incident-123',
      reviewedByUserId: 'admin-456',
      status: 'INVESTIGATING',
      notes: 'Looking into this issue',
    });

    expect(result).toBeDefined();
    const queries = mockPool.getQueries();
    const updateQuery = queries.find((q) => q.text.includes('UPDATE'));
    expect(updateQuery).toBeDefined();
    expect(updateQuery?.values).toContain('incident-123');
    expect(updateQuery?.values).toContain('INVESTIGATING');
    expect(updateQuery?.values).toContain('admin-456');
  });

  it('marks incident as resolved', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const result = await service.reviewIncident({
      incidentId: 'incident-123',
      reviewedByUserId: 'admin-456',
      status: 'RESOLVED',
      notes: 'Issue resolved',
    });

    expect(result).toBeDefined();
    const queries = mockPool.getQueries();
    const updateQuery = queries.find((q) => q.text.includes('UPDATE'));
    expect(updateQuery?.values).toContain('RESOLVED');
  });

  it('marks incident as dismissed', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const result = await service.reviewIncident({
      incidentId: 'incident-123',
      reviewedByUserId: 'admin-456',
      status: 'DISMISSED',
      notes: 'False positive',
    });

    expect(result).toBeDefined();
    const queries = mockPool.getQueries();
    const updateQuery = queries.find((q) => q.text.includes('UPDATE'));
    expect(updateQuery?.values).toContain('DISMISSED');
  });

  it('includes review notes when provided', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    await service.reviewIncident({
      incidentId: 'incident-123',
      reviewedByUserId: 'admin-456',
      status: 'RESOLVED',
      notes: 'Parent notified',
    });

    const queries = mockPool.getQueries();
    const updateQuery = queries.find((q) => q.text.includes('UPDATE'));
    expect(updateQuery?.values).toContain('Parent notified');
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INCIDENT AGGREGATION TESTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Incident Service: Aggregation', () => {
  it('finds similar open incident for aggregation', async () => {
    const mockPool = createMockPool();
    (mockPool as unknown as { query: unknown }).query = vi.fn(async () => ({
      rows: [
        {
          id: 'existing-incident',
          tenant_id: 'tenant-123',
          severity: 'HIGH',
          category: 'SELF_HARM',
          status: 'OPEN',
          created_at: new Date(),
          metadata_json: JSON.stringify({ agentType: 'HOMEWORK_HELPER' }),
        },
      ],
    }));

    const service = new IncidentService(mockPool);
    const incident = await service.findSimilarOpenIncident(
      'tenant-123',
      'SELF_HARM',
      'HOMEWORK_HELPER'
    );

    expect(incident).toBeDefined();
    expect(incident?.id).toBe('existing-incident');
  });

  it('returns null when no similar incident exists', async () => {
    const mockPool = createMockPool();
    (mockPool as unknown as { query: unknown }).query = vi.fn(async () => ({ rows: [] }));

    const service = new IncidentService(mockPool);
    const incident = await service.findSimilarOpenIncident(
      'tenant-123',
      'SELF_HARM',
      'HOMEWORK_HELPER'
    );

    expect(incident).toBeNull();
  });

  it('increments occurrence count for existing incident', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    await service.incrementIncidentOccurrence('incident-123');

    const queries = mockPool.getQueries();
    const updateQuery = queries.find(
      (q) => q.text.includes('UPDATE') && q.text.includes('occurrence_count')
    );
    expect(updateQuery).toBeDefined();
    expect(updateQuery?.values).toContain('incident-123');
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TENANT ISOLATION TESTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Incident Service: Tenant Isolation', () => {
  it('always includes tenant ID in log queries', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    const incident: IncidentInput = {
      tenantId: 'tenant-123',
      agentType: 'HOMEWORK_HELPER',
      severity: 'HIGH',
      category: 'SELF_HARM',
      inputSummary: 'Test',
    };

    await service.logIncident(incident);

    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));
    expect(insertQuery?.values).toContain('tenant-123');
  });

  it('filters list queries by tenant ID', async () => {
    const mockPool = createMockPool();
    const service = new IncidentService(mockPool);

    await service.listIncidents({ tenantId: 'tenant-123' });

    expect(mockPool.query).toHaveBeenCalled();
    const calls = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls;
    const selectCall = calls.find((c) => c[0].includes('SELECT') && c[0].includes('tenant_id'));
    expect(selectCall).toBeDefined();
    expect(selectCall?.[1]).toContain('tenant-123');
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STATISTICS TESTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Incident Service: Statistics', () => {
  it('returns incident statistics', async () => {
    const mockPool = createMockPool();
    (mockPool as unknown as { query: unknown }).query = vi.fn(async (text: string) => {
      if (text.includes('SELECT') && text.includes('COUNT')) {
        return {
          rows: [
            {
              total: '10',
              severity: 'HIGH',
              category: 'SELF_HARM',
              status: 'OPEN',
            },
            {
              total: '5',
              severity: 'MEDIUM',
              category: 'PII_DETECTED',
              status: 'OPEN',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const service = new IncidentService(mockPool);
    const stats = await service.getIncidentStats('tenant-123');

    expect(stats).toBeDefined();
    expect(stats.total).toBeGreaterThanOrEqual(0);
  });
});
