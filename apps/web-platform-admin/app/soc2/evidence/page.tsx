'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import type { EvidenceRecord, EvidenceListResponse, TrustServiceCategory } from '../../../lib/soc2-types';

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

export default function EvidencePage() {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterControlId, setFilterControlId] = useState('');
  const [filterCollectorId, setFilterCollectorId] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      if (filterControlId) params.set('controlId', filterControlId);
      if (filterCollectorId) params.set('collectorId', filterCollectorId);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));
      const res = await fetch(`/api/soc2/evidence?${params}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as EvidenceListResponse;
      setEvidence(data.evidence);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterCategory, filterControlId, filterCollectorId, page]);

  useEffect(() => {
    void fetchEvidence();
  }, [fetchEvidence]);

  const totalPages = Math.ceil(total / limit);

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/soc2/evidence/${id}/download`, {
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
      <h1 className="text-2xl font-bold text-foreground">Evidence Browser</h1>

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
          onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Control ID..."
          value={filterControlId}
          onChange={(e) => { setFilterControlId(e.target.value); setPage(0); }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm w-32"
        />

        <input
          type="text"
          placeholder="Collector ID..."
          value={filterCollectorId}
          onChange={(e) => { setFilterCollectorId(e.target.value); setPage(0); }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm w-40"
        />

        <span className="self-center text-sm text-muted-foreground">
          {total} records
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Control</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Collector</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Format</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Size</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Collected</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">SHA-256</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {evidence.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-muted/50 transition">
                    <td className="px-4 py-3 font-mono text-xs">{rec.controlId}</td>
                    <td className="px-4 py-3 text-xs">{rec.collectorId}</td>
                    <td className="px-4 py-3 text-xs">{rec.category}</td>
                    <td className="px-4 py-3 text-xs uppercase">{rec.format}</td>
                    <td className="px-4 py-3 text-xs">{formatBytes(rec.sizeBytes)}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(rec.collectedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground max-w-[100px] truncate" title={rec.sha256}>
                      {rec.sha256.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleDownload(rec.id)}
                        className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="py-12 text-center text-muted-foreground">Loading evidence...</div>
      )}
    </div>
  );
}
