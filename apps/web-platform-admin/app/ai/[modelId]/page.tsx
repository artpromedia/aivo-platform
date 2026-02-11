'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useModelMetrics } from '../../../hooks/use-admin-data';

export default function AIModelDetailPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const { data: metrics, isLoading, error } = useModelMetrics(modelId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/ai/incidents" className="hover:text-slate-700">
          AI
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{modelId}</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI Model: {modelId}</h1>
        <Link
          href={`/models/${modelId}`}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Model Card
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-28 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load model metrics. The backend service may be unavailable.
        </div>
      )}

      {metrics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Calls" value={metrics.totalCalls?.toLocaleString() ?? '—'} />
            <StatCard
              label="Avg Latency"
              value={metrics.avgLatencyMs ? `${metrics.avgLatencyMs}ms` : '—'}
            />
            <StatCard
              label="Error Rate"
              value={metrics.errorRate != null ? `${(metrics.errorRate * 100).toFixed(1)}%` : '—'}
            />
            <StatCard
              label="Est. Cost"
              value={
                metrics.totalCostCents != null
                  ? `$${(metrics.totalCostCents / 100).toFixed(2)}`
                  : '—'
              }
            />
          </div>

          {metrics.callsByPeriod && metrics.callsByPeriod.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Calls by Period</h2>
              <div className="grid gap-2">
                {metrics.callsByPeriod.map((entry: { period: string; count: number }) => (
                  <div
                    key={entry.period}
                    className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                  >
                    <span className="text-slate-600">{entry.period}</span>
                    <span className="font-medium">{entry.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !error && !metrics && (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          No metrics available for this model yet.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
