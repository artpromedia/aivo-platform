'use client';

import Link from 'next/link';

/**
 * Auth Layout
 *
 * Shared layout for login and register pages with centered card design.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-violet-50 via-white to-emerald-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-700">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <span className="text-xl font-bold text-gray-900">AIVO</span>
        </Link>
        <Link
          href="https://aivolearning.com"
          className="text-sm text-gray-600 hover:text-violet-600"
        >
          Back to website
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} AIVO Learning. All rights reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="https://aivolearning.com/privacy" className="hover:text-violet-600">
            Privacy Policy
          </Link>
          <Link href="https://aivolearning.com/terms" className="hover:text-violet-600">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
