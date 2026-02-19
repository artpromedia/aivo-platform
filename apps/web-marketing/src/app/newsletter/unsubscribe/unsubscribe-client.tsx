'use client';

import { CheckCircle2, Loader2, MailX, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';

type UnsubState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

const LIST_LABELS: Record<string, string> = {
  'weekly-digest': 'Weekly Digest',
  'course-announcements': 'Course Announcements',
};

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const list = searchParams.get('list') ?? '';

  const [state, setState] = useState<UnsubState>({ kind: 'idle' });

  const handleUnsubscribe = useCallback(async () => {
    if (!email || !list) {
      setState({ kind: 'error', message: 'Missing email or list information.' });
      return;
    }

    setState({ kind: 'loading' });

    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, list }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'unsubscribed') {
        setState({ kind: 'done' });
      } else {
        setState({
          kind: 'error',
          message: data.message || 'We couldn\u2019t process your request.',
        });
      }
    } catch {
      setState({
        kind: 'error',
        message: 'Something went wrong. Please try again later.',
      });
    }
  }, [email, list]);

  const listLabel = LIST_LABELS[list] || list;
  const maskedEmail = email
    ? `${email[0]}${'*'.repeat(Math.max(email.indexOf('@') - 1, 0))}${email.slice(email.indexOf('@'))}`
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* ── Idle — ask for confirmation ────────────────────────────── */}
        {state.kind === 'idle' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-6">
              <MailX className="w-10 h-10 text-orange-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Unsubscribe
            </h1>
            {email && (
              <p className="text-gray-600 mb-1">
                <span className="font-medium">{maskedEmail}</span>
              </p>
            )}
            {listLabel && (
              <p className="text-gray-500 text-sm mb-6">
                List: <span className="font-medium">{listLabel}</span>
              </p>
            )}
            <p className="text-gray-600 mb-8">
              Are you sure you want to unsubscribe? You can always re-subscribe later.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
            >
              Yes, unsubscribe me
            </button>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────── */}
        {state.kind === 'loading' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200">
            <Loader2 className="w-12 h-12 text-theme-primary-500 animate-spin mx-auto mb-4" />
            <h1 className="font-display text-xl font-semibold text-gray-900 mb-2">
              Processing&hellip;
            </h1>
            <p className="text-gray-500 text-sm">
              Just a moment while we update your preferences.
            </p>
          </div>
        )}

        {/* ── Done ───────────────────────────────────────────────────── */}
        {state.kind === 'done' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Unsubscribed
            </h1>
            <p className="text-gray-600 mb-8">
              You&rsquo;ve been removed from the{' '}
              <span className="font-medium">{listLabel}</span> list. We&rsquo;re sorry
              to see you go!
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-primary-600 text-white font-medium hover:bg-theme-primary-700 transition-colors"
            >
              Back to AIVO Learning
            </Link>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {state.kind === 'error' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">{state.message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleUnsubscribe}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-primary-600 text-white font-medium hover:bg-theme-primary-700 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back to AIVO Learning
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function UnsubscribeClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 text-theme-primary-500 animate-spin" />
        </div>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
