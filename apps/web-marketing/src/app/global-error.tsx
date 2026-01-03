'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[Global Error Boundary]', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="mb-2 text-3xl font-bold text-red-600">Application Error</h1>
            <p className="mb-6 text-gray-600">
              A critical error occurred. Please refresh the page or try again later.
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <details className="mb-4 rounded-lg bg-gray-100 p-4 text-left text-sm">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap text-red-600">
                  {error.message}
                </pre>
              </details>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <a
                href="/"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
