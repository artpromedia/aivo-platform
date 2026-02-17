'use client';

import { useState, useCallback } from 'react';

import type { WizardStepProps } from '../OnboardingWizard';

const SIS_API = process.env.NEXT_PUBLIC_SIS_SYNC_API || '/api/sis';
const TENANT_API = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

type SisProviderType =
  | 'CLEVER'
  | 'CLASSLINK'
  | 'ONEROSTER_API'
  | 'ONEROSTER_CSV'
  | 'GOOGLE_WORKSPACE'
  | 'MICROSOFT_ENTRA';

const PROVIDERS: Array<{
  type: SisProviderType;
  name: string;
  description: string;
  icon: string;
}> = [
  {
    type: 'CLEVER',
    name: 'Clever',
    description: 'Automatic rostering from your SIS via Clever',
    icon: '🔗',
  },
  {
    type: 'CLASSLINK',
    name: 'ClassLink',
    description: 'Sync via ClassLink OneRoster integration',
    icon: '🔗',
  },
  {
    type: 'ONEROSTER_API',
    name: 'OneRoster API',
    description: 'Connect to any OneRoster 1.1 compliant API',
    icon: '🌐',
  },
  {
    type: 'ONEROSTER_CSV',
    name: 'OneRoster CSV',
    description: 'Import OneRoster CSV files via SFTP',
    icon: '📁',
  },
  {
    type: 'GOOGLE_WORKSPACE',
    name: 'Google Workspace',
    description: 'Sync from Google Classroom',
    icon: '🎓',
  },
  {
    type: 'MICROSOFT_ENTRA',
    name: 'Microsoft Entra',
    description: 'Sync from Microsoft 365 / Teams',
    icon: '🏢',
  },
];

type SetupPhase = 'select' | 'configure' | 'testing' | 'syncing' | 'done';

interface ConfigForm {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  syncSchedule: string;
}

interface SyncResult {
  schools: number;
  users: number;
  classes: number;
  enrollments: number;
}

