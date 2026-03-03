'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleResendVerification = async () => {
    setResendStatus('sending');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setResendStatus('error');
        return;
      }
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setEmailNotVerified(false);
    setResendStatus('idle');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; canResend?: boolean };
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setEmailNotVerified(true);
          setLoading(false);
          return;
        }
        setError(data.error ?? 'Login failed');
        setLoading(false);
        return;
      }
      router.push('/tenants');
      router.refresh();
    } catch {
      setError('Unexpected error. Please try again.');
      setLoading(false);
    }
  };

  return (
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
          placeholder="admin@aivolearning.com"
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
      {emailNotVerified && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Email not verified</p>
          <p className="mt-1">Please check your inbox and verify your email before signing in.</p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendStatus === 'sending' || resendStatus === 'sent'}
            className="mt-2 text-sm font-medium text-amber-900 underline hover:no-underline disabled:opacity-60"
          >
            {resendStatus === 'sending'
              ? 'Sending...'
              : resendStatus === 'sent'
                ? 'Verification email sent!'
                : resendStatus === 'error'
                  ? 'Failed to send — try again'
                  : 'Resend verification email'}
          </button>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Continue'}
      </button>
    </form>
  );
}
