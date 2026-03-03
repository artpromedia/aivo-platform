'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../providers';

// ============================================================================
// Types
// ============================================================================

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userRole: string | undefined;
  details: string | null;
  ipAddress: string | undefined;
  userAgent: string | undefined;
  deviceInfo: string | undefined;
  changeJson: Record<string, unknown> | undefined;
  createdAt: string;
}

interface AuditResponse {
  items: AuditEntry[];
  total: number;
}

interface AuditState {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

type DatePreset = '24h' | '7d' | '30d' | '90d';
type ActiveTab = 'audit' | 'ferpa';

// ============================================================================
// Constants
// ============================================================================

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_UPDATED', label: 'User Updated' },
  { value: 'DATA_ACCESS', label: 'Data Access' },
  { value: 'IEP_VIEWED', label: 'IEP Viewed' },
  { value: 'IEP_UPDATED', label: 'IEP Updated' },
  { value: 'SETTINGS_CHANGED', label: 'Settings Changed' },
  { value: 'LOGIN_SUCCESS', label: 'Login Success' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'EXPORT_TRIGGERED', label: 'Export Triggered' },
] as const;

const ROLE_TYPES = [
  { value: '', label: 'All Roles' },
  { value: 'DISTRICT_ADMIN', label: 'District Admin' },
  { value: 'SCHOOL_ADMIN', label: 'School Admin' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'SYSTEM', label: 'System' },
] as const;

const DATE_PRESETS: { key: DatePreset; label: string; days: number }[] = [
  { key: '24h', label: 'Last 24h', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
];

// ============================================================================
// Helpers
// ============================================================================

function actionTone(action: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
  const lower = action.toLowerCase();
  if (lower.includes('create') || lower.includes('add') || lower.includes('success'))
    return 'success';
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('failed'))
    return 'error';
  if (lower.includes('update') || lower.includes('edit') || lower.includes('changed'))
    return 'warning';
  if (lower.includes('view') || lower.includes('access')) return 'info';
  return 'neutral';
}

