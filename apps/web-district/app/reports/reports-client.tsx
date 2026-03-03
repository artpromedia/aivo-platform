/**
 * Reports Client — interactive wrapper around ComplianceReports
 *
 * Wires generate / view / download / schedule handlers to the API routes.
 */

'use client';

import { useCallback, useState } from 'react';

import {
  ComplianceReports,
  type ComplianceReport,
  type ScheduledReport,
} from '../dashboard/components/compliance-reports';

// ============================================================================
// Types
// ============================================================================

interface ReportsClientProps {
  tenantId: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: ComplianceReport['type'];
  status: ComplianceReport['status'];
  generatedAt: string;
  period: string;
  findings: number;
  criticalFindings: number;
  schools: number;
  downloadUrl?: string | undefined;
  /** Full report payload for the View modal */
  data?: Record<string, unknown> | undefined;
}

// ============================================================================
// Component
// ============================================================================

export function ReportsClient({ tenantId }: Readonly<ReportsClientProps>) {
  // Generated reports stored in client state
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);

  // Toast / error
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Loading during generation
  const [generating, setGenerating] = useState(false);

  // View report modal
  const [viewReport, setViewReport] = useState<GeneratedReport | null>(null);

  // Schedule modal
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleType, setScheduleType] = useState('ferpa');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Helpers
  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => { setToast(null); }, 4000);
  }

  // ---- Generate Report ----
  const handleGenerateReport = useCallback(
    async (type: string) => {
      setGenerating(true);
      try {
        const res = await fetch('/api/compliance/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
          },
          body: JSON.stringify({
            tenantId,
            type,
            dateRange: { start: getDefaultStart(), end: new Date().toISOString() },
          }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? `Report generation failed (${res.status})`);
        }

        const data = (await res.json()) as Partial<GeneratedReport>;

        // Normalise: the API may return with or without these fields
        const report: GeneratedReport = {
          id: data.id ?? crypto.randomUUID(),
          name: data.name ?? `${typeLabel(type)} Report`,
          type: data.type ?? (type as ComplianceReport['type']),
          status: data.status ?? 'compliant',
          generatedAt: data.generatedAt ?? new Date().toISOString(),
          period: data.period ?? 'Last 30 days',
          findings: data.findings ?? 0,
          criticalFindings: data.criticalFindings ?? 0,
          schools: data.schools ?? 0,
          downloadUrl: data.downloadUrl,
          data: data.data ?? (data as Record<string, unknown>),
        };

        setReports((prev) => [report, ...prev]);
        showToast('success', `${report.name} generated successfully.`);
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : 'Failed to generate report');
      } finally {
        setGenerating(false);
      }
    },
    [tenantId]
  );

  // ---- View Report (modal) ----
  const handleViewReport = useCallback(
    (reportId: string) => {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        setViewReport(report);
      } else {
        showToast('error', 'Report not found. Generate a new one.');
      }
    },
    [reports]
  );

  // ---- Download Report (blob → file) ----
  const handleDownloadReport = useCallback(
    async (reportId: string) => {
      try {
        const report = reports.find((r) => r.id === reportId);
        const format = 'pdf';

        const params = new URLSearchParams({ format });
        if (reportId) params.set('reportId', reportId);
        if (tenantId) params.set('tenantId', tenantId);

        const res = await fetch(`/api/compliance/report?${params}`);
        if (!res.ok) {
          throw new Error(`Download failed (${res.status})`);
        }

        const blob = await res.blob();
        const url = globalThis.URL.createObjectURL(blob);
        const a = globalThis.document.createElement('a');
        a.href = url;
        a.download = report
          ? `${report.name.replace(/\s+/g, '_')}.${format}`
          : `compliance-report.${format}`;
        globalThis.document.body.appendChild(a);
        a.click();
        globalThis.URL.revokeObjectURL(url);
        a.remove();

        showToast('success', 'Report downloaded.');
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : 'Failed to download report');
      }
    },
    [tenantId, reports]
  );

  // ---- Save Scheduled Report ----
  async function handleSaveSchedule(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setScheduleSaving(true);
    try {
      const emails = scheduleRecipients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (emails.length === 0) {
        throw new Error('At least one recipient email is required.');
      }

      // Persist to local state (no backend endpoint yet — ready to wire)
      const scheduled: ScheduledReport = {
        id: crypto.randomUUID(),
        name: `${typeLabel(scheduleType)} — ${scheduleFrequency}`,
        type: scheduleType,
        frequency: scheduleFrequency,
        nextRun: getNextRun(scheduleFrequency),
        recipients: emails,
        enabled: true,
      };

      setScheduledReports((prev) => [scheduled, ...prev]);
      showToast('success', 'Report schedule saved.');
      setShowSchedule(false);
      setScheduleRecipients('');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to schedule report');
    } finally {
      setScheduleSaving(false);
    }
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] max-w-sm rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
          data-testid="toast"
        >
          {toast.message}
        </div>
      )}

      {/* Loading overlay during generation */}
      {generating && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700">
          <svg
            className="h-5 w-5 animate-spin text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Generating compliance report...
        </div>
      )}

      {/* Schedule Report button */}
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="schedule-report-btn"
          onClick={() => { setShowSchedule(true); }}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          Schedule Report
        </button>
      </div>

      {/* Compliance Reports — with fully wired handlers */}
      <ComplianceReports
        districtId={tenantId}
        reports={reports}
        scheduledReports={scheduledReports}
        onGenerateReport={handleGenerateReport}
        onViewReport={handleViewReport}
        onDownloadReport={handleDownloadReport}
      />

      {/* ================================================================ */}
      {/* View Report Modal                                                */}
      {/* ================================================================ */}
      {viewReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="view-report-modal"
        >
          <div className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewReport.name}</h3>
                <p className="text-xs text-gray-500">
                  Generated {new Date(viewReport.generatedAt).toLocaleString()} &middot;{' '}
                  {viewReport.period}
                </p>
              </div>
              <button
                type="button"
                data-testid="close-view-modal"
                onClick={() => { setViewReport(null); }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-6 px-6 py-5">
              {/* Summary grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold capitalize ${
                      viewReport.status === 'compliant'
                        ? 'text-green-600'
                        : viewReport.status === 'critical'
                          ? 'text-red-600'
                          : viewReport.status === 'attention'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                    }`}
                  >
                    {viewReport.status}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Findings
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{viewReport.findings}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Critical
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      viewReport.criticalFindings > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {viewReport.criticalFindings}
                  </p>
                </div>
              </div>

              {/* Schools & type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Report Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 uppercase">
                    {viewReport.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Schools Covered
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{viewReport.schools}</p>
                </div>
              </div>

              {/* Raw data */}
              {viewReport.data && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Report Data
                  </p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                    {JSON.stringify(viewReport.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => void handleDownloadReport(viewReport.id)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => { setViewReport(null); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Schedule Report Modal                                            */}
      {/* ================================================================ */}
      {showSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="schedule-report-modal"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Report</h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure automatic compliance report generation
              </p>
            </div>

            <form
              onSubmit={(e) => void handleSaveSchedule(e)}
              className="space-y-4 px-6 py-5"
              data-testid="schedule-report-form"
            >
              {/* Report Type */}
              <div className="space-y-1">
                <label
                  htmlFor="sched-type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Report Type
                </label>
                <select
                  id="sched-type"
                  value={scheduleType}
                  onChange={(e) => { setScheduleType(e.target.value); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ferpa">FERPA Access</option>
                  <option value="idea">IEP Compliance</option>
                  <option value="custom">Full Audit</option>
                </select>
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <label
                  htmlFor="sched-freq"
                  className="block text-sm font-medium text-gray-700"
                >
                  Frequency
                </label>
                <select
                  id="sched-freq"
                  value={scheduleFrequency}
                  onChange={(e) => {
                    setScheduleFrequency(e.target.value as 'weekly' | 'monthly');
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Recipients */}
              <div className="space-y-1">
                <label
                  htmlFor="sched-emails"
                  className="block text-sm font-medium text-gray-700"
                >
                  Recipients (comma-separated emails)
                </label>
                <input
                  id="sched-emails"
                  type="text"
                  data-testid="schedule-recipients"
                  placeholder="admin@school.edu, principal@school.edu"
                  value={scheduleRecipients}
                  onChange={(e) => { setScheduleRecipients(e.target.value); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowSchedule(false); }}
                  disabled={scheduleSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {scheduleSaving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    ferpa: 'FERPA Compliance',
    coppa: 'COPPA Compliance',
    idea: 'IDEA/IEP Compliance',
    state: 'State Reporting',
    custom: 'Full Audit',
  };
  return labels[type] ?? 'Compliance';
}

function getDefaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function getNextRun(frequency: 'weekly' | 'monthly'): string {
  const d = new Date();
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}
