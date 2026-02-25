'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAivoTheme, type AivoTheme } from '@aivo/theme-provider/react';
import { DEFAULT_THEME, hexToRgbString } from '@aivo/theme-provider';

// ============================================================================
// TYPES
// ============================================================================

interface BrandingFormData {
  displayName: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorTextOnPrimary: string;
  colorMuted: string;
  colorBorder: string;
  fontFamily: string;
  borderRadius: string;
  loginMessage: string;
  supportEmail: string;
  supportUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

interface CustomDomainEntry {
  id: string;
  domain: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'FAILED' | 'REVOKED';
  sslStatus: 'PENDING' | 'ISSUING' | 'ACTIVE' | 'EXPIRED' | 'FAILED';
  verificationToken: string;
  isPrimary: boolean;
  createdAt: string;
}

interface BrandingSettingsPageProps {
  readonly tenantId: string;
  readonly accessToken: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TENANT_SVC_URL = process.env.NEXT_PUBLIC_TENANT_SVC_URL ?? 'http://localhost:4002';

const FONT_OPTIONS = [
  { value: '"DM Sans", "Plus Jakarta Sans", system-ui, sans-serif', label: 'DM Sans (Default)' },
  { value: '"Inter", system-ui, sans-serif', label: 'Inter' },
  { value: '"Poppins", system-ui, sans-serif', label: 'Poppins' },
  { value: '"Open Sans", system-ui, sans-serif', label: 'Open Sans' },
  { value: '"Roboto", system-ui, sans-serif', label: 'Roboto' },
  { value: '"Nunito", system-ui, sans-serif', label: 'Nunito' },
  { value: '"Lato", system-ui, sans-serif', label: 'Lato' },
  { value: '"Source Sans Pro", system-ui, sans-serif', label: 'Source Sans Pro' },
  { value: 'system-ui, sans-serif', label: 'System Default' },
];

const RADIUS_OPTIONS = [
  { value: '0', label: 'None (square)' },
  { value: '0.25rem', label: 'Small' },
  { value: '0.5rem', label: 'Medium (default)' },
  { value: '0.75rem', label: 'Large' },
  { value: '1rem', label: 'Extra Large' },
  { value: '9999px', label: 'Full / Pill' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING_VERIFICATION: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  VERIFIED: 'text-green-700 bg-green-50 border-green-200',
  FAILED: 'text-red-700 bg-red-50 border-red-200',
  REVOKED: 'text-gray-700 bg-gray-50 border-gray-200',
  PENDING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  ISSUING: 'text-blue-700 bg-blue-50 border-blue-200',
  ACTIVE: 'text-green-700 bg-green-50 border-green-200',
  EXPIRED: 'text-red-700 bg-red-50 border-red-200',
};

// ============================================================================
// HELPERS
// ============================================================================

function apiHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function formatStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BrandingSettingsPage({ tenantId, accessToken }: BrandingSettingsPageProps) {
  const { refresh: refreshTheme } = useAivoTheme();

  // ---- State ---------------------------------------------------------------

  const [activeTab, setActiveTab] = useState<'branding' | 'domains'>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Branding form
  const [form, setForm] = useState<BrandingFormData>({
    displayName: DEFAULT_THEME.displayName,
    colorPrimary: DEFAULT_THEME.colorPrimary,
    colorSecondary: DEFAULT_THEME.colorSecondary,
    colorAccent: DEFAULT_THEME.colorAccent,
    colorBackground: DEFAULT_THEME.colorBackground,
    colorSurface: DEFAULT_THEME.colorSurface,
    colorText: DEFAULT_THEME.colorText,
    colorTextOnPrimary: DEFAULT_THEME.colorTextOnPrimary,
    colorMuted: DEFAULT_THEME.colorMuted,
    colorBorder: DEFAULT_THEME.colorBorder,
    fontFamily: DEFAULT_THEME.fontFamily,
    borderRadius: DEFAULT_THEME.borderRadius,
    loginMessage: '',
    supportEmail: '',
    supportUrl: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
  });

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSmallUrl, setLogoSmallUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);

  // Domain state
  const [domains, setDomains] = useState<CustomDomainEntry[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoSmallInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // ---- Data fetching -------------------------------------------------------

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${TENANT_SVC_URL}/admin/branding`, {
        headers: apiHeaders(accessToken),
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          displayName: data.displayName ?? DEFAULT_THEME.displayName,
          colorPrimary: data.colorPrimary ?? DEFAULT_THEME.colorPrimary,
          colorSecondary: data.colorSecondary ?? DEFAULT_THEME.colorSecondary,
          colorAccent: data.colorAccent ?? DEFAULT_THEME.colorAccent,
          colorBackground: data.colorBackground ?? DEFAULT_THEME.colorBackground,
          colorSurface: data.colorSurface ?? DEFAULT_THEME.colorSurface,
          colorText: data.colorText ?? DEFAULT_THEME.colorText,
          colorTextOnPrimary: data.colorTextOnPrimary ?? DEFAULT_THEME.colorTextOnPrimary,
          colorMuted: data.colorMuted ?? DEFAULT_THEME.colorMuted,
          colorBorder: data.colorBorder ?? DEFAULT_THEME.colorBorder,
          fontFamily: data.fontFamily ?? DEFAULT_THEME.fontFamily,
          borderRadius: data.borderRadius ?? DEFAULT_THEME.borderRadius,
          loginMessage: data.loginMessage ?? '',
          supportEmail: data.supportEmail ?? '',
          supportUrl: data.supportUrl ?? '',
          privacyPolicyUrl: data.privacyPolicyUrl ?? '',
          termsOfServiceUrl: data.termsOfServiceUrl ?? '',
        });
        setLogoUrl(data.logoUrl ?? null);
        setLogoSmallUrl(data.logoSmallUrl ?? null);
        setFaviconUrl(data.faviconUrl ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branding');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`${TENANT_SVC_URL}/admin/custom-domains`, {
        headers: apiHeaders(accessToken),
      });
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains ?? []);
      }
    } catch {
      // Domains are optional
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchBranding();
    void fetchDomains();
  }, [fetchBranding, fetchDomains]);

  // ---- Handlers ------------------------------------------------------------

  const handleChange = (field: keyof BrandingFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${TENANT_SVC_URL}/admin/branding`, {
        method: 'PUT',
        headers: apiHeaders(accessToken),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setSuccess('Branding saved successfully');
      refreshTheme();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setForm({
      displayName: DEFAULT_THEME.displayName,
      colorPrimary: DEFAULT_THEME.colorPrimary,
      colorSecondary: DEFAULT_THEME.colorSecondary,
      colorAccent: DEFAULT_THEME.colorAccent,
      colorBackground: DEFAULT_THEME.colorBackground,
      colorSurface: DEFAULT_THEME.colorSurface,
      colorText: DEFAULT_THEME.colorText,
      colorTextOnPrimary: DEFAULT_THEME.colorTextOnPrimary,
      colorMuted: DEFAULT_THEME.colorMuted,
      colorBorder: DEFAULT_THEME.colorBorder,
      fontFamily: DEFAULT_THEME.fontFamily,
      borderRadius: DEFAULT_THEME.borderRadius,
      loginMessage: '',
      supportEmail: '',
      supportUrl: '',
      privacyPolicyUrl: '',
      termsOfServiceUrl: '',
    });
  };

  const handleUpload = async (type: 'logo' | 'logo-small' | 'favicon', file: File) => {
    setUploadingLogo(type);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${TENANT_SVC_URL}/admin/branding/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      if (type === 'logo') setLogoUrl(data.url);
      else if (type === 'logo-small') setLogoSmallUrl(data.url);
      else setFaviconUrl(data.url);
      setSuccess(`${type === 'logo' ? 'Logo' : type === 'logo-small' ? 'Small logo' : 'Favicon'} uploaded`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(null);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    setError(null);
    try {
      const res = await fetch(`${TENANT_SVC_URL}/admin/custom-domains`, {
        method: 'POST',
        headers: apiHeaders(accessToken),
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setNewDomain('');
      await fetchDomains();
      setSuccess('Domain added — follow the DNS verification steps below');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const res = await fetch(`${TENANT_SVC_URL}/admin/custom-domains/${domainId}/verify`, {
        method: 'POST',
        headers: apiHeaders(accessToken),
      });
      if (!res.ok) throw new Error('Verification failed');
      await fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Remove this custom domain? This cannot be undone.')) return;
    try {
      const res = await fetch(`${TENANT_SVC_URL}/admin/custom-domains/${domainId}`, {
        method: 'DELETE',
        headers: apiHeaders(accessToken),
      });
      if (!res.ok) throw new Error('Failed to remove');
      await fetchDomains();
      setSuccess('Domain removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove domain');
    }
  };

  // ---- Loading state -------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600" />
      </div>
    );
  }

  // ---- Render helper: live preview -----------------------------------------

  const previewColors: Record<string, string> = {
    '--aivo-color-primary': hexToRgbString(form.colorPrimary),
    '--aivo-color-secondary': hexToRgbString(form.colorSecondary),
    '--aivo-color-accent': hexToRgbString(form.colorAccent),
    '--aivo-color-background': hexToRgbString(form.colorBackground),
    '--aivo-color-surface': hexToRgbString(form.colorSurface),
    '--aivo-color-text': hexToRgbString(form.colorText),
    '--aivo-color-text-on-primary': hexToRgbString(form.colorTextOnPrimary),
    '--aivo-color-muted': hexToRgbString(form.colorMuted),
    '--aivo-color-border': hexToRgbString(form.colorBorder),
    '--aivo-font-family': form.fontFamily,
    '--aivo-border-radius': form.borderRadius,
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'branding'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Branding &amp; Theme
        </button>
        <button
          onClick={() => setActiveTab('domains')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'domains'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Custom Domains
        </button>
      </div>

      {/* ================================================================= */}
      {/* BRANDING TAB                                                       */}
      {/* ================================================================= */}

      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: form fields */}
          <div className="space-y-6 lg:col-span-2">
            {/* Display Name */}
            <Card title="Display Name">
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="Your District Name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown in the browser tab, login page and navigation bar
              </p>
            </Card>

            {/* Logos */}
            <Card title="Logos & Favicon">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <LogoUpload
                  label="Logo"
                  hint="Nav bar & login (max 2 MB)"
                  url={logoUrl}
                  uploading={uploadingLogo === 'logo'}
                  inputRef={logoInputRef}
                  onUpload={(f) => handleUpload('logo', f)}
                />
                <LogoUpload
                  label="Small Logo"
                  hint="Collapsed sidebar (max 1 MB)"
                  url={logoSmallUrl}
                  uploading={uploadingLogo === 'logo-small'}
                  inputRef={logoSmallInputRef}
                  onUpload={(f) => handleUpload('logo-small', f)}
                />
                <LogoUpload
                  label="Favicon"
                  hint="Browser tab icon (max 512 KB)"
                  url={faviconUrl}
                  uploading={uploadingLogo === 'favicon'}
                  inputRef={faviconInputRef}
                  onUpload={(f) => handleUpload('favicon', f)}
                />
              </div>
            </Card>

            {/* Colours */}
            <Card title="Brand Colours">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <ColorField label="Primary" value={form.colorPrimary} onChange={(v) => handleChange('colorPrimary', v)} />
                <ColorField label="Secondary" value={form.colorSecondary} onChange={(v) => handleChange('colorSecondary', v)} />
                <ColorField label="Accent" value={form.colorAccent} onChange={(v) => handleChange('colorAccent', v)} />
                <ColorField label="Background" value={form.colorBackground} onChange={(v) => handleChange('colorBackground', v)} />
                <ColorField label="Surface" value={form.colorSurface} onChange={(v) => handleChange('colorSurface', v)} />
                <ColorField label="Text" value={form.colorText} onChange={(v) => handleChange('colorText', v)} />
                <ColorField label="Text on Primary" value={form.colorTextOnPrimary} onChange={(v) => handleChange('colorTextOnPrimary', v)} />
                <ColorField label="Muted Text" value={form.colorMuted} onChange={(v) => handleChange('colorMuted', v)} />
                <ColorField label="Border" value={form.colorBorder} onChange={(v) => handleChange('colorBorder', v)} />
              </div>
            </Card>

            {/* Typography & Shape */}
            <Card title="Typography & Shape">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Font Family</label>
                  <select
                    value={form.fontFamily}
                    onChange={(e) => handleChange('fontFamily', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Border Radius</label>
                  <select
                    value={form.borderRadius}
                    onChange={(e) => handleChange('borderRadius', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Login Page */}
            <Card title="Login Page">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Welcome Message</label>
                <textarea
                  value={form.loginMessage}
                  onChange={(e) => handleChange('loginMessage', e.target.value)}
                  placeholder="Welcome to our learning platform!"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </Card>

            {/* Support Links */}
            <Card title="Support & Legal Links">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Support Email" value={form.supportEmail} onChange={(v) => handleChange('supportEmail', v)} placeholder="support@district.edu" />
                <TextField label="Support URL" value={form.supportUrl} onChange={(v) => handleChange('supportUrl', v)} placeholder="https://help.district.edu" />
                <TextField label="Privacy Policy URL" value={form.privacyPolicyUrl} onChange={(v) => handleChange('privacyPolicyUrl', v)} placeholder="https://district.edu/privacy" />
                <TextField label="Terms of Service URL" value={form.termsOfServiceUrl} onChange={(v) => handleChange('termsOfServiceUrl', v)} placeholder="https://district.edu/terms" />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleResetDefaults}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Live Preview</h3>
              <div
                className="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
                style={previewColors as React.CSSProperties}
              >
                {/* Mini nav bar */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ backgroundColor: form.colorPrimary }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-6 w-auto" />
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-white/30" />
                  )}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: form.colorTextOnPrimary, fontFamily: form.fontFamily }}
                  >
                    {form.displayName || 'District Name'}
                  </span>
                </div>

                {/* Body preview */}
                <div
                  className="space-y-3 p-4"
                  style={{ backgroundColor: form.colorBackground, fontFamily: form.fontFamily }}
                >
                  {/* Card */}
                  <div
                    className="space-y-2 p-3"
                    style={{
                      backgroundColor: form.colorSurface,
                      borderRadius: form.borderRadius,
                      border: `1px solid ${form.colorBorder}`,
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: form.colorText }}>
                      Sample Card
                    </div>
                    <div className="text-xs" style={{ color: form.colorMuted }}>
                      This is how your content will appear.
                    </div>
                    <button
                      style={{
                        backgroundColor: form.colorPrimary,
                        color: form.colorTextOnPrimary,
                        borderRadius: form.borderRadius,
                      }}
                      className="px-3 py-1 text-xs font-medium"
                    >
                      Action
                    </button>
                    <button
                      style={{
                        backgroundColor: form.colorSecondary,
                        color: form.colorTextOnPrimary,
                        borderRadius: form.borderRadius,
                      }}
                      className="ml-2 px-3 py-1 text-xs font-medium"
                    >
                      Secondary
                    </button>
                  </div>

                  {/* Accent element */}
                  <div
                    className="flex items-center gap-2 p-2 text-xs"
                    style={{
                      backgroundColor: form.colorAccent + '22',
                      border: `1px solid ${form.colorAccent}`,
                      borderRadius: form.borderRadius,
                      color: form.colorText,
                    }}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: form.colorAccent }}
                    />
                    Accent highlight
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DOMAINS TAB                                                        */}
      {/* ================================================================= */}

      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Add Domain */}
          <Card title="Add Custom Domain">
            <p className="mb-3 text-sm text-gray-600">
              Use your own domain (e.g. <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">learn.springfield.edu</code>) to access the platform with your branding.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="learn.yourdistrict.edu"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              />
              <button
                onClick={handleAddDomain}
                disabled={addingDomain || !newDomain.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {addingDomain ? 'Adding...' : 'Add Domain'}
              </button>
            </div>
          </Card>

          {/* Existing Domains */}
          {domains.length > 0 && (
            <Card title="Your Custom Domains">
              <div className="divide-y divide-gray-200">
                {domains.map((d) => (
                  <div key={d.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{d.domain}</span>
                          {d.isPrimary && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs">
                          <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                            {formatStatus(d.status)}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_COLORS[d.sslStatus] ?? ''}`}>
                            SSL: {formatStatus(d.sslStatus)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.status === 'PENDING_VERIFICATION' && (
                          <button
                            onClick={() => handleVerifyDomain(d.id)}
                            className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveDomain(d.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* DNS instructions for pending domains */}
                    {d.status === 'PENDING_VERIFICATION' && (
                      <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs">
                        <p className="font-medium text-yellow-800">DNS Verification Required</p>
                        <p className="mt-1 text-yellow-700">
                          Add a TXT record to your DNS:
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-xs text-gray-800">
                            _aivo-verification.{d.domain} → {d.verificationToken}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(d.verificationToken)}
                            className="rounded border px-2 py-1 text-gray-600 hover:bg-gray-100"
                            title="Copy token"
                          >
                            📋
                          </button>
                        </div>
                        <p className="mt-2 text-yellow-700">
                          Also add a CNAME record: <code className="rounded bg-white px-1 py-0.5">{d.domain} → custom.aivolearning.com</code>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {domains.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No custom domains configured yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Add a domain above to get started with white-label access
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-gray-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-xs uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

function LogoUpload({
  label,
  hint,
  url,
  uploading,
  inputRef,
  onUpload,
}: {
  label: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="text-center">
      <p className="mb-1 text-xs font-medium text-gray-700">{label}</p>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
      >
        {url ? (
          <img src={url} alt={label} className="max-h-16 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-gray-400 group-hover:text-indigo-500">
            {uploading ? 'Uploading...' : 'Click to upload'}
          </span>
        )}
      </button>
      <p className="mt-1 text-[10px] text-gray-400">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
    </div>
  );
}