function getDateFromPreset(preset: DatePreset): string {
  const now = new Date();
  const days = preset === '24h' ? 1 : preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

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

// ============================================================================
// Sub-Components
// ============================================================================

/* ---------- Filter Controls ---------- */

interface FilterControlsProps {
  datePreset: DatePreset;
  onDatePresetChange: (p: DatePreset) => void;
  actionFilter: string;
  onActionFilterChange: (a: string) => void;
  roleFilter: string;
  onRoleFilterChange: (r: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onExport: () => void;
  exporting: boolean;
}

function FilterControls({
  datePreset,
  onDatePresetChange,
  actionFilter,
  onActionFilterChange,
  roleFilter,
  onRoleFilterChange,
  search,
  onSearchChange,
  onExport,
  exporting,
}: FilterControlsProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Date presets + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted">Time range:</span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                onDatePresetChange(p.key);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                datePreset === p.key
                  ? 'bg-primary text-white'
                  : 'bg-surface-muted text-muted hover:bg-surface-muted/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="gap-2 text-sm"
          onClick={onExport}
          disabled={exporting}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Row 2: Dropdowns + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            onActionFilterChange(e.target.value);
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {ACTION_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => {
            onRoleFilterChange(e.target.value);
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {ROLE_TYPES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by user, action, entity…"
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

/* ---------- Expandable Audit Row ---------- */

interface AuditRowProps {
  entry: AuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function AuditRow({ entry, isExpanded, onToggle }: AuditRowProps) {
  return (
    <>
      <tr
        className="cursor-pointer transition hover:bg-surface-muted/80"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onToggle();
        }}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-muted text-sm">{formatDateTime(entry.createdAt)}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-text">{entry.userName}</div>
          {entry.userRole && (
            <div className="text-xs text-muted">{entry.userRole.replace(/_/g, ' ')}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <Badge tone={actionTone(entry.action)}>
            {entry.action.replace(/_/g, ' ')}
          </Badge>
        </td>
        <td className="px-4 py-3 text-muted">
          {entry.entityType}{' '}
          <span className="text-xs">({entry.entityId.slice(0, 8)}…)</span>
        </td>
        <td className="px-4 py-3 text-muted max-w-xs truncate">
          {entry.details ?? '—'}
        </td>
        <td className="px-4 py-3 text-right">
          {entry.entityType === 'LEARNER' ? (
            <Link
              href={`/audit/learner/${entry.entityId}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                Timeline
              </Button>
            </Link>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </td>
      </tr>

      {/* Expanded detail panel */}
      {isExpanded && (
        <tr className="bg-surface-muted/50">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Event Info */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Event Info
                </h4>
                <dl className="space-y-1 text-sm">
                  <div>
                    <dt className="inline font-medium text-muted">Event ID: </dt>
                    <dd className="inline">
                      <code className="rounded bg-surface px-1 text-xs">{entry.id}</code>
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-muted">Entity ID: </dt>
                    <dd className="inline">
                      <code className="rounded bg-surface px-1 text-xs">{entry.entityId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-muted">User ID: </dt>
                    <dd className="inline">
                      <code className="rounded bg-surface px-1 text-xs">{entry.userId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-muted">Timestamp: </dt>
                    <dd className="inline">{new Date(entry.createdAt).toISOString()}</dd>
                  </div>
                </dl>
              </div>

              {/* Access Context */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Access Context
                </h4>
                <dl className="space-y-1 text-sm">
                  <div>
                    <dt className="inline font-medium text-muted">IP Address: </dt>
                    <dd className="inline">{entry.ipAddress ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-muted">User Agent: </dt>
                    <dd className="inline text-xs break-all">{entry.userAgent ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-muted">Device: </dt>
                    <dd className="inline">{entry.deviceInfo ?? '—'}</dd>
                  </div>
                </dl>
              </div>

              {/* Change Payload */}
              <div className="sm:col-span-2 lg:col-span-1">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Change Payload
                </h4>
                {entry.changeJson && Object.keys(entry.changeJson).length > 0 ? (
                  <pre className="max-h-48 overflow-auto rounded bg-surface p-2 text-xs">
                    {JSON.stringify(entry.changeJson, null, 2)}
                  </pre>
                ) : (
                  <span className="text-sm text-muted">No payload recorded</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------- Pagination ---------- */

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <span className="text-sm text-muted">
        Showing {start}–{end} of {total} events
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="px-3 py-1.5 text-sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          Previous
        </Button>
        <span className="text-sm text-muted">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          className="px-3 py-1.5 text-sm"
          disabled={page >= totalPages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AuditPage() {
  const { accessToken } = useAuth();

  // Active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('audit');

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  // State
  const [state, setState] = useState<AuditState>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    loading: true,
    error: null,
  });

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  // ── Fetch audit log ──────────────────────────────────────────────────────
  const fetchAuditLog = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      params.set('fromDate', getDateFromPreset(datePreset));
      params.set('page', state.page.toString());
      params.set('pageSize', state.pageSize.toString());
      if (actionFilter) params.set('action', actionFilter);
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);
      if (activeTab === 'ferpa') params.set('tab', 'ferpa');

      const res = await fetch(`/api/audit?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!res.ok) throw new Error(`Failed to load audit log (${res.status})`);

      const data = (await res.json()) as AuditResponse;
      setState((prev) => ({
        ...prev,
        items: data.items,
        total: data.total,
        loading: false,
      }));
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load audit log',
      }));
    }
  }, [accessToken, datePreset, actionFilter, roleFilter, search, activeTab, state.page, state.pageSize]);

  useEffect(() => {
    void fetchAuditLog();
  }, [fetchAuditLog]);

  // ── Filter change handlers ───────────────────────────────────────────────
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setState((prev) => ({ ...prev, page: 1 }));
  };

  const handleActionFilterChange = (action: string) => {
    setActionFilter(action);
    setState((prev) => ({ ...prev, page: 1 }));
  };

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setState((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setState((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setState((prev) => ({ ...prev, page }));
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setState((prev) => ({ ...prev, page: 1 }));
    setExpandedId(null);
  };

  // ── CSV Export ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('fromDate', getDateFromPreset(datePreset));
      if (actionFilter) params.set('action', actionFilter);
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/audit/export?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to export audit log' }));
    } finally {
      setExporting(false);
    }
  };

  // ── Toggle expanded row ──────────────────────────────────────────────────
  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total: state.total,
    dataAccess: state.items.filter(
      (e) => e.action === 'DATA_ACCESS' || e.action === 'IEP_VIEWED'
    ).length,
    loginFailed: state.items.filter((e) => e.action === 'LOGIN_FAILED').length,
  };

  return (
    <section className="space-y-5" data-testid="audit-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Governance" className="text-headline font-semibold">
          Audit Log
        </Heading>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => {
            handleTabChange('audit');
          }}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'audit'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          Audit Trail
        </button>
        <button
          type="button"
          onClick={() => {
            handleTabChange('ferpa');
          }}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'ferpa'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          FERPA Access Log
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <FilterControls
            datePreset={datePreset}
            onDatePresetChange={handleDatePresetChange}
            actionFilter={actionFilter}
            onActionFilterChange={handleActionFilterChange}
            roleFilter={roleFilter}
            onRoleFilterChange={handleRoleFilterChange}
            search={search}
            onSearchChange={handleSearchChange}
            onExport={() => {
              void handleExport();
            }}
            exporting={exporting}
          />
        </div>
      </Card>

      {/* Error */}
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-red-800">Error loading audit log</span>
          </div>
          <p className="mt-1 text-sm text-red-700">{state.error}</p>
          <button
            type="button"
            onClick={() => {
              void fetchAuditLog();
            }}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <Card
        title={activeTab === 'ferpa' ? 'FERPA Access Log' : 'Audit Trail'}
        subtitle={
          state.loading
            ? 'Loading…'
            : `${state.total} event${state.total !== 1 ? 's' : ''}`
        }
      >
        {state.loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="mt-3 text-sm text-muted">Loading audit events…</p>
          </div>
        ) : state.items.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {search || actionFilter || roleFilter
              ? 'No entries match your filters.'
              : 'No audit entries found for this time range.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold">User</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                    <th className="px-4 py-3 text-left font-semibold">Entity</th>
                    <th className="px-4 py-3 text-left font-semibold">Details</th>
                    <th className="px-4 py-3 text-right font-semibold">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {state.items.map((entry) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedId === entry.id}
                      onToggle={() => {
                        toggleExpanded(entry.id);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={state.page}
              pageSize={state.pageSize}
              total={state.total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>

      {/* Stats Summary */}
      {!state.loading && !state.error && state.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-muted">Total Events</div>
              <div className="mt-1 text-2xl font-bold text-text">{stats.total}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-muted">Data Access Events</div>
              <div className="mt-1 text-2xl font-bold text-text">{stats.dataAccess}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-muted">Failed Logins</div>
              <div className="mt-1 text-2xl font-bold text-text">{stats.loginFailed}</div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
