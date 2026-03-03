'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface LtiConfig {
  platformId: string;
  clientId: string;
  deploymentId: string;
  jwksUrl: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  oidcAuthEndpoint: string;
  instanceUrl: string;
}

interface ConnectionStatus {
  connected: boolean;
  instanceUrl: string | undefined;
  connectedAt: string | undefined;
  lastSyncAt: string | undefined;
  coursesLinked: number;
}

interface FeatureToggles {
  assignmentIntegration: boolean;
  gradeSync: boolean;
  rosterSync: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  details: string | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const API = '/api/integrations/canvas';

const EMPTY_CONFIG: LtiConfig = {
  platformId: '',
  clientId: '',
  deploymentId: '',
  jwksUrl: '',
  authorizationEndpoint: '',
  tokenEndpoint: '',
  oidcAuthEndpoint: '',
  instanceUrl: '',
};

const EMPTY_STATUS: ConnectionStatus = {
  connected: false,
  instanceUrl: undefined,
  connectedAt: undefined,
  lastSyncAt: undefined,
  coursesLinked: 0,
};

const EMPTY_FEATURES: FeatureToggles = {
  assignmentIntegration: false,
  gradeSync: false,
  rosterSync: false,
};

// ============================================================================
// Helpers
// ============================================================================

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

/* ---------- Connection Status Card ---------- */

function ConnectionStatusCard({
  status,
  loading,
  onDisconnect,
}: {
  status: ConnectionStatus;
  loading: boolean;
  onDisconnect: () => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <span className="ml-3 text-sm text-muted">Checking connection status…</span>
        </div>
      </Card>
    );
  }

  if (!status.connected) return null;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Canvas icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-2xl">
              🎓
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">Canvas LMS</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-700">Connected</span>
              </div>
            </div>
          </div>