export function SisIntegrationStep({ tenantId, onComplete, onBack, status }: WizardStepProps) {
  const isCompleted = status?.steps[2]?.completed ?? false;
  const [phase, setPhase] = useState<SetupPhase>('select');
  const [selectedProvider, setSelectedProvider] = useState<SisProviderType | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigForm>({
    clientId: '',
    clientSecret: '',
    baseUrl: '',
    syncSchedule: '0 2 * * *',
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProvider = (type: SisProviderType) => {
    setSelectedProvider(type);
    setPhase('configure');
  };

  const handleSkip = async () => {
    // Mark SIS step as complete without configuring
    try {
      // Update onboarding status via a simple call
      const res = await fetch(`${TENANT_API}/onboarding/tenants/${tenantId}/status`);
      if (res.ok) {
        // Just advance to next step without SIS
        onComplete();
      }
    } catch {
      onComplete();
    }
  };

  const handleCreateProvider = useCallback(async () => {
    if (!selectedProvider) return;
    setError(null);

    try {
      const res = await fetch(`${SIS_API}/v1/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          providerType: selectedProvider,
          name: PROVIDERS.find((p) => p.type === selectedProvider)?.name ?? selectedProvider,
          config: {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            baseUrl: config.baseUrl || undefined,
          },
          syncSchedule: config.syncSchedule,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? 'Failed to create provider');
      }

      const data = (await res.json()) as { provider: { id: string } };
      setProviderId(data.provider.id);
      return data.provider.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create provider');
      return null;
    }
  }, [selectedProvider, tenantId, config]);

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus('testing');
    setConnectionMessage('');

    let pid = providerId;
    if (!pid) {
      pid = (await handleCreateProvider()) ?? null;
      if (!pid) {
        setConnectionStatus('error');
        setConnectionMessage('Failed to create provider configuration.');
        return;
      }
    }

    try {
      const res = await fetch(`${SIS_API}/v1/providers/${pid}/test`, { method: 'POST' });
      const data = (await res.json()) as { success: boolean; message: string };

      if (data.success) {
        setConnectionStatus('success');
        setConnectionMessage(data.message || 'Connection successful!');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data.message || 'Connection failed. Check credentials.');
      }
    } catch {
      setConnectionStatus('error');
      setConnectionMessage('Network error — unable to test connection.');
    }
  }, [providerId, handleCreateProvider]);

  const handleTriggerSync = useCallback(async () => {
    if (!providerId) return;
    setPhase('syncing');
    setSyncProgress('Starting initial sync...');

    try {
      const res = await fetch(`${SIS_API}/v1/providers/${providerId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync: true }),
      });

      if (!res.ok) throw new Error('Failed to start sync');

      setSyncProgress('Sync in progress — fetching data from SIS...');

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = 3000;

      const poll = async () => {
        attempts++;
        try {
          const statusRes = await fetch(`${SIS_API}/v1/providers/${providerId}`);
          const statusData = (await statusRes.json()) as {
            status?: { isRunning?: boolean; lastStatus?: string };
            provider?: { lastSyncAt?: string };
          };

          if (statusData.status?.isRunning) {
            setSyncProgress(`Sync in progress... (${attempts * 3}s elapsed)`);
            if (attempts < maxAttempts) {
              setTimeout(() => void poll(), pollInterval);
            } else {
              setSyncProgress('Sync is taking longer than expected. It will continue in the background.');
              setPhase('done');
              setSyncResult({ schools: 0, users: 0, classes: 0, enrollments: 0 });
            }
          } else if (statusData.status?.lastStatus === 'SUCCESS' || statusData.status?.lastStatus === 'PARTIAL') {
            setSyncProgress('Sync complete!');
            setPhase('done');
            // Fetch sync run details
            const runsRes = await fetch(`${SIS_API}/v1/providers/${providerId}/sync/runs?limit=1`);
            if (runsRes.ok) {
              const runsData = (await runsRes.json()) as {
                runs: Array<{
                  stats?: {
                    schools?: { created: number };
                    users?: { created: number };
                    classes?: { created: number };
                    enrollments?: { created: number };
                  };
                }>;
              };
              const lastRun = runsData.runs[0];
              if (lastRun?.stats) {
                setSyncResult({
                  schools: lastRun.stats.schools?.created ?? 0,
                  users: lastRun.stats.users?.created ?? 0,
                  classes: lastRun.stats.classes?.created ?? 0,
                  enrollments: lastRun.stats.enrollments?.created ?? 0,
                });
              }
            }
          } else {
            setSyncProgress('Sync completed with issues. You can re-sync later.');
            setPhase('done');
            setSyncResult({ schools: 0, users: 0, classes: 0, enrollments: 0 });
          }
        } catch {
          setSyncProgress('Unable to check sync status. It may still be running.');
          setPhase('done');
        }
      };

      setTimeout(() => void poll(), pollInterval);
    } catch {
      setError('Failed to start initial sync.');
      setPhase('configure');
    }
  }, [providerId]);

  if (isCompleted) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">SIS Integration</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> SIS integration has been configured.
          </p>
        </div>
        <div className="mt-6 flex justify-between">
          {onBack && (
            <button onClick={onBack} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
              ← Back
            </button>
          )}
          <button
            onClick={onComplete}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">SIS Integration</h2>
      <p className="mb-6 text-sm text-gray-600">
        Connect your Student Information System to automatically sync students, schools, and classes.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Phase: Select Provider */}
      {phase === 'select' && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.type}
                onClick={() => handleSelectProvider(p.type)}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
              >
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
            {onBack && (
              <button onClick={onBack} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
                ← Back
              </button>
            )}
            <button
              onClick={() => void handleSkip()}
              className="ml-auto text-sm text-gray-500 underline hover:text-gray-700"
            >
              Skip — I&apos;ll configure SIS later
            </button>
          </div>
        </div>
      )}

      {/* Phase: Configure */}
      {phase === 'configure' && selectedProvider && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-lg">
              {PROVIDERS.find((p) => p.type === selectedProvider)?.icon}
            </span>
            <span className="font-medium">
              {PROVIDERS.find((p) => p.type === selectedProvider)?.name}
            </span>
            <button
              onClick={() => {
                setPhase('select');
                setSelectedProvider(null);
              }}
              className="ml-auto text-xs text-blue-600 hover:underline"
            >
              Change
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                Client ID / API Key *
              </label>
              <input
                id="clientId"
                type="text"
                value={config.clientId}
                onChange={(e) => setConfig((prev) => ({ ...prev, clientId: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your API key or client ID"
              />
            </div>
            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700">
                Client Secret *
              </label>
              <input
                id="clientSecret"
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig((prev) => ({ ...prev, clientSecret: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••••••"
              />
            </div>
            {(selectedProvider === 'ONEROSTER_API' || selectedProvider === 'ONEROSTER_CSV') && (
              <div>
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700">
                  Base URL
                </label>
                <input
                  id="baseUrl"
                  type="url"
                  value={config.baseUrl}
                  onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="https://sis.yourdistrict.edu/api/oneroster/v1p1"
                />
              </div>
            )}
            <div>
              <label htmlFor="syncSchedule" className="block text-sm font-medium text-gray-700">
                Sync Schedule
              </label>
              <select
                id="syncSchedule"
                value={config.syncSchedule}
                onChange={(e) => setConfig((prev) => ({ ...prev, syncSchedule: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="0 2 * * *">Daily at 2:00 AM</option>
                <option value="0 2,14 * * *">Twice daily (2 AM &amp; 2 PM)</option>
                <option value="0 */6 * * *">Every 6 hours</option>
                <option value="0 6 * * 1-5">Weekdays at 6:00 AM</option>
              </select>
            </div>
          </div>

          {/* Connection test results */}
          {connectionStatus !== 'idle' && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                connectionStatus === 'testing'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : connectionStatus === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {connectionStatus === 'testing' && (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  Testing connection...
                </span>
              )}
              {connectionStatus === 'success' && <span>✅ {connectionMessage}</span>}
              {connectionStatus === 'error' && <span>❌ {connectionMessage}</span>}
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <button
              onClick={() => {
                setPhase('select');
                setSelectedProvider(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={() => void handleTestConnection()}
              disabled={!config.clientId || !config.clientSecret || connectionStatus === 'testing'}
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              Test Connection
            </button>
            <button
              onClick={() => void handleTriggerSync()}
              disabled={connectionStatus !== 'success'}
              className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Run Initial Sync →
            </button>
          </div>
        </div>
      )}

      {/* Phase: Syncing */}
      {phase === 'syncing' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-lg font-medium text-gray-900">Initial Sync in Progress</p>
          <p className="mt-2 text-sm text-gray-600">{syncProgress}</p>
          <p className="mt-4 text-xs text-gray-400">
            This may take several minutes depending on your district size.
          </p>
        </div>
      )}

      {/* Phase: Done */}
      {phase === 'done' && (
        <div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="flex items-center gap-2 font-medium text-green-800">
              <span>✅</span> Initial sync complete!
            </p>
            {syncResult && (
              <div className="mt-3 grid grid-cols-4 gap-4">
                {[
                  { label: 'Schools', value: syncResult.schools },
                  { label: 'Users', value: syncResult.users },
                  { label: 'Classes', value: syncResult.classes },
                  { label: 'Enrollments', value: syncResult.enrollments },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-green-700">{stat.value}</p>
                    <p className="text-xs text-green-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={onComplete}
              className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
