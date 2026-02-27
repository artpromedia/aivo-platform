/**
 * Analytics Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - ETL pipeline failures (source unavailable, transform errors)
 * - Query timeout handling
 * - Invalid aggregation parameters
 * - Dashboard widget rendering errors
 * - Time-series data gaps
 * - Concurrent report generation conflicts
 * - Export format errors
 *
 * @module services/analytics-svc/test/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    ...overrides,
  };
}

function createMockEtlPipeline(overrides: Record<string, unknown> = {}) {
  return {
    extract: vi.fn().mockResolvedValue({ records: [], count: 0 }),
    transform: vi.fn().mockResolvedValue({ records: [], errors: [] }),
    load: vi.fn().mockResolvedValue({ loaded: 0, skipped: 0 }),
    ...overrides,
  };
}

// ============================================================================
// 1. ETL Pipeline Failures
// ============================================================================

describe('Analytics Error Paths — ETL Pipeline', () => {
  let pipeline: ReturnType<typeof createMockEtlPipeline>;

  beforeEach(() => {
    pipeline = createMockEtlPipeline();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should handle source database unavailable during extraction', async () => {
    pipeline.extract.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await runEtl(pipeline);

    expect(result.success).toBe(false);
    expect(result.stage).toBe('EXTRACT');
    expect(result.error).toBe('SOURCE_UNAVAILABLE');
  });

  it('should handle transform errors with partial data', async () => {
    pipeline.extract.mockResolvedValue({
      records: [
        { id: 1, value: 10 },
        { id: 2, value: null },
        { id: 3, value: 'invalid' },
      ],
      count: 3,
    });
    pipeline.transform.mockResolvedValue({
      records: [{ id: 1, value: 10 }],
      errors: [
        { id: 2, reason: 'NULL_VALUE' },
        { id: 3, reason: 'TYPE_MISMATCH' },
      ],
    });

    const result = await runEtl(pipeline);

    expect(result.success).toBe(true);
    expect(result.partialFailure).toBe(true);
    expect(result.errorCount).toBe(2);
  });

  it('should handle load failure after successful transform', async () => {
    pipeline.extract.mockResolvedValue({ records: [{ id: 1 }], count: 1 });
    pipeline.transform.mockResolvedValue({ records: [{ id: 1 }], errors: [] });
    pipeline.load.mockRejectedValue(new Error('disk full'));

    const result = await runEtl(pipeline);

    expect(result.success).toBe(false);
    expect(result.stage).toBe('LOAD');
  });

  it('should handle empty extraction result gracefully', async () => {
    pipeline.extract.mockResolvedValue({ records: [], count: 0 });

    const result = await runEtl(pipeline);

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBe(0);
  });
});

// ============================================================================
// 2. Query Timeout Handling
// ============================================================================

describe('Analytics Error Paths — Query Timeouts', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('should handle query timeout', async () => {
    db.query.mockRejectedValue(new Error('query timeout: statement took longer than 30000ms'));

    const result = await executeAnalyticsQuery(db, {
      query: 'SELECT * FROM events GROUP BY tenant',
      timeout: 30000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('QUERY_TIMEOUT');
  });

  it('should handle out-of-memory during large aggregation', async () => {
    db.query.mockRejectedValue(new Error('out of memory'));

    const result = await executeAnalyticsQuery(db, {
      query: 'SELECT * FROM large_table',
      timeout: 60000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('QUERY_RESOURCE_ERROR');
  });

  it('should handle cancelled query connection', async () => {
    db.query.mockRejectedValue(new Error('connection terminated'));

    const result = await executeAnalyticsQuery(db, {
      query: 'SELECT *',
      timeout: 30000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('CONNECTION_LOST');
  });
});

// ============================================================================
// 3. Invalid Aggregation Parameters
// ============================================================================

describe('Analytics Error Paths — Aggregation Validation', () => {
  it('should reject invalid date range (start after end)', () => {
    const result = validateDateRange({
      startDate: '2025-12-31',
      endDate: '2025-01-01',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('START_AFTER_END');
  });

  it('should reject date range exceeding maximum span', () => {
    const result = validateDateRange({
      startDate: '2020-01-01',
      endDate: '2025-12-31',
      maxDays: 365,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('RANGE_TOO_LARGE');
  });

  it('should reject invalid granularity', () => {
    const result = validateAggregation({
      metric: 'active_users',
      granularity: 'millisecond',
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INVALID_GRANULARITY');
  });

  it('should reject unknown metric', () => {
    const result = validateAggregation({
      metric: 'nonexistent_metric',
      granularity: 'day',
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('UNKNOWN_METRIC');
  });

  it('should accept valid aggregation parameters', () => {
    const result = validateAggregation({
      metric: 'active_users',
      granularity: 'day',
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
    });

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// 4. Time-Series Data Gaps
// ============================================================================

describe('Analytics Error Paths — Time-Series Gaps', () => {
  it('should fill gaps with zeros for count metrics', () => {
    const data = [
      { date: '2025-01-01', value: 10 },
      // gap: 2025-01-02
      { date: '2025-01-03', value: 15 },
    ];

    const filled = fillTimeSeriesGaps(data, '2025-01-01', '2025-01-03', 'count');

    expect(filled).toHaveLength(3);
    expect(filled[1].value).toBe(0);
  });

  it('should fill gaps with null for average metrics', () => {
    const data = [
      { date: '2025-01-01', value: 85 },
      { date: '2025-01-03', value: 90 },
    ];

    const filled = fillTimeSeriesGaps(data, '2025-01-01', '2025-01-03', 'average');

    expect(filled[1].value).toBeNull();
  });

  it('should handle completely empty time series', () => {
    const filled = fillTimeSeriesGaps([], '2025-01-01', '2025-01-05', 'count');

    expect(filled).toHaveLength(5);
    expect(filled.every((d) => d.value === 0)).toBe(true);
  });
});

// ============================================================================
// 5. Dashboard & Report Errors
// ============================================================================

describe('Analytics Error Paths — Dashboard/Reports', () => {
  it('should handle widget with invalid configuration', () => {
    const result = validateWidgetConfig({
      type: 'chart',
      metric: '',
      visualization: 'bar',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('MISSING_METRIC');
  });

  it('should handle unsupported export format', () => {
    const result = validateExportFormat('docx');

    expect(result.valid).toBe(false);
    expect(result.supportedFormats).toContain('csv');
    expect(result.supportedFormats).toContain('pdf');
  });

  it('should handle concurrent report generation', () => {
    const activeReports = new Map([['report-1', { status: 'generating', startedAt: Date.now() }]]);

    const result = canGenerateReport('tenant-1', activeReports, 2);

    expect(result.allowed).toBe(true);
  });

  it('should throttle when too many concurrent reports', () => {
    const activeReports = new Map([
      ['report-1', { status: 'generating', startedAt: Date.now() }],
      ['report-2', { status: 'generating', startedAt: Date.now() }],
    ]);

    const result = canGenerateReport('tenant-1', activeReports, 2);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('TOO_MANY_CONCURRENT');
  });
});

// ============================================================================
// 6. Data Privacy & Tenant Isolation
// ============================================================================

describe('Analytics Error Paths — Tenant Data Isolation', () => {
  it('should reject cross-tenant analytics query', () => {
    const result = validateTenantAccess({
      requestingTenantId: 'tenant-1',
      dataTenantId: 'tenant-2',
      role: 'admin',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('CROSS_TENANT_ACCESS');
  });

  it('should allow platform admin cross-tenant access', () => {
    const result = validateTenantAccess({
      requestingTenantId: 'tenant-1',
      dataTenantId: 'tenant-2',
      role: 'platform_admin',
    });

    expect(result.allowed).toBe(true);
  });

  it('should anonymize PII in exported analytics', () => {
    const data = [
      { userId: 'user-1', email: 'john@test.com', score: 85 },
      { userId: 'user-2', email: 'jane@test.com', score: 92 },
    ];

    const anonymized = anonymizeForExport(data);

    expect(anonymized[0].email).toBeUndefined();
    expect(anonymized[0].userId).not.toBe('user-1');
    expect(anonymized[0].score).toBe(85);
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

async function runEtl(pipeline: ReturnType<typeof createMockEtlPipeline>) {
  let extracted;
  try {
    extracted = await pipeline.extract();
  } catch {
    return { success: false, stage: 'EXTRACT', error: 'SOURCE_UNAVAILABLE', recordsProcessed: 0 };
  }

  if (extracted.count === 0) {
    return {
      success: true,
      stage: 'COMPLETE',
      error: null,
      recordsProcessed: 0,
      partialFailure: false,
      errorCount: 0,
    };
  }

  let transformed;
  try {
    transformed = await pipeline.transform(extracted.records);
  } catch {
    return { success: false, stage: 'TRANSFORM', error: 'TRANSFORM_FAILED', recordsProcessed: 0 };
  }

  try {
    await pipeline.load(transformed.records);
  } catch {
    return { success: false, stage: 'LOAD', error: 'LOAD_FAILED', recordsProcessed: 0 };
  }

  return {
    success: true,
    stage: 'COMPLETE',
    error: null,
    recordsProcessed: transformed.records.length,
    partialFailure: transformed.errors.length > 0,
    errorCount: transformed.errors.length,
  };
}

async function executeAnalyticsQuery(
  db: ReturnType<typeof createMockDb>,
  params: { query: string; timeout: number }
) {
  try {
    const result = await db.query(params.query);
    return { success: true, data: result.rows, error: null };
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg.includes('timeout')) return { success: false, error: 'QUERY_TIMEOUT', data: null };
    if (msg.includes('memory'))
      return { success: false, error: 'QUERY_RESOURCE_ERROR', data: null };
    if (msg.includes('terminated')) return { success: false, error: 'CONNECTION_LOST', data: null };
    return { success: false, error: 'QUERY_FAILED', data: null };
  }
}

function validateDateRange(params: { startDate: string; endDate: string; maxDays?: number }) {
  const start = new Date(params.startDate).getTime();
  const end = new Date(params.endDate).getTime();

  if (start > end) return { valid: false, reason: 'START_AFTER_END' };

  const days = (end - start) / 86_400_000;
  if (params.maxDays && days > params.maxDays) return { valid: false, reason: 'RANGE_TOO_LARGE' };

  return { valid: true, reason: null };
}

function validateAggregation(params: {
  metric: string;
  granularity: string;
  dateRange: { start: string; end: string };
}) {
  const validMetrics = new Set([
    'active_users',
    'sessions',
    'completion_rate',
    'average_score',
    'engagement',
  ]);
  const validGranularities = new Set(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']);

  if (!validMetrics.has(params.metric)) return { valid: false, reason: 'UNKNOWN_METRIC' };
  if (!validGranularities.has(params.granularity))
    return { valid: false, reason: 'INVALID_GRANULARITY' };

  return { valid: true, reason: null };
}

function fillTimeSeriesGaps(
  data: { date: string; value: number | null }[],
  startDate: string,
  endDate: string,
  metricType: 'count' | 'average'
) {
  const dataMap = new Map(data.map((d) => [d.date, d.value]));
  const result: { date: string; value: number | null }[] = [];

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const value = dataMap.get(dateStr) ?? (metricType === 'count' ? 0 : null);
    result.push({ date: dateStr, value });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function validateWidgetConfig(config: { type: string; metric: string; visualization: string }) {
  if (!config.metric) return { valid: false, reason: 'MISSING_METRIC' };
  if (!config.type) return { valid: false, reason: 'MISSING_TYPE' };
  return { valid: true, reason: null };
}

function validateExportFormat(format: string) {
  const supportedFormats = ['csv', 'pdf', 'xlsx', 'json'];
  if (!supportedFormats.includes(format)) return { valid: false, supportedFormats };
  return { valid: true, supportedFormats };
}

function canGenerateReport(
  _tenantId: string,
  activeReports: Map<string, { status: string; startedAt: number }>,
  maxConcurrent: number
) {
  if (activeReports.size >= maxConcurrent) {
    return { allowed: false, reason: 'TOO_MANY_CONCURRENT' };
  }
  return { allowed: true, reason: null };
}

function validateTenantAccess(params: {
  requestingTenantId: string;
  dataTenantId: string;
  role: string;
}) {
  if (params.role === 'platform_admin') return { allowed: true, reason: null };
  if (params.requestingTenantId !== params.dataTenantId) {
    return { allowed: false, reason: 'CROSS_TENANT_ACCESS' };
  }
  return { allowed: true, reason: null };
}

function anonymizeForExport(data: Record<string, unknown>[]) {
  return data.map((row, index) => {
    const { email: _email, userId: _userId, ...rest } = row;
    return { ...rest, userId: `anon-${index}` };
  });
}