          <div>
            {confirmDisconnect ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Disconnect?</span>
                <Button
                  variant="destructive"
                  className="px-3 py-1 text-xs"
                  onClick={() => {
                    onDisconnect();
                    setConfirmDisconnect(false);
                  }}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  className="px-3 py-1 text-xs"
                  onClick={() => {
                    setConfirmDisconnect(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => {
                  setConfirmDisconnect(true);
                }}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-muted">Instance URL</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-text">
              {status.instanceUrl ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Connected Since</div>
            <div className="mt-0.5 text-sm font-semibold text-text">
              {status.connectedAt ? formatDateTime(status.connectedAt) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Courses Linked</div>
            <div className="mt-0.5 text-sm font-semibold text-text">{status.coursesLinked}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Last Sync</div>
            <div className="mt-0.5 text-sm font-semibold text-text">
              {status.lastSyncAt ? formatDateTime(status.lastSyncAt) : 'Never'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- LTI 1.3 Configuration Form ---------- */

function LtiConfigForm({
  config,
  saving,
  onSave,
  onChange,
}: {
  config: LtiConfig;
  saving: boolean;
  onSave: () => void;
  onChange: (field: keyof LtiConfig, value: string) => void;
}) {
  const fields: { key: keyof LtiConfig; label: string; placeholder: string; type?: string }[] = [
    { key: 'instanceUrl', label: 'Canvas Instance URL', placeholder: 'https://district.instructure.com' },
    { key: 'platformId', label: 'Canvas Platform ID', placeholder: 'https://canvas.instructure.com' },
    { key: 'clientId', label: 'Client ID', placeholder: '10000000000001' },
    { key: 'deploymentId', label: 'Deployment ID', placeholder: '1:abc123def456' },
    { key: 'jwksUrl', label: 'JWKS URL', placeholder: 'https://district.instructure.com/api/lti/security/jwks' },
    { key: 'authorizationEndpoint', label: 'Authorization Endpoint', placeholder: 'https://district.instructure.com/api/lti/authorize_redirect' },
    { key: 'tokenEndpoint', label: 'Token Endpoint', placeholder: 'https://district.instructure.com/login/oauth2/token' },
    { key: 'oidcAuthEndpoint', label: 'OIDC Auth Endpoint', placeholder: 'https://district.instructure.com/api/lti/authorize_redirect' },
  ];

  return (
    <Card title="LTI 1.3 Configuration" subtitle="Configure the Canvas LMS LTI 1.3 integration credentials">
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === 'instanceUrl' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`canvas-${f.key}`} className="mb-1 block text-sm font-medium text-text">
                {f.label}
              </label>
              <input
                id={`canvas-${f.key}`}
                type={f.type ?? 'text'}
                value={config[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => {
                  onChange(f.key, e.target.value);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Test Connection Card ---------- */

function TestConnectionCard({
  testing,
  result,
  onTest,
}: {
  testing: boolean;
  result: TestResult | null;
  onTest: () => void;
}) {
  return (
    <Card title="Test Connection" subtitle="Validate your Canvas LTI 1.3 credentials">
      <div className="p-5">
        <div className="flex items-center gap-4">
          <Button disabled={testing} onClick={onTest} variant="outline">
            {testing ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                Testing…
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Test Connection
              </>
            )}
          </Button>

          {result && (
            <div className="flex items-center gap-2">
              {result.success ? (
                <>
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-green-700">{result.message}</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-700">{result.message}</span>
                </>
              )}
            </div>
          )}
        </div>

        {result?.details && (
          <div
            className={`mt-3 rounded-lg p-3 text-xs ${
              result.success
                ? 'border border-green-200 bg-green-50 text-green-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <pre className="whitespace-pre-wrap">{result.details}</pre>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Feature Toggles Card ---------- */

function FeatureTogglesCard({
  features,
  saving,
  onToggle,
}: {
  features: FeatureToggles;
  saving: string | null;
  onToggle: (feature: keyof FeatureToggles, enabled: boolean) => void;
}) {
  const toggles: { key: keyof FeatureToggles; label: string; description: string }[] = [
    {
      key: 'assignmentIntegration',
      label: 'Assignment Integration',
      description: 'Post AIVO assignments directly to Canvas courses',
    },
    {
      key: 'gradeSync',
      label: 'Grade Sync',
      description: 'Automatically pass back grades from AIVO to the Canvas gradebook',
    },
    {
      key: 'rosterSync',
      label: 'Roster Sync',
      description: 'Import Canvas course rosters into AIVO classrooms',
    },
  ];

  return (
    <Card title="Feature Toggles" subtitle="Control which Canvas integration features are active">
      <div className="divide-y divide-border">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-text">{t.label}</div>
              <div className="mt-0.5 text-xs text-muted">{t.description}</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={features[t.key]}
                disabled={saving === t.key}
                onChange={(e) => {
                  onToggle(t.key, e.target.checked);
                }}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary/20" />
              {saving === t.key && (
                <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              )}
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function CanvasLmsPage() {
  const { accessToken, tenantId } = useAuth();

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(EMPTY_STATUS);
  const [statusLoading, setStatusLoading] = useState(true);

  // LTI config
  const [config, setConfig] = useState<LtiConfig>(EMPTY_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);

  // Test connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Feature toggles
  const [features, setFeatures] = useState<FeatureToggles>(EMPTY_FEATURES);
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);

  // Error / success banners
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────
  const buildHeaders = useCallback((): HeadersInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    if (tenantId) h['x-tenant-id'] = tenantId;
    return h;
  }, [accessToken, tenantId]);

  // ── Fetch connection status ────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API}/status`, { headers: buildHeaders() });
      if (!res.ok) throw new Error(`Status check failed (${res.status})`);
      const data = (await res.json()) as ConnectionStatus;
      setConnectionStatus(data);
    } catch {
      setConnectionStatus(EMPTY_STATUS);
    } finally {
      setStatusLoading(false);
    }
  }, [buildHeaders]);

  // ── Fetch LTI config ──────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/config`, { headers: buildHeaders() });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<LtiConfig>;
      setConfig((prev) => ({ ...prev, ...data }));
    } catch {
      // Will start with empty config
    }
  }, [buildHeaders]);

  // ── Fetch feature toggles ─────────────────────────────────────────────
  const fetchFeatures = useCallback(async () => {
    try {
      const res = await fetch(`${API}/features`, { headers: buildHeaders() });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<FeatureToggles>;
      setFeatures((prev) => ({ ...prev, ...data }));
    } catch {
      // Will start with defaults off
    }
  }, [buildHeaders]);

  // ── Load on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    void fetchStatus();
    void fetchConfig();
    void fetchFeatures();
  }, [fetchStatus, fetchConfig, fetchFeatures]);

  // ── Save LTI config ───────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/config`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setSuccess('Configuration saved successfully');
      void fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setConfigSaving(false);
    }
  };

  // ── Test connection ───────────────────────────────────────────────────
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/test-connection`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as TestResult;
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: 'Connection test failed — service unreachable', details: undefined });
    } finally {
      setTesting(false);
    }
  };

  // ── Toggle feature ────────────────────────────────────────────────────
  const handleToggleFeature = async (feature: keyof FeatureToggles, enabled: boolean) => {
    setFeatureSaving(feature);
    // Optimistic update
    setFeatures((prev) => ({ ...prev, [feature]: enabled }));
    try {
      const res = await fetch(`${API}/features`, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify({ [feature]: enabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
    } catch {
      // Revert on failure
      setFeatures((prev) => ({ ...prev, [feature]: !enabled }));
      setError(`Failed to update ${feature}`);
    } finally {
      setFeatureSaving(null);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API}/disconnect`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      if (!res.ok) throw new Error('Disconnect failed');
      setConnectionStatus(EMPTY_STATUS);
      setConfig(EMPTY_CONFIG);
      setFeatures(EMPTY_FEATURES);
      setTestResult(null);
      setSuccess('Canvas LMS disconnected');
    } catch {
      setError('Failed to disconnect Canvas LMS');
    }
  };

  // ── Config change handler ─────────────────────────────────────────────
  const handleConfigChange = (field: keyof LtiConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="space-y-6" data-testid="canvas-lms-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Integrations" className="text-headline font-semibold">
          Canvas LMS
        </Heading>
        {connectionStatus.connected && (
          <Badge tone="success">Connected</Badge>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-green-800">{success}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccess(null);
              }}
              className="text-green-500 hover:text-green-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Connection Status Card (only visible when connected) */}
      <ConnectionStatusCard
        status={connectionStatus}
        loading={statusLoading}
        onDisconnect={() => {
          void handleDisconnect();
        }}
      />

      {/* LTI 1.3 Configuration Form */}
      <LtiConfigForm
        config={config}
        saving={configSaving}
        onSave={() => {
          void handleSaveConfig();
        }}
        onChange={handleConfigChange}
      />

      {/* Test Connection */}
      <TestConnectionCard
        testing={testing}
        result={testResult}
        onTest={() => {
          void handleTestConnection();
        }}
      />

      {/* Feature Toggles */}
      <FeatureTogglesCard
        features={features}
        saving={featureSaving}
        onToggle={(f, v) => {
          void handleToggleFeature(f, v);
        }}
      />
    </section>
  );
}
