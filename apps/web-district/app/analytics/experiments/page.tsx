'use client';

import { Card, Heading, Button, Badge } from '@aivo/ui-web';
import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ExperimentSummary {
  experimentKey: string;
  experimentName: string;
  displayName: string;
  scope: 'TENANT' | 'LEARNER';
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  startDate: string | null;
  endDate: string | null;
  totalExposures: number;
  uniqueTenants: number;
  uniqueLearners: number;
}

interface VariantMetric {
  variantName: string;
  allocation: number;
  actualAllocation: number;
  exposureCount: number;
  uniqueSubjects: number;
  avgSessionDuration: number;
  avgCorrectRate: number;
  avgActivitiesCompleted: number;
}

interface SignificanceResult {
  controlVariant: string;
  treatmentVariant: string;
  metric: string;
  controlValue: number;
  treatmentValue: number;
  absoluteDifference: number;
  relativeDifference: number;
  pValue: number;
  significanceLevel: string;
  isSignificant: boolean;
}

interface ExperimentDetail {
  experiment: ExperimentSummary;
  variants: VariantMetric[];
  significance: SignificanceResult[];
  dailyMetrics: {
    date: string;
    variantName: string;
    exposures: number;
    uniqueLearners: number;
    avgCorrectRate: number;
  }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? 'http://localhost:3400';

async function fetchExperiments(
  accessToken: string,
  status?: string
): Promise<ExperimentSummary[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);

