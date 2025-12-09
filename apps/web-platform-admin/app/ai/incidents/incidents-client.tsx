'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import type {
  AiIncidentListItem,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from '../../../lib/types';
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES, INCIDENT_STATUSES } from '../../../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface IncidentsClientProps {
  incidents: AiIncidentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SEVERITY_BADGES: Record<IncidentSeverity, { bg: string; text: string }> = {
  INFO: { bg: 'bg-slate-100', text: 'text-slate-700' },
  LOW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
};

const STATUS_BADGES: Record<IncidentStatus, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-red-100', text: 'text-red-700' },
  INVESTIGATING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-700' },
  DISMISSED: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  SAFETY: '🛡️ Safety',
  PRIVACY: '🔒 Privacy',
  COMPLIANCE: '📋 Compliance',
  PERFORMANCE: '⚡ Performance',
  COST: '💰 Cost',
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function IncidentsClient({ incidents, total, page, pageSize }: IncidentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  const [filters, setFilters] = useState({
    severity: searchParams.get('severity') ?? '',
    category: searchParams.get('category') ?? '',
    status: searchParams.get('status') ?? '',
    search: searchParams.get('search') ?? '',
  });

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.category) params.set('category', filters.category);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    params.set('page', '1');
    router.push(`/ai/incidents?${params.toString()}`);
  }, [filters, router]);

  const clearFilters = useCallback(() => {
    setFilters({ severity: '', category: '', status: '', search: '' });
    router.push('/ai/incidents');
  }, [router]);

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(newPage));
      router.push(`/ai/incidents?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI Incidents</h1>
        <div className="text-sm text-slate-500">{total} total incidents</div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => {
              setFilters((f) => ({ ...f, search: e.target.value }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
            placeholder="Tenant name or incident title..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="severity" className="mb-1 block text-xs font-medium text-slate-600">
            Severity
          </label>
          <select
            id="severity"
            value={filters.severity}
            onChange={(e) => {
              setFilters((f) => ({ ...f, severity: e.target.value }));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {INCIDENT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-xs font-medium text-slate-600">
            Category
          </label>
          <select
            id="category"
            value={filters.category}
            onChange={(e) => {
              setFilters((f) => ({ ...f, category: e.target.value }));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value }));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Incident</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tenant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Occurrences
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {incidents.map((incident) => (
              <tr key={incident.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/ai/incidents/${incident.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {incident.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/tenants/${incident.tenantId}`}
                    className="text-slate-600 hover:text-blue-600"
                  >
                    {incident.tenantName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{CATEGORY_LABELS[incident.category]}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGES[incident.severity].bg} ${SEVERITY_BADGES[incident.severity].text}`}
                  >
                    {incident.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[incident.status].bg} ${STATUS_BADGES[incident.status].text}`}
                  >
                    {incident.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {incident.occurrenceCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(incident.lastSeenAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No incidents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                goToPage(page - 1);
              }}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => {
                goToPage(page + 1);
              }}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
