'use client';

import { useState, useCallback, useEffect } from 'react';

import type {
  AiCallLogStats,
  AiIncidentStats,
  ComplianceReport,
  DateRange,
  DateRangePreset,
  DsrStats,
  ActivePolicySummary,
} from '../../lib/compliance-types';
import { getDateRangeFromPreset } from '../../lib/compliance-types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ComplianceDashboardClientProps {
  accessToken: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE RANGE SELECTOR
// ══════════════════════════════════════════════════════════════════════════════

interface DateRangeSelectorProps {
  preset: DateRangePreset;
  customRange: DateRange | null;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (range: DateRange) => void;
}

function DateRangeSelector({
  preset,
  customRange,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { onPresetChange(p); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              preset === p
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { onPresetChange('custom'); }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            preset === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Custom
        </button>
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customRange?.from ?? ''}
            onChange={(e) => {
              onCustomRangeChange({
                from: e.target.value,
                to: customRange?.to ?? e.target.value,
              });
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={customRange?.to ?? ''}
            onChange={(e) => {
              onCustomRangeChange({
                from: customRange?.from ?? e.target.value,
                to: e.target.value,
              });
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ label, value, subtext, variant = 'default' }: StatCardProps) {
  const bgColors = {
    default: 'bg-white',
    success: 'bg-green-50',
    warning: 'bg-yellow-50',
    danger: 'bg-red-50',
  };

  return (
    <div className={`rounded-lg border p-4 ${bgColors[variant]}`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-600">{subtext}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BAR CHART COMPONENT (Simple CSS-based)
// ══════════════════════════════════════════════════════════════════════════════

interface BarChartItem {
  label: string;
  value: number;
  color: string;
}

interface SimpleBarChartProps {
  items: BarChartItem[];
  total: number;
  title: string;
}

function SimpleBarChart({ items, total, title }: SimpleBarChartProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-700">{item.label}</span>
                <span className="font-medium text-slate-900">
                  {item.value.toLocaleString()} ({pct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI USAGE SECTION
// ══════════════════════════════════════════════════════════════════════════════

interface AiUsageSectionProps {
  stats: AiCallLogStats | null;
  loading: boolean;
  error: string | null;
}

function AiUsageSection({ stats, loading, error }: AiUsageSectionProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-800">AI Usage & Safety</h3>
        <p className="mt-2 text-sm text-red-700">Failed to load AI stats: {error}</p>
        {/* Fallback table */}
        <p className="mt-2 text-xs text-red-600">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!stats) return null;

  const safetyItems: BarChartItem[] = [
    { label: 'SAFE', value: stats.safetyDistribution.SAFE, color: '#22c55e' },
    { label: 'LOW', value: stats.safetyDistribution.LOW, color: '#eab308' },
    { label: 'MEDIUM', value: stats.safetyDistribution.MEDIUM, color: '#f97316' },
    { label: 'HIGH', value: stats.safetyDistribution.HIGH, color: '#ef4444' },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
  
  const agentItems: BarChartItem[] = Object.entries(stats.callsByAgentType).map(
    ([agent, count], idx) => ({
      label: agent,
      value: count,
      color: COLORS[idx % COLORS.length] ?? '#3b82f6',
    })
  );

  // Calculate HIGH risk percentage for summary
  const highRiskPct =
    stats.totalCalls > 0
      ? ((stats.safetyDistribution.HIGH / stats.totalCalls) * 100).toFixed(2)
      : '0';

  return (
    <section aria-labelledby="ai-usage-heading">
      <h2 id="ai-usage-heading" className="mb-4 text-lg font-semibold text-slate-900">
        AI Usage & Safety
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total AI Calls" value={stats.totalCalls.toLocaleString()} />
        <StatCard
          label="Avg Latency"
          value={`${stats.avgLatencyMs.toLocaleString()}ms`}
          subtext={`p95: ${stats.p95LatencyMs.toLocaleString()}ms`}
        />
        <StatCard
          label="Total Cost"
          value={`$${(stats.totalCostCents / 100).toFixed(2)}`}
          subtext={`Avg: $${(stats.avgCostCentsPerCall / 100).toFixed(4)}/call`}
        />
        <StatCard
          label="Error Rate"
          value={`${stats.totalCalls > 0 ? ((stats.callsByStatus.ERROR / stats.totalCalls) * 100).toFixed(2) : 0}%`}
          subtext={`${stats.callsByStatus.ERROR.toLocaleString()} errors`}
          variant={stats.callsByStatus.ERROR > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SimpleBarChart items={safetyItems} total={stats.totalCalls} title="Safety Distribution" />
        <SimpleBarChart items={agentItems} total={stats.totalCalls} title="Calls by Agent Type" />
      </div>

      {/* Accessibility text summary */}
      <p className="mt-4 text-sm text-slate-600" role="status" aria-live="polite">
        In the selected period, {highRiskPct}% of AI calls were labeled HIGH risk.{' '}
        {stats.callsByStatus.ERROR > 0
          ? `There were ${stats.callsByStatus.ERROR.toLocaleString()} errors out of ${stats.totalCalls.toLocaleString()} total calls.`
          : 'No errors were recorded.'}
      </p>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INCIDENTS SECTION
// ══════════════════════════════════════════════════════════════════════════════

interface IncidentsSectionProps {
  stats: AiIncidentStats | null;
  loading: boolean;
  error: string | null;
}

function IncidentsSection({ stats, loading, error }: IncidentsSectionProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-800">Incidents Overview</h3>
        <p className="mt-2 text-sm text-red-700">Failed to load incident stats: {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const openTotal = Object.values(stats.openIncidentsBySeverity).reduce((a, b) => a + b, 0);

  const severityItems: BarChartItem[] = [
    { label: 'CRITICAL', value: stats.incidentCountsBySeverity.CRITICAL, color: '#7f1d1d' },
    { label: 'HIGH', value: stats.incidentCountsBySeverity.HIGH, color: '#ef4444' },
    { label: 'MEDIUM', value: stats.incidentCountsBySeverity.MEDIUM, color: '#f97316' },
    { label: 'LOW', value: stats.incidentCountsBySeverity.LOW, color: '#eab308' },
    { label: 'INFO', value: stats.incidentCountsBySeverity.INFO, color: '#3b82f6' },
  ];

  return (
    <section aria-labelledby="incidents-heading">
      <h2 id="incidents-heading" className="mb-4 text-lg font-semibold text-slate-900">
        Incidents Overview
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Incidents" value={stats.totalIncidents.toLocaleString()} />
        <StatCard
          label="Open Incidents"
          value={openTotal.toLocaleString()}
          variant={openTotal > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Critical/High Open"
          value={
            stats.openIncidentsBySeverity.CRITICAL + stats.openIncidentsBySeverity.HIGH
          }
          variant={
            stats.openIncidentsBySeverity.CRITICAL + stats.openIncidentsBySeverity.HIGH > 0
              ? 'danger'
              : 'success'
          }
        />
        <StatCard label="Resolved" value={stats.incidentCountsByStatus.RESOLVED.toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SimpleBarChart
          items={severityItems}
          total={stats.totalIncidents}
          title="Incidents by Severity"
        />

        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Top 5 Tenants by Incident Count</h3>
          <div className="space-y-2">
            {stats.topTenantsByIncidentCount.slice(0, 5).map((tenant, idx) => (
              <div
                key={tenant.tenantId}
                className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">{idx + 1}.</span>
                  <a
                    href={`/tenants/${tenant.tenantId}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {tenant.tenantName}
                  </a>
                </div>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium">
                  {tenant.incidentCount} incidents
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600" role="status" aria-live="polite">
        {openTotal > 0
          ? `There are ${openTotal} open incidents requiring attention.`
          : 'No open incidents at this time.'}
        {stats.openIncidentsBySeverity.CRITICAL > 0 &&
          ` ${stats.openIncidentsBySeverity.CRITICAL} are marked CRITICAL.`}
      </p>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DSR SECTION
// ══════════════════════════════════════════════════════════════════════════════

interface DsrSectionProps {
  stats: DsrStats | null;
  loading: boolean;
  error: string | null;
}

function DsrSection({ stats, loading, error }: DsrSectionProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-800">DSR & Retention</h3>
        <p className="mt-2 text-sm text-red-700">Failed to load DSR stats: {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const typeItems: BarChartItem[] = [
    { label: 'EXPORT', value: stats.countsByType.EXPORT ?? 0, color: '#3b82f6' },
    { label: 'DELETE', value: stats.countsByType.DELETE ?? 0, color: '#ef4444' },
  ];

  const pendingCount = (stats.countsByStatus.PENDING ?? 0) + (stats.countsByStatus.IN_PROGRESS ?? 0);

  return (
    <section aria-labelledby="dsr-heading">
      <h2 id="dsr-heading" className="mb-4 text-lg font-semibold text-slate-900">
        DSR & Retention
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total DSR Requests" value={stats.totalRequests.toLocaleString()} />
        <StatCard
          label="Pending/In Progress"
          value={pendingCount.toLocaleString()}
          variant={pendingCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Completed"
          value={(stats.countsByStatus.COMPLETED ?? 0).toLocaleString()}
        />
        <StatCard
          label="Failed/Rejected"
          value={(
            (stats.countsByStatus.FAILED ?? 0) + (stats.countsByStatus.REJECTED ?? 0)
          ).toLocaleString()}
          variant={
            (stats.countsByStatus.FAILED ?? 0) + (stats.countsByStatus.REJECTED ?? 0) > 0
              ? 'danger'
              : 'default'
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SimpleBarChart items={typeItems} total={stats.totalRequests} title="Requests by Type" />

        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Recent Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-slate-600">Tenant</th>
                  <th className="pb-2 font-medium text-slate-600">Type</th>
                  <th className="pb-2 font-medium text-slate-600">Status</th>
                  <th className="pb-2 font-medium text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRequests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="border-b last:border-0">
                    <td className="py-2 text-slate-900">{req.tenantName ?? req.tenantId}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          req.requestType === 'DELETE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {req.requestType}
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          req.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : req.status === 'FAILED' || req.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600" role="status" aria-live="polite">
        {pendingCount > 0
          ? `${pendingCount} DSR requests are pending or in progress.`
          : 'All DSR requests have been processed.'}
      </p>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY STATUS SECTION
// ══════════════════════════════════════════════════════════════════════════════

interface PolicyStatusSectionProps {
  summary: ActivePolicySummary | null;
  loading: boolean;
  error: string | null;
}

function PolicyStatusSection({ summary, loading, error }: PolicyStatusSectionProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="animate-pulse h-16 rounded bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-800">Policy Status</h3>
        <p className="mt-1 text-sm text-red-700">Failed to load: {error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <section aria-labelledby="policy-heading">
      <h2 id="policy-heading" className="mb-4 text-lg font-semibold text-slate-900">
        Policy Status
      </h2>
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500">Active Global Policy</div>
            <div className="text-lg font-semibold text-slate-900">
              {summary.globalPolicy?.name ?? 'No global policy set'}
            </div>
            {summary.globalPolicy && (
              <div className="text-xs text-slate-500">
                Version {summary.globalPolicy.version} • Updated{' '}
                {new Date(summary.globalPolicy.updatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-500">Tenant Overrides</div>
            <div className="text-2xl font-bold text-slate-900">{summary.tenantOverrideCount}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT SECTION
// ══════════════════════════════════════════════════════════════════════════════

interface ExportSectionProps {
  dateRange: DateRange;
  accessToken: string;
  onExportStart: () => void;
  onExportEnd: (success: boolean, error?: string) => void;
}

function ExportSection({ dateRange, accessToken, onExportStart, onExportEnd }: ExportSectionProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    onExportStart();

    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });

      const AI_ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_AI_ORCHESTRATOR_URL ?? '/api/compliance';

      const res = await fetch(`${AI_ORCHESTRATOR_URL}/report?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.statusText}`);
      }

      const report = (await res.json()) as ComplianceReport;

      // Download as JSON file
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${dateRange.from}-to-${dateRange.to}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExportEnd(true);
    } catch (err) {
      onExportEnd(false, err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? 'Exporting...' : 'Export Compliance Report (JSON)'}
      </button>
      <span className="text-xs text-slate-500">
        Downloads a JSON file with all compliance data for the selected period.
        {/* Future: PDF export could be added here */}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ComplianceDashboardClient({ accessToken }: ComplianceDashboardClientProps) {
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('30d'));

  // Stats state
  const [aiStats, setAiStats] = useState<AiCallLogStats | null>(null);
  const [aiStatsLoading, setAiStatsLoading] = useState(true);
  const [aiStatsError, setAiStatsError] = useState<string | null>(null);

  const [incidentStats, setIncidentStats] = useState<AiIncidentStats | null>(null);
  const [incidentStatsLoading, setIncidentStatsLoading] = useState(true);
  const [incidentStatsError, setIncidentStatsError] = useState<string | null>(null);

  const [dsrStats, setDsrStats] = useState<DsrStats | null>(null);
  const [dsrStatsLoading, setDsrStatsLoading] = useState(true);
  const [dsrStatsError, setDsrStatsError] = useState<string | null>(null);

  const [policySummary, setPolicySummary] = useState<ActivePolicySummary | null>(null);
  const [policySummaryLoading, setPolicySummaryLoading] = useState(true);
  const [policySummaryError, setPolicySummaryError] = useState<string | null>(null);

  const [exportStatus, setExportStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Update date range when preset changes
  useEffect(() => {
    if (preset !== 'custom') {
      setDateRange(getDateRangeFromPreset(preset));
    } else if (customRange) {
      setDateRange(customRange);
    }
  }, [preset, customRange]);

  // Fetch all stats when date range changes
  const fetchAllStats = useCallback(async () => {
    setAiStatsLoading(true);
    setIncidentStatsLoading(true);
    setDsrStatsLoading(true);
    setPolicySummaryLoading(true);

    setAiStatsError(null);
    setIncidentStatsError(null);
    setDsrStatsError(null);
    setPolicySummaryError(null);

    const params = new URLSearchParams({
      from: dateRange.from,
      to: dateRange.to,
    });

    // Fetch AI stats
    try {
      const res = await fetch(`/api/compliance/ai-stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAiStats((await res.json()) as AiCallLogStats);
    } catch (err) {
      setAiStatsError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setAiStatsLoading(false);
    }

    // Fetch incident stats
    try {
      const res = await fetch(`/api/compliance/incident-stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIncidentStats((await res.json()) as AiIncidentStats);
    } catch (err) {
      setIncidentStatsError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIncidentStatsLoading(false);
    }

    // Fetch DSR stats
    try {
      const res = await fetch(`/api/compliance/dsr-stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDsrStats((await res.json()) as DsrStats);
    } catch (err) {
      setDsrStatsError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setDsrStatsLoading(false);
    }

    // Fetch policy summary (no date range needed)
    try {
      const res = await fetch('/api/compliance/policy-summary', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPolicySummary((await res.json()) as ActivePolicySummary);
    } catch (err) {
      setPolicySummaryError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setPolicySummaryLoading(false);
    }
  }, [accessToken, dateRange]);

  useEffect(() => {
    void fetchAllStats();
  }, [fetchAllStats]);

  const handleExportStart = () => {
    setExportStatus(null);
  };

  const handleExportEnd = (success: boolean, error?: string) => {
    if (success) {
      setExportStatus({ message: 'Report exported successfully!', type: 'success' });
    } else {
      setExportStatus({ message: error ?? 'Export failed', type: 'error' });
    }
    // Clear status after 5 seconds
    setTimeout(() => { setExportStatus(null); }, 5000);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">AI Safety & Compliance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor AI usage, safety incidents, and data subject requests across all tenants.
        </p>
      </div>

      {/* Filters & Export */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-white p-4">
        <DateRangeSelector
          preset={preset}
          customRange={customRange}
          onPresetChange={setPreset}
          onCustomRangeChange={setCustomRange}
        />
        <ExportSection
          dateRange={dateRange}
          accessToken={accessToken}
          onExportStart={handleExportStart}
          onExportEnd={handleExportEnd}
        />
      </div>

      {/* Export status toast */}
      {exportStatus && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            exportStatus.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
          role="alert"
        >
          {exportStatus.message}
        </div>
      )}

      {/* Dashboard sections */}
      <div className="space-y-8">
        <AiUsageSection stats={aiStats} loading={aiStatsLoading} error={aiStatsError} />
        <IncidentsSection stats={incidentStats} loading={incidentStatsLoading} error={incidentStatsError} />
        <DsrSection stats={dsrStats} loading={dsrStatsLoading} error={dsrStatsError} />
        <PolicyStatusSection
          summary={policySummary}
          loading={policySummaryLoading}
          error={policySummaryError}
        />
      </div>

      {/* Future PDF export documentation */}
      {/* 
        PDF Export Implementation Guide:
        
        To add PDF export capability in the future:
        
        1. Install a PDF rendering library:
           - @react-pdf/renderer for React-based PDF generation
           - puppeteer for server-side HTML-to-PDF conversion
           
        2. Create a dedicated report template component that renders
           the compliance data in a print-friendly format.
           
        3. Add a new API endpoint: GET /api/compliance/report.pdf
           that either:
           a) Uses puppeteer to render the React component to PDF, or
           b) Generates PDF using a templating library like pdfkit
           
        4. Update the ExportSection to include a "Export as PDF" button
           that triggers the PDF download.
           
        5. Consider adding report customization options:
           - Include/exclude sections
           - Add company branding/logo
           - Custom date formatting
      */}
    </div>
  );
}
