'use client';

import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <main
      id="main-content"
      className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full text-center">
        {/* Cancel Icon */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout Cancelled</h1>

        <p className="text-gray-600 mb-8">
          No worries — you haven&apos;t been charged. You can return to the pricing page whenever
          you&apos;re ready.
        </p>

        {/* Help Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm text-left">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Need help choosing a plan?</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>
                <strong>Base Plan</strong> includes all core K-8 subjects with AI tutoring.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>
                <strong>Add-ons</strong> like Social-Emotional Learning and Speech Therapy come with
                a 30-day free trial.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>
                Switch to <strong>yearly billing</strong> and save ~17% on every plan.
              </span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              router.push('/pricing');
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              router.push('/dashboard');
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Questions? Contact{' '}
          <a href="mailto:support@aivo.com" className="text-indigo-500 hover:underline">
            support@aivo.com
          </a>
        </p>
      </div>
    </main>
  );
}
