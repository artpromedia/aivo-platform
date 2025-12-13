'use client';

import { useState, useCallback, useEffect, type ChangeEvent } from 'react';

// Simple icon components (replace with actual icons when lucide-react is added)
const AlertTriangle = () => <span>⚠️</span>;
const Check = () => <span>✓</span>;
const Copy = () => <span>📋</span>;
const Eye = () => <span>👁️</span>;
const EyeOff = () => <span>🔒</span>;
const RefreshCw = () => <span>🔄</span>;
const Shield = () => <span>🛡️</span>;
const Upload = () => <span>📤</span>;
const X = () => <span>✕</span>;

// ============================================================================
// TYPES
// ============================================================================

interface IdpConfig {
  id: string;
  protocol: 'SAML' | 'OIDC';
  name: string;
  issuer: string;
  enabled: boolean;
  // SAML
  ssoUrl?: string;
  sloUrl?: string;
  x509Certificate?: string;
  metadataXml?: string;
  // OIDC
  clientId?: string;
  clientSecretRef?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  scopes?: string[];
  // Claims mapping
  emailClaim: string;
  nameClaim: string;
  roleClaim: string;
  // Role mapping
  roleMapping: Record<string, string>;
  // Provisioning
  autoProvisionUsers: boolean;
  defaultRole: string;
  allowedUserTypes: string[];
}

interface TenantSsoSettings {
  ssoEnabled: boolean;
  ssoRequired: boolean;
  fallbackAdminEmails: string[];
}

interface SsoConfigPageProps {
  readonly tenantId: string;
}

// ============================================================================
// MOCK API (replace with actual API calls)
// ============================================================================

async function fetchIdpConfig(_tenantId: string): Promise<IdpConfig | null> {
  // Mock implementation
  return null;
}

async function fetchTenantSsoSettings(_tenantId: string): Promise<TenantSsoSettings> {
  return {
    ssoEnabled: false,
    ssoRequired: false,
    fallbackAdminEmails: [],
  };
}

async function saveIdpConfig(_tenantId: string, config: Partial<IdpConfig>): Promise<IdpConfig> {
  // Mock implementation
  return config as IdpConfig;
}

async function saveTenantSsoSettings(
  _tenantId: string,
  _settings: TenantSsoSettings
): Promise<void> {
  // Mock implementation
}

