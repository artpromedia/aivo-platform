'use client';

import { useState, useEffect, useCallback } from 'react';

import type { PolicyAuditEvent, PolicyChangeJson } from '../../../lib/audit-api';
import {
  formatAuditDate,
  formatRelativeTime,
  getActionLabel,
  getActionColor,
  getActorIcon,
  getActorTypeLabel,
} from '../../../lib/audit-api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface PolicyAuditDashboardProps {
  accessToken: string;
}

interface PolicyAuditState {
  events: PolicyAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

type DatePreset = '7d' | '30d' | '90d' | 'all';

// ══════════════════════════════════════════════════════════════════════════════
// DATE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getDateFromPreset(preset: DatePreset): string | undefined {
  if (preset === 'all') return undefined;
  
  const now = new Date();
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY CHANGE DETAILS
// ══════════════════════════════════════════════════════════════════════════════

interface PolicyChangeDetailsProps {
  changeJson: PolicyChangeJson;
}

function PolicyChangeDetails({ changeJson }: PolicyChangeDetailsProps) {
  const hasDetails = changeJson.policyName || changeJson.policyVersion || 
                     (changeJson.changedFields && changeJson.changedFields.length > 0);
  
  if (!hasDetails) {
    return <span className="text-slate-500">No change details recorded</span>;
  }

  return (
    <div className="space-y-1 text-sm">
      {changeJson.policyName && (
        <div>
          <span className="font-medium text-slate-600">Policy:</span>{' '}
          <span className="text-slate-900">{changeJson.policyName}</span>
        </div>
      )}
      {changeJson.policyVersion && (
        <div>
          <span className="font-medium text-slate-600">Version:</span>{' '}
          <span className="text-slate-900">{changeJson.policyVersion}</span>
        </div>
      )}
      {changeJson.changedFields && changeJson.changedFields.length > 0 && (
        <div>
          <span className="font-medium text-slate-600">Changed fields:</span>
          <ul className="mt-1 list-inside list-disc text-slate-700">
            {changeJson.changedFields.map((field, idx) => (
              <li key={idx}>{field}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER CONTROLS
// ══════════════════════════════════════════════════════════════════════════════

interface FilterControlsProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  tenantFilter: string;
  onTenantFilterChange: (tenantId: string) => void;
}

function FilterControls({
  datePreset,
  onDatePresetChange,
  tenantFilter,
  onTenantFilterChange,
}: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-2">
        <span className="self-center text-sm font-medium text-slate-600">Time range:</span>
        {(['7d', '30d', '90d', 'all'] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => { onDatePresetChange(preset); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              datePreset === preset
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {preset === '7d' ? '7 days' : preset === '30d' ? '30 days' : preset === '90d' ? '90 days' : 'All'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="tenant-filter" className="text-sm font-medium text-slate-600">
          Tenant:
        </label>
        <input
          id="tenant-filter"
          type="text"
          placeholder="All tenants"
          value={tenantFilter}
          onChange={(e) => { onTenantFilterChange(e.target.value); }}
          className="w-48 rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT EVENT ROW
// ══════════════════════════════════════════════════════════════════════════════

interface AuditEventRowProps {
  event: PolicyAuditEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

function AuditEventRow({ event, isExpanded, onToggle }: AuditEventRowProps) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl" title={getActorTypeLabel(event.actorType)}>
            {getActorIcon(event.actorType)}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${getActionColor(event.action)}`}>
                {getActionLabel(event.action)}
              </span>
              <span className="font-medium text-slate-900">
                {event.changeJson.policyName || `Policy ${event.entityId.slice(0, 8)}...`}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-slate-500">
              {event.tenantName || event.tenantId} • {event.actorName || event.actorId}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500" title={formatAuditDate(event.createdAt)}>
            {formatRelativeTime(event.createdAt)}
          </span>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Change Details
              </h4>
              <PolicyChangeDetails changeJson={event.changeJson} />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Metadata
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Event ID:</span>{' '}
                  <code className="rounded bg-slate-200 px-1 text-xs">{event.id}</code>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Entity ID:</span>{' '}
                  <code className="rounded bg-slate-200 px-1 text-xs">{event.entityId}</code>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Tenant ID:</span>{' '}
                  <code className="rounded bg-slate-200 px-1 text-xs">{event.tenantId}</code>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Actor:</span>{' '}
                  {getActorTypeLabel(event.actorType)} ({event.actorId})
                </div>
                <div>
                  <span className="font-medium text-slate-600">Timestamp:</span>{' '}
                  {formatAuditDate(event.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <div className="text-sm text-slate-600">
        Showing {startItem}-{endItem} of {total} events
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { onPageChange(page - 1); }}
          disabled={page <= 1}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
        >
          Previous
        </button>
        <span className="self-center text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => { onPageChange(page + 1); }}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function PolicyAuditDashboard({ accessToken }: PolicyAuditDashboardProps) {
  const [state, setState] = useState<PolicyAuditState>({
    events: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: true,
    error: null,
  });

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [tenantFilter, setTenantFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAuditLog = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const startDate = getDateFromPreset(datePreset);
      const tenantId = tenantFilter || undefined;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (tenantId) params.append('tenantId', tenantId);
      params.append('page', state.page.toString());
      params.append('pageSize', state.pageSize.toString());

      const response = await fetch(`/api/audit/policies?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch policy audit log');
      }

      const data = await response.json() as { events?: PolicyAuditEvent[]; total?: number };
      
      setState((prev) => ({
        ...prev,
        events: data.events ?? [],
        total: data.total ?? 0,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }));
    }
  }, [accessToken, datePreset, tenantFilter, state.page, state.pageSize]);

  useEffect(() => {
    void fetchAuditLog();
  }, [fetchAuditLog]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setState((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleTenantFilterChange = (tenantId: string) => {
    setTenantFilter(tenantId);
    setState((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setState((prev) => ({ ...prev, page }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Policy Audit Log</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track all policy document changes across tenants. See who made changes, when, and what was modified.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <FilterControls
          datePreset={datePreset}
          onDatePresetChange={handleDatePresetChange}
          tenantFilter={tenantFilter}
          onTenantFilterChange={handleTenantFilterChange}
        />
      </div>

      {/* Error State */}
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
            onClick={fetchAuditLog}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {state.loading && (
        <div className="rounded-lg border bg-white p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading audit events...</p>
          </div>
        </div>
      )}

      {/* Events List */}
      {!state.loading && !state.error && (
        <div className="overflow-hidden rounded-lg border bg-white">
          {state.events.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No audit events</h3>
              <p className="mt-1 text-sm text-slate-500">
                No policy changes found for the selected time range.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {state.events.map((event) => (
                  <AuditEventRow
                    key={event.id}
                    event={event}
                    isExpanded={expandedId === event.id}
                    onToggle={() => { toggleExpanded(event.id); }}
                  />
                ))}
              </div>
              <Pagination
                page={state.page}
                pageSize={state.pageSize}
                total={state.total}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {!state.loading && !state.error && state.events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-slate-500">Total Events</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{state.total}</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-slate-500">User Changes</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {state.events.filter((e) => e.actorType === 'USER').length}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-slate-500">System Changes</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {state.events.filter((e) => e.actorType === 'SYSTEM').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
