'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[Error Boundary]', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-semibold text-red-600">Something went wrong</h2>
        <p className="mb-4 text-gray-600">
          We encountered an unexpected error. Please try again.
        </p>
        {process.env.NODE_ENV !== 'production' && (
          <details className="mb-4 max-w-lg rounded-lg bg-gray-100 p-4 text-left text-sm">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-red-600">
              {error.message}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
