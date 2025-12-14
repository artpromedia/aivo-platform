'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';

interface SsoProvider {
  id: string;
  name: string;
  type: 'GOOGLE_WORKSPACE' | 'MICROSOFT_ENTRA' | 'CLEVER' | 'CLASSLINK';
  enabled: boolean;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([]);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  // Check for SSO error in URL params
  useEffect(() => {
    const ssoError = searchParams.get('error');
    const ssoMessage = searchParams.get('message');
    if (ssoError) {
      setError(ssoMessage || `SSO Error: ${ssoError}`);
    }
  }, [searchParams]);

  // Load available SSO providers for the tenant (determined by domain or URL)
  useEffect(() => {
    async function loadSsoProviders() {
      try {
        const res = await fetch('/api/auth/sso/providers');
        if (res.ok) {
          const data = await res.json();
          setSsoProviders(data.providers || []);
        }
      } catch {
        // Silently fail - SSO just won't be shown
      }
    }
    loadSsoProviders();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Login failed');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Unexpected error. Please try again.');
      setLoading(false);
    }
  };

  const handleSsoLogin = async (providerId: string, providerType: string) => {
    setSsoLoading(providerId);
    setError(null);
    try {
      // Get the SSO initiation URL
      const res = await fetch(`/api/auth/sso/initiate?provider=${providerId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to initiate SSO');
        setSsoLoading(null);
        return;
      }
      const { redirectUrl } = await res.json();
      // Redirect to IdP
      globalThis.location.href = redirectUrl;
    } catch {
      setError('Failed to start SSO login');
      setSsoLoading(null);
    }
  };

  const getSsoButtonStyles = (type: string) => {
    switch (type) {
      case 'GOOGLE_WORKSPACE':
        return 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50';
      case 'MICROSOFT_ENTRA':
        return 'bg-[#0078d4] border-[#0078d4] text-white hover:bg-[#106ebe]';
      case 'CLEVER':
        return 'bg-[#4a90e2] border-[#4a90e2] text-white hover:bg-[#3a7bd5]';
      case 'CLASSLINK':
        return 'bg-[#00a7e1] border-[#00a7e1] text-white hover:bg-[#008dc0]';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200';
    }
  };

  const getSsoIcon = (type: string) => {
    switch (type) {
      case 'GOOGLE_WORKSPACE':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        );
      case 'MICROSOFT_ENTRA':
        return (
          <svg className="h-5 w-5" viewBox="0 0 23 23" fill="currentColor">
            <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
            <rect x="12" y="1" width="10" height="10" fill="#00a4ef"/>
            <rect x="1" y="12" width="10" height="10" fill="#7fba00"/>
            <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
        );
      case 'CLEVER':
        return <span className="text-lg">📚</span>;
      case 'CLASSLINK':
        return <span className="text-lg">🔗</span>;
      default:
        return <span className="text-lg">🔐</span>;
    }
  };

  const hasSsoProviders = ssoProviders.length > 0;

  return (
    <div className="space-y-4">
      {/* SSO Buttons */}
      {hasSsoProviders && (
        <div className="space-y-3">
          {ssoProviders.filter(p => p.enabled).map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSsoLogin(provider.id, provider.type)}
              disabled={!!ssoLoading}
              className={`flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${getSsoButtonStyles(provider.type)}`}
            >
              {ssoLoading === provider.id ? (
                <span className="animate-spin">⏳</span>
              ) : (
                getSsoIcon(provider.type)
              )}
              <span>
                {ssoLoading === provider.id 
                  ? 'Redirecting...' 
                  : `Sign in with ${provider.name}`
                }
              </span>
            </button>
          ))}
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <button
                type="button"
                onClick={() => setShowEmailLogin(!showEmailLogin)}
                className="bg-white px-3 text-gray-500 hover:text-gray-700"
              >
                {showEmailLogin ? 'Hide email login' : 'Or use email/password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email/Password Form */}
      {(!hasSsoProviders || showEmailLogin) && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="admin@district.edu"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>
      )}

      {/* Error display (outside form for SSO errors) */}
      {error && hasSsoProviders && !showEmailLogin && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
