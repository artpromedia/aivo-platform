/**
 * Audit Log Viewer Component
 *
 * View and filter platform-wide audit logs.
 * Based on AuditTrail from aivo-agentic-ai-platform.
 */

'use client';

import * as React from 'react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
    tenant?: string;
  };
  action: string;
  category: 'auth' | 'data' | 'config' | 'admin' | 'api' | 'security';
  resource: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'failure' | 'warning';
}

// Mock data
const mockLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2026-01-10T14:32:15Z',
    actor: { id: 'u1', name: 'Admin User', role: 'platform_admin' },
    action: 'model.deploy',
    category: 'admin',
    resource: 'AI Model: Tutor Core v3.2.1',
    details: 'Deployed model to production environment',
    ipAddress: '10.0.1.45',
    status: 'success',
  },
  {
    id: '2',
    timestamp: '2026-01-10T14:28:00Z',
    actor: { id: 'u2', name: 'Sarah Johnson', role: 'tenant_admin', tenant: 'Springfield SD' },
    action: 'user.create',
    category: 'data',
    resource: 'User: teacher@springfield.edu',
    details: 'Created new teacher account',
    ipAddress: '192.168.1.100',
    status: 'success',
  },
  {
    id: '3',
    timestamp: '2026-01-10T14:15:22Z',
    actor: { id: 'sys', name: 'System', role: 'system' },
    action: 'backup.complete',
    category: 'admin',
    resource: 'Database: primary',
    details: 'Daily backup completed successfully',
    ipAddress: '10.0.0.1',
    status: 'success',
  },
  {
    id: '4',
    timestamp: '2026-01-10T13:45:00Z',
    actor: { id: 'u3', name: 'Unknown', role: 'anonymous' },
    action: 'auth.login_failed',
    category: 'security',
    resource: 'Account: admin@company.com',
    details: 'Failed login attempt (3rd attempt)',
    ipAddress: '45.33.22.11',
    status: 'failure',
  },
  {
    id: '5',
    timestamp: '2026-01-10T13:30:00Z',
    actor: { id: 'u4', name: 'Mike Chen', role: 'platform_admin' },
    action: 'config.update',
    category: 'config',
    resource: 'Feature Flag: new_dashboard',
    details: 'Enabled new dashboard for 25% of users',
    ipAddress: '10.0.1.50',
    status: 'success',
  },
  {
    id: '6',
    timestamp: '2026-01-10T12:00:00Z',
    actor: { id: 'api', name: 'API Client', role: 'api_service', tenant: 'Riverside Academy' },
    action: 'api.rate_limit',
    category: 'api',
    resource: 'Endpoint: /v2/analytics',
    details: 'Rate limit exceeded (1000 req/min)',
    ipAddress: '192.168.2.50',
    status: 'warning',
  },
];

const categoryColors = {
  auth: 'bg-blue-100 text-blue-700',
  data: 'bg-green-100 text-green-700',
  config: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
  api: 'bg-sky-100 text-sky-700',
  security: 'bg-red-100 text-red-700',
};

const categoryIcons = {
  auth: '🔐',
  data: '📊',
  config: '⚙️',
  admin: '👤',
  api: '🔗',
  security: '🛡️',
};

const statusIcons = {
  success: '✅',
  failure: '❌',
  warning: '⚠️',
};

export function AuditLogViewer() {
  const [logs] = React.useState<AuditLogEntry[]>(mockLogs);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredLogs = React.useMemo(() => {
    let result = logs;
    if (selectedCategory) {
      result = result.filter((log) => log.category === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.resource.toLowerCase().includes(query) ||
          log.actor.name.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query)
      );
    }
    return result;
  }, [logs, selectedCategory, searchQuery]);

  const categories = ['auth', 'data', 'config', 'admin', 'api', 'security'] as const;

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
        {filteredLogs.map((log) => (
          <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${categoryColors[log.category]}`}>
                  {categoryIcons[log.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{statusIcons[log.status]}</span>
                    <span className="font-medium text-gray-900">{log.action}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[log.category]}`}>
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
        ))}
      </div>

      {filteredLogs.length === 0 && (
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

export default AuditLogViewer;
