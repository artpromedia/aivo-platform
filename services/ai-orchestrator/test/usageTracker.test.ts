/**
 * Usage Tracker Tests
 *
 * Tests per-tenant token/cost tracking and aggregation.
 */

import { describe, expect, it, vi } from 'vitest';

import { UsageTracker, type UsageRecord } from '../src/usage/index.js';

// Mock database pool
function createMockPool() {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  return {
    query: vi.fn(async (text: string, values: unknown[] = []) => {
      queries.push({ text, values });

      // Return mock results based on query type
      if (text.includes('INSERT')) {
        return { rows: [{ id: 'usage-123' }] };
      }
      if (text.includes('SELECT')) {
        // Return empty rows by default
        return { rows: [] };
      }
      return { rows: [] };
    }),
    getQueries: () => queries,
    end: vi.fn(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// RECORD USAGE TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Usage Tracker: Recording', () => {
  it('records usage with all required fields', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    const record: UsageRecord = {
      tenantId: 'tenant-123',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 100,
      tokensOutput: 200,
      estimatedCostCents: 5,
      callCount: 1,
    };

    await tracker.recordUsage(record);

    const queries = mockPool.getQueries();
    expect(queries.length).toBeGreaterThan(0);

    const insertQuery = queries.find((q) => q.text.includes('INSERT'));
    expect(insertQuery).toBeDefined();
    expect(insertQuery?.values).toContain('tenant-123');
    expect(insertQuery?.values).toContain('OPENAI');
    expect(insertQuery?.values).toContain(100);
    expect(insertQuery?.values).toContain(200);
  });

  it('includes estimated cost in the record', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    const record: UsageRecord = {
      tenantId: 'tenant-123',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 1000,
      tokensOutput: 500,
      estimatedCostCents: 15,
      callCount: 1,
    };

    await tracker.recordUsage(record);

    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));

    // Cost should be included in values
    expect(insertQuery?.values).toContain(15);
  });

  it('uses upsert to aggregate usage records', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    const record: UsageRecord = {
      tenantId: 'tenant-123',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 100,
      tokensOutput: 50,
      estimatedCostCents: 5,
      callCount: 1,
    };

    await tracker.recordUsage(record);

    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));

    // Should use ON CONFLICT for upsert
    expect(insertQuery?.text).toContain('ON CONFLICT');
    expect(insertQuery?.text).toContain('DO UPDATE SET');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DAILY USAGE TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Usage Tracker: Daily Usage', () => {
  it('retrieves daily usage by tenant and date', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async (text: string) => {
      if (text.includes('SELECT')) {
        return {
          rows: [
            {
              tenant_id: 'tenant-123',
              date: '2025-01-15',
              provider: 'OPENAI',
              model: 'gpt-4o-mini',
              agent_type: 'HOMEWORK_HELPER',
              tokens_input: 10000,
              tokens_output: 5000,
              estimated_cost_cents: 150,
              call_count: 100,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const tracker = new UsageTracker(mockPool as never);
    const dailyUsage = await tracker.getDailyUsage('tenant-123', '2025-01-15');

    expect(dailyUsage).toHaveLength(1);
    expect(dailyUsage[0]).toMatchObject({
      tenantId: 'tenant-123',
      provider: 'OPENAI',
      tokensInput: 10000,
      tokensOutput: 5000,
    });
  });

  it('returns empty array for days with no usage', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async () => ({ rows: [] }));

    const tracker = new UsageTracker(mockPool as never);
    const dailyUsage = await tracker.getDailyUsage('tenant-123', '2025-01-01');

    expect(dailyUsage).toHaveLength(0);
  });

  it('returns multiple records for different providers', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async (text: string) => {
      if (text.includes('SELECT')) {
        return {
          rows: [
            {
              tenant_id: 'tenant-123',
              date: '2025-01-15',
              provider: 'OPENAI',
              model: 'gpt-4o-mini',
              agent_type: 'HOMEWORK_HELPER',
              tokens_input: 5000,
              tokens_output: 2500,
              estimated_cost_cents: 75,
              call_count: 50,
            },
            {
              tenant_id: 'tenant-123',
              date: '2025-01-15',
              provider: 'ANTHROPIC',
              model: 'claude-3-haiku',
              agent_type: 'TUTOR',
              tokens_input: 3000,
              tokens_output: 1500,
              estimated_cost_cents: 45,
              call_count: 30,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const tracker = new UsageTracker(mockPool as never);
    const dailyUsage = await tracker.getDailyUsage('tenant-123', '2025-01-15');

    expect(dailyUsage).toHaveLength(2);
    expect(dailyUsage.map((u) => u.provider)).toContain('OPENAI');
    expect(dailyUsage.map((u) => u.provider)).toContain('ANTHROPIC');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// USAGE SUMMARY TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Usage Tracker: Usage Summary', () => {
  it('returns summary for tenant with date filters', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async (text: string) => {
      if (text.includes('SELECT') && text.includes('GROUP BY')) {
        return {
          rows: [
            {
              date: '2025-01-15',
              provider: 'OPENAI',
              agent_type: 'HOMEWORK_HELPER',
              tokens_input: '50000',
              tokens_output: '25000',
              cost_cents: '750',
              calls: '500',
            },
            {
              date: '2025-01-15',
              provider: 'ANTHROPIC',
              agent_type: 'TUTOR',
              tokens_input: '30000',
              tokens_output: '15000',
              cost_cents: '450',
              calls: '300',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const tracker = new UsageTracker(mockPool as never);

    const summary = await tracker.getUsageSummary({
      tenantId: 'tenant-123',
      from: '2025-01-01',
      to: '2025-01-31',
    });

    expect(summary.tenantId).toBe('tenant-123');
    expect(summary.totalTokensInput).toBe(80000);
    expect(summary.totalTokensOutput).toBe(40000);
    expect(summary.totalCostCents).toBe(1200);
    expect(summary.totalCalls).toBe(800);
  });

  it('breaks down usage by provider', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async () => ({
      rows: [
        {
          date: '2025-01-15',
          provider: 'OPENAI',
          agent_type: 'HOMEWORK_HELPER',
          tokens_input: '10000',
          tokens_output: '5000',
          cost_cents: '100',
          calls: '50',
        },
        {
          date: '2025-01-15',
          provider: 'ANTHROPIC',
          agent_type: 'HOMEWORK_HELPER',
          tokens_input: '8000',
          tokens_output: '4000',
          cost_cents: '80',
          calls: '40',
        },
      ],
    }));

    const tracker = new UsageTracker(mockPool as never);

    const summary = await tracker.getUsageSummary({
      tenantId: 'tenant-123',
    });

    expect(summary.byProvider).toHaveProperty('OPENAI');
    expect(summary.byProvider).toHaveProperty('ANTHROPIC');
    expect(summary.byProvider['OPENAI'].tokens).toBe(15000);
    expect(summary.byProvider['ANTHROPIC'].tokens).toBe(12000);
  });

  it('breaks down usage by agent type', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async () => ({
      rows: [
        {
          date: '2025-01-15',
          provider: 'OPENAI',
          agent_type: 'HOMEWORK_HELPER',
          tokens_input: '10000',
          tokens_output: '5000',
          cost_cents: '100',
          calls: '50',
        },
        {
          date: '2025-01-15',
          provider: 'OPENAI',
          agent_type: 'TUTOR',
          tokens_input: '6000',
          tokens_output: '3000',
          cost_cents: '60',
          calls: '30',
        },
      ],
    }));

    const tracker = new UsageTracker(mockPool as never);

    const summary = await tracker.getUsageSummary({
      tenantId: 'tenant-123',
    });

    expect(summary.byAgent).toHaveProperty('HOMEWORK_HELPER');
    expect(summary.byAgent).toHaveProperty('TUTOR');
    expect(summary.byAgent['HOMEWORK_HELPER'].calls).toBe(50);
    expect(summary.byAgent['TUTOR'].calls).toBe(30);
  });

  it('breaks down usage by date', async () => {
    const mockPool = createMockPool();
    mockPool.query = vi.fn(async () => ({
      rows: [
        {
          date: '2025-01-15',
          provider: 'OPENAI',
          agent_type: 'HOMEWORK_HELPER',
          tokens_input: '10000',
          tokens_output: '5000',
          cost_cents: '100',
          calls: '50',
        },
        {
          date: '2025-01-16',
          provider: 'OPENAI',
          agent_type: 'HOMEWORK_HELPER',
          tokens_input: '12000',
          tokens_output: '6000',
          cost_cents: '120',
          calls: '60',
        },
      ],
    }));

    const tracker = new UsageTracker(mockPool as never);

    const summary = await tracker.getUsageSummary({
      tenantId: 'tenant-123',
    });

    expect(summary.byDate).toHaveProperty('2025-01-15');
    expect(summary.byDate).toHaveProperty('2025-01-16');
    expect(summary.byDate['2025-01-15'].calls).toBe(50);
    expect(summary.byDate['2025-01-16'].calls).toBe(60);
  });

  it('filters by provider when specified', async () => {
    const mockPool = createMockPool();

    const tracker = new UsageTracker(mockPool as never);

    await tracker.getUsageSummary({
      tenantId: 'tenant-123',
      provider: 'OPENAI',
    });

    expect(mockPool.query).toHaveBeenCalled();
    const [queryText, queryParams] = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(queryText).toContain('provider =');
    expect(queryParams).toContain('OPENAI');
  });

  it('filters by agent type when specified', async () => {
    const mockPool = createMockPool();

    const tracker = new UsageTracker(mockPool as never);

    await tracker.getUsageSummary({
      tenantId: 'tenant-123',
      agentType: 'HOMEWORK_HELPER',
    });

    expect(mockPool.query).toHaveBeenCalled();
    const [queryText, queryParams] = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(queryText).toContain('agent_type =');
    expect(queryParams).toContain('HOMEWORK_HELPER');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TENANT ISOLATION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Usage Tracker: Tenant Isolation', () => {
  it('isolates usage records by tenant', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    const record1: UsageRecord = {
      tenantId: 'tenant-A',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 100,
      tokensOutput: 50,
      estimatedCostCents: 5,
      callCount: 1,
    };

    const record2: UsageRecord = {
      tenantId: 'tenant-B',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 200,
      tokensOutput: 100,
      estimatedCostCents: 10,
      callCount: 1,
    };

    await tracker.recordUsage(record1);
    await tracker.recordUsage(record2);

    const queries = mockPool.getQueries();
    const insertQueries = queries.filter((q) => q.text.includes('INSERT'));

    expect(insertQueries).toHaveLength(2);
    expect(insertQueries[0].values).toContain('tenant-A');
    expect(insertQueries[1].values).toContain('tenant-B');
  });

  it('queries only return data for specified tenant', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    await tracker.getDailyUsage('tenant-123', '2025-01-15');

    expect(mockPool.query).toHaveBeenCalled();
    const [queryText, queryParams] = (mockPool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(queryText).toContain('tenant_id =');
    expect(queryParams).toContain('tenant-123');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CALL COUNT TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Usage Tracker: Call Counting', () => {
  it('tracks call count per record', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    const record: UsageRecord = {
      tenantId: 'tenant-123',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 100,
      tokensOutput: 50,
      estimatedCostCents: 5,
      callCount: 5,
    };

    await tracker.recordUsage(record);

    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));

    expect(insertQuery?.values).toContain(5);
  });

  it('aggregates call counts in upsert', async () => {
    const mockPool = createMockPool();
    const tracker = new UsageTracker(mockPool as never);

    const record: UsageRecord = {
      tenantId: 'tenant-123',
      date: '2025-01-15',
      agentType: 'HOMEWORK_HELPER',
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      tokensInput: 100,
      tokensOutput: 50,
      estimatedCostCents: 5,
      callCount: 1,
    };

    await tracker.recordUsage(record);

    const queries = mockPool.getQueries();
    const insertQuery = queries.find((q) => q.text.includes('INSERT'));

    // Should add to existing call_count
    expect(insertQuery?.text).toContain('call_count = ai_usage.call_count + EXCLUDED.call_count');
  });
});
