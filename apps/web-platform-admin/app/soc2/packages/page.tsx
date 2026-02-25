'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import type { AuditPackageView, TrustServiceCategory } from '../../../lib/soc2-types';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PackagesPage() {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [packages, setPackages] = useState<AuditPackageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TrustServiceCategory[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/soc2/packages', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AuditPackageView[];
      setPackages(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        periodStart,
        periodEnd,
        includeMarkdown: true,
        includeRawJson: true,
      };
      if (selectedCategories.length > 0) {
        body.categories = selectedCategories;
      }
      const res = await fetch('/api/soc2/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowCreate(false);
      setPeriodStart('');
      setPeriodEnd('');
      setSelectedCategories([]);
      void fetchPackages();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create package');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/soc2/packages/${id}/download`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = (await res.json()) as { url: string };
      window.open(data.url, '_blank');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Audit Packages</h1>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition"
        >
          {showCreate ? 'Cancel' : 'Generate Package'}
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

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Generate Audit Package</h2>
          <p className="text-sm text-muted-foreground">
            Create a ZIP archive containing all evidence for the specified period. This is
            the package you give to your SOC 2 auditor.
          </p>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Categories (leave empty for all)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategories((prev) =>
                      prev.includes(cat)
                        ? prev.filter((c) => c !== cat)
                        : [...prev, cat],
                    );
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    selectedCategories.includes(cat)
                      ? 'bg-primary text-white'
                      : 'bg-surface-muted text-muted-foreground hover:bg-surface-muted/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !periodStart || !periodEnd}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {creating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Packages list */}
      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Period</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Categories</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Controls</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Evidence</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-surface-muted/50 transition">
                  <td className="px-4 py-3 text-xs">
                    {pkg.periodStart.slice(0, 10)} — {pkg.periodEnd.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {pkg.categories.join(', ') || 'All'}
                  </td>
                  <td className="px-4 py-3 text-center">{pkg.controlCount}</td>
                  <td className="px-4 py-3 text-center">{pkg.evidenceCount}</td>
                  <td className="px-4 py-3 text-xs">{formatBytes(pkg.sizeBytes)}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(pkg.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleDownload(pkg.id)}
                      className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No audit packages generated yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-muted-foreground">Loading packages...</div>
      )}
    </div>
  );
}
