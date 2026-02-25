'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  ImpersonationSessionInfo,
  ImpersonationStartResult,
  ImpersonationUserSearchResult,
} from '@/lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type Tab = 'impersonate' | 'sessions' | 'history';

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ImpersonatePage() {
  const [activeTab, setActiveTab] = useState<Tab>('impersonate');

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Support — User Impersonation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Impersonate users to debug issues. All sessions are logged and audited.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'impersonate', label: 'Impersonate User' },
          { key: 'sessions', label: 'Active Sessions' },
          { key: 'history', label: 'Session History' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'impersonate' && <ImpersonatePanel />}
      {activeTab === 'sessions' && <ActiveSessionsPanel />}
      {activeTab === 'history' && <HistoryPanel />}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPERSONATE PANEL — Search + Start
// ══════════════════════════════════════════════════════════════════════════════

function ImpersonatePanel() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<ImpersonationUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ImpersonationUserSearchResult | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);
  const [readOnly, setReadOnly] = useState(true);
  const [starting, setStarting] = useState(false);
  const [result, setResult] = useState<ImpersonationStartResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async () => {
    if (query.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/support/impersonate?action=search&q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error('Search failed');
      const data = (await res.json()) as { users: ImpersonationUserSearchResult[] };
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const startImpersonation = async () => {
    if (!selectedUser) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/support/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          targetTenantId: selectedUser.tenantId,
          reason,
          durationMinutes: duration,
          readOnly,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? 'Failed to start impersonation');
      }
      const data = (await res.json()) as ImpersonationStartResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start impersonation');
    } finally {
      setStarting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="text-lg font-semibold text-emerald-800">Impersonation Session Started</h3>
          <p className="mt-2 text-sm text-emerald-700">
            You are now impersonating user {result.targetUserId}.
            The session expires at {new Date(result.expiresAt).toLocaleString()}.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-emerald-800">Session ID:</dt>
              <dd className="font-mono text-emerald-700">{result.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-emerald-800">Mode:</dt>
              <dd className="text-emerald-700">{result.readOnly ? 'Read-only' : 'Full access'}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <label className="block text-sm font-medium text-emerald-800">
              Impersonation Token
            </label>
            <textarea
              readOnly
              value={result.token}
              rows={3}
              className="mt-1 w-full rounded-md border border-emerald-300 bg-white p-2 font-mono text-xs text-emerald-900"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <p className="mt-1 text-xs text-emerald-600">
              Use this token as a Bearer token to make requests as the impersonated user.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setSelectedUser(null);
            setReason('');
          }}
          className="rounded-md bg-surface-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted/80"
        >
          Start New Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Search for a user by email, name, or ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., john@example.com"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void searchUsers();
            }}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => void searchUsers()}
            disabled={searching || query.length < 2}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* User Results */}
      {users.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  Roles
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {users.map((user) => (
                <tr key={user.id} className={selectedUser?.id === user.id ? 'bg-primary/5' : ''}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    <div className="font-mono text-xs text-muted-foreground/70">{user.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            role === 'PLATFORM_ADMIN'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-surface-muted text-muted-foreground'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.status}</td>
                  <td className="px-4 py-3 text-right">
                    {user.roles.includes('PLATFORM_ADMIN') ? (
                      <span className="text-xs text-red-500">Cannot impersonate</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Select
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Impersonation Form */}
      {selectedUser && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-amber-900">
            Impersonate: {selectedUser.firstName} {selectedUser.lastName}
          </h3>
          <p className="text-sm text-amber-700">
            {selectedUser.email} — Tenant: {selectedUser.tenantId}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-amber-900">
                Reason (required, min 10 characters)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Describe the support ticket or issue you are investigating..."
                className="mt-1 w-full rounded-md border border-amber-300 bg-white p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-900">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1 w-24 rounded-md border border-amber-300 bg-white p-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900">Access Mode</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="readOnly"
                    checked={readOnly}
                    onChange={(e) => setReadOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="readOnly" className="text-sm text-amber-800">
                    Read-only mode (recommended)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => void startImpersonation()}
                disabled={starting || reason.trim().length < 10}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {starting ? 'Starting...' : 'Start Impersonation'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-md bg-surface-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE SESSIONS PANEL
// ══════════════════════════════════════════════════════════════════════════════

function ActiveSessionsPanel() {
  const [sessions, setSessions] = useState<ImpersonationSessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/support/impersonate?action=sessions');
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = (await res.json()) as { sessions: ImpersonationSessionInfo[] };
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const revokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/support/impersonate/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'manual_revocation' }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading active sessions...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-500">{error}</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">No active impersonation sessions</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-surface-muted">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Admin
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Target User
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Reason
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Mode
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Expires
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {sessions.map((session) => (
            <tr key={session.id}>
              <td className="px-4 py-3">
                <div className="text-sm text-foreground">{session.adminEmail ?? session.adminUserId}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-foreground">{session.targetEmail ?? session.targetUserId}</div>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
                {session.reason}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.readOnly
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {session.readOnly ? 'Read-only' : 'Full access'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(session.expiresAt).toLocaleTimeString()}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => void revokeSession(session.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY PANEL
// ══════════════════════════════════════════════════════════════════════════════

function HistoryPanel() {
  const [sessions, setSessions] = useState<ImpersonationSessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/impersonate?action=history&page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error('Failed to load history');
      const data = (await res.json()) as {
        sessions: ImpersonationSessionInfo[];
        total: number;
      };
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading history...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-500">{error}</div>;
  }

  if (sessions.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No impersonation history</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Target
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {sessions.map((session) => {
              const isExpired = new Date(session.expiresAt) < new Date();
              const status = session.revokedAt
                ? 'Revoked'
                : isExpired
                  ? 'Expired'
                  : 'Active';
              const statusColor = session.revokedAt
                ? 'bg-red-100 text-red-700'
                : isExpired
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-emerald-100 text-emerald-700';

              return (
                <tr key={session.id}>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {new Date(session.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {session.adminEmail ?? session.adminUserId}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {session.targetEmail ?? session.targetUserId}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
                    {session.reason}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-surface-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-surface-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
