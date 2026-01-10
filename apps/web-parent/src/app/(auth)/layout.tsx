'use client';

import Link from 'next/link';
import Image from 'next/image';

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
          <Image
            src="/images/aivo-logo-horizontal-purple.svg"
            alt="AIVO"
            width={120}
            height={40}
          />
        </Link>
        <Link
          href="http://localhost:3001"
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