  const res = await fetch(`${API_BASE}/analytics/experiments?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Failed to fetch experiments');
  const data = (await res.json()) as { experiments: ExperimentSummary[] };
  return data.experiments;
}

async function fetchExperimentDetail(
  accessToken: string,
  experimentKey: string
): Promise<ExperimentDetail> {
  const res = await fetch(`${API_BASE}/analytics/experiments/${experimentKey}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Failed to fetch experiment detail');
  return res.json() as Promise<ExperimentDetail>;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: Readonly<{ status: ExperimentSummary['status'] }>) {
  const colorMap: Record<ExperimentSummary['status'], 'success' | 'warning' | 'error' | 'neutral'> =
    {
      RUNNING: 'success',
      PAUSED: 'warning',
      COMPLETED: 'neutral',
      DRAFT: 'neutral',
    };
  return <Badge color={colorMap[status]}>{status}</Badge>;
}

function SignificanceIndicator({ level }: Readonly<{ level: string }>) {
  const config: Record<string, { color: string; label: string }> = {
    highly_significant: { color: 'bg-success', label: '★★★' },
    very_significant: { color: 'bg-success', label: '★★' },
    significant: { color: 'bg-success', label: '★' },
    marginally_significant: { color: 'bg-warning', label: '~' },
    not_significant: { color: 'bg-muted', label: '—' },
  };
  const { color, label } = config[level] ?? { color: 'bg-muted', label: '?' };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${color}`}>{label}</span>
  );
}

function VariantComparisonTable({ variants }: Readonly<{ variants: VariantMetric[] }>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th className="px-4 py-2">Variant</th>
            <th className="px-4 py-2">Allocation</th>
            <th className="px-4 py-2">Exposures</th>
            <th className="px-4 py-2">Unique Subjects</th>
            <th className="px-4 py-2">Avg Session (s)</th>
            <th className="px-4 py-2">Correct Rate</th>
            <th className="px-4 py-2">Avg Activities</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {variants.map((v) => (
            <tr key={v.variantName}>
              <td className="px-4 py-3 font-medium">{v.variantName}</td>
              <td className="px-4 py-3">
                {(v.allocation * 100).toFixed(0)}% →{' '}
                <span className="text-muted">{(v.actualAllocation * 100).toFixed(1)}%</span>
              </td>
              <td className="px-4 py-3">{v.exposureCount.toLocaleString()}</td>
              <td className="px-4 py-3">{v.uniqueSubjects.toLocaleString()}</td>
              <td className="px-4 py-3">{v.avgSessionDuration.toFixed(0)}</td>
              <td className="px-4 py-3">{(v.avgCorrectRate * 100).toFixed(1)}%</td>
              <td className="px-4 py-3">{v.avgActivitiesCompleted.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignificanceTable({ results }: Readonly<{ results: SignificanceResult[] }>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th className="px-4 py-2">Metric</th>
            <th className="px-4 py-2">Control</th>
            <th className="px-4 py-2">Treatment</th>
            <th className="px-4 py-2">Δ Absolute</th>
            <th className="px-4 py-2">Δ Relative</th>
            <th className="px-4 py-2">p-value</th>
            <th className="px-4 py-2">Sig.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {results.map((r) => (
            <tr key={r.metric}>
              <td className="px-4 py-3 font-medium">{r.metric}</td>
              <td className="px-4 py-3">
                {r.controlVariant}: {r.controlValue.toFixed(3)}
              </td>
              <td className="px-4 py-3">
                {r.treatmentVariant}: {r.treatmentValue.toFixed(3)}
              </td>
              <td className="px-4 py-3">
                {r.absoluteDifference > 0 ? '+' : ''}
                {r.absoluteDifference.toFixed(4)}
              </td>
              <td className="px-4 py-3">
                {r.relativeDifference > 0 ? '+' : ''}
                {(r.relativeDifference * 100).toFixed(2)}%
              </td>
              <td className="px-4 py-3">{r.pValue.toFixed(4)}</td>
              <td className="px-4 py-3">
                <SignificanceIndicator level={r.significanceLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function ExperimentsAnalyticsPage() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('RUNNING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExperiments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = 'mock-token'; // In production, get from auth context
      const data = await fetchExperiments(accessToken, statusFilter);
      setExperiments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadExperimentDetail = async (experimentKey: string) => {
    try {
      const accessToken = 'mock-token';
      const detail = await fetchExperimentDetail(accessToken, experimentKey);
      setSelectedExperiment(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiment detail');
    }
  };

  useEffect(() => {
    void loadExperiments();
  }, [loadExperiments]);

  if (loading && experiments.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted">Loading experiments...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading kicker="District Analytics" className="text-headline font-semibold">
            Experiments
          </Heading>
          <p className="text-sm text-muted mt-1">
            Monitor A/B tests and feature experiments across your district
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
            }}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {error && (
        <Card title="Error" className="border-error">
          <p className="text-error">{error}</p>
          <Button variant="primary" onClick={loadExperiments} className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Experiment List */}
      <Card title="Active Experiments">
        <div className="divide-y divide-border">
          {experiments.map((exp) => (
            <button
              key={exp.experimentKey}
              type="button"
              className="w-full py-4 flex items-center justify-between hover:bg-surface-hover cursor-pointer px-4 -mx-4 text-left"
              onClick={() => {
                void loadExperimentDetail(exp.experimentKey);
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{exp.displayName}</span>
                  <StatusBadge status={exp.status} />
                  <Badge color="neutral">{exp.scope}</Badge>
                </div>
                <p className="text-sm text-muted mt-1">
                  {exp.uniqueLearners.toLocaleString()} learners •{' '}
                  {exp.totalExposures.toLocaleString()} exposures
                </p>
              </div>
              <div className="text-right text-sm text-muted">
                {exp.startDate && <div>Started: {exp.startDate}</div>}
                {exp.endDate && <div>Ended: {exp.endDate}</div>}
              </div>
            </button>
          ))}
          {experiments.length === 0 && !loading && (
            <div className="py-8 text-center text-muted">
              No experiments found with status &ldquo;{statusFilter || 'any'}&rdquo;
            </div>
          )}
        </div>
      </Card>

      {/* Experiment Detail */}
      {selectedExperiment && (
        <>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>{selectedExperiment.experiment.displayName}</span>
                <Button variant="secondary" onClick={() => {
                  setSelectedExperiment(null);
                }}>
                  Close
                </Button>
              </div>
            }
          >
            <p className="text-muted mb-4">{selectedExperiment.experiment.experimentName}</p>

            <h3 className="font-semibold mb-2">Variant Comparison</h3>
            <VariantComparisonTable variants={selectedExperiment.variants} />
          </Card>

          <Card title="Statistical Significance">
            <p className="text-sm text-muted mb-4">
              Two-tailed z-test for proportion comparison. ★ = p &lt; 0.05, ★★ = p &lt; 0.01, ★★★ =
              p &lt; 0.001
            </p>
            <SignificanceTable results={selectedExperiment.significance} />
          </Card>
        </>
      )}

      {/* Legend */}
      <Card>
        <h3 className="font-semibold mb-2">Understanding Statistical Significance</h3>
        <ul className="text-sm text-muted space-y-1">
          <li>
            <strong>★★★ Highly Significant (p &lt; 0.001):</strong> Very strong evidence the
            variants differ
          </li>
          <li>
            <strong>★★ Very Significant (p &lt; 0.01):</strong> Strong evidence the variants differ
          </li>
          <li>
            <strong>★ Significant (p &lt; 0.05):</strong> Good evidence the variants differ
          </li>
          <li>
            <strong>~ Marginally Significant (p &lt; 0.1):</strong> Weak evidence, needs more data
          </li>
          <li>
            <strong>— Not Significant:</strong> No statistical evidence of difference
          </li>
        </ul>
      </Card>
    </section>
  );
}
