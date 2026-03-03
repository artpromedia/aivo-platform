'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

type ApiKeyScope = 'READ_ONLY' | 'READ_WRITE';
type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

interface ApiKey {
  id: string;
  name: string;
  prefix: string; // first 8 chars shown, e.g. "aivo_k8x…"
  scope: ApiKeyScope;
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | undefined;
  expiresAt: string;
}

interface NewKeyResponse {
  id: string;
  name: string;
  key: string; // full key — shown only once
  prefix: string;
  scope: ApiKeyScope;
  expiresAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const API = '/api/settings/api-keys';

const SCOPE_OPTIONS: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: 'READ_ONLY', label: 'Read Only', description: 'Can read data but cannot modify resources' },
  { value: 'READ_WRITE', label: 'Read & Write', description: 'Full access to read and modify resources' },
];

const EXPIRATION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '1 year' },
];

const STATUS_STYLES: Record<ApiKeyStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REVOKED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  EXPIRED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const MOCK_KEYS: ApiKey[] = [
  {
    id: '1',
    name: 'SIS Integration',
    prefix: 'aivo_k8x',
    scope: 'READ_WRITE',
    status: 'ACTIVE',
    createdAt: '2026-01-15T10:00:00Z',
    lastUsedAt: '2026-03-01T14:22:00Z',
    expiresAt: '2027-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Analytics Dashboard',
    prefix: 'aivo_m3q',
    scope: 'READ_ONLY',
    status: 'ACTIVE',
    createdAt: '2026-02-01T08:00:00Z',
    lastUsedAt: '2026-02-28T09:15:00Z',
    expiresAt: '2026-08-01T08:00:00Z',
  },
  {
    id: '3',
    name: 'Old Webhook Key',
    prefix: 'aivo_z1v',
    scope: 'READ_ONLY',
    status: 'REVOKED',
    createdAt: '2025-06-10T12:00:00Z',
    lastUsedAt: '2025-11-20T16:45:00Z',
    expiresAt: '2025-12-10T12:00:00Z',
  },
];

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

/* ---------- Create Key Form ---------- */

