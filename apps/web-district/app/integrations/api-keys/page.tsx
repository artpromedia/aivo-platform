'use client';

import { useState, useEffect } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  createdBy: string;
}

interface CreateApiKeyRequest {
  name: string;
  description?: string;
  scopes: string[];
  expiresAt?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedIps?: string[];
}

interface ApiKeyUsageStats {
  apiKeyId: string;
  period: { from: string; to: string; days: number };
  stats: {
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    avgResponseTimeMs: number;
  };
  byEndpoint: { endpoint: string; count: number }[];
}

const SCOPES = [
  { value: 'READ_LEARNER_PROGRESS', label: 'Read Learner Progress', description: 'Access learner mastery and engagement data' },
  { value: 'READ_SESSION_DATA', label: 'Read Session Data', description: 'Access session metadata and history' },
  { value: 'READ_ANALYTICS', label: 'Read Analytics', description: 'Access analytics and reports' },
  { value: 'WRITE_EXTERNAL_EVENTS', label: 'Write External Events', description: 'Push external learning events' },
  { value: 'WRITE_ENROLLMENTS', label: 'Write Enrollments', description: 'Manage learner enrollments' },
  { value: 'MANAGE_WEBHOOKS', label: 'Manage Webhooks', description: 'Create and manage webhook endpoints' },
];

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch('/api/integrations/api-keys');
  if (!res.ok) throw new Error('Failed to fetch API keys');
  return res.json() as Promise<ApiKey[]>;
}

async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKey & { key: string }> {
  const res = await fetch('/api/integrations/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create API key');
  return res.json() as Promise<ApiKey & { key: string }>;
}

async function revokeApiKey(id: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/integrations/api-keys/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to revoke API key');
}

async function fetchApiKeyUsage(id: string, days: number = 7): Promise<ApiKeyUsageStats> {
  const res = await fetch(`/api/integrations/api-keys/${id}/usage?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch usage stats');
  return res.json() as Promise<ApiKeyUsageStats>;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    REVOKED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function ApiKeyCard({
  apiKey,
  onViewUsage,
  onRevoke,
}: {
  apiKey: ApiKey;
  onViewUsage: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{apiKey.name}</h3>
            <StatusBadge status={apiKey.status} />
          </div>
          {apiKey.description && (
            <p className="mt-1 text-sm text-gray-500">{apiKey.description}</p>
          )}
          <p className="mt-2 text-sm font-mono text-gray-600">
            {apiKey.keyPrefix}••••••••••••••••
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewUsage}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Usage
          </button>
          {apiKey.status === 'ACTIVE' && (
            <button
              onClick={onRevoke}
              className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Revoke
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {apiKey.scopes.map((scope) => (
          <span
            key={scope}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700"
          >
            {scope.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
        <span>
          <strong>{apiKey.usageCount.toLocaleString()}</strong> requests
        </span>
        {apiKey.lastUsedAt && (
          <span>
            Last used: {new Date(apiKey.lastUsedAt).toLocaleString()}
          </span>
        )}
        {apiKey.expiresAt && (
          <span className={new Date(apiKey.expiresAt) < new Date() ? 'text-red-600' : ''}>
            Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}
          </span>
        )}
        <span>
          Created: {new Date(apiKey.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function CreateApiKeyModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (apiKey: ApiKey, rawKey: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setScopes([]);
      setExpiresIn('never');
      setRateLimitPerMinute(60);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn, 10);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const created = await createApiKey({
        name,
        description: description || undefined,
        scopes,
        expiresAt,
        rateLimitPerMinute,
      });

      onCreated(created, created.key);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
            <p className="text-sm text-gray-500">
              Generate a new API key for external integrations
            </p>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Production API Key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Used by our analytics dashboard..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
              <div className="space-y-3">
                {SCOPES.map((scope) => (
                  <label key={scope.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{scope.label}</p>
                      <p className="text-xs text-gray-500">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {scopes.length === 0 && (
                <p className="mt-2 text-sm text-red-600">Select at least one permission</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiration</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="never">Never</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rate Limit (per minute)</label>
                <input
                  type="number"
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(parseInt(e.target.value, 10))}
                  min={1}
                  max={1000}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || scopes.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApiKeyModal({
  isOpen,
  onClose,
  rawKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  rawKey: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !rawKey) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-xl">🔑</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">API Key Created</h3>
            <p className="text-sm text-gray-500">
              Copy your API key now. It won&apos;t be shown again.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-4 font-mono text-sm break-all">
          {rawKey}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Store this key securely. You won&apos;t be able to see it again.
            Include it in your requests using the <code className="bg-yellow-100 px-1 rounded">X-Aivo-Api-Key</code> header.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => void handleCopy()}
            className="rounded-md px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            {copied ? '✓ Copied!' : 'Copy Key'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageModal({
  isOpen,
  onClose,
  apiKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: ApiKey | null;
}) {
  const [stats, setStats] = useState<ApiKeyUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (isOpen && apiKey) {
      setLoading(true);
      fetchApiKeyUsage(apiKey.id, days)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, apiKey, days]);

  if (!isOpen || !apiKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">API Key Usage</h2>
            <p className="text-sm text-gray-500">{apiKey.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.stats.totalRequests.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Requests</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-700">
                    {stats.stats.successfulRequests.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Successful</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-700">
                    {stats.stats.errorRequests.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Errors</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.stats.avgResponseTimeMs}ms
                  </p>
                  <p className="text-sm text-gray-500">Avg Response</p>
                </div>
              </div>

              {stats.byEndpoint.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Requests by Endpoint</h4>
                  <div className="space-y-2">
                    {stats.byEndpoint.map((item) => (
                      <div key={item.endpoint} className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-mono text-gray-600">{item.endpoint}</span>
                        <span className="text-sm font-medium text-gray-900">{item.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">No usage data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [viewingUsage, setViewingUsage] = useState<ApiKey | null>(null);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const data = await fetchApiKeys();
      setApiKeys(data);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApiKeys();
  }, []);

  const handleApiKeyCreated = (apiKey: ApiKey, rawKey: string) => {
    setApiKeys((prev) => [apiKey, ...prev]);
    setNewRawKey(rawKey);
  };

  const handleRevoke = async (apiKey: ApiKey) => {
    const reason = prompt('Reason for revocation (optional):');
    if (reason === null) return; // User cancelled

    try {
      await revokeApiKey(apiKey.id, reason || undefined);
      setApiKeys((prev) =>
        prev.map((k) => (k.id === apiKey.id ? { ...k, status: 'REVOKED' as const } : k))
      );
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500">
            Manage API keys for external partner integrations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create API Key
        </button>
      </div>

      {/* Documentation link */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-1">Integration Documentation</h4>
        <p className="text-sm text-blue-700">
          Use API keys to authenticate requests to Aivo&apos;s public APIs.
          Include your key in the <code className="bg-blue-100 px-1 rounded">X-Aivo-Api-Key</code> header.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading API keys...</div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">🔑</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No API keys yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create an API key to allow partners to access your data
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create your first API key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <ApiKeyCard
              key={apiKey.id}
              apiKey={apiKey}
              onViewUsage={() => setViewingUsage(apiKey)}
              onRevoke={() => void handleRevoke(apiKey)}
            />
          ))}
        </div>
      )}

      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleApiKeyCreated}
      />

      <ApiKeyModal
        isOpen={!!newRawKey}
        onClose={() => setNewRawKey(null)}
        rawKey={newRawKey}
      />

      <UsageModal
        isOpen={!!viewingUsage}
        onClose={() => setViewingUsage(null)}
        apiKey={viewingUsage}
      />
    </div>
  );
}
