'use client';

import { Badge, Button, Card, GradeThemeToggle, Heading, useGradeTheme } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface School {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

const TENANT_ID =
  typeof window !== 'undefined'
    ? (/aivo_tenant_id=([^;]+)/.exec(document.cookie)?.[1] ?? 'default')
    : 'default';

function downloadCsv(schools: School[]) {
  const header = 'Name,Address,External ID,Created';
  const rows = schools.map(
    (s) =>
      `"${s.name}","${s.address ?? ''}","${s.externalId ?? ''}","${new Date(s.createdAt).toLocaleDateString()}"`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schools-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Component
// ============================================================================

export default function SchoolsPage() {
  const { themeId, themeLabels } = useGradeTheme();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadSchools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/schools?tenantId=${TENANT_ID}`);
      if (!res.ok) throw new Error(`Failed to load schools (${res.status})`);
      const data = (await res.json()) as { items: School[] };
      setSchools(data.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  const filtered = search
    ? schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : schools;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Roster" className="text-headline font-semibold">
          Schools
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <GradeThemeToggle />
          <Link href="/schools/create">
            <Button variant="primary">Add School</Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search schools..."
          data-testid="school-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={() => {
              void loadSchools();
            }}
            className="ml-4 text-red-900 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <Card
        title="School roster"
        subtitle={`Theme: ${themeLabels[themeId] ?? themeId}`}
        action={
          <Button
            variant="ghost"
            onClick={() => {
              downloadCsv(filtered);
            }}
          >
            Export
          </Button>
        }
      >
        {loading ? (
          <div className="p-8 text-center text-muted">Loading schools...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {search ? 'No schools match your search.' : 'No schools found.'}
          </div>
        ) : (
          <div className="schools-table overflow-x-auto" data-testid="schools-list">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">School</th>
                  <th className="px-4 py-3 text-left font-semibold">Address</th>
                  <th className="px-4 py-3 text-left font-semibold">External ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filtered.map((school) => (
                  <tr
                    key={school.id}
                    className="school-card transition hover:bg-surface-muted/80"
                    data-testid={`school-${school.id}`}
                  >
                    <td className="px-4 py-3 font-medium text-text">{school.name}</td>
                    <td className="px-4 py-3 text-muted">{school.address ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      {school.externalId ? <Badge tone="neutral">{school.externalId}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/schools/${school.id}`}>
                        <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
