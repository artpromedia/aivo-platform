'use client';

import { Card, Heading, Button, Badge } from '@aivo/ui-web';
import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface Tenant {
  id: string;
  name: string;
  learnersCount: number;
}

interface AnonymityCheckResult {
  passed: boolean;
  threshold: number;
  failingCohorts: { key: string; count: number }[];
}

interface ExportRequest {
  tenantIds: string[];
  dateRange: { from: string; to: string };
  dataTypes: string[];
  purpose: string;
  irbApprovalNumber?: string;
  researcherAffiliation?: string;
  format: 'json' | 'csv' | 'parquet';
}

interface ExportAuditRecord {
  exportId: string;
  userId: string;
  requestedAt: string;
  purpose: string;
  dataTypes: string[];
  dateRangeFrom: string;
  dateRangeTo: string;
  rowCount: number;
  kAnonymityPassed: boolean;
  irbApprovalNumber?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? 'http://localhost:3400';

async function fetchTenants(accessToken: string): Promise<Tenant[]> {
  const res = await fetch(`${API_BASE}/admin/tenants`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch tenants');
  const data = await res.json();
  return data.tenants;
}

async function checkAnonymity(
  accessToken: string,
  tenantIds: string[],
  dateRange: { from: string; to: string }
): Promise<AnonymityCheckResult> {
  const res = await fetch(`${API_BASE}/research/exports/check-anonymity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenantIds, dateRange }),
  });
  if (!res.ok) throw new Error('Failed to check anonymity');
  return res.json();
}

async function requestExport(accessToken: string, request: ExportRequest): Promise<unknown> {
  const res = await fetch(`${API_BASE}/research/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Export failed');
  }
  return res.json();
}

async function fetchAuditLog(accessToken: string): Promise<ExportAuditRecord[]> {
  const res = await fetch(`${API_BASE}/research/exports/audit`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch audit log');
  const data = await res.json();
  return data.exports;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

const DATA_TYPE_OPTIONS = [
  { value: 'sessions', label: 'Session Data', description: 'Learner session durations and activity counts' },
  { value: 'activity_events', label: 'Activity Events', description: 'Individual responses, completions, hints' },
  { value: 'learning_progress', label: 'Learning Progress', description: 'Skill mastery scores over time' },
  { value: 'focus_events', label: 'Focus Events', description: 'Focus breaks and interventions' },
  { value: 'ai_usage', label: 'AI Usage', description: 'AI interaction patterns (anonymized)' },
  { value: 'experiment_exposures', label: 'Experiment Exposures', description: 'A/B test variant assignments' },
];

function TenantSelector({
  tenants,
  selected,
  onChange,
}: {
  tenants: Tenant[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggleTenant = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((t) => t !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(tenants.map((t) => t.id));
  const selectNone = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="secondary" size="sm" onClick={selectNone}>
          Clear
        </Button>
      </div>
      <div className="max-h-48 overflow-y-auto border border-border rounded p-2 space-y-1">
        {tenants.map((t) => (
          <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-hover p-1 rounded">
            <input
              type="checkbox"
              checked={selected.includes(t.id)}
              onChange={() => toggleTenant(t.id)}
              className="rounded"
            />
            <span>{t.name}</span>
            <span className="text-muted text-xs">({t.learnersCount} learners)</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-muted">{selected.length} tenants selected</p>
    </div>
  );
}

function DataTypeSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
}) {
  const toggle = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="space-y-2">
      {DATA_TYPE_OPTIONS.map((opt) => (
        <label key={opt.value} className="flex items-start gap-2 cursor-pointer hover:bg-surface-hover p-2 rounded">
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="rounded mt-1"
          />
          <div>
            <div className="font-medium">{opt.label}</div>
            <div className="text-sm text-muted">{opt.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

function AnonymityStatus({ result }: { result: AnonymityCheckResult | null }) {
  if (!result) return null;

  if (result.passed) {
    return (
      <div className="bg-success/10 border border-success rounded p-4">
        <div className="flex items-center gap-2 text-success font-medium">
          <span>✓</span>
          <span>K-Anonymity Check Passed</span>
        </div>
        <p className="text-sm text-muted mt-1">
          All cohorts have at least {result.threshold} learners. Export is safe to proceed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-error/10 border border-error rounded p-4">
      <div className="flex items-center gap-2 text-error font-medium">
        <span>✗</span>
        <span>K-Anonymity Check Failed</span>
      </div>
      <p className="text-sm mt-1">
        Some cohorts have fewer than {result.threshold} learners, which could enable re-identification:
      </p>
      <ul className="text-sm mt-2 space-y-1">
        {result.failingCohorts.map((c) => (
          <li key={c.key}>
            <code>{c.key}</code>: only {c.count} learners
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted mt-2">
        Expand the date range or include more tenants to increase cohort sizes.
      </p>
    </div>
  );
}

function AuditLogTable({ records }: { records: ExportAuditRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="text-left text-sm text-muted">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Purpose</th>
            <th className="px-4 py-2">Data Types</th>
            <th className="px-4 py-2">Rows</th>
            <th className="px-4 py-2">IRB #</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r) => (
            <tr key={r.exportId}>
              <td className="px-4 py-3 text-sm">{new Date(r.requestedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-sm font-mono">{r.userId.substring(0, 8)}...</td>
              <td className="px-4 py-3 text-sm max-w-xs truncate">{r.purpose}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {r.dataTypes.map((t) => (
                    <Badge key={t} color="neutral">{t}</Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{r.rowCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">{r.irbApprovalNumber || '—'}</td>
              <td className="px-4 py-3">
                <Badge color={r.kAnonymityPassed ? 'success' : 'error'}>
                  {r.kAnonymityPassed ? 'Exported' : 'Blocked'}
                </Badge>
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

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export default function ResearchExportsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLog, setAuditLog] = useState<ExportAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    return { from: formatDateString(from), to: formatDateString(to) };
  });
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['sessions', 'learning_progress']);
  const [purpose, setPurpose] = useState('');
  const [irbNumber, setIrbNumber] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [format, setFormat] = useState<'json' | 'csv' | 'parquet'>('json');

  // Check state
  const [anonymityResult, setAnonymityResult] = useState<AnonymityCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<unknown>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = 'mock-token';
      const [tenantsData, auditData] = await Promise.all([
        fetchTenants(accessToken),
        fetchAuditLog(accessToken),
      ]);
      setTenants(tenantsData);
      setAuditLog(auditData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCheckAnonymity = async () => {
    if (selectedTenants.length === 0) {
      setError('Please select at least one tenant');
      return;
    }

    setChecking(true);
    setAnonymityResult(null);
    try {
      const accessToken = 'mock-token';
      const result = await checkAnonymity(accessToken, selectedTenants, dateRange);
      setAnonymityResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anonymity check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleExport = async () => {
    if (!anonymityResult?.passed) {
      setError('Please run anonymity check first');
      return;
    }
    if (selectedDataTypes.length === 0) {
      setError('Please select at least one data type');
      return;
    }
    if (purpose.length < 10) {
      setError('Please provide a detailed purpose (at least 10 characters)');
      return;
    }

    setExporting(true);
    setError(null);
    try {
      const accessToken = 'mock-token';
      const result = await requestExport(accessToken, {
        tenantIds: selectedTenants,
        dateRange,
        dataTypes: selectedDataTypes,
        purpose,
        irbApprovalNumber: irbNumber || undefined,
        researcherAffiliation: affiliation || undefined,
        format,
      });
      setExportResult(result);
      void loadData(); // Refresh audit log
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted">Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <Heading kicker="Platform Admin" className="text-headline font-semibold">
          Research Data Exports
        </Heading>
        <p className="text-sm text-muted mt-1">
          Export de-identified analytics data for research purposes (FERPA/COPPA compliant)
        </p>
      </div>

      {/* Compliance Notice */}
      <Card className="bg-warning/5 border-warning">
        <h3 className="font-semibold mb-2">⚠️ Data Privacy Compliance</h3>
        <ul className="text-sm space-y-1">
          <li>• All learner identifiers are pseudonymized using HMAC-SHA256</li>
          <li>• Direct identifiers (names, emails, etc.) are never included</li>
          <li>• Exports must pass k-anonymity check (minimum 10 learners per cohort)</li>
          <li>• All exports are logged for audit purposes</li>
          <li>• IRB approval number is recommended for academic research</li>
        </ul>
      </Card>

      {error && (
        <Card className="border-error">
          <p className="text-error">{error}</p>
          <Button variant="secondary" onClick={() => setError(null)} className="mt-2">
            Dismiss
          </Button>
        </Card>
      )}

      {/* Export Wizard */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: Select Tenants */}
        <Card title="1. Select Tenants">
          <TenantSelector
            tenants={tenants}
            selected={selectedTenants}
            onChange={setSelectedTenants}
          />
        </Card>

        {/* Step 2: Date Range */}
        <Card title="2. Date Range">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleCheckAnonymity}
              loading={checking}
              disabled={selectedTenants.length === 0}
            >
              Check Anonymity Requirements
            </Button>
            <AnonymityStatus result={anonymityResult} />
          </div>
        </Card>

        {/* Step 3: Data Types */}
        <Card title="3. Select Data Types">
          <DataTypeSelector
            selected={selectedDataTypes}
            onChange={setSelectedDataTypes}
          />
        </Card>

        {/* Step 4: Research Details */}
        <Card title="4. Research Details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Purpose of Research *</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe the research purpose and how the data will be used..."
                className="w-full rounded-md border border-border px-3 py-2 h-24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IRB Approval Number</label>
              <input
                type="text"
                value={irbNumber}
                onChange={(e) => setIrbNumber(e.target.value)}
                placeholder="e.g., IRB-2025-0123"
                className="w-full rounded-md border border-border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Researcher Affiliation</label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="e.g., University of..."
                className="w-full rounded-md border border-border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Export Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'csv' | 'parquet')}
                className="w-full rounded-md border border-border px-3 py-2"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="parquet">Parquet</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Export Button */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Ready to Export?</h3>
            <p className="text-sm text-muted">
              {selectedTenants.length} tenants, {selectedDataTypes.length} data types selected
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleExport}
            loading={exporting}
            disabled={!anonymityResult?.passed || selectedDataTypes.length === 0 || purpose.length < 10}
          >
            Generate De-identified Export
          </Button>
        </div>
      </Card>

      {/* Export Result */}
      {exportResult && (
        <Card title="Export Complete" className="border-success">
          <pre className="bg-surface-secondary p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(exportResult, null, 2)}
          </pre>
        </Card>
      )}

      {/* Audit Log */}
      <Card title="Export Audit Log">
        <p className="text-sm text-muted mb-4">
          Recent research data exports (for compliance and auditing)
        </p>
        {auditLog.length > 0 ? (
          <AuditLogTable records={auditLog} />
        ) : (
          <p className="text-muted text-center py-8">No exports recorded yet</p>
        )}
      </Card>
    </section>
  );
}
