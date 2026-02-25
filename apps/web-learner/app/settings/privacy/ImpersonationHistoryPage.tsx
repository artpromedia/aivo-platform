'use client';

import { useCallback, useEffect, useState } from 'react';

interface ImpersonationRecord {
  id: string;
  adminUserId: string;
  reason: string;
  readOnly: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface PaginatedResult {
  data: ImpersonationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ record }: { record: ImpersonationRecord }) {
  const now = Date.now();
  const isRevoked = record.revokedAt != null;
  const isExpired = new Date(record.expiresAt).getTime() < now;

  if (isRevoked) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        Revoked
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Active
    </span>
  );
}

export default function ImpersonationHistoryPage() {
  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/settings/privacy?page=${pageNumber}&limit=10`,
        { credentials: 'same-origin' },
      );
      if (!res.ok) {
        throw new Error('Failed to fetch impersonation history');
      }
      const data = (await res.json()) as PaginatedResult;
      setResult(data);
      setPage(pageNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory(1);
  }, [fetchHistory]);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Privacy &amp; Access History
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View when support staff have accessed your account for troubleshooting
          purposes. All access is logged and audited.
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-blue-500 mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium">About Support Access</p>
            <p className="mt-1">
              Authorized support staff may temporarily access your account to
              help resolve issues you&apos;ve reported. All sessions are
              time-limited, logged, and typically read-only. You can see a
              complete record of these access sessions below.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && result?.data.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-900">
            No support access recorded
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Your account has not been accessed by support staff.
          </p>
        </div>
      )}

      {!loading && !error && result && result.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {result.data.map((record) => {
                const start = new Date(record.createdAt);
                const end = record.revokedAt
                  ? new Date(record.revokedAt)
                  : new Date(record.expiresAt);
                const durationMs = end.getTime() - start.getTime();
                const durationMin = Math.round(durationMs / 60_000);

                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {record.reason}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {record.readOnly ? (
                        <span className="text-green-700">Read-only</span>
                      ) : (
                        <span className="text-amber-700">Full access</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {durationMin < 60
                        ? `${durationMin}m`
                        : `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge record={record} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-500">
                Page {result.page} of {result.totalPages} ({result.total}{' '}
                total)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => fetchHistory(page - 1)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= result.totalPages}
                  onClick={() => fetchHistory(page + 1)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
