'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface EdFiConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  schoolYear: string;
  apiVersion: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details: string | undefined;
}

type ResourceType = 'ALL' | 'STUDENTS' | 'STAFF' | 'ENROLLMENTS' | 'GRADES';

type ExportStatus = 'SUCCESS' | 'FAILED' | 'RUNNING';

interface ExportRecord {
  id: string;
  startedAt: string;
  completedAt: string | undefined;
  status: ExportStatus;
  resourceType: ResourceType;
  recordsExported: number;
  errors: number;
  durationMs: number | undefined;
  errorDetails: string | undefined;
}

type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface ScheduleConfig {
  enabled: boolean;
  frequency: ScheduleFrequency;
  dayOfWeek: number; // 0=Sun .. 6=Sat
  dayOfMonth: number; // 1-28
  timeUtc: string; // "HH:mm"
  nextRunAt: string | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const API = '/api/integrations/edfi';

const EMPTY_CONFIG: EdFiConfig = {
  apiBaseUrl: '',
  clientId: '',
  clientSecret: '',
  schoolYear: '2025-2026',
  apiVersion: 'v5.3',
};

const SCHOOL_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
const API_VERSIONS = ['v5.3', 'v6.1', 'v7.0'];

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'ALL', label: 'All Resources' },
  { value: 'STUDENTS', label: 'Students' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'ENROLLMENTS', label: 'Enrollments' },
  { value: 'GRADES', label: 'Grades' },
];

