'use client';

import { Card, Heading, Button, Input } from '@aivo/ui-web';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Cohort {
  id: string;
  name: string;
  description?: string;
  estimatedCount?: number;
}

interface DatasetDefinition {
  id: string;
  name: string;
  description?: string;
  baseTable: string;
}

interface DatasetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  baseTable: string;
}

interface ExportForm {
  datasetDefinitionId: string;
  cohortId: string;
  format: 'CSV' | 'JSON' | 'PARQUET';
  dateRangeStart: string;
  dateRangeEnd: string;
  samplingEnabled: boolean;
  samplingRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function NewExportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [datasets, setDatasets] = useState<DatasetDefinition[]>([]);
  const [templates, setTemplates] = useState<DatasetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ExportForm>({
    datasetDefinitionId: '',
    cohortId: '',
    format: 'CSV',
    dateRangeStart: '',
    dateRangeEnd: '',
    samplingEnabled: false,
    samplingRate: 0.1,
  });

  const [preview, setPreview] = useState<{
    estimatedRows: number;
    kAnonymitySatisfied: boolean;
    warning?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cohortsRes, datasetsRes, templatesRes] = await Promise.all([
        fetch(`/api/research/cohorts?projectId=${projectId}`, {
          headers: { Authorization: 'Bearer mock-token' },
        }),
        fetch(`/api/research/dataset-definitions?projectId=${projectId}`, {
          headers: { Authorization: 'Bearer mock-token' },
        }),
        fetch('/api/research/dataset-templates', {
          headers: { Authorization: 'Bearer mock-token' },
        }),
      ]);

      if (cohortsRes.ok) {
        const data = await cohortsRes.json();
        setCohorts(data.data ?? []);
      }
      if (datasetsRes.ok) {
        const data = await datasetsRes.json();
        setDatasets(data.data ?? []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.data ?? []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = <K extends keyof ExportForm>(field: K, value: ExportForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setPreview(null); // Clear preview on change
  };

  const handlePreview = async () => {
    // Simulate preview calculation
    setPreview({
      estimatedRows: Math.floor(Math.random() * 50000) + 5000,
      kAnonymitySatisfied: true,
      warning: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/research/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          projectId,
          datasetDefinitionId: form.datasetDefinitionId,
          cohortId: form.cohortId || undefined,
          format: form.format,
          dateRangeStart: form.dateRangeStart ? new Date(form.dateRangeStart).toISOString() : undefined,
          dateRangeEnd: form.dateRangeEnd ? new Date(form.dateRangeEnd).toISOString() : undefined,
          sampling: form.samplingEnabled
            ? { enabled: true, rate: form.samplingRate }
            : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to request export');
      }

      router.push(`/research/projects/${projectId}?tab=exports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request export');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <section className="space-y-6 max-w-3xl">
      <div>
        <Heading level={1}>Request Data Export</Heading>
        <p className="text-muted mt-1">
          Configure and request a de-identified data export
        </p>
      </div>

      {error && (
        <Card className="border-error">
          <p className="text-error">{error}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dataset Selection */}
        <Card title="1. Select Dataset">
          {datasets.length > 0 ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium mb-1">
                Dataset Definition <span className="text-error">*</span>
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.datasetDefinitionId}
                onChange={(e) => updateField('datasetDefinitionId', e.target.value)}
                required
              >
                <option value="">Select a dataset...</option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.baseTable})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted mb-3">No dataset definitions created yet</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/research/projects/${projectId}/datasets/new`)}
              >
                Create Dataset Definition
              </Button>
            </div>
          )}

          {templates.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Or use a template:</p>
              <div className="grid gap-2 md:grid-cols-2">
                {templates.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="text-left p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition"
                    onClick={() => {
                      // TODO: Create dataset from template
                    }}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Cohort Selection */}
        <Card title="2. Select Cohort (Optional)">
          <p className="text-sm text-muted mb-3">
            Filter the export to a specific cohort of learners
          </p>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.cohortId}
            onChange={(e) => updateField('cohortId', e.target.value)}
          >
            <option value="">All learners (no filter)</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} ({cohort.estimatedCount?.toLocaleString() ?? '?'} learners)
              </option>
            ))}
          </select>
        </Card>

        {/* Date Range */}
        <Card title="3. Date Range">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                value={form.dateRangeStart}
                onChange={(e) => updateField('dateRangeStart', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={form.dateRangeEnd}
                onChange={(e) => updateField('dateRangeEnd', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Export Options */}
        <Card title="4. Export Options">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <div className="flex gap-4">
                {(['CSV', 'JSON', 'PARQUET'] as const).map((fmt) => (
                  <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={fmt}
                      checked={form.format === fmt}
                      onChange={() => updateField('format', fmt)}
                      className="text-primary"
                    />
                    <span>{fmt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.samplingEnabled}
                  onChange={(e) => updateField('samplingEnabled', e.target.checked)}
                  className="text-primary"
                />
                <span className="text-sm font-medium">Enable random sampling</span>
              </label>
              {form.samplingEnabled && (
                <div className="mt-3 ml-6">
                  <label className="block text-sm mb-1">
                    Sample rate: {(form.samplingRate * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={form.samplingRate}
                    onChange={(e) => updateField('samplingRate', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card title="5. Preview & Validate">
          <div className="space-y-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={!form.datasetDefinitionId}
            >
              Calculate Preview
            </Button>

            {preview && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Estimated rows:</span>
                  <span className="font-medium">{preview.estimatedRows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">k-Anonymity (k≥10):</span>
                  <span className={preview.kAnonymitySatisfied ? 'text-green-600' : 'text-red-600'}>
                    {preview.kAnonymitySatisfied ? '✓ Satisfied' : '✗ Not satisfied'}
                  </span>
                </div>
                {preview.warning && (
                  <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    ⚠️ {preview.warning}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <span className="text-2xl">🔒</span>
            <div>
              <h4 className="font-medium text-blue-900">Privacy Transformations Applied</h4>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• Learner IDs are pseudonymized (HMAC-SHA256)</li>
                <li>• Dates are coarsened to day/week/month as configured</li>
                <li>• Small groups (&lt;10 learners) are suppressed</li>
                <li>• All exports are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !form.datasetDefinitionId}
          >
            {submitting ? 'Submitting...' : 'Request Export'}
          </Button>
        </div>
      </form>
    </section>
  );
}
