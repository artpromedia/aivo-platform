'use client';

import { CheckCircle, Loader2, ArrowRight, PartyPopper } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

import { useSubscription } from '@/hooks';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { data: subscription, isLoading, refetch } = useSubscription();
  const [countdown, setCountdown] = useState(10);

  // Poll subscription status after checkout completes
  useEffect(() => {
    if (!sessionId) return;

    // Refetch subscription a few times to allow webhook to process
    const intervals = [1000, 3000, 6000];
    const timers = intervals.map((ms) =>
      setTimeout(() => {
        void refetch();
      }, ms)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [sessionId, refetch]);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [router]);

  const statusLabel =
    subscription?.status === 'active'
      ? 'Active'
      : subscription?.status === 'trialing'
        ? 'Free Trial'
        : (subscription?.status ?? 'Processing');

  return (
    <main
      id="main-content"
      className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <PartyPopper className="w-5 h-5 text-amber-500" />
          <h1 className="text-3xl font-bold text-gray-900">You&apos;re all set!</h1>
          <PartyPopper className="w-5 h-5 text-amber-500" />
        </div>

        <p className="text-gray-600 mb-8">
          Your subscription has been activated. Your child&apos;s personalized learning journey
          begins now.
        </p>

        {/* Subscription Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading subscription details…</span>
            </div>
          ) : subscription ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    subscription.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : subscription.status === 'trialing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              {subscription.plan?.name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className="text-sm font-medium text-gray-900">
                    {subscription.plan.name}
                  </span>
                </div>
              )}

              {subscription.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Next billing</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Subscription details are being processed. They&apos;ll appear on your dashboard
              shortly.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              router.push('/dashboard');
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              router.push('/billing');
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Billing Details
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">Redirecting to dashboard in {countdown}s…</p>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-green-50">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
