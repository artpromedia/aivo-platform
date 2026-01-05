'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

type SisProviderType = 'CLEVER' | 'CLASSLINK' | 'ONEROSTER_API' | 'ONEROSTER_CSV' | 'GOOGLE_WORKSPACE' | 'MICROSOFT_ENTRA';
type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'CANCELLED';

interface SisProvider {
  id: string;
  tenantId: string;
  providerType: SisProviderType;
  name: string;
  enabled: boolean;
  lastSyncAt: string | null;
  syncSchedule: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SyncRun {
  id: string;
  status: SyncStatus;
  startedAt: string;
  completedAt: string | null;
  stats: SyncStats | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  isManual: boolean;
}

interface SyncStats {
  schools: EntityStats;
  classes: EntityStats;
  users: EntityStats;
  enrollments: EntityStats;
}

interface EntityStats {
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: number;
}

interface ProviderStatus {
  isRunning: boolean;
  lastSync?: string;
  lastStatus?: SyncStatus;
  runningFor?: number;
}

interface SisIntegrationPageProps {
  readonly tenantId: string;
}

// ============================================================================
// PROVIDER METADATA
// ============================================================================

const PROVIDER_INFO: Record<SisProviderType, { name: string; description: string; icon: string; requiresOAuth?: boolean }> = {
  CLEVER: {
    name: 'Clever',
    description: 'Connect to Clever for automatic rostering from your SIS',
    icon: '🔗',
  },
  CLASSLINK: {
    name: 'ClassLink',
    description: 'Connect to ClassLink OneRoster for rostering',
    icon: '🔗',
  },
  ONEROSTER_API: {
    name: 'OneRoster API',
    description: 'Connect to any OneRoster 1.1 compliant API',
    icon: '🌐',
  },
  ONEROSTER_CSV: {
    name: 'OneRoster CSV',
    description: 'Import OneRoster CSV files via SFTP',
    icon: '📁',
  },
  GOOGLE_WORKSPACE: {
    name: 'Google Workspace for Education',
    description: 'Sync users and classes from Google Workspace (Google Classroom)',
    icon: '🎓',
    requiresOAuth: true,
  },
  MICROSOFT_ENTRA: {
    name: 'Microsoft Entra ID',
    description: 'Sync users and classes from Microsoft 365 (Teams for Education)',
    icon: '🏢',
    requiresOAuth: true,
  },
};

const SCHEDULE_PRESETS = [
  { value: '0 2 * * *', label: 'Daily at 2 AM' },
  { value: '0 2,14 * * *', label: 'Twice daily (2 AM & 2 PM)' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 6 * * 1-5', label: 'Weekdays at 6 AM' },
  { value: '0 0 * * 0', label: 'Weekly (Sunday midnight)' },
];

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_SIS_SYNC_API || '/api/sis';

async function fetchProviders(tenantId: string): Promise<SisProvider[]> {
  const res = await fetch(`${API_BASE}/v1/tenants/${tenantId}/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  const data = await res.json();
  return data.providers;
}

async function _fetchProvider(providerId: string): Promise<{ provider: SisProvider; status: ProviderStatus }> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}`);
  if (!res.ok) throw new Error('Failed to fetch provider');
  return res.json();
}

async function createProvider(
  tenantId: string,
  data: { providerType: SisProviderType; name: string; config: Record<string, unknown>; syncSchedule?: string }
): Promise<SisProvider> {
  const res = await fetch(`${API_BASE}/v1/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, ...data }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create provider');
  }
  const result = await res.json();
  return result.provider;
}

async function updateProvider(
  providerId: string,
  data: Partial<{ name: string; config: Record<string, unknown>; enabled: boolean; syncSchedule: string | null }>
): Promise<SisProvider> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update provider');
  const result = await res.json();
  return result.provider;
}

async function deleteProvider(providerId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete provider');
}

async function testConnection(providerId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/test`, { method: 'POST' });
  return res.json();
}

// OAuth API functions for Google Workspace and Microsoft Entra
async function initiateOAuth(providerId: string): Promise<{ authUrl: string; state: string }> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/oauth/initiate`);
  if (!res.ok) throw new Error('Failed to initiate OAuth');
  return res.json();
}

async function getOAuthStatus(providerId: string): Promise<{
  isConnected: boolean;
  connectedAt?: string;
  scopes?: string[];
  expiresAt?: string;
}> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/oauth/status`);
  if (!res.ok) throw new Error('Failed to get OAuth status');
  return res.json();
}

