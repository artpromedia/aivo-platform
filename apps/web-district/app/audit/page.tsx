'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../providers';

// ============================================================================
// Types
// ============================================================================

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  details: string | null;
  createdAt: string;
}

interface AuditResponse {
  items: AuditEntry[];
  total: number;
}

// ============================================================================
// Helpers
// ============================================================================

function actionTone(action: string): 'success' | 'warning' | 'error' | 'neutral' {
  const lower = action.toLowerCase();
  if (lower.includes('create') || lower.includes('add')) return 'success';
  if (lower.includes('delete') || lower.includes('remove')) return 'error';
  if (lower.includes('update') || lower.includes('edit')) return 'warning';
  return 'neutral';
}

// ============================================================================
// Component
// ============================================================================

export default function AuditPage() {
  const { accessToken } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/audit', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error(`Failed to load audit log (${res.status})`);
        const data = (await res.json()) as AuditResponse;
        setEntries(data.items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  const filtered = search
    ? entries.filter(
        (e) =>
          e.action.toLowerCase().includes(search.toLowerCase()) ||
          e.userName.toLowerCase().includes(search.toLowerCase()) ||
          e.entityType.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <section className="space-y-5" data-testid="audit-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Governance" className="text-headline font-semibold">
          Audit Log
        </Heading>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search audit entries..."
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
        title="Audit Trail"
        subtitle={`${filtered.length} entr${filtered.length !== 1 ? 'ies' : 'y'}`}
      >
        {loading ? (
          <div className="p-8 text-center text-muted">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {search ? 'No entries match your search.' : 'No audit entries found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Entity</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                  <th className="px-4 py-3 text-right font-semibold">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="transition hover:bg-surface-muted/80">
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-text">{entry.userName}</td>
                    <td className="px-4 py-3">
                      <Badge tone={actionTone(entry.action)}>
                        {entry.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {entry.entityType} ({entry.entityId.slice(0, 8)}…)
                    </td>
                    <td className="px-4 py-3 text-muted max-w-xs truncate">
                      {entry.details ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.entityType === 'LEARNER' ? (
                        <Link href={`/audit/learner/${entry.entityId}`}>
                          <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                            View
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
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
