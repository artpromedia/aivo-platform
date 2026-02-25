'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../providers';
import type { ControlSummary } from '../../lib/soc2-types';
import { HEALTH_COLORS } from '../../lib/soc2-types';

// ══════════════════════════════════════════════════════════════════════════════
// Sub-Navigation
// ══════════════════════════════════════════════════════════════════════════════

const subLinks = [
  { href: '/soc2', label: 'Freshness Overview' },
  { href: '/soc2/controls', label: 'Control Matrix' },
  { href: '/soc2/evidence', label: 'Evidence Browser' },
  { href: '/soc2/packages', label: 'Audit Packages' },
  { href: '/soc2/collectors', label: 'Collectors' },
];

// ══════════════════════════════════════════════════════════════════════════════
// Freshness Dashboard (main page)
// ══════════════════════════════════════════════════════════════════════════════

export default function Soc2Page() {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [summary, setSummary] = useState<ControlSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/soc2/controls/summary', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ControlSummary[];
      setSummary(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const totals = summary.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      green: acc.green + s.green,
      yellow: acc.yellow + s.yellow,
      red: acc.red + s.red,
    }),
    { total: 0, green: 0, yellow: 0, red: 0 },
  );

  const overallHealth =
    totals.total === 0
      ? 0
      : Math.round((totals.green / totals.total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">SOC 2 Evidence Dashboard</h1>
        <button
          type="button"
          onClick={() => void fetchSummary()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition"
        >
          Refresh
        </button>
      </div>

      {/* Sub-navigation */}
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

      {/* Overall health score */}
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Overall Evidence Freshness</p>
        <p className={`text-5xl font-bold ${overallHealth >= 90 ? 'text-emerald-600' : overallHealth >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
          {loading ? '—' : `${overallHealth}%`}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {totals.green} current / {totals.yellow} stale / {totals.red} missing of {totals.total} controls
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Per-category breakdown */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summary.map((cat) => {
            const pct = cat.total > 0 ? Math.round((cat.green / cat.total) * 100) : 0;
            return (
              <div
                key={cat.category}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <h3 className="font-semibold text-foreground">{cat.category}</h3>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{pct}%</span>
                </div>
                <div className="mt-3 flex gap-3 text-xs">
                  {(['green', 'yellow', 'red'] as const).map((h) => (
                    <span
                      key={h}
                      className={`rounded px-2 py-0.5 ${HEALTH_COLORS[h].bg} ${HEALTH_COLORS[h].text}`}
                    >
                      {cat[h]} {HEALTH_COLORS[h].label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