async function disconnectOAuth(providerId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/oauth/disconnect`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to disconnect OAuth');
}

async function triggerSync(providerId: string): Promise<{ syncRunId: string }> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to trigger sync');
  }
  return res.json();
}

async function cancelSync(providerId: string): Promise<void> {
  await fetch(`${API_BASE}/v1/providers/${providerId}/sync/cancel`, { method: 'POST' });
}

async function fetchSyncRuns(providerId: string, limit = 10): Promise<{ runs: SyncRun[]; total: number }> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/runs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch sync runs');
  return res.json();
}

async function fetchSyncStatus(providerId: string): Promise<ProviderStatus> {
  const res = await fetch(`${API_BASE}/v1/providers/${providerId}/sync/status`);
  if (!res.ok) throw new Error('Failed to fetch sync status');
  const data = await res.json();
  return data.status;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SisIntegrationPage({ tenantId }: SisIntegrationPageProps) {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<SisProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SisProvider | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load providers
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProviders(tenantId);
        setProviders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load providers');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  // Load provider details when selected
  useEffect(() => {
    if (!selectedProvider) {
      setProviderStatus(null);
      setSyncRuns([]);
      return;
    }

    async function loadDetails() {
      try {
        const [status, runsData] = await Promise.all([
          fetchSyncStatus(selectedProvider.id),
          fetchSyncRuns(selectedProvider.id),
        ]);
        setProviderStatus(status);
        setSyncRuns(runsData.runs);
      } catch {
        // Ignore errors for details
      }
    }
    loadDetails();

    // Poll for status updates
    const interval = setInterval(loadDetails, 5000);
    return () => clearInterval(interval);
  }, [selectedProvider]);

  const handleAddProvider = useCallback(
    async (data: { providerType: SisProviderType; name: string; config: Record<string, unknown>; syncSchedule?: string }) => {
      const provider = await createProvider(tenantId, data);
      setProviders((p) => [...p, provider]);
      setShowAddModal(false);
    },
    [tenantId]
  );

  const handleUpdateProvider = useCallback(async (providerId: string, data: Partial<SisProvider>) => {
    try {
      const updated = await updateProvider(providerId, data);
      setProviders((p) => p.map((provider) => (provider.id === providerId ? { ...provider, ...updated } : provider)));
      if (selectedProvider?.id === providerId) {
        setSelectedProvider((p) => (p ? { ...p, ...updated } : null));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update provider');
    }
  }, [selectedProvider]);

  const handleDeleteProvider = useCallback(async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this integration? All sync history will be lost.')) {
      return;
    }
    try {
      await deleteProvider(providerId);
      setProviders((p) => p.filter((provider) => provider.id !== providerId));
      if (selectedProvider?.id === providerId) {
        setSelectedProvider(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    }
  }, [selectedProvider]);

  const handleTriggerSync = useCallback(async () => {
    if (!selectedProvider) return;
    try {
      await triggerSync(selectedProvider.id);
      const status = await fetchSyncStatus(selectedProvider.id);
      setProviderStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sync');
    }
  }, [selectedProvider]);

  const handleCancelSync = useCallback(async () => {
    if (!selectedProvider) return;
    try {
      await cancelSync(selectedProvider.id);
      const status = await fetchSyncStatus(selectedProvider.id);
      setProviderStatus(status);
    } catch {
      // Ignore cancel errors
    }
  }, [selectedProvider]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SIS Integration</h1>
          <p className="text-sm text-gray-600">
            Connect your Student Information System for automatic class rostering
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-dark"
        >
          + Add Integration
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <button onClick={() => setError(null)} className="float-right">
            ✕
          </button>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Provider List */}
        <div className="space-y-4">
          <h2 className="font-semibold">Connected Integrations</h2>
          {providers.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
              No integrations configured yet.
              <br />
              Click &quot;Add Integration&quot; to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedProvider?.id === provider.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{PROVIDER_INFO[provider.providerType].icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-500">{PROVIDER_INFO[provider.providerType].name}</div>
                    </div>
                    <div
                      className={`h-3 w-3 rounded-full ${
                        provider.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      title={provider.enabled ? 'Enabled' : 'Disabled'}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Provider Details */}
        <div className="lg:col-span-2">
          {selectedProvider ? (
            <ProviderDetails
              provider={selectedProvider}
              status={providerStatus}
              syncRuns={syncRuns}
              onUpdate={handleUpdateProvider}
              onDelete={() => handleDeleteProvider(selectedProvider.id)}
              onTriggerSync={handleTriggerSync}
              onCancelSync={handleCancelSync}
              onConfigure={() => setShowConfigModal(true)}
            />
          ) : (
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-gray-500">
              Select an integration to view details
            </div>
          )}
        </div>
      </div>

      {/* Add Provider Modal */}
      {showAddModal && (
        <AddProviderModal
          existingTypes={providers.map((p) => p.providerType)}
          onAdd={handleAddProvider}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Configure Provider Modal */}
      {showConfigModal && selectedProvider && (
        <ConfigureProviderModal
          provider={selectedProvider}
          onUpdate={(data) => handleUpdateProvider(selectedProvider.id, data)}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// PROVIDER DETAILS COMPONENT
// ============================================================================

interface ProviderDetailsProps {
  readonly provider: SisProvider;
  readonly status: ProviderStatus | null;
  readonly syncRuns: SyncRun[];
  readonly onUpdate: (providerId: string, data: Partial<SisProvider>) => void;
  readonly onDelete: () => void;
  readonly onTriggerSync: () => void;
  readonly onCancelSync: () => void;
  readonly onConfigure: () => void;
}

function ProviderDetails({
  provider,
  status,
  syncRuns,
  onUpdate,
  onDelete,
  onTriggerSync,
  onCancelSync,
  onConfigure,
}: ProviderDetailsProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [oauthStatus, setOauthStatus] = useState<{
    isConnected: boolean;
    connectedAt?: string;
    scopes?: string[];
    expiresAt?: string;
  } | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Ref for OAuth popup interval cleanup
  const oauthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOAuthProvider = PROVIDER_INFO[provider.providerType].requiresOAuth;

  // Cleanup OAuth interval on unmount
  useEffect(() => {
    return () => {
      if (oauthCheckIntervalRef.current) {
        clearInterval(oauthCheckIntervalRef.current);
        oauthCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Load OAuth status for OAuth providers
  useEffect(() => {
    if (!isOAuthProvider) return;
    
    async function loadOAuthStatus() {
      try {
        const status = await getOAuthStatus(provider.id);
        setOauthStatus(status);
      } catch {
        setOauthStatus({ isConnected: false });
      }
    }
    loadOAuthStatus();
  }, [provider.id, isOAuthProvider]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(provider.id);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleConnectOAuth = async () => {
    setOauthLoading(true);
    try {
      const { authUrl } = await initiateOAuth(provider.id);
      // Open OAuth popup
      const popup = window.open(authUrl, 'oauth', 'width=600,height=700,scrollbars=yes');
      
      // Poll for completion
      oauthCheckIntervalRef.current = setInterval(async () => {
        if (popup?.closed) {
          if (oauthCheckIntervalRef.current) {
            clearInterval(oauthCheckIntervalRef.current);
            oauthCheckIntervalRef.current = null;
          }
          // Refresh OAuth status
          const status = await getOAuthStatus(provider.id);
          setOauthStatus(status);
          setOauthLoading(false);
        }
      }, 500);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Failed to initiate OAuth' });
      setOauthLoading(false);
    }
  };

  const handleDisconnectOAuth = async () => {
    if (!confirm('Are you sure you want to disconnect? You will need to re-authorize to sync again.')) {
      return;
    }
    setOauthLoading(true);
    try {
      await disconnectOAuth(provider.id);
      setOauthStatus({ isConnected: false });
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Failed to disconnect' });
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{PROVIDER_INFO[provider.providerType].icon}</span>
          <div>
            <h2 className="text-xl font-bold">{provider.name}</h2>
            <p className="text-sm text-gray-500">{PROVIDER_INFO[provider.providerType].name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfigure}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ⚙️ Configure
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
        <div>
          <div className="text-sm text-gray-500">Status</div>
          <div className="font-medium">
            {provider.enabled ? (
              <span className="text-green-600">✓ Enabled</span>
            ) : (
              <span className="text-gray-500">○ Disabled</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Last Sync</div>
          <div className="font-medium">
            {provider.lastSyncAt ? new Date(provider.lastSyncAt).toLocaleString() : 'Never'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Schedule</div>
          <div className="font-medium">
            {provider.syncSchedule
              ? SCHEDULE_PRESETS.find((p) => p.value === provider.syncSchedule)?.label || provider.syncSchedule
              : 'Manual only'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Current Status</div>
          <div className="font-medium">
            {status?.isRunning ? (
              <span className="text-blue-600">🔄 Syncing...</span>
            ) : (
              <span className="text-gray-600">○ Idle</span>
            )}
          </div>
        </div>
      </div>

      {/* OAuth Connection Status (for Google Workspace / Microsoft Entra) */}
      {isOAuthProvider && (
        <div className={`rounded-lg border p-4 ${
          oauthStatus?.isConnected 
            ? 'border-green-200 bg-green-50' 
            : 'border-yellow-200 bg-yellow-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {oauthStatus?.isConnected ? (
                <>
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-medium text-green-900">Connected</div>
                    <div className="text-sm text-green-700">
                      Authorized on {oauthStatus.connectedAt ? new Date(oauthStatus.connectedAt).toLocaleDateString() : 'Unknown'}
                      {oauthStatus.expiresAt && (
                        <span className="ml-2">
                          • Expires {new Date(oauthStatus.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-medium text-yellow-900">Not Connected</div>
                    <div className="text-sm text-yellow-700">
                      {provider.providerType === 'GOOGLE_WORKSPACE' 
                        ? 'Click "Connect Google" to authorize access to your Google Workspace domain'
                        : 'Click "Connect Microsoft" to authorize access to your Microsoft 365 tenant'
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
            <div>
              {oauthStatus?.isConnected ? (
                <button
                  onClick={handleDisconnectOAuth}
                  disabled={oauthLoading}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {oauthLoading ? '...' : '🔓 Disconnect'}
                </button>
              ) : (
                <button
                  onClick={handleConnectOAuth}
                  disabled={oauthLoading}
                  className={`rounded-lg px-4 py-2 text-white disabled:opacity-50 ${
                    provider.providerType === 'GOOGLE_WORKSPACE'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-[#0078d4] hover:bg-[#106ebe]'
                  }`}
                >
                  {oauthLoading ? '⏳ Connecting...' : (
                    provider.providerType === 'GOOGLE_WORKSPACE' 
                      ? '🔐 Connect Google' 
                      : '🔐 Connect Microsoft'
                  )}
                </button>
              )}
            </div>
          </div>
          {oauthStatus?.scopes && oauthStatus.scopes.length > 0 && (
            <div className="mt-3 border-t border-green-200 pt-3">
              <div className="text-xs text-green-700">
                <strong>Authorized scopes:</strong> {oauthStatus.scopes.slice(0, 3).join(', ')}
                {oauthStatus.scopes.length > 3 && ` +${oauthStatus.scopes.length - 3} more`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onTriggerSync}
          disabled={status?.isRunning || !provider.enabled || (isOAuthProvider && !oauthStatus?.isConnected)}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:opacity-50"
          title={isOAuthProvider && !oauthStatus?.isConnected ? 'Connect OAuth first to sync' : undefined}
        >
          {status?.isRunning ? '⏳ Syncing...' : '▶️ Run Sync Now'}
        </button>
        {status?.isRunning && (
          <button
            onClick={onCancelSync}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            ⏹️ Cancel
          </button>
        )}
        <button
          onClick={handleTest}
          disabled={testing}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          {testing ? '⏳ Testing...' : '🔌 Test Connection'}
        </button>
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2">
          <input
            type="checkbox"
            checked={provider.enabled}
            onChange={(e) => onUpdate(provider.id, { enabled: e.target.checked })}
          />
          <span>Enabled</span>
        </label>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`rounded-lg p-4 ${
            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          <strong>{testResult.success ? '✓ Success' : '✕ Failed'}:</strong> {testResult.message}
        </div>
      )}

      {/* Sync History */}
      <div>
        <h3 className="mb-3 font-semibold">Recent Sync History</h3>
        {syncRuns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-gray-500">
            No sync runs yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">Started</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">Results</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => (
                  <tr key={run.id} className="border-b">
                    <td className="p-2">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="p-2">
                      <SyncStatusBadge status={run.status} />
                    </td>
                    <td className="p-2">
                      {run.completedAt
                        ? formatDuration(new Date(run.startedAt), new Date(run.completedAt))
                        : '-'}
                    </td>
                    <td className="p-2">
                      {run.stats ? (
                        <span className="text-xs">
                          {run.stats.users.created} new users, {run.stats.classes.created} new classes
                        </span>
                      ) : run.errorMessage ? (
                        <span className="text-xs text-red-600" title={run.errorMessage}>
                          Error
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ADD PROVIDER MODAL
// ============================================================================

interface AddProviderModalProps {
  readonly existingTypes: SisProviderType[];
  readonly onAdd: (data: {
    providerType: SisProviderType;
    name: string;
    config: Record<string, unknown>;
    syncSchedule?: string;
  }) => Promise<void>;
  onClose: () => void;
}

function AddProviderModal({ existingTypes, onAdd, onClose }: AddProviderModalProps) {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedType, setSelectedType] = useState<SisProviderType | null>(null);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTypes = (Object.keys(PROVIDER_INFO) as SisProviderType[]).filter(
    (type) => !existingTypes.includes(type)
  );

  const handleSubmit = async () => {
    if (!selectedType || !name) return;

    setSaving(true);
    setError(null);

    try {
      await onAdd({
        providerType: selectedType,
        name,
        config,
        syncSchedule: schedule || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add integration');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-sis-modal-title" className="text-xl font-bold">Add SIS Integration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {step === 'select' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Select your Student Information System provider:</p>
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setName(PROVIDER_INFO[type].name);
                    setStep('configure');
                  }}
                  className="rounded-lg border border-gray-200 p-4 text-left hover:border-primary hover:bg-primary/5"
                >
                  <div className="text-2xl">{PROVIDER_INFO[type].icon}</div>
                  <div className="mt-2 font-medium">{PROVIDER_INFO[type].name}</div>
                  <div className="mt-1 text-xs text-gray-500">{PROVIDER_INFO[type].description}</div>
                </button>
              ))}
            </div>
            {availableTypes.length === 0 && (
              <div className="text-center text-gray-500">
                All available integration types have been added.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setStep('select')} className="text-sm text-primary hover:underline">
              ← Back to provider selection
            </button>

            <div>
              <label className="mb-1 block text-sm font-medium">Integration Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="My SIS Integration"
              />
            </div>

            {/* Provider-specific config fields */}
            {selectedType === 'CLEVER' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Client ID</label>
                  <input
                    type="text"
                    value={config.clientId || ''}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Client Secret</label>
                  <input
                    type="password"
                    value={config.clientSecret || ''}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">District ID</label>
                  <input
                    type="text"
                    value={config.districtId || ''}
                    onChange={(e) => setConfig({ ...config, districtId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </>
            )}

            {selectedType === 'CLASSLINK' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Client ID</label>
                  <input
                    type="text"
                    value={config.clientId || ''}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Client Secret</label>
                  <input
                    type="password"
                    value={config.clientSecret || ''}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tenant ID</label>
                  <input
                    type="text"
                    value={config.tenantId || ''}
                    onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </>
            )}

            {selectedType === 'ONEROSTER_API' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Base URL</label>
                  <input
                    type="url"
                    value={config.baseUrl || ''}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="https://oneroster.example.com/ims/oneroster/v1p1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Client ID</label>
                  <input
                    type="text"
                    value={config.clientId || ''}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Client Secret</label>
                  <input
                    type="password"
                    value={config.clientSecret || ''}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </>
            )}

            {selectedType === 'ONEROSTER_CSV' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">SFTP Host</label>
                  <input
                    type="text"
                    value={config['sftp.host'] || ''}
                    onChange={(e) => setConfig({ ...config, 'sftp.host': e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">SFTP Username</label>
                  <input
                    type="text"
                    value={config['sftp.username'] || ''}
                    onChange={(e) => setConfig({ ...config, 'sftp.username': e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">SFTP Password</label>
                  <input
                    type="password"
                    value={config['sftp.password'] || ''}
                    onChange={(e) => setConfig({ ...config, 'sftp.password': e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Remote Path</label>
                  <input
                    type="text"
                    value={config.remotePath || ''}
                    onChange={(e) => setConfig({ ...config, remotePath: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="/path/to/csv/files"
                  />
                </div>
              </>
            )}

            {selectedType === 'GOOGLE_WORKSPACE' && (
              <>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎓</span>
                    <div>
                      <h4 className="font-medium text-blue-900">Google Workspace for Education</h4>
                      <p className="mt-1 text-sm text-blue-700">
                        After creating this integration, you&apos;ll need to authorize access to your 
                        Google Workspace domain. This requires a Google Workspace admin account.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Google Workspace Domain</label>
                  <input
                    type="text"
                    value={config.domain || ''}
                    onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="yourschool.edu"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The primary domain of your Google Workspace for Education account
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="syncClassroom"
                    checked={config.syncClassroom === 'true'}
                    onChange={(e) => setConfig({ ...config, syncClassroom: e.target.checked ? 'true' : 'false' })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="syncClassroom" className="text-sm">
                    Sync Google Classroom courses and enrollments
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="syncOrganizationalUnits"
                    checked={config.syncOrganizationalUnits === 'true'}
                    onChange={(e) => setConfig({ ...config, syncOrganizationalUnits: e.target.checked ? 'true' : 'false' })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="syncOrganizationalUnits" className="text-sm">
                    Sync organizational units as schools
                  </label>
                </div>
              </>
            )}

            {selectedType === 'MICROSOFT_ENTRA' && (
              <>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <h4 className="font-medium text-blue-900">Microsoft Entra ID (Azure AD)</h4>
                      <p className="mt-1 text-sm text-blue-700">
                        After creating this integration, you&apos;ll need to authorize access to your 
                        Microsoft 365 tenant. This requires a Microsoft 365 admin account.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Microsoft 365 Tenant Domain</label>
                  <input
                    type="text"
                    value={config.domain || ''}
                    onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="yourschool.onmicrosoft.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your Microsoft 365 tenant domain (e.g., yourschool.onmicrosoft.com)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="syncTeams"
                    checked={config.syncTeams === 'true'}
                    onChange={(e) => setConfig({ ...config, syncTeams: e.target.checked ? 'true' : 'false' })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="syncTeams" className="text-sm">
                    Sync Microsoft Teams for Education classes
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="syncSds"
                    checked={config.syncSds === 'true'}
                    onChange={(e) => setConfig({ ...config, syncSds: e.target.checked ? 'true' : 'false' })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="syncSds" className="text-sm">
                    Sync School Data Sync (SDS) data if available
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Sync Schedule</label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Manual only</option>
                {SCHEDULE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !name}
                className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Integration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CONFIGURE PROVIDER MODAL
// ============================================================================

interface ConfigureProviderModalProps {
  provider: SisProvider;
  onUpdate: (data: Partial<SisProvider>) => void;
  onClose: () => void;
}

function ConfigureProviderModal({ provider, onUpdate, onClose }: ConfigureProviderModalProps) {
  const [name, setName] = useState(provider.name);
  const [schedule, setSchedule] = useState(provider.syncSchedule || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      onUpdate({
        name,
        syncSchedule: schedule || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Configure {PROVIDER_INFO[provider.providerType].name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Integration Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Sync Schedule</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Manual only</option>
              {SCHEDULE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Scheduled syncs run automatically at the specified times
            </p>
          </div>

          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            ⚠️ To update credentials, please delete this integration and add a new one.
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name}
              className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const styles: Record<SyncStatus, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    SUCCESS: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    FAILURE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  const icons: Record<SyncStatus, string> = {
    PENDING: '○',
    IN_PROGRESS: '⏳',
    SUCCESS: '✓',
    PARTIAL: '⚠️',
    FAILURE: '✕',
    CANCELLED: '⊘',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${styles[status]}`}>
      {icons[status]} {status.replace('_', ' ')}
    </span>
  );
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
