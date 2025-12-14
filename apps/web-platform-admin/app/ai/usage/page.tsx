'use client';

import { type ReactNode, useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL UI COMPONENTS (web-platform-admin doesn't have @aivo/ui-web)
// ══════════════════════════════════════════════════════════════════════════════

function Card({
  title,
  children,
  className = '',
}: Readonly<{
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function Badge({
  color = 'neutral',
  children,
}: Readonly<{
  color?: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  children: ReactNode;
}>) {
  const colorClasses: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    neutral: 'bg-slate-100 text-slate-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>
      {children}
    </span>
  );
}

function Button({
  variant = 'primary',
  children,
  onClick,
  className = '',
}: Readonly<{
  variant?: 'primary' | 'secondary';
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}>) {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  };
  return (
    <button
      type="button"
      className={`px-4 py-2 rounded-md font-medium ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AIUsageSummary {
  period: { from: string; to: string };
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  filterRate: number;
}

interface ModelBreakdown {
  modelName: string;
  provider: string;
  calls: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
  percentOfTotal: number;
}

interface AgentBreakdown {
  agentType: string;
  calls: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
  avgUserRating: number | null;
}

interface TenantUsage {
  tenantId: string;
  tenantName: string;
  calls: number;
  tokens: number;
  costUsd: number;
  learnersServed: number;
}

interface DailyMetric {
  date: string;
  calls: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? 'http://localhost:3400';

interface AIAnalyticsResponse {
  summary: AIUsageSummary;
  byModel: ModelBreakdown[];
  byAgent: AgentBreakdown[];
  byTenant: TenantUsage[];
  dailyTrend: DailyMetric[];
}

async function fetchAIAnalytics(
  accessToken: string,
  dateRange: { from: string; to: string }
): Promise<AIAnalyticsResponse> {
  const params = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
  });

  const res = await fetch(`${API_BASE}/analytics/ai-usage?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Failed to fetch AI analytics');
  return res.json() as Promise<AIAnalyticsResponse>;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function MetricCard({
  label,
  value,
  subtext,
  trend,
}: Readonly<{
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}>) {
  const trendColors = {
    up: 'text-success',
    down: 'text-error',
    neutral: 'text-muted',
  };

  return (
    <Card>
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && (
        <div className={`text-xs mt-1 ${trend ? trendColors[trend] : 'text-muted'}`}>{subtext}</div>
      )}
    </Card>
  );
}

function ModelBreakdownTable({ models }: Readonly<{ models: ModelBreakdown[] }>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th className="px-4 py-2">Model</th>
            <th className="px-4 py-2">Provider</th>
            <th className="px-4 py-2">Calls</th>
            <th className="px-4 py-2">Tokens</th>
            <th className="px-4 py-2">Cost (USD)</th>
            <th className="px-4 py-2">Avg Latency</th>
            <th className="px-4 py-2">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {models.map((m) => (
            <tr key={m.modelName}>
              <td className="px-4 py-3 font-medium">{m.modelName}</td>
              <td className="px-4 py-3">
                <Badge color="neutral">{m.provider}</Badge>
              </td>
              <td className="px-4 py-3">{m.calls.toLocaleString()}</td>
              <td className="px-4 py-3">{m.tokens.toLocaleString()}</td>
              <td className="px-4 py-3">${m.costUsd.toFixed(2)}</td>
              <td className="px-4 py-3">{m.avgLatencyMs.toFixed(0)}ms</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-muted h-2 rounded">
                    <div
                      className="bg-primary h-2 rounded"
                      style={{ width: `${m.percentOfTotal}%` }}
                    />
                  </div>
                  <span>{m.percentOfTotal.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentBreakdownTable({ agents }: Readonly<{ agents: AgentBreakdown[] }>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th className="px-4 py-2">Agent Type</th>
            <th className="px-4 py-2">Calls</th>
            <th className="px-4 py-2">Tokens</th>
            <th className="px-4 py-2">Cost (USD)</th>
            <th className="px-4 py-2">Avg Latency</th>
            <th className="px-4 py-2">Avg Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {agents.map((a) => (
            <tr key={a.agentType}>
              <td className="px-4 py-3 font-medium">{a.agentType}</td>
              <td className="px-4 py-3">{a.calls.toLocaleString()}</td>
              <td className="px-4 py-3">{a.tokens.toLocaleString()}</td>
              <td className="px-4 py-3">${a.costUsd.toFixed(2)}</td>
              <td className="px-4 py-3">{a.avgLatencyMs.toFixed(0)}ms</td>
              <td className="px-4 py-3">
                {a.avgUserRating === null ? (
                  <span className="text-muted">—</span>
                ) : (
                  <span className="flex items-center gap-1">
                    {'★'.repeat(Math.round(a.avgUserRating))}
                    <span className="text-muted">({a.avgUserRating.toFixed(1)})</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopTenantsTable({ tenants }: Readonly<{ tenants: TenantUsage[] }>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th className="px-4 py-2">Tenant</th>
            <th className="px-4 py-2">AI Calls</th>
            <th className="px-4 py-2">Tokens</th>
            <th className="px-4 py-2">Cost (USD)</th>
            <th className="px-4 py-2">Learners</th>
            <th className="px-4 py-2">$/Learner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tenants.slice(0, 10).map((t) => (
            <tr key={t.tenantId}>
              <td className="px-4 py-3 font-medium">{t.tenantName}</td>
              <td className="px-4 py-3">{t.calls.toLocaleString()}</td>
              <td className="px-4 py-3">{t.tokens.toLocaleString()}</td>
              <td className="px-4 py-3">${t.costUsd.toFixed(2)}</td>
              <td className="px-4 py-3">{t.learnersServed.toLocaleString()}</td>
              <td className="px-4 py-3">
                ${t.learnersServed > 0 ? (t.costUsd / t.learnersServed).toFixed(3) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyTrendChart({ data }: Readonly<{ data: DailyMetric[] }>) {
  // Simple bar chart representation
  const maxCost = Math.max(...data.map((d) => d.costUsd), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.date} className="flex items-center gap-3">
          <span className="w-24 text-sm text-muted">{d.date}</span>
          <div className="flex-1 bg-muted h-4 rounded">
            <div
              className="bg-primary h-4 rounded"
              style={{ width: `${(d.costUsd / maxCost) * 100}%` }}
            />
          </div>
          <span className="w-20 text-sm text-right">${d.costUsd.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export default function AIUsageAnalyticsPage() {
  const [data, setData] = useState<AIAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    return {
      from: formatDateString(from),
      to: formatDateString(to),
    };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = 'mock-token'; // In production, get from auth context
      const response = await fetchAIAnalytics(accessToken, dateRange);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted">Loading AI usage analytics...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <Card title="Error" className="border-error">
          <p className="text-error">{error}</p>
          <Button variant="primary" onClick={loadData} className="mt-4">
            Retry
          </Button>
        </Card>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500 uppercase tracking-wide">Platform Admin</div>
          <h1 className="text-2xl font-semibold">AI Usage Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor AI model usage, costs, and performance across all tenants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => {
              setDateRange((prev) => ({ ...prev, from: e.target.value }));
            }}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => {
              setDateRange((prev) => ({ ...prev, to: e.target.value }));
            }}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <MetricCard
          label="Total AI Calls"
          value={data.summary.totalCalls.toLocaleString()}
          subtext={`${(data.summary.totalCalls / 28).toFixed(0)}/day avg`}
        />
        <MetricCard
          label="Total Tokens"
          value={`${(data.summary.totalTokens / 1_000_000).toFixed(2)}M`}
          subtext="Input + output"
        />
        <MetricCard
          label="Total Cost"
          value={`$${data.summary.totalCostUsd.toFixed(2)}`}
          subtext={`$${(data.summary.totalCostUsd / 28).toFixed(2)}/day avg`}
        />
        <MetricCard
          label="Avg Latency"
          value={`${data.summary.avgLatencyMs.toFixed(0)}ms`}
          subtext={data.summary.avgLatencyMs < 1000 ? 'Good' : 'Needs attention'}
          trend={data.summary.avgLatencyMs < 1000 ? 'up' : 'down'}
        />
        <MetricCard
          label="Cache Hit Rate"
          value={`${(data.summary.cacheHitRate * 100).toFixed(1)}%`}
          subtext={data.summary.cacheHitRate > 0.3 ? 'Healthy' : 'Low'}
          trend={data.summary.cacheHitRate > 0.3 ? 'up' : 'neutral'}
        />
        <MetricCard
          label="Filter Rate"
          value={`${(data.summary.filterRate * 100).toFixed(2)}%`}
          subtext="Safety filter triggers"
          trend={data.summary.filterRate < 0.01 ? 'up' : 'down'}
        />
      </div>

      {/* Usage by Model */}
      <Card title="Usage by Model">
        <ModelBreakdownTable models={data.byModel} />
      </Card>

      {/* Usage by Agent */}
      <Card title="Usage by Agent Type">
        <AgentBreakdownTable agents={data.byAgent} />
      </Card>

      {/* Top Tenants */}
      <Card title="Top Tenants by AI Usage">
        <TopTenantsTable tenants={data.byTenant} />
      </Card>

      {/* Daily Trend */}
      <Card title="Daily Cost Trend">
        <DailyTrendChart data={data.dailyTrend.slice(-14)} />
      </Card>

      {/* Cost Optimization Tips */}
      <Card title="Cost Optimization Recommendations">
        <ul className="space-y-2 text-sm">
          {data.summary.cacheHitRate < 0.3 && (
            <li className="flex items-start gap-2">
              <span className="text-warning">⚠</span>
              <span>
                Cache hit rate is low ({(data.summary.cacheHitRate * 100).toFixed(1)}%). Consider
                increasing semantic cache TTL or expanding cache coverage.
              </span>
            </li>
          )}
          {data.summary.avgLatencyMs > 2000 && (
            <li className="flex items-start gap-2">
              <span className="text-warning">⚠</span>
              <span>
                Average latency is high ({data.summary.avgLatencyMs.toFixed(0)}ms). Consider using
                faster models for latency-sensitive use cases.
              </span>
            </li>
          )}
          {data.byModel.some((m) => m.modelName.includes('gpt-4') && m.percentOfTotal > 50) && (
            <li className="flex items-start gap-2">
              <span className="text-info">💡</span>
              <span>
                GPT-4 usage is over 50% of total. Consider using GPT-4o-mini for simpler tasks to
                reduce costs.
              </span>
            </li>
          )}
          {data.summary.totalCostUsd > 1000 && (
            <li className="flex items-start gap-2">
              <span className="text-info">💡</span>
              <span>
                Monthly AI spend is projected at $
                {((data.summary.totalCostUsd / 28) * 30).toFixed(0)}. Consider reviewing high-volume
                tenants for optimization opportunities.
              </span>
            </li>
          )}
        </ul>
      </Card>
    </section>
  );
}