function CreateKeyForm({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: (name: string, scope: ApiKeyScope, expiresInDays: number) => void;
}) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('READ_ONLY');
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [expanded, setExpanded] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), scope, expiresInDays);
    setName('');
    setScope('READ_ONLY');
    setExpiresInDays(90);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <Button onClick={() => { setExpanded(true); }}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Generate API Key
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-900/10">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Generate New API Key</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {/* Name */}
        <div>
          <label htmlFor="key-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Key Name
          </label>
          <input
            id="key-name"
            type="text"
            value={name}
            placeholder="e.g. SIS Integration"
            onChange={(e) => { setName(e.target.value); }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Scope */}
        <div>
          <label htmlFor="key-scope" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Scope
          </label>
          <select
            id="key-scope"
            value={scope}
            onChange={(e) => { setScope(e.target.value as ApiKeyScope); }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {SCOPE_OPTIONS.find((o) => o.value === scope)?.description}
          </p>
        </div>

        {/* Expiration */}
        <div>
          <label htmlFor="key-expires" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Expires In
          </label>
          <select
            id="key-expires"
            value={expiresInDays}
            onChange={(e) => { setExpiresInDays(Number(e.target.value)); }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {EXPIRATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button disabled={creating || !name.trim()} onClick={handleCreate}>
          {creating ? 'Creating…' : 'Generate Key'}
        </Button>
        <button
          type="button"
          onClick={() => { setExpanded(false); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- New Key Reveal ---------- */

function NewKeyReveal({
  newKey,
  onDismiss,
}: {
  newKey: NewKeyResponse;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 3000);
    } catch {
      // fallback — select for manual copy
    }
  };

  return (
    <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 dark:border-green-700 dark:bg-green-900/20">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔑</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
            API Key Created — Copy It Now
          </h3>
          <p className="text-sm text-green-800 dark:text-green-200 mt-1">
            This key will only be shown <strong>once</strong>. Copy and store it securely.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-mono text-gray-900 border border-green-200 dark:bg-gray-800 dark:text-gray-100 dark:border-green-800 select-all">
              {newKey.key}
            </code>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <svg className="mr-1 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-green-700 dark:text-green-300">
            <span><strong>Name:</strong> {newKey.name}</span>
            <span><strong>Scope:</strong> {newKey.scope === 'READ_ONLY' ? 'Read Only' : 'Read & Write'}</span>
            <span><strong>Expires:</strong> {formatDate(newKey.expiresAt)}</span>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 text-sm font-medium text-green-700 hover:text-green-900 dark:text-green-300"
          >
            I&apos;ve copied the key — dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Key Table ---------- */

function KeyTable({
  keys,
  loading,
  onRevoke,
}: {
  keys: ApiKey[];
  loading: boolean;
  onRevoke: (id: string, name: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading API keys…</span>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">🔑</span>
        <p className="mt-3 text-sm text-gray-500">No API keys have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left dark:border-gray-700">
            <th className="pb-3 font-medium text-gray-500">Name</th>
            <th className="pb-3 font-medium text-gray-500">Key</th>
            <th className="pb-3 font-medium text-gray-500">Scope</th>
            <th className="pb-3 font-medium text-gray-500">Created</th>
            <th className="pb-3 font-medium text-gray-500">Last Used</th>
            <th className="pb-3 font-medium text-gray-500">Expires</th>
            <th className="pb-3 font-medium text-gray-500">Status</th>
            <th className="pb-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {keys.map((k) => {
            const isExpired = new Date(k.expiresAt) < new Date();
            const displayStatus = isExpired && k.status === 'ACTIVE' ? 'EXPIRED' : k.status;
            return (
              <tr key={k.id}>
                <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{k.name}</td>
                <td className="py-3">
                  <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {k.prefix}••••••••
                  </code>
                </td>
                <td className="py-3">
                  <Badge className={k.scope === 'READ_WRITE' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}>
                    {k.scope === 'READ_WRITE' ? 'Read & Write' : 'Read Only'}
                  </Badge>
                </td>
                <td className="py-3 text-gray-500 whitespace-nowrap">{formatDate(k.createdAt)}</td>
                <td className="py-3 text-gray-500 whitespace-nowrap">
                  {k.lastUsedAt ? formatDateTime(k.lastUsedAt) : '—'}
                </td>
                <td className="py-3 text-gray-500 whitespace-nowrap">{formatDate(k.expiresAt)}</td>
                <td className="py-3">
                  <Badge className={STATUS_STYLES[displayStatus]}>
                    {displayStatus === 'ACTIVE' && '● '}
                    {displayStatus}
                  </Badge>
                </td>
                <td className="py-3">
                  {k.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => { onRevoke(k.id, k.name); }}
                      className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function ApiKeysPage() {
  const { accessToken } = useAuth();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<{ id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const buildHeaders = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => { setFeedback(null); }, 5000);
  }, []);

  // ---- Fetch ----
  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as ApiKey[];
        setKeys(data);
        setLoading(false);
        return;
      }
    } catch {
      // fallthrough
    }
    setKeys(MOCK_KEYS);
    setLoading(false);
  }, [buildHeaders]);

  useEffect(() => { void fetchKeys(); }, [fetchKeys]);

  // ---- Create ----
  const createKey = useCallback(async (name: string, scope: ApiKeyScope, expiresInDays: number) => {
    setCreating(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ name, scope, expiresInDays }),
      });
      if (res.ok) {
        const data = (await res.json()) as NewKeyResponse;
        setNewKey(data);
        void fetchKeys();
      } else {
        showFeedback('error', 'Failed to create API key.');
      }
    } catch {
      showFeedback('error', 'Failed to create API key.');
    } finally {
      setCreating(false);
    }
  }, [buildHeaders, fetchKeys, showFeedback]);

  // ---- Revoke ----
  const revokeKey = useCallback(async (id: string) => {
    try {
      const res = await fetch(API, {
        method: 'DELETE',
        headers: buildHeaders(),
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showFeedback('success', 'API key revoked successfully.');
        void fetchKeys();
      } else {
        showFeedback('error', 'Failed to revoke API key.');
      }
    } catch {
      showFeedback('error', 'Failed to revoke API key.');
    } finally {
      setRevokeConfirm(null);
    }
  }, [buildHeaders, fetchKeys, showFeedback]);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-gray-800" aria-label="Back to settings">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">API Key Management</h1>
          <p className="text-sm text-gray-500">Create and manage API keys for programmatic access to your district&apos;s data</p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
            : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* Security Notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Security Notice</h2>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              API keys grant programmatic access to your district&apos;s data. Treat them like passwords — never share
              them in code repositories, email, or chat. Rotate keys regularly and revoke any that are compromised.
            </p>
          </div>
        </div>
      </div>

      {/* New Key Reveal */}
      {newKey && (
        <NewKeyReveal newKey={newKey} onDismiss={() => { setNewKey(null); }} />
      )}

      {/* Create Key */}
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="text-xl">🔑</span>
            API Keys
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Generate keys for external systems to access Aivo APIs on behalf of your district.
          </p>

          <CreateKeyForm creating={creating} onCreate={createKey} />

          <div className="mt-6">
            <KeyTable keys={keys} loading={loading} onRevoke={(id, name) => { setRevokeConfirm({ id, name }); }} />
          </div>
        </div>
      </Card>

      {/* Revoke Confirmation Modal */}
      {revokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revoke API Key?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to revoke <strong>&ldquo;{revokeConfirm.name}&rdquo;</strong>?
              Any integrations using this key will immediately stop working. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRevokeConfirm(null); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void revokeKey(revokeConfirm.id); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
