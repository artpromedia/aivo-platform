'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

type ConfirmState =
  | { kind: 'loading' }
  | { kind: 'confirmed' }
  | { kind: 'error'; message: string };

function ConfirmInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<ConfirmState>({ kind: 'loading' });

  const confirm = useCallback(async (t: string) => {
    try {
      const res = await fetch(`/api/newsletter/confirm?token=${encodeURIComponent(t)}`);
      const data = await res.json();

      if (res.ok && data.status === 'confirmed') {
        setState({ kind: 'confirmed' });
      } else {
        setState({
          kind: 'error',
          message: data.message || 'We couldn\u2019t confirm your subscription.',
        });
      }
    } catch {
      setState({
        kind: 'error',
        message: 'Something went wrong. Please try again later.',
      });
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error', message: 'Missing confirmation token.' });
      return;
    }
    confirm(token);
  }, [token, confirm]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* ── Loading ────────────────────────────────────────────────── */}
        {state.kind === 'loading' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200">
            <Loader2 className="w-12 h-12 text-theme-primary-500 animate-spin mx-auto mb-4" />
            <h1 className="font-display text-xl font-semibold text-gray-900 mb-2">
              Confirming your subscription&hellip;
            </h1>
            <p className="text-gray-500 text-sm">
              Just a moment while we activate your newsletter.
            </p>
          </div>
        )}

        {/* ── Confirmed ──────────────────────────────────────────────── */}
        {state.kind === 'confirmed' && (
          <div className="bg-white rounded-2xl p-10 shadow-soft border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              You&rsquo;re all set!
            </h1>
            <p className="text-gray-600 mb-8">
              Your newsletter subscription is now active. You&rsquo;ll receive our next
              edition in your inbox.
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
              Confirmation failed
            </h1>
            <p className="text-gray-600 mb-8">{state.message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-primary-600 text-white font-medium hover:bg-theme-primary-700 transition-colors"
              >
                Back to AIVO Learning
              </Link>
              <Link
                href="/#newsletter"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Re-subscribe
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapping in Suspense because useSearchParams() requires it in
 * Next.js App Router client components.
 */
export function NewsletterConfirmClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 text-theme-primary-500 animate-spin" />
        </div>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
