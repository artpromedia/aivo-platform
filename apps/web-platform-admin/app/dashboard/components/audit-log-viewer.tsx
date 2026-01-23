/**
 * Audit Log Viewer Component
 *
 * View and filter platform-wide audit logs.
 * Now connected to real API endpoints via React Query hooks.
 */

'use client';

import * as React from 'react';
import { useAuditLogs } from '@/hooks/use-admin-data';
import type { AuditLogEntry as APIAuditLogEntry, AuditFilters } from '@/lib/api/audit.api';

type AuditCategory = 'auth' | 'data' | 'config' | 'admin' | 'api' | 'security';
type AuditStatus = 'success' | 'failure' | 'warning';

interface DisplayAuditLog {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
    tenant?: string;
  };
  action: string;
  category: AuditCategory;
  resource: string;
  details: string;
  ipAddress: string;
  status: AuditStatus;
}

// Transform API log to display log
function toDisplayLog(log: APIAuditLogEntry): DisplayAuditLog {
  return {
    id: log.id,
    timestamp: log.timestamp,
    actor: {
      id: log.actor.id,
      name: log.actor.name,
      role: log.actor.role,
      tenant: log.actor.tenantName,
    },
    action: log.action,
    category: (log.category as AuditCategory) || 'data',
    resource: `${log.resourceType}: ${log.resourceId}`,
    details: log.details || '',
    ipAddress: log.metadata?.ipAddress || 'Unknown',
    status: log.severity === 'critical' ? 'failure' : log.severity === 'warning' ? 'warning' : 'success',
  };
}

const categoryColors: Record<AuditCategory, string> = {
  auth: 'bg-blue-100 text-blue-700',
  data: 'bg-green-100 text-green-700',
  config: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
  api: 'bg-sky-100 text-sky-700',
  security: 'bg-red-100 text-red-700',
};

const categoryIcons: Record<AuditCategory, string> = {
  auth: '🔐',
  data: '📊',
  config: '⚙️',
  admin: '👤',
  api: '🔗',
  security: '🛡️',
};

const statusIcons: Record<AuditStatus, string> = {
  success: '✅',
  failure: '❌',
  warning: '⚠️',
};

export function AuditLogViewer() {
  const [selectedCategory, setSelectedCategory] = React.useState<AuditCategory | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Build filters for API call
  const filters: AuditFilters = React.useMemo(() => {
    const f: AuditFilters = {};
    if (selectedCategory) {
      // Map category to resource type if needed
      f.resourceType = selectedCategory;
    }
    if (searchQuery) {
      f.search = searchQuery;
    }
    return f;
  }, [selectedCategory, searchQuery]);

  // Fetch real data from API
  const { 
    data: logsData, 
    isLoading, 
    error, 
    refetch 
  } = useAuditLogs(filters);

  const logs: DisplayAuditLog[] = React.useMemo(() => {
    if (!logsData?.data) return [];
    return logsData.data.map(toDisplayLog);
  }, [logsData]);

  const categories: AuditCategory[] = ['auth', 'data', 'config', 'admin', 'api', 'security'];

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-800">Failed to load audit logs</h3>
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to connect to audit service'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xl">
              📋
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Audit Logs</h2>
              <p className="text-sm text-gray-500">Platform activity and security events</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Export
            </button>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
              Configure Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize flex items-center gap-1 ${
                selectedCategory === cat
                  ? categoryColors[cat]
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{categoryIcons[cat]}</span>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <>
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
          </>
        ) : (
          logs.map((log) => (
            <AuditLogRow key={log.id} log={log} />
          ))
        )}
      </div>

      {!isLoading && logs.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No logs match the current filter.
        </div>
      )}

      {/* Load More */}
      <div className="p-4 border-t border-gray-200 text-center">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Load More Logs
        </button>
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AuditLogRow({ log }: { log: DisplayAuditLog }) {
  const catColor = categoryColors[log.category] || 'bg-gray-100 text-gray-700';
  const catIcon = categoryIcons[log.category] || '📋';
  const statIcon = statusIcons[log.status] || '✅';

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${catColor}`}>
            {catIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{statIcon}</span>
              <span className="font-medium text-gray-900">{log.action}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${catColor}`}>
                {log.category}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{log.resource}</p>
            <p className="text-sm text-gray-500">{log.details}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>👤 {log.actor.name}</span>
              {log.actor.tenant && <span>🏢 {log.actor.tenant}</span>}
              <span>🌐 {log.ipAddress}</span>
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 whitespace-nowrap">
          {formatTimestamp(log.timestamp)}
        </div>
      </div>
    </div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-10 w-10 rounded-lg bg-gray-200" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 w-12 rounded bg-gray-200" />
            </div>
            <div className="h-4 w-48 rounded bg-gray-200 mb-1" />
            <div className="h-3 w-64 rounded bg-gray-200 mb-2" />
            <div className="flex items-center gap-4">
              <div className="h-3 w-20 rounded bg-gray-200" />
              <div className="h-3 w-24 rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="h-4 w-16 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default AuditLogViewer;
