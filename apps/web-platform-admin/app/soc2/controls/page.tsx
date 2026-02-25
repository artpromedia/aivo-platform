'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import type { ControlView, TrustServiceCategory } from '../../../lib/soc2-types';
import { HEALTH_COLORS, CATEGORY_SECTIONS } from '../../../lib/soc2-types';

const subLinks = [
  { href: '/soc2', label: 'Freshness Overview' },
  { href: '/soc2/controls', label: 'Control Matrix' },
  { href: '/soc2/evidence', label: 'Evidence Browser' },
  { href: '/soc2/packages', label: 'Audit Packages' },
  { href: '/soc2/collectors', label: 'Collectors' },
];

const CATEGORIES: TrustServiceCategory[] = [
  'Security',
  'Availability',
  'Processing Integrity',
  'Confidentiality',
  'Privacy',
];

export default function ControlsPage() {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [controls, setControls] = useState<ControlView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<TrustServiceCategory | ''>('');
  const [filterHealth, setFilterHealth] = useState<'' | 'green' | 'yellow' | 'red'>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchControls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      const qs = params.toString();
      const res = await fetch(`/api/soc2/controls${qs ? `?${qs}` : ''}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ControlView[];
      setControls(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterCategory]);

  useEffect(() => {
    void fetchControls();
  }, [fetchControls]);

  const filtered = controls.filter((c) => {
    if (filterHealth && c.health !== filterHealth) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.id.toLowerCase().includes(term) ||
        c.title.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">SOC 2 Control Matrix</h1>

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as TrustServiceCategory | '')}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterHealth}
          onChange={(e) => setFilterHealth(e.target.value as '' | 'green' | 'yellow' | 'red')}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All Health</option>
          <option value="green">Green (Current)</option>
          <option value="yellow">Yellow (Stale)</option>
          <option value="red">Red (Missing)</option>
        </select>

        <input
          type="text"
          placeholder="Search controls..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />

        <span className="self-center text-sm text-muted-foreground">
          {filtered.length} of {controls.length} controls
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Control table */}
      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Control ID</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Frequency</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Health</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Evidence</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Last Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((control) => {
                const hc = HEALTH_COLORS[control.health];
                return (
                  <tr key={control.id} className="hover:bg-surface-muted/50 transition">
                    <td className="px-4 py-3 font-mono text-xs">{control.id}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={control.description}>
                      {control.title}
                    </td>
                    <td className="px-4 py-3">{control.category}</td>
                    <td className="px-4 py-3 capitalize">{control.frequency}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${hc.bg} ${hc.text}`}>
                        {hc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{control.evidenceCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {control.lastEvidenceAt
                        ? new Date(control.lastEvidenceAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-muted-foreground">Loading controls...</div>
      )}
    </div>
  );
}
