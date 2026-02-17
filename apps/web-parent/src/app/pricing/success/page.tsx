'use client';

import { CheckCircle, Home, CreditCard, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect } from 'react';

import { useSubscription } from '@/hooks';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  // Re-fetch subscription data after successful checkout
  const { data: subscription, refetch, isLoading } = useSubscription();

  useEffect(() => {
    // Poll for subscription to become active after webhook processing
    const interval = setInterval(() => {
      void refetch();
    }, 3000);

    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refetch]);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Success icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h1>

        <p className="text-lg text-gray-600 mb-2">Thank you for subscribing to Aivo.</p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Setting up your subscription…</span>
          </div>
        ) : isActive ? (
          <div className="mb-8">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <CheckCircle className="mr-1.5 h-4 w-4" />
              {subscription?.status === 'trialing' ? 'Trial Active' : 'Subscription Active'}
            </span>
            {subscription?.plan?.name && (
              <p className="text-sm text-gray-500 mt-2">Plan: {subscription.plan.name}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Activating your subscription…</span>
          </div>
        )}

        {/* What's next */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8 text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            What&apos;s next?
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Check your email</p>
                <p className="text-xs text-gray-500">
                  A confirmation receipt has been sent to your email.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Explore the dashboard</p>
                <p className="text-xs text-gray-500">
                  See your child&apos;s progress, assignments, and more.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Manage your subscription</p>
                <p className="text-xs text-gray-500">
                  Update payment methods, change plans, or cancel anytime.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
          <button
            onClick={() => {
              router.push('/billing');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Manage Billing
          </button>
        </div>

        {sessionId && (
          <p className="mt-6 text-xs text-gray-400">Session: {sessionId.slice(0, 20)}…</p>
        )}
      </div>
    </main>
  );
}

export default function PricingSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
