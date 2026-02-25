'use client';

import { useState } from 'react';

import type { SetupStepProps } from '../PostSignUpSetup';

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

const SSO_PROVIDERS = [
  {
    type: 'GOOGLE_WORKSPACE',
    name: 'Google Workspace',
    description: 'Sign in with Google accounts (Gmail, Workspace)',
    icon: '🔵',
  },
  {
    type: 'MICROSOFT_ENTRA',
    name: 'Microsoft Entra ID',
    description: 'Sign in with Microsoft 365 / Azure AD accounts',
    icon: '🟦',
  },
  {
    type: 'CLEVER',
    name: 'Clever',
    description: 'Connect via Clever for automatic rostering & SSO',
    icon: '🟣',
  },
  {
    type: 'CLASSLINK',
    name: 'ClassLink',
    description: 'Connect via ClassLink for rostering & SSO',
    icon: '🟢',
  },
] as const;

export function SsoSetupStep({ tenantId, accessToken, onComplete, onSkip, onBack, isCompleted }: SetupStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !clientId.trim()) {
      setError('Please select a provider and enter the Client ID');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/sso`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          providerType: selectedProvider,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to configure SSO');
      }

      setConfigured(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCompleted || configured) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Single Sign-On</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> SSO has been configured.
          </p>
          <p className="mt-1 text-sm text-green-700">
            You can manage SSO providers in Settings → Integrations.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onComplete} className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Single Sign-On (SSO)</h2>
      <p className="mb-6 text-sm text-gray-600">
        Enable SSO so your staff and students can sign in with their existing accounts.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Provider Selection */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {SSO_PROVIDERS.map((provider) => (
          <button
            key={provider.type}
            type="button"
            onClick={() => setSelectedProvider(provider.type)}
            className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
              selectedProvider === provider.type
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{provider.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
              <p className="text-xs text-gray-500">{provider.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Configuration Form */}
      {selectedProvider && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Configure {SSO_PROVIDERS.find((p) => p.type === selectedProvider)?.name}
          </h3>

          <div>
            <label htmlFor="clientId" className="mb-1 block text-sm font-medium text-gray-700">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your OAuth Client ID"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="clientSecret" className="mb-1 block text-sm font-medium text-gray-700">
              Client Secret <span className="text-gray-400">(optional for some providers)</span>
            </label>
            <input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter your OAuth Client Secret"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <strong>Redirect URI:</strong>{' '}
            <code className="rounded bg-blue-100 px-1 py-0.5">
              {typeof window !== 'undefined' ? window.location.origin : 'https://app.aivo.ai'}/api/auth/sso/callback
            </code>
            <p className="mt-1">Add this URI to your identity provider&apos;s configuration.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save SSO Configuration'}
          </button>
        </form>
      )}

      <div className="mt-6 flex justify-between">
        <div className="flex gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
