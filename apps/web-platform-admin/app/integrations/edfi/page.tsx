'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '../../providers';

interface EdFiConfig {
  id: string;
  tenantId: string;
  tenantName: string;
  baseUrl: string;
  schoolYear: number;
  enabled: boolean;
  lastExportAt: string | null;
  lastExportStatus: 'success' | 'failed' | 'in_progress' | null;
  createdAt: string;
}

interface ExportHistoryEntry {
  id: string;
  configId: string;
  status: 'success' | 'failed' | 'in_progress' | 'queued';
  startedAt: string;
  completedAt: string | null;
  recordsExported: number | null;
  errorMessage: string | null;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  queued: 'bg-slate-100 text-slate-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EdFiIntegrationPage() {
  const { isAuthenticated } = useAuth();
  const [configs, setConfigs] = useState<EdFiConfig[]>([]);
  const [exportHistory] = useState<ExportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringExport, setTriggeringExport] = useState<string | null>(null);

  // Fetch configs on mount
  useState(() => {
    if (!isAuthenticated) return;
    fetch('/api/v1/edfi/configs')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch Ed-Fi configurations');
        return res.json();
      })
      .then((data: { data?: EdFiConfig[] }) => {
        setConfigs(data.data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load configurations');
        setLoading(false);
      });
  });

  async function triggerExport(configId: string) {
    setTriggeringExport(configId);
    try {
      const res = await fetch(`/api/v1/edfi/configs/${configId}/export`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger export');
      // Refresh configs after triggering
      const updated = await fetch('/api/v1/edfi/configs');
      if (updated.ok) {
        const data = (await updated.json()) as { data?: EdFiConfig[] };
        setConfigs(data.data ?? []);
      }
    } catch {
      setError('Failed to trigger export. Please try again.');
    } finally {
      setTriggeringExport(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-slate-600">Please log in to access integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-900">Ed-Fi Integration</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ed-Fi State Reporting</h1>
          <p className="text-sm text-slate-500">
            Manage Ed-Fi configurations and trigger data exports for state compliance
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={() => { setError(null); }}
            className="ml-4 text-red-900 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Configurations */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Ed-Fi Configurations</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading configurations...</div>
        ) : configs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">No Ed-Fi configurations found.</p>
            <p className="mt-1 text-sm text-slate-400">
              Contact support to set up Ed-Fi integration for a district.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">District</th>
                <th className="px-6 py-3 font-medium">School Year</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Last Export</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {configs.map((config) => (
                <tr key={config.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{config.tenantName}</div>
                    <div className="text-xs text-slate-500">{config.baseUrl}</div>
                  </td>
                  <td className="px-6 py-4">{config.schoolYear}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        config.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {config.lastExportAt ? (
                      <div>
                        <div className="text-sm">{formatDate(config.lastExportAt)}</div>
                        {config.lastExportStatus && (
                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[config.lastExportStatus] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {config.lastExportStatus.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => triggerExport(config.id)}
                      disabled={!config.enabled || triggeringExport === config.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {triggeringExport === config.id ? 'Exporting...' : 'Trigger Export'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Export History */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Recent Export History</h2>
        </div>

        {exportHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No export history available. Trigger an export to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Records</th>
                <th className="px-6 py-3 font-medium">Completed</th>
                <th className="px-6 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exportHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm">{formatDate(entry.startedAt)}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[entry.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {entry.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {entry.recordsExported?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {entry.completedAt ? formatDate(entry.completedAt) : '—'}
                  </td>
                  <td className="px-6 py-3 text-sm text-red-600">
                    {entry.errorMessage ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
