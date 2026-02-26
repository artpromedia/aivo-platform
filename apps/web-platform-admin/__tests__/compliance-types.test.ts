import { describe, it, expect } from 'vitest';

import { getDateRangeFromPreset } from '@/lib/compliance-types';
import type {
  DateRangePreset,
  DateRange,
  AiCallLogStats,
  AiIncidentStats,
  DsrStats,
  DsrRequestType,
  DsrRequestStatus,
  ComplianceReport,
  ActivePolicySummary,
} from '@/lib/compliance-types';

// ── getDateRangeFromPreset ───────────────────────────────────────

describe('getDateRangeFromPreset', () => {
  it('returns valid DateRange for 7d', () => {
    const range = getDateRangeFromPreset('7d');
    expect(range.from).toBeTruthy();
    expect(range.to).toBeTruthy();

    const diffMs = new Date(range.to).getTime() - new Date(range.from).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(7);
  });

  it('returns valid DateRange for 30d', () => {
    const range = getDateRangeFromPreset('30d');
    const diffMs = new Date(range.to).getTime() - new Date(range.from).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(30);
  });

  it('returns valid DateRange for 90d', () => {
    const range = getDateRangeFromPreset('90d');
    const diffMs = new Date(range.to).getTime() - new Date(range.from).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(90);
  });

  it('defaults to 30d for custom preset', () => {
    const range = getDateRangeFromPreset('custom');
    const diffMs = new Date(range.to).getTime() - new Date(range.from).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(30);
  });

  it('"to" date is today', () => {
    const range = getDateRangeFromPreset('7d');
    const today = new Date().toISOString().split('T')[0];
    expect(range.to).toBe(today);
  });

  it('returns ISO date strings (YYYY-MM-DD)', () => {
    const range = getDateRangeFromPreset('30d');
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── DateRangePreset type ─────────────────────────────────────────

describe('DateRangePreset type', () => {
  it('supports all preset values', () => {
    const presets: DateRangePreset[] = ['7d', '30d', '90d', 'custom'];
    expect(presets).toHaveLength(4);
  });
});

// ── DsrRequestType / DsrRequestStatus ────────────────────────────

describe('DsrRequestType type', () => {
  it('supports EXPORT and DELETE', () => {
    const types: DsrRequestType[] = ['EXPORT', 'DELETE'];
    expect(types).toHaveLength(2);
  });
});

describe('DsrRequestStatus type', () => {
  it('supports all 5 statuses', () => {
    const statuses: DsrRequestStatus[] = [
      'PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAILED',
    ];
    expect(statuses).toHaveLength(5);
  });
});

// ── ComplianceReport interface shape ─────────────────────────────

describe('ComplianceReport interface', () => {
  it('constructs a valid report skeleton', () => {
    const report: ComplianceReport = {
      generatedAt: '2025-01-01T00:00:00Z',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      aiStats: {
        totalCalls: 1000,
        callsByAgentType: { tutor: 500 },
        safetyDistribution: { SAFE: 800, LOW: 100, MEDIUM: 80, HIGH: 20 },
        avgLatencyMs: 200,
        p95LatencyMs: 500,
        avgCostCentsPerCall: 0.5,
        totalCostCents: 500,
        callsByProvider: { openai: 1000 },
        callsByStatus: { SUCCESS: 950, ERROR: 50 },
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      },
      incidentStats: {
        totalIncidents: 10,
        incidentCountsBySeverity: {} as any,
        incidentCountsByCategory: {} as any,
        incidentCountsByStatus: {} as any,
        openIncidentsBySeverity: {} as any,
        topTenantsByIncidentCount: [],
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      },
      dsrStats: {
        totalRequests: 5,
        countsByType: { EXPORT: 3, DELETE: 2 },
        countsByStatus: { COMPLETED: 5 },
        recentRequests: [],
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      },
      policyStatus: {
        globalPolicy: null,
        tenantOverrideCount: 0,
      },
    };
    expect(report.aiStats.totalCalls).toBe(1000);
    expect(report.dsrStats.totalRequests).toBe(5);
  });
});
