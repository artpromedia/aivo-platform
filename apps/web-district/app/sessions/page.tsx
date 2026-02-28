'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../providers';

// ============================================================================
// Types
// ============================================================================

interface Session {
  id: string;
  learnerName: string;
  schoolName: string | null;
  classroomName: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
}

interface SessionsResponse {
  items: Session[];
  total: number;
}

// ============================================================================
// Helpers
// ============================================================================

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'in_progress':
    case 'active':
      return 'warning';
    default:
      return 'neutral';
  }
}

// ============================================================================
// Component
// ============================================================================

export default function SessionsPage() {
  const { accessToken } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/sessions', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);
        const data = (await res.json()) as SessionsResponse;
        setSessions(data.items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  const filtered = search
    ? sessions.filter(
        (s) =>
          s.learnerName.toLowerCase().includes(search.toLowerCase()) ||
          (s.schoolName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (s.classroomName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : sessions;

  return (
    <section className="space-y-5" data-testid="sessions-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="District" className="text-headline font-semibold">
          Sessions
        </Heading>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search sessions..."
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
        title="All Sessions"
        subtitle={`${filtered.length} session${filtered.length !== 1 ? 's' : ''}`}
      >
        {loading ? (
          <div className="p-8 text-center text-muted">Loading sessions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {search ? 'No sessions match your search.' : 'No sessions found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Learner</th>
                  <th className="px-4 py-3 text-left font-semibold">School</th>
                  <th className="px-4 py-3 text-left font-semibold">Classroom</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Started</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filtered.map((session) => (
                  <tr key={session.id} className="transition hover:bg-surface-muted/80">
                    <td className="px-4 py-3 font-medium text-text">{session.learnerName}</td>
                    <td className="px-4 py-3 text-muted">{session.schoolName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{session.classroomName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(session.status)}>
                        {session.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {session.durationMinutes != null ? `${session.durationMinutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/sessions/${session.id}/summary`}>
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
