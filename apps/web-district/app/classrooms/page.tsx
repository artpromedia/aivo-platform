'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
// Helpers
// ============================================================================

// ============================================================================
// Component
// ============================================================================

export default function ClassroomsPage() {
  const router = useRouter();
  const { tenantId: authTenantId } = useAuth();
  const tenantId = authTenantId ?? '';
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);

  const loadClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/classrooms?tenantId=${tenantId}`);
      if (!res.ok) throw new Error(`Failed to load classrooms (${res.status})`);
      const data = (await res.json()) as ClassroomsResponse;
      setClassrooms(data.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClassrooms();
  }, [loadClassrooms]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      const res = await fetch(
        `/api/classrooms/${deleteTarget.id}?tenantId=${tenantId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete classroom');
      setDeleteTarget(null);
      await loadClassrooms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete classroom');
    } finally {
      setDeleting(null);
    }
  }

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
        <Link href="/classrooms/create">
          <Button variant="primary" data-testid="create-classroom-btn">
            Create Classroom
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search classrooms..."
          data-testid="classroom-search"
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
          <div className="p-8 text-center text-muted" data-testid="classrooms-empty">
            {search
              ? 'No classrooms match your search.'
              : 'No classrooms found. Create one or sync from your SIS.'}
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
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/classrooms/${cr.id}`}>
                          <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                            View
                          </Button>
                        </Link>
                        <button
                          type="button"
                          title="Edit classroom"
                          data-testid={`edit-classroom-${cr.id}`}
                          onClick={() => { router.push(`/classrooms/${cr.id}`); }}
                          className="rounded p-1.5 text-muted hover:bg-surface-muted hover:text-text"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Delete classroom"
                          data-testid={`delete-classroom-${cr.id}`}
                          onClick={() => { setDeleteTarget(cr); }}
                          className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="delete-confirm-dialog">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-text">Delete Classroom</h3>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                data-testid="delete-cancel"
                onClick={() => { setDeleteTarget(null); }}
                disabled={deleting === deleteTarget.id}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                data-testid="delete-confirm"
                onClick={() => void handleDelete()}
                disabled={deleting === deleteTarget.id}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting === deleteTarget.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
