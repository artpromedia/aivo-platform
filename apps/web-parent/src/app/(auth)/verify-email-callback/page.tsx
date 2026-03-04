'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useState } from 'react';

/**
 * Email Verification Callback Page
 *
 * Firebase redirects the user here after they click the email verification
 * link. This page calls our backend to sync the verified status from
 * Firebase Auth into the local database, then shows the result.
 */
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already-verified'>(
    'verifying'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncVerification = useCallback(async (emailToVerify: string) => {
    try {
      const res = await fetch('/api/auth/firebase-verify-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify }),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (res.ok) {
        setStatus('success');
      } else if (res.status === 409) {
        // "Email has not been verified in Firebase" or "Email already verified"
        if (data.error?.toLowerCase().includes('already')) {
          setStatus('already-verified');
        } else {
          // Firebase hasn't confirmed yet — verification may still be in progress
          setErrorMessage(
            'Your email verification is still being processed. Please wait a moment and try again.'
          );
          setStatus('error');
        }
      } else {
        setErrorMessage(data.error ?? 'Verification failed. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (email) {
      void syncVerification(email);
    } else {
      // No email param — they may have navigated here directly.
      // Try to sync without email (will fail, show generic message).
      setStatus('success');
    }
  }, [email, syncVerification]);

  // ── Verifying (spinner) ──
  if (status === 'verifying') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 animate-pulse">
          <svg className="h-8 w-8 text-violet-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verifying your email</h1>
        <p className="mt-3 text-gray-600">Please wait while we confirm your email address…</p>
      </div>
    );
  }

  // ── Success ──
  if (status === 'success' || status === 'already-verified') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {status === 'already-verified' ? 'Already verified' : 'Email verified!'}
        </h1>
        <p className="mt-3 text-gray-600">
          {status === 'already-verified'
            ? 'Your email address has already been verified.'
            : 'Your email address has been successfully verified.'}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          You can now sign in and start using AIVO Learning.
        </p>

        <div className="mt-8">
          <Link
            href="/auth/login"
            className="inline-block w-full rounded-lg bg-violet-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ──
  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Verification failed</h1>
      <p className="mt-3 text-gray-600">{errorMessage}</p>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => {
            setStatus('verifying');
            if (email) void syncVerification(email);
          }}
          className="w-full rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Try again
        </button>
        <Link
          href="/auth/login"
          className="block w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 animate-pulse" />
          <h1 className="text-2xl font-bold text-gray-900">Loading…</h1>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