async function testSsoConnection(
  _tenantId: string
): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Connection successful' };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SsoConfigPage({ tenantId }: SsoConfigPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [settings, setSettings] = useState<TenantSsoSettings>({
    ssoEnabled: false,
    ssoRequired: false,
    fallbackAdminEmails: [],
  });

  const [config, setConfig] = useState<Partial<IdpConfig>>({
    protocol: 'OIDC',
    name: '',
    issuer: '',
    enabled: false,
    emailClaim: 'email',
    nameClaim: 'name',
    roleClaim: 'role',
    roleMapping: {},
    autoProvisionUsers: false,
    defaultRole: 'TEACHER',
    allowedUserTypes: ['TEACHER', 'THERAPIST', 'DISTRICT_ADMIN'],
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [newFallbackEmail, setNewFallbackEmail] = useState('');

  // Load existing config
  useEffect(() => {
    async function load() {
      try {
        const [existingConfig, tenantSettings] = await Promise.all([
          fetchIdpConfig(tenantId),
          fetchTenantSsoSettings(tenantId),
        ]);

        if (existingConfig) {
          setConfig(existingConfig);
        }
        setSettings(tenantSettings);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true);
    setTestResult(null);

    try {
      await Promise.all([
        saveIdpConfig(tenantId, config),
        saveTenantSsoSettings(tenantId, settings),
      ]);
    } finally {
      setSaving(false);
    }
  }, [tenantId, config, settings]);

  // Test connection handler
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testSsoConnection(tenantId);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  }, [tenantId]);

  // Add fallback email
  const addFallbackEmail = useCallback(() => {
    if (newFallbackEmail && !settings.fallbackAdminEmails.includes(newFallbackEmail)) {
      setSettings((s) => ({
        ...s,
        fallbackAdminEmails: [...s.fallbackAdminEmails, newFallbackEmail],
      }));
      setNewFallbackEmail('');
    }
  }, [newFallbackEmail, settings.fallbackAdminEmails]);

  // Remove fallback email
  const removeFallbackEmail = useCallback((email: string) => {
    setSettings((s) => ({
      ...s,
      fallbackAdminEmails: s.fallbackAdminEmails.filter((e) => e !== email),
    }));
  }, []);

  // Parse SAML metadata
  const handleMetadataUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const xml = await file.text();
    setConfig((c) => ({
      ...c,
      metadataXml: xml,
      // Try to parse metadata (basic extraction)
      // In production, parse properly on the backend
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Single Sign-On Configuration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure SSO to allow your staff to sign in using your district&apos;s identity provider.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Configuration Warning</h3>
            <p className="mt-1 text-sm text-amber-700">
              Misconfigured SSO settings can lock users out of their accounts. Always maintain at
              least one fallback admin account that can sign in with a password, and test the
              configuration thoroughly before enabling SSO for all users.
            </p>
          </div>
        </div>
      </div>

      {/* SSO Enable/Disable */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">SSO Settings</h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.ssoEnabled}
              onChange={(e) => {
                setSettings((s) => ({ ...s, ssoEnabled: e.target.checked }));
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Enable SSO</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.ssoRequired}
              onChange={(e) => {
                setSettings((s) => ({ ...s, ssoRequired: e.target.checked }));
              }}
              disabled={!settings.ssoEnabled}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm font-medium text-slate-700">
              Require SSO (disable password login)
            </span>
          </label>
        </div>

        {/* Fallback Admins */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Fallback Admin Accounts</h3>
          <p className="text-xs text-slate-500 mb-3">
            These accounts can always sign in with a password, even when SSO is required.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={newFallbackEmail}
              onChange={(e) => {
                setNewFallbackEmail(e.target.value);
              }}
              placeholder="admin@district.edu"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={addFallbackEmail}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          {settings.fallbackAdminEmails.length > 0 && (
            <ul className="space-y-2">
              {settings.fallbackAdminEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{email}</span>
                  <button
                    onClick={() => {
                      removeFallbackEmail(email);
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Protocol Selection */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Identity Provider Configuration</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="sso-protocol" className="block text-sm font-medium text-slate-700 mb-1">
              Protocol
            </label>
            <select
              id="sso-protocol"
              value={config.protocol}
              onChange={(e) => {
                setConfig((c) => ({ ...c, protocol: e.target.value as 'SAML' | 'OIDC' }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="OIDC">OpenID Connect (OIDC)</option>
              <option value="SAML">SAML 2.0</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sso-display-name"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Display Name
            </label>
            <input
              id="sso-display-name"
              type="text"
              value={config.name}
              onChange={(e) => {
                setConfig((c) => ({ ...c, name: e.target.value }));
              }}
              placeholder="e.g., District Google Workspace"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* OIDC Configuration */}
        {config.protocol === 'OIDC' && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-700">OIDC Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sso-issuer-url"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Issuer URL
                </label>
                <input
                  id="sso-issuer-url"
                  type="url"
                  value={config.issuer}
                  onChange={(e) => {
                    setConfig((c) => ({ ...c, issuer: e.target.value }));
                  }}
                  placeholder="https://accounts.google.com"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sso-client-id"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Client ID
                </label>
                <input
                  id="sso-client-id"
                  type="text"
                  value={config.clientId ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({ ...c, clientId: e.target.value }));
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="sso-client-secret"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    id="sso-client-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={config.clientSecretRef ?? ''}
                    onChange={(e) => {
                      setConfig((c) => ({ ...c, clientSecretRef: e.target.value }));
                    }}
                    placeholder="Enter client secret (will be stored securely)"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecret(!showSecret);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="sso-auth-endpoint"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Authorization Endpoint
                </label>
                <input
                  id="sso-auth-endpoint"
                  type="url"
                  value={config.authorizationEndpoint ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({ ...c, authorizationEndpoint: e.target.value }));
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sso-token-endpoint"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Token Endpoint
                </label>
                <input
                  id="sso-token-endpoint"
                  type="url"
                  value={config.tokenEndpoint ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({ ...c, tokenEndpoint: e.target.value }));
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sso-jwks-uri"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  JWKS URI
                </label>
                <input
                  id="sso-jwks-uri"
                  type="url"
                  value={config.jwksUri ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({ ...c, jwksUri: e.target.value }));
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sso-userinfo-endpoint"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  UserInfo Endpoint (optional)
                </label>
                <input
                  id="sso-userinfo-endpoint"
                  type="url"
                  value={config.userinfoEndpoint ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({ ...c, userinfoEndpoint: e.target.value }));
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-md">
              <p className="text-xs text-slate-600">
                <strong>Tip:</strong> For Google Workspace, Azure AD, Okta, and other major
                providers, you can use OIDC Discovery to auto-fill these fields. Enter the issuer
                URL and click &quot;Discover&quot;.
              </p>
            </div>
          </div>
        )}

        {/* SAML Configuration */}
        {config.protocol === 'SAML' && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-700">SAML Settings</h3>

            <div className="space-y-4">
              <div>
                <span className="block text-sm font-medium text-slate-700 mb-1">
                  Upload IdP Metadata (XML)
                </span>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <input
                    type="file"
                    accept=".xml,application/xml,text/xml"
                    onChange={handleMetadataUpload}
                    className="hidden"
                    id="metadata-upload"
                  />
                  <label
                    htmlFor="metadata-upload"
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click to upload metadata file
                  </label>
                  <p className="text-xs text-slate-500 mt-1">Or configure manually below</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="sso-saml-entity-id"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    IdP Entity ID (Issuer)
                  </label>
                  <input
                    id="sso-saml-entity-id"
                    type="text"
                    value={config.issuer}
                    onChange={(e) => {
                      setConfig((c) => ({ ...c, issuer: e.target.value }));
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sso-saml-url"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    SSO URL
                  </label>
                  <input
                    id="sso-saml-url"
                    type="url"
                    value={config.ssoUrl ?? ''}
                    onChange={(e) => {
                      setConfig((c) => ({ ...c, ssoUrl: e.target.value }));
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="sso-x509-cert"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    X.509 Certificate
                  </label>
                  <textarea
                    id="sso-x509-cert"
                    value={config.x509Certificate ?? ''}
                    onChange={(e) => {
                      setConfig((c) => ({ ...c, x509Certificate: e.target.value }));
                    }}
                    rows={4}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SP Metadata Download */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Service Provider (SP) Metadata
                </h4>
                <p className="text-xs text-blue-700 mb-3">
                  Download this metadata to configure Aivo as a service provider in your IdP.
                </p>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50">
                  <Copy className="h-4 w-4" />
                  Copy SP Metadata URL
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Claims & Role Mapping */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Claims & Role Mapping</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="sso-email-claim"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Email Claim
            </label>
            <input
              id="sso-email-claim"
              type="text"
              value={config.emailClaim}
              onChange={(e) => {
                setConfig((c) => ({ ...c, emailClaim: e.target.value }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="sso-name-claim"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Name Claim
            </label>
            <input
              id="sso-name-claim"
              type="text"
              value={config.nameClaim}
              onChange={(e) => {
                setConfig((c) => ({ ...c, nameClaim: e.target.value }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="sso-role-claim"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Role Claim
            </label>
            <input
              id="sso-role-claim"
              type="text"
              value={config.roleClaim}
              onChange={(e) => {
                setConfig((c) => ({ ...c, roleClaim: e.target.value }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Role Mapping</h3>
          <p className="text-xs text-slate-500 mb-3">
            Map roles from your IdP to Aivo roles. IdP role values are case-sensitive.
          </p>

          <div className="space-y-2">
            {Object.entries(config.roleMapping ?? {}).map(([idpRole, aivoRole]) => (
              <div key={idpRole} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={idpRole}
                  disabled
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                />
                <span className="text-slate-400">→</span>
                <select
                  value={aivoRole}
                  onChange={(e) => {
                    setConfig((c) => ({
                      ...c,
                      roleMapping: { ...c.roleMapping, [idpRole]: e.target.value },
                    }));
                  }}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="TEACHER">Teacher</option>
                  <option value="THERAPIST">Therapist</option>
                  <option value="DISTRICT_ADMIN">District Admin</option>
                </select>
                <button
                  onClick={() => {
                    setConfig((c) => {
                      const { [idpRole]: _, ...rest } = c.roleMapping ?? {};
                      return { ...c, roleMapping: rest };
                    });
                  }}
                  className="p-2 text-slate-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            <RoleMappingAdder
              onAdd={(idpRole, aivoRole) => {
                setConfig((c) => ({
                  ...c,
                  roleMapping: { ...c.roleMapping, [idpRole]: aivoRole },
                }));
              }}
            />
          </div>
        </div>
      </section>

      {/* User Provisioning */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">User Provisioning</h2>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.autoProvisionUsers}
            onChange={(e) => {
              setConfig((c) => ({ ...c, autoProvisionUsers: e.target.checked }));
            }}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Auto-provision users on first login
          </span>
        </label>

        <div>
          <label
            htmlFor="sso-default-role"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Default Role
          </label>
          <select
            id="sso-default-role"
            value={config.defaultRole}
            onChange={(e) => {
              setConfig((c) => ({ ...c, defaultRole: e.target.value }));
            }}
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="TEACHER">Teacher</option>
            <option value="THERAPIST">Therapist</option>
            <option value="DISTRICT_ADMIN">District Admin</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Assigned when role cannot be determined from IdP claims.
          </p>
        </div>
      </section>

      {/* Test & Save */}
      <section className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm ${
                testResult.success ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {testResult.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {testResult.message}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !config.issuer}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Test Connection
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function RoleMappingAdder({
  onAdd,
}: Readonly<{
  onAdd: (idpRole: string, aivoRole: string) => void;
}>) {
  const [idpRole, setIdpRole] = useState('');
  const [aivoRole, setAivoRole] = useState('TEACHER');

  const handleAdd = () => {
    if (idpRole.trim()) {
      onAdd(idpRole.trim(), aivoRole);
      setIdpRole('');
    }
  };

  return (
    <div className="flex gap-2 items-center pt-2">
      <input
        type="text"
        value={idpRole}
        onChange={(e) => {
          setIdpRole(e.target.value);
        }}
        placeholder="IdP role value"
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
      />
      <span className="text-slate-400">→</span>
      <select
        value={aivoRole}
        onChange={(e) => {
          setAivoRole(e.target.value);
        }}
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="TEACHER">Teacher</option>
        <option value="THERAPIST">Therapist</option>
        <option value="DISTRICT_ADMIN">District Admin</option>
      </select>
      <button
        onClick={handleAdd}
        disabled={!idpRole.trim()}
        className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
      >
        Add
      </button>
    </div>
  );
}
