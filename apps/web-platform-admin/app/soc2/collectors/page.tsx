'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import type { CollectorView, CollectionRunView } from '../../../lib/soc2-types';

const subLinks = [
  { href: '/soc2', label: 'Freshness Overview' },
  { href: '/soc2/controls', label: 'Control Matrix' },
  { href: '/soc2/evidence', label: 'Evidence Browser' },
  { href: '/soc2/packages', label: 'Audit Packages' },
  { href: '/soc2/collectors', label: 'Collectors' },
];

export default function CollectorsPage() {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [collectors, setCollectors] = useState<CollectorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<CollectionRunView[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [triggerAllLoading, setTriggerAllLoading] = useState(false);

  const fetchCollectors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/soc2/collectors', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CollectorView[];
      setCollectors(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchCollectors();
  }, [fetchCollectors]);

  const fetchRuns = async (collectorId: string) => {
    setRunsLoading(true);
    try {
      const res = await fetch(`/api/soc2/collectors/${collectorId}/runs`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CollectionRunView[];
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setRuns([]);
    } else {
      setExpandedId(id);
      void fetchRuns(id);
    }
  };

  const triggerCollector = async (id: string) => {
    setTriggeringId(id);
    try {
      await fetch(`/api/soc2/collectors/${id}/trigger`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      void fetchCollectors();
      if (expandedId === id) void fetchRuns(id);
    } catch {
      // ignore
    } finally {
      setTriggeringId(null);
    }
  };

  const triggerAll = async () => {
    setTriggerAllLoading(true);
    try {
      await fetch('/api/soc2/collectors/trigger-all', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      void fetchCollectors();
    } catch {
      // ignore
    } finally {
      setTriggerAllLoading(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/soc2/collectors/${id}/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ enabled }),
      });
      void fetchCollectors();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Evidence Collectors</h1>
        <button
          type="button"
          onClick={() => void triggerAll()}
          disabled={triggerAllLoading}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition disabled:opacity-50"
        >
          {triggerAllLoading ? 'Running...' : 'Trigger All'}
        </button>
      </div>

      <nav className="flex gap-2 border-b border-border pb-2" aria-label="SOC 2 navigation">
        {subLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              pathname === link.href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {collectors.map((collector) => (
            <div key={collector.id} className="rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => toggleExpand(collector.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {collector.name}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      collector.registered
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {collector.registered ? 'Active' : 'Not registered'}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {collector.frequency}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {collector.controlCount} controls
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{collector.description}</p>
                </button>

                <div className="flex items-center gap-2 ml-4">
                  {collector.schedule && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void toggleEnabled(collector.id, !collector.schedule?.enabled); }}
                      className={`rounded px-2 py-1 text-xs font-medium transition ${
                        collector.schedule.enabled
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {collector.schedule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void triggerCollector(collector.id); }}
                    disabled={triggeringId === collector.id}
                    className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition disabled:opacity-50"
                  >
                    {triggeringId === collector.id ? 'Running...' : 'Run Now'}
                  </button>
                </div>
              </div>

              {/* Schedule info */}
              {collector.schedule && (
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex gap-4">
                  <span>Cron: <code className="font-mono">{collector.schedule.cronExpr}</code></span>
                  <span>Last run: {collector.schedule.lastRunAt ? new Date(collector.schedule.lastRunAt).toLocaleString() : '—'}</span>
                  <span>Next run: {collector.schedule.nextRunAt ? new Date(collector.schedule.nextRunAt).toLocaleString() : '—'}</span>
                </div>
              )}

              {/* Expanded: run history */}
              {expandedId === collector.id && (
                <div className="border-t border-border px-4 py-3">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Run History</h4>
                  {runsLoading && (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  )}
                  {!runsLoading && runs.length === 0 && (
                    <p className="text-xs text-muted-foreground">No runs yet</p>
                  )}
                  {!runsLoading && runs.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="px-2 py-1">Status</th>
                            <th className="px-2 py-1">Triggered By</th>
                            <th className="px-2 py-1">Started</th>
                            <th className="px-2 py-1">Duration</th>
                            <th className="px-2 py-1">Evidence</th>
                            <th className="px-2 py-1">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {runs.map((run) => (
                            <tr key={run.id}>
                              <td className="px-2 py-1">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  run.status === 'success'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : run.status === 'failure'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {run.status}
                                </span>
                              </td>
                              <td className="px-2 py-1">{run.triggeredBy}</td>
                              <td className="px-2 py-1">{new Date(run.startedAt).toLocaleString()}</td>
                              <td className="px-2 py-1">
                                {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                              </td>
                              <td className="px-2 py-1 text-center">{run.evidenceCount}</td>
                              <td className="px-2 py-1 text-red-600 max-w-[200px] truncate">
                                {run.error ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-muted-foreground">Loading collectors...</div>
      )}
    </div>
  );
}