const DEFAULT_SCHEDULE: ScheduleConfig = {
  enabled: false,
  frequency: 'DAILY',
  dayOfWeek: 1,
  dayOfMonth: 1,
  timeUtc: '06:00',
  nextRunAt: undefined,
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_DISPLAY: Record<ExportStatus, { icon: string; label: string; className: string }> = {
  SUCCESS: { icon: '✅', label: 'Success', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  FAILED: { icon: '❌', label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  RUNNING: { icon: '⏳', label: 'Running', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_EXPORTS: ExportRecord[] = [
  {
    id: '1',
    startedAt: '2026-03-01T06:00:00Z',
    completedAt: '2026-03-01T06:04:32Z',
    status: 'SUCCESS',
    resourceType: 'ALL',
    recordsExported: 14832,
    errors: 0,
    durationMs: 272000,
    errorDetails: undefined,
  },
  {
    id: '2',
    startedAt: '2026-02-28T06:00:00Z',
    completedAt: '2026-02-28T06:03:15Z',
    status: 'SUCCESS',
    resourceType: 'ALL',
    recordsExported: 14790,
    errors: 3,
    durationMs: 195000,
    errorDetails: '3 student records skipped: missing stateId',
  },
  {
    id: '3',
    startedAt: '2026-02-27T14:22:00Z',
    completedAt: '2026-02-27T14:22:45Z',
    status: 'FAILED',
    resourceType: 'GRADES',
    recordsExported: 0,
    errors: 1,
    durationMs: 45000,
    errorDetails: 'Ed-Fi API returned 401 Unauthorized — token expired. Reconfigure credentials.',
  },
  {
    id: '4',
    startedAt: '2026-02-27T06:00:00Z',
    completedAt: '2026-02-27T06:05:10Z',
    status: 'SUCCESS',
    resourceType: 'ALL',
    recordsExported: 14788,
    errors: 0,
    durationMs: 310000,
    errorDetails: undefined,
  },
];

// ============================================================================
// Helpers
// ============================================================================

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// ============================================================================
// Sub-Components
// ============================================================================

/* ---------- Configuration Form ---------- */

function ConfigurationSection({
  config,
  saving,
  onSave,
  onChange,
}: {
  config: EdFiConfig;
  saving: boolean;
  onSave: () => void;
  onChange: (field: keyof EdFiConfig, value: string) => void;
}) {
  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          Ed-Fi API Configuration
        </h2>
        <p className="text-sm text-muted mt-1">
          Configure Ed-Fi ODS/API credentials for state reporting data exports.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* API Base URL — full width */}
          <div className="sm:col-span-2">
            <label htmlFor="edfi-apiBaseUrl" className="mb-1 block text-sm font-medium text-text">
              Ed-Fi API Base URL
            </label>
            <input
              id="edfi-apiBaseUrl"
              type="text"
              value={config.apiBaseUrl}
              placeholder="https://api.ed-fi.org/v5.3/api"
              onChange={(e) => { onChange('apiBaseUrl', e.target.value); }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Client ID */}
          <div>
            <label htmlFor="edfi-clientId" className="mb-1 block text-sm font-medium text-text">
              Client ID (OAuth Key)
            </label>
            <input
              id="edfi-clientId"
              type="text"
              value={config.clientId}
              placeholder="Enter OAuth Client ID"
              onChange={(e) => { onChange('clientId', e.target.value); }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label htmlFor="edfi-clientSecret" className="mb-1 block text-sm font-medium text-text">
              Client Secret (OAuth Secret)
            </label>
            <input
              id="edfi-clientSecret"
              type="password"
              value={config.clientSecret}
              placeholder="••••••••••••"
              onChange={(e) => { onChange('clientSecret', e.target.value); }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* School Year */}
          <div>
            <label htmlFor="edfi-schoolYear" className="mb-1 block text-sm font-medium text-text">
              School Year
            </label>
            <select
              id="edfi-schoolYear"
              value={config.schoolYear}
              onChange={(e) => { onChange('schoolYear', e.target.value); }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {SCHOOL_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* API Version */}
          <div>
            <label htmlFor="edfi-apiVersion" className="mb-1 block text-sm font-medium text-text">
              Ed-Fi API Version
            </label>
            <select
              id="edfi-apiVersion"
              value={config.apiVersion}
              onChange={(e) => { onChange('apiVersion', e.target.value); }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {API_VERSIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4 mt-5">
          <Button disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Test Connection ---------- */

function TestConnectionCard({
  testing,
  result,
  onTest,
}: {
  testing: boolean;
  result: TestResult | null;
  onTest: () => void;
}) {
  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Test Connection
        </h2>
        <p className="text-sm text-muted mt-1">
          Validate your Ed-Fi API credentials against the token endpoint.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <Button disabled={testing} onClick={onTest} variant="outline">
            {testing ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                Testing…
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Test Connection
              </>
            )}
          </Button>

          {result && (
            <div className="flex items-center gap-2">
              {result.success ? (
                <>
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">{result.message}</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{result.message}</span>
                </>
              )}
            </div>
          )}
        </div>

        {result?.details && (
          <div
            className={`mt-3 rounded-lg p-3 text-xs ${
              result.success
                ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
                : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200'
            }`}
          >
            <pre className="whitespace-pre-wrap">{result.details}</pre>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Manual Export ---------- */

function ManualExportSection({
  exporting,
  onExport,
}: {
  exporting: boolean;
  onExport: (type: ResourceType) => void;
}) {
  const [selectedResource, setSelectedResource] = useState<ResourceType>('ALL');

  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">📤</span>
          Manual Export
        </h2>
        <p className="text-sm text-muted mt-1">
          Trigger an immediate Ed-Fi data export. Select which resource types to include.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="edfi-resource" className="mb-1 block text-sm font-medium text-text">
              Resource Type
            </label>
            <select
              id="edfi-resource"
              value={selectedResource}
              onChange={(e) => { setSelectedResource(e.target.value as ResourceType); }}
              disabled={exporting}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {RESOURCE_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <Button
            disabled={exporting}
            onClick={() => { onExport(selectedResource); }}
          >
            {exporting ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Exporting…
              </>
            ) : (
              'Run Export Now'
            )}
          </Button>
        </div>

        {exporting && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Export in progress…</p>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  This may take several minutes depending on the number of records.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Export History Table ---------- */

function ExportHistorySection({
  exports: exportList,
  loading,
  onRerun,
}: {
  exports: ExportRecord[];
  loading: boolean;
  onRerun: (id: string) => void;
}) {
  const [expandedError, setExpandedError] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span className="text-xl">📋</span>
            Export History
          </h2>
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <span className="ml-3 text-sm text-muted">Loading export history…</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">📋</span>
          Export History
        </h2>

        {exportList.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No exports have been run yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted">Date</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 font-medium text-muted">Resource</th>
                  <th className="pb-2 font-medium text-muted text-right">Records</th>
                  <th className="pb-2 font-medium text-muted text-right">Errors</th>
                  <th className="pb-2 font-medium text-muted text-right">Duration</th>
                  <th className="pb-2 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exportList.map((exp) => {
                  const st = STATUS_DISPLAY[exp.status];
                  return (
                    <tr key={exp.id}>
                      <td className="py-2.5 text-text whitespace-nowrap">
                        {formatDateTime(exp.startedAt)}
                      </td>
                      <td className="py-2.5">
                        <Badge className={st.className}>
                          {st.icon} {st.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted">
                        {RESOURCE_TYPES.find((r) => r.value === exp.resourceType)?.label ?? exp.resourceType}
                      </td>
                      <td className="py-2.5 text-right text-text">
                        {exp.recordsExported.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={exp.errors > 0 ? 'text-red-600 font-medium' : 'text-muted'}>
                          {exp.errors}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-muted whitespace-nowrap">
                        {exp.durationMs != null ? formatDuration(exp.durationMs) : '—'}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {exp.errorDetails && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedError(expandedError === exp.id ? null : exp.id);
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              {expandedError === exp.id ? 'Hide' : 'Errors'}
                            </button>
                          )}
                          {exp.status !== 'RUNNING' && (
                            <button
                              type="button"
                              onClick={() => { onRerun(exp.id); }}
                              className="text-xs text-primary hover:underline"
                            >
                              Re-run
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded error details */}
            {expandedError && (() => {
              const exp = exportList.find((e) => e.id === expandedError);
              if (!exp?.errorDetails) return null;
              return (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  <pre className="whitespace-pre-wrap">{exp.errorDetails}</pre>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Scheduled Exports ---------- */

function ScheduleSection({
  schedule,
  saving,
  onChange,
}: {
  schedule: ScheduleConfig;
  saving: boolean;
  onChange: (updates: Partial<ScheduleConfig>) => void;
}) {
  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">🕐</span>
          Scheduled Exports
        </h2>
        <p className="text-sm text-muted mt-1">
          Automatically export data to Ed-Fi on a recurring schedule.
        </p>

        {/* Enable toggle */}
        <div className="mt-5 flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <h3 className="text-sm font-medium text-text">Enable Scheduled Exports</h3>
            <p className="text-xs text-muted mt-0.5">
              {schedule.enabled ? 'Exports run automatically on schedule.' : 'Scheduled exports are currently disabled.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={schedule.enabled}
            disabled={saving}
            onClick={() => { onChange({ enabled: !schedule.enabled }); }}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
              border-2 border-transparent transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${schedule.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
              ${saving ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full
                bg-white shadow ring-0 transition duration-200 ease-in-out
                ${schedule.enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {schedule.enabled && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Frequency */}
              <div>
                <label htmlFor="edfi-freq" className="mb-1 block text-sm font-medium text-text">
                  Frequency
                </label>
                <select
                  id="edfi-freq"
                  value={schedule.frequency}
                  onChange={(e) => { onChange({ frequency: e.target.value as ScheduleFrequency }); }}
                  disabled={saving}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {/* Day selector (conditional) */}
              {schedule.frequency === 'WEEKLY' && (
                <div>
                  <label htmlFor="edfi-dow" className="mb-1 block text-sm font-medium text-text">
                    Day of Week
                  </label>
                  <select
                    id="edfi-dow"
                    value={schedule.dayOfWeek}
                    onChange={(e) => { onChange({ dayOfWeek: Number(e.target.value) }); }}
                    disabled={saving}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {DAYS_OF_WEEK.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {schedule.frequency === 'MONTHLY' && (
                <div>
                  <label htmlFor="edfi-dom" className="mb-1 block text-sm font-medium text-text">
                    Day of Month
                  </label>
                  <select
                    id="edfi-dom"
                    value={schedule.dayOfMonth}
                    onChange={(e) => { onChange({ dayOfMonth: Number(e.target.value) }); }}
                    disabled={saving}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time */}
              <div>
                <label htmlFor="edfi-time" className="mb-1 block text-sm font-medium text-text">
                  Time (UTC)
                </label>
                <input
                  id="edfi-time"
                  type="time"
                  value={schedule.timeUtc}
                  onChange={(e) => { onChange({ timeUtc: e.target.value }); }}
                  disabled={saving}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Next scheduled run */}
            {schedule.nextRunAt && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-sm text-text">
                  <span className="font-medium">Next scheduled run:</span>{' '}
                  {formatDateTime(schedule.nextRunAt)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function EdFiReportingPage() {
  const { accessToken } = useAuth();

  // State
  const [config, setConfig] = useState<EdFiConfig>(EMPTY_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loadingExports, setLoadingExports] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helpers
  const buildHeaders = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => { setFeedback(null); }, 5000);
  }, []);

  // ---- Fetchers ----

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/config`, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as EdFiConfig;
        setConfig(data);
      }
    } catch {
      // use defaults
    }
  }, [buildHeaders]);

  const fetchExports = useCallback(async () => {
    setLoadingExports(true);
    try {
      const res = await fetch(`${API}/exports`, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as ExportRecord[];
        setExports(data);
        setLoadingExports(false);
        return;
      }
    } catch {
      // fallthrough
    }
    setExports(MOCK_EXPORTS);
    setLoadingExports(false);
  }, [buildHeaders]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`${API}/schedule`, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as ScheduleConfig;
        setSchedule(data);
      }
    } catch {
      // use defaults
    }
  }, [buildHeaders]);

  // ---- Actions ----

  const saveConfig = useCallback(async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${API}/config`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showFeedback('success', 'Ed-Fi configuration saved successfully.');
      } else {
        showFeedback('error', 'Failed to save Ed-Fi configuration.');
      }
    } catch {
      showFeedback('error', 'Failed to save Ed-Fi configuration.');
    } finally {
      setSavingConfig(false);
    }
  }, [buildHeaders, config, showFeedback]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/test-connection`, {
        method: 'POST',
        headers: buildHeaders(),
      });
      const data = (await res.json()) as TestResult;
      setTestResult(data);
    } catch {
      setTestResult({
        success: false,
        message: 'Unable to reach Ed-Fi service',
        details: 'The proxy service may be unavailable. Check server logs.',
      });
    } finally {
      setTesting(false);
    }
  }, [buildHeaders]);

  const runExport = useCallback(async (resourceType: ResourceType) => {
    setExporting(true);
    try {
      const res = await fetch(`${API}/export`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ resourceType }),
      });
      if (res.ok) {
        showFeedback('success', 'Export completed successfully.');
        void fetchExports();
      } else {
        showFeedback('error', 'Export failed. Check export history for details.');
        void fetchExports();
      }
    } catch {
      showFeedback('error', 'Failed to trigger export.');
    } finally {
      setExporting(false);
    }
  }, [buildHeaders, fetchExports, showFeedback]);

  const rerunExport = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API}/exports/${id}/rerun`, {
        method: 'POST',
        headers: buildHeaders(),
      });
      if (res.ok) {
        showFeedback('success', 'Export re-run initiated.');
        void fetchExports();
      } else {
        showFeedback('error', 'Failed to re-run export.');
      }
    } catch {
      showFeedback('error', 'Failed to re-run export.');
    }
  }, [buildHeaders, fetchExports, showFeedback]);

  const saveSchedule = useCallback(async (updates: Partial<ScheduleConfig>) => {
    const updated = { ...schedule, ...updates };
    setSchedule(updated);
    setSavingSchedule(true);
    try {
      const res = await fetch(`${API}/schedule`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = (await res.json()) as ScheduleConfig;
        setSchedule(data);
        showFeedback('success', 'Schedule updated.');
      } else {
        showFeedback('error', 'Failed to update schedule.');
      }
    } catch {
      showFeedback('error', 'Failed to update schedule.');
    } finally {
      setSavingSchedule(false);
    }
  }, [buildHeaders, schedule, showFeedback]);

  // ---- Mount ----

  useEffect(() => {
    void fetchConfig();
    void fetchExports();
    void fetchSchedule();
  }, [fetchConfig, fetchExports, fetchSchedule]);

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text">Ed-Fi State Reporting</h1>
        <p className="text-muted mt-1">
          Configure and manage Ed-Fi ODS/API data exports for state compliance reporting.
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-6 w-6 text-primary mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h2 className="text-sm font-semibold text-text">About Ed-Fi Integration</h2>
            <p className="text-sm text-muted mt-1">
              Ed-Fi exports student, staff, enrollment, and grade data to your state&apos;s Ed-Fi
              ODS/API for compliance reporting. Credentials are stored securely and encrypted at rest.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Configuration */}
      <ConfigurationSection
        config={config}
        saving={savingConfig}
        onSave={saveConfig}
        onChange={(field, value) => { setConfig((prev) => ({ ...prev, [field]: value })); }}
      />

      {/* Test Connection */}
      <TestConnectionCard testing={testing} result={testResult} onTest={testConnection} />

      {/* Manual Export */}
      <ManualExportSection exporting={exporting} onExport={runExport} />

      {/* Export History */}
      <ExportHistorySection exports={exports} loading={loadingExports} onRerun={rerunExport} />

      {/* Scheduled Exports */}
      <ScheduleSection schedule={schedule} saving={savingSchedule} onChange={saveSchedule} />
    </div>
  );
}
