'use client';

import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function PricingCancelPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Cancel icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-6">
          <XCircle className="h-12 w-12 text-gray-400" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Checkout Cancelled</h1>

        <p className="text-lg text-gray-600 mb-4">
          Your payment was not processed. No charges have been made.
        </p>

        <p className="text-sm text-gray-500 mb-8">
          If you encountered an issue or have questions, please don&apos;t hesitate to contact our
          support team. You can return to the pricing page anytime to complete your subscription.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              router.push('/pricing');
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Return to Pricing
          </button>
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Help section */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-5 text-left">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Need help?</h2>
          <p className="text-sm text-gray-600">
            If your payment was declined or you have billing questions:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            <li>• Try a different payment method</li>
            <li>• Check with your bank for any restrictions</li>
            <li>
              • Contact us at <span className="text-indigo-600 font-medium">support@aivo.com</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
