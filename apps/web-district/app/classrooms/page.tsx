'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../providers';

// ============================================================================
// Types
// ============================================================================

interface Classroom {
  id: string;
  name: string;
  gradeLevel: string | null;
  school: { id: string; name: string } | null;
  learnerCount: number;
  createdAt: string;
}

interface ClassroomsResponse {
  items: Classroom[];
  total: number;
}

// ============================================================================
// Component
// ============================================================================

export default function ClassroomsPage() {
  const { accessToken } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/classrooms', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error(`Failed to load classrooms (${res.status})`);
        const data = (await res.json()) as ClassroomsResponse;
        setClassrooms(data.items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load classrooms');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  const filtered = search
    ? classrooms.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.school?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : classrooms;

  return (
    <section className="space-y-5" data-testid="classrooms-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="District" className="text-headline font-semibold">
          Classrooms
        </Heading>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search classrooms..."
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
        </div>
      )}

      {/* Table */}
      <Card
        title="All Classrooms"
        subtitle={`${filtered.length} classroom${filtered.length !== 1 ? 's' : ''}`}
      >
        {loading ? (
          <div className="p-8 text-center text-muted">Loading classrooms...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {search ? 'No classrooms match your search.' : 'No classrooms found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Classroom</th>
                  <th className="px-4 py-3 text-left font-semibold">School</th>
                  <th className="px-4 py-3 text-left font-semibold">Grade</th>
                  <th className="px-4 py-3 text-left font-semibold">Learners</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filtered.map((cr) => (
                  <tr key={cr.id} className="transition hover:bg-surface-muted/80">
                    <td className="px-4 py-3 font-medium text-text">{cr.name}</td>
                    <td className="px-4 py-3 text-muted">{cr.school?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      {cr.gradeLevel ? <Badge tone="neutral">{cr.gradeLevel}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">{cr.learnerCount}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(cr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/classrooms/${cr.id}/summary`}>
                        <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                          View
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
